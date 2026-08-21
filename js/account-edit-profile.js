// =============================================================
// Dar Chatt — Edit Profile
// Updates full_name / phone on the profiles table.
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;

    function initials(name, email) {
        var source = (name || email || "").trim();
        var parts = source.split(/\s+/).filter(Boolean);
        if (parts.length === 0) return "؟";
        if (parts.length === 1) return parts[0].charAt(0);
        return parts[0].charAt(0) + parts[1].charAt(0);
    }

    window.AccountGuard.init({
        onReady: function (session, profile) {
            var name = profile.full_name || profile.email || "";

            var avatar = document.getElementById("accountAvatar");
            if (avatar) avatar.textContent = initials(name, profile.email);

            var profileName = document.getElementById("accountProfileName");
            if (profileName) profileName.textContent = name;

            var profileEmail = document.getElementById("accountProfileEmail");
            if (profileEmail) profileEmail.textContent = profile.email || "—";

            var fullNameInput = document.getElementById("editFullName");
            var phoneInput = document.getElementById("editPhone");
            var emailInput = document.getElementById("editEmail");

            if (fullNameInput) fullNameInput.value = profile.full_name || "";
            if (phoneInput) phoneInput.value = profile.phone || "";
            if (emailInput) emailInput.value = profile.email || "";

            var form = document.getElementById("editProfileForm");
            var errorBox = document.getElementById("profileError");
            var successBox = document.getElementById("profileSuccess");
            var button = document.getElementById("editSubmitButton");
            var label = document.getElementById("editSubmitLabel");

            if (!form) return;

            form.addEventListener("submit", async function (event) {
                event.preventDefault();

                var fullName = fullNameInput.value.trim();
                var phone = phoneInput.value.trim();

                if (!fullName) {
                    successBox.hidden = true;
                    errorBox.textContent = "يرجى إدخال الاسم الكامل.";
                    errorBox.hidden = false;
                    return;
                }

                button.disabled = true;
                label.textContent = "جاري الحفظ...";
                errorBox.hidden = true;

                var result = await supabase
                    .from("profiles")
                    .update({ full_name: fullName, phone: phone || null })
                    .eq("id", session.user.id);

                button.disabled = false;
                label.textContent = "حفظ التغييرات";

                if (result.error) {
                    errorBox.textContent = result.error.message || "تعذر حفظ التغييرات.";
                    errorBox.hidden = false;
                    return;
                }

                successBox.textContent = "تم حفظ التغييرات بنجاح.";
                successBox.hidden = false;

                if (profileName) profileName.textContent = fullName;
            });
        }
    });
})();