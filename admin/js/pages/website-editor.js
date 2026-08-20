// =============================================================
// Dar Chatt — Website Editor
// Edits the homepage hero section: heading, subheading and a
// slider of images (stored in the site bucket under hero/,
// settings key = 'hero').
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;
    var S = window.AdminShared;

    var session = null;
    var state = {
        images: [] // array of public URLs, ordered (first = start slide)
    };

    var elements = {};

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function cacheElements() {
        elements.form = document.getElementById("websiteEditorForm");
        elements.heading = document.getElementById("heroHeading");
        elements.subheading = document.getElementById("heroSubheading");
        elements.imagesGrid = document.getElementById("heroImagesGrid");
        elements.imagesEmpty = document.getElementById("heroImagesEmpty");
        elements.imagesInput = document.getElementById("heroImagesInput");
        elements.submitButton = document.getElementById("websiteEditorSubmitButton");
        elements.submitLabel = document.getElementById("websiteEditorSubmitLabel");
    }

    // ---------------------------------------------------------
    // Load current hero settings
    // ---------------------------------------------------------

    async function loadHero() {
        var result = await supabase
            .from("settings")
            .select("value")
            .eq("key", "hero")
            .maybeSingle();

        var hero = {};

        if (!result.error && result.data && result.data.value) {
            hero = result.data.value;
        }

        elements.heading.value = hero.heading || "";
        elements.subheading.value = hero.subheading || "";
        state.images = Array.isArray(hero.images) ? hero.images.filter(Boolean) : [];

        renderImages();
    }

    // ---------------------------------------------------------
    // Image grid
    // ---------------------------------------------------------

    function renderImages() {
        if (!elements.imagesGrid) return;

        if (elements.imagesEmpty) {
            elements.imagesEmpty.hidden = state.images.length > 0;
        }

        elements.imagesGrid.innerHTML = state.images.map(function (url, index) {
            return (
                '<div class="hero-image-tile">' +
                '<div class="hero-image-preview-wrap">' +
                '<img src="' + escapeHtml(url) + '" alt="صورة القسم الرئيسي ' + (index + 1) + '">' +
                (index === 0 ? '<span class="hero-image-first">البداية</span>' : "") +
                "</div>" +
                '<div class="hero-image-tile-actions">' +
                '<button type="button" class="admin-btn admin-icon-btn" data-move="up" ' + (index === 0 ? "disabled" : "") + ' title="تحريك لأعلى">↑</button>' +
                '<button type="button" class="admin-btn admin-icon-btn" data-move="down" ' + (index === state.images.length - 1 ? "disabled" : "") + ' title="تحريك لأسفل">↓</button>' +
                '<button type="button" class="admin-btn admin-btn-danger admin-icon-btn" data-remove title="حذف">×</button>' +
                "</div>" +
                "</div>"
            );
        }).join("");
    }

    function moveImage(from, direction) {
        var to = from + (direction === "up" ? -1 : 1);
        if (to < 0 || to >= state.images.length) return;

        var tmp = state.images[from];
        state.images[from] = state.images[to];
        state.images[to] = tmp;

        renderImages();
    }

    async function removeImage(index) {
        var url = state.images[index];

        var confirmed = await S.confirmDialog({
            title: "حذف الصورة",
            message: "هل تريد حذف هذه الصورة من القسم الرئيسي؟",
            confirmLabel: "حذف",
            danger: true
        });

        if (!confirmed) return;

        state.images.splice(index, 1);
        renderImages();

        // Best effort: remove the file from storage too.
        if (url) S.deleteStoredFile(url);
    }

    // ---------------------------------------------------------
    // Upload new images
    // ---------------------------------------------------------

    async function uploadFiles(files) {
        if (!files || files.length === 0) return;

        var pending = Array.prototype.slice.call(files);
        var uploaded = [];

        for (var i = 0; i < pending.length; i++) {
            var file = pending[i];

            try {
                var url = await S.uploadImage(file, "site", "hero");
                uploaded.push(url);
            } catch (err) {
                S.toast(err.message || "فشل رفع إحدى الصور.", "error");
            }
        }

        if (uploaded.length > 0) {
            state.images = state.images.concat(uploaded);
            renderImages();
        }
    }

    // ---------------------------------------------------------
    // Save
    // ---------------------------------------------------------

    async function save(event) {
        event.preventDefault();

        elements.submitButton.disabled = true;
        elements.submitLabel.textContent = "جاري الحفظ...";

        var result = await supabase
            .from("settings")
            .upsert({
                key: "hero",
                value: {
                    heading: elements.heading.value.trim(),
                    subheading: elements.subheading.value.trim(),
                    images: state.images
                }
            }, { onConflict: "key" });

        if (result.error) {
            S.toast("تعذر حفظ التغييرات: " + (result.error.message || ""), "error");
            elements.submitButton.disabled = false;
            elements.submitLabel.textContent = "حفظ التغييرات";
            return;
        }

        S.logActivity(session, "settings.update", "settings", "hero", null);
        S.toast("تم حفظ تغييرات الصفحة الرئيسية بنجاح", "success");

        elements.submitButton.disabled = false;
        elements.submitLabel.textContent = "حفظ التغييرات";
    }

    // ---------------------------------------------------------
    // Init
    // ---------------------------------------------------------

    function bindEvents() {
        if (elements.imagesGrid) {
            elements.imagesGrid.addEventListener("click", function (event) {
                var moveButton = event.target.closest("[data-move]");
                var removeButton = event.target.closest("[data-remove]");
                var tile = event.target.closest(".hero-image-tile");
                if (!tile) return;

                var index = Array.prototype.indexOf.call(
                    elements.imagesGrid.children,
                    tile
                );

                if (moveButton) {
                    moveImage(index, moveButton.getAttribute("data-move"));
                }

                if (removeButton) {
                    removeImage(index);
                }
            });
        }

        if (elements.imagesInput) {
            elements.imagesInput.addEventListener("change", function () {
                uploadFiles(elements.imagesInput.files);
                elements.imagesInput.value = "";
            });
        }

        if (elements.form) {
            elements.form.addEventListener("submit", save);
        }
    }

    function init() {
        cacheElements();
        bindEvents();
        loadHero();
    }

    document.addEventListener("DOMContentLoaded", function () {
        window.AdminAuth.initAdminPage({
            active: "website-editor",
            title: "محرر الموقع",
            onReady: function (user) {
                session = { user: user };
                init();
            }
        });
    });
})();