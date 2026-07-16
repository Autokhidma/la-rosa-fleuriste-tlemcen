/**
 * Base de données SQLite — La Rosa Fleuriste Tlemcen
 * Tables : products, orders (commandes), delivery_zones (livraison), settings
 */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const crypto = require('crypto');
const { DATA_DIR } = require('./paths');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'larosa.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Bouquets',
  description TEXT DEFAULT '',
  special TEXT DEFAULT '',
  price INTEGER NOT NULL DEFAULT 0,
  images TEXT NOT NULL DEFAULT '[]',
  sizes TEXT NOT NULL DEFAULT '[]',
  colors TEXT NOT NULL DEFAULT '[]',
  best_seller INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS delivery_zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  fee INTEGER NOT NULL DEFAULT 0,
  delay TEXT DEFAULT 'Livraison le jour même',
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT DEFAULT '',
  zone_id INTEGER,
  zone_name TEXT DEFAULT '',
  delivery_fee INTEGER NOT NULL DEFAULT 0,
  items TEXT NOT NULL DEFAULT '[]',
  subtotal INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  message TEXT DEFAULT '',
  delivery_date TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'nouvelle',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  emoji TEXT DEFAULT '💐',
  icon TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '🎉',
  banner TEXT DEFAULT '',
  color1 TEXT DEFAULT '#e0355c',
  color2 TEXT DEFAULT '#8e44ad',
  particles TEXT DEFAULT '✨',
  active INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
