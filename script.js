if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

window.addEventListener("pageshow", () => {
  if (!window.location.hash) {
    window.scrollTo(0, 0);
  }
});

const bookingStore = window.DotekBooking;
const form = document.querySelector(".booking-form");
const serviceInput = document.querySelector("#booking-service");
const timeInput = document.querySelector("#booking-time");
const calendarService = document.querySelector(".calendar-service");
const calendarGrid = document.querySelector("[data-calendar-grid]");
const monthLabel = document.querySelector("[data-calendar-month]");
const timeSlots = document.querySelector("[data-time-slots]");
const selectionLabel = document.querySelector("[data-calendar-selection]");
const prevButton = document.querySelector("[data-calendar-prev]");
const nextButton = document.querySelector("[data-calendar-next]");
const pricingTable = document.querySelector("[data-pricing-table]");

const monthNames = [
  "leden",
  "únor",
  "březen",
  "duben",
  "květen",
  "červen",
  "červenec",
  "srpen",
  "září",
  "říjen",
  "listopad",
  "prosinec",
];

let state = bookingStore.seedAvailability(bookingStore.loadState());
let visibleMonth = startOfMonth(new Date());
let selectedDateKey = "";
let selectedTime = "";

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getSelectedServiceId() {
  return calendarService?.value || serviceInput?.value || bookingStore.getActiveServices(state)[0]?.id || "";
}

function renderServiceOptions() {
  const services = bookingStore.getActiveServices(state);

  [serviceInput, calendarService].forEach((select) => {
    if (!select) {
      return;
    }

    const currentValue = select.value;
    select.innerHTML = services
      .map((service) => `<option value="${service.id}">${service.name}</option>`)
      .join("");

    if (services.some((service) => service.id === currentValue)) {
      select.value = currentValue;
    }
  });
}

function renderPricingTable() {
  if (!pricingTable) {
    return;
  }

  const header = pricingTable.querySelector(".pricing-row--head");
  pricingTable.innerHTML = "";
  pricingTable.append(header);

  bookingStore.getActiveServices(state).forEach((service) => {
    const row = document.createElement("div");
    row.className = "pricing-row";
    row.setAttribute("role", "row");
    row.innerHTML = `
      <span>${service.name}</span>
      <span>${service.duration} min</span>
      <span>${service.price.toLocaleString("cs-CZ")} Kč</span>
    `;
    pricingTable.append(row);
  });
}

function renderCalendar() {
  if (!calendarGrid || !monthLabel) {
    return;
  }

  const serviceId = getSelectedServiceId();
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingDays = (firstDay.getDay() + 6) % 7;

  monthLabel.textContent = `${monthNames[month]} ${year}`;
  calendarGrid.innerHTML = "";

  for (let index = 0; index < leadingDays; index += 1) {
    const spacer = document.createElement("span");
    spacer.className = "calendar-day is-muted";
    calendarGrid.append(spacer);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const key = bookingStore.dateKey(date);
    const slots = bookingStore.getAvailableSlots(state, key, serviceId);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    button.textContent = day;

    if (slots.length) {
      button.classList.add("is-available");
    } else {
      button.classList.add("is-closed");
      button.disabled = true;
    }

    if (key === selectedDateKey) {
      button.classList.add("is-selected");
    }

    button.addEventListener("click", () => {
      selectedDateKey = key;
      selectedTime = "";
      renderCalendar();
      renderTimeSlots();
      updateSelectedTerm();
    });

    calendarGrid.append(button);
  }
}

function renderTimeSlots() {
  if (!timeSlots) {
    return;
  }

  const serviceId = getSelectedServiceId();
  const slots = selectedDateKey ? bookingStore.getAvailableSlots(state, selectedDateKey, serviceId) : [];
  timeSlots.innerHTML = "";

  if (!selectedDateKey) {
    timeSlots.innerHTML = '<button class="time-slot" type="button" disabled>Vyberte den</button>';
    return;
  }

  if (!slots.length) {
    timeSlots.innerHTML = '<button class="time-slot" type="button" disabled>Žádný volný čas</button>';
    return;
  }

  slots.forEach((slot) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "time-slot";
    button.textContent = slot;

    if (slot === selectedTime) {
      button.classList.add("is-selected");
    }

    button.addEventListener("click", () => {
      selectedTime = slot;
      renderTimeSlots();
      updateSelectedTerm();
    });

    timeSlots.append(button);
  });
}

function updateSelectedTerm() {
  if (!selectionLabel || !timeInput) {
    return;
  }

  if (!selectedDateKey || !selectedTime) {
    selectionLabel.textContent = selectedDateKey
      ? `Vybraný den: ${bookingStore.formatDateKey(selectedDateKey)}. Zvolte ještě čas.`
      : "Vybraný termín se zobrazí zde.";
    timeInput.value = "";
    return;
  }

  const service = bookingStore.getService(state, getSelectedServiceId());
  const term = `${bookingStore.formatDateKey(selectedDateKey)} v ${selectedTime}`;
  selectionLabel.textContent = `${term} · ${service.name}`;
  timeInput.value = term;
}

function syncService(value) {
  if (serviceInput && serviceInput.value !== value) {
    serviceInput.value = value;
  }

  if (calendarService && calendarService.value !== value) {
    calendarService.value = value;
  }

  selectedTime = "";
  renderCalendar();
  renderTimeSlots();
  updateSelectedTerm();
}

function renderPublicBooking() {
  state = bookingStore.seedAvailability(bookingStore.loadState());
  renderServiceOptions();
  renderPricingTable();
  renderCalendar();
  renderTimeSlots();
  updateSelectedTerm();
}

prevButton?.addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  renderCalendar();
});

nextButton?.addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  renderCalendar();
});

calendarService?.addEventListener("change", (event) => {
  syncService(event.target.value);
});

serviceInput?.addEventListener("change", (event) => {
  syncService(event.target.value);
});

window.addEventListener("booking-state-changed", renderPublicBooking);
window.addEventListener("storage", renderPublicBooking);

renderPublicBooking();

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const button = form.querySelector("button");
  const formData = new FormData(form);
  const serviceId = getSelectedServiceId();
  const service = bookingStore.getService(state, serviceId);
  const originalText = button.textContent;

  if (!selectedDateKey || !selectedTime) {
    button.textContent = "Vyberte prosím termín v kalendáři";
    window.setTimeout(() => {
      button.textContent = originalText;
    }, 2400);
    return;
  }

  bookingStore.upsertReservation({
    name: String(formData.get("name") || ""),
    phone: String(formData.get("phone") || ""),
    serviceId,
    serviceName: service.name,
    date: selectedDateKey,
    time: selectedTime,
    term: `${bookingStore.formatDateKey(selectedDateKey)} v ${selectedTime}`,
    message: String(formData.get("message") || ""),
    status: "pending",
  });

  state = bookingStore.loadState();
  button.textContent = "Děkuji, rezervaci mám zaznamenanou";
  button.disabled = true;

  window.setTimeout(() => {
    button.textContent = originalText;
    button.disabled = false;
    form.reset();
    selectedDateKey = "";
    selectedTime = "";
    renderPublicBooking();
  }, 3200);
});
