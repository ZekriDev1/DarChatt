// =============================================================
// Dar Chatt — Supabase Client (shared: public site + admin)
// Loads after supabase-config.js and the supabase-js CDN script.
// A single client is created per page — never duplicated.
// =============================================================

(function () {
    var config = window.DARCHATT_SUPABASE || {};

    if (!window.supabase || !config.url || !config.anonKey) {
        window.DarChattSupabase = null;
        return;
    }

    window.DarChattSupabase = window.supabase.createClient(
        config.url,
        config.anonKey,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    );
})();