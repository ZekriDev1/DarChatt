// =============================================================
// Dar Chatt — Account Dashboard
// Greeting + profile summary + the 3 most recent orders.
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

    function initials(name, email) {
        var source = (name || email || "").trim();
        var parts = source.split(/\s+/).filter(Boolean);
        if (parts.length === 0) return "؟";
        if (parts.length === 1) return parts[0].charAt(0);
        return parts[0].charAt(0) + parts[1].charAt(0);
    }

    async function loadOrders(userId) {
        var result = await supabase
            .from("orders")
            .select("id, order_number, total, status, created_at")
            .eq("customer_id", userId)
            .order("created_at", { ascending: false })
            .limit(3);

        return result.error ? [] : (result.data || []);
    }

    function renderOrders(orders) {
        var list = document.getElementById("accountOrdersList");
        var empty = document.getElementById("accountOrdersEmpty");
        var loading = document.getElementById("accountOrdersLoading");

        loading.hidden = true;

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

    window.AccountGuard.init({
        onReady: function (session, profile) {
            var name = profile.full_name || profile.email || "";

            var greeting = document.getElementById("accountGreeting");
            if (greeting) greeting.textContent = "مرحباً، " + name;

            var avatar = document.getElementById("accountAvatar");
            if (avatar) avatar.textContent = initials(name, profile.email);

            var profileName = document.getElementById("accountProfileName");
            if (profileName) profileName.textContent = name;

            var profileEmail = document.getElementById("accountProfileEmail");
            if (profileEmail) profileEmail.textContent = profile.email || "—";

            loadOrders(session.user.id).then(renderOrders);
        }
    });
})();