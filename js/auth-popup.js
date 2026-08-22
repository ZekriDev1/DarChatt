// =============================================================
// Dar Chatt — Auth Popup
// Reusable "you are not logged in" dialog. Exposes
// window.DarChattAuthPopup.show(options) and links the user to
// the sign-in page with a redirect back to the current page.
// =============================================================

(function () {
    "use strict";

    var overlay = null;
    var lastFocused = null;

    function build() {
        overlay = document.createElement("div");
        overlay.className = "auth-popup-overlay";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-labelledby", "authPopupTitle");
        overlay.innerHTML =
            '<div class="auth-popup">' +
            '<button type="button" class="auth-popup-close" aria-label="إغلاق">&#10005;</button>' +
            '<div class="auth-popup-icon" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M12 21C12 21 3 14.5 3 8.5C3 5.5 5.5 3.5 8 3.5C9.8 3.5 11.2 4.5 12 6C12.8 4.5 14.2 3.5 16 3.5C18.5 3.5 21 5.5 21 8.5C21 14.5 12 21 12 21Z"/>' +
            "</svg></div>" +
            '<h2 class="auth-popup-title" id="authPopupTitle">أنت غير مسجل الدخول</h2>' +
            '<p class="auth-popup-text">سجّل الدخول إلى حسابك لتتمكن من إضافة المنتجات إلى قائمة المفضلة.</p>' +
            '<div class="auth-popup-actions">' +
            '<a href="#" class="auth-popup-btn auth-popup-btn-primary" id="authPopupLogin">تسجيل الدخول</a>' +
            '<a href="#" class="auth-popup-btn auth-popup-btn-secondary" id="authPopupSignup">إنشاء حساب جديد</a>' +
            "</div>" +
            "</div>";

        document.body.appendChild(overlay);

        overlay.addEventListener("click", function (event) {
            if (event.target === overlay) close();
        });

        overlay.querySelector(".auth-popup-close").addEventListener("click", close);

        document.addEventListener("keydown", function (event) {
            if (!isOpen()) return;

            if (event.key === "Escape") {
                close();
                return;
            }

            // Keep Tab focus inside the dialog
            if (event.key === "Tab") {
                var focusable = overlay.querySelectorAll("button, a[href]");
                if (focusable.length === 0) return;

                var first = focusable[0];
                var last = focusable[focusable.length - 1];

                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        });
    }

    function isOpen() {
        return overlay && overlay.classList.contains("is-open");
    }

    function currentRedirect() {
        return window.location.pathname + window.location.search;
    }

    function open(options) {
        var opts = options || {};

        if (!overlay) build();

        overlay.querySelector(".auth-popup-title").textContent =
            opts.title || "أنت غير مسجل الدخول";
        overlay.querySelector(".auth-popup-text").textContent =
            opts.message || "سجّل الدخول إلى حسابك لتتمكن من إضافة المنتجات إلى قائمة المفضلة.";

        var redirect = encodeURIComponent(currentRedirect());
        overlay.querySelector("#authPopupLogin").href = "signin.html?redirect=" + redirect;
        overlay.querySelector("#authPopupSignup").href =
            "signin.html?redirect=" + redirect + "#signup";

        lastFocused = document.activeElement;

        overlay.classList.add("is-open");
        document.body.classList.add("auth-popup-open");

        var loginLink = overlay.querySelector("#authPopupLogin");
        if (loginLink) loginLink.focus();
    }

    function close() {
        if (!overlay) return;

        overlay.classList.remove("is-open");
        document.body.classList.remove("auth-popup-open");

        if (lastFocused && typeof lastFocused.focus === "function") {
            lastFocused.focus();
        }
        lastFocused = null;
    }

    window.DarChattAuthPopup = {
        show: open,
        close: close
    };
})();
