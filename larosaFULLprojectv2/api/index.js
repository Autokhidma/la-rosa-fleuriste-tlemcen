/**
 * Point d'entrée serverless Vercel — toute l'API passe par l'app Express.
 * Les fichiers statiques (public/) sont servis par le CDN Vercel ;
 * vercel.json réécrit /api/*, /admin/api/* et /uploads/* vers cette fonction.
 */
module.exports = require('../server');
