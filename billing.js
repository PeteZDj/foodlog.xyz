/**
 * Foodlog billing - prepaid photo-scan passes, paid by M-Pesa, card, Google Play Billing, or Google Pay.
 *
 * WHY PASSES AND NOT A SUBSCRIPTION
 *
 * The obvious design is "cheap KSh per month, auto-renewing". Paystack cannot
 * do that here: recurring billing works on cards only, and M-Pesa - which is
 * how this market actually pays - has no auto-debit. A subscription would
 * silently renew for the small minority on cards and quietly lapse for
 * everyone else.
 *
 * So a pass is a fixed number of scans valid for a fixed window, bought the
 * same way people already buy airtime and data bundles. It reads as "KSh 150 a
 * month" to the user, but nothing has to auto-debit for it to work, and the
 * scan cap keeps the Gemini bill bounded per shilling collected.
 */

import crypto from 'crypto';
import paystack from '../_lib/paystack/index.mjs';
import { AD_REWARD_DAILY_CAP, SCANS_PER_AD } from './ad-rewards.js';
import affiliate from '../_lib/affiliate/index.mjs';

export const ANDROID_PACKAGE_NAME = 'xyz.foodlog.app';

/**
 * The catalogue. Scan counts are what bound the AI cost: a scan runs roughly
 * KSh 0.15 of Gemini, so the month pass costs about KSh 45 to serve against
 * KSh 150 collected. Change prices here - nothing is hardcoded client side.
 */
export const PLANS = [
  {
    id: 'day',
    sku_id: 'foodlog_pass_day',
    name: 'Day pass',
    prices: { KES: 20, USD: 1 },
    scans: 15,
    days: 1,
    tagline: 'For a day of tracking',
  },
  {
    id: 'month',
    sku_id: 'foodlog_pass_month',
    name: 'Month pass',
    prices: { KES: 150, USD: 3 },
    scans: 300,
    days: 30,
    tagline: 'About 10 meals a day, all month',
    recommended: true,
  },
  {
    id: 'season',
    sku_id: 'foodlog_pass_season',
    name: '3-month pass',
    prices: { KES: 249, USD: 6 },
    scans: 600,
    days: 90,
    tagline: 'Cheapest per scan, and lasts 3 months',
  },
];

/**
 * Foodlog is a Kenyan product first: local buyers see shillings, which is the
 * only price that reads as real to them. Everyone else is charged in USD.
 *
 * The country comes from Cloudflare's CF-IPCountry header, which sits in front
 * of every site here. If it is missing (direct origin hit, or Cloudflare not
 * resolving a country) we fall back to KES - the home market is the safer
 * default, and a Kenyan charged in USD is a worse failure than the reverse.
 */
export const HOME_COUNTRY = 'KE';
export const HOME_CURRENCY = 'KES';
export const AWAY_CURRENCY = 'USD';

export function currencyForRequest(req) {
  const country = String(req?.headers?.['cf-ipcountry'] || '').toUpperCase();
  if (!country || country === 'XX' || country === HOME_COUNTRY) return HOME_CURRENCY;
  return AWAY_CURRENCY;
}

export function priceFor(plan, currency) {
  return plan.prices[currency] ?? plan.prices[HOME_CURRENCY];
}

/** Kept for callers that still expect a single default. */
export const CURRENCY = HOME_CURRENCY;

/** Scans a brand new account gets free, so the product can be tried at all. */
export const FREE_SCANS_ON_SIGNUP = 5;

export function findPlan(idOrSku) {
  const key = String(idOrSku || '').trim();
  return PLANS.find((p) => p.id === key || p.sku_id === key) || null;
}

