// =============================================================
// Dar Chatt — Forgot Password Page
// Sends a password reset email via Supabase Auth. The email
// links back to reset-password.html with a recovery session.
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;

    var form = document.getElementById("forgotForm");
    var errorBox = document.getElementById("authError");
    var successBox = document.getElementById("authSuccess");
    var button = document.getElementById("forgotSubmitButton");
    var label = document.getElementById("forgotSubmitLabel");

    function showError(message) {
        successBox.hidden = true;
        errorBox.textContent = message;
        errorBox.hidden = false;
    }

    function showSuccess(message) {
        errorBox.hidden = true;
        successBox.textContent = message;
        successBox.hidden = false;
    }

    async function submit(event) {
        event.preventDefault();

        var email = document.getElementById("forgotEmail").value.trim();
        if (!email) {
            showError("يرجى إدخال البريد الإلكتروني.");
            return;
        }

        button.disabled = true;
        label.textContent = "جاري الإرسال...";
        errorBox.hidden = true;

        var redirectTo = window.location.origin + "/reset-password.html";

        var result = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectTo
        });

        button.disabled = false;
        label.textContent = "إرسال رابط إعادة التعيين";

        if (result.error) {
            showError(result.error.message || "تعذر إرسال الرابط. حاول مرة أخرى.");
            return;
        }

        showSuccess("تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. تحقق من صندوق الوارد.");
        form.hidden = true;
    }

    function init() {
        if (!form) return;
        form.addEventListener("submit", submit);
    }

    document.addEventListener("DOMContentLoaded", init);
})();