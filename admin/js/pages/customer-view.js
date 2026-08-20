// =============================================================
// Dar Chatt — Customer Details (admin)
// Info, stats, and full order history (never exposes passwords
// or auth internals — profiles only carry name/email/phone).
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;
    var S = window.AdminShared;

    var customerId = S.getParam("id");

    function setText(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    async function loadCustomer() {
        var result = await supabase
            .from("profiles")
            .select("id, email, full_name, phone, created_at")
            .eq("id", customerId)
            .maybeSingle();

        if (result.error || !result.data) {
            S.toast("تعذر تحميل العميل: " + ((result.error && result.error.message) || "غير موجود"), "error");
            setText("customerViewName", "العميل غير موجود");
            return null;
        }

        return result.data;
    }

    async function loadOrders() {
        var result = await supabase
            .from("orders")
            .select("id, order_number, total, status, created_at")
            .eq("customer_id", customerId)
            .order("created_at", { ascending: false });

        return result.error ? [] : (result.data || []);
    }

    function renderCustomer(customer, orders) {
        setText("customerViewName", customer.full_name || "—");
        setText("customerViewEmail", customer.email || "—");
        setText("customerViewPhone", customer.phone || "—");
        setText("customerViewCreated", S.formatDateTime(customer.created_at));
        setText("customerViewStatus", "نشط");

        // Stats (purchases exclude cancelled orders).
        var count = orders.length;
        var spent = 0;
        var lastOrderAt = null;

        orders.forEach(function (order) {
            if (order.status !== "cancelled") {
                spent += Number(order.total) || 0;
            }
            var time = new Date(order.created_at).getTime();
            if (!lastOrderAt || time > lastOrderAt) {
                lastOrderAt = time;
            }
        });

        setText("customerViewOrdersCount", S.formatNumber(count));
        setText("customerViewTotalSpent", S.formatMoney(spent));
        setText("customerViewAverage", count > 0 ? S.formatMoney(spent / count) : "—");
        setText("customerViewLastOrder", lastOrderAt ? S.formatDate(new Date(lastOrderAt)) : "—");

        // Order history
        var body = document.getElementById("customerOrdersBody");
        var emptyBox = document.getElementById("customerOrdersEmpty");

        if (body && emptyBox) {
            if (orders.length === 0) {
                body.innerHTML = "";
                emptyBox.hidden = false;
                return;
            }

            emptyBox.hidden = true;
            body.innerHTML = orders.map(function (order) {
                var status = S.ORDER_STATUSES[order.status] || { label: order.status, css: "" };
                return (
                    "<tr>" +
                    '<td class="cell-slug" dir="ltr" style="font-weight:700">' + S.escapeHtml(order.order_number) + "</td>" +
                    '<td class="cell-muted">' + S.formatDateTime(order.created_at) + "</td>" +
                    '<td style="font-weight:700">' + S.formatMoney(order.total) + "</td>" +
                    '<td><span class="order-badge ' + status.css + '">' + status.label + "</span></td>" +
                    '<td><a class="table-action" href="/admin/order-view.html?id=' + encodeURIComponent(order.id) + '">عرض</a></td>' +
                    "</tr>"
                );
            }).join("");
        }
    }

    function initCustomerView() {
        if (!customerId) {
            S.toast("معرّف العميل غير موجود.", "error");
            return;
        }

        loadCustomer().then(function (customer) {
            if (!customer) return;
            loadOrders().then(function (orders) {
                renderCustomer(customer, orders);
            });
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        window.AdminAuth.initAdminPage({
            active: "customers",
            title: "تفاصيل العميل",
            onReady: initCustomerView
        });
    });
})();