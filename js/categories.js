// =============================================================
// Dar Chatt — Categories Page
// Loads active categories and renders them as clickable cards
// that link to the shop filtered by the category slug.
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

    function cacheElements() {
        elements.loading = document.getElementById("categoriesLoading");
        elements.error = document.getElementById("categoriesError");
        elements.grid = document.getElementById("categoriesGrid");
        elements.empty = document.getElementById("categoriesEmpty");
        elements.retry = document.getElementById("categoriesRetry");
    }

    async function fetchCategories() {
        var result = await supabase
            .from("categories")
            .select("id, name, slug, image_url, description")
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true });

        if (result.error) throw result.error;
        return result.data || [];
    }

    function cardHtml(category) {
        var image = category.image_url
            ? '<img src="' + escapeHtml(category.image_url) + '" alt="' + escapeHtml(category.name) + '" loading="lazy">'
            : '<div class="product-placeholder">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
              '<rect x="3" y="3" width="18" height="18" rx="2"/>' +
              '<circle cx="9" cy="9" r="2"/>' +
              '<path d="M21 15L16 10L5 21"/>' +
              "</svg></div>";

        var description = category.description
            ? '<p class="category-card-desc">' + escapeHtml(category.description) + "</p>"
            : "";

        return (
            '<a class="category-card" href="shop.html?category=' + encodeURIComponent(category.slug) + '">' +
            '<div class="category-card-media">' + image + "</div>" +
            '<div class="category-card-info">' +
            '<h3 class="category-card-name">' + escapeHtml(category.name) + "</h3>" +
            description +
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

    function showContent(categories) {
        elements.loading.hidden = true;
        elements.error.hidden = true;
        elements.grid.hidden = false;
        elements.empty.hidden = categories.length !== 0;

        elements.grid.innerHTML = categories.map(cardHtml).join("");
    }

    async function init() {
        cacheElements();

        if (!supabase || !elements.grid) {
            showError();
            return;
        }

        if (elements.retry) elements.retry.addEventListener("click", init);

        showLoading();

        try {
            var categories = await fetchCategories();
            showContent(categories);
        } catch (err) {
            showError();
        }
    }

    document.addEventListener("DOMContentLoaded", init);
})();