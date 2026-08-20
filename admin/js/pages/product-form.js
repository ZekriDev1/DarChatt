// =============================================================
// Dar Chatt — Product Create / Edit Form
// One script for /admin/product-create.html and
// /admin/product-edit.html?id=... (mode detected from the URL).
//
// Images: local preview, remove, reorder; uploaded on save.
// Old storage images are only deleted AFTER the new ones are
// uploaded successfully.
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;
    var S = window.AdminShared;

    var editId = S.getParam("id");
    var isEdit = !!editId;

    var state = {
        slugTouched: false,
        gallery: [],          // [{ url: string|null, file: File|null }]
        originalUrls: [],     // stored URLs that existed on load (edit mode)
        session: null
    };

    // ---------------------------------------------------------
    // Slug auto-generation
    // ---------------------------------------------------------

    function maybeAutoSlug() {
        if (state.slugTouched) return;

        var nameEn = document.getElementById("productNameEn").value.trim();
        var nameAr = document.getElementById("productNameAr").value.trim();

        var slug = S.slugify(nameEn || nameAr);
        document.getElementById("productSlug").value = slug;
    }

    // ---------------------------------------------------------
    // Stock status auto-sync
    // ---------------------------------------------------------

    function syncStockStatus() {
        var stockInput = document.getElementById("productStock");
        var statusSelect = document.getElementById("productStockStatus");
        if (!stockInput || !statusSelect) return;

        var stock = Number(stockInput.value) || 0;
        if (stock <= 0) {
            statusSelect.value = "out_of_stock";
        } else if (stock <= 10) {
            statusSelect.value = "low_stock";
        } else {
            statusSelect.value = "in_stock";
        }
    }

    // ---------------------------------------------------------
    // Gallery rendering
    // ---------------------------------------------------------

    function renderGallery() {
        var gallery = document.getElementById("productGallery");
        var mainPreview = document.getElementById("productMainPreview");
        if (!gallery) return;

        var main = state.gallery[0];
        if (mainPreview) {
            if (main && (main.url || main.file)) {
                mainPreview.src = main.url || (main.file && main.file.dataUrl) || "";
                mainPreview.hidden = !(mainPreview.src);
            } else {
                mainPreview.hidden = true;
                mainPreview.removeAttribute("src");
            }
        }

        gallery.innerHTML = state.gallery.map(function (entry, index) {
            var src = entry.url || (entry.file && entry.file.dataUrl) || "";
            var isMain = index === 0;

            return (
                '<div class="gallery-item' + (isMain ? " gallery-item-main" : "") + '">' +
                '<img src="' + S.escapeHtml(src) + '" alt="صورة المنتج">' +
                '<div class="gallery-item-actions">' +
                '<button type="button" class="gallery-action" data-gallery-action="up" data-index="' + index + '" title="تحريك لأعلى"' + (index === 0 ? " disabled" : "") + ">" +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 19V5"/><path d="M5 12L12 5L19 12"/></svg>' +
                "</button>" +
                '<button type="button" class="gallery-action" data-gallery-action="down" data-index="' + index + '" title="تحريك لأسفل"' + (index === state.gallery.length - 1 ? " disabled" : "") + ">" +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5V19"/><path d="M19 12L12 19L5 12"/></svg>' +
                "</button>" +
                '<button type="button" class="gallery-action gallery-action-danger" data-gallery-action="remove" data-index="' + index + '" title="حذف">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6H21"/><path d="M8 6V4H16V6"/><path d="M6 6L7 21H17L18 6"/></svg>' +
                "</button>" +
                "</div>" +
                "</div>"
            );
        }).join("");
    }

    function handleFilesSelected() {
        var input = document.getElementById("productImagesInput");
        var files = input && input.files ? Array.prototype.slice.call(input.files) : [];
        if (files.length === 0) return;

        files.forEach(function (file) {
            var entry = { url: null, file: file };
            try {
                var reader = new FileReader();
                reader.onload = (function (e) {
                    return function () {
                        entry.file.dataUrl = e.target.result;
                        renderGallery();
                    };
                })(file);
                reader.readAsDataURL(file);
            } catch (err) {}
            state.gallery.push(entry);
        });

        input.value = "";
        renderGallery();
    }

    // ---------------------------------------------------------
    // Upload helpers
    // ---------------------------------------------------------

    function showProgress(visible) {
        var box = document.getElementById("productUploadProgress");
        var fill = document.getElementById("productUploadFill");
        var text = document.getElementById("productUploadText");
        if (box) box.classList.toggle("is-visible", visible);
        if (fill) fill.style.width = "0%";
        if (text) text.textContent = "";
    }

    // Uploads every pending file; returns the final ordered URL list.
    async function uploadPendingImages() {
        var pending = state.gallery.filter(function (entry) { return entry.file; });
        if (pending.length === 0) {
            return state.gallery.map(function (entry) { return entry.url; }).filter(Boolean);
        }

        showProgress(true);

        var fill = document.getElementById("productUploadFill");
        var text = document.getElementById("productUploadText");

        for (var i = 0; i < pending.length; i++) {
            var entry = pending[i];
            if (text) text.textContent = "جاري رفع الصور... " + (i + 1) + " من " + pending.length;
            if (fill) fill.style.width = Math.round(((i) / pending.length) * 100) + "%";

            var url = await S.uploadImage(entry.file, "products", "products", function (ratio) {
                if (fill) {
                    var base = (i / pending.length) * 100;
                    fill.style.width = Math.round(base + (ratio / pending.length) * 100) + "%";
                }
            });

            entry.url = url;
            entry.file = null;
        }

        showProgress(false);
        return state.gallery.map(function (entry) { return entry.url; }).filter(Boolean);
    }

    // ---------------------------------------------------------
    // Category options
    // ---------------------------------------------------------

    async function loadCategories(selectedId) {
        var select = document.getElementById("productCategory");
        if (!select) return;

        var result = await S.fetchAll(
            supabase
                .from("categories")
                .select("id, name, is_active")
                .order("sort_order", { ascending: true })
        );

        if (result.error) {
            S.toast("تعذر تحميل التصنيفات: " + (result.error.message || ""), "error");
            return;
        }

        select.innerHTML = '<option value="">— اختر التصنيف —</option>' +
            result.data.map(function (category) {
                var label = category.name + (category.is_active ? "" : " (غير نشط)");
                return '<option value="' + category.id + '">' + S.escapeHtml(label) + "</option>";
            }).join("");

        if (selectedId) select.value = selectedId;
    }

    // ---------------------------------------------------------
    // Load (edit mode)
    // ---------------------------------------------------------

    async function loadProduct() {
        var result = await supabase
            .from("products")
            .select("*")
            .eq("id", editId)
            .maybeSingle();

        if (result.error || !result.data) {
            S.toast("تعذر تحميل المنتج: " + ((result.error && result.error.message) || "غير موجود"), "error");
            return;
        }

        var product = result.data;

        document.getElementById("productNameAr").value = product.name_ar || "";
        document.getElementById("productNameEn").value = product.name_en || "";
        document.getElementById("productDescriptionAr").value = product.description_ar || "";
        document.getElementById("productDescriptionEn").value = product.description_en || "";
        document.getElementById("productPrice").value = product.price != null ? product.price : "";
        document.getElementById("productOldPrice").value = product.old_price != null ? product.old_price : "";
        document.getElementById("productIsSale").checked = !!product.is_sale;
        document.getElementById("productSku").value = product.sku || "";
        document.getElementById("productStock").value = product.stock != null ? product.stock : 0;
        document.getElementById("productStockStatus").value = product.stock_status || "in_stock";
        document.getElementById("productAllowOutOfStock").checked = !!product.allow_out_of_stock;
        document.getElementById("productStatus").value = product.is_active ? "true" : "false";
        document.getElementById("productFeatured").checked = !!product.is_featured;
        document.getElementById("productSlug").value = product.slug || "";
        document.getElementById("productMetaTitle").value = product.meta_title || "";
        document.getElementById("productMetaDescription").value = product.meta_description || "";

        state.slugTouched = true; // never overwrite the existing slug

        // Gallery: use images array (ordered), fallback to image_url.
        var images = [];
        try {
            images = JSON.parse(product.images || "[]");
        } catch (err) {}

        if (!Array.isArray(images) || images.length === 0) {
            if (product.image_url) images = [product.image_url];
        }

        state.gallery = images.map(function (url) {
            return { url: url, file: null };
        });
        state.originalUrls = images.slice();

        loadCategories(product.category_id);
        renderGallery();
    }

    // ---------------------------------------------------------
    // Duplicate slug check
    // ---------------------------------------------------------

    async function slugExists(slug) {
        try {
            var query = supabase
                .from("products")
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
    // Save
    // ---------------------------------------------------------

    async function saveProduct(event) {
        event.preventDefault();

        var nameAr = document.getElementById("productNameAr").value.trim();
        var slug = document.getElementById("productSlug").value.trim();
        var price = Number(document.getElementById("productPrice").value);
        var oldPriceInput = document.getElementById("productOldPrice").value;
        var oldPrice = oldPriceInput === "" ? null : Number(oldPriceInput);
        var stock = Number(document.getElementById("productStock").value);
        var categoryId = document.getElementById("productCategory").value;

        if (!nameAr) {
            S.toast("يرجى إدخال اسم المنتج بالعربية.", "error");
            return;
        }
        if (!slug) {
            S.toast("يرجى إدخال الرابط المختصر (Slug).", "error");
            return;
        }
        if (!isFinite(price) || price < 0) {
            S.toast("يرجى إدخال سعر صحيح غير سالب.", "error");
            return;
        }
        if (!isFinite(stock) || stock < 0 || !Number.isInteger(stock)) {
            S.toast("يرجى إدخال كمية صحيحة غير سالبة.", "error");
            return;
        }
        if (oldPrice !== null && (!isFinite(oldPrice) || oldPrice < 0)) {
            S.toast("السعر القديم يجب أن يكون رقماً غير سالب.", "error");
            return;
        }
        if (!categoryId) {
            S.toast("يرجى اختيار تصنيف للمنتج.", "error");
            return;
        }

        var isSale = document.getElementById("productIsSale").checked;
        if (isSale && oldPrice === null) {
            S.toast("لتفعيل السعر المخفض يجب إدخال السعر القديم.", "error");
            return;
        }

        var submitButton = document.getElementById("productSubmitButton");
        var submitLabel = document.getElementById("productSubmitLabel");
        if (submitButton) submitButton.disabled = true;
        if (submitLabel) submitLabel.textContent = "جاري الحفظ...";

        try {
            var duplicate = await slugExists(slug);
            if (duplicate) {
                S.toast("هذا الرابط المختصر (Slug) مستخدم بالفعل لمنتج آخر.", "error");
                if (submitButton) submitButton.disabled = false;
                if (submitLabel) submitLabel.textContent = "حفظ المنتج";
                return;
            }

            var finalImages = await uploadPendingImages();

            var payload = {
                name_ar: nameAr,
                name_en: document.getElementById("productNameEn").value.trim() || null,
                description_ar: document.getElementById("productDescriptionAr").value.trim() || null,
                description_en: document.getElementById("productDescriptionEn").value.trim() || null,
                price: price,
                old_price: oldPrice,
                is_sale: isSale,
                sku: document.getElementById("productSku").value.trim() || null,
                stock: stock,
                stock_status: document.getElementById("productStockStatus").value,
                allow_out_of_stock: document.getElementById("productAllowOutOfStock").checked,
                category_id: categoryId,
                images: finalImages,
                image_url: finalImages.length > 0 ? finalImages[0] : null,
                is_active: document.getElementById("productStatus").value === "true",
                is_featured: document.getElementById("productFeatured").checked,
                slug: slug,
                meta_title: document.getElementById("productMetaTitle").value.trim() || null,
                meta_description: document.getElementById("productMetaDescription").value.trim() || null
            };

            var result;

            if (isEdit) {
                result = await supabase.from("products").update(payload).eq("id", editId);
                S.logActivity(state.session, "product.update", "product", editId, { name: nameAr });
            } else {
                result = await supabase.from("products").insert(payload);
                S.logActivity(state.session, "product.create", "product", result.data && result.data[0] ? result.data[0].id : null, { name: nameAr });
            }

            if (result.error) {
                var message = result.error.message || "";
                if (/duplicate key|already exists/i.test(message)) {
                    S.toast("هذا الرابط المختصر (Slug) مستخدم بالفعل لمنتج آخر.", "error");
                } else {
                    S.toast("تعذر حفظ المنتج: " + message, "error");
                }
                if (submitButton) submitButton.disabled = false;
                if (submitLabel) submitLabel.textContent = "حفظ المنتج";
                return;
            }

            // Success — cleanup storage files removed from the gallery (edit mode only).
            if (isEdit) {
                var finalSet = {};
                finalImages.forEach(function (url) { finalSet[url] = true; });
                state.originalUrls.forEach(function (url) {
                    if (!finalSet[url]) {
                        S.deleteStoredFile(url);
                    }
                });
            }

            S.toast("تم حفظ المنتج بنجاح", "success");
            window.location.href = "/admin/products.html";
        } catch (err) {
            S.toast(err.message || "حدث خطأ أثناء حفظ المنتج.", "error");
            if (submitButton) submitButton.disabled = false;
            if (submitLabel) submitLabel.textContent = "حفظ المنتج";
        }
    }

    // ---------------------------------------------------------
    // Init
    // ---------------------------------------------------------

    function initProductForm() {
        var form = document.getElementById("productForm");
        if (!form) return;

        form.addEventListener("submit", saveProduct);

        document.getElementById("productNameAr").addEventListener("input", function () {
            maybeAutoSlug();
        });

        document.getElementById("productNameEn").addEventListener("input", function () {
            maybeAutoSlug();
        });

        document.getElementById("productSlug").addEventListener("input", function () {
            state.slugTouched = true;
        });

        document.getElementById("productStock").addEventListener("input", syncStockStatus);

        var imagesInput = document.getElementById("productImagesInput");
        if (imagesInput) {
            imagesInput.addEventListener("change", handleFilesSelected);
        }

        var clearButton = document.getElementById("clearProductImagesButton");
        if (clearButton) {
            clearButton.addEventListener("click", function () {
                state.gallery = [];
                renderGallery();
            });
        }

        var gallery = document.getElementById("productGallery");
        if (gallery) {
            gallery.addEventListener("click", function (event) {
                var button = event.target.closest("[data-gallery-action]");
                if (!button) return;

                var index = Number(button.getAttribute("data-index"));
                var action = button.getAttribute("data-gallery-action");

                if (action === "remove") {
                    state.gallery.splice(index, 1);
                }
                if (action === "up" && index > 0) {
                    var tmp = state.gallery[index - 1];
                    state.gallery[index - 1] = state.gallery[index];
                    state.gallery[index] = tmp;
                }
                if (action === "down" && index < state.gallery.length - 1) {
                    var tmp2 = state.gallery[index + 1];
                    state.gallery[index + 1] = state.gallery[index];
                    state.gallery[index] = tmp2;
                }

                renderGallery();
            });
        }

        if (isEdit) {
            loadProduct();
        } else {
            loadCategories(null);
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        window.AdminAuth.initAdminPage({
            active: "products",
            title: isEdit ? "تعديل المنتج" : "إضافة منتج",
            onReady: function (user) {
                state.session = { user: user };
                initProductForm();
            }
        });
    });
})();