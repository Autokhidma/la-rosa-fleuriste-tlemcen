/**
 * Exporte le catalogue de démonstration en JSON statique :
 *   public/data/catalog.json
 *
 * Permet à la boutique de fonctionner en 100 % statique (Netlify, Vercel,
 * GitHub Pages, simple glisser-déposer du dossier public/) sans backend :
 * si l'API /api/* n'est pas joignable, le front charge ce fichier et bascule
 * la commande vers WhatsApp. Régénéré au build (voir package.json / vercel.json).
 */
const fs = require('fs');
const path = require('path');

const parse = (row) => ({
  id: row.id,
  name: row.name,
  category: row.category,
  description: row.description,
  special: row.special,
  price: row.price,
  images: JSON.parse(row.images || '[]'),
  sizes: JSON.parse(row.sizes || '[]'),
  colors: JSON.parse(row.colors || '[]'),
  best_seller: !!row.best_seller,
});

const seed = require('../src/seed-products');
const products = seed.map((p, i) => parse({ ...p, id: i + 1 }));

const zones = [
  { id: 1, name: 'Tlemcen Centre', fee: 300, delay: 'Livraison le jour même', active: 1 },
  { id: 2, name: 'Mansourah', fee: 400, delay: 'Livraison le jour même', active: 1 },
  { id: 3, name: 'Chetouane', fee: 400, delay: 'Livraison le jour même', active: 1 },
  { id: 4, name: 'Beni Mester', fee: 500, delay: 'Livraison le jour même', active: 1 },
  { id: 5, name: 'Hennaya', fee: 500, delay: 'Livraison le jour même', active: 1 },
  { id: 6, name: 'Remchi', fee: 600, delay: 'Livraison sous 24h', active: 1 },
  { id: 7, name: 'Maghnia', fee: 800, delay: 'Livraison sous 24h', active: 1 },
  { id: 8, name: 'Autre wilaya (Yalidine)', fee: 1200, delay: 'Livraison 2 à 5 jours', active: 1 },
];

const settings = {
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
};

const OUT = path.join(__dirname, '..', 'public', 'data');
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(
  path.join(OUT, 'catalog.json'),
  JSON.stringify({ settings, products, zones }, null, 2)
);
console.log('✔ public/data/catalog.json généré');
