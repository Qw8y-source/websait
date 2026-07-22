/**
 * SmakCity — Cloudflare Worker
 * Безпечний проксі між сайтом і Telegram Bot API.
 *
 * Токен зберігається лише в середовищі Cloudflare (Secrets),
 * не в коді і не у браузері клієнта.
 *
 * ── Як задеплоїти ─────────────────────────────────────────────
 * 1. Зайди на https://workers.cloudflare.com/ → створи Worker
 * 2. Вкопіюй весь цей файл у редактор Workers
 * 3. Перейди: Settings → Variables → Add variable (Encrypt)
 *      TG_BOT_TOKEN = 8929703194:AAGzVCaQKS7AgZwpWkx8CjCEBfbNHXHTe6A
 *      TG_CHAT_ID   = 8954071506
 * 4. Deploy → скопіюй URL виду: https://smakcity.YOUR_NAME.workers.dev
 * 5. У config.js на сайті встав:
 *      PROXY_URL: "https://smakcity.YOUR_NAME.workers.dev/send"
 * ─────────────────────────────────────────────────────────────
 */

export default {
  async fetch(request, env) {
    // ── CORS preflight ─────────────────────────────────────────
    if (request.method === "OPTIONS") {
      return corsResponse(null, 204);
    }

    // ── Тільки POST на /send ───────────────────────────────────
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/send") {
      return corsResponse(JSON.stringify({ ok: false, error: "Not found" }), 404);
    }

    // ── Читаємо тіло запиту від сайту ─────────────────────────
    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse(JSON.stringify({ ok: false, error: "Invalid JSON" }), 400);
    }

    const { text, reply_markup } = body;

    if (!text) {
      return corsResponse(JSON.stringify({ ok: false, error: "Missing text" }), 400);
    }

    // ── Токен береться із Secrets Cloudflare, не із коду! ──────
    const BOT_TOKEN = env.TG_BOT_TOKEN;
    const CHAT_ID   = env.TG_CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
      return corsResponse(
        JSON.stringify({ ok: false, error: "Server misconfigured: missing TG_BOT_TOKEN or TG_CHAT_ID" }),
        500
      );
    }

    // ── Пересилаємо запит до Telegram API ─────────────────────
    const tgPayload = {
      chat_id:      CHAT_ID,
      text:         text,
      parse_mode:   "HTML",
      reply_markup: reply_markup ?? undefined,
    };

    let tgResponse;
    try {
      tgResponse = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(tgPayload),
        }
      );
    } catch (err) {
      return corsResponse(
        JSON.stringify({ ok: false, error: "Telegram unreachable", detail: String(err) }),
        502
      );
    }

    const tgData = await tgResponse.json();

    // ── Повертаємо відповідь на сайт ──────────────────────────
    return corsResponse(JSON.stringify(tgData), tgResponse.status);
  },
};

/* Хелпер — відповідь з CORS-заголовками */
function corsResponse(body, status = 200) {
  const headers = {
    "Content-Type":                "application/json",
    "Access-Control-Allow-Origin": "*",          // або замінити на домен сайту
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  return new Response(body, { status, headers });
}
