/**
 * API Admin — authentification par mot de passe + gestion produits / commandes /
 * catégories / événements / livraison / paramètres.
 * Toutes les routes (sauf /login) exigent une session valide.
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { db, getSetting, setSetting, hashPassword, verifyPassword } = require('../db');
const { notifyNewOrder, buildOrderText } = require('../notify');
const { UPLOAD_DIR } = require('../paths');

const router = express.Router();

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 6 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|gif|svg\+xml|avif)$/.test(file.mimetype);
    cb(ok ? null : new Error('Format d’image non supporté'), ok);
  },
});

// ---------- Auth (jetons signés HMAC, sans état — compatibles serverless) ----------
const SESSION_TTL_DAYS = 14;
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(`larosa-session:${process.env.ADMIN_PASSWORD || 'larosalarosa113'}`).digest('hex');

const sign = (payload) => crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');

const makeToken = () => {
  const exp = Date.now() + SESSION_TTL_DAYS * 24 * 3600 * 1000;
  return `${exp}.${sign(String(exp))}`;
};

const checkToken = (token) => {
  const [exp, sig] = String(token || '').split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expected = sign(exp);
  return sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
};

const auth = (req, res, next) => {
  if (checkToken(req.cookies?.larosa_admin)) return next();
  res.status(401).json({ error: 'Non autorisé' });
};

const loginAttempts = new Map(); // IP -> { count, until }

router.post('/login', async (req, res) => {
  const ip = req.ip || 'unknown';
  const att = loginAttempts.get(ip);
  if (att && att.until > Date.now())
    return res.status(429).json({ error: 'Trop de tentatives, réessayez dans une minute.' });

  const { password } = req.body || {};
  if (!password || !verifyPassword(String(password), await getSetting('admin_password_hash'))) {
    const count = (att?.count || 0) + 1;
    loginAttempts.set(ip, { count, until: count >= 5 ? Date.now() + 60_000 : 0 });
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }

  loginAttempts.delete(ip);
  res.cookie('larosa_admin', makeToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: !!process.env.VERCEL,
    maxAge: SESSION_TTL_DAYS * 24 * 3600 * 1000,
  });
  res.json({ ok: true });
});

router.post('/logout', (_req, res) => {
  res.clearCookie('larosa_admin');
  res.json({ ok: true });
});

router.get('/me', auth, (_req, res) => res.json({ ok: true }));

router.post('/password', auth, async (req, res) => {
  const { new_password } = req.body || {};
  if (!new_password || String(new_password).length < 8)
    return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères' });
  await setSetting('admin_password_hash', hashPassword(String(new_password)));
  res.json({ ok: true });
});

// ---------- Dashboard ----------
router.get('/stats', auth, async (_req, res) => {
  const one = async (sql, ...p) => await db.prepare(sql).get(...p);
  const [total, neu, today, rev, prod, best, recent] = await Promise.all([
    one('SELECT COUNT(*) n FROM orders'),
    one("SELECT COUNT(*) n FROM orders WHERE status = 'nouvelle'"),
    one("SELECT COUNT(*) n FROM orders WHERE date(created_at) = date('now')"),
    one("SELECT COALESCE(SUM(total),0) s FROM orders WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m','now') AND status != 'annulée'"),
    one('SELECT COUNT(*) n FROM products WHERE active = 1'),
    one('SELECT COUNT(*) n FROM products WHERE best_seller = 1 AND active = 1'),
    db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 8').all(),
  ]);
  res.json({
    orders_total: total.n,
    orders_new: neu.n,
    orders_today: today.n,
    revenue_month: rev.s,
    products_count: prod.n,
    best_sellers: best.n,
    recent_orders: recent,
  });
});

// ---------- Produits ----------
const productFromBody = (b) => ({
  name: String(b.name || '').trim().slice(0, 120),
  category: String(b.category || 'Bouquets').trim().slice(0, 60),
  description: String(b.description || '').slice(0, 2000),
  special: String(b.special || '').slice(0, 500),
  price: Math.max(0, parseInt(b.price, 10) || 0),
  images: JSON.stringify(Array.isArray(b.images) ? b.images.slice(0, 6) : []),
  sizes: JSON.stringify(Array.isArray(b.sizes) ? b.sizes.slice(0, 8) : []),
  colors: JSON.stringify(Array.isArray(b.colors) ? b.colors.slice(0, 10) : []),
  best_seller: b.best_seller ? 1 : 0,
  active: b.active === false || b.active === 0 ? 0 : 1,
  sort_order: parseInt(b.sort_order, 10) || 0,
  rating: Math.max(0, Math.min(5, parseFloat(b.rating) || 0)),
  rating_count: Math.max(0, parseInt(b.rating_count, 10) || 0),
});

router.get('/products', auth, async (_req, res) => {
  const rows = await db.prepare('SELECT * FROM products ORDER BY sort_order ASC, id DESC').all();
  res.json(
    rows.map((r) => ({
      ...r,
      images: JSON.parse(r.images),
      sizes: JSON.parse(r.sizes),
      colors: JSON.parse(r.colors),
    }))
  );
});

router.post('/products', auth, async (req, res) => {
  const p = productFromBody(req.body || {});
  if (!p.name) return res.status(400).json({ error: 'Nom requis' });
  const info = await db
    .prepare(`INSERT INTO products (name, category, description, special, price, images, sizes, colors, best_seller, active, sort_order, rating, rating_count)
              VALUES (@name, @category, @description, @special, @price, @images, @sizes, @colors, @best_seller, @active, @sort_order, @rating, @rating_count)`)
    .run(p);
  res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

router.put('/products/:id', auth, async (req, res) => {
  const p = productFromBody(req.body || {});
  if (!p.name) return res.status(400).json({ error: 'Nom requis' });
  const info = await db
    .prepare(`UPDATE products SET name=@name, category=@category, description=@description, special=@special,
              price=@price, images=@images, sizes=@sizes, colors=@colors, best_seller=@best_seller,
              active=@active, sort_order=@sort_order, rating=@rating, rating_count=@rating_count WHERE id=@id`)
    .run({ ...p, id: Number(req.params.id) });
  if (!info.changes) return res.status(404).json({ error: 'Produit introuvable' });
  res.json({ ok: true });
});

router.delete('/products/:id', auth, async (req, res) => {
  const info = await db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Produit introuvable' });
  res.json({ ok: true });
});

router.post('/upload', auth, upload.array('images', 6), (req, res) => {
  res.json({ ok: true, files: (req.files || []).map((f) => `/uploads/${f.filename}`) });
});

// ---------- Commandes ----------
const ORDER_STATUSES = ['nouvelle', 'confirmée', 'en préparation', 'livrée', 'annulée'];

router.get('/orders', auth, async (req, res) => {
  let sql = 'SELECT * FROM orders';
  const params = [];
  if (req.query.status && ORDER_STATUSES.includes(req.query.status)) {
    sql += ' WHERE status = ?';
    params.push(req.query.status);
  }
  sql += ' ORDER BY id DESC LIMIT 300';
  res.json((await db.prepare(sql).all(...params)).map((o) => ({ ...o, items: JSON.parse(o.items) })));
});

router.put('/orders/:id', auth, async (req, res) => {
  const { status } = req.body || {};
  if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ error: 'Statut invalide' });
  const info = await db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Commande introuvable' });
  res.json({ ok: true });
});

router.delete('/orders/:id', auth, async (req, res) => {
  const info = await db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Commande introuvable' });
  res.json({ ok: true });
});

// ---------- Catégories ----------
router.get('/categories', auth, async (_req, res) => {
  res.json(await db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category = c.name) AS product_count
    FROM categories c ORDER BY c.sort_order ASC, c.name ASC
  `).all());
});

router.post('/categories', auth, async (req, res) => {
  const { name, emoji = '💐', icon = '', sort_order = 0 } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Nom requis' });
  try {
    const info = await db
      .prepare('INSERT INTO categories (name, emoji, icon, sort_order) VALUES (?, ?, ?, ?)')
      .run(String(name).trim().slice(0, 60), String(emoji).slice(0, 8), String(icon).slice(0, 300), parseInt(sort_order, 10) || 0);
    res.status(201).json({ ok: true, id: info.lastInsertRowid });
  } catch {
    res.status(400).json({ error: 'Cette catégorie existe déjà' });
  }
});

router.put('/categories/:id', auth, async (req, res) => {
  const cat = await db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!cat) return res.status(404).json({ error: 'Catégorie introuvable' });
  const { name, emoji = cat.emoji, icon = cat.icon, sort_order = cat.sort_order, active = cat.active } = req.body || {};
  const newName = String(name || cat.name).trim().slice(0, 60);
  try {
    await db.prepare('UPDATE categories SET name = ?, emoji = ?, icon = ?, sort_order = ?, active = ? WHERE id = ?')
      .run(newName, String(emoji).slice(0, 8), String(icon).slice(0, 300), parseInt(sort_order, 10) || 0, active ? 1 : 0, cat.id);
    // Renommage → on suit les produits
    if (newName !== cat.name)
      await db.prepare('UPDATE products SET category = ? WHERE category = ?').run(newName, cat.name);
    res.json({ ok: true });
  } catch {
    res.status(400).json({ error: 'Ce nom de catégorie existe déjà' });
  }
});

router.delete('/categories/:id', auth, async (req, res) => {
  const cat = await db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!cat) return res.status(404).json({ error: 'Catégorie introuvable' });
  const count = (await db.prepare('SELECT COUNT(*) n FROM products WHERE category = ?').get(cat.name)).n;
  if (count > 0) {
    await db.prepare(`INSERT INTO categories (name, emoji, sort_order) VALUES ('Autres', '🎁', 99)
                ON CONFLICT(name) DO NOTHING`).run();
    await db.prepare('UPDATE products SET category = ? WHERE category = ?').run('Autres', cat.name);
  }
  await db.prepare('DELETE FROM categories WHERE id = ?').run(cat.id);
  res.json({ ok: true, moved: count });
});

// ---------- Événements spéciaux ----------
router.get('/events', auth, async (_req, res) => {
  res.json(await db.prepare('SELECT * FROM events ORDER BY sort_order ASC').all());
});

router.put('/events/:id', auth, async (req, res) => {
  const ev = await db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!ev) return res.status(404).json({ error: 'Événement introuvable' });
  const b = req.body || {};
  await db.prepare('UPDATE events SET name = ?, emoji = ?, banner = ?, color1 = ?, color2 = ?, particles = ?, active = ? WHERE id = ?')
    .run(
      String(b.name ?? ev.name).slice(0, 80),
      String(b.emoji ?? ev.emoji).slice(0, 8),
      String(b.banner ?? ev.banner).slice(0, 300),
      String(b.color1 ?? ev.color1).slice(0, 20),
      String(b.color2 ?? ev.color2).slice(0, 20),
      String(b.particles ?? ev.particles).slice(0, 30),
      b.active !== undefined ? (b.active ? 1 : 0) : ev.active,
      ev.id
    );
  res.json({ ok: true });
});

// ---------- Livraison ----------
router.get('/zones', auth, async (_req, res) => {
  res.json(await db.prepare('SELECT * FROM delivery_zones ORDER BY fee ASC').all());
});

router.post('/zones', auth, async (req, res) => {
  const { name, fee, delay = '', active = 1 } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Nom requis' });
  const info = await db
    .prepare('INSERT INTO delivery_zones (name, fee, delay, active) VALUES (?, ?, ?, ?)')
    .run(String(name).slice(0, 80), Math.max(0, parseInt(fee, 10) || 0), String(delay).slice(0, 120), active ? 1 : 0);
  res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

router.put('/zones/:id', auth, async (req, res) => {
  const { name, fee, delay = '', active = 1 } = req.body || {};
  const info = await db
    .prepare('UPDATE delivery_zones SET name = ?, fee = ?, delay = ?, active = ? WHERE id = ?')
    .run(String(name).slice(0, 80), Math.max(0, parseInt(fee, 10) || 0), String(delay).slice(0, 120), active ? 1 : 0, req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Zone introuvable' });
  res.json({ ok: true });
});

router.delete('/zones/:id', auth, async (req, res) => {
  const info = await db.prepare('DELETE FROM delivery_zones WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Zone introuvable' });
  res.json({ ok: true });
});

// ---------- Paramètres ----------
const EDITABLE_SETTINGS = [
  'shop_name', 'tagline', 'tagline_ar', 'about', 'phone', 'whatsapp', 'instagram',
  'facebook', 'address', 'map_url', 'hours', 'currency', 'hero_image', 'logo_image',
  'n8n_webhook_url', 'telegram_bot_token', 'telegram_chat_id', 'notify_enabled',
];

router.get('/settings', auth, async (_req, res) => {
  const out = {};
  await Promise.all(EDITABLE_SETTINGS.map(async (k) => (out[k] = await getSetting(k))));
  res.json(out);
});

router.put('/settings', auth, async (req, res) => {
  for (const [k, v] of Object.entries(req.body || {})) {
    if (EDITABLE_SETTINGS.includes(k)) await setSetting(k, String(v ?? '').slice(0, 2000));
  }
  res.json({ ok: true });
});

router.post('/test-notification', auth, async (_req, res) => {
  const fake = {
    order_number: 'LR-TEST-0000',
    customer_name: 'Client Test',
    phone: '+213 555 00 00 00',
    address: 'Rue des Roses, Tlemcen',
    zone_name: 'Tlemcen Centre',
    delivery_fee: 300,
    items: JSON.stringify([{ name: 'Bouquet Rouge Passion', size: 'M — Moyen', color: 'Rouge passion', qty: 1, unit_price: 4500 }]),
    subtotal: 4500,
    total: 4800,
    message: 'Ceci est une notification de test 🎉',
    delivery_date: '',
  };
  const report = await notifyNewOrder(fake);
  res.json({ ok: true, report, preview: buildOrderText(fake) });
});

module.exports = router;
