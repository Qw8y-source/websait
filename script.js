/* ============================================================
   SMAKCITY — MAIN SCRIPT
   Версія 2.0: Форма замовлення + Telegram Bot + Онлайн-оплата
============================================================ */

/* ============================================================
   CART STATE
============================================================ */
/** @type {Array<{id:string, name:string, price:number, qty:number, img:string}>} */
let cart = [];

/* ============================================================
   UTILITY: Generate order number
============================================================ */
function generateOrderNumber() {
  return Math.floor(1000 + Math.random() * 9000);
}

/* ============================================================
   UTILITY: Generate transaction ID
============================================================ */
function generateTransactionId() {
  return "TXN-" + Date.now().toString(36).toUpperCase() + "-" +
    Math.random().toString(36).substring(2, 6).toUpperCase();
}

/* ============================================================
   UTILITY: Get total price
============================================================ */
function getTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

/* ============================================================
   UTILITY: Format price as Ukrainian hryvnia
============================================================ */
function fmtPrice(n) {
  return n.toLocaleString("uk-UA") + " ₴";
}

/* ============================================================
   ADD TO CART
   Called by each "В кошик" button on a product card.
============================================================ */
function addToCart(btn) {
  const card  = btn.closest(".product-card");
  const id    = card.dataset.id;
  const name  = card.dataset.name;
  const price = parseInt(card.dataset.price, 10);
  const img   = card.dataset.img;

  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ id, name, price, qty: 1, img });
  }

  updateCartUI();
  showToast(`✅ "${name}" додано до кошика`, "success");

  btn.textContent = "✔ Додано!";
  setTimeout(() => { 
    btn.innerHTML = "🛒 В кошик"; 
    if (window.twemoji) twemoji.parse(btn);
  }, 1200);
}

/* ============================================================
   REMOVE / CHANGE QUANTITY IN CART
============================================================ */
function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(i => i.id !== id);
  }
  updateCartUI();
}

/* ============================================================
   UPDATE CART UI
   Re-renders the cart sidebar and updates the header counter.
============================================================ */
// Cache the empty state element once on load so it's not lost when innerHTML is cleared
const emptyCartEl = document.getElementById("cart-empty");

function updateCartUI() {
  const total     = getTotal();
  const itemCount = cart.reduce((n, i) => n + i.qty, 0);

  /* Header badge & mini total */
  const countEl = document.getElementById("cart-count");
  const miniEl  = document.getElementById("cart-total-mini");
  countEl.textContent = itemCount;
  miniEl.textContent  = fmtPrice(total);
  countEl.classList.toggle("hidden", itemCount === 0);

  /* Sidebar total */
  document.getElementById("cart-total-val").textContent = fmtPrice(total);

  /* Promo note (2 pizzas ordered → show promo) */
  const pizzaQty = cart
    .filter(i => i.id.startsWith("pizza"))
    .reduce((n, i) => n + i.qty, 0);
  const promoNote = document.getElementById("promo-note");
  promoNote.style.display = pizzaQty >= 2 ? "flex" : "none";

  /* Checkout button enable/disable */
  document.getElementById("cart-checkout-btn").disabled = cart.length === 0;

  /* FAB visibility */
  document.getElementById("fab-order").classList.toggle("visible", itemCount > 0);

  /* Render cart items */
  const container = document.getElementById("cart-items-container");

  if (cart.length === 0) {
    container.innerHTML = "";
    if (emptyCartEl) container.appendChild(emptyCartEl);
    return;
  }

  container.innerHTML = "";
  cart.forEach(item => {
    const el = document.createElement("div");
    el.className = "cart-item";
    el.innerHTML = `
      <img class="cart-item-img" src="${item.img}" alt="${item.name}" />
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${fmtPrice(item.price * item.qty)}</div>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn" onclick="changeQty('${item.id}', -1)" aria-label="Зменшити кількість">−</button>
        <span class="qty-val">${item.qty}</span>
        <button class="qty-btn" onclick="changeQty('${item.id}', 1)" aria-label="Збільшити кількість">+</button>
      </div>
    `;
    container.appendChild(el);
  });

  if (window.twemoji) twemoji.parse(document.getElementById("cart-sidebar"));
}

