// =============================================================
// Dar Chatt — Admin Dashboard
// All statistics come from real Supabase queries. When a query
// fails or returns no data, the number shown is 0 (never fake).
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;
    var S = window.AdminShared;

    var ICONS = {
        products:
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8L12 3L3 8V16L12 21L21 16V8Z"/><path d="M3 8L12 13L21 8"/><path d="M12 13V21"/></svg>',
        categories:
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7C3 5.9 3.9 5 5 5H9L11 7H19C20.1 7 21 7.9 21 9V17C21 18.1 20.1 19 19 19H5C3.9 19 3 18.1 3 17V7Z"/></svg>',
        orders:
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4H5L7.2 15.5H18.5L21 7H7"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>',
        customers:
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20C2.5 16.5 5.4 14 9 14C12.6 14 15.5 16.5 15.5 20"/><path d="M16 5.2C17.2 5.7 18 6.9 18 8.2C18 9.5 17.2 10.7 16 11.2"/><path d="M18.5 14.3C20.1 15.2 21 16.9 21 18.7V20"/></svg>',
        sales:
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3V21H21"/><path d="M7 15L11 11L14 14L20 7"/><path d="M16 7H20V11"/></svg>',
        box:
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8L12 3L3 8V16L12 21L21 16V8Z"/><path d="M3 8L12 13L21 8"/><path d="M12 13V21"/></svg>'
    };

    function injectIcon(id, svg) {
        var el = document.getElementById(id);
        if (el) el.innerHTML = svg;
    }

    // ---------------------------------------------------------
    // Counting helpers
    // ---------------------------------------------------------

    async function countRows(table, filters) {
        try {
            var query = supabase.from(table).select("id", { count: "exact", head: true });
            if (filters) {
                (filters.eq || []).forEach(function (f) {
                    query = query.eq(f[0], f[1]);
                });
                (filters.in || []).forEach(function (f) {
                    query = query.in(f[0], f[1]);
                });
            }
            var result = await query;
            if (result.error) return 0;
            return result.count || 0;
        } catch (err) {
            return 0;
        }
    }

    // Sum of orders.total for the revenue statuses (delivered/completed).
    async function loadSalesTotal() {
        try {
            var result = await supabase
                .from("orders")
                .select("total")
                .in("status", S.REVENUE_STATUSES);
            if (result.error) return 0;

            var total = 0;
            (result.data || []).forEach(function (row) {
                var value = Number(row.total);
                if (isFinite(value)) total += value;
            });
            return total;
        } catch (err) {
            return 0;
        }
    }

    function setValue(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    // ---------------------------------------------------------
    // Stats
    // ---------------------------------------------------------

    async function loadStats() {
        var refreshButton = document.getElementById("refreshStatsButton");
        if (refreshButton) {
            refreshButton.disabled = true;
            refreshButton.textContent = "جاري التحديث...";
        }

        var products = await countRows("products");
        var productsActive = await countRows("products", { eq: [["is_active", true]] });
        var categories = await countRows("categories");
        var orders = await countRows("orders");
        var ordersNew = await countRows("orders", { eq: [["status", "new"]] });
        var ordersProcessing = await countRows("orders", { eq: [["status", "processing"]] });
        var ordersCompleted = await countRows("orders", { eq: [["status", "completed"]] });
        var customers = await countRows("profiles", { eq: [["role", "customer"]] });
        var sales = await loadSalesTotal();

        setValue("products-value", S.formatNumber(products));
        setValue("products-active-value", S.formatNumber(productsActive));
        setValue("categories-value", S.formatNumber(categories));
        setValue("orders-value", S.formatNumber(orders));
        setValue("orders-new-value", S.formatNumber(ordersNew));
        setValue("orders-processing-value", S.formatNumber(ordersProcessing));
        setValue("orders-completed-value", S.formatNumber(ordersCompleted));
        setValue("customers-value", S.formatNumber(customers));
        setValue("sales-value", S.formatMoney(sales));

        if (refreshButton) {
            refreshButton.disabled = false;
            refreshButton.textContent = "تحديث الإحصائيات";
        }
    }

    // ---------------------------------------------------------
    // Recent lists
    // ---------------------------------------------------------

    async function loadRecentOrders() {
        var container = document.getElementById("recentOrders");
        if (!container) return;

        var result = await supabase
            .from("orders")
            .select("id, order_number, customer_name, total, status, created_at")
            .order("created_at", { ascending: false })
            .limit(5);

        if (result.error || !result.data || result.data.length === 0) {
            container.innerHTML = '<p class="cell-muted" style="padding:16px 22px">لا توجد طلبات بعد.</p>';
            return;
        }

        container.innerHTML = result.data.map(function (order) {
            var status = S.ORDER_STATUSES[order.status] || { label: order.status, css: "" };
            return (
                '<a class="recent-item" href="/admin/order-view.html?id=' + encodeURIComponent(order.id) + '">' +
                '<span class="recent-avatar">' + ICONS.orders + "</span>" +
                '<span class="recent-body">' +
                '<span class="recent-title">' + S.escapeHtml(order.order_number) + " — " + S.escapeHtml(order.customer_name) + "</span>" +
                '<span class="recent-sub"><span class="order-badge ' + status.css + '">' + status.label + "</span></span>" +
                "</span>" +
                '<span class="recent-meta">' +
                '<span class="recent-price">' + S.formatMoney(order.total) + "</span>" +
                '<span class="recent-date">' + S.formatDate(order.created_at) + "</span>" +
                "</span>" +
                "</a>"
            );
        }).join("");
    }

    async function loadRecentProducts() {
        var container = document.getElementById("recentProducts");
        if (!container) return;

        var result = await supabase
            .from("products")
            .select("id, name_ar, name_en, image_url, price, created_at")
            .order("created_at", { ascending: false })
            .limit(5);

        if (result.error || !result.data || result.data.length === 0) {
            container.innerHTML = '<p class="cell-muted" style="padding:16px 22px">لا توجد منتجات بعد.</p>';
            return;
        }

        container.innerHTML = result.data.map(function (product) {
            var thumb = product.image_url
                ? '<img class="recent-avatar" src="' + S.escapeHtml(product.image_url) + '" alt="">'
                : '<span class="recent-avatar">' + ICONS.box + "</span>";

            return (
                '<a class="recent-item" href="/admin/product-view.html?id=' + encodeURIComponent(product.id) + '">' +
                thumb +
                '<span class="recent-body">' +
                '<span class="recent-title">' + S.escapeHtml(product.name_ar) + "</span>" +
                '<span class="recent-sub">' + S.escapeHtml(product.name_en || "") + "</span>" +
                "</span>" +
                '<span class="recent-meta">' +
                '<span class="recent-price">' + S.formatMoney(product.price) + "</span>" +
                '<span class="recent-date">' + S.formatDate(product.created_at) + "</span>" +
                "</span>" +
                "</a>"
            );
        }).join("");
    }

    async function loadBestSellers() {
        var container = document.getElementById("bestSellers");
        if (!container) return;

        var result = await supabase
            .from("order_items")
            .select("product_id, product_name, product_image, quantity")
            .not("product_id", "is", null);

        if (result.error || !result.data || result.data.length === 0) {
            container.innerHTML = '<p class="cell-muted" style="padding:16px 22px">لا توجد مبيعات بعد.</p>';
            return;
        }

        // Group by product and sum quantities.
        var map = {};
        result.data.forEach(function (item) {
            var key = item.product_id;
            if (!map[key]) {
                map[key] = {
                    id: item.product_id,
                    name: item.product_name,
                    image: item.product_image,
                    quantity: 0
                };
            }
            map[key].quantity += Number(item.quantity) || 0;
        });

        var sorted = Object.keys(map)
            .map(function (key) { return map[key]; })
            .sort(function (a, b) { return b.quantity - a.quantity; })
            .slice(0, 5);

        container.innerHTML = sorted.map(function (item) {
            var thumb = item.image
                ? '<img class="recent-avatar" src="' + S.escapeHtml(item.image) + '" alt="">'
                : '<span class="recent-avatar">' + ICONS.box + "</span>";

            return (
                '<div class="recent-item">' +
                thumb +
                '<span class="recent-body">' +
                '<span class="recent-title">' + S.escapeHtml(item.name) + "</span>" +
                '<span class="recent-sub">' + "كمية مباعة" + "</span>" +
                "</span>" +
                '<span class="recent-meta">' +
                '<span class="recent-price">' + S.formatNumber(item.quantity) + "</span>" +
                '<span class="recent-date">' + "قطعة" + "</span>" +
                "</span>" +
                "</div>"
            );
        }).join("");
    }

    // ---------------------------------------------------------
    // Init
    // ---------------------------------------------------------

    function initDashboard() {
        injectIcon("products-icon", ICONS.products);
        injectIcon("products-active-icon", ICONS.products);
        injectIcon("categories-icon", ICONS.categories);
        injectIcon("orders-icon", ICONS.orders);
        injectIcon("orders-new-icon", ICONS.orders);
        injectIcon("orders-processing-icon", ICONS.orders);
        injectIcon("orders-completed-icon", ICONS.orders);
        injectIcon("customers-icon", ICONS.customers);
        injectIcon("sales-icon", ICONS.sales);
        injectIcon("qa-product-icon", ICONS.box);
        injectIcon("qa-category-icon", ICONS.categories);
        injectIcon("qa-orders-icon", ICONS.orders);
        injectIcon("qa-customers-icon", ICONS.customers);

        var refreshButton = document.getElementById("refreshStatsButton");
        if (refreshButton) {
            refreshButton.addEventListener("click", function () {
                loadStats();
                loadRecentOrders();
                loadRecentProducts();
                loadBestSellers();
            });
        }

        loadStats();
        loadRecentOrders();
        loadRecentProducts();
        loadBestSellers();
    }

    document.addEventListener("DOMContentLoaded", function () {
        window.AdminAuth.initAdminPage({
            active: "dashboard",
            title: "لوحة التحكم",
            onReady: initDashboard
        });
    });
})();