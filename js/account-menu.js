// =============================================================
// Dar Chatt — Navbar Account Dropdown (user icon)
//
// Desktop (≥1024px): hover/click dropdown in the header bar.
// Mobile (<1024px): accordion inside the drawer.
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

    // Desktop dropdown
    var dropdown = document.getElementById("accountDropdown");
    var button = document.getElementById("accountButton");
    var container = document.getElementById("accountMenuItems");

    // Mobile accordion (inside the drawer)
    var mobileDropdown = document.getElementById("mobileAccountDropdown");
    var mobileButton = document.getElementById("mobileAccountButton");
    var mobileContainer = document.getElementById("mobileAccountMenuItems");

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
        return (
            window.matchMedia("(hover: hover)").matches &&
            window.innerWidth >= 1024
        );
    }

    // ---------------------------------------------------------
    // Open / close (desktop dropdown)
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

    function renderLoading(target) {
        if (target) {
            target.innerHTML =
                '<div class="dropdown-state-item">جاري التحميل...</div>';
        }
    }

    function renderError(target) {
        if (target) {
            target.innerHTML =
                '<div class="dropdown-state-item dropdown-state-error">تعذر تحميل القائمة</div>';
        }
    }

    function renderGuest(target) {
        target.innerHTML =
            '<a class="account-item" href="signin.html">تسجيل الدخول</a>' +
            '<a class="account-item" href="signin.html#signup">إنشاء حساب</a>';
    }

    function renderUser(target) {
        var adminItem = "";
        if (sessionRole === "admin") {
            adminItem = '<a class="account-item" href="/admin/">الإدارة</a>';
        }

        target.innerHTML =
            '<a class="account-item" href="index.html">حسابي</a>' +
            '<a class="account-item" href="index.html">طلباتي</a>' +
            adminItem +
            '<div class="dropdown-divider"></div>' +
            '<button type="button" class="account-item account-item-danger">' +
            "تسجيل الخروج" +
            "</button>";

        var logoutButton = target.querySelector(".account-item-danger");
        if (logoutButton) {
            logoutButton.addEventListener("click", logout);
        }
    }

    // ---------------------------------------------------------
    // Session + role refresh
    // ---------------------------------------------------------

    async function refreshMenu() {
        renderLoading(container);
        renderLoading(mobileContainer);

        if (!supabase) {
            renderError(container);
            renderError(mobileContainer);
            return;
        }

        try {
            var sessionResult = await supabase.auth.getSession();
            var session = sessionResult.error
                ? null
                : (sessionResult.data && sessionResult.data.session) || null;

            if (!session) {
                sessionRole = null;
                renderGuest(container);
                renderGuest(mobileContainer);
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

            renderUser(container);
            renderUser(mobileContainer);
        } catch (err) {
            renderError(container);
            renderError(mobileContainer);
        }
    }

    // ---------------------------------------------------------
    // Logout — updates the menus immediately, no page reload
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
        if (!dropdown && !mobileDropdown) return;

        // Desktop: click toggles the dropdown, hover opens it.
        if (dropdown && button) {
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
        }

        // Mobile: click toggles the accordion inside the drawer.
        if (mobileDropdown && mobileButton) {
            mobileButton.addEventListener("click", function (event) {
                event.stopPropagation();

                var isOpen = mobileDropdown.classList.contains("active");
                mobileDropdown.classList.toggle("active", !isOpen);
                mobileButton.setAttribute("aria-expanded", String(!isOpen));
                refreshMenu();
            });
        }

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