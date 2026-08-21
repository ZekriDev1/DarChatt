// =============================================================
// Dar Chatt — Account Security
// Changes the password: verifies the current password by
// re-signing in with it, then calls updateUser.
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;

    window.AccountGuard.init({
        onReady: function (session) {
            var form = document.getElementById("securityForm");
            var errorBox = document.getElementById("securityError");
            var successBox = document.getElementById("securitySuccess");
            var button = document.getElementById("securitySubmitButton");
            var label = document.getElementById("securitySubmitLabel");

            var currentInput = document.getElementById("currentPassword");
            var newInput = document.getElementById("newPassword");
            var confirmInput = document.getElementById("confirmNewPassword");

            if (!form) return;

            function showError(message) {
                successBox.hidden = true;
                errorBox.textContent = message;
                errorBox.hidden = false;
            }

            form.addEventListener("submit", async function (event) {
                event.preventDefault();

                var current = currentInput.value;
                var next = newInput.value;
                var confirm = confirmInput.value;

                if (!current) {
                    showError("يرجى إدخال كلمة المرور الحالية.");
                    return;
                }

                if (next.length < 6) {
                    showError("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل.");
                    return;
                }

                if (next !== confirm) {
                    showError("كلمتا المرور غير متطابقتين.");
                    return;
                }

                if (next === current) {
                    showError("كلمة المرور الجديدة يجب أن تختلف عن الحالية.");
                    return;
                }

                button.disabled = true;
                label.textContent = "جاري التحقق...";
                errorBox.hidden = true;

                // Verify the current password by signing in with it.
                var verify = await supabase.auth.signInWithPassword({
                    email: session.user.email,
                    password: current
                });

                if (verify.error) {
                    button.disabled = false;
                    label.textContent = "تغيير كلمة المرور";
                    showError("كلمة المرور الحالية غير صحيحة.");
                    return;
                }

                label.textContent = "جاري التغيير...";

                var result = await supabase.auth.updateUser({ password: next });

                button.disabled = false;
                label.textContent = "تغيير كلمة المرور";

                if (result.error) {
                    showError(result.error.message || "تعذر تغيير كلمة المرور.");
                    return;
                }

                form.reset();
                successBox.textContent = "تم تغيير كلمة المرور بنجاح.";
                successBox.hidden = false;
            });
        }
    });
})();