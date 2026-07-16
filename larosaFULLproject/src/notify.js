/**
 * Notifications propriétaire — nouvelle commande.
 *
 * Deux canaux, utilisables ensemble ou séparément (configurés dans Admin → Paramètres) :
 *  1. Webhook n8n : POST JSON vers `n8n_webhook_url`. Le workflow n8n relaie ensuite
 *     vers WhatsApp et/ou Telegram (voir n8n/README.md pour le workflow prêt à importer).
 *  2. Telegram direct : si `telegram_bot_token` + `telegram_chat_id` sont renseignés,
 *     envoi direct via l'API Bot Telegram (aucun n8n requis).
 */
const { getSetting } = require('./db');

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR');

function buildOrderText(order) {
  const items = (typeof order.items === 'string' ? JSON.parse(order.items) : order.items) || [];
  const lines = items
    .map((it) => {
      const opts = [it.size, it.color].filter(Boolean).join(', ');
      return `  • ${it.qty} × ${it.name}${opts ? ` (${opts})` : ''} — ${fmt(it.unit_price * it.qty)} DA`;
    })
    .join('\n');

  return [
    `🌹 NOUVELLE COMMANDE — ${order.order_number}`,
    ``,
    `👤 Client : ${order.customer_name}`,
    `📞 Téléphone : ${order.phone}`,
    `📍 Livraison : ${order.zone_name || '—'}${order.address ? ` — ${order.address}` : ''}`,
    order.delivery_date ? `📅 Date souhaitée : ${order.delivery_date}` : null,
    ``,
    `🛍 Articles :`,
    lines || '  (aucun)',
    ``,
    `Sous-total : ${fmt(order.subtotal)} DA`,
    `Livraison : ${fmt(order.delivery_fee)} DA`,
    `💰 TOTAL : ${fmt(order.total)} DA`,
    order.message ? `\n💌 Message carte : « ${order.message} »` : null,
  ]
    .filter((l) => l !== null)
    .join('\n');
}

async function post(url, body, headers = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`);
  return res;
}

/** Envoie la notification sans bloquer la réponse client. Retourne un rapport par canal. */
async function notifyNewOrder(order) {
  if (getSetting('notify_enabled', '1') !== '1') return { skipped: true };

  const text = buildOrderText(order);
  const report = {};

  const webhookUrl = getSetting('n8n_webhook_url', '').trim();
  if (webhookUrl) {
    try {
      await post(webhookUrl, {
        event: 'new_order',
        shop: getSetting('shop_name', 'La Rosa Fleuriste Tlemcen'),
        text,
        order: {
          ...order,
          items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
        },
      });
      report.n8n = 'ok';
    } catch (err) {
      report.n8n = `erreur: ${err.message}`;
      console.error('[notify] n8n webhook:', err.message);
    }
  }

  const botToken = getSetting('telegram_bot_token', '').trim();
  const chatId = getSetting('telegram_chat_id', '').trim();
  if (botToken && chatId) {
    try {
      await post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text,
      });
      report.telegram = 'ok';
    } catch (err) {
      report.telegram = `erreur: ${err.message}`;
      console.error('[notify] telegram:', err.message);
    }
  }

  if (!webhookUrl && !(botToken && chatId)) report.none = 'aucun canal configuré';
  return report;
}

module.exports = { notifyNewOrder, buildOrderText };
