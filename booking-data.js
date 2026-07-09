(function () {
  const STORAGE_KEY = "dotekRuzenyBookingState";
  let memoryState = null;

  const defaultServices = [
    { id: "classic-back", name: "Klasická masáž zad a šíje", duration: 45, price: 650, active: true },
    { id: "classic-full", name: "Celotělová relaxační masáž", duration: 90, price: 1100, active: true },
    { id: "sport", name: "Sportovní masáž", duration: 60, price: 800, active: true },
    { id: "madero", name: "Maderoterapie", duration: 50, price: 950, active: true },
    { id: "lymph", name: "Lymfatická masáž", duration: 60, price: 900, active: true },
  ];

  const defaultWeekdaySlots = ["08:30", "10:00", "11:30", "14:00", "15:30", "17:00"];
  const defaultSaturdaySlots = ["09:00", "10:30", "12:00"];

  function dateKey(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function parseDateKey(key) {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function todayKey() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dateKey(today);
  }

  function formatDateKey(key) {
    const date = parseDateKey(key);
    return `${date.getDate()}. ${date.getMonth() + 1}. ${date.getFullYear()}`;
  }

  function makeId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function normalizeState(state) {
    const normalized = {
      services: Array.isArray(state?.services) && state.services.length ? state.services : defaultServices,
      availability: state?.availability && typeof state.availability === "object" ? state.availability : {},
      reservations: Array.isArray(state?.reservations) ? state.reservations : [],
    };

    normalized.services = normalized.services.map((service) => ({
      id: service.id || makeId("service"),
      name: service.name || "Nová služba",
      duration: Number(service.duration) || 60,
      price: Number(service.price) || 0,
      active: service.active !== false,
    }));

    return normalized;
  }

  function loadState() {
    try {
      const rawState =
        typeof localStorage === "undefined" ? memoryState : localStorage.getItem(STORAGE_KEY);
      return normalizeState(JSON.parse(rawState || "{}"));
    } catch {
      return normalizeState({});
    }
  }

  function saveState(state) {
    const serialized = JSON.stringify(normalizeState(state));
    memoryState = serialized;

    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY, serialized);
      }
    } catch {
      memoryState = serialized;
    }

    window.dispatchEvent(new CustomEvent("booking-state-changed"));
  }

  function seedAvailability(state) {
    const nextState = normalizeState(state);
    const hasFutureSlots = Object.keys(nextState.availability).some((key) => key >= todayKey());

    if (hasFutureSlots) {
      return nextState;
    }

    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    let createdDays = 0;

    while (createdDays < 16) {
      const day = cursor.getDay();

      if (day !== 0) {
        const key = dateKey(cursor);
        nextState.availability[key] = {
          slots: day === 6 ? [...defaultSaturdaySlots] : [...defaultWeekdaySlots],
          closed: false,
        };
        createdDays += 1;
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    saveState(nextState);
    return nextState;
  }

  function getActiveServices(state = loadState()) {
    return normalizeState(state).services.filter((service) => service.active);
  }

  function getService(state, serviceId) {
    const services = normalizeState(state).services;
    return services.find((service) => service.id === serviceId) || services[0];
  }

  function getAvailableSlots(state, dateKeyValue, serviceId) {
    const normalized = normalizeState(state);
    const day = normalized.availability[dateKeyValue];

    if (!day || day.closed || !Array.isArray(day.slots)) {
      return [];
    }

    const takenSlots = new Set(
      normalized.reservations
        .filter((reservation) => {
          return (
            reservation.date === dateKeyValue &&
            reservation.serviceId === serviceId &&
            reservation.status !== "cancelled"
          );
        })
        .map((reservation) => reservation.time),
    );

    return day.slots.filter((slot) => !takenSlots.has(slot));
  }

  function upsertReservation(reservation) {
    const state = loadState();
    const nextReservation = {
      id: reservation.id || makeId("reservation"),
      createdAt: reservation.createdAt || new Date().toISOString(),
      status: reservation.status || "pending",
      ...reservation,
    };

    state.reservations = [
      nextReservation,
      ...state.reservations.filter((item) => item.id !== nextReservation.id),
    ];
    saveState(state);
    return nextReservation;
  }

  window.DotekBooking = {
    defaultServices,
    defaultWeekdaySlots,
    defaultSaturdaySlots,
    dateKey,
    formatDateKey,
    getActiveServices,
    getAvailableSlots,
    getService,
    loadState,
    makeId,
    normalizeState,
    parseDateKey,
    saveState,
    seedAvailability,
    todayKey,
    upsertReservation,
  };
})();
