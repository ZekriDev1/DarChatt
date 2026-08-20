// =============================================================
// Dar Chatt — Search overlay
// Clicking the navbar search icon opens an overlay with a live
// product search against Supabase (name_ar / name_en, ILIKE).
// Empty query shows recommendations (latest active products).
// Works on any page that includes this script.
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;

    var overlay = null;
    var input = null;
    var resultsEl = null;
    var recHeader = null;
    var stateEl = null;
    var debounceTimer = null;

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

    // ---------------------------------------------------------
    // Overlay DOM
    // ---------------------------------------------------------

    function buildOverlay() {
        if (overlay) return;

        overlay = document.createElement("div");
        overlay.className = "search-overlay";
        overlay.id = "searchOverlay";

        overlay.innerHTML =
            '<div class="search-panel">' +
            '<div class="search-input-row">' +
            '<svg class="search-panel-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
            '<circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.8"/>' +
            '<path d="M16 16L21 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
            "</svg>" +
            '<input type="search" class="search-input" id="searchInput" placeholder="ابحث عن منتج..." autocomplete="off" aria-label="البحث عن منتج">' +
            '<button type="button" class="search-close" id="searchClose" aria-label="إغلاق البحث">✕</button>' +
            "</div>" +
            '<div class="search-results">' +
            '<div class="search-recommendation-header" id="searchRecHeader">منتجات مقترحة</div>' +
            '<div class="search-results-list" id="searchResultsList"></div>' +
            '<div class="search-state" id="searchState" hidden></div>' +
            "</div>" +
            "</div>";

        document.body.appendChild(overlay);

        input = overlay.querySelector("#searchInput");
        resultsEl = overlay.querySelector("#searchResultsList");
        recHeader = overlay.querySelector("#searchRecHeader");
        stateEl = overlay.querySelector("#searchState");

        overlay.addEventListener("click", function (event) {
            if (event.target === overlay) closeSearch();
        });

        overlay.querySelector("#searchClose").addEventListener("click", closeSearch);

        input.addEventListener("input", function () {
            clearTimeout(debounceTimer);
            var term = input.value.trim();
            debounceTimer = setTimeout(function () {
                if (term.length === 0) {
                    showRecommendations();
                } else {
                    runSearch(term);
                }
            }, 300);
        });

        input.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                var term = input.value.trim();
                if (term.length > 0) {
                    clearTimeout(debounceTimer);
                    runSearch(term);
                }
            }
        });
    }

    function openSearch() {
        buildOverlay();
        overlay.classList.add("is-open");
        document.body.classList.add("search-open");
        showRecommendations();
        setTimeout(function () {
            input.focus();
        }, 50);
    }

    function closeSearch() {
        if (!overlay) return;
        overlay.classList.remove("is-open");
        document.body.classList.remove("search-open");
        input.value = "";
    }

    // ---------------------------------------------------------
    // Rendering
    // ---------------------------------------------------------

    function showState(message) {
        recHeader.hidden = true;
        resultsEl.hidden = true;
        stateEl.hidden = false;
        stateEl.textContent = message;
    }

    function showLoading() {
        recHeader.hidden = true;
        resultsEl.hidden = true;
        stateEl.hidden = false;
        stateEl.textContent = "جاري البحث...";
    }

    function renderProducts(products, showRecHeader) {
        recHeader.hidden = !showRecHeader;
        resultsEl.hidden = false;
        stateEl.hidden = true;

        resultsEl.innerHTML = products
            .map(function (product) {
                var name = productName(product);
                var image = product.image_url
                    ? '<img src="' + escapeHtml(product.image_url) + '" alt="' + escapeHtml(name) + '" loading="lazy">'
                    : "";

                var priceHtml;
                if (product.is_sale && product.old_price != null) {
                    priceHtml =
                        '<span class="search-result-price">' + formatPrice(product.price) + "</span>" +
                        '<span class="search-result-old-price">' + formatPrice(product.old_price) + "</span>";
                } else {
                    priceHtml = '<span class="search-result-price">' + formatPrice(product.price) + "</span>";
                }

                return (
                    '<a class="search-result-item" href="product.html?id=' + encodeURIComponent(product.id) + '">' +
                    '<div class="search-result-thumb">' + image + "</div>" +
                    '<div class="search-result-info">' +
                    '<span class="search-result-name">' + escapeHtml(name) + "</span>" +
                    '<div class="search-result-price-row">' + priceHtml + "</div>" +
                    "</div>" +
                    "</a>"
                );
            })
            .join("");
    }

    // ---------------------------------------------------------
    // Data
    // ---------------------------------------------------------

    function showRecommendations() {
        if (!supabase) {
            showState("البحث غير متاح حالياً");
            return;
        }

        showLoading();

        supabase
            .from("products")
            .select("id, name_ar, name_en, slug, price, old_price, is_sale, image_url")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(8)
            .then(function (result) {
                if (result.error) {
                    console.error("search.js:", result.error);
                    showState("تعذر تحميل المنتجات. حاول مرة أخرى.");
                    return;
                }

                var products = result.data || [];
                if (products.length === 0) {
                    showState("لا توجد منتجات بعد");
                    return;
                }

                renderProducts(products, true);
            });
    }

    function runSearch(term) {
        if (!supabase) {
            showState("البحث غير متاح حالياً");
            return;
        }

        showLoading();

        var pattern = "%" + term + "%";

        supabase
            .from("products")
            .select("id, name_ar, name_en, slug, price, old_price, is_sale, image_url")
            .eq("is_active", true)
            .or("name_ar.ilike." + pattern + ",name_en.ilike." + pattern)
            .limit(12)
            .then(function (result) {
                if (result.error) {
                    console.error("search.js:", result.error);
                    showState("حدث خطأ أثناء البحث. حاول مرة أخرى.");
                    return;
                }

                var products = result.data || [];
                if (products.length === 0) {
                    showState("لا توجد نتائج مطابقة لـ \"" + term + "\"");
                    return;
                }

                renderProducts(products, false);
            });
    }

    // ---------------------------------------------------------
    // Init
    // ---------------------------------------------------------

    function init() {
        document.addEventListener("click", function (event) {
            var icon = event.target.closest(".search-icon");
            if (!icon) return;
            event.preventDefault();
            openSearch();
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") closeSearch();
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();