`);

// ---------- Migrations légères (bases existantes) ----------
const productCols = db.prepare('PRAGMA table_info(products)').all().map((c) => c.name);
if (!productCols.includes('rating'))
  db.exec('ALTER TABLE products ADD COLUMN rating REAL NOT NULL DEFAULT 4.8');
if (!productCols.includes('rating_count'))
  db.exec('ALTER TABLE products ADD COLUMN rating_count INTEGER NOT NULL DEFAULT 12');

// ---------- Helpers ----------
const getSetting = (key, fallback = '') => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
};

const setSetting = (key, value) => {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, String(value ?? ''));
};

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (password, stored) => {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(password, salt, 32).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'));
};

// ---------- Seed ----------
const seedIfEmpty = () => {
  if (!getSetting('admin_password_hash')) {
    setSetting('admin_password_hash', hashPassword(process.env.ADMIN_PASSWORD || 'larosalarosa113'));
  }

  const defaults = {
    shop_name: 'La Rosa Fleuriste Tlemcen',
    tagline: 'Fleuriste N°01 à Tlemcen 💐',
    tagline_ar: 'لاروزا تلمسان ترحب بكم',
    about:
      "La Rosa Fleuriste Tlemcen crée des bouquets et compositions florales qui racontent vos émotions : amour, mariage, naissance, félicitations... Chaque création est préparée avec des fleurs fraîches, choisies avec passion au cœur de Tlemcen. Tous les bonheurs d'amour dans les bouquets de fleurs.",
    phone: '+213 000 00 00 00',
    whatsapp: '+213 000 00 00 00',
    instagram: 'https://www.instagram.com/la_rosa_fleuriste_tlemcen/',
    facebook: 'https://www.facebook.com/people/La-Rosa/100091832552880/',
    address: 'Tlemcen, Algérie',
    map_url: 'https://maps.google.com/?q=La+Rosa+Fleuriste+Tlemcen',
    hours: 'Tous les jours : 9h00 – 20h00',
    currency: 'DA',
    hero_image: '/img/hero-bouquet.svg',
    logo_image: '/img/logo.svg',
    n8n_webhook_url: process.env.N8N_WEBHOOK_URL || '',
    telegram_bot_token: process.env.TELEGRAM_BOT_TOKEN || '',
    telegram_chat_id: process.env.TELEGRAM_CHAT_ID || '',
    notify_enabled: '1',
  };
  for (const [k, v] of Object.entries(defaults)) {
    if (getSetting(k, null) === null) setSetting(k, v);
  }

  const catCount = db.prepare('SELECT COUNT(*) AS n FROM categories').get().n;
  if (catCount === 0) {
    const ins = db.prepare(
      'INSERT INTO categories (name, emoji, icon, sort_order) VALUES (?, ?, ?, ?)'
    );
    [
      ['Bouquets', '💐', '/img/cats/bouquets.svg', 1],
      ['Box & Paniers', '🎁', '/img/cats/box.svg', 2],
      ['Roses Éternelles', '🌹', '/img/cats/eternelle.svg', 3],
      ['Boules de neige', '❄️', '/img/cats/boule.svg', 4],
      ['Nounours', '🧸', '/img/cats/nounours.svg', 5],
      ['Montres', '⌚', '/img/cats/montre.svg', 6],
      ['Parfums', '🌸', '/img/cats/parfum.svg', 7],
      ['Mariage', '💍', '/img/cats/mariage.svg', 8],
      ['Occasions', '🎀', '/img/cats/occasions.svg', 9],
      ['Plantes', '🪴', '/img/cats/plantes.svg', 10],
    ].forEach((c) => ins.run(...c));
  }

  const eventCount = db.prepare('SELECT COUNT(*) AS n FROM events').get().n;
  if (eventCount === 0) {
    const ins = db.prepare(
      'INSERT INTO events (key, name, emoji, banner, color1, color2, particles, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    [
      ['valentine', 'Saint-Valentin', '💘', "C'est la Saint-Valentin ! Dites « je t'aime » avec les roses de La Rosa 💘", '#c81d3c', '#ff6b81', '💘❤️🌹', 1],
      ['mothers_day', 'Fête des Mères', '🌷', 'Fête des Mères — gâtez la reine de votre cœur avec un bouquet royal 🌷', '#e56aa2', '#f5c518', '🌷💛🌸', 2],
      ['womens_day', 'Journée de la Femme (8 Mars)', '💜', '8 Mars — La Rosa célèbre toutes les femmes 💜 Offres spéciales en boutique', '#8e44ad', '#d63384', '🌷💜✨', 3],
      ['ramadan', 'Ramadan', '🌙', 'Ramadan Kareem 🌙 Fleurs & paniers gourmands pour illuminer vos soirées', '#0f7b5f', '#d4a017', '🌙⭐✨', 4],
    ].forEach((e) => ins.run(...e));
  }

  const zoneCount = db.prepare('SELECT COUNT(*) AS n FROM delivery_zones').get().n;
  if (zoneCount === 0) {
    const insertZone = db.prepare('INSERT INTO delivery_zones (name, fee, delay) VALUES (?, ?, ?)');
    [
      ['Tlemcen Centre', 300, 'Livraison le jour même'],
      ['Mansourah', 400, 'Livraison le jour même'],
      ['Chetouane', 400, 'Livraison le jour même'],
      ['Beni Mester', 500, 'Livraison le jour même'],
      ['Hennaya', 500, 'Livraison le jour même'],
      ['Remchi', 600, 'Livraison sous 24h'],
      ['Maghnia', 800, 'Livraison sous 24h'],
      ['Autre wilaya (Yalidine)', 1200, 'Livraison 2 à 5 jours'],
    ].forEach((z) => insertZone.run(...z));
  }

  const productCount = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
  if (productCount === 0) {
    const insert = db.prepare(`
      INSERT INTO products (name, category, description, special, price, images, sizes, colors, best_seller, sort_order, rating, rating_count)
      VALUES (@name, @category, @description, @special, @price, @images, @sizes, @colors, @best_seller, @sort_order, @rating, @rating_count)
    `);
    const seed = require('./seed-products');
    const tx = db.transaction((rows) => rows.forEach((r) => insert.run(r)));
    tx(seed);
  }
};

seedIfEmpty();

module.exports = { db, getSetting, setSetting, hashPassword, verifyPassword };
