(() => {
  const STORAGE_KEY = "eventsfactory.v1";
  const STATUSES = [
    { id: "todo", label: "To do" },
    { id: "in_progress", label: "In progress" },
    { id: "done", label: "Done" },
    { id: "blocked", label: "Blocked" },
  ];
  const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.id, s.label]));
  const CREW_COLORS = ["#d4af37", "#6ea8fe", "#f0a36b", "#7bdcb5", "#d4a5c9", "#e07a6a", "#b8a1ff"];

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
    sidebar: document.querySelector(".sidebar"),
    backdrop: document.getElementById("backdrop"),
  };

  const VIEW_COPY = {
    calendar: { kicker: "Calendar", title: "Production month" },
    board: { kicker: "Orders", title: "What the floor owes today" },
    events: { kicker: "Events", title: "Books & call sheets" },
    team: { kicker: "Team", title: "Who takes the orders" },
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

  let db = loadDb();

  function uid(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
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

  function loadDb() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      /* fall through to seed */
    }
    return seedDb();
  }

  function saveDb() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  function seedDb() {
    const today = new Date();
    const iso = (offset) => toISODate(addDays(today, offset));
    const users = [
      { id: "u_maya", name: "Maya Chen", email: "maya@eventsfactory.studio", password: "demo", role: "manager", title: "Operations manager", color: CREW_COLORS[0] },
      { id: "u_alex", name: "Alex Rivera", email: "alex@eventsfactory.studio", password: "demo", role: "crew", title: "Lighting lead", color: CREW_COLORS[1] },
      { id: "u_jordan", name: "Jordan Blake", email: "jordan@eventsfactory.studio", password: "demo", role: "crew", title: "Catering captain", color: CREW_COLORS[2] },
      { id: "u_sam", name: "Sam Okonkwo", email: "sam@eventsfactory.studio", password: "demo", role: "crew", title: "Logistics", color: CREW_COLORS[3] },
      { id: "u_riley", name: "Riley Chen", email: "riley@eventsfactory.studio", password: "demo", role: "crew", title: "Floral & décor", color: CREW_COLORS[4] },
    ];
    const events = [
      { id: "e_wedding", name: "Harper & Cole wedding", client: "Harper Cole", venue: "The Glasshouse", date: iso(3), endDate: iso(3), type: "Wedding", notes: "Ceremony 4pm. Load-in from 8am.", createdBy: "u_maya" },
      { id: "e_summit", name: "Apex Tech Summit", client: "Apex Labs", venue: "Harbor Convention Center", date: iso(9), endDate: iso(10), type: "Corporate", notes: "Two-day keynote + expo floor.", createdBy: "u_maya" },
      { id: "e_gallery", name: "Luna Gallery opening", client: "Luna Arts", venue: "Luna Gallery", date: iso(17), endDate: iso(17), type: "Exhibition", notes: "Invite-only preview at 6pm.", createdBy: "u_maya" },
    ];
    const orders = [
      { id: "o1", title: "Confirm florist delivery window", details: "Call Bloom & Branch. Need peonies on site by 10:00.", eventId: "e_wedding", assigneeId: "u_riley", dueDate: iso(0), dueTime: "09:30", priority: "high", status: "in_progress", createdBy: "u_maya" },
      { id: "o2", title: "Pull Glasshouse lighting plot", details: "Front-of-house warm wash, no color on vows.", eventId: "e_wedding", assigneeId: "u_alex", dueDate: iso(0), dueTime: "11:00", priority: "urgent", status: "todo", createdBy: "u_maya" },
      { id: "o3", title: "Van load-in checklist", details: "China, linens, signage, spare gaffer.", eventId: "e_wedding", assigneeId: "u_sam", dueDate: iso(2), dueTime: "16:00", priority: "normal", status: "todo", createdBy: "u_maya" },
      { id: "o4", title: "Menu tasting with couple", details: "Vegetarian main + late-night grilled cheese.", eventId: "e_wedding", assigneeId: "u_jordan", dueDate: iso(1), dueTime: "14:00", priority: "high", status: "todo", createdBy: "u_maya" },
      { id: "o5", title: "Ceremony seating chart print", details: "Final headcount 148. Escort cards in navy.", eventId: "e_wedding", assigneeId: "u_riley", dueDate: iso(3), dueTime: "08:00", priority: "normal", status: "todo", createdBy: "u_maya" },
      { id: "o6", title: "Stage power drop for keynote", details: "32A to center. Confirm house electrician.", eventId: "e_summit", assigneeId: "u_alex", dueDate: iso(8), dueTime: "10:00", priority: "urgent", status: "todo", createdBy: "u_maya" },
      { id: "o7", title: "Expo booth load map", details: "Dock 3 overnight. No forklift after 07:00.", eventId: "e_summit", assigneeId: "u_sam", dueDate: iso(8), dueTime: "18:00", priority: "high", status: "todo", createdBy: "u_maya" },
      { id: "o8", title: "Speaker green-room catering", details: "Coffee + fruit. No nuts. 40 covers.", eventId: "e_summit", assigneeId: "u_jordan", dueDate: iso(9), dueTime: "07:30", priority: "normal", status: "todo", createdBy: "u_maya" },
      { id: "o9", title: "Gallery lighting focus", details: "No UV on oils. Dim to 40% for preview.", eventId: "e_gallery", assigneeId: "u_alex", dueDate: iso(16), dueTime: "13:00", priority: "normal", status: "todo", createdBy: "u_maya" },
      { id: "o10", title: "Collect radios from last gig", details: "6 packs still at The Glasshouse office.", eventId: "", assigneeId: "u_sam", dueDate: iso(0), dueTime: "15:00", priority: "low", status: "done", createdBy: "u_maya" },
    ];
    const seeded = { users, events, orders, sessionUserId: null };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  function currentUser() {
    return db.users.find((u) => u.id === db.sessionUserId) || null;
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
        <button type="button" class="demo-btn" data-demo="${esc(u.id)}">
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

  function orderActions(order) {
    const canEdit = isManager();
    const canMove = isManager() || order.assigneeId === currentUser().id;
    const statusBtns = STATUSES.filter((s) => s.id !== order.status)
      .map((s) => `<button type="button" class="mini-btn" data-status="${s.id}" data-order="${esc(order.id)}">${esc(s.label)}</button>`)
      .join("");
    return `
      <div class="row-actions">
        ${canMove ? statusBtns : ""}
        ${canEdit ? `<button type="button" class="mini-btn" data-edit-order="${esc(order.id)}">Edit</button>` : ""}
        ${canEdit ? `<button type="button" class="mini-btn" data-delete-order="${esc(order.id)}">Remove</button>` : ""}
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
    if (ui.view === "calendar") els.viewTitle.textContent = VIEW_COPY.calendar.title;

    els.calendarGrid.classList.toggle("is-week", ui.range === "week");
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
        const cls = [
          "day-cell",
          inMonth ? "" : "is-outside",
          sameDay(day, today) ? "is-today" : "",
          iso === ui.selectedDate ? "is-selected" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return `<button type="button" class="${cls}" data-date="${iso}" aria-label="${esc(formatLong(iso))}">
          <span class="day-num">${day.getDate()}</span>
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

  function renderBoard() {
    const orders = visibleOrders().filter((o) => ui.boardFilter === "all" || o.status === ui.boardFilter);
    const columns = STATUSES.map((status) => {
      const cards = orders
        .filter((o) => o.status === status.id)
        .map((o) => {
          const person = userById(o.assigneeId);
          const event = eventById(o.eventId);
          return `
            <article class="order-card">
              <h4>${esc(o.title)}</h4>
              <p class="muted">${esc(formatShort(o.dueDate))}${o.dueTime ? " · " + esc(o.dueTime) : ""}${event ? " · " + esc(event.name) : ""}</p>
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
    renderAll();
  }

  function showLogin() {
    els.app.hidden = true;
    els.loginScreen.hidden = false;
    renderDemoAccounts();
  }

  function signIn(email, password) {
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) return false;
    db.sessionUserId = user.id;
    saveDb();
    ui.assigneeFilter = user.role === "manager" ? "all" : user.id;
    showApp();
    toast(`Signed in as ${user.name}`);
    return true;
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
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.view === view);
    });
    document.querySelectorAll(".view").forEach((section) => {
      section.classList.toggle("is-visible", section.id === `view-${view}`);
    });
    const copy = VIEW_COPY[view];
    els.viewKicker.textContent = copy.kicker;
    els.viewTitle.textContent = copy.title;
    els.sidebar.classList.remove("open");
    els.backdrop.hidden = true;
    if (view === "calendar") renderCalendar();
    if (view === "board") renderBoard();
    if (view === "events") renderEvents();
    if (view === "team") renderTeam();
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

  els.loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const ok = signIn(els.loginEmail.value.trim(), els.loginPassword.value);
    setError(els.loginError, ok ? "" : "Those credentials do not match a desk account.");
  });

  els.demoAccounts.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-demo]");
    if (!btn) return;
    const user = userById(btn.dataset.demo);
    if (user) signIn(user.email, user.password);
  });

  els.signOut.addEventListener("click", () => {
    db.sessionUserId = null;
    saveDb();
    showLogin();
  });

  document.querySelector(".side-nav").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-view]");
    if (!btn || btn.hidden) return;
    setView(btn.dataset.view);
  });

  els.newOrderBtn.addEventListener("click", () => openOrderModal());
  els.newEventBtn.addEventListener("click", () => openEventModal());
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
  });

  document.body.addEventListener("click", (event) => {
    const statusBtn = event.target.closest("[data-status]");
    if (statusBtn) {
      const order = db.orders.find((o) => o.id === statusBtn.dataset.order);
      if (!order) return;
      if (!isManager() && order.assigneeId !== currentUser().id) return;
      order.status = statusBtn.dataset.status;
      saveDb();
      renderAll();
      toast(`Order marked ${STATUS_LABEL[order.status].toLowerCase()}`);
      return;
    }
    const editOrder = event.target.closest("[data-edit-order]");
    if (editOrder && isManager()) {
      openOrderModal(db.orders.find((o) => o.id === editOrder.dataset.editOrder));
      return;
    }
    const deleteOrder = event.target.closest("[data-delete-order]");
    if (deleteOrder && isManager()) {
      db.orders = db.orders.filter((o) => o.id !== deleteOrder.dataset.deleteOrder);
      saveDb();
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
      const id = deleteEvent.dataset.deleteEvent;
      db.events = db.events.filter((e) => e.id !== id);
      db.orders.forEach((o) => {
        if (o.eventId === id) o.eventId = "";
      });
      saveDb();
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

  els.orderForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!isManager()) return;
    const form = els.orderForm;
    const title = form.title.value.trim();
    if (!title) {
      setError(document.getElementById("order-form-error"), "Give the order a title.");
      return;
    }
    const payload = {
      title,
      assigneeId: form.assigneeId.value,
      eventId: form.eventId.value,
      dueDate: form.dueDate.value,
      dueTime: form.dueTime.value,
      priority: form.priority.value,
      details: form.details.value.trim(),
    };
    if (form.id.value) {
      const existing = db.orders.find((o) => o.id === form.id.value);
      Object.assign(existing, payload);
      toast("Order updated");
    } else {
      db.orders.push({
        id: uid("o"),
        status: "todo",
        createdBy: currentUser().id,
        ...payload,
      });
      toast("Order issued");
    }
    saveDb();
    els.orderModal.close();
    ui.selectedDate = payload.dueDate;
    ui.cursor = startOfMonth(parseISODate(payload.dueDate));
    renderAll();
  });

  els.eventForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!isManager()) return;
    const form = els.eventForm;
    const name = form.name.value.trim();
    if (!name) {
      setError(document.getElementById("event-form-error"), "Name the event.");
      return;
    }
    const payload = {
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
    if (form.id.value) {
      Object.assign(db.events.find((e) => e.id === form.id.value), payload);
      toast("Event updated");
    } else {
      db.events.push({ id: uid("e"), createdBy: currentUser().id, ...payload });
      toast("Event added");
    }
    saveDb();
    els.eventModal.close();
    ui.selectedDate = payload.date;
    ui.cursor = startOfMonth(parseISODate(payload.date));
    renderAll();
  });

  els.addMemberForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!isManager()) return;
    const data = new FormData(els.addMemberForm);
    const email = String(data.get("email")).trim().toLowerCase();
    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      toast("That email is already on the roster");
      return;
    }
    db.users.push({
      id: uid("u"),
      name: String(data.get("name")).trim(),
      email,
      password: "demo",
      role: String(data.get("role")),
      title: String(data.get("title")).trim(),
      color: CREW_COLORS[db.users.length % CREW_COLORS.length],
    });
    saveDb();
    els.addMemberForm.reset();
    renderAll();
    toast("Crew added — they sign in with password demo");
  });

  els.menuToggle.addEventListener("click", () => {
    const open = !els.sidebar.classList.contains("open");
    els.sidebar.classList.toggle("open", open);
    els.backdrop.hidden = !open;
  });
  els.backdrop.addEventListener("click", () => {
    els.sidebar.classList.remove("open");
    els.backdrop.hidden = true;
  });

  if (db.sessionUserId && currentUser()) {
    showApp();
  } else {
    db.sessionUserId = null;
    showLogin();
  }
})();
