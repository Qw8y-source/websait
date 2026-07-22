/* ============================================================
   SMAKCITY — КОНФІГУРАЦІЯ  (ЛОКАЛЬНИЙ ФАЙЛ, не в Git)
   ⚠️  Змінив на Варіант B: задай PROXY_URL і токен ховається
       Варіант A (простий): заповни BOT_TOKEN + CHAT_ID
   ============================================================ */

const SMAKCITY_CONFIG = {
  /* Варіант A — пряма відправка (токен видний у DevTools!) */
  BOT_TOKEN: "8929703194:AAGzVCaQKS7AgZwpWkx8CjCEBfbNHXHTe6A",
  CHAT_ID:   "8954071506",

  /* Варіант B — Serverless-проксі (заповни після деплою Worker/Vercel)
     Якщо PROXY_URL не порожній — BOT_TOKEN і CHAT_ID ігноруються! */
  PROXY_URL: "",  // напр.: "https://smakcity.YOUR_NAME.workers.dev/send"

  /* DEMO_MODE: true → замовлення НЕ відправляються, лише імітуються */
  DEMO_MODE: false,
};
