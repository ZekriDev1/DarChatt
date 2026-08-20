// =============================================================
// Dar Chatt — Admin Products List
// Search, category/status/stock filters, sorting, pagination,
// toggle status, delete with confirmation, view details.
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;
    var S = window.AdminShared;

    var PAGE_SIZE = 12;

    var state = {
        search: "",
        category: "all",
        status: "all",
        stock: "all",
        sort: "newest",
        page: 1,
        products: [],
        categoriesMap: {},
        session: null
    };

    // ---------------------------------------------------------
    // Loading
    // ---------------------------------------------------------

    async function loadCategoriesMap() {
        var result = await S.fetchAll(supabase.from("categories").select("id, name"));
        if (result.error) return;

        state.categoriesMap = {};
        (result.data || []).forEach(function (category) {
            state.categoriesMap[category.id] = category.name;
        });

        var filter = document.getElementById("categoryFilter");
        if (filter) {
            filter.innerHTML =
                '<option value="all">التصنيف: الكل</option>' +
                result.data.map(function (category) {
                    return '<option value="' + category.id + '">' + S.escapeHtml(category.name) + "</option>";
                }).join("");
        }
    }

    async function loadProducts() {
        var tableBody = document.getElementById("productsTableBody");
        if (!tableBody) return;

        tableBody.innerHTML =
            '<tr><td colspan="8" class="cell-muted">جاري تحميل المنتجات...</td></tr>';

        var result = await S.fetchAll(
            supabase.from("products").select(
                "id, name_ar, name_en, slug, sku, category_id, price, old_price, is_sale, stock, stock_status, image_url, is_active, is_featured, created_at"
            )
        );

        if (result.error) {
            tableBody.innerHTML =
                '<tr><td colspan="8" class="cell-muted">تعذر تحميل المنتجات.</td></tr>';
            return;
        }

        state.products = result.data || [];
        renderTable();
    }

    // ---------------------------------------------------------
    // Filtering / sorting
    // ---------------------------------------------------------

    function getFiltered() {
        var search = state.search.trim().toLowerCase();

        var list = state.products.filter(function (product) {
            var matchesCategory = state.category === "all" || product.category_id === state.category;
            var matchesStatus =
                state.status === "all" ||
                (state.status === "active" && product.is_active) ||
                (state.status === "inactive" && !product.is_active);
            var matchesStock = state.stock === "all" || product.stock_status === state.stock;

            var haystack = (
                (product.name_ar || "") + " " + (product.name_en || "") + " " +
                (product.slug || "") + " " + (product.sku || "")
            ).toLowerCase();
            var matchesSearch = !search || haystack.indexOf(search) !== -1;

            return matchesCategory && matchesStatus && matchesStock && matchesSearch;
        });

        list.sort(function (a, b) {
            if (state.sort === "oldest") {
                return new Date(a.created_at) - new Date(b.created_at);
            }
            if (state.sort === "price_high") {
                return Number(b.price) - Number(a.price);
            }
            if (state.sort === "price_low") {
                return Number(a.price) - Number(b.price);
            }
            // newest
            return new Date(b.created_at) - new Date(a.created_at);
        });

        return list;
    }

    // ---------------------------------------------------------
    // Rendering
    // ---------------------------------------------------------

    function renderTable() {
        var tableBody = document.getElementById("productsTableBody");
        var emptyBox = document.getElementById("productsEmpty");
        var pagination = document.getElementById("productsPagination");
        var pagesContainer = document.getElementById("productsPages");
        var countElement = document.getElementById("productsCount");

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

        tableBody.innerHTML = pageRows.map(function (product) {
            var thumb = product.image_url
                ? '<img class="product-thumb" src="' + S.escapeHtml(product.image_url) + '" alt="">'
                : '<span class="product-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--muted)">—</span>';

            var categoryName = product.category_id
                ? (state.categoriesMap[product.category_id] || "—")
                : "—";

            var priceHtml;
            if (product.is_sale && product.old_price != null) {
                priceHtml =
                    '<div style="color:var(--danger);font-weight:700">' + S.formatMoney(product.price) + "</div>" +
                    '<div class="cell-muted" style="text-decoration:line-through;font-size:12px">' + S.formatMoney(product.old_price) + "</div>";
            } else {
                priceHtml = '<div style="font-weight:700">' + S.formatMoney(product.price) + "</div>";
            }

            var stockBadge = S.STOCK_STATUSES[product.stock_status] || { label: product.stock_status, css: "" };
            var statusBadge = product.is_active
                ? '<span class="admin-badge" style="background:#F3F8F3;border-color:#BFD9BF;color:var(--success)">نشط</span>'
                : '<span class="admin-badge" style="background:#F5F5F5;border-color:var(--border);color:var(--muted)">غير نشط</span>';

            return (
                "<tr>" +
                "<td>" + thumb + "</td>" +
                "<td>" +
                '<div class="product-cell">' +
                "<div>" +
                '<div class="product-name">' + S.escapeHtml(product.name_ar) + (product.is_featured ? ' <span class="admin-badge admin-badge-admin">مميز</span>' : "") + "</div>" +
                '<div class="product-name-en">' + S.escapeHtml(product.name_en || "") + "</div>" +
                "</div>" +
                "</div>" +
                "</td>" +
                "<td>" + S.escapeHtml(categoryName) + "</td>" +
                "<td>" + priceHtml + "</td>" +
                '<td><span class="stock-badge ' + stockBadge.css + '">' + stockBadge.label + " (" + S.formatNumber(product.stock) + ")</span></td>" +
                "<td>" + statusBadge + "</td>" +
                '<td class="cell-muted">' + S.formatDate(product.created_at) + "</td>" +
                '<td>' +
                '<div class="row-actions">' +
                '<a class="table-action" href="/admin/product-view.html?id=' + encodeURIComponent(product.id) + '">عرض</a>' +
                '<button type="button" class="table-action" data-action="toggle" data-id="' + product.id + '">' +
                (product.is_active ? "تعطيل" : "تفعيل") +
                "</button>" +
                '<a class="table-action" href="/admin/product-edit.html?id=' + encodeURIComponent(product.id) + '">تعديل</a>' +
                '<button type="button" class="table-action table-action-danger" data-action="delete" data-id="' + product.id + '">حذف</button>' +
                "</div>" +
                "</td>" +
                "</tr>"
            );
        }).join("");

        if (pagination) {
            pagination.hidden = false;
            if (countElement) {
                countElement.textContent = filtered.length + " منتج";
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

    async function toggleStatus(productId) {
        var product = state.products.find(function (p) { return p.id === productId; });
        if (!product) return;

        var newValue = !product.is_active;

        var result = await supabase
            .from("products")
            .update({ is_active: newValue })
            .eq("id", productId);

        if (result.error) {
            S.toast("تعذر تحديث الحالة: " + (result.error.message || ""), "error");
            return;
        }

        product.is_active = newValue;
        S.toast(newValue ? "تم تفعيل المنتج" : "تم تعطيل المنتج", "success");
        S.logActivity(state.session, "product.update", "product", productId, {
            field: "is_active",
            value: newValue
        });
        renderTable();
    }

    async function deleteProduct(productId) {
        var product = state.products.find(function (p) { return p.id === productId; });
        if (!product) return;

        var confirmed = await S.confirmDialog({
            title: "حذف المنتج",
            message:
                "هل أنت متأكد من حذف المنتج \"" + product.name_ar + "\" نهائياً؟" +
                " سيتم الاحتفاظ بسجل الطلبات السابقة المرتبطة به.",
            confirmLabel: "حذف نهائياً"
        });

        if (!confirmed) return;

        var result = await supabase.from("products").delete().eq("id", productId);

        if (result.error) {
            S.toast("تعذر حذف المنتج: " + (result.error.message || ""), "error");
            return;
        }

        // Best effort: remove stored images.
        var urls = [];
        if (product.image_url) urls.push(product.image_url);
        try {
            var images = JSON.parse(product.images || "[]");
            urls = urls.concat(images);
        } catch (err) {}

        var uniqueUrls = urls.filter(function (url, index) { return urls.indexOf(url) === index; });
        uniqueUrls.forEach(function (url) {
            S.deleteStoredFile(url);
        });

        S.toast("تم حذف المنتج", "success");
        S.logActivity(state.session, "product.delete", "product", productId, {
            name: product.name_ar
        });

        state.products = state.products.filter(function (p) { return p.id !== productId; });
        renderTable();
    }

    // ---------------------------------------------------------
    // Events
    // ---------------------------------------------------------

    function bindEvents() {
        var tableBody = document.getElementById("productsTableBody");
        if (tableBody) {
            tableBody.addEventListener("click", function (event) {
                var button = event.target.closest("[data-action]");
                if (!button) return;

                var id = button.getAttribute("data-id");
                var action = button.getAttribute("data-action");

                if (action === "toggle") toggleStatus(id);
                if (action === "delete") deleteProduct(id);
            });
        }

        var searchInput = document.getElementById("productSearch");
        if (searchInput) {
            searchInput.addEventListener("input", S.debounce(function () {
                state.search = searchInput.value;
                state.page = 1;
                renderTable();
            }, 300));
        }

        var categoryFilter = document.getElementById("categoryFilter");
        if (categoryFilter) {
            categoryFilter.addEventListener("change", function () {
                state.category = categoryFilter.value;
                state.page = 1;
                renderTable();
            });
        }

        var statusFilter = document.getElementById("statusFilter");
        if (statusFilter) {
            statusFilter.addEventListener("change", function () {
                state.status = statusFilter.value;
                state.page = 1;
                renderTable();
            });
        }

        var stockFilter = document.getElementById("stockFilter");
        if (stockFilter) {
            stockFilter.addEventListener("change", function () {
                state.stock = stockFilter.value;
                state.page = 1;
                renderTable();
            });
        }

        var sortSelect = document.getElementById("sortSelect");
        if (sortSelect) {
            sortSelect.addEventListener("change", function () {
                state.sort = sortSelect.value;
                renderTable();
            });
        }

        var pagesContainer = document.getElementById("productsPages");
        if (pagesContainer) {
            pagesContainer.addEventListener("click", function (event) {
                var button = event.target.closest("[data-page]");
                if (!button) return;
                state.page = Number(button.getAttribute("data-page"));
                renderTable();
            });
        }
    }

    // ---------------------------------------------------------
    // Init
    // ---------------------------------------------------------

    function initProducts() {
        bindEvents();
        loadCategoriesMap();
        loadProducts();
    }

    document.addEventListener("DOMContentLoaded", function () {
        window.AdminAuth.initAdminPage({
            active: "products",
            title: "إدارة المنتجات",
            onReady: function (user) {
                state.session = { user: user };
                initProducts();
            }
        });
    });
})();