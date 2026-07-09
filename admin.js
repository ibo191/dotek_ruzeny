const store = window.DotekBooking;
const reservationList = document.querySelector("[data-reservations]");
const reservationFilter = document.querySelector("[data-reservation-filter]");
const availabilityForm = document.querySelector("[data-availability-form]");
const availabilityList = document.querySelector("[data-availability-list]");
const slotEditor = document.querySelector("[data-slot-editor]");
const serviceForm = document.querySelector("[data-service-form]");
const serviceList = document.querySelector("[data-services]");
const seedMonthButton = document.querySelector("[data-seed-month]");
const exportButton = document.querySelector("[data-export]");

let state = store.seedAvailability(store.loadState());

function saveAndRender(nextState = state) {
  state = store.normalizeState(nextState);
  store.saveState(state);
  renderAdmin();
}

function statusLabel(status) {
  return {
    pending: "Čeká",
    confirmed: "Potvrzeno",
    cancelled: "Zrušeno",
  }[status] || status;
}

function statusClass(status) {
  return `status status--${status || "pending"}`;
}

function renderStats() {
  const futureAvailability = Object.entries(state.availability)
    .filter(([date, day]) => date >= store.todayKey() && !day.closed)
    .reduce((sum, [, day]) => sum + (Array.isArray(day.slots) ? day.slots.length : 0), 0);

  document.querySelector("[data-stat-pending]").textContent = state.reservations.filter(
    (reservation) => reservation.status === "pending",
  ).length;
  document.querySelector("[data-stat-confirmed]").textContent = state.reservations.filter(
    (reservation) => reservation.status === "confirmed",
  ).length;
  document.querySelector("[data-stat-slots]").textContent = futureAvailability;
  document.querySelector("[data-stat-services]").textContent = store.getActiveServices(state).length;
}

