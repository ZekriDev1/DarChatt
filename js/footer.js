// =============================================================
// Dar Chatt — Footer
// Loads the 'social' settings (instagram, map_embed_url) from
// Supabase and fills the footer. Elements stay hidden until a
// value exists.
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;

    var DEFAULT_SOCIAL = {
        instagram: "https://www.instagram.com/dar_chatt/",
        facebook: "https://www.facebook.com/p/Dar-chatt-61572833205743/"
    };

    function applySocial(social) {
        var instagram = document.getElementById("footerInstagram");
        var facebook = document.getElementById("footerFacebook");
        var map = document.getElementById("footerMap");

        var defaultMapUrl = "https://maps.google.com/maps?q=35.7645736,-5.8241181&z=16&output=embed&hl=ar";

        if (instagram) {
            instagram.href = social.instagram || DEFAULT_SOCIAL.instagram;
            instagram.hidden = false;
        }
        if (facebook) {
            facebook.href = social.facebook || DEFAULT_SOCIAL.facebook;
            facebook.hidden = false;
        }
        if (map) {
            map.src = social.map_embed_url || defaultMapUrl;
            map.hidden = false;
        }
    }

    function fillFooter() {
        var hasFooter = document.getElementById("footerInstagram") ||
            document.getElementById("footerFacebook") ||
            document.getElementById("footerMap");
        if (!hasFooter) return;

        if (!supabase) {
            applySocial({});
            return;
        }

        supabase
            .from("settings")
            .select("value")
            .eq("key", "social")
            .maybeSingle()
            .then(function (result) {
                if (result.error) {
                    console.error("footer.js:", result.error);
                    applySocial({});
                    return;
                }
                applySocial((result.data && result.data.value) || {});
            });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", fillFooter);
    } else {
        fillFooter();
    }
})();