// =============================================================
// Dar Chatt — Admin Shared Helpers
// Loaded on every admin page AFTER supabase.js and auth.js.
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;

    // ---------------------------------------------------------
    // Formatting
    // ---------------------------------------------------------

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    // "١٬٢٣٤٫٥٠ درهم" (Arabic-Indic digits, consistent with the app)
    function formatMoney(value) {
        var number = Number(value);
        if (!isFinite(number)) return "—";
        return (
            new Intl.NumberFormat("ar-MA", { maximumFractionDigits: 2 }).format(number) +
            " درهم"
        );
    }

    function formatNumber(value) {
        var number = Number(value);
        if (!isFinite(number)) return "—";
        return new Intl.NumberFormat("ar-MA").format(number);
    }

    function formatDate(value) {
        if (!value) return "—";
        try {
            return new Intl.DateTimeFormat("ar-MA", {
                year: "numeric",
                month: "short",
                day: "numeric"
            }).format(new Date(value));
        } catch (err) {
            return "—";
        }
    }

    function formatDateTime(value) {
        if (!value) return "—";
        try {
            return new Intl.DateTimeFormat("ar-MA", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }).format(new Date(value));
        } catch (err) {
            return "—";
        }
    }

    function getParam(name) {
        try {
            return new URLSearchParams(window.location.search).get(name);
        } catch (err) {
            return null;
        }
    }

    // ---------------------------------------------------------
    // Slug generation (latin or Arabic — manual editing allowed)
    // ---------------------------------------------------------

    function slugify(text) {
        var value = String(text == null ? "" : text).trim();
        if (!value) return "";
        // Latin letters + numbers stay as-is; Arabic letters are kept too.
        return value
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^\p{L}\p{N}-]/gu, "")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
    }

    // ---------------------------------------------------------
    // Toast
    // ---------------------------------------------------------

    var toastTimer = null;

    function toast(message, type) {
        var el = document.getElementById("adminToast");
        if (!el) {
            el = document.createElement("div");
            el.id = "adminToast";
            el.className = "admin-toast";
            document.body.appendChild(el);
        }

        el.textContent = message;
        el.classList.remove("is-success", "is-error");
        if (type === "success") el.classList.add("is-success");
        if (type === "error") el.classList.add("is-error");
        el.classList.add("is-visible");

        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            el.classList.remove("is-visible");
        }, 3200);
    }

    // ---------------------------------------------------------
    // Debounce (search inputs)
    // ---------------------------------------------------------

    function debounce(fn, wait) {
        var timer = null;
        return function () {
            var args = arguments;
            var context = this;
            if (timer) clearTimeout(timer);
            timer = setTimeout(function () {
                fn.apply(context, args);
            }, wait || 350);
        };
    }

    // ---------------------------------------------------------
    // Confirm dialog (returns a Promise<boolean>)
    // ---------------------------------------------------------

    function confirmDialog(options) {
        var opts = options || {};
        var title = opts.title || "تأكيد العملية";
        var message = opts.message || "هل أنت متأكد؟";
        var confirmLabel = opts.confirmLabel || "تأكيد";
        var danger = opts.danger !== false;

        return new Promise(function (resolve) {
            var modal = document.createElement("div");
            modal.className = "admin-modal";
            modal.innerHTML =
                '<div class="admin-modal-backdrop" data-confirm-close></div>' +
                '<div class="admin-modal-card admin-modal-card-small">' +
                '<div class="admin-modal-header">' +
                '<h3 class="admin-modal-title">' + escapeHtml(title) + "</h3>" +
                '<button type="button" class="admin-modal-close" data-confirm-close aria-label="إغلاق">×</button>' +
                "</div>" +
                '<div class="admin-modal-body">' +
                '<p class="admin-delete-text">' + escapeHtml(message) + "</p>" +
                "</div>" +
                '<div class="admin-modal-actions">' +
                '<button type="button" class="admin-btn" data-confirm-close>إلغاء</button>' +
                '<button type="button" class="admin-btn ' + (danger ? "admin-btn-danger" : "admin-btn-primary") + '" data-confirm-ok>' +
                escapeHtml(confirmLabel) +
                "</button>" +
                "</div>" +
                "</div>";

            function close(result) {
                document.body.removeChild(modal);
                resolve(result);
            }

            modal.querySelectorAll("[data-confirm-close]").forEach(function (el) {
                el.addEventListener("click", function () {
                    close(false);
                });
            });

            modal.querySelector("[data-confirm-ok]").addEventListener("click", function () {
                close(true);
            });

            document.body.appendChild(modal);
        });
    }

    // ---------------------------------------------------------
    // Storage upload / delete
    // ---------------------------------------------------------

    function assertImageFile(file) {
        if (!file) throw new Error("لم يتم اختيار أي ملف.");
        if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type || "")) {
            throw new Error("صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WebP.");
        }
        if (file.size > 2 * 1024 * 1024) {
            throw new Error("حجم الصورة يجب أن لا يتجاوز 2MB.");
        }
    }

    // Uploads to a storage bucket and returns the public URL.
    // onProgress receives a 0..1 number.
    async function uploadImage(file, bucket, folder, onProgress) {
        if (!supabase) throw new Error("تعذر الاتصال بقاعدة البيانات.");
        assertImageFile(file);

        var ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        var path =
            folder + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;

        var result = await supabase.storage.from(bucket).upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            onUploadProgress: function (event) {
                if (typeof onProgress === "function" && event.total > 0) {
                    onProgress(event.loaded / event.total);
                }
            }
        });

        if (result.error) {
            throw new Error("فشل رفع الصورة: " + (result.error.message || "خطأ غير معروف"));
        }

        var urlResult = supabase.storage.from(bucket).getPublicUrl(path);
        return urlResult.data ? urlResult.data.publicUrl : null;
    }

    // Deletes a stored file given its public URL (best effort).
    async function deleteStoredFile(publicUrl) {
        if (!supabase || !publicUrl) return;
        try {
            var match = /\/object\/public\/([^/]+)\/(.+)$/.exec(publicUrl);
            if (!match) return;
            await supabase.storage.from(match[1]).remove([match[2]]);
        } catch (err) {
            // Best effort — never block the caller on storage cleanup.
        }
    }

    // ---------------------------------------------------------
    // Fetch ALL rows (small tables), bypassing the 1000-row limit
    // ---------------------------------------------------------

    async function fetchAll(queryBuilder) {
        var all = [];
        var page = 0;
        var pageSize = 1000;

        while (true) {
            var result = await queryBuilder.range(
                page * pageSize,
                (page + 1) * pageSize - 1
            );
            if (result.error) return { error: result.error, data: null };
            all = all.concat(result.data || []);
            if (!result.data || result.data.length < pageSize) break;
            page++;
        }

        return { error: null, data: all };
    }

    // ---------------------------------------------------------
    // Activity logging (best effort, never blocks the caller)
    // ---------------------------------------------------------

    async function logActivity(session, action, entityType, entityId, details) {
        if (!supabase || !session) return;
        try {
            await supabase.from("admin_activity_logs").insert({
                admin_id: session.user.id,
                admin_email: session.user.email,
                action: action,
                entity_type: entityType,
                entity_id: entityId != null ? String(entityId) : null,
                details: details || null
            });
        } catch (err) {}
    }

    // ---------------------------------------------------------
    // Shared dictionaries
    // ---------------------------------------------------------

    // Revenue = orders that were actually paid/delivered (COD):
    // 'shipped' (delivered) and 'completed' (confirmed received).
    var REVENUE_STATUSES = ["shipped", "completed"];

    var ORDER_STATUSES = {
        new: { label: "جديد", css: "order-new" },
        confirmed: { label: "تم التأكيد", css: "order-confirmed" },
        processing: { label: "قيد التجهيز", css: "order-processing" },
        ready_to_ship: { label: "جاهز للشحن", css: "order-ready" },
        shipped: { label: "تم الشحن", css: "order-shipped" },
        completed: { label: "مكتمل", css: "order-completed" },
        cancelled: { label: "ملغى", css: "order-cancelled" }
    };

    var STOCK_STATUSES = {
        in_stock: { label: "متوفر", css: "stock-in" },
        low_stock: { label: "منخفض", css: "stock-low" },
        out_of_stock: { label: "نفد", css: "stock-out" }
    };

    var ACTIVITY_ACTIONS = {
        "auth.login": "تسجيل الدخول",
        "category.create": "إضافة تصنيف",
        "category.update": "تعديل تصنيف",
        "category.delete": "حذف تصنيف",
        "product.create": "إضافة منتج",
        "product.update": "تعديل منتج",
        "product.delete": "حذف منتج",
        "order.status": "تغيير حالة الطلب",
        "settings.update": "تعديل إعدادات الموقع"
    };

    window.AdminShared = {
        escapeHtml: escapeHtml,
        formatMoney: formatMoney,
        formatNumber: formatNumber,
        formatDate: formatDate,
        formatDateTime: formatDateTime,
        getParam: getParam,
        slugify: slugify,
        toast: toast,
        debounce: debounce,
        confirmDialog: confirmDialog,
        uploadImage: uploadImage,
        deleteStoredFile: deleteStoredFile,
        fetchAll: fetchAll,
        logActivity: logActivity,
        REVENUE_STATUSES: REVENUE_STATUSES,
        ORDER_STATUSES: ORDER_STATUSES,
        STOCK_STATUSES: STOCK_STATUSES,
        ACTIVITY_ACTIONS: ACTIVITY_ACTIONS
    };
})();