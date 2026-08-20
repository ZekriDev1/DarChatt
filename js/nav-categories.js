// =============================================================
// Dar Chatt — Public Navbar: Dynamic Categories
// Loads active categories from Supabase and builds the
// التصنيفات dropdown. No category names are hardcoded.
//
// Uses the SAME shared client (js/supabase.js) as the admin panel.
// Public access is limited to is_active = true by RLS.
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function categoryUrl(slug) {
        return "shop.html?category=" + encodeURIComponent(slug);
    }

    // ---------------------------------------------------------
    // Fetch active categories, ordered by sort_order ASC.
    // ---------------------------------------------------------

    async function fetchCategories() {
        var result = await supabase
            .from("categories")
            .select("id, name, slug, parent_id, sort_order")
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true });

        if (result.error) {
            throw result.error;
        }

        return result.data || [];
    }

    // ---------------------------------------------------------
    // Build the dropdown tree (unlimited nesting levels).
    // ---------------------------------------------------------

    function buildTree(categories) {
        var byId = {};
        var roots = [];

        categories.forEach(function (category) {
            byId[category.id] = Object.assign({ children: [] }, category);
        });

        categories.forEach(function (category) {
            var node = byId[category.id];
            var parent = category.parent_id ? byId[category.parent_id] : null;

            if (parent) {
                parent.children.push(node);
            } else {
                roots.push(node);
            }
        });

        return roots;
    }

    function renderNode(node, depth) {
        var html = "";

        if (node.children.length > 0) {
            html +=
                '<div class="category-group">' +
                '<a class="category-item" href="' + categoryUrl(node.slug) + '">' +
                '<span class="category-name">' + escapeHtml(node.name) + "</span>" +
                '<span class="category-arrow">←</span>' +
                "</a>";

            node.children.forEach(function (child) {
                html += renderNode(child, depth + 1);
            });

            html += "</div>";
        } else {
            html +=
                '<a class="category-item' + (depth > 0 ? " category-subitem" : "") + '" href="' + categoryUrl(node.slug) + '">' +
                '<span class="category-name">' + escapeHtml(node.name) + "</span>" +
                (depth === 0 ? '<span class="category-arrow">←</span>' : "") +
                "</a>";
        }

        return html;
    }

    // ---------------------------------------------------------
    // Dropdown render states
    // ---------------------------------------------------------

    function renderLoading(container) {
        container.innerHTML =
            '<div class="dropdown-state-item">جاري تحميل التصنيفات...</div>';
    }

    function renderError(container) {
        container.innerHTML =
            '<div class="dropdown-state-item dropdown-state-error">تعذر تحميل التصنيفات حالياً</div>';
    }

    function renderEmpty(container) {
        container.innerHTML =
            '<div class="dropdown-state-item">لا توجد تصنيفات بعد</div>';
    }

    // ---------------------------------------------------------
    // Init
    // ---------------------------------------------------------

    async function init() {
        var menu = document.getElementById("categoriesMenu");
        var container = document.getElementById("categoriesMenuItems");

        if (!menu || !container) return;

        // Close the dropdown when a dynamic link is clicked.
        var dropdown = document.getElementById("categoriesDropdown");
        if (dropdown) {
            menu.addEventListener("click", function (event) {
                if (event.target.closest("a")) {
                    dropdown.classList.remove("active");
                }
            });
        }

        if (!supabase) {
            renderError(container);
            return;
        }

        renderLoading(container);

        try {
            var categories = await fetchCategories();
            var roots = buildTree(categories);

            if (roots.length === 0) {
                renderEmpty(container);
                return;
            }

            var html = "";
            roots.forEach(function (root) {
                html += renderNode(root, 0);
            });

            container.innerHTML = html;
        } catch (err) {
            renderError(container);
        }
    }

    document.addEventListener("DOMContentLoaded", init);
})();