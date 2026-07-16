/**
 * Chemins d'écriture — sur Vercel (serverless), seul /tmp est inscriptible :
 * la base et les uploads y sont donc éphémères (voir README, section Déploiement).
 * En local / VPS, on écrit dans le projet comme d'habitude.
 */
const path = require('path');

const ON_VERCEL = !!process.env.VERCEL;

const DATA_DIR = process.env.DATA_DIR || (ON_VERCEL ? '/tmp/larosa-data' : path.join(__dirname, '..', 'data'));
const UPLOAD_DIR = process.env.UPLOAD_DIR || (ON_VERCEL ? '/tmp/larosa-uploads' : path.join(__dirname, '..', 'public', 'uploads'));

module.exports = { ON_VERCEL, DATA_DIR, UPLOAD_DIR };
