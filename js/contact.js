// =============================================================
// Dar Chatt — Contact Page
// Fills phone/email from the 'contact' settings row and sends
// the contact form as a WhatsApp message (wa.me deep link).
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;

    function internationalPhone(raw) {
        var digits = String(raw || "").replace(/\D/g, "");
        if (!digits) return "";
        if (digits.indexOf("0") === 0) digits = digits.slice(1);
        return "212" + digits;
    }

    async function fillContact() {
        var telLink = document.querySelector('.contact-block a[href^="tel:"]');
        var mailLink = document.querySelector('.contact-block a[href^="mailto:"]');

        var result = await supabase
            .from("settings")
            .select("value")
            .eq("key", "contact")
            .maybeSingle();

        if (result.error || !result.data) return;

        var contact = result.data.value || {};

        if (telLink && contact.phone) {
            telLink.href = "tel:" + String(contact.phone).replace(/\s/g, "");
            telLink.textContent = contact.phone;
            telLink.setAttribute("dir", "ltr");
        }

        if (mailLink && contact.email) {
            mailLink.href = "mailto:" + contact.email;
            mailLink.textContent = contact.email;
            mailLink.setAttribute("dir", "ltr");
        }
    }

    function setNotice(message, isError) {
        var successBox = document.getElementById("contactSuccess");
        if (!successBox) return;

        successBox.classList.toggle("auth-success", !isError);
        successBox.classList.toggle("auth-error", isError);
        successBox.textContent = message;
        successBox.hidden = false;
    }

    function submit(event) {
        event.preventDefault();

        var name = document.getElementById("contactName").value.trim();
        var email = document.getElementById("contactEmail").value.trim();
        var subject = document.getElementById("contactSubject").value.trim();
        var message = document.getElementById("contactMessage").value.trim();

        if (!name) return setNotice("يرجى إدخال الاسم الكامل.", true);
        if (!email) return setNotice("يرجى إدخال البريد الإلكتروني.", true);
        if (!subject) return setNotice("يرجى إدخال الموضوع.", true);
        if (!message) return setNotice("يرجى كتابة رسالتك.", true);

        var telLink = document.querySelector('.contact-block a[href^="tel:"]');
        var phone = internationalPhone(telLink ? telLink.textContent : "0631484377");

        var text =
            "مرحباً، لدي استفسار:" +
            "\n\nالاسم: " + name +
            "\nالبريد: " + email +
            "\nالموضوع: " + subject +
            "\n\n" + message;

        window.open(
            "https://wa.me/" + phone + "?text=" + encodeURIComponent(text),
            "_blank",
            "noopener"
        );

        setNotice("تم فتح واتساب مع رسالتك — اضغط إرسال لإكمال الإرسال إلى فريقنا.", false);
        event.target.reset();
    }

    function init() {
        var form = document.getElementById("contactForm");

        if (form) form.addEventListener("submit", submit);

        if (supabase) fillContact();
    }

    document.addEventListener("DOMContentLoaded", init);
})();