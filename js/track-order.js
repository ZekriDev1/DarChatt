// =============================================================
// Dar Chatt — Track Order Page
// Lets visitors check an order by its number via the
// public track_order() RPC (security definer — returns only
// public, non-sensitive fields).
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;

    var STATUS_LABELS = {
        new: "جديد",
        confirmed: "تم التأكيد",
        processing: "قيد التجهيز",
        ready_to_ship: "جاهز للشحن",
        shipped: "تم الشحن",
        completed: "تم التسليم",
        cancelled: "ملغي"
    };

    var STATUS_STEPS = ["new", "processing", "shipped", "completed"];
    var STATUS_EXTRA = ["confirmed", "ready_to_ship"];

    var elements = {};

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function formatPrice(value) {
        var number = Number(value) || 0;
        return number.toLocaleString("en-US") + " DH";
    }

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

    function cacheElements() {
        elements.form = document.getElementById("trackForm");
        elements.input = document.getElementById("trackNumber");
        elements.submitButton = document.getElementById("trackSubmitButton");
        elements.submitLabel = document.getElementById("trackSubmitLabel");
        elements.loading = document.getElementById("trackLoading");
        elements.error = document.getElementById("trackError");
        elements.result = document.getElementById("trackResult");
        elements.orderNumber = document.getElementById("trackOrderNumber");
        elements.status = document.getElementById("trackStatus");
        elements.date = document.getElementById("trackDate");
        elements.total = document.getElementById("trackTotal");
    }

    function stepIndex(status) {
        var index = STATUS_STEPS.indexOf(status);
        if (index !== -1) return index;

        if (status === "confirmed") return 0;
        if (status === "ready_to_ship") return 1;
        return -1;
    }

    function showLoading() {
        elements.loading.hidden = false;
        elements.error.hidden = true;
        elements.result.hidden = true;
    }

    function showError(message) {
        elements.loading.hidden = true;
        elements.error.hidden = false;
        elements.result.hidden = true;
        elements.error.textContent = message;
    }

    function showResult(order) {
        elements.loading.hidden = true;
        elements.error.hidden = true;
        elements.result.hidden = false;

        elements.orderNumber.textContent = order.order_number || "—";
        elements.status.textContent = STATUS_LABELS[order.status] || order.status || "—";
        elements.status.className = "track-status-badge track-status-" + (order.status || "");

        var cancelled = order.status === "cancelled";
        var currentStep = cancelled ? -1 : stepIndex(order.status);
        var activeSteps = cancelled ? [] : STATUS_STEPS.slice(0, currentStep + 1);

        document.querySelectorAll(".track-step").forEach(function (step) {
            var key = step.getAttribute("data-step");
            var isActive = activeSteps.indexOf(key) !== -1;
            step.classList.toggle("is-active", isActive);
        });

        var progress = document.querySelector(".track-progress");
        if (progress) progress.classList.toggle("is-cancelled", cancelled);

        elements.date.textContent = formatDate(order.created_at);
        elements.total.textContent = formatPrice(order.total);
    }

    async function submit(event) {
        event.preventDefault();

        var number = elements.input.value.trim();
        if (!number) {
            showError("يرجى إدخال رقم الطلب.");
            return;
        }

        elements.submitButton.disabled = true;
        elements.submitLabel.textContent = "جاري البحث...";
        showLoading();

        var result = await supabase.rpc("track_order", {
            p_order_number: number
        });

        elements.submitButton.disabled = false;
        elements.submitLabel.textContent = "تتبع الطلب";

        if (result.error) {
            showError(result.error.message || "تعذر البحث عن الطلب. حاول مرة أخرى.");
            return;
        }

        if (!result.data) {
            showError("لم يتم العثور على طلب بهذا الرقم.");
            return;
        }

        showResult(result.data);
    }

    async function init() {
        cacheElements();

        if (!supabase || !elements.form) {
            showError("تعذر تحميل صفحة التتبع.");
            return;
        }

        elements.form.addEventListener("submit", submit);

        var params = new URLSearchParams(window.location.search);
        var number = params.get("order");
        if (number) {
            elements.input.value = number;
            submit(new Event("submit"));
        }
    }

    document.addEventListener("DOMContentLoaded", init);
})();