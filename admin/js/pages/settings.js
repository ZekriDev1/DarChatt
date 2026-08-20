// =============================================================
// Dar Chatt — Site Settings
// Loads settings from the settings table (JSONB values per key),
// saves with upsert. Logo/favicon upload to the 'site' bucket.
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;
    var S = window.AdminShared;

    var session = null;
    var state = {
        logoFile: null,
        faviconFile: null,
        existingLogoUrl: null,
        existingFaviconUrl: null
    };

    var KEYS = ["site", "contact", "shipping", "store", "social"];

    // ---------------------------------------------------------
    // Load
    // ---------------------------------------------------------

    async function loadSettings() {
        var result = await supabase
            .from("settings")
            .select("key, value")
            .in("key", KEYS);

        if (result.error) {
            S.toast("تعذر تحميل الإعدادات: " + (result.error.message || ""), "error");
            return;
        }

        var values = {};
        (result.data || []).forEach(function (row) {
            values[row.key] = row.value || {};
        });

        var site = values.site || {};
        var contact = values.contact || {};
        var shipping = values.shipping || {};
        var store = values.store || {};
        var social = values.social || {};

        document.getElementById("settingStoreName").value = site.store_name || "";
        document.getElementById("settingStoreDescription").value = site.store_description || "";
        document.getElementById("settingPhone").value = contact.phone || "";
        document.getElementById("settingWhatsapp").value = contact.whatsapp || "";
        document.getElementById("settingEmail").value = contact.email || "";
        document.getElementById("settingAddress").value = contact.address || "";
        document.getElementById("settingShippingFee").value = shipping.shipping_fee != null ? shipping.shipping_fee : "";
        document.getElementById("settingFreeShippingThreshold").value =
            shipping.free_shipping_threshold != null ? shipping.free_shipping_threshold : "";
        document.getElementById("settingCities").value = Array.isArray(shipping.cities)
            ? shipping.cities.join("\n")
            : "";
        document.getElementById("settingIsOpen").value = store.is_open === false ? "false" : "true";
        document.getElementById("settingCloseMessage").value = store.close_message || "";
        document.getElementById("settingFacebook").value = social.facebook || "";
        document.getElementById("settingInstagram").value = social.instagram || "";
        document.getElementById("settingTiktok").value = social.tiktok || "";
        document.getElementById("settingMapEmbed").value = social.map_embed_url || "";

        if (site.logo_url) {
            state.existingLogoUrl = site.logo_url;
            showImage("settingLogoPreview", site.logo_url, "settingLogoRemove");
        }
        if (site.favicon_url) {
            state.existingFaviconUrl = site.favicon_url;
            showImage("settingFaviconPreview", site.favicon_url, "settingFaviconRemove");
        }
    }

    function showImage(previewId, src, removeId) {
        var preview = document.getElementById(previewId);
        var remove = document.getElementById(removeId);
        if (preview) {
            preview.src = src;
            preview.hidden = false;
        }
        if (remove) remove.hidden = false;
    }

    // ---------------------------------------------------------
    // Upload helpers
    // ---------------------------------------------------------

    async function uploadSettingImage(file, folder, label) {
        if (!file) return null;
        try {
            S.toast("جاري رفع " + label + "...");
            return await S.uploadImage(file, "site", folder);
        } catch (err) {
            S.toast(err.message || "فشل رفع " + label, "error");
            throw err;
        }
    }

    // ---------------------------------------------------------
    // Save
    // ---------------------------------------------------------

    async function saveSettings(event) {
        event.preventDefault();

        var submitButton = document.getElementById("settingsSubmitButton");
        var submitLabel = document.getElementById("settingsSubmitLabel");
        if (submitButton) submitButton.disabled = true;
        if (submitLabel) submitLabel.textContent = "جاري الحفظ...";

        try {
            // Upload logo / favicon first (only delete old after success).
            var newLogoUrl = null;
            var newFaviconUrl = null;

            if (state.logoFile) {
                newLogoUrl = await uploadSettingImage(state.logoFile, "logo", "الشعار");
                if (state.existingLogoUrl && state.existingLogoUrl !== newLogoUrl) {
                    S.deleteStoredFile(state.existingLogoUrl);
                }
                state.existingLogoUrl = newLogoUrl;
            }

            if (state.faviconFile) {
                newFaviconUrl = await uploadSettingImage(state.faviconFile, "favicon", "الأيقونة");
                if (state.existingFaviconUrl && state.existingFaviconUrl !== newFaviconUrl) {
                    S.deleteStoredFile(state.existingFaviconUrl);
                }
                state.existingFaviconUrl = newFaviconUrl;
            }

            var cities = document.getElementById("settingCities").value
                .split("\n")
                .map(function (line) { return line.trim(); })
                .filter(Boolean);

            var rows = [
                {
                    key: "site",
                    value: {
                        store_name: document.getElementById("settingStoreName").value.trim(),
                        store_description: document.getElementById("settingStoreDescription").value.trim(),
                        logo_url: state.existingLogoUrl || null,
                        favicon_url: state.existingFaviconUrl || null
                    }
                },
                {
                    key: "contact",
                    value: {
                        phone: document.getElementById("settingPhone").value.trim(),
                        whatsapp: document.getElementById("settingWhatsapp").value.trim(),
                        email: document.getElementById("settingEmail").value.trim(),
                        address: document.getElementById("settingAddress").value.trim()
                    }
                },
                {
                    key: "shipping",
                    value: {
                        shipping_fee: document.getElementById("settingShippingFee").value === ""
                            ? null
                            : Number(document.getElementById("settingShippingFee").value),
                        free_shipping_threshold: document.getElementById("settingFreeShippingThreshold").value === ""
                            ? null
                            : Number(document.getElementById("settingFreeShippingThreshold").value),
                        cities: cities
                    }
                },
                {
                    key: "store",
                    value: {
                        is_open: document.getElementById("settingIsOpen").value === "true",
                        close_message: document.getElementById("settingCloseMessage").value.trim(),
                        currency: "MAD"
                    }
                },
                {
                    key: "social",
                    value: {
                        facebook: document.getElementById("settingFacebook").value.trim(),
                        instagram: document.getElementById("settingInstagram").value.trim(),
                        tiktok: document.getElementById("settingTiktok").value.trim(),
                        map_embed_url: document.getElementById("settingMapEmbed").value.trim()
                    }
                }
            ];

            var result = await supabase.from("settings").upsert(rows, { onConflict: "key" });

            if (result.error) {
                S.toast("تعذر حفظ الإعدادات: " + (result.error.message || ""), "error");
                if (submitButton) submitButton.disabled = false;
                if (submitLabel) submitLabel.textContent = "حفظ الإعدادات";
                return;
            }

            S.logActivity(session, "settings.update", "settings", "site", null);
            S.toast("تم حفظ الإعدادات بنجاح", "success");
        } catch (err) {
            // uploadSettingImage already toasts the specific error.
            S.toast(err.message || "حدث خطأ أثناء حفظ الإعدادات.", "error");
        } finally {
            if (submitButton) submitButton.disabled = false;
            if (submitLabel) submitLabel.textContent = "حفظ الإعدادات";
        }
    }

    // ---------------------------------------------------------
    // Init
    // ---------------------------------------------------------

    function initSettings() {
        var form = document.getElementById("settingsForm");
        if (form) form.addEventListener("submit", saveSettings);

        var logoInput = document.getElementById("settingLogoInput");
        if (logoInput) {
            logoInput.addEventListener("change", function () {
                var file = logoInput.files && logoInput.files[0];
                if (!file) return;
                state.logoFile = file;
                try {
                    var reader = new FileReader();
                    reader.onload = function () {
                        showImage("settingLogoPreview", reader.result, "settingLogoRemove");
                    };
                    reader.readAsDataURL(file);
                } catch (err) {}
            });
        }

        var faviconInput = document.getElementById("settingFaviconInput");
        if (faviconInput) {
            faviconInput.addEventListener("change", function () {
                var file = faviconInput.files && faviconInput.files[0];
                if (!file) return;
                state.faviconFile = file;
                try {
                    var reader = new FileReader();
                    reader.onload = function () {
                        showImage("settingFaviconPreview", reader.result, "settingFaviconRemove");
                    };
                    reader.readAsDataURL(file);
                } catch (err) {}
            });
        }

        var logoRemove = document.getElementById("settingLogoRemove");
        if (logoRemove) {
            logoRemove.addEventListener("click", function () {
                state.logoFile = null;
                state.existingLogoUrl = null;
                if (logoInput) logoInput.value = "";
                var preview = document.getElementById("settingLogoPreview");
                if (preview) {
                    preview.hidden = true;
                    preview.removeAttribute("src");
                }
                logoRemove.hidden = true;
            });
        }

        var faviconRemove = document.getElementById("settingFaviconRemove");
        if (faviconRemove) {
            faviconRemove.addEventListener("click", function () {
                state.faviconFile = null;
                state.existingFaviconUrl = null;
                if (faviconInput) faviconInput.value = "";
                var preview = document.getElementById("settingFaviconPreview");
                if (preview) {
                    preview.hidden = true;
                    preview.removeAttribute("src");
                }
                faviconRemove.hidden = true;
            });
        }

        loadSettings();
    }

    document.addEventListener("DOMContentLoaded", function () {
        window.AdminAuth.initAdminPage({
            active: "settings",
            title: "إعدادات الموقع",
            onReady: function (user) {
                session = { user: user };
                initSettings();
            }
        });
    });
})();