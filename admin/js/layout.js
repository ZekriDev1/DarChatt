// =============================================================
// Dar Chatt — Admin Layout (sidebar, topbar, states)
// Renders the shared shell for every protected admin page.
// =============================================================

(function () {
    "use strict";

    var ICONS = {
        dashboard:
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
        categories:
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7C3 5.9 3.9 5 5 5H9L11 7H19C20.1 7 21 7.9 21 9V17C21 18.1 20.1 19 19 19H5C3.9 19 3 18.1 3 17V7Z"/></svg>',
        products:
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8L12 3L3 8V16L12 21L21 16V8Z"/><path d="M3 8L12 13L21 8"/><path d="M12 13V21"/></svg>',
        orders:
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4H5L7.2 15.5H18.5L21 7H7"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>',
        customers:
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20C2.5 16.5 5.4 14 9 14C12.6 14 15.5 16.5 15.5 20"/><path d="M16 5.2C17.2 5.7 18 6.9 18 8.2C18 9.5 17.2 10.7 16 11.2"/><path d="M18.5 14.3C20.1 15.2 21 16.9 21 18.7V20"/></svg>',
        settings:
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15C19.5 14.7 19.6 14.4 19.6 14V10C19.6 9.6 19.5 9.3 19.4 9L21.3 7L18.7 3.8L16.4 4.8C15.9 4.4 15.4 4.1 14.9 3.9L14.5 1.5H9.5L9.1 3.9C8.6 4.1 8.1 4.4 7.6 4.8L5.3 3.8L2.7 7L4.6 9C4.5 9.3 4.4 9.6 4.4 10V14C4.4 14.4 4.5 14.7 4.6 15L2.7 17L5.3 20.2L7.6 19.2C8.1 19.6 8.6 19.9 9.1 20.1L9.5 22.5H14.5L14.9 20.1C15.4 19.9 15.9 19.6 16.4 19.2L18.7 20.2L21.3 17L19.4 15Z"/></svg>',
        profile:
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 21C5.5 17.5 8.4 15 12 15C15.6 15 18.5 17.5 18.5 21"/></svg>',
        activity:
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7V12L15 14"/></svg>',
        editor:
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20H21"/><path d="M16.5 3.5C17.1 2.9 18.2 2.9 18.8 3.5C19.4 4.1 19.4 5.2 18.8 5.8L7 17.5L3 18.5L4 14.5L16.5 3.5Z"/></svg>',
        store:
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9L4.5 4H19.5L21 9"/><path d="M3 9V20H21V9"/><path d="M3 9C3 10.7 4.3 12 6 12C7.7 12 9 10.7 9 9C9 10.7 10.3 12 12 12C13.7 12 15 10.7 15 9C15 10.7 16.3 12 18 12C19.7 12 21 10.7 21 9"/></svg>',
        users:
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20C2.5 16.5 5.4 14 9 14C12.6 14 15.5 16.5 15.5 20"/><path d="M16 5.2C17.2 5.7 18 6.9 18 8.2C18 9.5 17.2 10.7 16 11.2"/><path d="M18.5 14.3C20.1 15.2 21 16.9 21 18.7V20"/></svg>',
        shipping:
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6H15V17H2V6Z"/><path d="M15 9H19L22 12.5V17H15V9Z"/><circle cx="6" cy="19" r="1.8"/><circle cx="18" cy="19" r="1.8"/></svg>',
        logout:
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 12H3"/><path d="M6 8L2 12L6 16"/><path d="M10 4H19C20.1 4 21 4.9 21 6V18C21 19.1 20.1 20 19 20H10"/></svg>'
    };

    var NAV_GROUPS = [
        {
            items: [
                { key: "dashboard", label: "لوحة التحكم", href: "/admin/index.html", icon: "dashboard" }
            ]
        },
        {
            items: [
                { key: "categories", label: "التصنيفات", href: "/admin/categories.html", icon: "categories" },
                { key: "products", label: "المنتجات", href: "/admin/products.html", icon: "products" }
            ]
        },
        {
            items: [
                { key: "orders", label: "الطلبات", href: "/admin/orders.html", icon: "orders" },
                { key: "customers", label: "العملاء", href: "/admin/customers.html", icon: "customers" }
            ]
        },
        {
            items: [
                { key: "users", label: "المستخدمون", href: "/admin/users.html", icon: "users" },
                { key: "shipping", label: "الشحن والتوصيل", href: "/admin/shipping.html", icon: "shipping" }
            ]
        },
        {
            items: [
                { key: "website-editor", label: "محرر الموقع", href: "/admin/website-editor.html", icon: "editor" },
                { key: "settings", label: "الإعدادات", href: "/admin/settings.html", icon: "settings" }
            ]
        },
        {
            items: [
                { key: "activity", label: "نشاط الإدارة", href: "/admin/activity.html", icon: "activity" },
                { key: "profile", label: "الملف الشخصي", href: "/admin/profile.html", icon: "profile" }
            ]
        }
    ];

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function initials(name, email) {
        var source = (name || email || "").trim();
        var parts = source.split(/\s+/).filter(Boolean);
        if (parts.length === 0) return "؟";
        if (parts.length === 1) return parts[0].charAt(0);
        return parts[0].charAt(0) + parts[1].charAt(0);
    }

    // ---------------------------------------------------------
    // Loading / denied states
    // ---------------------------------------------------------

    function showLoading() {
        var loading = document.getElementById("adminLoading");
        if (loading) loading.hidden = false;
    }

    function hideLoading() {
        var loading = document.getElementById("adminLoading");
        if (loading) loading.hidden = true;
    }

    function showDenied() {
        hideLoading();
        window.location.replace("/admin/unauthorized.html");
    }

    // ---------------------------------------------------------
    // Main layout render (sidebar + topbar)
    // ---------------------------------------------------------

    function render(options) {
        hideLoading();

        var layout = document.getElementById("adminLayout");
        if (layout) layout.hidden = false;

        renderSidebar(options.active || "");
        renderTopbar(options.title || "", options.user);

        var logoutButton = document.getElementById("topbarLogoutButton");
        if (logoutButton) {
            logoutButton.addEventListener("click", function () {
                window.AdminAuth.logout();
            });
        }

        var mobileToggle = document.getElementById("sidebarToggle");
        var sidebar = document.getElementById("adminSidebar");
        if (mobileToggle && sidebar) {
            mobileToggle.addEventListener("click", function () {
                sidebar.classList.toggle("sidebar-open");
            });
        }
    }

    function renderSidebar(activeKey) {
        var sidebar = document.getElementById("adminSidebar");
        if (!sidebar) return;

        var navHtml = NAV_GROUPS.map(function (group) {
            var heading = group.title
                ? '<p class="sidebar-group-title">' + escapeHtml(group.title) + "</p>"
                : "";

            var links = group.items.map(function (item) {
                var isActive = item.key === activeKey ? " is-active" : "";
                return (
                    '<a class="sidebar-link' + isActive + '" href="' + item.href + '">' +
                    '<span class="sidebar-icon">' + ICONS[item.icon] + "</span>" +
                    '<span class="sidebar-label">' + escapeHtml(item.label) + "</span>" +
                    "</a>"
                );
            }).join("");

            return heading + links;
        }).join("");

        sidebar.innerHTML =
            '<div class="sidebar-header">' +
            '<img src="../logo.png" alt="دار الشاط" class="sidebar-logo">' +
            '<button type="button" class="sidebar-close" aria-label="إغلاق القائمة">×</button>' +
            "</div>" +
            '<nav class="sidebar-nav">' + navHtml + "</nav>" +
            '<div class="sidebar-footer">' +
            '<a class="sidebar-link sidebar-link-muted" href="/">' +
            '<span class="sidebar-icon">' + ICONS.store + "</span>" +
            '<span class="sidebar-label">العودة إلى المتجر</span>' +
            "</a>" +
            '<a class="sidebar-link sidebar-link-muted" id="sidebarLogoutLink" href="javascript:void(0)">' +
            '<span class="sidebar-icon">' + ICONS.logout + "</span>" +
            '<span class="sidebar-label">تسجيل الخروج</span>' +
            "</a>" +
            "</div>";

        var closeButton = sidebar.querySelector(".sidebar-close");
        if (closeButton) {
            closeButton.addEventListener("click", function () {
                sidebar.classList.remove("sidebar-open");
            });
        }

        sidebar.addEventListener("click", function (event) {
            if (event.target.closest(".sidebar-link")) {
                sidebar.classList.remove("sidebar-open");
            }
        });

        var logoutLink = document.getElementById("sidebarLogoutLink");
        if (logoutLink) {
            logoutLink.addEventListener("click", function () {
                window.AdminAuth.logout();
            });
        }
    }

    function renderTopbar(title, user) {
        var topbar = document.getElementById("adminTopbar");
        if (!topbar) return;

        var email = user && user.email ? user.email : "";
        var name = email.split("@")[0] || "";

        topbar.innerHTML =
            '<button type="button" class="topbar-toggle" id="sidebarToggle" aria-label="فتح القائمة">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6H20"/><path d="M4 12H20"/><path d="M4 18H20"/></svg>' +
            "</button>" +
            '<h1 class="topbar-title">' + escapeHtml(title) + "</h1>" +
            '<div class="topbar-actions">' +
            '<div class="topbar-user">' +
            '<span class="topbar-avatar">' + escapeHtml(initials(name, email)) + "</span>" +
            '<div class="topbar-user-info">' +
            '<span class="topbar-user-name">' + escapeHtml(name) + "</span>" +
            '<span class="topbar-user-email">' + escapeHtml(email) + "</span>" +
            "</div>" +
            "</div>" +
            '<button type="button" class="topbar-logout" id="topbarLogoutButton">' +
            '<span class="topbar-logout-icon">' + ICONS.logout + "</span>" +
            '<span class="topbar-logout-label">تسجيل الخروج</span>' +
            "</button>" +
            "</div>";
    }

    window.AdminLayout = {
        showLoading: showLoading,
        hideLoading: hideLoading,
        showDenied: showDenied,
        render: render
    };
})();