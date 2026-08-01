'use strict';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';

const { Pool } = pg;
const PORT = process.env.PORT || 3012;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '355354020888-nmt0qlr55adgprvhaht50oamstv637qs.apps.googleusercontent.com';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const gClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

const q = (sql, params) => pool.query(sql, params);
const wrap = fn => (req, res, next) => fn(req, res).catch(next);

async function initDb() {
  await q(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      email         TEXT UNIQUE NOT NULL,
      name          TEXT,
      avatar        TEXT,
      google_sub    TEXT UNIQUE,
      password_hash TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`);
  await q(`
    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS foodlog_state (
      user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      state      JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS oauth_codes (
      code         TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      client_id    TEXT NOT NULL,
      redirect_uri TEXT NOT NULL,
      expires_at   TIMESTAMPTZ NOT NULL,
      used_at      TIMESTAMPTZ,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('DB ready');
}

async function getSessionUser(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return null;
  const { rows } = await q(
    `SELECT u.* FROM sessions s JOIN users u ON s.user_id = u.id
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [token]
  );
  return rows[0] || null;
}

function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name, avatar: u.avatar };
}

async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  await q(
    `INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
    [token, userId]
  );
  return token;
}

// --- Password hashing (Node built-in scrypt, no external dependency) ---
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}
function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string' || !stored.startsWith('scrypt$')) return false;
  const [, salt, hash] = stored.split('$');
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(String(password), salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(test, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register — email + password sign up
app.post('/api/auth/register', wrap(async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required.' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const existing = await q('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows[0]) return res.status(409).json({ error: 'That email is already registered. Try signing in.' });

  const { rows } = await q(
    `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *`,
    [email, name, hashPassword(password)]
  );
  const user = rows[0];
  const token = await createSession(user.id);
  res.json({ token, user: publicUser(user) });
}));

// POST /api/auth/login — email + password sign in
app.post('/api/auth/login', wrap(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  const { rows } = await q('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user || !user.password_hash || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  const token = await createSession(user.id);
  res.json({ token, user: publicUser(user) });
}));

// POST /api/auth/google
app.post('/api/auth/google', wrap(async (req, res) => {
  const { credential } = req.body || {};
  if (!credential) return res.status(400).json({ error: 'credential required' });

  const ticket = await gClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  const sub = payload.sub;
  const email = String(payload.email || '').toLowerCase();
  const name = payload.name;
  const picture = payload.picture;

  // Link Google to an existing account (by google_sub, then by email), otherwise create one.
  let user = (await q('SELECT * FROM users WHERE google_sub = $1', [sub])).rows[0];
  if (!user && email) user = (await q('SELECT * FROM users WHERE email = $1', [email])).rows[0];

  if (user) {
    const { rows } = await q(
      `UPDATE users SET google_sub = $1, name = COALESCE($2, name), avatar = COALESCE($3, avatar)
       WHERE id = $4 RETURNING *`,
      [sub, name || null, picture || null, user.id]
    );
    user = rows[0];
  } else {
    const { rows } = await q(
      `INSERT INTO users (email, name, avatar, google_sub) VALUES ($1, $2, $3, $4) RETURNING *`,
      [email, name, picture || null, sub]
    );
    user = rows[0];
  }
  const token = await createSession(user.id);
  res.json({ token, user: publicUser(user) });
}));

// GET /api/auth/me
app.get('/api/auth/me', wrap(async (req, res) => {
  const user = await getSessionUser(req);
  res.json({ user: user ? publicUser(user) : null });
}));

// POST /api/auth/logout
app.post('/api/auth/logout', wrap(async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '').trim();
  if (token) await q('DELETE FROM sessions WHERE token = $1', [token]);
  res.json({ ok: true });
}));

// ── PersonalOS OAuth-style partner integration ─────────────────────────
const OAUTH_CLIENTS = {
  personalos: {
    name: 'PersonalOS',
    allowedRedirects: [
      'https://personaios.com/meals',
      'http://localhost:3000/meals',
      'http://127.0.0.1:3000/meals',
    ],
  },
};

