// =============================================================
// Dar Chatt — Admin Categories List
// Search / filter / paginate categories, toggle status, delete
// with a product-count guard (never deletes a category that
// still contains products).
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;
    var S = window.AdminShared;

    var PAGE_SIZE = 15;

    var state = {
        search: "",
        status: "all",
        page: 1,
        categories: [],
        productsByCategory: {},
        session: null
    };

    // ---------------------------------------------------------
    // Data loading
    // ---------------------------------------------------------

    async function loadAllCategories() {
        var result = await S.fetchAll(
            supabase.from("categories").select("id, name, name_en, slug, image_url, is_active, sort_order, created_at")
        );
        if (result.error) return null;
        return result.data;
    }

    async function loadProductsMap() {
        var result = await S.fetchAll(
            supabase.from("products").select("id, category_id")
        );
        if (result.error) return {};

        var map = {};
        (result.data || []).forEach(function (product) {
            if (!product.category_id) return;
            map[product.category_id] = (map[product.category_id] || 0) + 1;
        });
        return map;
    }

    async function loadCategories() {
        var tableBody = document.getElementById("categoriesTableBody");
        if (!tableBody) return;

        tableBody.innerHTML =
            '<tr><td colspan="8" class="cell-muted">جاري تحميل التصنيفات...</td></tr>';

        var categories = await loadAllCategories();
        var productsMap = await loadProductsMap();

        if (categories === null) {
            tableBody.innerHTML =
                '<tr><td colspan="8" class="cell-muted">تعذر تحميل التصنيفات.</td></tr>';
            return;
        }

        state.categories = categories;
        state.productsByCategory = productsMap;
        renderTable();
    }

    // ---------------------------------------------------------
    // Rendering
    // ---------------------------------------------------------

    function getFiltered() {
        var search = state.search.trim().toLowerCase();
        var list = state.categories.filter(function (category) {
            var matchesStatus =
                state.status === "all" ||
                (state.status === "active" && category.is_active) ||
                (state.status === "inactive" && !category.is_active);

            var haystack = ((category.name || "") + " " + (category.name_en || "") + " " + (category.slug || "")).toLowerCase();
            var matchesSearch = !search || haystack.indexOf(search) !== -1;

            return matchesStatus && matchesSearch;
        });

        list.sort(function (a, b) {
            var orderDiff = Number(a.sort_order) - Number(b.sort_order);
            if (orderDiff !== 0) return orderDiff;
            return String(a.name || "").localeCompare(String(b.name || ""), "ar");
        });

        return list;
    }

    function renderTable() {
        var tableBody = document.getElementById("categoriesTableBody");
        var emptyBox = document.getElementById("categoriesEmpty");
        var pagination = document.getElementById("categoriesPagination");
        var pagesContainer = document.getElementById("categoriesPages");
        var countElement = document.getElementById("categoriesCount");

        var filtered = getFiltered();

        if (filtered.length === 0) {
            tableBody.innerHTML = "";
            if (emptyBox) emptyBox.hidden = false;
            if (pagination) pagination.hidden = true;
            return;
        }

        if (emptyBox) emptyBox.hidden = true;

        var totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
        if (state.page > totalPages) state.page = totalPages;

        var start = (state.page - 1) * PAGE_SIZE;
        var pageRows = filtered.slice(start, start + PAGE_SIZE);

        tableBody.innerHTML = pageRows.map(function (category, index) {
            var count = state.productsByCategory[category.id] || 0;
            var statusBadge = category.is_active
                ? '<span class="admin-badge" style="background:#F3F8F3;border-color:#BFD9BF;color:var(--success)">نشط</span>'
                : '<span class="admin-badge" style="background:#F5F5F5;border-color:var(--border);color:var(--muted)">غير نشط</span>';

            var nameHtml = S.escapeHtml(category.name);
            if (category.name_en) {
                nameHtml += '<div class="product-name-en">' + S.escapeHtml(category.name_en) + "</div>";
            }

            return (
                "<tr>" +
                "<td class=\"cell-muted\">" + (start + index + 1) + "</td>" +
                "<td>" + nameHtml + "</td>" +
                '<td class="cell-muted cell-slug" dir="ltr">' + S.escapeHtml(category.slug) + "</td>" +
                "<td>" + S.formatNumber(count) + "</td>" +
                "<td>" + statusBadge + "</td>" +
                "<td>" + S.formatNumber(category.sort_order) + "</td>" +
                '<td class="cell-muted">' + S.formatDate(category.created_at) + "</td>" +
                '<td>' +
                '<div class="row-actions">' +
                '<button type="button" class="table-action" data-action="toggle" data-id="' + category.id + '">' +
                (category.is_active ? "تعطيل" : "تفعيل") +
                "</button>" +
                '<a class="table-action" href="/admin/category-edit.html?id=' + encodeURIComponent(category.id) + '">تعديل</a>' +
                '<button type="button" class="table-action table-action-danger" data-action="delete" data-id="' + category.id + '">حذف</button>' +
                "</div>" +
                "</td>" +
                "</tr>"
            );
        }).join("");

        // Pagination UI
        if (pagination) {
            pagination.hidden = false;
            if (countElement) {
                countElement.textContent = filtered.length + " تصنيف";
            }
            if (pagesContainer) {
                var buttons = "";
                if (state.page > 1) {
                    buttons += '<button type="button" class="page-button" data-page="' + (state.page - 1) + '">السابق</button>';
                }
                for (var p = 1; p <= totalPages; p++) {
                    var isCurrent = p === state.page ? " is-current" : "";
                    buttons += '<button type="button" class="page-button' + isCurrent + '" data-page="' + p + '">' + p + "</button>";
                }
                if (state.page < totalPages) {
                    buttons += '<button type="button" class="page-button" data-page="' + (state.page + 1) + '">التالي</button>';
                }
                pagesContainer.innerHTML = buttons;
            }
        }
    }

    // ---------------------------------------------------------
    // Actions
    // ---------------------------------------------------------

    async function toggleStatus(categoryId) {
        var category = state.categories.find(function (c) { return c.id === categoryId; });
        if (!category) return;

        var newValue = !category.is_active;

        var result = await supabase
            .from("categories")
            .update({ is_active: newValue })
            .eq("id", categoryId);

        if (result.error) {
            S.toast("تعذر تحديث الحالة: " + (result.error.message || ""), "error");
            return;
        }

        category.is_active = newValue;
        S.toast(newValue ? "تم تفعيل التصنيف" : "تم تعطيل التصنيف", "success");
        S.logActivity(state.session, "category.update", "category", categoryId, {
            field: "is_active",
            value: newValue
        });
        renderTable();
    }

    async function deleteCategory(categoryId) {
        var category = state.categories.find(function (c) { return c.id === categoryId; });
        if (!category) return;

        var productCount = state.productsByCategory[categoryId] || 0;

        if (productCount > 0) {
            await S.confirmDialog({
                title: "لا يمكن الحذف",
                message:
                    "التصنيف \"" + category.name + "\" يحتوي على " +
                    S.formatNumber(productCount) + " منتج. انقل المنتجات إلى تصنيف آخر أو احذفها أولاً.",
                confirmLabel: "فهمت",
                danger: true
            });
            return;
        }

        var confirmed = await S.confirmDialog({
            title: "حذف التصنيف",
            message: "هل أنت متأكد من حذف التصنيف \"" + category.name + "\" نهائياً؟",
            confirmLabel: "حذف نهائياً"
        });

        if (!confirmed) return;

        var result = await supabase.from("categories").delete().eq("id", categoryId);

        if (result.error) {
            S.toast("تعذر حذف التصنيف: " + (result.error.message || ""), "error");
            return;
        }

        if (category.image_url) {
            S.deleteStoredFile(category.image_url);
        }

        S.toast("تم حذف التصنيف", "success");
        S.logActivity(state.session, "category.delete", "category", categoryId, {
            name: category.name
        });

        state.categories = state.categories.filter(function (c) { return c.id !== categoryId; });
        renderTable();
    }

    // ---------------------------------------------------------
    // Events
    // ---------------------------------------------------------

    function bindEvents() {
        var tableBody = document.getElementById("categoriesTableBody");
        if (tableBody) {
            tableBody.addEventListener("click", function (event) {
                var button = event.target.closest("[data-action]");
                if (!button) return;

                var id = button.getAttribute("data-id");
                var action = button.getAttribute("data-action");

                if (action === "toggle") toggleStatus(id);
                if (action === "delete") deleteCategory(id);
            });
        }

        var searchInput = document.getElementById("categorySearch");
        if (searchInput) {
            searchInput.addEventListener("input", S.debounce(function () {
                state.search = searchInput.value;
                state.page = 1;
                renderTable();
            }, 300));
        }

        var statusFilter = document.getElementById("statusFilter");
        if (statusFilter) {
            statusFilter.addEventListener("change", function () {
                state.status = statusFilter.value;
                state.page = 1;
                renderTable();
            });
        }

        var pagesContainer = document.getElementById("categoriesPages");
        if (pagesContainer) {
            pagesContainer.addEventListener("click", function (event) {
                var button = event.target.closest("[data-page]");
                if (!button) return;
                state.page = Number(button.getAttribute("data-page"));
                renderTable();
            });
        }

        var retryButton = document.getElementById("retryCategoriesButton");
        if (retryButton) {
            retryButton.addEventListener("click", loadCategories);
        }
    }

    // ---------------------------------------------------------
    // Init
    // ---------------------------------------------------------

    function initCategories() {
        bindEvents();
        loadCategories();
    }

    document.addEventListener("DOMContentLoaded", function () {
        window.AdminAuth.initAdminPage({
            active: "categories",
            title: "إدارة التصنيفات",
            onReady: async function (user) {
                state.session = {
                    user: user,
                    email: user.email
                };
                initCategories();
            }
        });
    });
})();