/* ============================================================
   CART SIDEBAR OPEN / CLOSE
============================================================ */
function openCartSidebar() {
  document.getElementById("cart-sidebar").classList.add("open");
  document.getElementById("cart-overlay").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeCartSidebar() {
  document.getElementById("cart-sidebar").classList.remove("open");
  document.getElementById("cart-overlay").classList.remove("open");
  document.body.style.overflow = "";
}

/* ============================================================
   ORDER MODAL OPEN / CLOSE
============================================================ */
function openOrderModal() {
  if (cart.length === 0) {
    showToast("⚠️ Додайте страви до кошика", "error");
    return;
  }

  closeCartSidebar();

  // Populate form order summary
  const listEl = document.getElementById("form-order-list");
  listEl.innerHTML = cart.map(item => `
    <div class="form-order-item">
      <span>${item.name} × ${item.qty}</span>
      <span>${fmtPrice(item.price * item.qty)}</span>
    </div>
  `).join("");
  document.getElementById("form-order-total").textContent = fmtPrice(getTotal());
  if (window.twemoji) twemoji.parse(document.getElementById("form-order-summary"));

  // Reset form + show form state
  document.getElementById("order-form").reset();
  document.getElementById("form-state").style.display = "block";
  document.getElementById("success-state").classList.remove("visible");
  document.getElementById("submit-btn").disabled = false;

  // Reset address field visibility
  document.getElementById("address-group").style.display = "block";
  document.getElementById("input-address").required = true;

  document.getElementById("modal-overlay").classList.add("open");
  document.body.style.overflow = "hidden";
  setTimeout(() => document.getElementById("input-name").focus(), 350);
}

function closeOrderModal() {
  document.getElementById("modal-overlay").classList.remove("open");
  document.body.style.overflow = "";
}

// Close modal when clicking outside
document.getElementById("modal-overlay").addEventListener("click", function(e) {
  if (e.target === this) closeOrderModal();
});

/* ============================================================
   PICKUP CHECKBOX — toggle address field
============================================================ */
document.getElementById("input-pickup").addEventListener("change", function() {
  const addressGroup = document.getElementById("address-group");
  const addressInput = document.getElementById("input-address");

  if (this.checked) {
    addressGroup.style.display = "none";
    addressInput.required = false;
    addressInput.value = "";
  } else {
    addressGroup.style.display = "block";
    addressInput.required = true;
  }
});

/* ============================================================
   ONLINE PAYMENT MODAL OPEN / CLOSE
============================================================ */
function openPaymentModal(total) {
  // Set transaction info
  document.getElementById("pay-transaction-id").textContent = generateTransactionId();
  document.getElementById("pay-amount").textContent = fmtPrice(total);

  // Show processing state first
  document.getElementById("pay-processing-state").style.display = "block";
  document.getElementById("pay-success-state").style.display = "none";

  // Show modal
  document.getElementById("payment-modal-overlay").classList.add("open");

  // After 2.8s — switch to success state
  setTimeout(() => {
    document.getElementById("pay-processing-state").style.display = "none";
    document.getElementById("pay-success-state").style.display = "block";
  }, 2800);
}

function closePaymentModal() {
  document.getElementById("payment-modal-overlay").classList.remove("open");
  closeOrderModal();
}

// Close payment modal when clicking outside
document.getElementById("payment-modal-overlay").addEventListener("click", function(e) {
  if (e.target === this) closePaymentModal();
});

/* ============================================================
   BUILD TELEGRAM MESSAGE
   Formats cart contents and customer info into a readable
   Telegram Bot API HTML message string.
============================================================ */
function buildTelegramMessage(orderNum, name, phone, address, paymentMethod, comment) {
  const isPickup = address === "Самовивіз";

  const orderLines = cart.map(item =>
    `  • <b>${item.name}</b> × ${item.qty} — ${fmtPrice(item.price * item.qty)}`
  ).join("\n");

  const pizzaQty = cart
    .filter(i => i.id.startsWith("pizza"))
    .reduce((n, i) => n + i.qty, 0);
  const promoLine = pizzaQty >= 2
    ? "\n🎁 <b>Акція 2+1 на піцу застосована!</b>\n"
    : "";

  const text = [
    `📦 <b>НОВЕ ЗАМОВЛЕННЯ #${orderNum}</b>`,
    "━━━━━━━━━━━━━━━━━━━━━━",
    `👤 <b>Клієнт:</b> ${name} (${phone})`,
    `📍 <b>Адреса:</b> ${isPickup ? "🏠 Самовивіз" : address}`,
    `💳 <b>Спосіб оплати:</b> ${paymentMethod}`,
    "━━━━━━━━━━━━━━━━━━━━━━",
    "🛒 <b>Склад замовлення:</b>",
    orderLines,
    promoLine,
    `💰 <b>Підсумок: ${fmtPrice(getTotal())}</b>`,
    "━━━━━━━━━━━━━━━━━━━━━━",
    comment ? `💬 <b>Коментар:</b> ${comment}` : "",
  ].filter(Boolean).join("\n");

  return text;
}

/* ============================================================
   BUILD TELEGRAM INLINE KEYBOARD
   Inline buttons for the manager to update order status.
============================================================ */
function buildInlineKeyboard(orderNum) {
  return {
    inline_keyboard: [
      [
        { text: "✅ Прийняти",          callback_data: `accept_${orderNum}` },
        { text: "👨‍🍳 В роботі",        callback_data: `cooking_${orderNum}` },
      ],
      [
        { text: "🚗 Передано кур'єру", callback_data: `courier_${orderNum}` },
        { text: "❌ Відхилити",         callback_data: `reject_${orderNum}` },
      ],
    ],
  };
}

/* ============================================================
   SEND ORDER TO TELEGRAM BOT
   ────────────────────────────────────────────────────────────
   Підтримує 3 режими (визначається автоматично по config.js):

   1. DEMO_MODE: true  → нічого не відправляється, лише лог
   2. PROXY_URL задано → запит іде на Serverless-проксі
      (токен захований на сервері, у браузері НЕ видно)
   3. BOT_TOKEN задано → прямий запит до api.telegram.org
      (простіше, але токен видний у DevTools)
   ────────────────────────────────────────────────────────────
   @param {string} text        — HTML-повідомлення для Telegram
   @param {object} replyMarkup — Об'єкт inline-клавіатури
   @returns {Promise<boolean>} — true якщо успішно
============================================================ */
async function sendOrderToTelegram(text, replyMarkup) {

  // ── Режим 1: DEMO_MODE — пропускаємо реальну відправку ──────
  if (SMAKCITY_CONFIG.DEMO_MODE) {
    console.log("[SmakCity] DEMO MODE: відправка пропущена.");
    console.log("[SmakCity] Повідомлення:\n", text);
    return true;
  }

  // Helper for fetch with timeout
  const fetchWithTimeout = async (url, options, timeout = 10000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  };

  // ── Режим 2: Проксі-сервер (рекомендовано) ──────────────────
  if (SMAKCITY_CONFIG.PROXY_URL) {
    try {
      const response = await fetchWithTimeout(SMAKCITY_CONFIG.PROXY_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text, reply_markup: replyMarkup }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error("[SmakCity] Proxy error:", err);
        return false;
      }

      const data = await response.json();
      if (!data.ok) {
        console.error("[SmakCity] Telegram (via proxy) not-ok:", data);
        return false;
      }

      return true;

    } catch (networkError) {
      console.error("[SmakCity] Proxy network error (or timeout):", networkError);
      return false;
    }
  }

  // ── Режим 3: Пряма відправка до Telegram API ────────────────
  if (!SMAKCITY_CONFIG.BOT_TOKEN || !SMAKCITY_CONFIG.CHAT_ID) {
    console.error("[SmakCity] Немає ні PROXY_URL, ні BOT_TOKEN — перевір config.js");
    return false;
  }

  const apiUrl = `https://api.telegram.org/bot${SMAKCITY_CONFIG.BOT_TOKEN}/sendMessage`;

  const payload = {
    chat_id:      SMAKCITY_CONFIG.CHAT_ID,
    text:         text,
    parse_mode:   "HTML",
    reply_markup: replyMarkup,
  };

  try {
    const response = await fetchWithTimeout(apiUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("[SmakCity] Telegram API error:", err);
      return false;
    }

    const data = await response.json();
    if (!data.ok) {
      console.error("[SmakCity] Telegram returned not-ok:", data);
      return false;
    }

    return true;

  } catch (networkError) {
    console.error("[SmakCity] Network error (or timeout):", networkError);
    return false;
  }
}