function renderReservations() {
  if (!reservationList) {
    return;
  }

  const filter = reservationFilter?.value || "all";
  const reservations = [...state.reservations]
    .filter((reservation) => filter === "all" || reservation.status === filter)
    .sort((left, right) => `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`));

  if (!reservations.length) {
    reservationList.innerHTML = '<div class="empty-state">Zatím zde nejsou žádné rezervace.</div>';
    return;
  }

  reservationList.innerHTML = reservations
    .map((reservation) => {
      return `
        <article class="reservation-item" data-reservation-id="${reservation.id}">
          <div class="reservation-main">
            <strong>${reservation.name || "Bez jména"}</strong>
            <span>${reservation.serviceName || "Služba"} · ${store.formatDateKey(reservation.date)} v ${reservation.time}</span>
            <span>${reservation.phone || "Bez telefonu"}${reservation.message ? ` · ${reservation.message}` : ""}</span>
          </div>
          <span class="${statusClass(reservation.status)}">${statusLabel(reservation.status)}</span>
          <div class="row-actions">
            <button class="small-button small-button--primary" type="button" data-action="confirm">Potvrdit</button>
            <button class="small-button" type="button" data-action="pending">Vrátit</button>
            <button class="small-button small-button--danger" type="button" data-action="cancel">Zrušit</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderSlotEditor(dateKeyValue = availabilityForm?.elements.date.value) {
  if (!slotEditor) {
    return;
  }

  const allSlots = [...new Set([...store.defaultWeekdaySlots, ...store.defaultSaturdaySlots])].sort();
  const selectedSlots = new Set(state.availability[dateKeyValue]?.slots || []);

  slotEditor.innerHTML = allSlots
    .map((slot) => {
      const checked = selectedSlots.has(slot) ? "checked" : "";
      return `
        <label class="slot-pill">
          <input type="checkbox" name="slot" value="${slot}" ${checked}>
          ${slot}
        </label>
      `;
    })
    .join("");
}

function renderAvailability() {
  if (!availabilityList) {
    return;
  }

  const upcoming = Object.entries(state.availability)
    .filter(([date]) => date >= store.todayKey())
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(0, 18);

  if (!upcoming.length) {
    availabilityList.innerHTML = '<div class="empty-state">Nie sú nastavené žiadne budúce dostupné termíny.</div>';
    return;
  }

  availabilityList.innerHTML = upcoming
    .map(([date, day]) => {
      const slotText = day.closed ? "Zavřeno" : (day.slots || []).join(", ");
      return `
        <article class="availability-item" data-date="${date}">
          <div>
            <strong>${store.formatDateKey(date)}</strong>
            <span>${slotText || "Žádné sloty"}</span>
          </div>
          <span class="${day.closed ? "status status--cancelled" : "status status--confirmed"}">
            ${day.closed ? "Zavřeno" : "Otevřeno"}
          </span>
          <div class="row-actions">
            <button class="small-button" type="button" data-action="edit-date">Upravit</button>
            <button class="small-button small-button--danger" type="button" data-action="close-date">Zavřít</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderServices() {
  if (!serviceList) {
    return;
  }

  serviceList.innerHTML = state.services
    .map((service) => {
      const checked = service.active ? "checked" : "";
      return `
        <article class="service-item" data-service-id="${service.id}">
          <div class="service-main">
            <label>
              Název
              <input type="text" value="${service.name}" data-field="name">
            </label>
          </div>
          <div class="form-row">
            <label>
              Min
              <input type="number" min="15" step="5" value="${service.duration}" data-field="duration">
            </label>
            <label>
              Kč
              <input type="number" min="0" step="50" value="${service.price}" data-field="price">
            </label>
            <label class="inline-check">
              <input type="checkbox" data-field="active" ${checked}>
              Aktivní
            </label>
          </div>
          <div class="row-actions">
            <button class="small-button small-button--primary" type="button" data-action="save-service">Uložit</button>
            <button class="small-button small-button--danger" type="button" data-action="delete-service">Smazat</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderAdmin() {
  renderStats();
  renderReservations();
  renderSlotEditor();
  renderAvailability();
  renderServices();
}

function setDefaultDate() {
  if (!availabilityForm) {
    return;
  }

  const dateInput = availabilityForm.elements.date;
  dateInput.min = store.todayKey();
  dateInput.value = dateInput.value || store.todayKey();
}

reservationFilter?.addEventListener("change", renderReservations);

reservationList?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  const item = event.target.closest("[data-reservation-id]");

  if (!button || !item) {
    return;
  }

  const reservation = state.reservations.find((entry) => entry.id === item.dataset.reservationId);

  if (!reservation) {
    return;
  }

  if (button.dataset.action === "confirm") {
    reservation.status = "confirmed";
  }

  if (button.dataset.action === "pending") {
    reservation.status = "pending";
  }

  if (button.dataset.action === "cancel") {
    reservation.status = "cancelled";
  }

  saveAndRender();
});

availabilityForm?.elements.date.addEventListener("change", (event) => {
  const day = state.availability[event.target.value];
  availabilityForm.elements.closed.checked = Boolean(day?.closed);
  renderSlotEditor(event.target.value);
});

availabilityForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(availabilityForm);
  const date = String(formData.get("date"));
  const slots = formData.getAll("slot").map(String).sort();
  const closed = formData.get("closed") === "on";

  state.availability[date] = { slots, closed };
  saveAndRender();
});

availabilityList?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  const item = event.target.closest("[data-date]");

  if (!button || !item || !availabilityForm) {
    return;
  }

  const date = item.dataset.date;

  if (button.dataset.action === "edit-date") {
    availabilityForm.elements.date.value = date;
    availabilityForm.elements.closed.checked = Boolean(state.availability[date]?.closed);
    renderSlotEditor(date);
  }

  if (button.dataset.action === "close-date") {
    state.availability[date] = {
      slots: state.availability[date]?.slots || [],
      closed: true,
    };
    saveAndRender();
  }
});

serviceForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(serviceForm);

  state.services.push({
    id: store.makeId("service"),
    name: String(formData.get("name") || ""),
    duration: Number(formData.get("duration") || 60),
    price: Number(formData.get("price") || 0),
    active: true,
  });

  serviceForm.reset();
  serviceForm.elements.duration.value = 60;
  serviceForm.elements.price.value = 800;
  saveAndRender();
});

serviceList?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  const item = event.target.closest("[data-service-id]");

  if (!button || !item) {
    return;
  }

  const serviceId = item.dataset.serviceId;
  const service = state.services.find((entry) => entry.id === serviceId);

  if (!service) {
    return;
  }

  if (button.dataset.action === "delete-service") {
    state.services = state.services.filter((entry) => entry.id !== serviceId);
    saveAndRender();
    return;
  }

  service.name = item.querySelector('[data-field="name"]').value;
  service.duration = Number(item.querySelector('[data-field="duration"]').value || 60);
  service.price = Number(item.querySelector('[data-field="price"]').value || 0);
  service.active = item.querySelector('[data-field="active"]').checked;
  saveAndRender();
});

seedMonthButton?.addEventListener("click", () => {
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (let index = 0; index < 42; index += 1) {
    const day = cursor.getDay();

    if (day !== 0) {
      const key = store.dateKey(cursor);
      state.availability[key] = {
        slots: day === 6 ? [...store.defaultSaturdaySlots] : [...store.defaultWeekdaySlots],
        closed: false,
      };
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  saveAndRender();
});

exportButton?.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "dotek-ruzeny-rezervace.json";
  link.click();
  URL.revokeObjectURL(url);
});

setDefaultDate();
renderAdmin();
