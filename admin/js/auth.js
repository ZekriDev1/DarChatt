// =============================================================
// Dar Chatt — Admin Authentication & Authorization
//
// SECURITY MODEL:
//   Visitor (no session)        -> redirect to /admin/login.html
//   Customer (role != 'admin')  -> DENY (unauthorized page)
//   Admin    (role === 'admin') -> access granted
//
//   If role verification fails for ANY reason (missing profile,
//   network error, RLS error) access is DENIED by default.
//   We never "assume" a user is an admin.
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;

    var LOGIN_URL = "/admin/login.html";
    var DASHBOARD_URL = "/admin/index.html";
    var UNAUTHORIZED_URL = "/admin/unauthorized.html";

    // ---------------------------------------------------------
    // Session
    // ---------------------------------------------------------

    async function getSession() {
        if (!supabase) return null;

        try {
            var result = await supabase.auth.getSession();
            return result.error ? null : (result.data && result.data.session) || null;
        } catch (err) {
            return null;
        }
    }

    // ---------------------------------------------------------
    // Role verification — fetched from the database every time.
    // A missing profile or a failed query => null => DENY.
    // ---------------------------------------------------------

    async function fetchRole(userId) {
        if (!supabase || !userId) return null;

        try {
            var result = await supabase
                .from("profiles")
                .select("role")
                .eq("id", userId)
                .maybeSingle();

            if (result.error) return null;

            var profile = result.data;
            return profile && typeof profile.role === "string"
                ? profile.role
                : null;
        } catch (err) {
            return null;
        }
    }

    // ---------------------------------------------------------
    // Guard — used by EVERY admin page before rendering.
    // Returns:
    //   { status: "login" }  -> not authenticated, redirect needed
    //   { status: "denied" } -> authenticated but not admin
    //   { status: "admin", session } -> authorized
    // ---------------------------------------------------------

    async function guard() {
        var session = await getSession();

        if (!session) {
            return { status: "login" };
        }

        var role = await fetchRole(session.user.id);

        if (role !== "admin") {
            return { status: "denied", session: session };
        }

        return { status: "admin", session: session, role: role };
    }

    // ---------------------------------------------------------
    // Logout — terminate the Supabase session, clear state,
    // redirect to the admin login page.
    // ---------------------------------------------------------

    async function logout() {
        if (supabase) {
            try {
                await supabase.auth.signOut();
            } catch (err) {
                // Even if the network call fails we still redirect.
            }
        }

        window.location.replace(LOGIN_URL);
    }

    // ---------------------------------------------------------
    // Session expiry — if Supabase signs the user out (expired
    // refresh token, revoked session) send them to the login
    // page from any admin page.
    // ---------------------------------------------------------

    if (supabase) {
        supabase.auth.onAuthStateChange(function (event) {
            if (event === "SIGNED_OUT") {
                var path = window.location.pathname;
                if (path.indexOf("/admin/login") === -1) {
                    window.location.replace(LOGIN_URL);
                }
            }
        });
    }

    // ---------------------------------------------------------
    // Standard page bootstrap used by all protected admin pages.
    // The page content is hidden until authorization is confirmed.
    // ---------------------------------------------------------

    async function initAdminPage(options) {
        var opts = options || {};

        var result = await guard();

        if (result.status === "login") {
            window.location.replace(LOGIN_URL);
            return;
        }

        if (result.status === "denied") {
            window.location.replace(UNAUTHORIZED_URL);
            return;
        }

        window.AdminLayout.render({
            active: opts.active || "",
            title: opts.title || "",
            user: result.session.user
        });

        if (typeof opts.onReady === "function") {
            await opts.onReady(result.session.user);
        }
    }

    window.AdminAuth = {
        getSession: getSession,
        fetchRole: fetchRole,
        guard: guard,
        logout: logout,
        initAdminPage: initAdminPage,
        LOGIN_URL: LOGIN_URL,
        DASHBOARD_URL: DASHBOARD_URL,
        UNAUTHORIZED_URL: UNAUTHORIZED_URL
    };
})();