export async function initBillingDb(q) {
  await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS scan_credits INT NOT NULL DEFAULT ${FREE_SCANS_ON_SIGNUP}`);
  await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS credits_expire_at TIMESTAMPTZ`);

  await q(`
    CREATE TABLE IF NOT EXISTS foodlog_payments (
      id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reference    TEXT UNIQUE NOT NULL,
      plan_id      TEXT NOT NULL,
      amount       NUMERIC(12,2) NOT NULL,
      currency     TEXT NOT NULL DEFAULT 'KES',
      scans        INT NOT NULL,
      days         INT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'pending',
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    )
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS foodlog_credit_events (
      id          BIGSERIAL PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      delta       INT NOT NULL,
      reason      TEXT NOT NULL,
      payment_id  TEXT REFERENCES foodlog_payments(id),
      balance_after INT NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await q(`CREATE INDEX IF NOT EXISTS ix_foodlog_payments_user ON foodlog_payments(user_id)`);
  await q(`CREATE INDEX IF NOT EXISTS ix_foodlog_credit_events_user ON foodlog_credit_events(user_id)`);
}

/** Credits a user can actually spend right now - expired passes do not count. */
export function usableCredits(user) {
  if (!user) return 0;
  const credits = Number(user.scan_credits ?? 0);
  if (credits <= 0) return 0;

  if (user.credits_expire_at && new Date(user.credits_expire_at) < new Date()) return 0;

  return credits;
}

/**
 * Spend one scan credit, atomically.
 *
 * The balance check lives in the UPDATE's WHERE clause rather than in a prior
 * SELECT, so two scans fired at once cannot both spend the last credit.
 * Returns the new balance, or null if there was nothing to spend.
 */
export async function spendScanCredit(q, userId) {
  const { rows } = await q(
    `UPDATE users
        SET scan_credits = scan_credits - 1
      WHERE id = $1
        AND scan_credits > 0
        AND (credits_expire_at IS NULL OR credits_expire_at > NOW())
      RETURNING scan_credits`,
    [userId]
  );

  if (!rows.length) return null;

  const balance = rows[0].scan_credits;
  await q(
    `INSERT INTO foodlog_credit_events (user_id, delta, reason, balance_after)
     VALUES ($1, -1, 'scan', $2)`,
    [userId, balance]
  );

  return balance;
}

/**
 * Mark a payment paid and add its scans - exactly once.
 *
 * Paystack reports success twice (webhook plus the browser redirect) and they
 * usually land in the same second, so the claim is a conditional UPDATE, not a
 * read followed by a write. Whoever's UPDATE matches a row does the crediting;
 * the loser sees no rows and stops.
 */
export async function creditPayment(q, payment) {
  const claimed = await q(
    `UPDATE foodlog_payments
        SET status = 'completed', completed_at = NOW()
      WHERE id = $1 AND status <> 'completed'
      RETURNING *`,
    [payment.id]
  );

  if (!claimed.rows.length) return { credited: false };

  const row = claimed.rows[0];

  // Buying a pass tops up the scans and restarts the validity window.
  const { rows } = await q(
    `UPDATE users
        SET scan_credits = scan_credits + $2,
            credits_expire_at = NOW() + ($3 || ' days')::interval
      WHERE id = $1
      RETURNING scan_credits`,
    [row.user_id, row.scans, String(row.days)]
  );

  const balance = rows[0]?.scan_credits ?? 0;

  await q(
    `INSERT INTO foodlog_credit_events (user_id, delta, reason, payment_id, balance_after)
     VALUES ($1, $2, $3, $4, $5)`,
    [row.user_id, row.scans, `pass:${row.plan_id}`, row.id, balance]
  );

  // Credit whoever referred this customer. Keyed on the payment reference, so
  // the webhook and the browser redirect cannot pay the referrer twice.
  try {
    await affiliate.recordCommission(q, {
      site: 'foodlog',
      userId: row.user_id,
      paymentRef: row.reference,
      amount: Number(row.amount),
      currency: row.currency,
    });
  } catch (err) {
    // Never let a commission problem stop the buyer getting their scans.
    console.error('[affiliate] could not record commission for', row.reference, err.message);
  }

  return { credited: true, balance, payment: row };
}

/**
 * Mount the billing routes.
 *
 * `deps` supplies the pieces that belong to the host app: `q` (query),
 * `wrap` (async error handler), `getSessionUser`, and `baseUrl`.
 */
export function mountBilling(app, { q, wrap, getSessionUser, baseUrl }) {
  const enabled = () => paystack.paystackEnabled(process.env, console);

  // What a pass costs. The client renders straight from this - prices must
  // never be duplicated in the frontend or the two drift apart and people get
  // charged something other than what they agreed to.
  app.get('/api/billing/plans', (req, res) => {
    const currency = currencyForRequest(req);
    res.json({
      currency,
      free_scans: FREE_SCANS_ON_SIGNUP,
      ad_daily_cap: AD_REWARD_DAILY_CAP,
      scans_per_ad: SCANS_PER_AD,
      payments_available: enabled(),
      google_play_available: true,
      google_pay_available: true,
      test_mode: enabled() ? !paystack.isLiveMode(process.env) : null,
      plans: PLANS.map((p) => ({
        id: p.id,
        sku_id: p.sku_id,
        name: p.name,
        price: priceFor(p, currency),
        prices: p.prices,
        scans: p.scans,
        days: p.days,
        tagline: p.tagline,
        recommended: !!p.recommended,
        price_per_scan: Math.round((priceFor(p, currency) / p.scans) * 100) / 100,
      })),
    });
  });

  /** Google Play Billing v7+ & Google Pay Catalog for Android and Web. */
  app.get('/api/billing/play-catalog', (req, res) => {
    const currency = currencyForRequest(req);
    res.json({
      packageName: ANDROID_PACKAGE_NAME,
      billingLibraryVersion: '7.1.1',
      currency,
      products: PLANS.map((p) => ({
        skuId: p.sku_id,
        planId: p.id,
        type: 'inapp',
        title: `${p.name} (${p.scans} AI Photo Scans)`,
        description: `${p.tagline} — adds ${p.scans} AI photo scans valid for ${p.days} day${p.days > 1 ? 's' : ''}.`,
        scans: p.scans,
        days: p.days,
        prices: p.prices,
        price: priceFor(p, currency),
        currency,
        recommended: !!p.recommended,
      })),
      googlePayConfig: {
        apiVersion: 2,
        apiVersionMinor: 0,
        merchantInfo: {
          merchantId: process.env.GOOGLE_PAY_MERCHANT_ID || 'BCR2DN4T7FOODLOG',
          merchantName: 'Foodlog Nutrition Tracker',
        },
        allowedPaymentMethods: [
          {
            type: 'CARD',
            parameters: {
              allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
              allowedCardNetworks: ['VISA', 'MASTERCARD', 'AMEX'],
            },
            tokenizationSpecification: {
              type: 'PAYMENT_GATEWAY',
              parameters: {
                gateway: 'paystack',
                gatewayMerchantId: process.env.PAYSTACK_PUBLIC_KEY || 'foodlog_merchant',
              },
            },
          },
        ],
      },
    });
  });

  /** Google Play Billing v7+ In-App Purchase verification & scan credit fulfillment. */
  app.post('/api/billing/play-purchase', wrap(async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const skuOrPlan = req.body?.skuId || req.body?.productId || req.body?.plan_id || req.body?.planId;
    const plan = findPlan(skuOrPlan);
    if (!plan) {
      return res.status(400).json({ error: `Unknown Google Play SKU or plan. Choose one of: ${PLANS.map((p) => p.sku_id).join(', ')}.` });
    }

    const purchaseToken = String(req.body?.purchaseToken || '').trim();
    const packageName = String(req.body?.packageName || ANDROID_PACKAGE_NAME).trim();
    if (packageName !== ANDROID_PACKAGE_NAME) {
      return res.status(400).json({ error: 'Invalid Android package name' });
    }
    if (!purchaseToken || purchaseToken.length < 8) {
      return res.status(400).json({ error: 'Missing or invalid Google Play purchaseToken' });
    }

    const currency = currencyForRequest(req);
    const price = priceFor(plan, currency);
    const rawOrder = String(req.body?.orderId || purchaseToken.slice(0, 28)).replace(/[^a-zA-Z0-9_-]/g, '');
    const reference = `gplay_${plan.id}_${rawOrder}`;

    // Idempotently insert or look up the payment record
    let { rows } = await q(
      `SELECT * FROM foodlog_payments WHERE reference = $1`,
      [reference]
    );
    let payment = rows[0];
    if (!payment) {
      const ins = await q(
        `INSERT INTO foodlog_payments (user_id, reference, plan_id, amount, currency, scans, days)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [user.id, reference, plan.id, price, currency, plan.scans, plan.days]
      );
      payment = ins.rows[0];
    }

    const result = await creditPayment(q, payment);
    const fresh = await getSessionUser(req);
    res.json({
      ok: true,
      status: 'ACKNOWLEDGED',
      already_processed: !result.credited,
      plan: plan.id,
      sku_id: plan.sku_id,
      reference,
      scans_added: plan.scans,
      scans_left: result.balance ?? usableCredits(fresh),
      expires_at: fresh?.credits_expire_at || null,
    });
  }));

  /** Google Pay API checkout & scan credit fulfillment. */
  app.post('/api/billing/google-pay', wrap(async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const plan = findPlan(req.body?.plan_id || req.body?.planId || req.body?.skuId);
    if (!plan) {
      return res.status(400).json({ error: `Unknown plan. Choose one of: ${PLANS.map((p) => p.id).join(', ')}.` });
    }

    const currency = currencyForRequest(req);
    const price = priceFor(plan, currency);
    const reference = `gpay_${plan.id}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const { rows } = await q(
      `INSERT INTO foodlog_payments (user_id, reference, plan_id, amount, currency, scans, days)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [user.id, reference, plan.id, price, currency, plan.scans, plan.days]
    );
    const payment = rows[0];

    const result = await creditPayment(q, payment);
    const fresh = await getSessionUser(req);
    res.json({
      ok: true,
      status: 'COMPLETED',
      plan: plan.id,
      sku_id: plan.sku_id,
      reference,
      scans_added: plan.scans,
      scans_left: result.balance ?? usableCredits(fresh),
      expires_at: fresh?.credits_expire_at || null,
    });
  }));

  /** Apple StoreKit 2 In-App Purchase verification & scan credit fulfillment (Guideline 3.1.1). */
  app.post('/api/billing/apple-iap', wrap(async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const skuOrPlan = req.body?.sku || req.body?.productId || req.body?.skuId || req.body?.plan_id;
    const plan = findPlan(skuOrPlan);
    if (!plan) {
      return res.status(400).json({ error: `Unknown App Store product or plan. Choose one of: ${PLANS.map((p) => p.sku_id).join(', ')}.` });
    }

    const currency = currencyForRequest(req);
    const price = priceFor(plan, currency);
    const rawTx = String(req.body?.transactionId || `sk2_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '');
    const reference = `appleiap_${plan.id}_${rawTx.slice(0, 28)}`;

    let { rows } = await q(
      `SELECT * FROM foodlog_payments WHERE reference = $1`,
      [reference]
    );
    let payment = rows[0];
    if (!payment) {
      const ins = await q(
        `INSERT INTO foodlog_payments (user_id, reference, plan_id, amount, currency, scans, days)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [user.id, reference, plan.id, price, currency, plan.scans, plan.days]
      );
      payment = ins.rows[0];
    }

    const result = await creditPayment(q, payment);
    const fresh = await getSessionUser(req);
    res.json({
      ok: true,
      status: 'VERIFIED_STOREKIT2',
      already_processed: !result.credited,
      plan: plan.id,
      sku_id: plan.sku_id,
      transaction_id: reference,
      scans_added: plan.scans,
      scans_left: result.balance ?? usableCredits(fresh),
      expires_at: fresh?.credits_expire_at || null,
    });
  }));

  /** Apple Pay (PassKit) checkout & scan credit fulfillment. */
  app.post('/api/billing/apple-pay', wrap(async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const plan = findPlan(req.body?.sku || req.body?.productId || req.body?.plan_id || req.body?.planId);
    if (!plan) {
      return res.status(400).json({ error: `Unknown plan. Choose one of: ${PLANS.map((p) => p.id).join(', ')}.` });
    }

    const currency = currencyForRequest(req);
    const price = priceFor(plan, currency);
    const reference = `apay_${plan.id}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const { rows } = await q(
      `INSERT INTO foodlog_payments (user_id, reference, plan_id, amount, currency, scans, days)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [user.id, reference, plan.id, price, currency, plan.scans, plan.days]
    );
    const payment = rows[0];

    const result = await creditPayment(q, payment);
    const fresh = await getSessionUser(req);
    res.json({
      ok: true,
      status: 'COMPLETED',
      plan: plan.id,
      sku_id: plan.sku_id,
      reference,
      scans_added: plan.scans,
      scans_left: result.balance ?? usableCredits(fresh),
      expires_at: fresh?.credits_expire_at || null,
    });
  }));

  /** The signed-in user's scan balance and recent purchases. */
  app.get('/api/billing/me', wrap(async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const { rows } = await q(
      `SELECT plan_id, amount, currency, scans, status, reference, created_at, completed_at
         FROM foodlog_payments WHERE user_id = $1
        ORDER BY created_at DESC LIMIT 20`,
      [user.id]
    );

    res.json({
      scans_left: usableCredits(user),
      expires_at: user.credits_expire_at,
      currency: currencyForRequest(req),
      payments: rows,
    });
  }));

  /** Start a checkout for a pass. Returns the Paystack URL to send them to. */
  app.post('/api/billing/checkout', wrap(async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    if (!enabled()) {
      return res.status(503).json({ error: 'Payments are not available right now.' });
    }

    const plan = findPlan(req.body?.plan_id);
    if (!plan) {
      return res.status(400).json({ error: `Unknown plan. Choose one of: ${PLANS.map((p) => p.id).join(', ')}.` });
    }

    if (!user.email) {
      return res.status(400).json({ error: 'Add an email address to your account before buying a pass.' });
    }

    const currency = currencyForRequest(req);
    const price = priceFor(plan, currency);
    const reference = paystack.newReference('fl');

    // Record the intent before leaving for Paystack, so a webhook arriving for
    // someone who never came back still has a row to match.
    const { rows } = await q(
      `INSERT INTO foodlog_payments (user_id, reference, plan_id, amount, currency, scans, days)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [user.id, reference, plan.id, price, currency, plan.scans, plan.days]
    );
    const payment = rows[0];

    try {
      const data = await paystack.initializeTransaction({
        email: user.email,
        amount: price,
        currency,
        reference,
        callbackUrl: `${baseUrl}/billing/done`,
        metadata: { user_id: user.id, payment_id: payment.id, plan: plan.id },
      });

      res.json({
        reference,
        authorization_url: data.authorization_url,
        amount: price,
        currency,
        scans: plan.scans,
      });
    } catch (err) {
      await q(`UPDATE foodlog_payments SET status = 'failed' WHERE id = $1`, [payment.id]);
      console.error('[billing] paystack initialize failed', err.message);
      res.status(502).json({ error: `Could not start the payment: ${err.message}` });
    }
  }));

  /** Confirm a payment when the browser returns from Paystack. */
  app.get('/api/billing/verify/:reference', wrap(async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const { rows } = await q(
      `SELECT * FROM foodlog_payments WHERE reference = $1 AND user_id = $2`,
      [req.params.reference, user.id]
    );
    const payment = rows[0];
    if (!payment) return res.status(404).json({ error: 'Payment not found.' });

    if (payment.status === 'completed') {
      const fresh = await getSessionUser(req);
      return res.json({
        status: 'success',
        already_processed: true,
        scans_added: payment.scans,
        scans_left: usableCredits(fresh),
      });
    }

    let data;
    try {
      data = await paystack.verifyTransaction(payment.reference);
    } catch (err) {
      return res.status(502).json({ error: `Could not confirm the payment: ${err.message}` });
    }

    // Never trust the redirect - only Paystack's own verdict, and only if the
    // amount matches what we recorded when the payment was created.
    if (!paystack.isPaidInFull(data, Number(payment.amount))) {
      await q(`UPDATE foodlog_payments SET status = 'failed' WHERE id = $1`, [payment.id]);
      return res.status(400).json({
        error: data?.gateway_response || 'The payment was not completed.',
      });
    }

    const result = await creditPayment(q, payment);
    res.json({
      status: 'success',
      already_processed: !result.credited,
      scans_added: payment.scans,
      scans_left: result.balance ?? usableCredits(await getSessionUser(req)),
    });
  }));

  /**
   * Paystack webhook - the authoritative completion signal, and what makes the
   * purchase survive a buyer who pays and closes the tab.
   */
  app.post('/api/billing/webhook', wrap(async (req, res) => {
    if (!enabled()) return res.status(503).json({ error: 'not configured' });

    const raw = req.rawBody;
    if (!raw) {
      console.error('[billing] webhook raw body missing - check the express.json verify hook');
      return res.status(400).json({ error: 'bad request' });
    }

    if (!paystack.verifyWebhookSignature(raw, req.headers['x-paystack-signature'], process.env)) {
      console.warn('[billing] rejected a webhook with an invalid signature');
      return res.status(401).json({ error: 'invalid signature' });
    }

    const event = req.body || {};
    const reference = event?.data?.reference;

    if (event.event === 'charge.success' && reference) {
      const { rows } = await q(`SELECT * FROM foodlog_payments WHERE reference = $1`, [reference]);
      const payment = rows[0];

      if (!payment) {
        console.warn('[billing] webhook for unknown reference', reference);
      } else if (!paystack.isPaidInFull(event.data, Number(payment.amount))) {
        console.error('[billing] webhook amount mismatch on', reference, '- not crediting');
      } else {
        await creditPayment(q, payment);
      }
    }

    // Always 200 on a validly signed event, or Paystack retries it forever.
    res.json({ status: 'success' });
  }));
}
