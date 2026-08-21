// =============================================================
// Dar Chatt — Account Order Details
// Loads one order by ?id= (RLS scoped to the owner) with its
// items and product names.
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
                month: "long",
                day: "numeric"
            }).format(new Date(value));
        } catch (err) {
            return "—";
        }
    }

    window.AccountGuard.init({
        onReady: function (session) {
            var params = new URLSearchParams(window.location.search);
            var orderId = params.get("id");

            var loading = document.getElementById("orderLoading");
            var card = document.getElementById("orderCard");
            var notFound = document.getElementById("orderNotFound");

            if (!orderId) {
                loading.hidden = true;
                notFound.hidden = false;
                return;
            }

            async function load() {
                loading.hidden = false;
                card.hidden = true;
                notFound.hidden = true;

                var orderResult = await supabase
                    .from("orders")
                    .select("id, order_number, status, name, phone, city, address, subtotal, shipping_fee, total, created_at")
                    .eq("id", orderId)
                    .maybeSingle();

                loading.hidden = true;

                if (orderResult.error || !orderResult.data) {
                    notFound.hidden = false;
                    return;
                }

                var order = orderResult.data;

                var itemsResult = await supabase
                    .from("order_items")
                    .select("id, quantity, price, product_name, products(id, name_ar, name_en)")
                    .eq("order_id", orderId);

                var items = itemsResult.error ? [] : (itemsResult.data || []);

                document.getElementById("orderNumber").textContent = order.order_number || "—";
                document.getElementById("orderStatus").textContent = STATUS_LABELS[order.status] || order.status || "—";
                document.getElementById("orderStatus").className = "track-status-badge track-status-" + (order.status || "");
                document.getElementById("orderDate").textContent = formatDate(order.created_at);
                document.getElementById("orderName").textContent = order.name || "—";
                document.getElementById("orderPhone").textContent = order.phone || "—";
                document.getElementById("orderCity").textContent = order.city || "—";
                document.getElementById("orderAddress").textContent = order.address || "—";

                document.getElementById("orderItems").innerHTML = items
                    .map(function (item) {
                        var name = (item.products && (item.products.name_ar || item.products.name_en)) ||
                            item.product_name ||
                            "منتج";
                        var unitPrice = item.price != null ? Number(item.price) : 0;
                        var qty = Number(item.quantity) || 1;

                        return (
                            '<div class="checkout-summary-item">' +
                            '<div class="checkout-summary-item-info">' +
                            '<span class="checkout-summary-item-name">' + escapeHtml(name) + "</span>" +
                            '<span class="checkout-summary-item-qty">× ' + qty + "</span>" +
                            "</div>" +
                            '<span class="checkout-summary-item-price">' + formatPrice(unitPrice * qty) + "</span>" +
                            "</div>"
                        );
                    })
                    .join("");

                document.getElementById("orderSubtotal").textContent = formatPrice(order.subtotal);
                document.getElementById("orderShipping").textContent = Number(order.shipping_fee) === 0
                    ? "مجاني"
                    : formatPrice(order.shipping_fee);
                document.getElementById("orderTotal").textContent = formatPrice(order.total);

                var label = document.getElementById("orderNumberLabel");
                if (label) label.textContent = order.order_number || "";

                card.hidden = false;
            }

            load();
        }
    });
})();