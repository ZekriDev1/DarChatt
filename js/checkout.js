// =============================================================
// Dar Chatt — Checkout Page
// Requires authentication. Builds the order summary from the
// localStorage cart, reads the shipping settings, then places
// the order through the secure public.place_order() RPC (COD).
// On success the cart is cleared and the user is redirected to
// order-confirmation.html?id=...
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;

    var CART_KEY = "darchatt_cart";

    var state = {
        shippingFee: 0,
        freeShippingThreshold: 0,
        session: null
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

    function readCart() {
        try {
            var raw = localStorage.getItem(CART_KEY);
            var items = raw ? JSON.parse(raw) : [];
            return Array.isArray(items) ? items : [];
        } catch (err) {
            return [];
        }
    }

    function clearCart() {
        try {
            localStorage.removeItem(CART_KEY);
        } catch (err) {}
    }

    function cartSubtotal() {
        return readCart().reduce(function (sum, item) {
            return sum + (Number(item.price) || 0) * (Number(item.qty) || 0);
        }, 0);
    }

    function shippingFor(subtotal) {
        if (state.freeShippingThreshold > 0 && subtotal >= state.freeShippingThreshold) {
            return 0;
        }
        return state.shippingFee;
    }

    function cacheElements() {
        elements.loading = document.getElementById("checkoutLoading");
        elements.authRequired = document.getElementById("checkoutAuthRequired");
        elements.empty = document.getElementById("checkoutEmpty");
        elements.layout = document.getElementById("checkoutLayout");
        elements.form = document.getElementById("checkoutForm");
        elements.summaryItems = document.getElementById("checkoutSummaryItems");
        elements.subtotal = document.getElementById("checkoutSubtotal");
        elements.shipping = document.getElementById("checkoutShipping");
        elements.total = document.getElementById("checkoutTotal");
        elements.error = document.getElementById("checkoutError");
        elements.submitButton = document.getElementById("checkoutSubmitButton");
        elements.submitLabel = document.getElementById("checkoutSubmitLabel");
    }

    // ---------------------------------------------------------
    // Render summary
    // ---------------------------------------------------------

    function renderSummary() {
        var items = readCart();
        var subtotal = cartSubtotal();
        var shipping = shippingFor(subtotal);

        elements.summaryItems.innerHTML = items
            .map(function (item) {
                return (
                    '<div class="checkout-summary-item">' +
                    '<div class="checkout-summary-item-info">' +
                    '<span class="checkout-summary-item-name">' + escapeHtml(item.name) + "</span>" +
                    '<span class="checkout-summary-item-qty">× ' + (Number(item.qty) || 1) + "</span>" +
                    "</div>" +
                    '<span class="checkout-summary-item-price">' + formatPrice((Number(item.price) || 0) * (Number(item.qty) || 1)) + "</span>" +
                    "</div>"
                );
            })
            .join("");

        elements.subtotal.textContent = formatPrice(subtotal);
        elements.shipping.textContent = shipping === 0 ? "مجاني" : formatPrice(shipping);
        elements.total.textContent = formatPrice(subtotal + shipping);
    }

    // ---------------------------------------------------------
    // States
    // ---------------------------------------------------------

    function showLoading() {
        elements.loading.hidden = false;
        elements.authRequired.hidden = true;
        elements.empty.hidden = true;
        elements.layout.hidden = true;
    }

    function showAuthRequired() {
        elements.loading.hidden = true;
        elements.authRequired.hidden = false;
        elements.empty.hidden = true;
        elements.layout.hidden = true;
    }

    function showEmpty() {
        elements.loading.hidden = true;
        elements.authRequired.hidden = true;
        elements.empty.hidden = false;
        elements.layout.hidden = true;
    }

    function showLayout() {
        elements.loading.hidden = true;
        elements.authRequired.hidden = true;
        elements.empty.hidden = true;
        elements.layout.hidden = false;
    }

    // ---------------------------------------------------------
    // Submit
    // ---------------------------------------------------------

    function showError(message) {
        elements.error.textContent = message;
        elements.error.hidden = false;
    }

    async function submitOrder(event) {
        event.preventDefault();

        var name = document.getElementById("checkoutName").value.trim();
        var phone = document.getElementById("checkoutPhone").value.trim();
        var city = document.getElementById("checkoutCity").value.trim();
        var address = document.getElementById("checkoutAddress").value.trim();
        var notes = document.getElementById("checkoutNotes").value.trim();

        if (!name) return showError("يرجى إدخال الاسم الكامل.");
        if (!phone) return showError("يرجى إدخال رقم الهاتف.");
        if (!city) return showError("يرجى إدخال المدينة.");
        if (!address) return showError("يرجى إدخال العنوان الكامل.");

        var items = readCart();
        if (items.length === 0) {
            showEmpty();
            return;
        }

        var payload = items.map(function (item) {
            return {
                product_id: item.id,
                quantity: Number(item.qty) || 1
            };
        });

        elements.submitButton.disabled = true;
        elements.submitLabel.textContent = "جاري إرسال الطلب...";
        elements.error.hidden = true;

        var result = await supabase.rpc("place_order", {
            p_items: payload,
            p_customer_name: name,
            p_customer_phone: phone,
            p_customer_email: state.session ? state.session.user.email : "",
            p_city: city,
            p_address: address,
            p_notes: notes
        });

        elements.submitButton.disabled = false;
        elements.submitLabel.textContent = "تأكيد الطلب — الدفع عند الاستلام";

        if (result.error) {
            showError(result.error.message || "تعذر إرسال الطلب. حاول مرة أخرى.");
            return;
        }

        clearCart();
        if (window.DarChattCart) window.DarChattCart.updateBadge();

        window.location.href = "order-confirmation.html?id=" + encodeURIComponent(result.data.id);
    }

    // ---------------------------------------------------------
    // Init
    // ---------------------------------------------------------

    async function loadShippingSettings() {
        var result = await supabase
            .from("settings")
            .select("value")
            .eq("key", "shipping")
            .maybeSingle();

        if (result.error || !result.data) return;

        var value = result.data.value || {};
        state.shippingFee = Number(value.shipping_fee) || 0;
        state.freeShippingThreshold = Number(value.free_shipping_threshold) || 0;
    }

    async function init() {
        cacheElements();

        if (!supabase || !elements.layout) {
            showEmpty();
            return;
        }

        showLoading();

        var sessionResult = await supabase.auth.getSession();
        var session = sessionResult.error
            ? null
            : (sessionResult.data && sessionResult.data.session) || null;

        if (!session) {
            showAuthRequired();
            return;
        }

        state.session = session;

        var items = readCart();
        if (items.length === 0) {
            showEmpty();
            return;
        }

        await loadShippingSettings();

        var nameInput = document.getElementById("checkoutName");
        if (nameInput) {
            var profileResult = await supabase
                .from("profiles")
                .select("full_name, phone")
                .eq("id", session.user.id)
                .maybeSingle();
            if (!profileResult.error && profileResult.data) {
                if (profileResult.data.full_name) nameInput.value = profileResult.data.full_name;
                var phoneInput = document.getElementById("checkoutPhone");
                if (phoneInput && profileResult.data.phone) phoneInput.value = profileResult.data.phone;
            }
        }

        showLayout();
        renderSummary();
        elements.form.addEventListener("submit", submitOrder);
    }

    document.addEventListener("DOMContentLoaded", init);
})();