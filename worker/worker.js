/**
 * VELORA — Cloudflare Worker для приёма заявок конфигуратора.
 * ---------------------------------------------------------------------------
 * Зачем: чтобы НЕ держать токен Telegram-бота в коде сайта (сейчас он виден
 * всем в index.html). Worker принимает заявку от сайта и сам пересылает её в
 * Telegram, а токен хранится в секретах Cloudflare.
 *
 * Развёртывание и секреты — см. README-worker.md.
 *
 * Ожидает POST JSON: { "source": "Конфигуратор", "fields": { "Имя": "...", ... } }
 */

const ALLOWED_ORIGINS = [
  'https://velora-jaluzi.ru',
  'https://www.velora-jaluzi.ru'
];

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'POST') {
      return json({ ok: false, error: 'Method not allowed' }, 405, cors);
    }

    let data;
    try {
      data = await request.json();
    } catch (e) {
      return json({ ok: false, error: 'Bad JSON' }, 400, cors);
    }

    const source = String(data.source || 'Сайт').slice(0, 60);
    const fields = (data && typeof data.fields === 'object') ? data.fields : {};

    // Простейшая антиспам-проверка: должен быть телефон
    const phone = String(fields['Телефон'] || '').replace(/\D/g, '');
    if (phone.length < 11) {
      return json({ ok: false, error: 'Некорректный телефон' }, 422, cors);
    }

    // Собираем сообщение
    let text = '🪟 *Новая заявка Velora*\n';
    text += '📍 Источник: ' + source + '\n\n';
    for (const [k, v] of Object.entries(fields)) {
      if (v && v !== '—') text += '*' + escapeMd(k) + ':* ' + escapeMd(String(v)) + '\n';
    }
    text += '\n🕐 ' + new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });

    const token = env.TG_BOT_TOKEN;
    const chatId = env.TG_CHAT_ID;
    if (!token || !chatId) {
      return json({ ok: false, error: 'Worker не настроен (нет секретов)' }, 500, cors);
    }

    try {
      const tg = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
      });
      if (!tg.ok) {
        const body = await tg.text();
        return json({ ok: false, error: 'Telegram error', detail: body.slice(0, 200) }, 502, cors);
      }
    } catch (e) {
      return json({ ok: false, error: 'Upstream fetch failed' }, 502, cors);
    }

    return json({ ok: true }, 200, cors);
  }
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, cors)
  });
}

function escapeMd(s) {
  // Экранируем спецсимволы Markdown, чтобы заявка не «ломала» разметку
  return String(s).replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}
