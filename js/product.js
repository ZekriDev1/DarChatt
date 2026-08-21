// =============================================================
// Dar Chatt — Product Detail + Order
// Loads one active product from Supabase, renders the gallery
// and details, and places a COD order through the secure
// public.place_order() RPC (server-side price/stock validation).
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;

    var product = null;
    var quantity = 1;

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
        var number = Number(value);
        if (isNaN(number)) return "0 DH";
        return number.toLocaleString("en-US") + " DH";
    }

    function isOutOfStock() {
        return product.stock_status === "out_of_stock" ||
            (Number(product.stock) <= 0 && !product.allow_out_of_stock);
    }

    function cacheElements() {
        elements.loading = document.getElementById("productLoading");
        elements.error = document.getElementById("productError");
        elements.content = document.getElementById("productContent");
        elements.gallery = document.getElementById("productGallery");
        elements.badges = document.getElementById("productBadges");
        elements.title = document.getElementById("productTitle");
        elements.priceRow = document.getElementById("productPriceRow");
        elements.stock = document.getElementById("productStock");
        elements.description = document.getElementById("productDescription");
        elements.breadcrumbCategory = document.getElementById("productBreadcrumbCategory");
        elements.quantityInput = document.getElementById("orderQuantity");
        elements.quantityMinus = document.getElementById("quantityMinus");
        elements.quantityPlus = document.getElementById("quantityPlus");
        elements.orderForm = document.getElementById("orderForm");
        elements.orderBox = document.getElementById("productOrderBox");
        elements.orderSubmitButton = document.getElementById("orderSubmitButton");
        elements.orderSubmitLabel = document.getElementById("orderSubmitLabel");
        elements.orderSuccess = document.getElementById("orderSuccess");
        elements.orderSuccessNumber = document.getElementById("orderSuccessNumber");
        elements.orderSuccessTotal = document.getElementById("orderSuccessTotal");
    }

    // ---------------------------------------------------------
    // Product images
    // ---------------------------------------------------------

    function getImages() {
        var images = [];

        if (Array.isArray(product.images)) {
            images = product.images.slice();
        }

        if (product.image_url && images.indexOf(product.image_url) === -1) {
            images.unshift(product.image_url);
        }

        return images.filter(Boolean);
    }

    function renderGallery() {
        var images = getImages();

        if (images.length === 0) {
            elements.gallery.innerHTML =
                '<div class="product-placeholder product-gallery-placeholder">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
                '<rect x="3" y="3" width="18" height="18" rx="2"/>' +
                '<circle cx="9" cy="9" r="2"/>' +
                '<path d="M21 15L16 10L5 21"/>' +
                "</svg></div>";
            return;
        }

        var mainImage = images[0];

        var mainHtml =
            '<div class="product-main-image">' +
            '<img src="' + escapeHtml(mainImage) + '" alt="' + escapeHtml(productTitle()) + '">' +
            "</div>";

        var thumbsHtml = "";
        if (images.length > 1) {
            thumbsHtml =
                '<div class="product-thumbnails">' +
                images.map(function (image, index) {
                    return (
                        '<button type="button" class="product-thumb' + (index === 0 ? " is-active" : "") +
                        '" data-image="' + escapeHtml(image) + '">' +
                        '<img src="' + escapeHtml(image) + '" alt="">' +
                        "</button>"
                    );
                }).join("") +
                "</div>";
        }

        elements.gallery.innerHTML = mainHtml + thumbsHtml;

        elements.gallery.querySelectorAll(".product-thumb").forEach(function (thumb) {
            thumb.addEventListener("click", function () {
                var image = thumb.getAttribute("data-image");
                var main = elements.gallery.querySelector(".product-main-image img");
                if (main) main.src = image;

                elements.gallery.querySelectorAll(".product-thumb").forEach(function (t) {
                    t.classList.toggle("is-active", t === thumb);
                });
            });
        });
    }

    function productTitle() {
        return product.name_ar || product.name_en || "منتج بدون اسم";
    }

    // ---------------------------------------------------------
    // Render info
    // ---------------------------------------------------------

    function renderInfo() {
        var title = productTitle();

        document.title = product.meta_title || title + " — دار الشاط";

        var meta = document.querySelector('meta[name="description"]');
        if (meta && product.meta_description) {
            meta.setAttribute("content", product.meta_description);
        }

        if (elements.title) elements.title.textContent = title;

        if (elements.breadcrumbCategory && product.categories) {
            elements.breadcrumbCategory.textContent = product.categories.name || "";
        }

        // Badges
        var badges = "";
        if (product.is_sale) {
            badges += '<span class="product-badge product-badge-sale">تخفيض</span>';
        }
        if (isOutOfStock()) {
            badges += '<span class="product-badge product-badge-out">نفد المخزون</span>';
        }
        elements.badges.innerHTML = badges;

        // Price
        var priceHtml;
        if (product.is_sale && product.old_price != null) {
            priceHtml =
                '<span class="product-price">' + formatPrice(product.price) + "</span>" +
                '<span class="product-old-price">' + formatPrice(product.old_price) + "</span>";
        } else {
            priceHtml = '<span class="product-price">' + formatPrice(product.price) + "</span>";
        }
        elements.priceRow.innerHTML = priceHtml;

        // Stock
        if (isOutOfStock()) {
            elements.stock.textContent = "غير متوفر حالياً";
            elements.stock.className = "product-detail-stock is-out";
        } else if (Number(product.stock) <= 5 && !product.allow_out_of_stock) {
            elements.stock.textContent = "كمية محدودة متبقية";
            elements.stock.className = "product-detail-stock is-low";
        } else {
            elements.stock.textContent = "متوفر";
            elements.stock.className = "product-detail-stock is-in";
        }

        // Description
        var description = product.description_ar || product.description_en || "";
        if (description) {
            elements.description.innerHTML = escapeHtml(description).replace(/\n/g, "<br>");
            elements.description.hidden = false;
        } else {
            elements.description.hidden = true;
        }

        renderGallery();

        if (isOutOfStock()) {
            elements.orderForm.hidden = true;
            if (elements.orderBox) elements.orderBox.hidden = true;
        }
    }

    // ---------------------------------------------------------
    // Quantity
    // ---------------------------------------------------------

    function setQuantity(value) {
        var max = product.allow_out_of_stock ? 99 : Number(product.stock) || 99;
        if (max < 1) max = 1;

        quantity = Math.min(Math.max(parseInt(value, 10) || 1, 1), max);
        elements.quantityInput.value = quantity;
    }

    function bindQuantity() {
        elements.quantityMinus.addEventListener("click", function () {
            setQuantity(quantity - 1);
        });

        elements.quantityPlus.addEventListener("click", function () {
            setQuantity(quantity + 1);
        });

        elements.quantityInput.addEventListener("change", function () {
            setQuantity(elements.quantityInput.value);
        });
    }

    // ---------------------------------------------------------
    // Order
    // ---------------------------------------------------------

    async function placeOrder(event) {
        event.preventDefault();

        var name = document.getElementById("orderName").value.trim();
        var phone = document.getElementById("orderPhone").value.trim();
        var email = document.getElementById("orderEmail").value.trim();
        var city = document.getElementById("orderCity").value.trim();
        var address = document.getElementById("orderAddress").value.trim();
        var notes = document.getElementById("orderNotes").value.trim();

        if (!name) return showOrderError("يرجى إدخال الاسم الكامل.");
        if (!phone) return showOrderError("يرجى إدخال رقم الهاتف.");
        if (!city) return showOrderError("يرجى إدخال المدينة.");
        if (!address) return showOrderError("يرجى إدخال العنوان.");

        elements.orderSubmitButton.disabled = true;
        elements.orderSubmitLabel.textContent = "جاري إرسال الطلب...";

        var items = [{
            product_id: product.id,
            quantity: quantity
        }];

        var result = await supabase.rpc("place_order", {
            p_items: items,
            p_customer_name: name,
            p_customer_phone: phone,
            p_customer_email: email,
            p_city: city,
            p_address: address,
            p_notes: notes
        });

        elements.orderSubmitButton.disabled = false;
        elements.orderSubmitLabel.textContent = "تأكيد الطلب";

        if (result.error) {
            return showOrderError(result.error.message || "تعذر إرسال الطلب. حاول مرة أخرى.");
        }

        elements.orderForm.hidden = true;
        elements.orderSuccess.hidden = false;

        if (elements.orderSuccessNumber) {
            elements.orderSuccessNumber.textContent = result.data.order_number || "";
        }
        if (elements.orderSuccessTotal) {
            elements.orderSuccessTotal.textContent = "الإجمالي (الدفع عند الاستلام): " + formatPrice(result.data.total);
        }

        elements.orderSuccess.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function showOrderError(message) {
        var existing = document.querySelector(".order-error-message");
        if (existing) existing.remove();

        var errorBox = document.createElement("p");
        errorBox.className = "order-error-message";
        errorBox.textContent = message;
        elements.orderSubmitButton.parentNode.insertBefore(errorBox, elements.orderSubmitButton);
    }

    // ---------------------------------------------------------
    // Cart + wishlist action buttons
    // ---------------------------------------------------------

    var WISHLIST_KEY = "darchatt_wishlist";

    function readWishlist() {
        try {
            var raw = localStorage.getItem(WISHLIST_KEY);
            var ids = raw ? JSON.parse(raw) : [];
            return Array.isArray(ids) ? ids : [];
        } catch (err) {
            return [];
        }
    }

    function writeWishlist(ids) {
        try {
            localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
        } catch (err) {
            console.error("product.js:", err);
        }
    }

    function inWishlist() {
        return readWishlist().indexOf(product.id) !== -1;
    }

    function toggleWishlist(button) {
        var ids = readWishlist();
        var index = ids.indexOf(product.id);

        if (index === -1) {
            ids.push(product.id);
        } else {
            ids.splice(index, 1);
        }

        writeWishlist(ids);
        updateWishlistButton(button);
    }

    function updateWishlistButton(button) {
        if (!button) return;
        button.classList.toggle("is-active", inWishlist());
        button.setAttribute("aria-pressed", String(inWishlist()));
        button.querySelector("span").textContent = inWishlist()
            ? "إزالة من المفضلة"
            : "أضف إلى المفضلة";
    }

    function renderActionButtons() {
        if (!elements.orderBox || isOutOfStock()) return;

        var existing = document.getElementById("productActionButtons");
        if (existing) existing.remove();

        var box = document.createElement("div");
        box.id = "productActionButtons";
        box.className = "product-action-buttons";
        box.innerHTML =
            '<button type="button" class="product-cart-btn" id="addToCartButton">' +
            "أضف إلى السلة" +
            "</button>" +
            '<button type="button" class="product-wishlist-btn" aria-pressed="false" id="wishlistToggleButton">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21C12 21 3 14.5 3 8.5C3 5.5 5.5 3.5 8 3.5C9.8 3.5 11.2 4.5 12 6C12.8 4.5 14.2 3.5 16 3.5C18.5 3.5 21 5.5 21 8.5C21 14.5 12 21 12 21Z"/></svg>' +
            "<span>أضف إلى المفضلة</span>" +
            "</button>";

        elements.orderBox.insertBefore(box, elements.orderForm);

        var addToCartButton = document.getElementById("addToCartButton");
        if (addToCartButton) {
            addToCartButton.addEventListener("click", function () {
                window.DarChattCart.add(product);
                window.DarChattCart.open();
            });
        }

        var wishlistButton = document.getElementById("wishlistToggleButton");
        if (wishlistButton) {
            wishlistButton.addEventListener("click", function () {
                toggleWishlist(wishlistButton);
            });
            updateWishlistButton(wishlistButton);
        }
    }

    // ---------------------------------------------------------
    // Init
    // ---------------------------------------------------------

    function showLoading() {
        elements.loading.hidden = false;
        elements.error.hidden = true;
        elements.content.hidden = true;
    }

    function showError() {
        elements.loading.hidden = true;
        elements.error.hidden = false;
        elements.content.hidden = true;
    }

    function showContent() {
        elements.loading.hidden = true;
        elements.error.hidden = true;
        elements.content.hidden = false;
    }

    async function init() {
        cacheElements();

        if (!supabase || !elements.gallery) {
            showError();
            return;
        }

        var params = new URLSearchParams(window.location.search);
        var productId = params.get("id");

        if (!productId) {
            showError();
            return;
        }

        showLoading();

        var result = await supabase
            .from("products")
            .select("id, name_ar, name_en, description_ar, description_en, slug, price, old_price, is_sale, stock, stock_status, allow_out_of_stock, image_url, images, is_active, meta_title, meta_description, categories(name, slug)")
            .eq("id", productId)
            .maybeSingle();

        if (result.error || !result.data || !result.data.is_active) {
            showError();
            return;
        }

        product = result.data;
        showContent();
        renderInfo();
        bindQuantity();
        setQuantity(1);
        renderActionButtons();

        elements.orderForm.addEventListener("submit", placeOrder);
    }

    document.addEventListener("DOMContentLoaded", init);
})();