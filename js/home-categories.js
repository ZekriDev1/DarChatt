(function () {
    "use strict";

    var supabase = window.DarChattSupabase;

    var elements = {};
    var state = {
        categories: [],
        current: 0,
        perView: 4,
        swipe: null
    };

    function cacheElements() {
        elements.loading = document.getElementById("homeCategoriesLoading");
        elements.error = document.getElementById("homeCategoriesError");
        elements.track = document.getElementById("homeCategoriesSlide");
        elements.prev = document.getElementById("homeCategoriesPrev");
        elements.next = document.getElementById("homeCategoriesNext");
        elements.dots = document.getElementById("homeCategoriesDots");
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
        if (elements.empty) elements.empty.hidden = true;
    }

    function showError() {
        if (elements.loading) elements.loading.hidden = true;
        if (elements.error) elements.error.hidden = false;
        if (elements.empty) elements.empty.hidden = true;
    }

    function showEmpty() {
        if (elements.loading) elements.loading.hidden = true;
        if (elements.error) elements.error.hidden = true;
        if (elements.empty) elements.empty.hidden = false;
    }

    function rootCategories(categories) {
        var roots = categories.filter(function (c) {
            return !c.parent_id;
        });
        if (roots.length > 0) return roots;
        return categories;
    }

    function computePerView() {
        var width = window.innerWidth;
        if (width <= 480) return 1;
        if (width <= 720) return 2;
        if (width <= 1000) return 3;
        return 4;
    }

    function maxIndex() {
        return Math.max(0, state.categories.length - state.perView);
    }

    function categoryCardHtml(category) {
        var name = escapeHtml(category.name);
        var image = category.image_url
            ? '<div class="home-category-image" style="background-image:url(' + escapeHtml(category.image_url) + ')"></div>'
            : '<div class="home-category-image home-category-image-placeholder">' +
              "<span>" + name.charAt(0) + "</span>" +
              "</div>";

        return (
            '<div class="home-category-card">' +
            '<a class="home-category-card-inner" href="shop.html?category=' + encodeURIComponent(category.slug) + '">' +
            image +
            '<div class="home-category-name">' + name + "</div>" +
            "</a>" +
            "</div>"
        );
    }

    function renderDots() {
        if (!elements.dots) return;

        var pages = Math.max(1, Math.ceil(state.categories.length / state.perView));
        var currentPage = Math.floor(state.current / state.perView);

        elements.dots.innerHTML = Array.from({ length: pages }, function (_, page) {
            return (
                '<button type="button" class="home-category-dot' + (page === currentPage ? " is-active" : "") +
                '" data-page="' + page + '" aria-label="صفحة ' + (page + 1) + '"></button>'
            );
        }).join("");
    }

    function renderTrack() {
        if (!elements.track) return;

        elements.track.innerHTML = state.categories.map(categoryCardHtml).join("");

        elements.track.style.transform =
            "translateX(-" + state.current * (100 / state.perView) + "%)";

        var atStart = state.current === 0;
        var atEnd = state.current >= maxIndex();

        if (elements.prev) elements.prev.hidden = state.categories.length <= state.perView || atStart;
        if (elements.next) elements.next.hidden = state.categories.length <= state.perView || atEnd;

        renderDots();
        if (elements.dots) elements.dots.hidden = state.categories.length <= state.perView;
    }

    function goTo(index) {
        if (state.categories.length === 0) return;
        state.current = Math.max(0, Math.min(index, maxIndex()));
        renderTrack();
    }

    function renderCategories(categories) {
        if (!categories || categories.length === 0) {
            showEmpty();
            return;
        }

        state.categories = rootCategories(categories);
        state.current = 0;
        state.perView = computePerView();

        if (elements.loading) elements.loading.hidden = true;
        if (elements.error) elements.error.hidden = true;
        if (elements.empty) elements.empty.hidden = true;

        renderTrack();
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

    function bindEvents() {
        if (elements.prev) {
            elements.prev.addEventListener("click", function () {
                goTo(state.current - 1);
            });
        }

        if (elements.next) {
            elements.next.addEventListener("click", function () {
                goTo(state.current + 1);
            });
        }

        var viewport = document.querySelector(".home-categories-viewport");
        if (viewport) {
            viewport.addEventListener("touchstart", function (event) {
                var touch = event.touches[0];
                state.swipe = { x: touch.clientX, y: touch.clientY, active: true };
            });

            viewport.addEventListener("touchmove", function (event) {
                if (!state.swipe || !state.swipe.active) return;
                var touch = event.touches[0];
                var dx = touch.clientX - state.swipe.x;
                var dy = touch.clientY - state.swipe.y;

                // Only capture horizontal swipes so vertical scrolling still works.
                if (Math.abs(dx) > Math.abs(dy)) {
                    event.preventDefault();
                }
            }, { passive: false });

            viewport.addEventListener("touchend", function (event) {
                if (!state.swipe || !state.swipe.active) {
                    state.swipe = null;
                    return;
                }

                var touch = event.changedTouches[0];
                var dx = touch.clientX - state.swipe.x;
                var dy = touch.clientY - state.swipe.y;
                state.swipe = null;

                // Track is direction:ltr, so dragging left = next, right = prev.
                if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
                    if (dx < 0) {
                        goTo(state.current + 1);
                    } else {
                        goTo(state.current - 1);
                    }
                }
            });
        }

        if (elements.dots) {
            elements.dots.addEventListener("click", function (event) {
                var dot = event.target.closest("[data-page]");
                if (!dot) return;
                goTo(Number(dot.getAttribute("data-page")) * state.perView);
            });
        }

        if (elements.retryButton) {
            elements.retryButton.addEventListener("click", load);
        }

        window.addEventListener("resize", function () {
            var perView = computePerView();
            if (perView !== state.perView && state.categories.length > 0) {
                state.perView = perView;
                state.current = Math.min(state.current, maxIndex());
                renderTrack();
            }
        });
    }

    function init() {
        cacheElements();
        if (!supabase || !elements.track) return;

        bindEvents();
        load();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();