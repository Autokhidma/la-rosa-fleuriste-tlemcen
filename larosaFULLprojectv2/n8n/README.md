# 🔔 Notifications de commandes — Telegram

Le plus simple (recommandé, **sans n8n**) : le site sait envoyer les alertes
Telegram directement.

## Option A — Telegram direct (2 minutes, zéro n8n) ✅

1. Sur Telegram, parlez à **@BotFather** → `/newbot` → copiez le **token**.
2. Parlez à **@userinfobot** → copiez votre **Chat ID**.
3. Sur le site : **Admin → Paramètres → Notifications** → collez le token et le
   Chat ID → **Enregistrer** → **📨 Envoyer une notification de test**.
4. C'est tout : chaque commande arrive instantanément sur votre Telegram 🌹

## Option B — via n8n (automatisations avancées)

Si vous voulez enchaîner d'autres actions (Google Sheets, e-mail, etc.) :

1. Dans n8n : **Workflows → Import from file** → `workflow-larosa.json`
   (webhook → Telegram).
2. Renseignez la credential Telegram (token BotFather) et votre Chat ID dans le
   nœud Telegram.
3. **Activez** le workflow et copiez l'URL de production du webhook
   (ex : `https://votre-n8n.app/webhook/larosa-commande`).
4. Collez cette URL dans **Admin → Paramètres → URL Webhook n8n**.

## Payload envoyé par le site

```json
{
  "event": "new_order",
  "shop": "La Rosa Fleuriste Tlemcen",
  "text": "🌹 NOUVELLE COMMANDE — LR-2026-0001\n👤 Client : ... (message prêt à envoyer)",
  "order": { "order_number": "…", "customer_name": "…", "phone": "…", "items": [], "total": 0 }
}
```

Le champ `text` est déjà formaté : transférez-le tel quel vers Telegram.