function isAllowedRedirect(clientId, redirectUri) {
  const client = OAUTH_CLIENTS[clientId];
  if (!client) return false;
  return client.allowedRedirects.some(allowed => redirectUri === allowed || redirectUri.startsWith(allowed + '?'));
}

// POST /api/oauth/authorize — Foodlog user (Bearer) grants PersonalOS a one-time code
app.post('/api/oauth/authorize', wrap(async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Sign in to Foodlog first' });

  const clientId = String(req.body?.client_id || '').trim();
  const redirectUri = String(req.body?.redirect_uri || '').trim();
  const state = String(req.body?.state || '');
  if (!OAUTH_CLIENTS[clientId]) return res.status(400).json({ error: 'Unknown client' });
  if (!redirectUri || !isAllowedRedirect(clientId, redirectUri)) {
    return res.status(400).json({ error: 'Invalid redirect_uri' });
  }

  const code = crypto.randomBytes(24).toString('hex');
  await q(
    `INSERT INTO oauth_codes (code, user_id, client_id, redirect_uri, expires_at)
     VALUES ($1, $2, $3, $4, NOW() + INTERVAL '10 minutes')`,
    [code, user.id, clientId, redirectUri]
  );
  res.json({ code, state, expires_in: 600 });
}));

// POST /api/oauth/token — exchange one-time code for a Foodlog access token
app.post('/api/oauth/token', wrap(async (req, res) => {
  const code = String(req.body?.code || '').trim();
  const clientId = String(req.body?.client_id || '').trim();
  if (!code || !clientId) return res.status(400).json({ error: 'code and client_id required' });

  const { rows } = await q(
    `SELECT * FROM oauth_codes
     WHERE code = $1 AND client_id = $2 AND used_at IS NULL AND expires_at > NOW()`,
    [code, clientId]
  );
  const row = rows[0];
  if (!row) return res.status(400).json({ error: 'Invalid or expired authorization code' });

  await q(`UPDATE oauth_codes SET used_at = NOW() WHERE code = $1`, [code]);
  const accessToken = await createSession(row.user_id);
  const user = (await q('SELECT * FROM users WHERE id = $1', [row.user_id])).rows[0];
  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 30 * 24 * 3600,
    user: publicUser(user),
  });
}));

// GET /api/sync — load user's foodlog state
app.get('/api/sync', wrap(async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  const { rows } = await q('SELECT state FROM foodlog_state WHERE user_id = $1', [user.id]);
  res.json({ state: rows[0]?.state || null });
}));

// POST /api/sync — save user's foodlog state
app.post('/api/sync', wrap(async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  const { state } = req.body || {};
  if (!state) return res.status(400).json({ error: 'state required' });

  await q(
    `INSERT INTO foodlog_state (user_id, state, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (user_id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`,
    [user.id, JSON.stringify(state)]
  );
  res.json({ ok: true });
}));

// POST /api/scan — identify food from a photo using Gemini vision (Africa-aware)
const SCAN_PROMPT = `You are FoodLog's food-recognition engine, an expert nutritionist who specialises in African cuisine (East, West, Central and Southern Africa) as well as common global foods.

Look at the photo and identify every distinct food or drink item on the plate/table. Be specific and use the correct local dish name where relevant (e.g. ugali, sukuma wiki, nyama choma, chapati, jollof rice, injera, doro wat, matoke, githeri, pilau, fufu, egusi soup, waakye, kachumbari, mandazi, bunny chow, bobotie, samp, etc.). If a food is clearly a standard global item (rice, chicken, banana), name it plainly.

For EACH item return:
- name: the dish/food name (include the local African name where it applies)
- serving: a realistic serving description with an estimated portion (e.g. "1 mound (~250g)", "2 pieces (~120g)")
- category: one of Meal, Protein, Grains, Vegetables, Legumes, Fruit, Dairy, Drink, Snack, Nuts, Fats
- calories, protein, carbs, fat, fiber: numeric nutrition estimates FOR THAT SERVING (grams for macros, kcal for calories). Give your best expert estimate.
- confidence: your confidence 0-1 that this identification is correct
- note: one short line of helpful context (traditional origin or a nutrition tip), max ~90 chars

Estimate portion sizes from visual cues. Prefer authentic African identifications when the dish looks African. If the image contains no food, return an empty items array and explain in summary.
Return ONLY structured JSON.`;

