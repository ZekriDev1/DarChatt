(function () {
    "use strict";

    var supabase = window.DarChattSupabase;

    var elements = {};

    function cacheElements() {
        elements.loading = document.getElementById("homeProductsLoading");
        elements.error = document.getElementById("homeProductsError");
        elements.grid = document.getElementById("homeProductsGrid");
        elements.empty = document.getElementById("homeProductsEmpty");
        elements.retryButton = document.getElementById("homeProductsRetry");
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function productName(product) {
        return product.name_ar || product.name_en || "منتج بدون اسم";
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

    function showLoading() {
        if (elements.loading) elements.loading.hidden = false;
        if (elements.error) elements.error.hidden = true;
        if (elements.grid) elements.grid.innerHTML = "";
        if (elements.empty) elements.empty.hidden = true;
    }

    function showError() {
        if (elements.loading) elements.loading.hidden = true;
        if (elements.error) elements.error.hidden = false;
        if (elements.grid) elements.grid.innerHTML = "";
        if (elements.empty) elements.empty.hidden = true;
    }

    function showEmpty() {
        if (elements.loading) elements.loading.hidden = true;
        if (elements.error) elements.error.hidden = true;
        if (elements.grid) elements.grid.innerHTML = "";
        if (elements.empty) elements.empty.hidden = false;
    }

    function cardHtml(product) {
        var name = productName(product);
        var image = product.image_url || "";
        var outOfStock = isOutOfStock(product);

        var imageHtml;
        if (image) {
            imageHtml = '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(name) + '" loading="lazy">';
        } else {
            imageHtml =
                '<div class="product-placeholder">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
                '<rect x="3" y="3" width="18" height="18" rx="2"/>' +
                '<circle cx="9" cy="9" r="2"/>' +
                '<path d="M21 15L16 10L5 21"/>' +
                "</svg></div>";
        }

        var badges = "";
        if (product.is_sale) {
            badges += '<span class="product-badge product-badge-sale">تخفيض</span>';
        }
        if (outOfStock) {
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
            '<div class="product-media">' + imageHtml + badges + "</div>" +
            '<div class="product-info">' +
            '<h3 class="product-name">' + escapeHtml(name) + "</h3>" +
            '<div class="product-price-row">' + priceHtml + "</div>" +
            "</div>" +
            "</a>"
        );
    }

    function renderProducts(products) {
        if (!products || products.length === 0) {
            showEmpty();
            return;
        }

        if (elements.loading) elements.loading.hidden = true;
        if (elements.error) elements.error.hidden = true;
        if (elements.empty) elements.empty.hidden = true;

        elements.grid.innerHTML = products.map(cardHtml).join("");
    }

    async function fetchProducts() {
        var result = await supabase
            .from("products")
            .select("id, name_ar, name_en, slug, price, old_price, is_sale, stock, stock_status, allow_out_of_stock, image_url")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(6);

        if (result.error) throw result.error;
        return result.data || [];
    }

    async function load() {
        showLoading();
        try {
            var products = await fetchProducts();
            renderProducts(products);
        } catch (error) {
            console.error("home-products:", error);
            showError();
        }
    }

    function init() {
        cacheElements();
        if (!supabase || !elements.grid) return;

        if (elements.retryButton) {
            elements.retryButton.addEventListener("click", load);
        }

        load();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();