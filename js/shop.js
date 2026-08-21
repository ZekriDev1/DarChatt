// =============================================================
// Dar Chatt — Public Shop Page
// Loads active categories + active products from Supabase,
// renders product cards, and filters by category slug.
//
// Uses the SAME shared client (js/supabase.js) as the admin panel.
// Public access is limited to is_active = true by RLS.
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;

    var state = {
        categories: [],
        products: [],
        activeCategory: null, // category slug (null / "all" = all products)
        sort: "newest" // newest | price-asc | price-desc
    };

    var elements = {};

    // ---------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------

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

    function cacheElements() {
        elements.filters = document.getElementById("shopCategoryFilters");
        elements.grid = document.getElementById("productsGrid");
        elements.loading = document.getElementById("shopLoading");
        elements.error = document.getElementById("shopError");
        elements.empty = document.getElementById("shopEmpty");
        elements.filterStatus = document.getElementById("filterStatus");
        elements.filterStatusText = document.getElementById("filterStatusText");
        elements.clearFilterButton = document.getElementById("clearFilterButton");
        elements.retryButton = document.getElementById("shopRetryButton");
    }

    // ---------------------------------------------------------
    // Fetch data
    // ---------------------------------------------------------

    async function fetchCategories() {
        var result = await supabase
            .from("categories")
            .select("id, name, slug")
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true });

        if (result.error) throw result.error;
        return result.data || [];
    }

    async function fetchProducts() {
        var result = await supabase
            .from("products")
            .select("id, name_ar, name_en, slug, price, old_price, is_sale, stock, stock_status, allow_out_of_stock, image_url, categories(slug, name)")
            .eq("is_active", true)
            .order("created_at", { ascending: false });

        if (result.error) throw result.error;
        return result.data || [];
    }

    // ---------------------------------------------------------
    // Render filter buttons
    // ---------------------------------------------------------

    function renderFilters() {
        if (!elements.filters) return;

        var html =
            '<button type="button" class="filter-button' + (state.activeCategory === "all" ? " active" : "") +
            '" data-filter="all">جميع المنتجات</button>';

        state.categories.forEach(function (category) {
            var isActive = state.activeCategory === category.slug;
            html +=
                '<button type="button" class="filter-button' + (isActive ? " active" : "") +
                '" data-filter="' + escapeHtml(category.slug) + '">' +
                escapeHtml(category.name) +
                "</button>";
        });

        elements.filters.innerHTML = html;

        elements.filters.querySelectorAll(".filter-button").forEach(function (button) {
            button.addEventListener("click", function () {
                applyCategory(button.getAttribute("data-filter"), true);
            });
        });
    }

    // ---------------------------------------------------------
    // Sorting
    // ---------------------------------------------------------

    function sortedProducts() {
        var list = state.products.slice();

        if (state.sort === "price-asc") {
            list.sort(function (a, b) {
                return Number(a.price) - Number(b.price);
            });
        } else if (state.sort === "price-desc") {
            list.sort(function (a, b) {
                return Number(b.price) - Number(a.price);
            });
        }

        return list;
    }

    function injectSortSelect() {
        var container = document.getElementById("shopCategoryFilters");
        if (!container || document.getElementById("shopSortSelect")) return;

        var wrap = document.createElement("div");
        wrap.className = "shop-sort-wrap";
        wrap.innerHTML =
            '<label class="shop-sort-label" for="shopSortSelect">ترتيب:</label>' +
            '<select class="shop-sort-select" id="shopSortSelect">' +
            '<option value="newest">الأحدث</option>' +
            '<option value="price-asc">السعر: من الأقل للأعلى</option>' +
            '<option value="price-desc">السعر: من الأعلى للأقل</option>' +
            "</select>";

        container.appendChild(wrap);

        var select = document.getElementById("shopSortSelect");
        if (select) {
            select.addEventListener("change", function () {
                state.sort = select.value;
                renderProducts();
            });
        }
    }

    // ---------------------------------------------------------
    // Render product cards
    // ---------------------------------------------------------

    function cardHtml(product) {
        var categorySlug = product.categories && product.categories.slug;
        var matchesFilter = state.activeCategory === "all" ||
            categorySlug === state.activeCategory;

        if (!matchesFilter) return "";

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

    function renderProducts() {
        var html = "";
        sortedProducts().forEach(function (product) {
            html += cardHtml(product);
        });

        elements.grid.innerHTML = html;

        var visibleCount = elements.grid.querySelectorAll(".product-card").length;
        if (elements.empty) {
            elements.empty.hidden = visibleCount !== 0;
        }
    }

    // ---------------------------------------------------------
    // Filter state / URL
    // ---------------------------------------------------------

    function validCategory(category) {
        if (!category || category === "all") return "all";
        return state.categories.some(function (c) {
            return c.slug === category;
        }) ? category : "all";
    }

    function applyCategory(category, updateBrowserURL) {
        state.activeCategory = validCategory(category);

        renderFilters();
        renderProducts();

        updateFilterStatus();

        if (updateBrowserURL) {
            updateURL(state.activeCategory);
        }
    }

    function updateURL(category) {
        var url = new URL(window.location.href);

        if (!category || category === "all") {
            url.searchParams.delete("category");
        } else {
            url.searchParams.set("category", category);
        }

        window.history.pushState({}, "", url);
    }

    function updateFilterStatus() {
        if (!elements.filterStatus || !elements.filterStatusText) return;

        var category = state.categories.find(function (c) {
            return c.slug === state.activeCategory;
        });

        if (category) {
            elements.filterStatusText.innerHTML =
                'عرض النتائج الخاصة بـ: <strong>' + escapeHtml(category.name) + "</strong>";
            elements.filterStatus.classList.add("active");
        } else {
            elements.filterStatus.classList.remove("active");
        }
    }

    // ---------------------------------------------------------
    // Loading / error / init
    // ---------------------------------------------------------

    function showLoading() {
        if (elements.loading) elements.loading.hidden = false;
        if (elements.grid) elements.grid.hidden = true;
        if (elements.error) elements.error.hidden = true;
        if (elements.empty) elements.empty.hidden = true;
    }

    function showError() {
        if (elements.loading) elements.loading.hidden = true;
        if (elements.grid) elements.grid.hidden = true;
        if (elements.error) elements.error.hidden = false;
        if (elements.empty) elements.empty.hidden = true;
    }

    function showContent() {
        if (elements.loading) elements.loading.hidden = true;
        if (elements.grid) elements.grid.hidden = false;
        if (elements.error) elements.error.hidden = true;
    }

    function init() {
        cacheElements();
        if (!elements.grid) return;

        if (!supabase) {
            showError();
            return;
        }

        if (elements.retryButton) {
            elements.retryButton.addEventListener("click", init);
        }

        if (elements.clearFilterButton) {
            elements.clearFilterButton.addEventListener("click", function () {
                applyCategory("all", true);
            });
        }

        window.addEventListener("popstate", function () {
            var params = new URLSearchParams(window.location.search);
            applyCategory(params.get("category"));
        });

        showLoading();

        injectSortSelect();

        Promise.all([fetchCategories(), fetchProducts()])
            .then(function (results) {
                state.categories = results[0];
                state.products = results[1];

                var params = new URLSearchParams(window.location.search);
                var categoryFromURL = params.get("category");

                state.activeCategory = validCategory(categoryFromURL);

                renderFilters();
                renderProducts();
                updateFilterStatus();
                showContent();
            })
            .catch(function () {
                showError();
            });
    }

    document.addEventListener("DOMContentLoaded", init);
})();