const SCAN_SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          serving: { type: 'STRING' },
          category: { type: 'STRING' },
          calories: { type: 'NUMBER' },
          protein: { type: 'NUMBER' },
          carbs: { type: 'NUMBER' },
          fat: { type: 'NUMBER' },
          fiber: { type: 'NUMBER' },
          confidence: { type: 'NUMBER' },
          note: { type: 'STRING' }
        },
        required: ['name', 'serving', 'category', 'calories', 'protein', 'carbs', 'fat', 'fiber']
      }
    },
    summary: { type: 'STRING' }
  },
  required: ['items', 'summary']
};

app.post('/api/scan', wrap(async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  if (!GEMINI_API_KEY) return res.status(503).json({ error: 'Food scanning is not configured on the server.' });

  const { image } = req.body || {};
  if (!image || typeof image !== 'string') return res.status(400).json({ error: 'image required' });

  const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
  const mimeType = match ? match[1] : 'image/jpeg';
  const data = match ? match[2] : image;
  if (!data || data.length < 100) return res.status(400).json({ error: 'image looks empty' });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const payload = {
    contents: [{ parts: [{ text: SCAN_PROMPT }, { inlineData: { mimeType, data } }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: SCAN_SCHEMA, temperature: 0.2 }
  };

  let gRes;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    gRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timer);
  } catch (err) {
    console.error('scan fetch failed', err);
    return res.status(502).json({ error: 'The food recognizer is temporarily unavailable. Please try again.' });
  }

  if (!gRes.ok) {
    const body = await gRes.text().catch(() => '');
    console.error('scan gemini error', gRes.status, body.slice(0, 400));
    return res.status(502).json({ error: 'The food recognizer could not read that photo. Try a clearer, well-lit shot.' });
  }

  const result = await gRes.json();
  const text = (result?.candidates?.[0]?.content?.parts || [])
    .map(p => p.text || '')
    .join('')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    try { parsed = JSON.parse(m ? m[0] : '{}'); } catch { parsed = null; }
  }
  if (!parsed || !Array.isArray(parsed.items)) {
    return res.status(502).json({ error: 'Could not understand the photo. Try again or add the food manually.' });
  }

  const clean = n => Math.max(0, Math.round((Number(n) || 0) * 10) / 10);
  const items = parsed.items.slice(0, 12).map(it => ({
    name: String(it.name || 'Unknown food').slice(0, 80),
    serving: String(it.serving || '1 serving').slice(0, 80),
    category: String(it.category || 'Meal').slice(0, 40),
    calories: clean(it.calories),
    protein: clean(it.protein),
    carbs: clean(it.carbs),
    fat: clean(it.fat),
    fiber: clean(it.fiber),
    confidence: Math.max(0, Math.min(1, Number(it.confidence) || 0.6)),
    note: String(it.note || '').slice(0, 120)
  })).filter(it => it.calories > 0 || it.protein > 0 || it.carbs > 0 || it.fat > 0);

  res.json({ items, summary: String(parsed.summary || '').slice(0, 240) });
}));

