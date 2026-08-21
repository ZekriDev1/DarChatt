// =============================================================
// Dar Chatt — Account Orders List
// Loads all orders of the current user (RLS scoped) and
// renders them as rows linking to order.html?id=...
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;

    var STATUS_LABELS = {
        new: "جديد",
        confirmed: "تم التأكيد",
        processing: "قيد التجهيز",
        ready_to_ship: "جاهز للشحن",
        shipped: "تم الشحن",
        completed: "مكتمل",
        cancelled: "ملغي"
    };

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function formatPrice(value) {
        var number = Number(value) || 0;
        return number.toLocaleString("en-US") + " DH";
    }

    function formatDate(value) {
        if (!value) return "—";
        try {
            return new Intl.DateTimeFormat("ar-MA", {
                year: "numeric",
                month: "short",
                day: "numeric"
            }).format(new Date(value));
        } catch (err) {
            return "—";
        }
    }

    window.AccountGuard.init({
        onReady: function (session) {
            var loading = document.getElementById("ordersLoading");
            var list = document.getElementById("ordersList");
            var empty = document.getElementById("ordersEmpty");
            var error = document.getElementById("ordersError");

            async function load() {
                loading.hidden = false;
                list.hidden = true;
                empty.hidden = true;
                error.hidden = true;

                var result = await supabase
                    .from("orders")
                    .select("id, order_number, total, status, created_at")
                    .eq("customer_id", session.user.id)
                    .order("created_at", { ascending: false });

                loading.hidden = true;

                if (result.error) {
                    error.hidden = false;
                    return;
                }

                var orders = result.data || [];

                if (orders.length === 0) {
                    empty.hidden = false;
                    return;
                }

                list.hidden = false;
                list.innerHTML = orders
                    .map(function (order) {
                        return (
                            '<a class="account-order-row" href="order.html?id=' + encodeURIComponent(order.id) + '">' +
                            '<div class="account-order-row-main">' +
                            '<span class="account-order-number">' + escapeHtml(order.order_number) + "</span>" +
                            '<span class="account-order-date">' + formatDate(order.created_at) + "</span>" +
                            "</div>" +
                            '<div class="account-order-row-side">' +
                            '<span class="track-status-badge track-status-' + escapeHtml(order.status) + '">' +
                            (STATUS_LABELS[order.status] || order.status) +
                            "</span>" +
                            '<span class="account-order-total">' + formatPrice(order.total) + "</span>" +
                            "</div>" +
                            "</a>"
                        );
                    })
                    .join("");
            }

            load();
        }
    });
})();