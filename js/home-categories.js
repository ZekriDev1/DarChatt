(function () {
    "use strict";

    var supabase = window.DarChattSupabase;

    var elements = {};

    function cacheElements() {
        elements.loading = document.getElementById("homeCategoriesLoading");
        elements.error = document.getElementById("homeCategoriesError");
        elements.grid = document.getElementById("homeCategoriesGrid");
        elements.empty = document.getElementById("homeCategoriesEmpty");
        elements.retryButton = document.getElementById("homeCategoriesRetry");
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
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

    function rootCategories(categories) {
        var roots = categories.filter(function (c) {
            return !c.parent_id;
        });
        if (roots.length > 0) return roots;
        return categories;
    }

    function categoryCardHtml(category) {
        var name = escapeHtml(category.name);
        var image = category.image_url
            ? '<div class="home-category-image" style="background-image:url(' + escapeHtml(category.image_url) + ')"></div>'
            : '<div class="home-category-image home-category-image-placeholder">' +
              "<span>" + name.charAt(0) + "</span>" +
              "</div>";

        return (
            '<a class="home-category-card" href="shop.html?category=' + encodeURIComponent(category.slug) + '">' +
            image +
            '<div class="home-category-name">' + name + "</div>" +
            "</a>"
        );
    }

    function renderCategories(categories) {
        if (!categories || categories.length === 0) {
            showEmpty();
            return;
        }

        var roots = rootCategories(categories);

        if (elements.loading) elements.loading.hidden = true;
        if (elements.error) elements.error.hidden = true;
        if (elements.empty) elements.empty.hidden = true;

        elements.grid.innerHTML = roots.map(categoryCardHtml).join("");
    }

    async function fetchCategories() {
        var result = await supabase
            .from("categories")
            .select("id, name, slug, image_url, parent_id")
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true });

        if (result.error) throw result.error;
        return result.data || [];
    }

    async function load() {
        showLoading();
        try {
            var categories = await fetchCategories();
            renderCategories(categories);
        } catch (error) {
            console.error("home-categories:", error);
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