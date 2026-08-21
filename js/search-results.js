// =============================================================
// Dar Chatt — Search Results Page
// Reads ?q= from the URL and searches active products by
// Arabic/English name (partial, case-insensitive).
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;

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

    function cacheElements() {
        elements.label = document.getElementById("searchQueryLabel");
        elements.loading = document.getElementById("searchLoading");
        elements.error = document.getElementById("searchError");
        elements.grid = document.getElementById("searchGrid");
        elements.empty = document.getElementById("searchEmpty");
        elements.retry = document.getElementById("searchRetry");
    }

    async function searchProducts(query) {
        var escaped = query.replace(/'/g, "''");
        var result = await supabase
            .from("products")
            .select("id, name_ar, name_en, slug, price, old_price, is_sale, stock, stock_status, allow_out_of_stock, image_url")
            .eq("is_active", true)
            .or("name_ar.ilike.%" + escaped + "%,name_en.ilike.%" + escaped + "%")
            .order("created_at", { ascending: false })
            .limit(60);

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

    function showContent(products, query) {
        elements.loading.hidden = true;
        elements.error.hidden = true;
        elements.grid.hidden = false;
        elements.empty.hidden = products.length !== 0;

        elements.grid.innerHTML = products.map(cardHtml).join("");
        if (elements.empty) {
            var emptyText = elements.empty.querySelector("p");
            if (emptyText) {
                emptyText.textContent = 'لا توجد نتائج مطابقة لبحثك عن "' + query + '".';
            }
        }
    }

    async function init() {
        cacheElements();

        if (!supabase || !elements.grid) {
            showError();
            return;
        }

        var params = new URLSearchParams(window.location.search);
        var query = (params.get("q") || "").trim();

        if (elements.label) {
            elements.label.textContent = query ? 'نتائج البحث عن: "' + query + '"' : "—";
        }

        if (elements.retry) elements.retry.addEventListener("click", init);

        showLoading();

        try {
            var products = query ? await searchProducts(query) : [];
            showContent(products, query);
        } catch (err) {
            showError();
        }
    }

    document.addEventListener("DOMContentLoaded", init);
})();