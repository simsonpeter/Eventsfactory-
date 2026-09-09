(() => {
  const STATUSES = [
    { id: "todo", label: "To do" },
    { id: "in_progress", label: "In progress" },
    { id: "done", label: "Done" },
    { id: "blocked", label: "Blocked" },
  ];
  const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.id, s.label]));

  const db = { me: null, users: [], events: [], orders: [] };

  const els = {
    loginScreen: document.getElementById("login-screen"),
    app: document.getElementById("app"),
    loginForm: document.getElementById("login-form"),
    loginEmail: document.getElementById("login-email"),
    loginPassword: document.getElementById("login-password"),
    loginError: document.getElementById("login-error"),
    demoAccounts: document.getElementById("demo-accounts"),
    sessionCard: document.getElementById("session-card"),
    signOut: document.getElementById("sign-out"),
    viewKicker: document.getElementById("view-kicker"),
    viewTitle: document.getElementById("view-title"),
    search: document.getElementById("search"),
    newEventBtn: document.getElementById("new-event-btn"),
    newOrderBtn: document.getElementById("new-order-btn"),
    calendarGrid: document.getElementById("calendar-grid"),
    periodLabel: document.getElementById("period-label"),
    dayPanelTitle: document.getElementById("day-panel-title"),
    dayPanelBody: document.getElementById("day-panel-body"),
    assigneeFilter: document.getElementById("assignee-filter"),
    boardColumns: document.getElementById("board-columns"),
    eventsList: document.getElementById("events-list"),
    teamList: document.getElementById("team-list"),
    addMemberForm: document.getElementById("add-member-form"),
    orderModal: document.getElementById("order-modal"),
    eventModal: document.getElementById("event-modal"),
    orderForm: document.getElementById("order-form"),
    eventForm: document.getElementById("event-form"),
    toast: document.getElementById("toast"),
    menuToggle: document.getElementById("menu-toggle"),
    menuClose: document.getElementById("menu-close"),
    sidebar: document.querySelector(".sidebar"),
    backdrop: document.getElementById("backdrop"),
    fabOrder: document.getElementById("fab-order"),
  };

  const VIEW_COPY = {
    calendar: { kicker: "Calendar", title: "Production month", short: "Production month" },
    board: { kicker: "Orders", title: "What the floor owes today", short: "On the floor" },
    events: { kicker: "Events", title: "Books & call sheets", short: "Call sheets" },
    team: { kicker: "Team", title: "Who takes the orders", short: "Roster" },
  };

  const ui = {
    view: "calendar",
    range: "month",
    cursor: startOfMonth(new Date()),
    selectedDate: toISODate(new Date()),
    search: "",
    assigneeFilter: "all",
    boardFilter: "all",
  };

  function isNarrow() {
    return window.matchMedia("(max-width: 800px)").matches;
  }

  function closeMenu() {
    els.sidebar.classList.remove("open");
    els.backdrop.hidden = true;
  }

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
      ...opts,
    });
    return res;
  }

  function applyPayload(payload) {
    db.me = payload.me || null;
    db.users = payload.users || [];
    db.events = payload.events || [];
    db.orders = payload.orders || [];
  }

  async function mutate(path, opts = {}) {
    try {
      const res = await api(path, opts);
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(payload.error || "Save failed");
        return false;
      }
      applyPayload(payload);
      return true;
    } catch {
      toast("Can't reach the desk database. Run npm start.");
      return false;
    }
  }

  function toISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function parseISODate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function addDays(date, n) {
    const next = new Date(date);
    next.setDate(next.getDate() + n);
    return next;
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function startOfWeek(date) {
    const next = new Date(date);
    next.setDate(date.getDate() - date.getDay());
    next.setHours(0, 0, 0, 0);
    return next;
  }

  function sameDay(a, b) {
    return toISODate(a) === toISODate(b);
  }

  function formatLong(iso) {
    return parseISODate(iso).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatShort(iso) {
    return parseISODate(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function initials(name) {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");
  }

  function currentUser() {
    return db.me;
  }

  function isManager() {
    return currentUser()?.role === "manager";
  }

  function userById(id) {
    return db.users.find((u) => u.id === id);
  }

  function eventById(id) {
    return db.events.find((e) => e.id === id);
  }

  function visibleOrders() {
    const me = currentUser();
    if (!me) return [];
    let list = isManager() ? [...db.orders] : db.orders.filter((o) => o.assigneeId === me.id);
    if (ui.assigneeFilter !== "all") list = list.filter((o) => o.assigneeId === ui.assigneeFilter);
    if (ui.search) {
      const q = ui.search.toLowerCase();
      list = list.filter((o) => {
        const eventName = eventById(o.eventId)?.name || "";
        const assignee = userById(o.assigneeId)?.name || "";
        return [o.title, o.details, eventName, assignee].join(" ").toLowerCase().includes(q);
      });
    }
    return list.sort((a, b) => `${a.dueDate}${a.dueTime || ""}`.localeCompare(`${b.dueDate}${b.dueTime || ""}`));
  }

  function visibleEvents() {
    const me = currentUser();
    if (!me) return [];
    let list = [...db.events];
    if (!isManager()) {
      const myEventIds = new Set(db.orders.filter((o) => o.assigneeId === me.id).map((o) => o.eventId));
      list = list.filter((e) => myEventIds.has(e.id));
    }
    if (ui.search) {
      const q = ui.search.toLowerCase();
      list = list.filter((e) => [e.name, e.client, e.venue, e.type].join(" ").toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }

  function eventTouchesDate(event, iso) {
    const start = event.date;
    const end = event.endDate && event.endDate > event.date ? event.endDate : event.date;
    return iso >= start && iso <= end;
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      els.toast.hidden = true;
    }, 2400);
  }

  function setError(node, message) {
    if (!message) {
      node.hidden = true;
      node.textContent = "";
      return;
    }
    node.hidden = false;
    node.textContent = message;
  }

  function applyRoleChrome() {
    document.querySelectorAll("[data-manager-only]").forEach((node) => {
      node.hidden = !isManager();
    });
    if (!isManager() && ui.view === "team") setView("calendar");
  }

  function renderSession() {
    const me = currentUser();
    if (!me) return;
    els.sessionCard.innerHTML = `
      <span class="avatar" style="background:${esc(me.color)}">${esc(initials(me.name))}</span>
      <div>
        <strong>${esc(me.name)}</strong>
        <span>${esc(me.title)} · ${esc(me.role)}</span>
      </div>
    `;
  }

  function renderDemoAccounts() {
    els.demoAccounts.innerHTML = db.users
      .map(
        (u) => `
        <button type="button" class="demo-btn" data-demo-email="${esc(u.email)}">
          <span>${esc(u.name)}<br><small>${esc(u.title)}</small></span>
          <small>${esc(u.role)}</small>
        </button>`
      )
      .join("");
  }

  function fillAssigneeFilter() {
    const previous = ui.assigneeFilter;
    const people = isManager() ? db.users : db.users.filter((u) => u.id === currentUser().id);
    els.assigneeFilter.innerHTML =
      (isManager() ? `<option value="all">Everyone</option>` : "") +
      people.map((u) => `<option value="${esc(u.id)}">${esc(u.name)}</option>`).join("");
    ui.assigneeFilter = [...els.assigneeFilter.options].some((o) => o.value === previous) ? previous : els.assigneeFilter.options[0].value;
    els.assigneeFilter.value = ui.assigneeFilter;
  }

  function fillOrderSelects() {
    const crew = db.users.filter((u) => u.role === "crew" || u.role === "manager");
    els.orderForm.assigneeId.innerHTML = crew
      .map((u) => `<option value="${esc(u.id)}">${esc(u.name)} — ${esc(u.title)}</option>`)
      .join("");
    els.orderForm.eventId.innerHTML =
      `<option value="">No event — general ops</option>` +
      db.events
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((e) => `<option value="${esc(e.id)}">${esc(e.name)}</option>`)
        .join("");
  }

  function orderMeta(order) {
    const person = userById(order.assigneeId);
    const event = eventById(order.eventId);
    return `
      <div class="meta">
        <span class="tag ${esc(order.status)}">${esc(STATUS_LABEL[order.status] || order.status)}</span>
        <span class="tag ${esc(order.priority)}">${esc(order.priority)}</span>
        ${person ? `<span class="tag">${esc(person.name)}</span>` : ""}
        ${event ? `<span class="tag">${esc(event.name)}</span>` : ""}
        ${order.dueTime ? `<span class="tag">${esc(order.dueTime)}</span>` : ""}
      </div>
    `;
  }

  function formatDue(order) {
    const today = toISODate(new Date());
    const tomorrow = toISODate(addDays(new Date(), 1));
    let day = formatShort(order.dueDate);
    if (order.dueDate === today) day = "Today";
    else if (order.dueDate === tomorrow) day = "Tomorrow";
    return `${day}${order.dueTime ? " · " + order.dueTime : ""}`;
  }

  function orderActions(order) {
    const canEdit = isManager();
    const canMove = isManager() || order.assigneeId === currentUser().id;
    const manage = canEdit
      ? `<span class="manage-btns">
           <button type="button" class="mini-btn" data-edit-order="${esc(order.id)}">Edit</button>
           <button type="button" class="mini-btn" data-delete-order="${esc(order.id)}">Remove</button>
         </span>`
      : "";
    if (isNarrow()) {
      const picker = canMove
        ? `<label class="status-picker">
            <span class="sr-only">Status</span>
            <select data-status-select data-order="${esc(order.id)}">
              ${STATUSES.map((s) => `<option value="${esc(s.id)}" ${s.id === order.status ? "selected" : ""}>${esc(s.label)}</option>`).join("")}
            </select>
          </label>`
        : `<span class="tag ${esc(order.status)}">${esc(STATUS_LABEL[order.status] || order.status)}</span>`;
      return `<div class="row-actions compact-actions">${picker}</div>`;
    }
    const statusBtns = STATUSES.filter((s) => s.id !== order.status)
      .map((s) => `<button type="button" class="mini-btn" data-status="${s.id}" data-order="${esc(order.id)}">${esc(s.label)}</button>`)
      .join("");
    return `
      <div class="row-actions">
        ${canMove ? statusBtns : ""}
        ${manage}
      </div>
    `;
  }

  function calendarDays() {
    if (ui.range === "week") {
      const start = startOfWeek(ui.selectedDate ? parseISODate(ui.selectedDate) : new Date());
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const first = startOfMonth(ui.cursor);
    const start = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }

  function renderCalendar() {
    const today = new Date();
    const days = calendarDays();
    const orders = visibleOrders();
    const events = visibleEvents();
    if (ui.range === "month") {
      els.periodLabel.textContent = ui.cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      VIEW_COPY.calendar.title = "Production month";
    } else {
      const start = days[0];
      const end = days[6];
      els.periodLabel.textContent = `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
      VIEW_COPY.calendar.title = "Production week";
    }
    if (ui.view === "calendar") els.viewTitle.textContent = isNarrow() ? VIEW_COPY.calendar.short : VIEW_COPY.calendar.title;

    els.calendarGrid.classList.toggle("is-week", ui.range === "week");
    document.querySelector(".calendar-card")?.classList.toggle("is-week", ui.range === "week");
    els.calendarGrid.innerHTML = days
      .map((day) => {
        const iso = toISODate(day);
        const inMonth = day.getMonth() === ui.cursor.getMonth() || ui.range === "week";
        const dayEvents = events.filter((e) => eventTouchesDate(e, iso));
        const dayOrders = orders.filter((o) => o.dueDate === iso);
        const chipBudget = ui.range === "week" ? 8 : 3;
        const eventBudget = Math.min(dayEvents.length, ui.range === "week" ? 3 : 2);
        const orderBudget = Math.max(0, chipBudget - eventBudget);
        const overflow = Math.max(0, dayEvents.length + dayOrders.length - eventBudget - Math.min(orderBudget, dayOrders.length));
        const chips = [
          ...dayEvents.slice(0, eventBudget).map((e) => `<span class="chip-event">${esc(e.name)}</span>`),
          ...dayOrders.slice(0, orderBudget).map((o) => {
            const person = userById(o.assigneeId);
            return `<span class="chip-order" style="background:${esc(person?.color || "#9aa3b0")}">${esc(o.title)}</span>`;
          }),
        ];
        if (overflow) chips.push(`<span class="more-count">+${overflow} more</span>`);
        const dots = [
          ...dayEvents.map(() => "#d4af37"),
          ...dayOrders.map((o) => userById(o.assigneeId)?.color || "#9aa3b0"),
        ];
        const extraDots = Math.max(0, dots.length - 4);
        const dotHtml = dots.length
          ? `<span class="dot-row">${dots
              .slice(0, 4)
              .map((color) => `<i class="dot" style="background:${esc(color)}"></i>`)
              .join("")}${extraDots ? `<span class="more-count">+</span>` : ""}</span>`
          : "";
        const weekday = day.toLocaleDateString(undefined, { weekday: "short" });
        const cls = [
          "day-cell",
          inMonth ? "" : "is-outside",
          sameDay(day, today) ? "is-today" : "",
          iso === ui.selectedDate ? "is-selected" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return `<button type="button" class="${cls}" data-date="${iso}" aria-label="${esc(formatLong(iso))}">
          <span class="day-num">${ui.range === "week" ? `<strong>${esc(weekday)}</strong> ` : ""}${day.getDate()}</span>
          ${dotHtml}
          ${chips.join("")}
        </button>`;
      })
      .join("");

    renderDayPanel();
  }

  function renderDayPanel() {
    const iso = ui.selectedDate;
    if (!iso) {
      els.dayPanelTitle.textContent = "Pick a date";
      els.dayPanelBody.innerHTML = `<p class="empty-hint">Choose a day to see events and orders.</p>`;
      return;
    }
    els.dayPanelTitle.textContent = formatLong(iso);
    const events = visibleEvents().filter((e) => eventTouchesDate(e, iso));
    const orders = visibleOrders().filter((o) => o.dueDate === iso);
    if (!events.length && !orders.length) {
      els.dayPanelBody.innerHTML = `<p class="empty-hint">Nothing booked this day.${isManager() ? " Issue an order or add an event." : ""}</p>`;
      return;
    }
    els.dayPanelBody.innerHTML = [
      ...events.map(
        (e) => `
        <article class="item-row">
          <h4>${esc(e.name)}</h4>
          <p class="muted">${esc(e.type)} · ${esc(e.venue || "Venue TBD")} · ${esc(e.client || "Client TBD")}</p>
          ${e.notes ? `<p class="muted">${esc(e.notes)}</p>` : ""}
        </article>`
      ),
      ...orders.map(
        (o) => `
        <article class="item-row">
          <h4>${esc(o.title)}</h4>
          ${orderMeta(o)}
          ${o.details ? `<p class="muted">${esc(o.details)}</p>` : ""}
          ${orderActions(o)}
        </article>`
      ),
    ].join("");
  }

  function renderBoardFilters(allOrders) {
    const labels = { all: "All", todo: "To do", in_progress: "Doing", done: "Done", blocked: "Blocked" };
    document.querySelectorAll("[data-board-filter]").forEach((chip) => {
      const key = chip.dataset.boardFilter;
      const n = key === "all" ? allOrders.length : allOrders.filter((o) => o.status === key).length;
      chip.textContent = `${labels[key] || key} ${n}`;
      chip.classList.toggle("is-active", ui.boardFilter === key);
    });
  }

  function renderBoard() {
    const allOrders = visibleOrders();
    renderBoardFilters(allOrders);
    const rank = { todo: 0, in_progress: 1, blocked: 2, done: 3 };
    const orders = allOrders
      .filter((o) => ui.boardFilter === "all" || o.status === ui.boardFilter)
      .sort((a, b) => {
        if (ui.boardFilter === "all") {
          const byStatus = (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
          if (byStatus) return byStatus;
        }
        return `${a.dueDate}${a.dueTime || ""}`.localeCompare(`${b.dueDate}${b.dueTime || ""}`);
      });

    if (isNarrow()) {
      els.boardColumns.className = "order-feed";
      if (!orders.length) {
        els.boardColumns.innerHTML = `<p class="empty-hint">No orders in this lane.</p>`;
        return;
      }
      els.boardColumns.innerHTML = orders
        .map((o) => {
          const person = userById(o.assigneeId);
          const event = eventById(o.eventId);
          return `
            <article class="order-card compact">
              <div class="order-card-top">
                <h4 ${isManager() ? `class="edit-title" data-edit-order="${esc(o.id)}"` : ""}>${esc(o.title)}</h4>
                <span class="tag ${esc(o.priority)}">${esc(o.priority)}</span>
              </div>
              <p class="muted">${esc(formatDue(o))}${event ? " · " + esc(event.name) : ""}</p>
              <div class="order-card-foot">
                ${person ? `<span class="who"><span class="avatar" style="width:22px;height:22px;font-size:0.6rem;background:${esc(person.color)}">${esc(initials(person.name))}</span>${esc(person.name.split(" ")[0])}</span>` : ""}
                ${orderActions(o)}
              </div>
            </article>`;
        })
        .join("");
      return;
    }

    els.boardColumns.className = "board-columns";
    const columns = STATUSES.map((status) => {
      const cards = orders
        .filter((o) => o.status === status.id)
        .map((o) => {
          const person = userById(o.assigneeId);
          const event = eventById(o.eventId);
          return `
            <article class="order-card">
              <h4>${esc(o.title)}</h4>
              <p class="muted">${esc(formatDue(o))}${event ? " · " + esc(event.name) : ""}</p>
              <div class="meta">
                ${person ? `<span class="avatar" style="width:22px;height:22px;font-size:0.6rem;background:${esc(person.color)}">${esc(initials(person.name))}</span>` : ""}
                <span class="tag ${esc(o.priority)}">${esc(o.priority)}</span>
              </div>
              ${orderActions(o)}
            </article>`;
        })
        .join("");
      return `
        <div class="board-col">
          <h3>${esc(status.label)} · ${orders.filter((o) => o.status === status.id).length}</h3>
          ${cards || `<p class="empty-hint">No orders</p>`}
        </div>`;
    }).join("");
    els.boardColumns.innerHTML = columns;
  }

  function renderEvents() {
    const events = visibleEvents();
    if (!events.length) {
      els.eventsList.innerHTML = `<p class="empty-hint">No events on your books yet.</p>`;
      return;
    }
    els.eventsList.innerHTML = events
      .map((e) => {
        const related = db.orders.filter((o) => o.eventId === e.id);
        const mine = isManager() ? related : related.filter((o) => o.assigneeId === currentUser().id);
        const range = e.endDate && e.endDate !== e.date ? `${formatShort(e.date)} – ${formatShort(e.endDate)}` : formatShort(e.date);
        return `
          <article class="event-card">
            <header>
              <div>
                <p class="eyebrow">${esc(e.type)}</p>
                <h3>${esc(e.name)}</h3>
              </div>
              ${isManager() ? `<div class="row-actions">
                <button type="button" class="mini-btn" data-edit-event="${esc(e.id)}">Edit</button>
                <button type="button" class="mini-btn" data-delete-event="${esc(e.id)}">Remove</button>
              </div>` : ""}
            </header>
            <p class="muted">${esc(range)} · ${esc(e.venue || "Venue TBD")} · ${esc(e.client || "Client TBD")}</p>
            ${e.notes ? `<p class="muted">${esc(e.notes)}</p>` : ""}
            <p class="muted">${mine.length} order${mine.length === 1 ? "" : "s"} on this event</p>
          </article>`;
      })
      .join("");
  }

  function renderTeam() {
    els.teamList.innerHTML = db.users
      .map((u) => {
        const count = db.orders.filter((o) => o.assigneeId === u.id && o.status !== "done").length;
        return `
          <article class="team-card">
            <header>
              <div class="session-card" style="border:0;padding:0">
                <span class="avatar" style="background:${esc(u.color)}">${esc(initials(u.name))}</span>
                <div>
                  <strong>${esc(u.name)}</strong>
                  <span>${esc(u.title)} · ${esc(u.role)}</span>
                </div>
              </div>
            </header>
            <p class="muted">${esc(u.email)}</p>
            <p class="muted">${count} open order${count === 1 ? "" : "s"}</p>
          </article>`;
      })
      .join("");
  }

  function renderAll() {
    applyRoleChrome();
    renderSession();
    fillAssigneeFilter();
    renderCalendar();
    renderBoard();
    renderEvents();
    if (isManager()) renderTeam();
  }

  function showApp() {
    els.loginScreen.hidden = true;
    els.app.hidden = false;
    ui.search = "";
    if (els.search) els.search.value = "";
    setView("calendar");
    renderAll();
  }

  async function showLogin() {
    els.app.hidden = true;
    els.loginScreen.hidden = false;
    try {
      const res = await api("/api/desks");
      if (!res.ok) throw new Error("desk");
      db.users = await res.json();
      db.me = null;
      renderDemoAccounts();
    } catch {
      els.demoAccounts.innerHTML = "";
      setError(els.loginError, "Can't reach the desk database. Run npm start.");
    }
  }

  async function signIn(email, password) {
    try {
      const res = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) return payload.error || "Those credentials do not match a desk account.";
      applyPayload(payload);
      ui.assigneeFilter = currentUser().role === "manager" ? "all" : currentUser().id;
      showApp();
      toast(`Signed in as ${currentUser().name}`);
      return true;
    } catch {
      return "Can't reach the desk database. Run npm start.";
    }
  }

  function openOrderModal(order) {
    fillOrderSelects();
    els.orderForm.reset();
    document.getElementById("order-modal-title").textContent = order ? "Edit order" : "Issue order";
    setError(document.getElementById("order-form-error"), "");
    els.orderForm.id.value = order?.id || "";
    els.orderForm.title.value = order?.title || "";
    els.orderForm.assigneeId.value = order?.assigneeId || db.users.find((u) => u.role === "crew")?.id || "";
    els.orderForm.eventId.value = order?.eventId || "";
    els.orderForm.dueDate.value = order?.dueDate || ui.selectedDate || toISODate(new Date());
    els.orderForm.dueTime.value = order?.dueTime || "";
    els.orderForm.priority.value = order?.priority || "normal";
    els.orderForm.details.value = order?.details || "";
    const deleteBtn = document.getElementById("delete-order-btn");
    deleteBtn.hidden = !order || !isManager();
    deleteBtn.dataset.deleteOrder = order?.id || "";
    els.orderModal.showModal();
  }

  function openEventModal(event) {
    els.eventForm.reset();
    document.getElementById("event-modal-title").textContent = event ? "Edit event" : "New event";
    setError(document.getElementById("event-form-error"), "");
    els.eventForm.id.value = event?.id || "";
    els.eventForm.name.value = event?.name || "";
    els.eventForm.client.value = event?.client || "";
    els.eventForm.venue.value = event?.venue || "";
    els.eventForm.date.value = event?.date || ui.selectedDate || toISODate(new Date());
    els.eventForm.endDate.value = event?.endDate || "";
    els.eventForm.type.value = event?.type || "Wedding";
    els.eventForm.notes.value = event?.notes || "";
    els.eventModal.showModal();
  }

  function setView(view) {
    ui.view = view;
    document.querySelectorAll(".nav-btn, .tab-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.view === view);
    });
    document.querySelectorAll(".view").forEach((section) => {
      section.classList.toggle("is-visible", section.id === `view-${view}`);
    });
    const copy = VIEW_COPY[view];
    els.viewKicker.textContent = copy.kicker;
    els.viewTitle.textContent = isNarrow() ? copy.short : copy.title;
    document.body.dataset.view = view;
    closeMenu();
    if (view === "calendar") renderCalendar();
    if (view === "board") renderBoard();
    if (view === "events") renderEvents();
    if (view === "team") renderTeam();
    if (isNarrow()) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function shiftPeriod(dir) {
    if (ui.range === "week") {
      const base = ui.selectedDate ? parseISODate(ui.selectedDate) : new Date();
      const next = addDays(base, dir * 7);
      ui.selectedDate = toISODate(next);
      ui.cursor = startOfMonth(next);
    } else {
      ui.cursor = new Date(ui.cursor.getFullYear(), ui.cursor.getMonth() + dir, 1);
    }
    renderCalendar();
  }

  els.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const result = await signIn(els.loginEmail.value.trim(), els.loginPassword.value);
    setError(els.loginError, result === true ? "" : result);
  });

  els.demoAccounts.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-demo-email]");
    if (!btn) return;
    const result = await signIn(btn.dataset.demoEmail, "demo");
    setError(els.loginError, result === true ? "" : result);
  });

  els.signOut.addEventListener("click", async () => {
    await api("/api/logout", { method: "POST" }).catch(() => {});
    db.me = null;
    closeMenu();
    await showLogin();
  });

  document.querySelector(".side-nav").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-view]");
    if (!btn || btn.hidden) return;
    setView(btn.dataset.view);
  });
  document.getElementById("mobile-nav").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-view]");
    if (!btn || btn.hidden) return;
    setView(btn.dataset.view);
  });

  document.getElementById("delete-order-btn").addEventListener("click", async () => {
    if (!isManager()) return;
    const id = document.getElementById("delete-order-btn").dataset.deleteOrder;
    if (!id) return;
    if (!(await mutate(`/api/orders/${id}`, { method: "DELETE" }))) return;
    els.orderModal.close();
    renderAll();
    toast("Order removed");
  });
  els.newOrderBtn.addEventListener("click", () => openOrderModal());
  els.fabOrder.addEventListener("click", () => openOrderModal());
  els.newEventBtn.addEventListener("click", () => openEventModal());
  document.getElementById("sidebar-new-event").addEventListener("click", () => {
    closeMenu();
    openEventModal();
  });
  document.getElementById("mobile-new-event").addEventListener("click", () => openEventModal());
  document.getElementById("prev-period").addEventListener("click", () => shiftPeriod(-1));
  document.getElementById("next-period").addEventListener("click", () => shiftPeriod(1));
  document.getElementById("today-btn").addEventListener("click", () => {
    const now = new Date();
    ui.cursor = startOfMonth(now);
    ui.selectedDate = toISODate(now);
    renderCalendar();
  });

  document.querySelectorAll("[data-range]").forEach((btn) => {
    btn.addEventListener("click", () => {
      ui.range = btn.dataset.range;
      document.querySelectorAll("[data-range]").forEach((b) => b.classList.toggle("is-active", b === btn));
      renderCalendar();
    });
  });

  els.assigneeFilter.addEventListener("change", () => {
    ui.assigneeFilter = els.assigneeFilter.value;
    renderAll();
  });

  els.search.addEventListener("input", () => {
    ui.search = els.search.value.trim();
    renderAll();
  });

  document.querySelector(".board-filters").addEventListener("click", (event) => {
    const chip = event.target.closest("[data-board-filter]");
    if (!chip) return;
    ui.boardFilter = chip.dataset.boardFilter;
    document.querySelectorAll("[data-board-filter]").forEach((c) => c.classList.toggle("is-active", c === chip));
    renderBoard();
  });

  els.calendarGrid.addEventListener("click", (event) => {
    const cell = event.target.closest("[data-date]");
    if (!cell) return;
    ui.selectedDate = cell.dataset.date;
    renderCalendar();
    if (isNarrow()) {
      document.querySelector(".day-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  document.body.addEventListener("change", async (event) => {
    const picker = event.target.closest("[data-status-select]");
    if (!picker) return;
    const order = db.orders.find((o) => o.id === picker.dataset.order);
    if (!order) return;
    if (!isManager() && order.assigneeId !== currentUser().id) return;
    if (!(await mutate(`/api/orders/${order.id}`, { method: "PATCH", body: JSON.stringify({ status: picker.value }) }))) return;
    const y = window.scrollY;
    renderAll();
    window.scrollTo(0, y);
    toast(`Order marked ${STATUS_LABEL[picker.value].toLowerCase()}`);
  });

  document.body.addEventListener("click", async (event) => {
    const statusBtn = event.target.closest("[data-status]");
    if (statusBtn) {
      const order = db.orders.find((o) => o.id === statusBtn.dataset.order);
      if (!order) return;
      if (!isManager() && order.assigneeId !== currentUser().id) return;
      if (!(await mutate(`/api/orders/${order.id}`, { method: "PATCH", body: JSON.stringify({ status: statusBtn.dataset.status }) }))) return;
      renderAll();
      toast(`Order marked ${STATUS_LABEL[statusBtn.dataset.status].toLowerCase()}`);
      return;
    }
    const editOrder = event.target.closest("[data-edit-order]");
    if (editOrder && isManager()) {
      openOrderModal(db.orders.find((o) => o.id === editOrder.dataset.editOrder));
      return;
    }
    const deleteOrder = event.target.closest("[data-delete-order]");
    if (deleteOrder && isManager()) {
      if (!(await mutate(`/api/orders/${deleteOrder.dataset.deleteOrder}`, { method: "DELETE" }))) return;
      renderAll();
      toast("Order removed");
      return;
    }
    const editEvent = event.target.closest("[data-edit-event]");
    if (editEvent && isManager()) {
      openEventModal(db.events.find((e) => e.id === editEvent.dataset.editEvent));
      return;
    }
    const deleteEvent = event.target.closest("[data-delete-event]");
    if (deleteEvent && isManager()) {
      if (!(await mutate(`/api/events/${deleteEvent.dataset.deleteEvent}`, { method: "DELETE" }))) return;
      renderAll();
      toast("Event removed");
    }
  });

  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      els.orderModal.close();
      els.eventModal.close();
    });
  });

  els.orderForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isManager()) return;
    const form = els.orderForm;
    const title = form.title.value.trim();
    if (!title) {
      setError(document.getElementById("order-form-error"), "Give the order a title.");
      return;
    }
    const payload = {
      id: form.id.value || undefined,
      title,
      assigneeId: form.assigneeId.value,
      eventId: form.eventId.value,
      dueDate: form.dueDate.value,
      dueTime: form.dueTime.value,
      priority: form.priority.value,
      details: form.details.value.trim(),
    };
    if (!(await mutate("/api/orders", { method: "POST", body: JSON.stringify(payload) }))) return;
    toast(form.id.value ? "Order updated" : "Order issued");
    els.orderModal.close();
    ui.selectedDate = payload.dueDate;
    ui.cursor = startOfMonth(parseISODate(payload.dueDate));
    renderAll();
  });

  els.eventForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isManager()) return;
    const form = els.eventForm;
    const name = form.name.value.trim();
    if (!name) {
      setError(document.getElementById("event-form-error"), "Name the event.");
      return;
    }
    const payload = {
      id: form.id.value || undefined,
      name,
      client: form.client.value.trim(),
      venue: form.venue.value.trim(),
      date: form.date.value,
      endDate: form.endDate.value || form.date.value,
      type: form.type.value,
      notes: form.notes.value.trim(),
    };
    if (payload.endDate && payload.endDate < payload.date) {
      setError(document.getElementById("event-form-error"), "End date cannot be before start date.");
      return;
    }
    if (!(await mutate("/api/events", { method: "POST", body: JSON.stringify(payload) }))) return;
    toast(form.id.value ? "Event updated" : "Event added");
    els.eventModal.close();
    ui.selectedDate = payload.date;
    ui.cursor = startOfMonth(parseISODate(payload.date));
    renderAll();
  });

  els.addMemberForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isManager()) return;
    const data = new FormData(els.addMemberForm);
    const ok = await mutate("/api/users", {
      method: "POST",
      body: JSON.stringify({
        name: String(data.get("name")).trim(),
        email: String(data.get("email")).trim().toLowerCase(),
        title: String(data.get("title")).trim(),
        role: String(data.get("role")),
      }),
    });
    if (!ok) return;
    els.addMemberForm.reset();
    renderAll();
    toast("Crew added — they sign in with password demo");
  });

  els.menuToggle.addEventListener("click", () => {
    const open = !els.sidebar.classList.contains("open");
    els.sidebar.classList.toggle("open", open);
    els.backdrop.hidden = !open;
  });
  els.menuClose.addEventListener("click", closeMenu);
  els.backdrop.addEventListener("click", closeMenu);

  let resizeTick;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTick);
    resizeTick = setTimeout(() => {
      if (currentUser() && ui.view === "calendar") renderCalendar();
    }, 160);
  });

  (async () => {
    try {
      const res = await api("/api/state");
      if (res.ok) {
        applyPayload(await res.json());
        ui.assigneeFilter = currentUser().role === "manager" ? "all" : currentUser().id;
        showApp();
        return;
      }
    } catch {
      /* show login */
    }
    await showLogin();
  })();
})();
