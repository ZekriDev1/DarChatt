// =============================================================
// Dar Chatt — Order Confirmation Page
// Reads ?id= and loads the order through RLS (only the owner
// can see it), including its items with product details.
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

    var elements = {};

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

    function cacheElements() {
        elements.loading = document.getElementById("confirmationLoading");
        elements.error = document.getElementById("confirmationError");
        elements.card = document.getElementById("confirmationCard");
        elements.orderNumber = document.getElementById("confirmationOrderNumber");
        elements.status = document.getElementById("confirmationStatus");
        elements.name = document.getElementById("confirmationName");
        elements.phone = document.getElementById("confirmationPhone");
        elements.city = document.getElementById("confirmationCity");
        elements.address = document.getElementById("confirmationAddress");
        elements.items = document.getElementById("confirmationItems");
        elements.subtotal = document.getElementById("confirmationSubtotal");
        elements.shipping = document.getElementById("confirmationShipping");
        elements.total = document.getElementById("confirmationTotal");
    }

    function showLoading() {
        elements.loading.hidden = false;
        elements.error.hidden = true;
        elements.card.hidden = true;
    }

    function showError() {
        elements.loading.hidden = true;
        elements.error.hidden = false;
        elements.card.hidden = true;
    }

    function showContent() {
        elements.loading.hidden = true;
        elements.error.hidden = true;
        elements.card.hidden = false;
    }

    function render(order, items) {
        elements.orderNumber.textContent = order.order_number || "—";
        elements.status.textContent = STATUS_LABELS[order.status] || order.status || "—";
        elements.name.textContent = order.name || "—";
        elements.phone.textContent = order.phone || "—";
        elements.city.textContent = order.city || "—";
        elements.address.textContent = order.address || "—";

        elements.items.innerHTML = items
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

        elements.subtotal.textContent = formatPrice(order.subtotal);
        elements.shipping.textContent = Number(order.shipping_fee) === 0
            ? "مجاني"
            : formatPrice(order.shipping_fee);
        elements.total.textContent = formatPrice(order.total);
    }

    async function init() {
        cacheElements();

        if (!supabase || !elements.card) {
            showError();
            return;
        }

        var params = new URLSearchParams(window.location.search);
        var orderId = params.get("id");

        if (!orderId) {
            showError();
            return;
        }

        showLoading();

        var result = await supabase
            .from("orders")
            .select("id, order_number, status, name, phone, city, address, subtotal, shipping_fee, total, created_at")
            .eq("id", orderId)
            .maybeSingle();

        if (result.error || !result.data) {
            showError();
            return;
        }

        var itemsResult = await supabase
            .from("order_items")
            .select("id, quantity, price, product_name, products(id, name_ar, name_en)")
            .eq("order_id", orderId);

        if (itemsResult.error) {
            showError();
            return;
        }

        showContent();
        render(result.data, itemsResult.data || []);
    }

    document.addEventListener("DOMContentLoaded", init);
})();