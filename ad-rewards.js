/**
 * Earn scans by watching a rewarded ad.
 *
 * WHY THIS IS SERVER-VERIFIED
 *
 * The obvious implementation is a "I watched an ad, give me a scan" endpoint
 * the app calls. That is free money for anyone who opens the APK and replays
 * one HTTP request, and the cost lands on our Gemini bill.
 *
 * So the reward is only ever granted by AdMob's Server-Side Verification
 * callback: when a real user genuinely finishes a rewarded ad, Google calls
 * this server directly with a signature over the query string. We verify that
 * signature against Google's published ECDSA keys. The app never grants
 * anything - it just plays the ad and then re-reads its balance.
 *
 * Consequence worth knowing: rewards only work once AdMob is set up and the
 * SSV callback URL is pointed here. Until then the endpoint rejects everything,
 * which is the correct failure - no ads means no free scans, not free scans for
 * everyone.
 */

import crypto from 'crypto';

const VERIFIER_KEYS_URL = 'https://gstatic.com/admob/reward/verifier-keys.json';

/** Scans granted per completed ad. */
export const SCANS_PER_AD = Number(process.env.AD_REWARD_SCANS || 1);

/**
 * Most scans a user may earn from ads in a day. This is the real cost control:
 * without it, a determined viewer could farm unlimited AI usage, and the ad
 * revenue per view does not cover a scan at high volume.
 */
export const AD_REWARD_DAILY_CAP = Number(process.env.AD_REWARD_DAILY_CAP || 5);

/** How long ad-earned scans stay usable. */
export const AD_REWARD_VALID_DAYS = Number(process.env.AD_REWARD_VALID_DAYS || 7);

let keyCache = { fetchedAt: 0, keys: null };
const KEY_CACHE_MS = 60 * 60 * 1000;

