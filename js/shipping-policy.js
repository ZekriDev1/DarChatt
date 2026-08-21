// =============================================================
// Dar Chatt — Shipping Policy Page
// Fills the shipping fee / free threshold from the live
// 'shipping' settings row (the same values used by orders).
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;

    function formatPrice(value) {
        var number = Number(value) || 0;
        return number.toLocaleString("en-US") + " DH";
    }

    async function init() {
        if (!supabase) return;

        var result = await supabase
            .from("settings")
            .select("value")
            .eq("key", "shipping")
            .maybeSingle();

        if (result.error || !result.data) return;

        var shipping = result.data.value || {};

        var fee = Number(shipping.shipping_fee) || 0;
        var threshold = Number(shipping.free_shipping_threshold) || 0;

        var feeEl = document.getElementById("shippingFeeValue");
        if (feeEl) feeEl.textContent = formatPrice(fee);

        var thresholdEl = document.getElementById("freeShippingValue");
        if (thresholdEl) {
            thresholdEl.textContent = threshold > 0 ? formatPrice(threshold) : "غير مفعل";
        }

        var noteEl = document.getElementById("shippingNote");
        if (noteEl && threshold > 0) {
            noteEl.textContent =
                "يتم احتساب رسوم التوصيل تلقائياً عند إتمام الطلب — والتوصيل مجاني عندما يصل إجمالي طلبك إلى " +
                formatPrice(threshold) + " أو أكثر.";
        }
    }

    document.addEventListener("DOMContentLoaded", init);
})();