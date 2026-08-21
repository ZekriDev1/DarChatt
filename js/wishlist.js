// =============================================================
// Dar Chatt — Wishlist Page
// Reads the wishlist (product ids in localStorage, key
// "darchatt_wishlist"), fetches those active products and
// renders them as product cards.
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;

    var WISHLIST_KEY = "darchatt_wishlist";

    var elements = {};

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function formatPrice(value) {
        var number = Number(value);
        if (isNaN(number)) return "0 DH";
        return number.toLocaleString("en-US") + " DH";
    }

    function isOutOfStock(product) {
        return product.stock_status === "out_of_stock" ||
            (Number(product.stock) <= 0 && !product.allow_out_of_stock);
    }

    function readWishlist() {
        try {
            var raw = localStorage.getItem(WISHLIST_KEY);
            var ids = raw ? JSON.parse(raw) : [];
            return Array.isArray(ids) ? ids : [];
        } catch (err) {
            return [];
        }
    }

    function cacheElements() {
        elements.loading = document.getElementById("wishlistLoading");
        elements.error = document.getElementById("wishlistError");
        elements.grid = document.getElementById("wishlistGrid");
        elements.empty = document.getElementById("wishlistEmpty");
        elements.retry = document.getElementById("wishlistRetry");
    }

    async function fetchProducts(ids) {
        var result = await supabase
            .from("products")
            .select("id, name_ar, name_en, slug, price, old_price, is_sale, stock, stock_status, allow_out_of_stock, image_url")
            .eq("is_active", true)
            .in("id", ids)
            .limit(100);

        if (result.error) throw result.error;
        return result.data || [];
    }

    function cardHtml(product) {
        var name = product.name_ar || product.name_en || "منتج بدون اسم";
        var image = product.image_url
            ? '<img src="' + escapeHtml(product.image_url) + '" alt="' + escapeHtml(name) + '" loading="lazy">'
            : '<div class="product-placeholder">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
              '<rect x="3" y="3" width="18" height="18" rx="2"/>' +
              '<circle cx="9" cy="9" r="2"/>' +
              '<path d="M21 15L16 10L5 21"/>' +
              "</svg></div>";

        var badges = "";
        if (product.is_sale) {
            badges += '<span class="product-badge product-badge-sale">تخفيض</span>';
        }
        if (isOutOfStock(product)) {
            badges += '<span class="product-badge product-badge-out">نفد المخزون</span>';
        }

        var priceHtml;
        if (product.is_sale && product.old_price != null) {
            priceHtml =
                '<span class="product-price">' + formatPrice(product.price) + "</span>" +
                '<span class="product-old-price">' + formatPrice(product.old_price) + "</span>";
        } else {
            priceHtml = '<span class="product-price">' + formatPrice(product.price) + "</span>";
        }

        return (
            '<a class="product-card" href="product.html?id=' + encodeURIComponent(product.id) + '">' +
            '<div class="product-media">' + image + badges + "</div>" +
            '<div class="product-info">' +
            '<h3 class="product-name">' + escapeHtml(name) + "</h3>" +
            '<div class="product-price-row">' + priceHtml + "</div>" +
            "</div>" +
            "</a>"
        );
    }

    function showLoading() {
        elements.loading.hidden = false;
        elements.grid.hidden = true;
        elements.error.hidden = true;
        elements.empty.hidden = true;
    }

    function showError() {
        elements.loading.hidden = true;
        elements.grid.hidden = true;
        elements.error.hidden = false;
        elements.empty.hidden = true;
    }

    function showContent(products) {
        elements.loading.hidden = true;
        elements.error.hidden = true;
        elements.grid.hidden = false;
        elements.empty.hidden = products.length !== 0;

        elements.grid.innerHTML = products.map(cardHtml).join("");
    }

    async function init() {
        cacheElements();

        if (!supabase || !elements.grid) {
            showError();
            return;
        }

        if (elements.retry) elements.retry.addEventListener("click", init);

        var ids = readWishlist();
        if (ids.length === 0) {
            showContent([]);
            return;
        }

        showLoading();

        try {
            var products = await fetchProducts(ids);
            showContent(products);
        } catch (err) {
            showError();
        }
    }

    document.addEventListener("DOMContentLoaded", init);
})();