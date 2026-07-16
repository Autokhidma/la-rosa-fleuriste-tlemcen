# 🌹 La Rosa Fleuriste Tlemcen

Site web complet du fleuriste **La Rosa** (Tlemcen, Algérie) : boutique en ligne
colorée avec bouquet rotatif au scroll, panier + commandes, et panneau
d'administration complet pour le propriétaire.

## ✨ Fonctionnalités

**Boutique publique**
- Hero animé : bouquet de roses en SVG qui **tourne avec le défilement**, pétales
  flottants, dégradés roses/fuchsia/violet
- Best Sellers, catalogue filtrable par catégorie, fiche produit
  (galerie, tailles, couleurs, points spéciaux ✨)
- Panier + commande en ligne (nom, téléphone, zone de livraison, date, message carte)
- Zones de livraison et tarifs dynamiques, contact WhatsApp / Instagram / Facebook
- 100 % responsive, en français avec touches en arabe

**Panneau admin** (`/admin`)
- Protégé par mot de passe (par défaut `larosalarosa113` — changez-le dans
  Admin → Paramètres après la première connexion !)
- 📊 Tableau de bord : commandes du jour, à traiter, chiffre du mois
- 🧾 Commandes : détail complet, changement de statut (nouvelle → confirmée →
  en préparation → livrée), contact WhatsApp client en 1 clic
- 💐 Produits : création/édition avec **upload d'images (jusqu'à 6), description,
  tailles + prix, couleurs, points spéciaux, badge Best Seller**, visibilité
- 🛵 Livraison : zones, tarifs et délais modifiables
- ⚙️ Paramètres : infos boutique, réseaux sociaux, notifications, mot de passe

**Notifications (n8n → WhatsApp / Telegram)**
- Chaque commande déclenche un webhook n8n **et/ou** un message Telegram direct
- Workflow n8n prêt à importer : [`n8n/workflow-larosa.json`](n8n/README.md)
- Bouton « notification de test » dans l'admin

## 🚀 Démarrage

```bash
npm install
npm start          # http://localhost:3000  —  admin : http://localhost:3000/admin
```

La base SQLite est créée et pré-remplie automatiquement dans `data/larosa.db`
(12 produits de démonstration, 8 zones de livraison). Les images produits de
démo sont des SVG générés (`node scripts/gen-images.js` pour les régénérer) —
remplacez-les par de vraies photos depuis l'admin.

## 🗂 Structure

```
server.js               Serveur Express
src/db.js               Schéma SQLite + seed (produits, commandes, livraison, paramètres)
src/routes/api.js       API publique (produits, zones, création de commande)
src/routes/admin.js     API admin (auth, CRUD produits/commandes/zones, upload, paramètres)
src/notify.js           Notifications n8n + Telegram
public/                 Boutique (index.html, css, js)
public/admin/           Panneau admin
n8n/                    Workflow n8n + guide d'installation
```

## 🚀 Déploiement rapide (glisser-déposer, sans backend)

La boutique fonctionne **en 100 % statique** : catalogue chargé depuis
`public/data/catalog.json`, et les commandes sont envoyées au fleuriste
**via WhatsApp** (aucun serveur requis). C'est le moyen le plus simple de
mettre le site en ligne :

- **Netlify** : « Add new site » → « Deploy manually » → glissez le dossier
  **`public/`** (pas le zip entier, ni la racine du projet). Ou connectez le
  dépôt : le `netlify.toml` fait le reste.
- **Vercel** (statique) : importez le dépôt ou glissez le dossier `public/`.
- **GitHub Pages / n'importe quel hébergeur statique** : publiez `public/`.

> ⚠️ Ne déposez pas le **zip** ni la racine du projet sur un hébergeur
> statique : la page d'accueil est dans `public/index.html`, pas à la racine —
> c'est ce qui cause l'erreur « Page not found ». Déposez le **contenu de
> `public/`**.

Le **panneau admin** (`/admin`) et l'enregistrement des commandes en base
nécessitent le serveur Node : utilisez le déploiement Vercel ci-dessous
(fonction serverless) ou un hébergeur Node persistant.

## ▲ Déploiement Vercel (application complète avec admin)

Le projet est prêt pour Vercel (`vercel.json` + fonction `api/index.js`) :
le front est servi en statique, l'API tourne en serverless et les images de
démo sont générées au build.

⚠️ **Limite importante** : sur Vercel le disque est éphémère — la base SQLite
et les images téléversées vivent dans `/tmp` et sont **réinitialisées à chaque
redéploiement / redémarrage d'instance** (les produits de démo reviennent, les
commandes et modifications se perdent). Parfait pour une démo ; pour la
production, hébergez sur un serveur persistant (VPS, Railway, Render…) ou
branchez une base gérée (Turso/LibSQL, Vercel Postgres).

## ⚙️ Configuration (optionnelle)

Copiez `.env.example` vers `.env` — ou configurez tout directement depuis
Admin → Paramètres (stocké en base).
