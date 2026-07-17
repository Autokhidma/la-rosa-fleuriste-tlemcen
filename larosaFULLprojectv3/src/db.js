/**
 * Base de données — La Rosa Fleuriste Tlemcen (libSQL / SQLite)
 *
 * • En local (ou sur un hébergeur avec disque) : fichier SQLite dans DATA_DIR.
 * • Sur Vercel / serverless : base Turso PERSISTANTE si TURSO_DATABASE_URL est
 *   défini (sinon fichier /tmp éphémère — d'où « les produits ne se sauvent pas »).
 *
 *   → Créez une base gratuite sur https://turso.tech puis ajoutez dans Vercel :
 *        TURSO_DATABASE_URL = libsql://votre-base.turso.io
 *        TURSO_AUTH_TOKEN   = <token>
 *
 * Tables : products, orders (commandes), delivery_zones (livraison),
 *          categories, events, settings.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createClient } = require('@libsql/client');
const { DATA_DIR } = require('./paths');

// ---------- Connexion ----------
let client;
if (process.env.TURSO_DATABASE_URL) {
  client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
} else {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  client = createClient({ url: `file:${path.join(DATA_DIR, 'larosa.db')}` });
}

// ---------- Couche d'accès (API proche de better-sqlite3, mais asynchrone) ----------
const flatArgs = (args) =>
  args.length === 1 && args[0] && typeof args[0] === 'object' && !Array.isArray(args[0])
    ? args[0] // paramètres nommés (@name)
    : args; // paramètres positionnels (?)

const prepare = (sql) => ({
  get: async (...args) => (await client.execute({ sql, args: flatArgs(args) })).rows[0],
  all: async (...args) => (await client.execute({ sql, args: flatArgs(args) })).rows,
  run: async (...args) => {
    const r = await client.execute({ sql, args: flatArgs(args) });
    return { lastInsertRowid: Number(r.lastInsertRowid ?? 0), changes: r.rowsAffected };
  },
});

const exec = (sql) => client.executeMultiple(sql);

const db = { prepare, exec, client };

// ---------- Helpers ----------
const getSetting = async (key, fallback = '') => {
  const row = await prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
};

const setSetting = async (key, value) =>
  prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, String(value ?? ''));

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

// ---------- Schéma ----------
const createSchema = () =>
  exec(`
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
  rating REAL NOT NULL DEFAULT 4.8,
  rating_count INTEGER NOT NULL DEFAULT 12,
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
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);
`);

// ---------- Seed (une seule fois) ----------
const seedIfEmpty = async () => {
  if (!(await getSetting('admin_password_hash')))
    await setSetting('admin_password_hash', hashPassword(process.env.ADMIN_PASSWORD || 'larosalarosa113'));

  const defaults = {
    shop_name: 'La Rosa Fleuriste Tlemcen',
    tagline: 'Fleuriste N°01 à Tlemcen',
    tagline_ar: 'لاروزا تلمسان ترحب بكم',
    about:
      "La Rosa Fleuriste Tlemcen compose des bouquets et créations florales qui racontent vos émotions : amour, mariage, naissance, félicitations. Chaque pièce est préparée à la main avec des fleurs fraîches, au cœur de Tlemcen.",
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
    if ((await getSetting(k, null)) === null) await setSetting(k, v);
  }

  if ((await prepare('SELECT COUNT(*) AS n FROM categories').get()).n === 0) {
    const ins = prepare('INSERT INTO categories (name, emoji, icon, sort_order) VALUES (?, ?, ?, ?)');
    const cats = [
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
    ];
    for (const c of cats) await ins.run(...c);
  }

  if ((await prepare('SELECT COUNT(*) AS n FROM events').get()).n === 0) {
    const ins = prepare(
      'INSERT INTO events (key, name, emoji, banner, color1, color2, particles, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const evs = [
      ['valentine', 'Saint-Valentin', '💘', "C'est la Saint-Valentin — dites « je t'aime » avec les roses de La Rosa.", '#b0102f', '#7c1f3a', '💘❤️🌹', 1],
      ['mothers_day', 'Fête des Mères', '🌷', 'Fête des Mères — offrez un bouquet royal à la reine de votre cœur.', '#c65d82', '#caa24a', '🌷💛🌸', 2],
      ['womens_day', 'Journée de la Femme (8 Mars)', '💜', '8 Mars — La Rosa célèbre toutes les femmes.', '#7d3c98', '#b0102f', '🌷💜✨', 3],
      ['ramadan', 'Ramadan', '🌙', 'Ramadan Kareem — fleurs & paniers gourmands pour illuminer vos soirées.', '#0f7b5f', '#caa24a', '🌙⭐✨', 4],
    ];
    for (const e of evs) await ins.run(...e);
  }

  if ((await prepare('SELECT COUNT(*) AS n FROM delivery_zones').get()).n === 0) {
    const ins = prepare('INSERT INTO delivery_zones (name, fee, delay) VALUES (?, ?, ?)');
    const zones = [
      ['Tlemcen Centre', 300, 'Livraison le jour même'],
      ['Mansourah', 400, 'Livraison le jour même'],
      ['Chetouane', 400, 'Livraison le jour même'],
      ['Beni Mester', 500, 'Livraison le jour même'],
      ['Hennaya', 500, 'Livraison le jour même'],
      ['Remchi', 600, 'Livraison sous 24h'],
      ['Maghnia', 800, 'Livraison sous 24h'],
      ['Autre wilaya (Yalidine)', 1200, 'Livraison 2 à 5 jours'],
    ];
    for (const z of zones) await ins.run(...z);
  }

  if ((await prepare('SELECT COUNT(*) AS n FROM products').get()).n === 0) {
    const seed = require('./seed-products');
    const ins = prepare(`
      INSERT INTO products (name, category, description, special, price, images, sizes, colors, best_seller, sort_order, rating, rating_count)
      VALUES (@name, @category, @description, @special, @price, @images, @sizes, @colors, @best_seller, @sort_order, @rating, @rating_count)
    `);
    for (const p of seed) await ins.run(p);
  }
};

// ---------- Initialisation (une promesse partagée) ----------
const ready = (async () => {
  await createSchema();
  await seedIfEmpty();
})();

module.exports = { db, prepare, exec, getSetting, setSetting, hashPassword, verifyPassword, ready, client };
