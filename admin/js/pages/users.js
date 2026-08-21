// =============================================================
// Dar Chatt — Admin Users List
// Search / filter / paginate profiles, change user roles.
// Guards: never change your own role, confirm before changes.
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;
    var S = window.AdminShared;

    var PAGE_SIZE = 15;

    var state = {
        search: "",
        role: "all",
        page: 1,
        users: [],
        session: null
    };

    // ---------------------------------------------------------
    // Data loading
    // ---------------------------------------------------------

    async function loadAllUsers() {
        var result = await S.fetchAll(
            supabase
                .from("profiles")
                .select("id, full_name, email, role, phone, created_at")
                .order("created_at", { ascending: false })
        );
        if (result.error) return null;
        return result.data;
    }

    function loadUsers() {
        var tableBody = document.getElementById("usersTableBody");
        if (!tableBody) return;

        tableBody.innerHTML =
            '<tr><td colspan="7" class="cell-muted">جاري تحميل المستخدمين...</td></tr>';

        loadAllUsers().then(function (users) {
            if (users === null) {
                tableBody.innerHTML =
                    '<tr><td colspan="7" class="cell-muted">تعذر تحميل المستخدمين.</td></tr>';
                return;
            }

            state.users = users;
            renderTable();
        });
    }

    // ---------------------------------------------------------
    // Rendering
    // ---------------------------------------------------------

    function getFiltered() {
        var search = state.search.trim().toLowerCase();

        return state.users.filter(function (user) {
            var matchesRole =
                state.role === "all" || (user.role || "customer") === state.role;

            var haystack = ((user.full_name || "") + " " + (user.email || "")).toLowerCase();
            var matchesSearch = !search || haystack.indexOf(search) !== -1;

            return matchesRole && matchesSearch;
        });
    }

    function renderTable() {
        var tableBody = document.getElementById("usersTableBody");
        var emptyBox = document.getElementById("usersEmpty");
        var pagination = document.getElementById("usersPagination");
        var pagesContainer = document.getElementById("usersPages");
        var countElement = document.getElementById("usersCount");

        var filtered = getFiltered();

        if (filtered.length === 0) {
            tableBody.innerHTML = "";
            if (emptyBox) emptyBox.hidden = false;
            if (pagination) pagination.hidden = true;
            return;
        }

        if (emptyBox) emptyBox.hidden = true;

        var totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
        if (state.page > totalPages) state.page = totalPages;

        var start = (state.page - 1) * PAGE_SIZE;
        var pageItems = filtered.slice(start, start + PAGE_SIZE);
        var offset = start + 1;

        var rows = pageItems.map(function (user, index) {
            var isSelf = state.session && user.id === state.session.user.id;
            var roleLabel = user.role === "admin" ? "مدير" : "عميل";
            var roleCss = user.role === "admin" ? "admin-badge admin-badge-admin" : "admin-badge admin-badge-customer";

            var actions;
            if (isSelf) {
                actions = '<span class="cell-muted">حسابك الحالي</span>';
            } else {
                actions =
                    '<button type="button" class="table-action" data-user-id="' +
                    S.escapeHtml(user.id) +
                    '" data-user-name="' +
                    S.escapeHtml(user.full_name || user.email || "") +
                    '" data-new-role="' +
                    (user.role === "admin" ? "customer" : "admin") +
                    '">' +
                    (user.role === "admin" ? "إزالة صلاحية المدير" : "منح صلاحية المدير") +
                    "</button>";
            }

            return (
                "<tr>" +
                "<td>" + (offset + index) + "</td>" +
                "<td>" + S.escapeHtml(user.full_name || "—") + "</td>" +
                '<td dir="ltr">' + S.escapeHtml(user.email || "—") + "</td>" +
                '<td><span class="' + roleCss + '">' + roleLabel + "</span></td>" +
                '<td dir="ltr">' + S.escapeHtml(user.phone || "—") + "</td>" +
                "<td>" + S.formatDate(user.created_at) + "</td>" +
                "<td>" + actions + "</td>" +
                "</tr>"
            );
        }).join("");

        tableBody.innerHTML = rows;
        pagination.hidden = false;

        if (countElement) {
            countElement.textContent = filtered.length + " مستخدم";
        }

        renderPages(pagesContainer, totalPages);
        bindRoleButtons();
    }

    function renderPages(container, totalPages) {
        if (!container) return;

        var html = "";
        for (var i = 1; i <= totalPages; i++) {
            html +=
                '<button type="button" class="page-button' +
                (i === state.page ? " is-current" : "") +
                '" data-page="' +
                i +
                '">' +
                i +
                "</button>";
        }
        container.innerHTML = html;

        Array.prototype.forEach.call(container.querySelectorAll("[data-page]"), function (btn) {
            btn.addEventListener("click", function () {
                state.page = Number(btn.getAttribute("data-page"));
                renderTable();
            });
        });
    }

    // ---------------------------------------------------------
    // Role change
    // ---------------------------------------------------------

    function bindRoleButtons() {
        var tableBody = document.getElementById("usersTableBody");
        if (!tableBody) return;

        Array.prototype.forEach.call(tableBody.querySelectorAll("[data-new-role]"), function (btn) {
            btn.addEventListener("click", function () {
                changeRole(btn);
            });
        });
    }

    async function changeRole(button) {
        var userId = button.getAttribute("data-user-id");
        var userName = button.getAttribute("data-user-name");
        var newRole = button.getAttribute("data-new-role");

        var isAdminGrant = newRole === "admin";
        var confirmText = isAdminGrant
            ? "سيتم منح صلاحيات الإدارة الكاملة لـ " + userName + ". هل أنت متأكد؟"
            : "سيتم إزالة صلاحيات الإدارة من " + userName + ". هل أنت متأكد؟";

        var confirmed = await S.confirmDialog({
            title: isAdminGrant ? "منح صلاحية المدير" : "إزالة صلاحية المدير",
            message: confirmText,
            confirmLabel: isAdminGrant ? "منح الصلاحية" : "إزالة الصلاحية",
            danger: !isAdminGrant
        });

        if (!confirmed) return;

        button.disabled = true;

        var result = await supabase
            .from("profiles")
            .update({ role: newRole })
            .eq("id", userId);

        if (result.error) {
            S.toast("فشل تغيير الدور: " + (result.error.message || "خطأ غير معروف"), "error");
            button.disabled = false;
            return;
        }

        await S.logActivity(state.session, "user.role", "user", userId, {
            target_email: userName,
            new_role: newRole
        });

        S.toast("تم تحديث الدور بنجاح", "success");
        loadUsers();
    }

    // ---------------------------------------------------------
    // Bootstrap
    // ---------------------------------------------------------

    window.AdminAuth.initAdminPage({
        active: "users",
        title: "المستخدمون",
        onReady: function (user) {
            state.session = { user: user };
            loadUsers();

            var searchInput = document.getElementById("userSearch");
            var roleFilter = document.getElementById("roleFilter");
            var retryButton = document.getElementById("retryUsersButton");

            if (searchInput) {
                searchInput.addEventListener(
                    "input",
                    S.debounce(function () {
                        state.search = searchInput.value;
                        state.page = 1;
                        renderTable();
                    })
                );
            }

            if (roleFilter) {
                roleFilter.addEventListener("change", function () {
                    state.role = roleFilter.value;
                    state.page = 1;
                    renderTable();
                });
            }

            if (retryButton) {
                retryButton.addEventListener("click", loadUsers);
            }
        }
    });
})();