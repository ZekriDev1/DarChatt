// =============================================================
// Dar Chatt — Admin Profile
// View name/email/role/created date; change name (profiles) and
// password (Supabase Auth — passwords never touch the database).
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;
    var S = window.AdminShared;

    var session = null;

    function setText(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function initials(name, email) {
        var source = (name || email || "").trim();
        var parts = source.split(/\s+/).filter(Boolean);
        if (parts.length === 0) return "؟";
        if (parts.length === 1) return parts[0].charAt(0);
        return parts[0].charAt(0) + parts[1].charAt(0);
    }

    async function loadProfile(user) {
        var result = await supabase
            .from("profiles")
            .select("id, email, full_name, role, created_at")
            .eq("id", user.id)
            .maybeSingle();

        if (result.error || !result.data) {
            setText("profileName", "—");
            return;
        }

        var profile = result.data;

        setText("profileName", profile.full_name || "—");
        setText("profileEmail", profile.email || user.email || "—");
        setText("profileCreated", S.formatDateTime(profile.created_at));

        var avatar = document.getElementById("profileAvatar");
        if (avatar) {
            avatar.textContent = initials(profile.full_name, profile.email);
        }

        var nameInput = document.getElementById("profileFullName");
        if (nameInput) nameInput.value = profile.full_name || "";
    }

    async function saveName(event) {
        event.preventDefault();

        var name = document.getElementById("profileFullName").value.trim();

        if (!name) {
            S.toast("يرجى إدخال الاسم.", "error");
            return;
        }

        var submitButton = document.getElementById("profileNameSubmit");
        var submitLabel = document.getElementById("profileNameSubmitLabel");
        if (submitButton) submitButton.disabled = true;
        if (submitLabel) submitLabel.textContent = "جاري الحفظ...";

        var result = await supabase
            .from("profiles")
            .update({ full_name: name })
            .eq("id", session.user.id);

        if (result.error) {
            S.toast("تعذر حفظ الاسم: " + (result.error.message || ""), "error");
            if (submitButton) submitButton.disabled = false;
            if (submitLabel) submitLabel.textContent = "حفظ الاسم";
            return;
        }

        setText("profileName", name);
        var avatar = document.getElementById("profileAvatar");
        if (avatar) {
            avatar.textContent = initials(name, session.user.email);
        }

        S.toast("تم حفظ الاسم بنجاح", "success");
        if (submitButton) submitButton.disabled = false;
        if (submitLabel) submitLabel.textContent = "حفظ الاسم";
    }

    async function changePassword(event) {
        event.preventDefault();

        var newPassword = document.getElementById("profileNewPassword").value;
        var confirmPassword = document.getElementById("profileConfirmPassword").value;

        if (!newPassword || newPassword.length < 6) {
            S.toast("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل.", "error");
            return;
        }

        if (newPassword !== confirmPassword) {
            S.toast("كلمتا المرور غير متطابقتين.", "error");
            return;
        }

        var submitButton = document.getElementById("profilePasswordSubmit");
        var submitLabel = document.getElementById("profilePasswordSubmitLabel");
        if (submitButton) submitButton.disabled = true;
        if (submitLabel) submitLabel.textContent = "جاري التغيير...";

        try {
            var result = await supabase.auth.updateUser({ password: newPassword });

            if (result.error) {
                S.toast("تعذر تغيير كلمة المرور: " + (result.error.message || ""), "error");
            } else {
                S.toast("تم تغيير كلمة المرور بنجاح. استخدمها في تسجيل الدخول القادم.", "success");
                document.getElementById("profileNewPassword").value = "";
                document.getElementById("profileConfirmPassword").value = "";
            }
        } catch (err) {
            S.toast("تعذر الاتصال بالخادم. حاول مرة أخرى.", "error");
        } finally {
            if (submitButton) submitButton.disabled = false;
            if (submitLabel) submitLabel.textContent = "تغيير كلمة المرور";
        }
    }

    function initProfile() {
        var nameForm = document.getElementById("profileNameForm");
        if (nameForm) nameForm.addEventListener("submit", saveName);

        var passwordForm = document.getElementById("profilePasswordForm");
        if (passwordForm) passwordForm.addEventListener("submit", changePassword);

        loadProfile(session.user);
    }

    document.addEventListener("DOMContentLoaded", function () {
        window.AdminAuth.initAdminPage({
            active: "profile",
            title: "الملف الشخصي",
            onReady: function (user) {
                session = { user: user };
                initProfile();
            }
        });
    });
})();