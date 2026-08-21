// =============================================================
// Dar Chatt — Account Area Guard
// Loaded on every account/* page. Requires a Supabase session;
// otherwise redirects to ../signin.html with a return URL.
// Fetches the profile and exposes it via onReady(user, profile).
// Also binds the #accountLogout buttons to sign out and return
// to the store homepage.
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;

    var SIGNIN_URL = "../signin.html";
    var HOME_URL = "../index.html";

    async function getSession() {
        if (!supabase) return null;

        try {
            var result = await supabase.auth.getSession();
            return result.error ? null : (result.data && result.data.session) || null;
        } catch (err) {
            return null;
        }
    }

    async function fetchProfile(userId) {
        if (!supabase || !userId) return null;

        try {
            var result = await supabase
                .from("profiles")
                .select("id, full_name, email, phone, role, created_at")
                .eq("id", userId)
                .maybeSingle();

            if (result.error) return null;
            return result.data || null;
        } catch (err) {
            return null;
        }
    }

    function bindLogout() {
        document.querySelectorAll("#accountLogout").forEach(function (button) {
            button.addEventListener("click", async function () {
                if (supabase) {
                    try {
                        await supabase.auth.signOut();
                    } catch (err) {}
                }
                window.location.replace(HOME_URL);
            });
        });
    }

    async function init(options) {
        var opts = options || {};

        var session = await getSession();

        if (!session) {
            var current = window.location.pathname + window.location.search;
            var currentHref = window.location.href;
            var redirect = encodeURIComponent(
                currentHref.indexOf("signin") === -1 ? current : HOME_URL
            );
            window.location.replace(SIGNIN_URL + "?redirect=" + redirect);
            return;
        }

        var profile = await fetchProfile(session.user.id);

        if (!profile) {
            window.location.replace(HOME_URL);
            return;
        }

        bindLogout();

        if (typeof opts.onReady === "function") {
            await opts.onReady(session, profile);
        }
    }

    window.AccountGuard = {
        init: init
    };
})();