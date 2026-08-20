// =============================================================
// Dar Chatt — Order Details (admin)
// Customer, delivery, items, summary, status change with
// confirmation, cancellation, status history.
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;
    var S = window.AdminShared;

    var orderId = S.getParam("id");
    var session = null;
    var currentOrder = null;
    var currentItems = [];

    function setText(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function buildStatusOptions(selected) {
        return Object.keys(S.ORDER_STATUSES).map(function (key) {
            var info = S.ORDER_STATUSES[key];
            return '<option value="' + key + '"' + (key === selected ? " selected" : "") + ">" + info.label + "</option>";
        }).join("");
    }

    async function loadOrder() {
        var result = await supabase
            .from("orders")
            .select("*")
            .eq("id", orderId)
            .maybeSingle();

        if (result.error || !result.data) {
            S.toast("تعذر تحميل الطلب: " + ((result.error && result.error.message) || "غير موجود"), "error");
            setText("orderViewTitle", "الطلب غير موجود");
            return null;
        }

        return result.data;
    }

    async function loadItems() {
        var result = await supabase
            .from("order_items")
            .select("id, product_id, product_name, product_image, unit_price, quantity, subtotal")
            .eq("order_id", orderId)
            .order("created_at", { ascending: true });

        return result.error ? [] : (result.data || []);
    }

    async function loadHistory() {
        var result = await supabase
            .from("order_status_history")
            .select("id, status, changed_at")
            .eq("order_id", orderId)
            .order("changed_at", { ascending: false });

        return result.error ? [] : (result.data || []);
    }

    function renderOrder(order, items, history) {
        currentOrder = order;

        setText("orderViewTitle", "طلب " + order.order_number);
        setText("orderViewCustomerName", order.customer_name || "—");
        setText("orderViewCustomerPhone", order.customer_phone || "—");
        setText("orderViewCustomerEmail", order.customer_email || "غير متوفر");
        setText("orderViewCity", order.city || "—");
        setText("orderViewAddress", order.address || "—");
        setText("orderViewNotes", order.notes || "لا توجد ملاحظات");
        setText("orderViewSubtotal", S.formatMoney(order.subtotal));
        setText("orderViewShipping", S.formatMoney(order.shipping_fee));
        setText("orderViewDiscount", S.formatMoney(order.discount));
        setText("orderViewTotal", S.formatMoney(order.total));
        setText("orderViewPayment", order.payment_method === "cod" ? "الدفع عند الاستلام" : (order.payment_method || "—"));

        var statusSelect = document.getElementById("orderViewStatusSelect");
        if (statusSelect) {
            statusSelect.innerHTML = buildStatusOptions(order.status);
        }

        // Items table
        var itemsBody = document.getElementById("orderViewItemsBody");
        if (itemsBody) {
            if (items.length === 0) {
                itemsBody.innerHTML = '<tr><td colspan="5" class="cell-muted">لا توجد منتجات.</td></tr>';
            } else {
                itemsBody.innerHTML = items.map(function (item) {
                    var thumb = item.product_image
                        ? '<img class="product-thumb" src="' + S.escapeHtml(item.product_image) + '" alt="">'
                        : '<span class="product-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--muted)">—</span>';

                    return (
                        "<tr>" +
                        "<td>" + thumb + "</td>" +
                        "<td>" + S.escapeHtml(item.product_name) + "</td>" +
                        "<td>" + S.formatMoney(item.unit_price) + "</td>" +
                        "<td>" + S.formatNumber(item.quantity) + "</td>" +
                        '<td style="font-weight:700">' + S.formatMoney(item.subtotal) + "</td>" +
                        "</tr>"
                    );
                }).join("");
            }
        }

        // Status history
        var historyBox = document.getElementById("orderViewHistory");
        if (historyBox) {
            if (history.length === 0) {
                historyBox.innerHTML = '<p class="cell-muted" style="padding:8px 0">لا يوجد سجل بعد.</p>';
            } else {
                historyBox.innerHTML = history.map(function (entry) {
                    var info = S.ORDER_STATUSES[entry.status] || { label: entry.status, css: "" };
                    return (
                        '<div class="recent-item" style="padding:10px 0">' +
                        '<span class="recent-body">' +
                        '<span class="recent-title">' + info.label + "</span>" +
                        '<span class="recent-sub">' + S.formatDateTime(entry.changed_at) + "</span>" +
                        "</span>" +
                        "</div>"
                    );
                }).join("");
            }
        }
    }

    // ---------------------------------------------------------
    // Status change
    // ---------------------------------------------------------

    async function updateStatus(newStatus, silent) {
        if (!currentOrder) return;

        if (newStatus === currentOrder.status) {
            if (!silent) S.toast("الطلب في هذه الحالة بالفعل.", "error");
            return;
        }

        var result = await supabase
            .from("orders")
            .update({ status: newStatus })
            .eq("id", orderId);

        if (result.error) {
            S.toast("تعذر تحديث الحالة: " + (result.error.message || ""), "error");
            return;
        }

        // Record the change in the status history.
        await supabase.from("order_status_history").insert({
            order_id: orderId,
            status: newStatus,
            changed_by: session ? session.user.id : null
        });

        // Audit trail.
        S.logActivity(session, "order.status", "order", orderId, {
            from: currentOrder.status,
            to: newStatus
        });

        currentOrder.status = newStatus;
        S.toast("تم تحديث حالة الطلب إلى \"" + (S.ORDER_STATUSES[newStatus] || { label: newStatus }).label + "\"", "success");

        loadHistory().then(function (history) {
            renderOrder(currentOrder, currentItems, history);
        });
    }

    function handleUpdateStatusClick() {
        var select = document.getElementById("orderViewStatusSelect");
        if (!select || !currentOrder) return;

        var newStatus = select.value;

        if (newStatus === "cancelled") {
            handleCancelOrder();
            return;
        }

        updateStatus(newStatus, false);
    }

    async function handleCancelOrder() {
        if (!currentOrder) return;

        if (currentOrder.status === "cancelled") {
            S.toast("الطلب ملغى بالفعل.", "error");
            return;
        }

        var confirmed = await S.confirmDialog({
            title: "إلغاء الطلب",
            message:
                "هل أنت متأكد من إلغاء الطلب " + currentOrder.order_number + "؟" +
                " لا يمكن التراجع عن هذا الإجراء.",
            confirmLabel: "إلغاء الطلب"
        });

        if (!confirmed) return;

        await updateStatus("cancelled", true);

        var select = document.getElementById("orderViewStatusSelect");
        if (select) select.value = "cancelled";
    }

    // ---------------------------------------------------------
    // Init
    // ---------------------------------------------------------

    function initOrderView() {
        if (!orderId) {
            S.toast("معرّف الطلب غير موجود.", "error");
            return;
        }

        var updateButton = document.getElementById("orderViewUpdateStatusButton");
        if (updateButton) {
            updateButton.addEventListener("click", handleUpdateStatusClick);
        }

        var cancelButton = document.getElementById("orderViewCancelButton");
        if (cancelButton) {
            cancelButton.addEventListener("click", handleCancelOrder);
        }

        loadOrder().then(function (order) {
            if (!order) return;
            Promise.all([loadItems(), loadHistory()]).then(function (results) {
                currentItems = results[0];
                renderOrder(order, results[0], results[1]);
            });
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        window.AdminAuth.initAdminPage({
            active: "orders",
            title: "تفاصيل الطلب",
            onReady: function (user) {
                session = { user: user };
                initOrderView();
            }
        });
    });
})();