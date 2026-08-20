// =============================================================
// Dar Chatt — Admin Activity Log
// =============================================================

(function () {
    "use strict";

    var supabase = window.DarChattSupabase;
    var S = window.AdminShared;

    var PAGE_SIZE = 20;

    var state = {
        search: "",
        action: "all",
        page: 1,
        logs: []
    };

    async function loadActivity() {
        var tableBody = document.getElementById("activityTableBody");
        if (!tableBody) return;

        tableBody.innerHTML =
            '<tr><td colspan="5" class="cell-muted">جاري تحميل السجل...</td></tr>';

        var result = await S.fetchAll(
            supabase.from("admin_activity_logs").select(
                "id, admin_email, action, entity_type, entity_id, created_at"
            )
        );

        if (result.error) {
            tableBody.innerHTML =
                '<tr><td colspan="5" class="cell-muted">تعذر تحميل السجل.</td></tr>';
            return;
        }

        state.logs = (result.data || []).sort(function (a, b) {
            return new Date(b.created_at) - new Date(a.created_at);
        });

        renderTable();
    }

    function getFiltered() {
        var search = state.search.trim().toLowerCase();

        return state.logs.filter(function (log) {
            var matchesAction = state.action === "all" || log.action === state.action;
            var matchesSearch = !search ||
                String(log.admin_email || "").toLowerCase().indexOf(search) !== -1;
            return matchesAction && matchesSearch;
        });
    }

    function renderTable() {
        var tableBody = document.getElementById("activityTableBody");
        var emptyBox = document.getElementById("activityEmpty");
        var pagination = document.getElementById("activityPagination");
        var pagesContainer = document.getElementById("activityPages");
        var countElement = document.getElementById("activityCount");

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
        var pageRows = filtered.slice(start, start + PAGE_SIZE);

        tableBody.innerHTML = pageRows.map(function (log) {
            var actionLabel = S.ACTIVITY_ACTIONS[log.action] || log.action || "—";
            var entity = log.entity_id || (log.entity_type || "");
            var created = new Date(log.created_at);

            return (
                "<tr>" +
                '<td class="activity-action-label">' + S.escapeHtml(log.admin_email || "—") + "</td>" +
                "<td>" + S.escapeHtml(actionLabel) + "</td>" +
                '<td class="activity-entity">' + S.escapeHtml(entity || "—") + "</td>" +
                '<td class="cell-muted">' + S.formatDate(created) + "</td>" +
                '<td class="cell-muted">' + S.formatDateTime(created).split("، ").pop() + "</td>" +
                "</tr>"
            );
        }).join("");

        if (pagination) {
            pagination.hidden = false;
            if (countElement) {
                countElement.textContent = filtered.length + " سجل";
            }
            if (pagesContainer) {
                var buttons = "";
                if (state.page > 1) {
                    buttons += '<button type="button" class="page-button" data-page="' + (state.page - 1) + '">السابق</button>';
                }
                for (var p = 1; p <= totalPages; p++) {
                    var isCurrent = p === state.page ? " is-current" : "";
                    buttons += '<button type="button" class="page-button' + isCurrent + '" data-page="' + p + '">' + p + "</button>";
                }
                if (state.page < totalPages) {
                    buttons += '<button type="button" class="page-button" data-page="' + (state.page + 1) + '">التالي</button>';
                }
                pagesContainer.innerHTML = buttons;
            }
        }
    }

    function bindEvents() {
        var searchInput = document.getElementById("activitySearch");
        if (searchInput) {
            searchInput.addEventListener("input", S.debounce(function () {
                state.search = searchInput.value;
                state.page = 1;
                renderTable();
            }, 300));
        }

        var actionFilter = document.getElementById("actionFilter");
        if (actionFilter) {
            actionFilter.addEventListener("change", function () {
                state.action = actionFilter.value;
                state.page = 1;
                renderTable();
            });
        }

        var pagesContainer = document.getElementById("activityPages");
        if (pagesContainer) {
            pagesContainer.addEventListener("click", function (event) {
                var button = event.target.closest("[data-page]");
                if (!button) return;
                state.page = Number(button.getAttribute("data-page"));
                renderTable();
            });
        }
    }

    function initActivity() {
        bindEvents();
        loadActivity();
    }

    document.addEventListener("DOMContentLoaded", function () {
        window.AdminAuth.initAdminPage({
            active: "activity",
            title: "سجل النشاط",
            onReady: initActivity
        });
    });
})();