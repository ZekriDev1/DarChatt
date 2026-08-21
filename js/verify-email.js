// =============================================================
// Dar Chatt — Verify Email Page
// Shows whether the current session's email is confirmed.
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;

    var loading = document.getElementById("verifyLoading");
    var errorBox = document.getElementById("authError");
    var successBox = document.getElementById("authSuccess");

    function isConfirmed(user) {
        if (!user) return false;
        if (user.email_confirmed_at) return true;
        var meta = user.user_metadata || {};
        if (meta.email_verified) return true;
        if (meta.email_confirmed_at) return true;
        return false;
    }

    async function init() {
        if (!supabase) {
            if (errorBox) {
                errorBox.textContent = "تعذر الاتصال بالخدمة.";
                errorBox.hidden = false;
            }
            return;
        }

        loading.hidden = false;

        var result = await supabase.auth.getSession();
        var session = result.error ? null : (result.data && result.data.session) || null;

        loading.hidden = true;

        if (!session || !isConfirmed(session.user)) {
            errorBox.textContent = "بريدك الإلكتروني غير مؤكد بعد. تحقق من رسالة التأكيد المرسلة إلى بريدك الإلكتروني، أو حاول تسجيل الدخول.";
            errorBox.hidden = false;
            return;
        }

        successBox.textContent = "تم تأكيد بريدك الإلكتروني بنجاح. يمكنك الآن تسجيل الدخول والمتابعة.";
        successBox.hidden = false;
    }

    document.addEventListener("DOMContentLoaded", init);
})();