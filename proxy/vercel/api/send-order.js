/**
 * SmakCity — Vercel Serverless Function
 * Безпечний проксі між сайтом і Telegram Bot API.
 *
 * Токен зберігається в Environment Variables Vercel (зашифровано),
 * не в коді і не у браузері клієнта.
 *
 * ── Як задеплоїти ─────────────────────────────────────────────
 * 1. Встанови Vercel CLI: npm i -g vercel
 * 2. Скопіюй цю папку proxy/vercel/ як окремий проект
 * 3. Заповни .env файл (або задай через Dashboard):
 *      TG_BOT_TOKEN=8929703194:AAGzVCaQKS7AgZwpWkx8CjCEBfbNHXHTe6A
 *      TG_CHAT_ID=8954071506
 * 4. Запусти: vercel --prod
 * 5. Отримай URL виду: https://your-project.vercel.app
 * 6. У config.js на сайті встав:
 *      PROXY_URL: "https://your-project.vercel.app/api/send-order"
 * ─────────────────────────────────────────────────────────────
 */

export default async function handler(req, res) {
  // ── CORS ─────────────────────────────────────────────────────
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // ── Зчитуємо тіло ────────────────────────────────────────────
  const { text, reply_markup } = req.body ?? {};

  if (!text) {
    return res.status(400).json({ ok: false, error: "Missing text" });
  }

  // ── Токен береться із Environment Variables Vercel ───────────
  const BOT_TOKEN = process.env.TG_BOT_TOKEN;
  const CHAT_ID   = process.env.TG_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    console.error("[SmakCity] TG_BOT_TOKEN або TG_CHAT_ID не задані");
    return res.status(500).json({
      ok: false,
      error: "Server misconfigured: missing TG_BOT_TOKEN or TG_CHAT_ID",
    });
  }

  // ── Пересилаємо до Telegram API ──────────────────────────────
  const tgPayload = {
    chat_id:    CHAT_ID,
    text,
    parse_mode: "HTML",
    ...(reply_markup ? { reply_markup } : {}),
  };

  let tgRes, tgData;
  try {
    tgRes  = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(tgPayload),
    });
    tgData = await tgRes.json();
  } catch (err) {
    console.error("[SmakCity] Telegram fetch error:", err);
    return res.status(502).json({ ok: false, error: "Telegram unreachable" });
  }

  return res.status(tgRes.status).json(tgData);
}