/** Google's public verifier keys, cached for an hour. */
async function getVerifierKeys() {
  if (keyCache.keys && Date.now() - keyCache.fetchedAt < KEY_CACHE_MS) {
    return keyCache.keys;
  }

  const res = await fetch(VERIFIER_KEYS_URL, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Could not fetch AdMob verifier keys (${res.status})`);

  const body = await res.json();
  const keys = new Map();
  for (const k of body.keys || []) keys.set(String(k.keyId), k.pem || k.base64);

  keyCache = { fetchedAt: Date.now(), keys };
  return keys;
}

/**
 * Verify an AdMob SSV callback.
 *
 * Google signs everything in the query string up to (but excluding)
 * `&signature=`, with ECDSA-SHA256. Both `signature` and `key_id` are the last
 * two parameters, in that order.
 */
export async function verifyAdCallback(rawQuery) {
  const sigIndex = rawQuery.indexOf('&signature=');
  if (sigIndex === -1) return { ok: false, reason: 'no signature' };

  const signedPortion = rawQuery.slice(0, sigIndex);
  const params = new URLSearchParams(rawQuery);

  const signature = params.get('signature');
  const keyId = params.get('key_id');
  if (!signature || !keyId) return { ok: false, reason: 'missing signature or key_id' };

  let keys;
  try {
    keys = await getVerifierKeys();
  } catch (err) {
    return { ok: false, reason: `key fetch failed: ${err.message}` };
  }

  const pem = keys.get(String(keyId));
  if (!pem) return { ok: false, reason: `unknown key_id ${keyId}` };

  const publicKey = pem.includes('BEGIN PUBLIC KEY')
    ? pem
    : `-----BEGIN PUBLIC KEY-----\n${pem}\n-----END PUBLIC KEY-----`;

  let valid = false;
  try {
    valid = crypto.verify(
      'sha256',
      Buffer.from(signedPortion, 'utf8'),
      publicKey,
      Buffer.from(signature, 'base64url')
    );
  } catch (err) {
    return { ok: false, reason: `verify threw: ${err.message}` };
  }

  if (!valid) return { ok: false, reason: 'signature did not verify' };

  return {
    ok: true,
    userId: params.get('user_id'),
    transactionId: params.get('transaction_id'),
    rewardAmount: Number(params.get('reward_amount') || 0),
    adUnit: params.get('ad_unit'),
  };
}

export async function initAdRewardsDb(q) {
  await q(`
    CREATE TABLE IF NOT EXISTS foodlog_ad_rewards (
      transaction_id TEXT PRIMARY KEY,
      user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scans          INT NOT NULL,
      ad_unit        TEXT,
      created_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await q(`CREATE INDEX IF NOT EXISTS ix_foodlog_ad_rewards_user_day
             ON foodlog_ad_rewards(user_id, created_at)`);
}

/** Scans this user has already earned from ads in the last 24 hours. */
export async function earnedToday(q, userId) {
  const { rows } = await q(
    `SELECT COALESCE(SUM(scans), 0)::int AS n
       FROM foodlog_ad_rewards
      WHERE user_id = $1 AND created_at > NOW() - interval '1 day'`,
    [userId]
  );
  return rows[0]?.n ?? 0;
}

/**
 * Grant the scans for a verified ad view.
 *
 * The transaction id is the primary key, so AdMob retrying a callback - which
 * it does - cannot pay out twice. ON CONFLICT DO NOTHING is the whole defence.
 */
export async function grantAdReward(q, { userId, transactionId, adUnit }) {
  const { rows: userRows } = await q(`SELECT id FROM users WHERE id = $1`, [userId]);
  if (!userRows.length) return { granted: false, reason: 'unknown user' };

  const already = await earnedToday(q, userId);
  if (already >= AD_REWARD_DAILY_CAP) {
    return { granted: false, reason: 'daily cap reached', earnedToday: already };
  }

  const claim = await q(
    `INSERT INTO foodlog_ad_rewards (transaction_id, user_id, scans, ad_unit)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (transaction_id) DO NOTHING
     RETURNING *`,
    [transactionId, userId, SCANS_PER_AD, adUnit || null]
  );

  if (!claim.rows.length) {
    return { granted: false, reason: 'already granted', duplicate: true };
  }

  // Ad-earned scans extend the window only if they would otherwise be dead -
  // buying a pass must never be made worse by watching an ad.
  const { rows } = await q(
    `UPDATE users
        SET scan_credits = scan_credits + $2,
            credits_expire_at = GREATEST(
              COALESCE(credits_expire_at, NOW()),
              NOW() + ($3 || ' days')::interval
            )
      WHERE id = $1
      RETURNING scan_credits`,
    [userId, SCANS_PER_AD, String(AD_REWARD_VALID_DAYS)]
  );

  const balance = rows[0]?.scan_credits ?? 0;

  await q(
    `INSERT INTO foodlog_credit_events (user_id, delta, reason, balance_after)
     VALUES ($1, $2, 'ad-reward', $3)`,
    [userId, SCANS_PER_AD, balance]
  );

  return { granted: true, scans: SCANS_PER_AD, balance };
}

export function mountAdRewards(app, { q, wrap, getSessionUser }) {
  /**
   * AdMob Server-Side Verification callback. Called by Google, not the app.
   *
   * Always answers 200 on a well-formed request - AdMob retries non-2xx, and a
   * duplicate or capped reward is a normal outcome, not a failure.
   */
  app.get('/api/billing/ad-reward', wrap(async (req, res) => {
    const rawQuery = req.originalUrl.split('?')[1] || '';

    const verified = await verifyAdCallback(rawQuery);
    if (!verified.ok) {
      console.warn('[ads] rejected SSV callback:', verified.reason);
      return res.status(401).json({ error: 'invalid callback' });
    }

    if (!verified.userId || !verified.transactionId) {
      return res.status(400).json({ error: 'missing user_id or transaction_id' });
    }

    const result = await grantAdReward(q, {
      userId: verified.userId,
      transactionId: verified.transactionId,
      adUnit: verified.adUnit,
    });

    if (!result.granted) {
      console.log('[ads] not granted:', result.reason, verified.transactionId);
    }

    res.json({ status: 'ok' });
  }));

  /** What the app shows on the "watch an ad" button. */
  app.get('/api/billing/ad-status', wrap(async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const earned = await earnedToday(q, user.id);
    const remaining = Math.max(0, AD_REWARD_DAILY_CAP - earned);

    res.json({
      // The app must send this as the SSV `user_id` so the reward lands on the
      // right account.
      ssv_user_id: user.id,
      scans_per_ad: SCANS_PER_AD,
      earned_today: earned,
      remaining_today: remaining,
      can_watch: remaining > 0,
      valid_days: AD_REWARD_VALID_DAYS,
    });
  }));
}
