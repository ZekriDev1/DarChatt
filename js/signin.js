// =============================================================
// Dar Chatt — Public Sign In / Sign Up
// Customer accounts are created via Supabase Auth; the
// handle_new_user() trigger gives them role = 'customer'
// (never admin — admin access is separate, see /admin/login).
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;

    // Logo from admin settings (site.logo_url), fallback to local file
    if (supabase) {
        supabase
            .from("settings")
            .select("value")
            .eq("key", "site")
            .maybeSingle()
            .then(function (result) {
                if (result.error) return;
                var site = (result.data && result.data.value) || {};
                if (site.logo_url) {
                    var img = document.querySelector(".auth-logo");
                    if (img) img.src = site.logo_url;
                }
            });
    }

    function getRedirectTarget() {
        try {
            var redirect = new URLSearchParams(window.location.search).get("redirect");
            if (redirect && /^[a-zA-Z0-9_\-./]+$/.test(redirect) && redirect.indexOf("//") === -1) {
                return redirect;
            }
        } catch (err) {}
        return "index.html";
    }

    function show(element) {
        if (element) element.hidden = false;
    }

    function hide(element) {
        if (element) element.hidden = true;
    }

    function showError(message) {
        var errorBox = document.getElementById("authError");
        if (!errorBox) return;
        errorBox.textContent = message;
        show(errorBox);
        hide(document.getElementById("authSuccess"));
    }

    function showSuccess(message) {
        var successBox = document.getElementById("authSuccess");
        if (!successBox) return;
        successBox.textContent = message;
        show(successBox);
        hide(document.getElementById("authError"));
    }

    function clearMessages() {
        hide(document.getElementById("authError"));
        hide(document.getElementById("authSuccess"));
    }

    function translateError(error, context) {
        var message = (error && error.message) || "";

        if (/Invalid login credentials/i.test(message)) {
            return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
        }

        if (/Email not confirmed/i.test(message)) {
            return "يرجى تأكيد بريدك الإلكتروني أولاً (تحقق من صندوق الوارد).";
        }

        if (/User already registered/i.test(message)) {
            return "هذا البريد الإلكتروني مسجل مسبقاً. سجّل الدخول بدلاً من ذلك.";
        }

        if (/Password should be at least/i.test(message)) {
            return "كلمة المرور يجب أن تكون 6 أحرف على الأقل.";
        }

        if (/fetch|network|Failed to fetch/i.test(message)) {
            return "تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت ثم حاول مرة أخرى.";
        }

        if (/rate limit|Too many requests/i.test(message)) {
            return "محاولات كثيرة جداً. انتظر قليلاً ثم حاول مرة أخرى.";
        }

        return context === "login"
            ? "حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى."
            : "حدث خطأ أثناء إنشاء الحساب. حاول مرة أخرى.";
    }

    function setLoading(buttonId, labelId, isLoading, loadingText, restText) {
        var button = document.getElementById(buttonId);
        var label = document.getElementById(labelId);
        if (!button) return;

        button.disabled = isLoading;
        if (label) {
            label.textContent = isLoading ? loadingText : restText;
        }
    }

    function switchTab(activeTabId) {
        var isLogin = activeTabId === "loginTab";

        document.getElementById("loginTab").classList.toggle("is-active", isLogin);
        document.getElementById("signupTab").classList.toggle("is-active", !isLogin);
        document.getElementById("loginTab").setAttribute("aria-selected", isLogin ? "true" : "false");
        document.getElementById("signupTab").setAttribute("aria-selected", isLogin ? "false" : "true");

        hide(document.getElementById("loginForm"));
        hide(document.getElementById("signupForm"));
        clearMessages();
        show(isLogin ? document.getElementById("loginForm") : document.getElementById("signupForm"));

        focusFirstField();
    }

    // Focus the first input of the visible form (for keyboard users).
    function focusFirstField() {
        var activeForm = document.getElementById("loginForm");
        if (!activeForm) return;
        if (activeForm.hidden) {
            activeForm = document.getElementById("signupForm");
        }
        if (!activeForm) return;

        var field = activeForm.querySelector("input");
        if (field) field.focus();
    }

    // ---------------------------------------------------------
    // Init
    // ---------------------------------------------------------

    function init() {
        var loginTab = document.getElementById("loginTab");
        var signupTab = document.getElementById("signupTab");
        var loginForm = document.getElementById("loginForm");
        var signupForm = document.getElementById("signupForm");

        if (!supabase) {
            showError("تعذر تحميل إعدادات الاتصال. أعد تحميل الصفحة لاحقاً.");
            return;
        }

        loginTab.addEventListener("click", function () {
            switchTab("loginTab");
        });

        signupTab.addEventListener("click", function () {
            switchTab("signupTab");
        });

        // Support deep links: signin.html#signup opens the signup tab.
        if (window.location.hash === "#signup") {
            switchTab("signupTab");
        }

        focusFirstField();

        // ---------- Login ----------

        loginForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            clearMessages();

            var email = document.getElementById("loginEmail").value.trim();
            var password = document.getElementById("loginPassword").value;

            if (!email || !password) {
                showError("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
                return;
            }

            setLoading("loginSubmitButton", "loginSubmitLabel", true, "جاري تسجيل الدخول...", "تسجيل الدخول");

            try {
                var result = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (result.error) {
                    showError(translateError(result.error, "login"));
                    return;
                }

                window.location.href = getRedirectTarget();
            } catch (err) {
                showError(translateError(err, "login"));
            } finally {
                setLoading("loginSubmitButton", "loginSubmitLabel", false, "", "تسجيل الدخول");
            }
        });

        // ---------- Signup ----------

        signupForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            clearMessages();

            var name = document.getElementById("signupName").value.trim();
            var email = document.getElementById("signupEmail").value.trim();
            var password = document.getElementById("signupPassword").value;

            if (!name || !email || !password) {
                showError("يرجى تعبئة جميع الحقول.");
                return;
            }

            if (password.length < 6) {
                showError("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
                return;
            }

            setLoading("signupSubmitButton", "signupSubmitLabel", true, "جاري إنشاء الحساب...", "إنشاء الحساب");

            try {
                var result = await supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: { full_name: name }
                    }
                });

                if (result.error) {
                    showError(translateError(result.error, "signup"));
                    return;
                }

                if (result.data.session) {
                    // Email confirmation is disabled: signed in immediately.
                    window.location.href = getRedirectTarget();
                    return;
                }

                showSuccess(
                    "تم إنشاء حسابك بنجاح! تحقق من بريدك الإلكتروني لتأكيد الحساب ثم سجّل الدخول."
                );
                document.getElementById("signupForm").reset();
            } catch (err) {
                showError(translateError(err, "signup"));
            } finally {
                setLoading("signupSubmitButton", "signupSubmitLabel", false, "", "إنشاء الحساب");
            }
        });
    }

    document.addEventListener("DOMContentLoaded", init);
})();