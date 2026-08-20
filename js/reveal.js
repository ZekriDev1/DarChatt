// =============================================================
// Dar Chatt — Scroll reveal
// Adds a js-reveal class to <html> so the CSS only hides
// [data-reveal] elements when JS is running (no-JS fallback:
// everything stays visible). Elements fade/slide in when they
// enter the viewport. Optional data-reveal-delay="0.1s" for
// staggered children.
// =============================================================

(function () {
    "use strict";

    document.documentElement.classList.add("js-reveal");

    var elements = document.querySelectorAll("[data-reveal]");

    if (!("IntersectionObserver" in window)) {
        elements.forEach(function (el) {
            el.classList.add("is-visible");
        });
        return;
    }

    var observer = new IntersectionObserver(
        function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    elements.forEach(function (el) {
        observer.observe(el);
    });
})();