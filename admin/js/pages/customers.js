// =============================================================
// Dar Chatt — Customers List
// Real profiles (role = customer) with per-customer order stats.
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;
    var S = window.AdminShared;

    var PAGE_SIZE = 15;

    var state = {
        search: "",
        ordersFilter: "all",
        sort: "newest",
        page: 1,
        customers: [] // { profile, ordersCount, totalSpent, lastOrderAt }
    };

    async function loadCustomers() {
        var tableBody = document.getElementById("customersTableBody");
        if (!tableBody) return;

        tableBody.innerHTML =
            '<tr><td colspan="9" class="cell-muted">جاري تحميل العملاء...</td></tr>';

        var profilesResult = await S.fetchAll(
            supabase
                .from("profiles")
                .select("id, email, full_name, phone, role, created_at")
                .eq("role", "customer")
        );

        if (profilesResult.error) {
            tableBody.innerHTML =
                '<tr><td colspan="9" class="cell-muted">تعذر تحميل العملاء.</td></tr>';
            return;
        }

        var ordersResult = await S.fetchAll(
            supabase.from("orders").select("id, customer_id, total, status, created_at")
        );

        // Build per-customer order stats.
        var statsMap = {};
        (ordersResult.error ? [] : ordersResult.data).forEach(function (order) {
            if (!order.customer_id) return;

            if (!statsMap[order.customer_id]) {
                statsMap[order.customer_id] = { count: 0, spent: 0, lastOrderAt: null };
            }

            var stat = statsMap[order.customer_id];
            stat.count += 1;

            // Purchases = non-cancelled orders.
            if (order.status !== "cancelled") {
                stat.spent += Number(order.total) || 0;
            }

            var time = new Date(order.created_at).getTime();
            if (!stat.lastOrderAt || time > stat.lastOrderAt) {
                stat.lastOrderAt = time;
            }
        });

        state.customers = (profilesResult.data || []).map(function (profile) {
            var stat = statsMap[profile.id] || { count: 0, spent: 0, lastOrderAt: null };
            return {
                profile: profile,
                ordersCount: stat.count,
                totalSpent: stat.spent,
                lastOrderAt: stat.lastOrderAt
            };
        });

        renderTable();
    }

    function getFiltered() {
        var search = state.search.trim().toLowerCase();

        var list = state.customers.filter(function (customer) {
            var matchesOrdersFilter =
                state.ordersFilter === "all" ||
                (state.ordersFilter === "with_orders" && customer.ordersCount > 0) ||
                (state.ordersFilter === "without_orders" && customer.ordersCount === 0);

            var profile = customer.profile;
            var haystack = (
                (profile.full_name || "") + " " + (profile.email || "") + " " + (profile.phone || "")
            ).toLowerCase();
            var matchesSearch = !search || haystack.indexOf(search) !== -1;

            return matchesOrdersFilter && matchesSearch;
        });

        list.sort(function (a, b) {
            if (state.sort === "most_orders") return b.ordersCount - a.ordersCount;
            if (state.sort === "most_spent") return b.totalSpent - a.totalSpent;
            return new Date(b.profile.created_at) - new Date(a.profile.created_at);
        });

        return list;
    }

    function renderTable() {
        var tableBody = document.getElementById("customersTableBody");
        var emptyBox = document.getElementById("customersEmpty");
        var pagination = document.getElementById("customersPagination");
        var pagesContainer = document.getElementById("customersPages");
        var countElement = document.getElementById("customersCount");

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

        tableBody.innerHTML = pageRows.map(function (customer) {
            var profile = customer.profile;
            var name = profile.full_name || "—";

            return (
                "<tr>" +
                "<td>" + S.escapeHtml(name) + "</td>" +
                '<td class="cell-muted" dir="ltr" style="text-align:right">' + S.escapeHtml(profile.email || "—") + "</td>" +
                '<td class="cell-muted" dir="ltr" style="text-align:right">' + S.escapeHtml(profile.phone || "—") + "</td>" +
                "<td>" + S.formatNumber(customer.ordersCount) + "</td>" +
                '<td style="font-weight:700">' + S.formatMoney(customer.totalSpent) + "</td>" +
                '<td class="cell-muted">' + (customer.lastOrderAt ? S.formatDate(new Date(customer.lastOrderAt)) : "—") + "</td>" +
                '<td class="cell-muted">' + S.formatDate(profile.created_at) + "</td>" +
                '<td><span class="admin-badge" style="background:#F3F8F3;border-color:#BFD9BF;color:var(--success)">نشط</span></td>' +
                '<td><a class="table-action" href="/admin/customer-view.html?id=' + encodeURIComponent(profile.id) + '">عرض</a></td>' +
                "</tr>"
            );
        }).join("");

        if (pagination) {
            pagination.hidden = false;
            if (countElement) {
                countElement.textContent = filtered.length + " عميل";
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
        var searchInput = document.getElementById("customerSearch");
        if (searchInput) {
            searchInput.addEventListener("input", S.debounce(function () {
                state.search = searchInput.value;
                state.page = 1;
                renderTable();
            }, 300));
        }

        var ordersFilter = document.getElementById("ordersFilter");
        if (ordersFilter) {
            ordersFilter.addEventListener("change", function () {
                state.ordersFilter = ordersFilter.value;
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

        var pagesContainer = document.getElementById("customersPages");
        if (pagesContainer) {
            pagesContainer.addEventListener("click", function (event) {
                var button = event.target.closest("[data-page]");
                if (!button) return;
                state.page = Number(button.getAttribute("data-page"));
                renderTable();
            });
        }
    }

    function initCustomers() {
        bindEvents();
        loadCustomers();
    }

    document.addEventListener("DOMContentLoaded", function () {
        window.AdminAuth.initAdminPage({
            active: "customers",
            title: "العملاء",
            onReady: initCustomers
        });
    });
})();