// POST /api/parse — turn a free-text meal description into structured, logged foods
const PARSE_PROMPT = `You are FoodLog's natural-language meal parser — an expert nutritionist who knows African cuisine (East, West, Central and Southern Africa) as well as common global foods.

The user will describe, in everyday language, what they ate or drank (for example: "Today I ate 1 scrambled egg, 2 pieces of toast, bacon, and 2 glasses of orange juice"). Break their description into individual food and drink items.

For EACH item return:
- name: a clean, human food name (use the correct local African dish name where it applies, e.g. ugali, jollof rice, chapati, injera, nyama choma, sukuma wiki, pilau, matoke).
- quantity: the number of units the person described (default 1 if unspecified).
- serving: a realistic serving description that reflects the TOTAL amount the person ate (e.g. "2 slices (~56g)", "2 glasses (~500ml)", "1 large egg").
- category: exactly one of Meal, Protein, Grains, Vegetables, Legumes, Fruit, Dairy, Drink, Snack, Nuts, Fats.
- calories, protein, carbs, fat, fiber: numeric nutrition estimates for the TOTAL amount described (kcal for calories, grams for macros). Give your best expert estimate.
- emoji: ONE single emoji character that best represents this food (e.g. 🍳, 🍞, 🥓, 🍊, 🍚, 🫓). Always provide a food/drink emoji.
- note: one short helpful line (max ~80 chars), optional.

Estimate portions sensibly from the wording. If the text contains no food, return an empty items array and explain in summary. In summary, give one short friendly sentence. Return ONLY structured JSON.`;

const PARSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          quantity: { type: 'NUMBER' },
          serving: { type: 'STRING' },
          category: { type: 'STRING' },
          calories: { type: 'NUMBER' },
          protein: { type: 'NUMBER' },
          carbs: { type: 'NUMBER' },
          fat: { type: 'NUMBER' },
          fiber: { type: 'NUMBER' },
          emoji: { type: 'STRING' },
          note: { type: 'STRING' }
        },
        required: ['name', 'serving', 'category', 'calories', 'protein', 'carbs', 'fat', 'fiber', 'emoji']
      }
    },
    summary: { type: 'STRING' }
  },
  required: ['items', 'summary']
};

app.post('/api/parse', wrap(async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  if (!GEMINI_API_KEY) return res.status(503).json({ error: 'Natural-language logging is not configured on the server.' });

  const text = String(req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Describe what you ate first.' });
  if (text.length > 1200) return res.status(400).json({ error: 'That description is a bit long — try a shorter one.' });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const payload = {
    contents: [{ parts: [{ text: `${PARSE_PROMPT}\n\nUser description:\n"""${text}"""` }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: PARSE_SCHEMA, temperature: 0.2 }
  };

  let gRes;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    gRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timer);
  } catch (err) {
    console.error('parse fetch failed', err);
    return res.status(502).json({ error: 'The meal parser is temporarily unavailable. Please try again.' });
  }

  if (!gRes.ok) {
    const body = await gRes.text().catch(() => '');
    console.error('parse gemini error', gRes.status, body.slice(0, 400));
    return res.status(502).json({ error: 'Could not understand that description. Try rephrasing it.' });
  }

  const result = await gRes.json();
  const out = (result?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
  let parsed;
  try {
    parsed = JSON.parse(out);
  } catch {
    const m = out.match(/\{[\s\S]*\}/);
    try { parsed = JSON.parse(m ? m[0] : '{}'); } catch { parsed = null; }
  }
  if (!parsed || !Array.isArray(parsed.items)) {
    return res.status(502).json({ error: 'Could not understand that description. Try rephrasing it.' });
  }

  const clean = n => Math.max(0, Math.round((Number(n) || 0) * 10) / 10);
  const items = parsed.items.slice(0, 20).map(it => ({
    name: String(it.name || 'Food').slice(0, 80),
    quantity: Math.max(0, Number(it.quantity) || 1),
    serving: String(it.serving || '1 serving').slice(0, 80),
    category: String(it.category || 'Meal').slice(0, 40),
    calories: clean(it.calories),
    protein: clean(it.protein),
    carbs: clean(it.carbs),
    fat: clean(it.fat),
    fiber: clean(it.fiber),
    emoji: (String(it.emoji || '🍽️').match(/\p{Extended_Pictographic}/u) || ['🍽️'])[0],
    note: String(it.note || '').slice(0, 120)
  })).filter(it => it.calories > 0 || it.protein > 0 || it.carbs > 0 || it.fat > 0);

  res.json({ items, summary: String(parsed.summary || '').slice(0, 240) });
}));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

initDb().then(() => {
  app.listen(PORT, () => console.log(`foodlog-api :${PORT}`));
}).catch(err => { console.error('DB init failed', err); process.exit(1); });
