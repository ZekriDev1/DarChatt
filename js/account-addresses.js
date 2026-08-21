// =============================================================
// Dar Chatt — Account Addresses
// Full CRUD on the customer_addresses table (RLS scoped to the
// current user). Uses a single form for add/edit.
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    window.AccountGuard.init({
        onReady: function (session) {
            var loading = document.getElementById("addressesLoading");
            var list = document.getElementById("addressesList");
            var empty = document.getElementById("addressesEmpty");
            var form = document.getElementById("addressForm");
            var errorBox = document.getElementById("addressError");
            var successBox = document.getElementById("addressSuccess");
            var submitButton = document.getElementById("addressSubmitButton");
            var submitLabel = document.getElementById("addressSubmitLabel");
            var formTitle = document.getElementById("addressFormTitle");

            var idInput = document.getElementById("addressId");
            var labelInput = document.getElementById("addressLabel");
            var fullNameInput = document.getElementById("addressFullName");
            var phoneInput = document.getElementById("addressPhone");
            var cityInput = document.getElementById("addressCity");
            var streetInput = document.getElementById("addressStreet");
            var notesInput = document.getElementById("addressNotes");

            function showError(message) {
                successBox.hidden = true;
                errorBox.textContent = message;
                errorBox.hidden = false;
            }

            function showSuccess(message) {
                errorBox.hidden = true;
                successBox.textContent = message;
                successBox.hidden = false;
            }

            function resetForm() {
                idInput.value = "";
                form.reset();
                formTitle.textContent = "إضافة عنوان";
                submitLabel.textContent = "حفظ العنوان";
            }

            async function load() {
                loading.hidden = false;
                list.hidden = true;
                empty.hidden = true;

                var result = await supabase
                    .from("customer_addresses")
                    .select("id, label, full_name, phone, city, street, notes")
                    .order("created_at", { ascending: false });

                loading.hidden = true;

                if (result.error) {
                    showError("تعذر تحميل العناوين.");
                    return;
                }

                var addresses = result.data || [];

                if (addresses.length === 0) {
                    empty.hidden = false;
                    return;
                }

                list.hidden = false;
                list.innerHTML = addresses
                    .map(function (address) {
                        return (
                            '<div class="address-card">' +
                            '<div class="address-card-header">' +
                            '<span class="address-card-label">' + escapeHtml(address.label) + "</span>" +
                            '<span class="address-card-actions">' +
                            '<button type="button" class="address-edit-btn" data-address-id="' + escapeHtml(address.id) + '">تعديل</button>' +
                            '<button type="button" class="address-delete-btn" data-address-id="' + escapeHtml(address.id) + '">حذف</button>' +
                            "</span>" +
                            "</div>" +
                            '<p class="address-card-name">' + escapeHtml(address.full_name) + " — <span dir=\"ltr\">" + escapeHtml(address.phone) + "</span></p>" +
                            '<p class="address-card-line">' + escapeHtml(address.city) + "، " + escapeHtml(address.street) + "</p>" +
                            (address.notes ? '<p class="address-card-line address-card-notes">' + escapeHtml(address.notes) + "</p>" : "") +
                            "</div>"
                        );
                    })
                    .join("");

                list.querySelectorAll(".address-edit-btn").forEach(function (button) {
                    button.addEventListener("click", function () {
                        var address = addresses.find(function (a) {
                            return a.id === button.getAttribute("data-address-id");
                        });
                        if (!address) return;

                        idInput.value = address.id;
                        labelInput.value = address.label || "";
                        fullNameInput.value = address.full_name || "";
                        phoneInput.value = address.phone || "";
                        cityInput.value = address.city || "";
                        streetInput.value = address.street || "";
                        notesInput.value = address.notes || "";

                        formTitle.textContent = "تعديل العنوان";
                        submitLabel.textContent = "حفظ التعديلات";
                        form.scrollIntoView({ behavior: "smooth", block: "center" });
                    });
                });

                list.querySelectorAll(".address-delete-btn").forEach(function (button) {
                    button.addEventListener("click", async function () {
                        if (!window.confirm("هل أنت متأكد من حذف هذا العنوان؟")) return;

                        var result = await supabase
                            .from("customer_addresses")
                            .delete()
                            .eq("id", button.getAttribute("data-address-id"));

                        if (result.error) {
                            showError("تعذر حذف العنوان.");
                            return;
                        }

                        if (idInput.value === button.getAttribute("data-address-id")) {
                            resetForm();
                        }

                        showSuccess("تم حذف العنوان.");
                        load();
                    });
                });
            }

            form.addEventListener("submit", async function (event) {
                event.preventDefault();

                var payload = {
                    label: labelInput.value.trim() || "المنزل",
                    full_name: fullNameInput.value.trim(),
                    phone: phoneInput.value.trim(),
                    city: cityInput.value.trim(),
                    street: streetInput.value.trim(),
                    notes: notesInput.value.trim() || null
                };

                if (!payload.full_name) return showError("يرجى إدخال الاسم الكامل.");
                if (!payload.phone) return showError("يرجى إدخال رقم الهاتف.");
                if (!payload.city) return showError("يرجى إدخال المدينة.");
                if (!payload.street) return showError("يرجى إدخال العنوان الكامل.");

                submitButton.disabled = true;
                submitLabel.textContent = "جاري الحفظ...";
                errorBox.hidden = true;

                var editing = idInput.value;
                var result = editing
                    ? await supabase
                          .from("customer_addresses")
                          .update(payload)
                          .eq("id", editing)
                    : await supabase
                          .from("customer_addresses")
                          .insert({ user_id: session.user.id, ...payload });

                submitButton.disabled = false;
                submitLabel.textContent = editing ? "حفظ التعديلات" : "حفظ العنوان";

                if (result.error) {
                    showError(result.error.message || "تعذر حفظ العنوان.");
                    return;
                }

                showSuccess(editing ? "تم تحديث العنوان." : "تمت إضافة العنوان.");
                resetForm();
                load();
            });

            load();
        }
    });
})();