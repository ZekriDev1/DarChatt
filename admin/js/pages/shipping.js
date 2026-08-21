// =============================================================
// Dar Chatt — Admin Shipping Settings
// Reads/writes the 'shipping' settings JSON used by the
// place_order RPC (shipping_fee + free_shipping_threshold).
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;
    var S = window.AdminShared;

    var SETTINGS_KEY = "shipping";

    var state = {
        session: null
    };

    // ---------------------------------------------------------
    // Data loading
    // ---------------------------------------------------------

    async function loadShipping() {
        var result = await supabase
            .from("settings")
            .select("key, value")
            .eq("key", SETTINGS_KEY)
            .maybeSingle();

        if (result.error) {
            S.toast("تعذر تحميل الإعدادات: " + (result.error.message || "خطأ غير معروف"), "error");
            return;
        }

        var value = (result.data && result.data.value) || {};

        var feeInput = document.getElementById("shippingFee");
        var thresholdInput = document.getElementById("freeShippingThreshold");
        var resetButton = document.getElementById("resetShippingButton");

        if (feeInput) feeInput.value = value.shipping_fee != null ? value.shipping_fee : "";
        if (thresholdInput) thresholdInput.value = value.free_shipping_threshold != null ? value.free_shipping_threshold : "";
        if (resetButton) resetButton.hidden = true;
    }

    // ---------------------------------------------------------
    // Saving
    // ---------------------------------------------------------

    async function saveShipping() {
        var feeInput = document.getElementById("shippingFee");
        var thresholdInput = document.getElementById("freeShippingThreshold");
        var saveButton = document.getElementById("saveShippingButton");

        if (!feeInput || !thresholdInput) return;

        var fee = parseFloat(feeInput.value);
        var threshold = parseFloat(thresholdInput.value);

        if (feeInput.value.trim() === "" || isNaN(fee) || fee < 0) {
            S.toast("أدخل رسوم توصيل صحيحة (رقم غير سالب).", "error");
            feeInput.focus();
            return;
        }

        if (thresholdInput.value.trim() !== "" && (isNaN(threshold) || threshold < 0)) {
            S.toast("أدخل حد توصيل مجاني صحيح (رقم غير سالب).", "error");
            thresholdInput.focus();
            return;
        }

        var value = {
            shipping_fee: fee,
            free_shipping_threshold: isNaN(threshold) ? 0 : threshold
        };

        saveButton.disabled = true;
        saveButton.textContent = "جاري الحفظ...";

        var result = await supabase
            .from("settings")
            .upsert({ key: SETTINGS_KEY, value: value }, { onConflict: "key" });

        saveButton.disabled = false;
        saveButton.textContent = "حفظ الإعدادات";

        if (result.error) {
            S.toast("فشل الحفظ: " + (result.error.message || "خطأ غير معروف"), "error");
            return;
        }

        await S.logActivity(state.session, "settings.update", "settings", SETTINGS_KEY, value);

        S.toast("تم حفظ إعدادات الشحن بنجاح", "success");

        var resetButton = document.getElementById("resetShippingButton");
        if (resetButton) resetButton.hidden = false;
    }

    // ---------------------------------------------------------
    // Bootstrap
    // ---------------------------------------------------------

    window.AdminAuth.initAdminPage({
        active: "shipping",
        title: "الشحن والتوصيل",
        onReady: function (user) {
            state.session = { user: user };
            loadShipping();

            var saveButton = document.getElementById("saveShippingButton");
            var resetButton = document.getElementById("resetShippingButton");

            if (saveButton) saveButton.addEventListener("click", saveShipping);
            if (resetButton) resetButton.addEventListener("click", loadShipping);
        }
    });
})();