# 🔔 Notifications de commandes via n8n (WhatsApp / Telegram)

À chaque nouvelle commande, le site envoie un `POST` JSON vers l'URL webhook n8n
configurée dans **Admin → Paramètres → Notifications**.

## Payload envoyé par le site

```json
{
  "event": "new_order",
  "shop": "La Rosa Fleuriste Tlemcen",
  "text": "🌹 NOUVELLE COMMANDE — LR-2026-0001\n👤 Client : ... (message prêt à envoyer)",
  "order": {
    "order_number": "LR-2026-0001",
    "customer_name": "…",
    "phone": "…",
    "zone_name": "Tlemcen Centre",
    "address": "…",
    "items": [{ "name": "…", "size": "…", "color": "…", "qty": 1, "unit_price": 4500 }],
    "subtotal": 4500,
    "delivery_fee": 300,
    "total": 4800,
    "message": "…",
    "status": "nouvelle"
  }
}
```

Le champ `text` est un message déjà formaté : il suffit de le transférer tel quel
vers Telegram ou WhatsApp.

## Installation en 5 minutes

1. Dans n8n : **Workflows → Import from file** → choisissez `workflow-larosa.json`.
2. **Telegram** : créez un bot via [@BotFather](https://t.me/BotFather), copiez le token
   dans une credential Telegram, puis mettez votre `chat_id` dans le nœud Telegram
   (obtenez-le via [@userinfobot](https://t.me/userinfobot)).
3. **WhatsApp** (optionnel) : renseignez une credential WhatsApp Business Cloud
   (Meta) et le numéro du propriétaire dans le nœud WhatsApp. Si vous n'utilisez
   pas WhatsApp, supprimez simplement ce nœud.
4. **Activez** le workflow, puis copiez l'URL de production du webhook
   (ex : `https://votre-n8n.app/webhook/larosa-commande`).
5. Collez cette URL dans **Admin → Paramètres → URL Webhook n8n** et cliquez
   **📨 Envoyer une notification de test**.

## Alternative sans n8n

Le site peut aussi notifier **directement Telegram** sans passer par n8n :
renseignez simplement *Telegram Bot Token* + *Chat ID* dans Admin → Paramètres.