/* ============================================================
   ORDER FORM SUBMIT HANDLER
   Validates inputs, builds the message, sends to Telegram,
   shows success state and clears the cart.
============================================================ */
document.getElementById("order-form").addEventListener("submit", async function(e) {
  e.preventDefault();

  try {
    const name          = document.getElementById("input-name").value.trim();
    const phone         = document.getElementById("input-phone").value.trim();
    const isPickup      = document.getElementById("input-pickup").checked;
    const addressRaw    = document.getElementById("input-address").value.trim();
    const address       = isPickup ? "Самовивіз" : addressRaw;
    const comment       = document.getElementById("input-comment").value.trim();
    const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value || "Готівкою кур'єру";
    const isOnline      = paymentMethod === "Онлайн-оплата";
    const orderTotal    = getTotal();

    // Validation
    if (!name) {
      showToast("⚠️ Будь ласка, введіть ваше ім'я", "error");
      document.getElementById("input-name").focus();
      return;
    }
    if (!phone) {
      showToast("⚠️ Будь ласка, введіть номер телефону", "error");
      document.getElementById("input-phone").focus();
      return;
    }
    if (!isPickup && !addressRaw) {
      showToast("⚠️ Будь ласка, введіть адресу доставки", "error");
      document.getElementById("input-address").focus();
      return;
    }
    if (cart.length === 0) {
      showToast("⚠️ Кошик порожній", "error");
      return;
    }

    // Disable button to prevent double submit
    const submitBtn = document.getElementById("submit-btn");
    submitBtn.disabled = true;
    submitBtn.innerHTML = "⏳ Відправляємо...";

    // Generate order number
    const orderNum = generateOrderNumber();

    // Build message + inline keyboard
    const message       = buildTelegramMessage(orderNum, name, phone, address, paymentMethod, comment);
    const replyMarkup   = buildInlineKeyboard(orderNum);
    const success       = await sendOrderToTelegram(message, replyMarkup);

    if (success) {
      // Clear the cart
      cart = [];
      updateCartUI();

      if (isOnline) {
        // Online payment: show payment simulation modal
        openPaymentModal(orderTotal);
        // Show a simplified success state behind
        document.getElementById("form-state").style.display = "none";
        document.getElementById("success-state").classList.add("visible");
        document.getElementById("success-order-num").textContent = `Замовлення #${orderNum}`;
        document.getElementById("success-desc").textContent =
          "Оплату опрацьовано. Ваше замовлення підтверджено і передано на кухню!";
      } else {
        // Regular: show success state in the same modal
        document.getElementById("form-state").style.display = "none";
        document.getElementById("success-state").classList.add("visible");
        document.getElementById("success-order-num").textContent = `Замовлення #${orderNum}`;

        // Auto-close modal after 4 seconds
        setTimeout(() => closeOrderModal(), 4000);
      }
    } else {
      showToast("❌ Помилка. Спробуйте ще раз або зателефонуйте нам.", "error");
      submitBtn.disabled = false;
      submitBtn.innerHTML = "✅ Підтвердити замовлення";
    }
  } catch (err) {
    console.error(err);
    alert("Критична помилка: " + err.message);
    const submitBtn = document.getElementById("submit-btn");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = "✅ Підтвердити замовлення";
    }
  }
});

