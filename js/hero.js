// =============================================================
// Dar Chatt — Homepage Hero Slider
// Loads the 'hero' settings (heading, subheading, images) from
// Supabase and renders a full-width slider. Falls back to a
// static placeholder when no images are configured.
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;

    var state = {
        images: [],
        heading: "",
        subheading: "",
        current: 0,
        timer: null
    };

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
        elements.slider = document.getElementById("heroSlider");
        elements.slides = document.getElementById("heroSlides");
        elements.dots = document.getElementById("heroDots");
        elements.prev = document.getElementById("heroPrev");
        elements.next = document.getElementById("heroNext");
        elements.placeholder = document.getElementById("heroPlaceholder");
    }

    // ---------------------------------------------------------
    // Render
    // ---------------------------------------------------------

    function renderPlaceholder() {
        if (elements.slider) elements.slider.hidden = true;
        if (elements.placeholder) {
            var title = elements.placeholder.querySelector(".hero-title");
            var subtitle = elements.placeholder.querySelector(".hero-subtitle");
            if (title) title.textContent = state.heading || "أهلاً بكم في دار الشاط";
            if (subtitle) subtitle.textContent = state.subheading || "تشكيلة فاخرة من العطور والإكسسوارات";
            elements.placeholder.hidden = false;
        }
    }

    function renderSlides() {
        if (!elements.slides) return;

        elements.slides.innerHTML = state.images.map(function (image, index) {
            return (
                '<div class="hero-slide' + (index === state.current ? " is-active" : "") +
                '" style="background-image:url(' + "'" + escapeHtml(image) + "'" + ')">' +
                '<div class="hero-slide-overlay"></div>' +
                '<div class="hero-slide-content">' +
                '<p class="hero-eyebrow">دار الشاط</p>' +
                '<h1 class="hero-title">' + escapeHtml(state.heading || "أهلاً بكم في دار الشاط") + "</h1>" +
                '<p class="hero-subtitle">' + escapeHtml(state.subheading || "تشكيلة فاخرة من العطور والإكسسوارات") + "</p>" +
                '<a href="shop.html" class="hero-cta">تسوق الآن</a>' +
                "</div>" +
                "</div>"
            );
        }).join("");

        if (elements.dots) {
            elements.dots.innerHTML = state.images.map(function (_, index) {
                return (
                    '<button type="button" class="hero-dot' + (index === state.current ? " is-active" : "") +
                    '" data-slide="' + index + '" aria-label="الشريحة ' + (index + 1) + '"></button>'
                );
            }).join("");
        }

        if (elements.prev) elements.prev.hidden = state.images.length <= 1;
        if (elements.next) elements.next.hidden = state.images.length <= 1;
        if (elements.dots) elements.dots.hidden = state.images.length <= 1;
    }

    function showSlide(index) {
        var total = state.images.length;
        if (total === 0) return;

        state.current = (index + total) % total;

        if (elements.slides) {
            elements.slides.style.transform =
                "translateX(-" + state.current * 100 + "%)";
        }

        if (elements.dots) {
            Array.prototype.forEach.call(elements.dots.children, function (dot, i) {
                dot.classList.toggle("is-active", i === state.current);
            });
        }
    }

    function startAutoPlay() {
        stopAutoPlay();
        if (state.images.length > 1) {
            state.timer = setInterval(function () {
                showSlide(state.current + 1);
            }, 6000);
        }
    }

    function stopAutoPlay() {
        if (state.timer) {
            clearInterval(state.timer);
            state.timer = null;
        }
    }

    // ---------------------------------------------------------
    // Init
    // ---------------------------------------------------------

    async function init() {
        cacheElements();
        if (!elements.slider) return;

        if (!supabase) {
            renderPlaceholder();
            return;
        }

        var result = await supabase
            .from("settings")
            .select("value")
            .eq("key", "hero")
            .maybeSingle();

        if (result.error) {
            console.error("hero.js: فشل جلب إعدادات hero:", result.error);
        }

        var hero = {};
        if (!result.error && result.data && result.data.value) {
            hero = result.data.value;
        }

        state.images = Array.isArray(hero.images) ? hero.images.filter(Boolean) : [];
        state.heading = hero.heading || "";
        state.subheading = hero.subheading || "";

        console.log("hero.js: images =", state.images);

        if (state.images.length === 0) {
            renderPlaceholder();
            return;
        }

        if (elements.slider) elements.slider.hidden = false;
        if (elements.placeholder) elements.placeholder.hidden = true;

        renderSlides();
        showSlide(0);
        startAutoPlay();

        if (elements.prev) {
            elements.prev.addEventListener("click", function () {
                stopAutoPlay();
                showSlide(state.current - 1);
                startAutoPlay();
            });
        }

        if (elements.next) {
            elements.next.addEventListener("click", function () {
                stopAutoPlay();
                showSlide(state.current + 1);
                startAutoPlay();
            });
        }

        if (elements.dots) {
            elements.dots.addEventListener("click", function (event) {
                var dot = event.target.closest("[data-slide]");
                if (!dot) return;
                stopAutoPlay();
                showSlide(Number(dot.getAttribute("data-slide")));
                startAutoPlay();
            });
        }

        var slider = elements.slider;
        slider.addEventListener("mouseenter", stopAutoPlay);
        slider.addEventListener("mouseleave", startAutoPlay);
    }

    document.addEventListener("DOMContentLoaded", init);
})();