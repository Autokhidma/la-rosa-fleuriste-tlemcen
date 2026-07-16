/**
 * La Rosa Fleuriste Tlemcen — serveur Express
 *   Boutique :   http://localhost:3000
 *   Admin :      http://localhost:3000/admin
 */
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

require('./src/db'); // initialise la base + seed
const { UPLOAD_DIR } = require('./src/paths');

const apiRoutes = require('./src/routes/api');
const adminRoutes = require('./src/routes/admin');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use('/api', apiRoutes);
app.use('/admin/api', adminRoutes);

// Images téléversées (sur Vercel : /tmp — voir src/paths.js)
app.use('/uploads', express.static(UPLOAD_DIR));

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html')));

// Gestion d'erreurs (multer, JSON invalide…)
app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(err.status || 400).json({ error: err.message || 'Erreur' });
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🌹 La Rosa Fleuriste Tlemcen — http://localhost:${PORT}  (admin: /admin)`);
  });
}