/* ============================================================
   CATEGORY FILTER TABS
============================================================ */
function filterCategory(category) {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.category === category);
    btn.setAttribute("aria-selected", btn.dataset.category === category);
  });

  document.querySelectorAll(".product-card").forEach(card => {
    const match = category === "all" || card.dataset.category === category;
    card.classList.toggle("hidden", !match);
  });

  scrollToMenu(false);
}

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => filterCategory(btn.dataset.category));
});

/* ============================================================
   SCROLL TO MENU
============================================================ */
function scrollToMenu(doScroll = true) {
  if (doScroll) {
    document.getElementById("menu").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/* ============================================================
   TOAST NOTIFICATIONS
============================================================ */
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  if (window.twemoji) twemoji.parse(toast);

  setTimeout(() => {
    toast.classList.add("hiding");
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

/* ============================================================
   INTERSECTION OBSERVER — Fade-in animations on scroll
============================================================ */
const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      fadeObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

document.querySelectorAll(".fade-in").forEach(el => fadeObserver.observe(el));

/* ============================================================
   KEYBOARD ACCESSIBILITY — Close modals with Escape key
============================================================ */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closePaymentModal();
    closeOrderModal();
    closeCartSidebar();
  }
});

/* ============================================================
   INITIALIZATION — Run on DOM ready
============================================================ */
updateCartUI();
if (window.twemoji) twemoji.parse(document.body);
