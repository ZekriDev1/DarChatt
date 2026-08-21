// =============================================================
// Dar Chatt — Account Profile (read-only view)
// =============================================================

(function () {
    "use strict";

    function formatDate(value) {
        if (!value) return "—";
        try {
            return new Intl.DateTimeFormat("ar-MA", {
                year: "numeric",
                month: "long",
                day: "numeric"
            }).format(new Date(value));
        } catch (err) {
            return "—";
        }
    }

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

            var fullName = document.getElementById("profileFullName");
            if (fullName) fullName.textContent = profile.full_name || "—";

            var email = document.getElementById("profileEmail");
            if (email) email.textContent = profile.email || "—";

            var phone = document.getElementById("profilePhone");
            if (phone) phone.textContent = profile.phone || "—";

            var created = document.getElementById("profileCreated");
            if (created) created.textContent = formatDate(profile.created_at);
        }
    });
})();