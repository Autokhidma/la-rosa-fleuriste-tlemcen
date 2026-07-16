/**
 * API publique — boutique (produits, zones de livraison, création de commandes).
 */
const express = require('express');
const { db, getSetting } = require('../db');
const { notifyNewOrder } = require('../notify');

const router = express.Router();

const parseProduct = (row) => ({
  ...row,
  images: JSON.parse(row.images || '[]'),
  sizes: JSON.parse(row.sizes || '[]'),
  colors: JSON.parse(row.colors || '[]'),
  best_seller: !!row.best_seller,
});

router.get('/products', (req, res) => {
  let sql = 'SELECT * FROM products WHERE active = 1';
  const params = [];
  if (req.query.category) {
    sql += ' AND category = ?';
    params.push(req.query.category);
  }
  if (req.query.best_seller === '1') sql += ' AND best_seller = 1';
  sql += ' ORDER BY sort_order ASC, id DESC';
  res.json(db.prepare(sql).all(...params).map(parseProduct));
});

router.get('/products/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Produit introuvable' });
  res.json(parseProduct(row));
});

router.get('/categories', (_req, res) => {
  const rows = db
    .prepare('SELECT DISTINCT category FROM products WHERE active = 1 ORDER BY category')
    .all();
  res.json(rows.map((r) => r.category));
});

router.get('/zones', (_req, res) => {
  res.json(db.prepare('SELECT * FROM delivery_zones WHERE active = 1 ORDER BY fee ASC').all());
});

router.get('/settings', (_req, res) => {
  const keys = [
    'shop_name', 'tagline', 'tagline_ar', 'about', 'phone', 'whatsapp',
    'instagram', 'facebook', 'address', 'map_url', 'hours', 'currency',
  ];
  const out = {};
  keys.forEach((k) => (out[k] = getSetting(k)));
  res.json(out);
});

// ---- Création de commande ----
router.post('/orders', async (req, res) => {
  try {
    const { customer_name, phone, address = '', zone_id, items, message = '', delivery_date = '' } = req.body || {};

    if (!customer_name || String(customer_name).trim().length < 2)
      return res.status(400).json({ error: 'Nom du client requis' });
    if (!phone || !/^[+0-9 ()-]{8,20}$/.test(String(phone).trim()))
      return res.status(400).json({ error: 'Numéro de téléphone invalide' });
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: 'Le panier est vide' });

    // Recalcul des prix côté serveur (jamais confiance au client)
    const cleanItems = [];
    let subtotal = 0;
    for (const it of items.slice(0, 30)) {
      const product = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(it.product_id);
      if (!product) return res.status(400).json({ error: `Produit ${it.product_id} indisponible` });
      const sizes = JSON.parse(product.sizes || '[]');
      const size = sizes.find((s) => s.label === it.size);
      const unit = size ? size.price : product.price;
      const qty = Math.max(1, Math.min(50, parseInt(it.qty, 10) || 1));
      const colors = JSON.parse(product.colors || '[]');
      const color = colors.find((c) => c.name === it.color)?.name || '';
      cleanItems.push({
        product_id: product.id,
        name: product.name,
        size: size ? size.label : '',
        color,
        qty,
        unit_price: unit,
      });
      subtotal += unit * qty;
    }

    let zone = null;
    if (zone_id) zone = db.prepare('SELECT * FROM delivery_zones WHERE id = ? AND active = 1').get(zone_id);
    const deliveryFee = zone ? zone.fee : 0;
    const total = subtotal + deliveryFee;

    const year = new Date().getFullYear();
    const seq = db.prepare("SELECT COUNT(*) AS n FROM orders WHERE order_number LIKE ?").get(`LR-${year}-%`).n + 1;
    const orderNumber = `LR-${year}-${String(seq).padStart(4, '0')}`;

    const info = db
      .prepare(`
        INSERT INTO orders (order_number, customer_name, phone, address, zone_id, zone_name, delivery_fee, items, subtotal, total, message, delivery_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        orderNumber,
        String(customer_name).trim().slice(0, 100),
        String(phone).trim(),
        String(address).trim().slice(0, 300),
        zone ? zone.id : null,
        zone ? zone.name : '',
        deliveryFee,
        JSON.stringify(cleanItems),
        subtotal,
        total,
        String(message).trim().slice(0, 500),
        String(delivery_date).trim().slice(0, 30)
      );

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(info.lastInsertRowid);

    // Notification propriétaire (n8n / Telegram). En serverless (Vercel), la
    // fonction est gelée dès la réponse envoyée : on attend donc l'envoi.
    const notifP = notifyNewOrder(order).catch((err) => console.error('[notify]', err.message));
    if (process.env.VERCEL) await notifP;

    res.status(201).json({
      ok: true,
      order_number: orderNumber,
      total,
      delivery_fee: deliveryFee,
      whatsapp: getSetting('whatsapp'),
    });
  } catch (err) {
    console.error('POST /api/orders', err);
    res.status(500).json({ error: 'Erreur serveur, réessayez.' });
  }
});

module.exports = router;
