// =============================================================
// Dar Chatt — Admin Login Page
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;

    function show(element) {
        if (element) element.hidden = false;
    }

    function hide(element) {
        if (element) element.hidden = true;
    }

    function setError(message) {
        var errorBox = document.getElementById("loginError");
        if (!errorBox) return;
        errorBox.textContent = message;
        errorBox.classList.add("is-visible");
    }

    function clearError() {
        var errorBox = document.getElementById("loginError");
        if (errorBox) errorBox.classList.remove("is-visible");
    }

    function setLoading(isLoading) {
        var button = document.getElementById("loginSubmit");
        var label = document.getElementById("loginSubmitLabel");
        if (!button) return;

        button.disabled = isLoading;
        if (label) {
            label.textContent = isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول";
        }
    }

    function translateAuthError(error) {
        var message = (error && error.message) || "";

        if (/Invalid login credentials/i.test(message)) {
            return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
        }

        if (/Email not confirmed/i.test(message)) {
            return "البريد الإلكتروني غير مؤكد بعد.";
        }

        if (/fetch|network|Failed to fetch/i.test(message)) {
            return "تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت ثم حاول مرة أخرى.";
        }

        if (/rate limit|Too many requests/i.test(message)) {
            return "محاولات كثيرة جداً. انتظر قليلاً ثم حاول مرة أخرى.";
        }

        return "حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى.";
    }

    function showNotAdmin(email) {
        hide(document.getElementById("loginForm"));
        show(document.getElementById("loginNote"));

        var noteTitle = document.getElementById("loginNoteTitle");
        var noteText = document.getElementById("loginNoteText");

        if (noteTitle) noteTitle.textContent = "لا تملك صلاحيات إدارية";
        if (noteText) {
            noteText.textContent =
                "الحساب (" + (email || "") + ") مسجل الدخول بنجاح لكنه ليس حساب إداري. " +
                "الوصول إلى لوحة التحكم متاح للإداريين فقط.";
        }

        var logoutButton = document.getElementById("loginLogoutButton");
        if (logoutButton) {
            logoutButton.addEventListener("click", function () {
                if (supabase) {
                    supabase.auth.signOut().catch(function () {});
                }
                window.location.reload();
            });
        }
    }

    function showLoginForm() {
        hide(document.getElementById("loginNote"));
        show(document.getElementById("loginForm"));
    }

    // ---------------------------------------------------------
    // Init
    // ---------------------------------------------------------

    async function init() {
        var loading = document.getElementById("loginLoading");
        if (loading) loading.hidden = true;

        var loginPage = document.getElementById("loginPage");
        if (loginPage) loginPage.hidden = false;

        var form = document.getElementById("loginForm");
        if (!form || !supabase) {
            if (!supabase) {
                setError(
                    "تعذر تحميل إعدادات الاتصال. تأكد من تعبئة الإعدادات في js/supabase-config.js ثم أعد تحميل الصفحة."
                );
            }
            return;
        }

        // Already signed in? Validate role before showing anything.
        var session = await window.AdminAuth.getSession();

        if (session) {
            var role = await window.AdminAuth.fetchRole(session.user.id);

            if (role === "admin") {
                window.location.replace(window.AdminAuth.DASHBOARD_URL);
                return;
            }

            // Signed in but not an admin: sign out and explain.
            try {
                await supabase.auth.signOut();
            } catch (err) {}

            showNotAdmin(session.user.email);
            return;
        }

        showLoginForm();

        form.addEventListener("submit", async function (event) {
            event.preventDefault();
            clearError();

            var emailInput = document.getElementById("loginEmail");
            var passwordInput = document.getElementById("loginPassword");

            var email = emailInput.value.trim();
            var password = passwordInput.value;

            if (!email || !password) {
                setError("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
                return;
            }

            setLoading(true);

            try {
                var result = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (result.error) {
                    setError(translateAuthError(result.error));
                    setLoading(false);
                    return;
                }

                // Authentication succeeded — now verify authorization.
                var role = await window.AdminAuth.fetchRole(result.data.user.id);

                if (role === "admin") {
                    // Audit trail: record the successful admin login.
                    window.AdminShared.logActivity(
                        result.data.session,
                        "auth.login",
                        "user",
                        result.data.user.id,
                        null
                    );

                    window.location.replace(window.AdminAuth.DASHBOARD_URL);
                    return;
                }

                // Authenticated but not an administrator.
                try {
                    await supabase.auth.signOut();
                } catch (err) {}

                showNotAdmin(email);
            } catch (err) {
                setError("تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت ثم حاول مرة أخرى.");
            } finally {
                setLoading(false);
            }
        });
    }

    document.addEventListener("DOMContentLoaded", init);
})();