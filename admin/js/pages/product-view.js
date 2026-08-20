// =============================================================
// Dar Chatt — Product Details (admin)
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;
    var S = window.AdminShared;

    var productId = S.getParam("id");
    var session = null;

    function setText(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    async function loadProduct() {
        var result = await supabase
            .from("products")
            .select("*")
            .eq("id", productId)
            .maybeSingle();

        if (result.error || !result.data) {
            S.toast("تعذر تحميل المنتج: " + ((result.error && result.error.message) || "غير موجود"), "error");
            setText("productViewName", "المنتج غير موجود");
            return null;
        }

        return result.data;
    }

    async function loadCategoryName(categoryId) {
        if (!categoryId) return "—";
        var result = await supabase
            .from("categories")
            .select("name")
            .eq("id", categoryId)
            .maybeSingle();
        if (result.error || !result.data) return "—";
        return result.data.name;
    }

    async function loadOrderStats(productId) {
        var result = await supabase
            .from("order_items")
            .select("quantity")
            .eq("product_id", productId);

        if (result.error) return { orders: 0, quantity: 0 };

        var quantity = 0;
        (result.data || []).forEach(function (item) {
            quantity += Number(item.quantity) || 0;
        });

        return { orders: (result.data || []).length, quantity: quantity };
    }

    function renderProduct(product, categoryName, stats) {
        setText("productViewTitle", "تفاصيل المنتج: " + product.name_ar);
        setText("productViewName", product.name_ar);
        setText("productViewNameEn", product.name_en || "");
        setText("productViewDescription", product.description_ar || "لا يوجد وصف.");

        var priceHtml = S.formatMoney(product.price);
        setText("productViewPrice", priceHtml);
        setText("productViewOldPrice", product.is_sale && product.old_price != null ? S.formatMoney(product.old_price) : "—");
        setText("productViewCategory", categoryName);
        setText("productViewSku", product.sku || "—");

        var stockBadge = S.STOCK_STATUSES[product.stock_status] || { label: product.stock_status, css: "" };
        var stockHtml = S.formatNumber(product.stock) + " — <span class=\"stock-badge " + stockBadge.css + "\">" + stockBadge.label + "</span>";
        var stockElement = document.getElementById("productViewStock");
        if (stockElement) stockElement.innerHTML = stockHtml;

        setText("productViewStatus", product.is_active ? "نشط" : "غير نشط");
        setText("productViewFeatured", product.is_featured ? "نعم" : "لا");
        setText("productViewCreated", S.formatDateTime(product.created_at));
        setText("productViewUpdated", S.formatDateTime(product.updated_at));

        setText("productViewOrdersCount", S.formatNumber(stats.orders));
        setText("productViewQuantitySold", S.formatNumber(stats.quantity));

        var editLink = document.getElementById("productViewEditLink");
        if (editLink) {
            editLink.href = "/admin/product-edit.html?id=" + encodeURIComponent(productId);
        }

        // Gallery
        var images = [];
        try {
            images = JSON.parse(product.images || "[]");
        } catch (err) {}
        if (!Array.isArray(images) || images.length === 0) {
            if (product.image_url) images = [product.image_url];
        }

        var gallery = document.getElementById("productViewGallery");
        if (gallery) {
            if (images.length === 0) {
                gallery.innerHTML = '<p class="cell-muted">لا توجد صور.</p>';
            } else {
                gallery.innerHTML = images.map(function (url, index) {
                    return (
                        '<div class="gallery-item' + (index === 0 ? " gallery-item-main" : "") + '">' +
                        '<img src="' + S.escapeHtml(url) + '" alt="صورة المنتج">' +
                        "</div>"
                    );
                }).join("");
            }
        }

        var mainImage = document.getElementById("productViewMainImage");
        if (mainImage) {
            if (images.length > 0) {
                mainImage.src = images[0];
                mainImage.hidden = false;
            } else {
                mainImage.hidden = true;
            }
        }

        // Store for toggle/delete actions
        window.__productViewData = product;
    }

    async function toggleStatus() {
        var product = window.__productViewData;
        if (!product) return;

        var newValue = !product.is_active;
        var result = await supabase
            .from("products")
            .update({ is_active: newValue })
            .eq("id", productId);

        if (result.error) {
            S.toast("تعذر تحديث الحالة: " + (result.error.message || ""), "error");
            return;
        }

        product.is_active = newValue;
        S.toast(newValue ? "تم تفعيل المنتج" : "تم تعطيل المنتج", "success");
        S.logActivity(session, "product.update", "product", productId, {
            field: "is_active",
            value: newValue
        });

        var statusElement = document.getElementById("productViewStatus");
        if (statusElement) statusElement.textContent = newValue ? "نشط" : "غير نشط";
    }

    async function deleteProduct() {
        var product = window.__productViewData;
        if (!product) return;

        var confirmed = await S.confirmDialog({
            title: "حذف المنتج",
            message:
                "هل أنت متأكد من حذف المنتج \"" + product.name_ar + "\" نهائياً؟" +
                " سيتم الاحتفاظ بسجل الطلبات السابقة المرتبطة به.",
            confirmLabel: "حذف نهائياً"
        });

        if (!confirmed) return;

        var result = await supabase.from("products").delete().eq("id", productId);

        if (result.error) {
            S.toast("تعذر حذف المنتج: " + (result.error.message || ""), "error");
            return;
        }

        var urls = [];
        if (product.image_url) urls.push(product.image_url);
        try {
            var images = JSON.parse(product.images || "[]");
            urls = urls.concat(images);
        } catch (err) {}

        urls.filter(function (url, index) { return urls.indexOf(url) === index; })
            .forEach(function (url) {
                S.deleteStoredFile(url);
            });

        S.logActivity(session, "product.delete", "product", productId, {
            name: product.name_ar
        });

        S.toast("تم حذف المنتج", "success");
        window.location.href = "/admin/products.html";
    }

    // ---------------------------------------------------------
    // Init
    // ---------------------------------------------------------

    function initProductView() {
        if (!productId) {
            S.toast("معرّف المنتج غير موجود.", "error");
            return;
        }

        var toggleButton = document.getElementById("productViewToggleButton");
        if (toggleButton) {
            toggleButton.addEventListener("click", toggleStatus);
        }

        var deleteButton = document.getElementById("productViewDeleteButton");
        if (deleteButton) {
            deleteButton.addEventListener("click", deleteProduct);
        }

        loadProduct().then(function (product) {
            if (!product) return;
            loadCategoryName(product.category_id).then(function (categoryName) {
                loadOrderStats(productId).then(function (stats) {
                    renderProduct(product, categoryName, stats);
                });
            });
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        window.AdminAuth.initAdminPage({
            active: "products",
            title: "تفاصيل المنتج",
            onReady: function (user) {
                session = { user: user };
                initProductView();
            }
        });
    });
})();