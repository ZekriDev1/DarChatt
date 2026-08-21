// =============================================================
// Dar Chatt — AI Assistant ("تحتاج مساعدة؟")
// Floating chat widget powered by Google AI (Gemini).
// Requires js/ai-config.js (window.DARCHATT_AI) loaded before this file.
// =============================================================

(function () {
    "use strict";

    var config = window.DARCHATT_AI || {};
    var API_KEY = config.apiKey;
    var MODEL = config.model || "gemini-2.5-flash";
    var API_URL = "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent";

    // ---------------------------------------------------------
    // Store knowledge given to the model as a system instruction
    // ---------------------------------------------------------
    var SYSTEM_PROMPT = [
        "أنت \"مساعد دار الشاط\"، المساعد الذكي الرسمي لمتجر دار الشاط الإلكتروني.",
        "دار الشاط متجر إلكتروني مغربي متخصص في: العطور الفاخرة، البخور، الإكسسوارات، واللوازم الإسلامية، بأصالة مغربية وجودة عالية.",
        "",
        "معلومات المتجر:",
        "- الدفع: الدفع نقداً عند الاستلام فقط.",
        "- التوصيل: توصيل سريع إلى جميع المدن المغربية.",
        "- الهاتف: 0631484377",
        "- البريد الإلكتروني: contact@darchatt.com",
        "",
        "صفحات الموقع المهمة (روابط نسبية من جذر الموقع):",
        "- المتجر / كل المنتجات: shop.html",
        "- التصنيفات: categories.html",
        "- تتبع الطلب: track-order.html",
        "- الأسئلة الشائعة: faq.html",
        "- اتصل بنا: contact.html",
        "- من نحن: about.html",
        "- سياسة الشحن: shipping-policy.html",
        "- الاسترجاع والاستبدال: returns.html",
        "- الشروط والأحكام: terms.html",
        "- سياسة الخصوصية: privacy-policy.html",
        "",
        "قواعد الرد:",
        "- رد دائماً بالعربية الفصحى المبسطة وبأسلوب ودود وراقب (ما لم يكتب المستخدم بلغة أخرى، فرد بنفس لغته).",
        "- كن مختصراً ومفيداً؛ استخدم قوائم قصيرة عند الحاجة.",
        "- إذا سأل المستخدم عن أسعار أو تفاصيل منتج محدد، اشرح له كيف يجدها في صفحة المتجر (shop.html) أو التصنيفات (categories.html)، ولا تخترع أسعاراً أو منتجات غير موجودة.",
        "- إذا سأل عن حالة طلب، وجّهه إلى صفحة تتبع الطلب (track-order.html) أو يتواصل هاتفياً على الرقم أعلاه.",
        "- لا تعطِ معلومات خاطئة أو وعداً بما لا يقدمه المتجر. إن لم تكن متأكداً، انصح بالتواصل مع خدمة العملاء عبر الهاتف أو البريد.",
        "- يمكنك استخدام تنسيق بسيط: **نص عريض** وفواصل أسطر."
    ].join("\n");

    var MAX_HISTORY = 24; // number of turns kept and sent to the API
    var STORAGE_KEY = "darChattAiChat";

    var isOpen = false;
    var isSending = false;
    var history = [];

    var root, fab, panel, backdrop, messagesEl, inputEl,
        sendBtn, closeBtn, suggestionsEl;

    // ---------------------------------------------------------
    // Markup
    // ---------------------------------------------------------
    function buildMarkup() {
        root = document.createElement("div");
        root.className = "dcai-root";
        root.innerHTML =
            '<div class="dcai-backdrop" hidden></div>' +

            '<section class="dcai-panel" role="dialog" aria-label="مساعد دار الشاط الذكي" aria-hidden="true">' +
                '<header class="dcai-header">' +
                    '<div class="dcai-header-info">' +
                        '<span class="dcai-avatar" aria-hidden="true">' + AVATAR_SVG + "</span>" +
                        "<div>" +
                            '<h2 class="dcai-title">مساعد دار الشاط</h2>' +
                            '<p class="dcai-status"><span class="dcai-dot" aria-hidden="true"></span>متصل الآن — يجيب فوراً</p>' +
                        "</div>" +
                    "</div>" +
                    '<button type="button" class="dcai-close" aria-label="إغلاق المحادثة">✕</button>' +
                "</header>" +

                '<div class="dcai-messages" id="dcaiMessages"></div>' +

                '<div class="dcai-suggestions" aria-label="اقتراحات">' +
                    '<button type="button" class="dcai-chip">ما هي طرق الدفع؟</button>' +
                    '<button type="button" class="dcai-chip">كيف أتتبع طلبي؟</button>' +
                    '<button type="button" class="dcai-chip">كم مدة التوصيل؟</button>' +
                "</div>" +

                '<form class="dcai-inputbar" id="dcaiForm">' +
                    '<input type="text" class="dcai-input" placeholder="اكتب رسالتك هنا..." autocomplete="off" maxlength="1000" aria-label="رسالتك">' +
                    '<button type="submit" class="dcai-send" aria-label="إرسال">' + SEND_SVG + "</button>" +
                "</form>" +
            "</section>" +

            '<button type="button" class="dcai-fab" aria-label="تحتاج مساعدة؟ افتح المحادثة مع المساعد الذكي">' +
                '<span class="dcai-fab-icon">' + CHAT_SVG + "</span>" +
                '<span class="dcai-fab-text">تحتاج مساعدة؟</span>' +
            "</button>";

        document.body.appendChild(root);

        fab = root.querySelector(".dcai-fab");
        panel = root.querySelector(".dcai-panel");
        backdrop = root.querySelector(".dcai-backdrop");
        messagesEl = root.querySelector(".dcai-messages");
        inputEl = root.querySelector(".dcai-input");
        sendBtn = root.querySelector(".dcai-send");
        closeBtn = root.querySelector(".dcai-close");
        suggestionsEl = root.querySelector(".dcai-suggestions");

        bindEvents();
        restoreHistory();
        if (!history.length) greet();
        renderHistory();
        fab.classList.add("dcai-pulse");
    }

    var AVATAR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="12" rx="3"/><path d="M12 8V5"/><circle cx="12" cy="4" r="1" fill="currentColor" stroke="none"/><path d="M8 13v2"/><path d="M16 13v2"/></svg>';
    var CHAT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></svg>';
    var SEND_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>';

    // ---------------------------------------------------------
    // Events
    // ---------------------------------------------------------
    function bindEvents() {
        fab.addEventListener("click", openPanel);
        closeBtn.addEventListener("click", closePanel);
        backdrop.addEventListener("click", closePanel);
        suggestionsEl.addEventListener("click", function (e) {
            var chip = e.target.closest(".dcai-chip");
            if (chip) ask(chip.textContent.trim());
        });

        root.querySelector("#dcaiForm").addEventListener("submit", function (e) {
            e.preventDefault();
            var text = inputEl.value.trim();
            if (text) ask(text);
        });

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && isOpen) closePanel();
        });
    }

    function openPanel() {
        isOpen = true;
        fab.hidden = true;
        panel.classList.add("is-open");
        panel.setAttribute("aria-hidden", "false");
        backdrop.hidden = window.innerWidth < 640;
        setTimeout(function () { inputEl.focus(); }, 250);
    }

    function closePanel() {
        isOpen = false;
        panel.classList.remove("is-open");
        panel.setAttribute("aria-hidden", "true");
        backdrop.hidden = true;
        fab.hidden = false;
        fab.classList.remove("dcai-pulse");
    }

    // ---------------------------------------------------------
    // Conversation rendering
    // ---------------------------------------------------------
    function greet() {
        history.push({
            role: "model",
            text: "أهلاً وسهلاً بك في **دار الشاط** 🌙\nأنا مساعدك الذكي، كيف يمكنني مساعدتك اليوم؟"
        });
        saveHistory();
    }

    function renderHistory() {
        messagesEl.innerHTML = "";
        history.forEach(function (m) { appendBubble(m.role, m.text); });
        scrollToBottom();
    }

    function appendBubble(role, text) {
        var bubble = document.createElement("div");
        bubble.className = "dcai-msg dcai-msg-" + (role === "user" ? "user" : "bot");
        bubble.innerHTML = formatText(text);
        messagesEl.appendChild(bubble);
        scrollToBottom();
        return bubble;
    }

    function showTyping() {
        var typing = document.createElement("div");
        typing.className = "dcai-msg dcai-msg-bot dcai-typing";
        typing.setAttribute("aria-label", "المساعد يكتب...");
        typing.innerHTML = '<span></span><span></span><span></span>';
        messagesEl.appendChild(typing);
        scrollToBottom();
    }

    function hideTyping() {
        var typing = messagesEl.querySelector(".dcai-typing");
        if (typing) typing.remove();
    }

    function scrollToBottom() {
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    // Minimal formatting: escape HTML, then **bold** and newlines.
    function formatText(text) {
        var safe = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        return safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
    }

    function saveHistory() {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX_HISTORY)));
        } catch (e) { /* storage unavailable — ignore */ }
    }

    function restoreHistory() {
        try {
            var raw = sessionStorage.getItem(STORAGE_KEY);
            if (raw) history = JSON.parse(raw).slice(-MAX_HISTORY);
        } catch (e) { history = []; }
    }

    // ---------------------------------------------------------
    // Sending / receiving
    // ---------------------------------------------------------
    function ask(text) {
        if (isSending) return;
        inputEl.value = "";
        hideTyping();

        history.push({ role: "user", text: text });
        saveHistory();

        // Drop greeting-only histories beyond the cap before sending.
        appendBubble("user", text);
        suggestionsEl.hidden = true;
        sendMessageToApi();
    }

    function sendMessageToApi() {
        isSending = true;
        sendBtn.disabled = true;
        showTyping();

        fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": API_KEY
            },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                contents: history.map(function (m) {
                    return { role: m.role === "user" ? "user" : "model", parts: [{ text: m.text }] };
                }),
                generationConfig: {
                    temperature: 0.5,
                    maxOutputTokens: 1024,
                    thinkingConfig: { thinkingBudget: 0 }
                }
            })
        })
            .then(function (res) {
                if (!res.ok) {
                    return res.json().catch(function () { return null; }).then(function (err) {
                        var message = err && err.error && err.error.message ? err.error.message : "";
                        throw new Error("HTTP " + res.status + (message ? ": " + message : ""));
                    });
                }
                return res.json();
            })
            .then(function (data) {
                hideTyping();
                var reply = extractReply(data);
                history.push({ role: "model", text: reply });
                saveHistory();
                appendBubble("model", reply);
            })
            .catch(function () {
                hideTyping();
                var errorText = "عذراً، حدث خطأ أثناء الاتصال. يرجى المحاولة مرة أخرى.\nيمكنك أيضاً التواصل معنا مباشرة على الرقم **0631484377**.";
                appendBubble("model", errorText);
            })
            .then(function () {
                isSending = false;
                sendBtn.disabled = false;
            });
    }

    function extractReply(data) {
        try {
            var parts = data.candidates[0].content.parts || [];
            var text = parts.map(function (p) { return p.text || ""; }).join("").trim();
            return text || "عذراً، لم أتمكن من صياغة رد الآن. هل يمكنك إعادة صياغة سؤالك؟";
        } catch (e) {
            return "عذراً، لم أتمكن من معالجة طلبك الآن. حاول مرة أخرى.";
        }
    }

    // ---------------------------------------------------------
    // Init
    // ---------------------------------------------------------
    if (!API_KEY || API_KEY.indexOf("YOUR-") === 0) {
        console.warn("[dar-chatt] Google AI API key missing — run scripts/sync-env.mjs after filling .env");
        return;
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", buildMarkup);
    } else {
        buildMarkup();
    }
})();
