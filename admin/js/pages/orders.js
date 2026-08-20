// =============================================================
// Dar Chatt — Admin Orders List
// Search (order number / customer / phone), status filter,
// date range filter, sort, pagination.
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;
    var S = window.AdminShared;

    var PAGE_SIZE = 15;

    var state = {
        search: "",
        status: "all",
        dateFrom: "",
        dateTo: "",
        sort: "newest",
        page: 1,
        orders: []
    };

    async function loadOrders() {
        var tableBody = document.getElementById("ordersTableBody");
        if (!tableBody) return;

        tableBody.innerHTML =
            '<tr><td colspan="8" class="cell-muted">جاري تحميل الطلبات...</td></tr>';

        var result = await S.fetchAll(
            supabase.from("orders").select(
                "id, order_number, customer_name, customer_phone, total, status, payment_method, created_at"
            )
        );

        if (result.error) {
            tableBody.innerHTML =
                '<tr><td colspan="8" class="cell-muted">تعذر تحميل الطلبات.</td></tr>';
            return;
        }

        state.orders = result.data || [];
        renderTable();
    }

    function getFiltered() {
        var search = state.search.trim().toLowerCase();
        var fromTime = state.dateFrom ? new Date(state.dateFrom + "T00:00:00").getTime() : null;
        var toTime = state.dateTo ? new Date(state.dateTo + "T23:59:59").getTime() : null;

        var list = state.orders.filter(function (order) {
            var matchesStatus = state.status === "all" || order.status === state.status;

            var haystack = (
                (order.order_number || "") + " " + (order.customer_name || "") + " " +
                (order.customer_phone || "")
            ).toLowerCase();
            var matchesSearch = !search || haystack.indexOf(search) !== -1;

            var orderTime = new Date(order.created_at).getTime();
            var matchesFrom = !fromTime || orderTime >= fromTime;
            var matchesTo = !toTime || orderTime <= toTime;

            return matchesStatus && matchesSearch && matchesFrom && matchesTo;
        });

        list.sort(function (a, b) {
            var diff = new Date(a.created_at) - new Date(b.created_at);
            return state.sort === "oldest" ? diff : -diff;
        });

        return list;
    }

    function renderTable() {
        var tableBody = document.getElementById("ordersTableBody");
        var emptyBox = document.getElementById("ordersEmpty");
        var pagination = document.getElementById("ordersPagination");
        var pagesContainer = document.getElementById("ordersPages");
        var countElement = document.getElementById("ordersCount");

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

        tableBody.innerHTML = pageRows.map(function (order) {
            var status = S.ORDER_STATUSES[order.status] || { label: order.status, css: "" };

            return (
                "<tr>" +
                '<td class="cell-slug" dir="ltr" style="font-weight:700">' + S.escapeHtml(order.order_number) + "</td>" +
                "<td>" + S.escapeHtml(order.customer_name) + "</td>" +
                '<td class="cell-muted" dir="ltr" style="text-align:right">' + S.escapeHtml(order.customer_phone || "—") + "</td>" +
                '<td style="font-weight:700">' + S.formatMoney(order.total) + "</td>" +
                '<td><span class="order-badge ' + status.css + '">' + status.label + "</span></td>" +
                "<td>" + (order.payment_method === "cod" ? "الدفع عند الاستلام" : S.escapeHtml(order.payment_method || "—")) + "</td>" +
                '<td class="cell-muted">' + S.formatDateTime(order.created_at) + "</td>" +
                '<td><a class="table-action" href="/admin/order-view.html?id=' + encodeURIComponent(order.id) + '">عرض</a></td>' +
                "</tr>"
            );
        }).join("");

        if (pagination) {
            pagination.hidden = false;
            if (countElement) {
                countElement.textContent = filtered.length + " طلب";
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

    function bindEvents() {
        var searchInput = document.getElementById("orderSearch");
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

        var dateFrom = document.getElementById("dateFrom");
        if (dateFrom) {
            dateFrom.addEventListener("change", function () {
                state.dateFrom = dateFrom.value;
                state.page = 1;
                renderTable();
            });
        }

        var dateTo = document.getElementById("dateTo");
        if (dateTo) {
            dateTo.addEventListener("change", function () {
                state.dateTo = dateTo.value;
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

        var pagesContainer = document.getElementById("ordersPages");
        if (pagesContainer) {
            pagesContainer.addEventListener("click", function (event) {
                var button = event.target.closest("[data-page]");
                if (!button) return;
                state.page = Number(button.getAttribute("data-page"));
                renderTable();
            });
        }
    }

    function initOrders() {
        bindEvents();
        loadOrders();
    }

    document.addEventListener("DOMContentLoaded", function () {
        window.AdminAuth.initAdminPage({
            active: "orders",
            title: "إدارة الطلبات",
            onReady: initOrders
        });
    });
})();