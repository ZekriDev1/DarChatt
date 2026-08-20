// =============================================================
// Dar Chatt — Cart drawer (localStorage)
// Items stored in localStorage under "darchatt_cart".
// Clicking the navbar cart icon opens a slide-in drawer.
// Works on any page that includes this script.
// =============================================================

(function () {
    "use strict";

    var STORAGE_KEY = "darchatt_cart";

    // ---------------------------------------------------------
    // Storage
    // ---------------------------------------------------------

    function read() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            var items = raw ? JSON.parse(raw) : [];
            return Array.isArray(items) ? items : [];
        } catch (err) {
            return [];
        }
    }

    function write(items) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch (err) {
            console.error("cart.js:", err);
        }
        updateBadge();
        renderItems();
    }

    function totalCount() {
        return read().reduce(function (sum, item) {
            return sum + (Number(item.qty) || 0);
        }, 0);
    }

    function totalPrice() {
        return read().reduce(function (sum, item) {
            return sum + (Number(item.price) || 0) * (Number(item.qty) || 0);
        }, 0);
    }

    // ---------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------

    function formatPrice(value) {
        var number = Number(value) || 0;
        return number.toLocaleString("en-US") + " DH";
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    // ---------------------------------------------------------
    // Badge
    // ---------------------------------------------------------

    function updateBadge() {
        var count = totalCount();
        document.querySelectorAll(".cart-count").forEach(function (badge) {
            badge.textContent = String(count);
            badge.style.display = count === 0 ? "none" : "";
        });
    }

    // ---------------------------------------------------------
    // Drawer DOM
    // ---------------------------------------------------------

    var drawer = null;
    var overlay = null;
    var itemsList = null;
    var emptyState = null;
    var totalEl = null;

    function buildDrawer() {
        if (drawer) return;

        overlay = document.createElement("div");
        overlay.className = "cart-overlay";
        overlay.id = "cartOverlay";
        overlay.addEventListener("click", closeCart);

        drawer = document.createElement("aside");
        drawer.className = "cart-drawer";
        drawer.id = "cartDrawer";
        drawer.setAttribute("aria-label", "سلة التسوق");
        drawer.innerHTML =
            '<div class="cart-drawer-header">' +
            '<h3 class="cart-drawer-title">سلة التسوق</h3>' +
            '<button type="button" class="cart-drawer-close" aria-label="إغلاق">✕</button>' +
            "</div>" +
            '<div class="cart-drawer-body">' +
            '<div class="cart-empty">سلتك فارغة حالياً</div>' +
            '<div class="cart-items" id="cartItems"></div>' +
            "</div>" +
            '<div class="cart-drawer-footer">' +
            '<div class="cart-total-row">' +
            '<span class="cart-total-label">المجموع</span>' +
            '<span class="cart-total-value" id="cartTotal">0 DH</span>' +
            "</div>" +
            '<button type="button" class="cart-checkout-btn" id="cartCheckoutBtn">إتمام الطلب</button>' +
            "</div>";

        drawer.querySelector(".cart-drawer-close").addEventListener("click", closeCart);
        drawer.querySelector("#cartCheckoutBtn").addEventListener("click", function () {
            var items = read();
            if (items.length === 0) return;
            alert("الدفع عبر الموقع قريباً — سيتم التواصل معك عبر واتساب.");
        });

        itemsList = drawer.querySelector("#cartItems");
        emptyState = drawer.querySelector(".cart-empty");
        totalEl = drawer.querySelector("#cartTotal");

        document.body.appendChild(overlay);
        document.body.appendChild(drawer);
    }

    function openCart() {
        buildDrawer();
        renderItems();
        overlay.classList.add("is-open");
        drawer.classList.add("is-open");
        document.body.classList.add("cart-open");
    }

    function closeCart() {
        if (!drawer) return;
        overlay.classList.remove("is-open");
        drawer.classList.remove("is-open");
        document.body.classList.remove("cart-open");
    }

    // ---------------------------------------------------------
    // Render items
    // ---------------------------------------------------------

    function renderItems() {
        if (!drawer) return;

        var items = read();

        emptyState.style.display = items.length === 0 ? "" : "none";
        itemsList.style.display = items.length === 0 ? "none" : "";
        totalEl.textContent = formatPrice(totalPrice());
        drawer.querySelector("#cartCheckoutBtn").disabled = items.length === 0;

        itemsList.innerHTML = items
            .map(function (item) {
                var image = item.image_url
                    ? '<img src="' + escapeHtml(item.image_url) + '" alt="' + escapeHtml(item.name) + '" loading="lazy">'
                    : '<div class="cart-item-thumb cart-item-thumb-empty"></div>';

                return (
                    '<div class="cart-item" data-cart-item-id="' + escapeHtml(item.id) + '">' +
                    '<a class="cart-item-link" href="product.html?id=' + encodeURIComponent(item.id) + '">' +
                    '<div class="cart-item-thumb">' + image + "</div>" +
                    "</a>" +
                    '<div class="cart-item-info">' +
                    '<a class="cart-item-name" href="product.html?id=' + encodeURIComponent(item.id) + '">' +
                    escapeHtml(item.name) +
                    "</a>" +
                    '<span class="cart-item-price">' + formatPrice(item.price) + "</span>" +
                    '<div class="cart-item-controls">' +
                    '<button type="button" class="cart-qty-btn" data-cart-action="minus" aria-label="إنقاص">−</button>' +
                    '<span class="cart-qty-value">' + (Number(item.qty) || 1) + "</span>" +
                    '<button type="button" class="cart-qty-btn" data-cart-action="plus" aria-label="زيادة">+</button>' +
                    "</div>" +
                    "</div>" +
                    '<button type="button" class="cart-item-remove" data-cart-action="remove" aria-label="حذف">✕</button>' +
                    "</div>"
                );
            })
            .join("");
    }

    function handleItemClick(event) {
        var button = event.target.closest("[data-cart-action]");
        if (!button) return;

        var itemEl = button.closest("[data-cart-item-id]");
        if (!itemEl) return;

        var id = itemEl.getAttribute("data-cart-item-id");
        var action = button.getAttribute("data-cart-action");
        var items = read();

        if (action === "plus") {
            var plusItem = items.find(function (i) { return i.id === id; });
            if (plusItem) plusItem.qty = (Number(plusItem.qty) || 0) + 1;
        } else if (action === "minus") {
            var minusItem = items.find(function (i) { return i.id === id; });
            if (minusItem) {
                minusItem.qty = (Number(minusItem.qty) || 1) - 1;
                if (minusItem.qty <= 0) {
                    items = items.filter(function (i) { return i.id !== id; });
                }
            }
        } else if (action === "remove") {
            items = items.filter(function (i) { return i.id !== id; });
        }

        write(items);
    }

    // ---------------------------------------------------------
    // API + init
    // ---------------------------------------------------------

    function add(product) {
        if (!product || !product.id) return;

        var items = read();
        var existing = items.find(function (item) {
            return item.id === product.id;
        });

        if (existing) {
            existing.qty = (Number(existing.qty) || 0) + 1;
        } else {
            items.push({
                id: product.id,
                name: product.name_ar || product.name_en || "منتج",
                price: Number(product.price) || 0,
                image_url: product.image_url || "",
                qty: 1
            });
        }

        write(items);
    }

    function init() {
        document.addEventListener("click", function (event) {
            var icon = event.target.closest(".cart-icon");
            if (!icon) return;
            event.preventDefault();
            openCart();
        });

        document.addEventListener("click", function (event) {
            if (!drawer) return;
            handleItemClick(event);
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") closeCart();
        });

        updateBadge();
    }

    window.DarChattCart = {
        add: add,
        open: openCart,
        close: closeCart,
        totalCount: totalCount,
        totalPrice: totalPrice,
        updateBadge: updateBadge
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();