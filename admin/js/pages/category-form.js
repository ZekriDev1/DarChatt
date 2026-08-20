// =============================================================
// Dar Chatt — Category Create / Edit Form
// One script for /admin/category-create.html and
// /admin/category-edit.html?id=... (mode detected from the URL).
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;
    var S = window.AdminShared;

    var editId = S.getParam("id");
    var isEdit = !!editId;

    var state = {
        slugTouched: false,
        existingImageUrl: null,
        session: null,
        loadingCategory: isEdit
    };

    // ---------------------------------------------------------
    // Slug auto-generation
    // ---------------------------------------------------------

    function maybeAutoSlug() {
        if (state.slugTouched) return;

        var nameEn = document.getElementById("categoryNameEn").value.trim();
        var nameAr = document.getElementById("categoryName").value.trim();

        var slug = S.slugify(nameEn || nameAr);
        document.getElementById("categorySlug").value = slug;
    }

    // ---------------------------------------------------------
    // Image handling
    // ---------------------------------------------------------

    function showProgress(visible) {
        var box = document.getElementById("categoryUploadProgress");
        var fill = document.getElementById("categoryUploadFill");
        var text = document.getElementById("categoryUploadText");
        if (box) box.classList.toggle("is-visible", visible);
        if (fill) fill.style.width = "0%";
        if (text) text.textContent = "";
    }

    function setProgress(ratio) {
        var fill = document.getElementById("categoryUploadFill");
        var text = document.getElementById("categoryUploadText");
        if (fill) fill.style.width = Math.round(ratio * 100) + "%";
        if (text) text.textContent = "جاري رفع الصورة... " + Math.round(ratio * 100) + "%";
    }

    function handleFileSelection() {
        var input = document.getElementById("categoryImageInput");
        var file = input && input.files && input.files[0];
        if (!file) return;

        var preview = document.getElementById("categoryImagePreview");
        var removeButton = document.getElementById("removeCategoryImageButton");

        // Local preview before saving.
        try {
            var reader = new FileReader();
            reader.onload = function () {
                if (preview) {
                    preview.src = reader.result;
                    preview.hidden = false;
                }
                if (removeButton) removeButton.hidden = false;
            };
            reader.readAsDataURL(file);
        } catch (err) {}

        // Remember the file to upload on save.
        state.pendingFile = file;
    }

    async function uploadPendingImage() {
        if (!state.pendingFile) return state.existingImageUrl;

        showProgress(true);

        try {
            var url = await S.uploadImage(state.pendingFile, "categories", "categories", function (ratio) {
                setProgress(ratio);
            });

            showProgress(false);

            // New image uploaded successfully — only NOW remove the old one.
            if (state.existingImageUrl && state.existingImageUrl !== url) {
                await S.deleteStoredFile(state.existingImageUrl);
            }

            return url;
        } catch (err) {
            showProgress(false);
            throw err;
        }
    }

    // ---------------------------------------------------------
    // Duplicate slug check
    // ---------------------------------------------------------

    async function slugExists(slug) {
        try {
            var query = supabase
                .from("categories")
                .select("id")
                .eq("slug", slug)
                .limit(1);

            if (isEdit) query = query.neq("id", editId);

            var result = await query;
            if (result.error) return false;
            return (result.data || []).length > 0;
        } catch (err) {
            return false;
        }
    }

    // ---------------------------------------------------------
    // Load (edit mode)
    // ---------------------------------------------------------

    async function loadCategory() {
        var result = await supabase
            .from("categories")
            .select("id, name, name_en, slug, description, image_url, sort_order, is_active, created_at")
            .eq("id", editId)
            .maybeSingle();

        if (result.error || !result.data) {
            S.toast("تعذر تحميل التصنيف: " + ((result.error && result.error.message) || "غير موجود"), "error");
            return;
        }

        var category = result.data;

        document.getElementById("categoryName").value = category.name || "";
        document.getElementById("categoryNameEn").value = category.name_en || "";
        document.getElementById("categorySlug").value = category.slug || "";
        document.getElementById("categoryDescription").value = category.description || "";
        document.getElementById("categorySortOrder").value = category.sort_order != null ? category.sort_order : 0;
        document.getElementById("categoryStatus").value = category.is_active ? "true" : "false";

        state.slugTouched = true; // never overwrite the existing slug on load

        if (category.image_url) {
            state.existingImageUrl = category.image_url;
            var preview = document.getElementById("categoryImagePreview");
            if (preview) {
                preview.src = category.image_url;
                preview.hidden = false;
            }
            var removeButton = document.getElementById("removeCategoryImageButton");
            if (removeButton) removeButton.hidden = false;
        }

        state.loadingCategory = false;
    }

    // ---------------------------------------------------------
    // Save
    // ---------------------------------------------------------

    async function saveCategory(event) {
        event.preventDefault();

        var name = document.getElementById("categoryName").value.trim();
        var slug = document.getElementById("categorySlug").value.trim();

        if (!name) {
            S.toast("يرجى إدخال اسم التصنيف بالعربية.", "error");
            return;
        }

        if (!slug) {
            S.toast("يرجى إدخال الرابط المختصر (Slug).", "error");
            return;
        }

        var submitButton = document.getElementById("categorySubmitButton");
        var submitLabel = document.getElementById("categorySubmitLabel");
        if (submitButton) submitButton.disabled = true;
        if (submitLabel) submitLabel.textContent = "جاري الحفظ...";

        try {
            var duplicate = await slugExists(slug);
            if (duplicate) {
                S.toast("هذا الرابط المختصر (Slug) مستخدم بالفعل لتصنيف آخر.", "error");
                if (submitButton) submitButton.disabled = false;
                if (submitLabel) submitLabel.textContent = "حفظ التصنيف";
                return;
            }

            var imageUrl = await uploadPendingImage();

            var payload = {
                name: name,
                name_en: document.getElementById("categoryNameEn").value.trim() || null,
                slug: slug,
                description: document.getElementById("categoryDescription").value.trim() || null,
                sort_order: Number(document.getElementById("categorySortOrder").value) || 0,
                is_active: document.getElementById("categoryStatus").value === "true",
                image_url: imageUrl || null
            };

            var result;

            if (isEdit) {
                result = await supabase.from("categories").update(payload).eq("id", editId);
                S.logActivity(state.session, "category.update", "category", editId, { name: name });
            } else {
                result = await supabase.from("categories").insert(payload);
                S.logActivity(state.session, "category.create", "category", result.data && result.data[0] ? result.data[0].id : null, { name: name });
            }

            if (result.error) {
                var message = result.error.message || "";
                if (/duplicate key|already exists/i.test(message)) {
                    S.toast("هذا الرابط المختصر (Slug) مستخدم بالفعل لتصنيف آخر.", "error");
                } else {
                    S.toast("تعذر حفظ التصنيف: " + message, "error");
                }
                if (submitButton) submitButton.disabled = false;
                if (submitLabel) submitLabel.textContent = "حفظ التصنيف";
                return;
            }

            S.toast("تم حفظ التصنيف بنجاح", "success");
            window.location.href = "/admin/categories.html";
        } catch (err) {
            S.toast(err.message || "حدث خطأ أثناء حفظ التصنيف.", "error");
            if (submitButton) submitButton.disabled = false;
            if (submitLabel) submitLabel.textContent = "حفظ التصنيف";
        }
    }

    // ---------------------------------------------------------
    // Init
    // ---------------------------------------------------------

    function initCategoryForm() {
        var form = document.getElementById("categoryForm");
        if (!form) return;

        form.addEventListener("submit", saveCategory);

        document.getElementById("categoryName").addEventListener("input", function () {
            maybeAutoSlug();
        });

        document.getElementById("categoryNameEn").addEventListener("input", function () {
            maybeAutoSlug();
        });

        document.getElementById("categorySlug").addEventListener("input", function () {
            state.slugTouched = true;
        });

        var imageInput = document.getElementById("categoryImageInput");
        if (imageInput) {
            imageInput.addEventListener("change", handleFileSelection);
        }

        var removeButton = document.getElementById("removeCategoryImageButton");
        if (removeButton) {
            removeButton.addEventListener("click", function () {
                state.pendingFile = null;
                state.existingImageUrl = null;
                if (imageInput) imageInput.value = "";
                var preview = document.getElementById("categoryImagePreview");
                if (preview) {
                    preview.hidden = true;
                    preview.removeAttribute("src");
                }
                removeButton.hidden = true;
            });
        }

        if (isEdit) {
            loadCategory();
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        window.AdminAuth.initAdminPage({
            active: "categories",
            title: isEdit ? "تعديل التصنيف" : "إضافة تصنيف",
            onReady: async function (user) {
                state.session = { user: user };
                initCategoryForm();
            }
        });
    });
})();