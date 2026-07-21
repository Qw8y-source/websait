/* ============================================================
   CONFIGURATION — Telegram Bot API
   Replace BOT_TOKEN with your actual token (e.g. "8929703194:AAGzVCaQKS7AgZwpWkx8CjCEBfbNHXHTe6A")
   Replace CHAT_ID with your Telegram chat/group ID (e.g. "8954071506")
============================================================ */
const BOT_TOKEN = "8929703194:AAGzVCaQKS7AgZwpWkx8CjCEBfbNHXHTe6A"; // 🔑 Токен бота
const CHAT_ID   = "8954071506";                                          // 💬 ID чату

/* ============================================================
   CART STATE
============================================================ */
/** @type {Array<{id:string, name:string, price:number, qty:number, img:string}>} */
let cart = [];

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
  // Read product data from the parent <article> element
  const card   = btn.closest(".product-card");
  const id     = card.dataset.id;
  const name   = card.dataset.name;
  const price  = parseInt(card.dataset.price, 10);
  const img    = card.dataset.img;

  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ id, name, price, qty: 1, img });
  }

  updateCartUI();
  showToast(`✅ "${name}" додано до кошика`, "success");

  // Brief button animation feedback
  btn.textContent = "✔ Додано!";
  setTimeout(() => { btn.innerHTML = "🛒 В кошик"; }, 1200);
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
  const emptyEl   = document.getElementById("cart-empty");

  if (cart.length === 0) {
    container.innerHTML = "";
    container.appendChild(emptyEl);
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

  // Reset form + show form state
  document.getElementById("order-form").reset();
  document.getElementById("form-state").style.display = "block";
  document.getElementById("success-state").classList.remove("visible");
  document.getElementById("submit-btn").disabled = false;

  document.getElementById("modal-overlay").classList.add("open");
  document.body.style.overflow = "hidden";
  // Focus first field for accessibility
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
   BUILD TELEGRAM MESSAGE
   Formats cart contents and customer info into a readable
   Telegram Bot API message string.
============================================================ */
function buildTelegramMessage(name, phone, address, comment) {
  // Create an order lines string from cart items
  const orderLines = cart.map(item =>
    `  • ${item.name} × ${item.qty} = ${fmtPrice(item.price * item.qty)}`
  ).join("\n");

  // Check if the 2+1 pizza promo applies (≥2 pizzas ordered)
  const pizzaQty = cart
    .filter(i => i.id.startsWith("pizza"))
    .reduce((n, i) => n + i.qty, 0);
  const promoLine = pizzaQty >= 2
    ? "\n🎁 Акція 2+1 на піцу застосована!\n"
    : "";

  // Compose final message text (Markdown V2 safe via plain text)
  const text = [
    "🍕 НОВЕ ЗАМОВЛЕННЯ — SmakCity",
    "━━━━━━━━━━━━━━━━━━━━━━",
    `👤 Ім'я:    ${name}`,
    `📞 Телефон: ${phone}`,
    `📍 Адреса:  ${address}`,
    comment ? `💬 Коментар: ${comment}` : "",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "📋 Склад замовлення:",
    orderLines,
    promoLine,
    `💰 Сума: ${fmtPrice(getTotal())}`,
    "━━━━━━━━━━━━━━━━━━━━━━",
  ].filter(Boolean).join("\n");

  return text;
}

/* ============================================================
   SEND ORDER TO TELEGRAM BOT
   Performs a POST request to the Telegram Bot API /sendMessage
   endpoint with the formatted order message.
   @param {string} text - The formatted order message
   @returns {Promise<boolean>} - true if sent successfully
============================================================ */
async function sendOrderToTelegram(text) {
  // Construct the Telegram Bot API URL using the configured token
  const apiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  const payload = {
    chat_id: CHAT_ID,
    text:    text,
    parse_mode: "HTML",  // Use HTML parse mode for basic formatting
  };

  try {
    const response = await fetch(apiUrl, {
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

    return true; // Message sent successfully
  } catch (networkError) {
    console.error("[SmakCity] Network error sending to Telegram:", networkError);
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

  // Read form values
  const name    = document.getElementById("input-name").value.trim();
  const phone   = document.getElementById("input-phone").value.trim();
  const address = document.getElementById("input-address").value.trim();
  const comment = document.getElementById("input-comment").value.trim();

  // Basic client-side validation
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
  if (!address) {
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

  // Build and send the Telegram message
  const message = buildTelegramMessage(name, phone, address, comment);
  const success = await sendOrderToTelegram(message);

  if (success) {
    // Show success state
    document.getElementById("form-state").style.display = "none";
    document.getElementById("success-state").classList.add("visible");

    // Clear the cart
    cart = [];
    updateCartUI();

    // Auto-close modal after 4 seconds
    setTimeout(() => closeOrderModal(), 4000);
  } else {
    // Telegram send failed — show error toast, re-enable button
    showToast("❌ Помилка. Спробуйте ще раз або зателефонуйте нам.", "error");
    submitBtn.disabled = false;
    submitBtn.innerHTML = "✅ Підтвердити замовлення";
  }
});

/* ============================================================
   CATEGORY FILTER TABS
============================================================ */
function filterCategory(category) {
  // Update tab active state
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.category === category);
    btn.setAttribute("aria-selected", btn.dataset.category === category);
  });

  // Show/hide product cards
  document.querySelectorAll(".product-card").forEach(card => {
    const match = category === "all" || card.dataset.category === category;
    card.classList.toggle("hidden", !match);
  });

  // Scroll to menu on mobile if triggered from footer
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

  // Auto-remove after 3 seconds
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
    closeOrderModal();
    closeCartSidebar();
  }
});

/* ============================================================
   INITIALIZATION — Run on DOM ready
============================================================ */
updateCartUI();
