// =============================================================
// Dar Chatt — Navbar Account Dropdown (user icon)
//
// Guest  -> تسجيل الدخول / إنشاء حساب
// User   -> حسابي / طلباتي / تسجيل الخروج
// Admin  -> حسابي / طلباتي / الإدارة / تسجيل الخروج
//
// The الإدارة link is only a shortcut: the admin area itself is
// protected by Supabase sessions + RLS (see admin/js/auth.js and
// the database schema). Hiding the link is NOT the security.
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;

    var dropdown = document.getElementById("accountDropdown");
    var button = document.getElementById("accountButton");
    var container = document.getElementById("accountMenuItems");

    var sessionRole = null;
    var openedByHover = false;

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    // Hover works only on real desktop pointers (not touch devices).
    function isDesktop() {
        return window.matchMedia("(hover: hover) and (min-width: 901px)").matches;
    }

    // ---------------------------------------------------------
    // Open / close
    // ---------------------------------------------------------

    function openMenu() {
        if (!dropdown) return;
        dropdown.classList.add("active");
        if (button) button.setAttribute("aria-expanded", "true");
    }

    function closeMenu() {
        if (!dropdown) return;
        dropdown.classList.remove("active");
        if (button) button.setAttribute("aria-expanded", "false");
    }

    // ---------------------------------------------------------
    // Menu rendering
    // ---------------------------------------------------------

    function renderLoading() {
        if (container) {
            container.innerHTML =
                '<div class="dropdown-state-item">جاري التحميل...</div>';
        }
    }

    function renderError() {
        if (container) {
            container.innerHTML =
                '<div class="dropdown-state-item dropdown-state-error">تعذر تحميل القائمة</div>';
        }
    }

    function renderGuest() {
        container.innerHTML =
            '<a class="account-item" href="signin.html">تسجيل الدخول</a>' +
            '<a class="account-item" href="signin.html#signup">إنشاء حساب</a>';
    }

    function renderUser() {
        var adminItem = "";
        if (sessionRole === "admin") {
            adminItem = '<a class="account-item" href="/admin/">الإدارة</a>';
        }

        container.innerHTML =
            '<a class="account-item" href="index.html">حسابي</a>' +
            '<a class="account-item" href="index.html">طلباتي</a>' +
            adminItem +
            '<div class="dropdown-divider"></div>' +
            '<button type="button" class="account-item account-item-danger" id="accountLogoutButton">' +
            "تسجيل الخروج" +
            "</button>";

        var logoutButton = document.getElementById("accountLogoutButton");
        if (logoutButton) {
            logoutButton.addEventListener("click", logout);
        }
    }

    // ---------------------------------------------------------
    // Session + role refresh
    // ---------------------------------------------------------

    async function refreshMenu() {
        if (!container) return;

        renderLoading();

        if (!supabase) {
            renderError();
            return;
        }

        try {
            var sessionResult = await supabase.auth.getSession();
            var session = sessionResult.error
                ? null
                : (sessionResult.data && sessionResult.data.session) || null;

            if (!session) {
                sessionRole = null;
                renderGuest();
                return;
            }

            sessionRole = null;

            var roleResult = await supabase
                .from("profiles")
                .select("role")
                .eq("id", session.user.id)
                .maybeSingle();

            if (!roleResult.error && roleResult.data) {
                sessionRole = roleResult.data.role;
            }

            renderUser();
        } catch (err) {
            renderError();
        }
    }

    // ---------------------------------------------------------
    // Logout — updates the menu immediately, no page reload
    // ---------------------------------------------------------

    async function logout() {
        if (supabase) {
            try {
                await supabase.auth.signOut();
            } catch (err) {
                // Even if the network call fails, clear local state.
            }
        }

        sessionRole = null;
        await refreshMenu();
    }

    // ---------------------------------------------------------
    // Init
    // ---------------------------------------------------------

    function init() {
        if (!dropdown || !container) return;

        if (button) {
            button.addEventListener("click", function (event) {
                event.stopPropagation();
                openedByHover = false;

                if (dropdown.classList.contains("active")) {
                    closeMenu();
                } else {
                    openMenu();
                    refreshMenu();
                }
            });
        }

        dropdown.addEventListener("mouseenter", function () {
            if (isDesktop()) {
                openedByHover = true;
                openMenu();
                refreshMenu();
            }
        });

        dropdown.addEventListener("mouseleave", function () {
            if (openedByHover && isDesktop()) {
                closeMenu();
                openedByHover = false;
            }
        });

        document.addEventListener("click", function (event) {
            if (!dropdown.contains(event.target)) {
                closeMenu();
            }
        });

        if (supabase) {
            supabase.auth.onAuthStateChange(function (event) {
                if (event === "SIGNED_OUT" || event === "SIGNED_IN") {
                    refreshMenu();
                }
            });
        }

        refreshMenu();
    }

    document.addEventListener("DOMContentLoaded", init);
})();