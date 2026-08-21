// =============================================================
// Dar Chatt — Reset Password Page
// Arrives via the Supabase reset email with a recovery
// session; lets the user set a new password via updateUser.
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;

    var form = document.getElementById("resetForm");
    var loading = document.getElementById("verifyLoading");
    var errorBox = document.getElementById("authError");
    var successBox = document.getElementById("authSuccess");
    var button = document.getElementById("resetSubmitButton");
    var label = document.getElementById("resetSubmitLabel");

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

        var password = document.getElementById("resetPassword").value;
        var confirm = document.getElementById("resetConfirm").value;

        if (password.length < 6) {
            showError("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
            return;
        }
        if (password !== confirm) {
            showError("كلمتا المرور غير متطابقتين.");
            return;
        }

        button.disabled = true;
        label.textContent = "جاري الحفظ...";
        errorBox.hidden = true;

        var result = await supabase.auth.updateUser({ password: password });

        button.disabled = false;
        label.textContent = "حفظ كلمة المرور الجديدة";

        if (result.error) {
            showError(result.error.message || "تعذر تحديث كلمة المرور. حاول مرة أخرى.");
            return;
        }

        showSuccess("تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.");
        form.hidden = true;

        var link = document.createElement("a");
        link.href = "signin.html";
        link.className = "auth-footer-link";
        link.textContent = "تسجيل الدخول";
        successBox.appendChild(document.createElement("br"));
        successBox.appendChild(link);
    }

    async function init() {
        if (!form) return;

        loading.hidden = false;
        form.hidden = true;

        var sessionResult = await supabase
            ? await supabase.auth.getSession()
            : { data: { session: null } };

        var session = sessionResult.data && sessionResult.data.session;

        loading.hidden = true;

        if (!session) {
            showError("لا توجد جلسة إعادة تعيين صالحة. اطلب رابطاً جديداً لإعادة تعيين كلمة المرور.");
            var forgotLink = document.createElement("a");
            forgotLink.href = "forgot-password.html";
            forgotLink.className = "auth-footer-link";
            forgotLink.textContent = "طلب رابط جديد";
            errorBox.appendChild(document.createElement("br"));
            errorBox.appendChild(forgotLink);
            return;
        }

        form.hidden = false;
        form.addEventListener("submit", submit);
    }

    document.addEventListener("DOMContentLoaded", init);
})();