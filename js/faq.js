// =============================================================
// Dar Chatt — FAQ Page
// Accordion behaviour for the FAQ items (aria-expanded state).
// =============================================================

(function () {
    "use strict";

    function init() {
        var buttons = document.querySelectorAll(".faq-question");

        buttons.forEach(function (button) {
            button.addEventListener("click", function () {
                var item = button.closest(".faq-item");
                if (!item) return;

                var isOpen = item.classList.contains("is-open");
                item.classList.toggle("is-open", !isOpen);
                button.setAttribute("aria-expanded", String(!isOpen));
            });
        });
    }

    document.addEventListener("DOMContentLoaded", init);
})();