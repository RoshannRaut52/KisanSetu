import { nanoid } from "nanoid";

type BookingStatus =
  | "BOOKED"
  | "ARRIVED"
  | "PROCESSING"
  | "QC_PASSED"
  | "WEIGHED"
  | "COMPLETED"
  | "DELAYED";

type Stage = "Gate Entry" | "Quality Check" | "Weighment" | "Payment";

export type Centre = {
  id: string;
  name: string;
  location: string;
  operatingHours: string;
  status: "ACTIVE" | "DELAYED" | "PAUSED";
  queueSize: number;
  capacityPct: number;
  waitMinutes: number;
  dailyCapacity: number;
  slots: string[];
};

export type Booking = {
  id: string;
  token: string;
  farmerName: string;
  farmerMobile: string;
  crop: string;
  quantity: number;
  centreId: string;
  centreName: string;
  slot: string;
  eta: string;
  processingMinutes: number;
  queuePosition: number;
  status: BookingStatus;
  stage: Stage;
  lastUpdated: string;
  delayMinutes: number;
  price: number;
  qc: { moisture: number; limit: number; result: "PASSED" | "PENDING" };
  weighment: { gross: number; tare: number; net: number } | null;
  paymentStatus: "NOT_STARTED" | "DBT_PROCESSING_INITIATED";
};

type Activity = {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  tone: "green" | "amber" | "blue" | "slate";
};

type Notification = {
  id: string;
  title: string;
  body: string;
  channel: "Portal" | "SMS" | "WhatsApp";
  timestamp: string;
  unread: boolean;
};

const priceByCrop: Record<string, number> = { Paddy: 2320, Wheat: 2275, Maize: 2090 };
const cropLimits: Record<string, number> = { Paddy: 17, Wheat: 14, Maize: 15 };
const nowIso = () => new Date().toISOString();
const atMinutes = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

const centres: Centre[] = [
  {
    id: "centre-a",
    name: "Nandgaon Procurement Centre",
    location: "Nandgaon · 4.2 km",
    operatingHours: "08:00 – 18:00",
    status: "ACTIVE",
    queueSize: 0,
    capacityPct: 74,
    waitMinutes: 34,
    dailyCapacity: 28,
    slots: ["10:30 AM", "11:15 AM", "12:00 PM", "01:30 PM"],
  },
  {
    id: "centre-b",
    name: "Gokul Mandi Yard",
    location: "Gokul · 8.7 km",
    operatingHours: "08:30 – 17:30",
    status: "ACTIVE",
    queueSize: 0,
    capacityPct: 48,
    waitMinutes: 52,
    dailyCapacity: 36,
    slots: ["11:00 AM", "12:15 PM", "02:00 PM", "03:00 PM"],
  },
];

const bookings: Booking[] = [
  {
    id: "booking-a104",
    token: "A104",
    farmerName: "Ramesh Kumar",
    farmerMobile: "98XXXXXX42",
    crop: "Paddy",
    quantity: 50,
    centreId: "centre-a",
    centreName: centres[0].name,
    slot: "10:30 AM – 11:15 AM",
    eta: atMinutes(38),
    processingMinutes: 42,
    queuePosition: 3,
    status: "BOOKED",
    stage: "Gate Entry",
    lastUpdated: nowIso(),
    delayMinutes: 0,
    price: 2320,
    qc: { moisture: 0, limit: 17, result: "PENDING" },
    weighment: null,
    paymentStatus: "NOT_STARTED",
  },
  {
    id: "booking-a103",
    token: "A103",
    farmerName: "Suresh Patil",
    farmerMobile: "99XXXXXX18",
    crop: "Wheat",
    quantity: 28,
    centreId: "centre-a",
    centreName: centres[0].name,
    slot: "10:00 AM – 10:30 AM",
    eta: atMinutes(10),
    processingMinutes: 24,
    queuePosition: 1,
    status: "PROCESSING",
    stage: "Quality Check",
    lastUpdated: nowIso(),
    delayMinutes: 0,
    price: 2275,
    qc: { moisture: 13.2, limit: 14, result: "PASSED" },
    weighment: null,
    paymentStatus: "NOT_STARTED",
  },
  {
    id: "booking-a105",
    token: "A105",
    farmerName: "Meena Devi",
    farmerMobile: "97XXXXXX65",
    crop: "Maize",
    quantity: 35,
    centreId: "centre-a",
    centreName: centres[0].name,
    slot: "11:15 AM – 12:00 PM",
    eta: atMinutes(66),
    processingMinutes: 31,
    queuePosition: 4,
    status: "ARRIVED",
    stage: "Gate Entry",
    lastUpdated: nowIso(),
    delayMinutes: 0,
    price: 2090,
    qc: { moisture: 0, limit: 15, result: "PENDING" },
    weighment: null,
    paymentStatus: "NOT_STARTED",
  },
  {
    id: "booking-a106",
    token: "A106",
    farmerName: "Harish Singh",
    farmerMobile: "96XXXXXX27",
    crop: "Paddy",
    quantity: 18,
    centreId: "centre-a",
    centreName: centres[0].name,
    slot: "12:00 PM – 12:30 PM",
    eta: atMinutes(96),
    processingMinutes: 19,
    queuePosition: 5,
    status: "BOOKED",
    stage: "Gate Entry",
    lastUpdated: nowIso(),
    delayMinutes: 0,
    price: 2320,
    qc: { moisture: 0, limit: 17, result: "PENDING" },
    weighment: null,
    paymentStatus: "NOT_STARTED",
  },
  {
    id: "booking-b201",
    token: "B201",
    farmerName: "Kavita Yadav",
    farmerMobile: "95XXXXXX11",
    crop: "Wheat",
    quantity: 40,
    centreId: "centre-b",
    centreName: centres[1].name,
    slot: "11:00 AM – 11:45 AM",
    eta: atMinutes(52),
    processingMinutes: 36,
    queuePosition: 1,
    status: "BOOKED",
    stage: "Gate Entry",
    lastUpdated: nowIso(),
    delayMinutes: 0,
    price: 2275,
    qc: { moisture: 0, limit: 14, result: "PENDING" },
    weighment: null,
    paymentStatus: "NOT_STARTED",
  },
  {
    id: "booking-b202",
    token: "B202",
    farmerName: "Amit Verma",
    farmerMobile: "94XXXXXX09",
    crop: "Paddy",
    quantity: 22,
    centreId: "centre-b",
    centreName: centres[1].name,
    slot: "12:15 PM – 01:00 PM",
    eta: atMinutes(91),
    processingMinutes: 23,
    queuePosition: 2,
    status: "BOOKED",
    stage: "Gate Entry",
    lastUpdated: nowIso(),
    delayMinutes: 0,
    price: 2320,
    qc: { moisture: 0, limit: 17, result: "PENDING" },
    weighment: null,
    paymentStatus: "NOT_STARTED",
  },
];

const activity: Activity[] = [
  { id: "act-1", type: "QUEUE_UPDATED", message: "Queue recalculated after weighment lane opened", timestamp: "2 min ago", tone: "blue" },
  { id: "act-2", type: "QC_PASSED", message: "Token A103 passed quality check · 13.2% moisture", timestamp: "6 min ago", tone: "green" },
  { id: "act-3", type: "ARRIVAL", message: "Token A105 marked arrived at gate", timestamp: "11 min ago", tone: "slate" },
  { id: "act-4", type: "BOOKING_CONFIRMED", message: "New booking B202 confirmed for Gokul Mandi Yard", timestamp: "18 min ago", tone: "green" },
];

const notifications: Notification[] = [
  { id: "note-1", title: "Live ETA ready", body: "Your Paddy booking A104 is 3rd in queue. Current ETA: 10:58 AM.", channel: "Portal", timestamp: "Just now", unread: true },
  { id: "note-2", title: "Booking confirmed", body: "Token A104 reserved at Nandgaon Procurement Centre.", channel: "WhatsApp", timestamp: "18 min ago", unread: false },
  { id: "note-3", title: "QC completed", body: "Suresh Patil's Wheat lot passed the moisture check.", channel: "SMS", timestamp: "6 min ago", unread: false },
];

const state = { centres, bookings, activity, notifications, delayMinutes: 0 };
const baselineBookingIds = new Set(bookings.map((booking) => booking.id));
const baselineStatus: Record<string, BookingStatus> = {
  "booking-a104": "BOOKED",
  "booking-a103": "PROCESSING",
  "booking-a105": "ARRIVED",
  "booking-a106": "BOOKED",
  "booking-b201": "BOOKED",
  "booking-b202": "BOOKED",
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function centreById(id: string) {
  const centre = state.centres.find((entry) => entry.id === id);
  if (!centre) throw new Error("Centre not found");
  return centre;
}

function recalculateCentre(centreId: string) {
  const centre = centreById(centreId);
  const active = state.bookings
    .filter((booking) => booking.centreId === centreId && booking.status !== "COMPLETED")
    .sort((a, b) => a.queuePosition - b.queuePosition || a.slot.localeCompare(b.slot));
  const centreDelay = centre.status === "DELAYED" ? state.delayMinutes : 0;
  active.forEach((booking, index) => {
    booking.queuePosition = index + 1;
    booking.delayMinutes = centreDelay;
    booking.eta = atMinutes(Math.max(8, 12 + index * 17 + booking.processingMinutes + centreDelay));
    booking.lastUpdated = nowIso();
    if (centreDelay > 0 && booking.status === "BOOKED") booking.status = "DELAYED";
  });
  centre.queueSize = active.length;
  centre.waitMinutes = Math.round(18 + active.reduce((sum, booking) => sum + booking.processingMinutes, 0) / Math.max(1, active.length));
  centre.capacityPct = Math.min(96, Math.max(28, Math.round((active.length / centre.dailyCapacity) * 100 + (centreDelay ? 8 : 0))));
}

state.centres.forEach((centre) => recalculateCentre(centre.id));

export function getSnapshot() {
  return clone({
    centres: state.centres,
    bookings: state.bookings,
    activity: state.activity.slice(0, 8),
    notifications: state.notifications,
    delayMinutes: state.delayMinutes,
    system: {
      sourceOfTruth: "PostgreSQL",
      liveState: "Redis projection",
      realtime: "Polling fallback active · WebSocket boundary ready",
      model: "Random Forest Regressor",
      dataset: "Synthetic / Prototype Dataset",
      modelHealthy: true,
    },
  });
}

export function quoteBooking(input: { crop: string; quantity: number; centreId: string }) {
  const centre = centreById(input.centreId);
  const queue = state.bookings.filter((booking) => booking.centreId === input.centreId && booking.status !== "COMPLETED");
  const predictedMinutes = Math.max(12, Math.min(90, Math.round(12 + input.quantity * 0.48 + queue.length * 3.4)));
  return {
    crop: input.crop,
    quantity: input.quantity,
    price: priceByCrop[input.crop] ?? 0,
    predictedMinutes,
    centre: { ...centre },
    fallbackUsed: false,
    explanation: [
      `${input.quantity} qtl quantity`,
      `${queue.length} farmers in queue`,
      `${centre.capacityPct}% centre load`,
      "recent processing behaviour",
    ],
    slots: centre.slots.map((slot, index) => ({ slot, eta: atMinutes(35 + index * 42 + predictedMinutes), available: index < 3 })),
  };
}

export function createBooking(input: { crop: string; quantity: number; centreId: string; slot: string }) {
  if (input.quantity <= 0 || input.quantity > 500) throw new Error("Quantity must be between 1 and 500 quintals");
  const quote = quoteBooking(input);
  const tokenNumber = 104 + state.bookings.filter((booking) => booking.centreId === input.centreId).length + 1;
  const booking: Booking = {
    id: `booking-${nanoid(7)}`,
    token: `${input.centreId === "centre-a" ? "A" : "B"}${tokenNumber}`,
    farmerName: "Ramesh Kumar",
    farmerMobile: "98XXXXXX42",
    crop: input.crop,
    quantity: input.quantity,
    centreId: input.centreId,
    centreName: quote.centre.name,
    slot: input.slot,
    eta: atMinutes(quote.predictedMinutes + quote.centre.queueSize * 13),
    processingMinutes: quote.predictedMinutes,
    queuePosition: quote.centre.queueSize + 1,
    status: "BOOKED",
    stage: "Gate Entry",
    lastUpdated: nowIso(),
    delayMinutes: quote.centre.status === "DELAYED" ? state.delayMinutes : 0,
    price: quote.price,
    qc: { moisture: 0, limit: cropLimits[input.crop] ?? 17, result: "PENDING" },
    weighment: null,
    paymentStatus: "NOT_STARTED",
  };
  state.bookings.push(booking);
  state.notifications.unshift({ id: `note-${nanoid(5)}`, title: "Booking confirmed", body: `Token ${booking.token} is reserved at ${booking.centreName}.`, channel: "Portal", timestamp: "Just now", unread: true });
  state.activity.unshift({ id: `act-${nanoid(5)}`, type: "BOOKING_CONFIRMED", message: `Token ${booking.token} confirmed for ${booking.quantity} qtl ${booking.crop}`, timestamp: "Just now", tone: "green" });
  recalculateCentre(input.centreId);
  return clone(booking);
}

export function reportDelay(input: { centreId: string; minutes: number; reason: string }) {
  if (input.minutes < 5 || input.minutes > 180) throw new Error("Delay must be between 5 and 180 minutes");
  const centre = centreById(input.centreId);
  centre.status = "DELAYED";
  state.delayMinutes = input.minutes;
  recalculateCentre(input.centreId);
  const active = state.bookings.filter((booking) => booking.centreId === input.centreId && booking.status !== "COMPLETED");
  active.forEach((booking) => {
    state.notifications.unshift({ id: `note-${nanoid(5)}`, title: "ETA updated", body: `Processing at ${centre.name} is delayed by approximately ${input.minutes} minutes. New ETA: ${new Date(booking.eta).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`, channel: "Portal", timestamp: "Just now", unread: true });
  });
  state.activity.unshift({ id: `act-${nanoid(5)}`, type: "OPERATIONAL_DELAY", message: `${input.reason} · ${input.minutes} min delay reported at ${centre.name}`, timestamp: "Just now", tone: "amber" });
  return clone({ centre, affectedBookings: active.map((booking) => ({ id: booking.id, token: booking.token, eta: booking.eta, queuePosition: booking.queuePosition })) });
}

export function updateBookingStatus(input: { bookingId: string; status: Exclude<BookingStatus, "DELAYED"> }) {
  const booking = state.bookings.find((entry) => entry.id === input.bookingId);
  if (!booking) throw new Error("Booking not found");
  const stageByStatus: Record<string, Stage> = {
    BOOKED: "Gate Entry",
    ARRIVED: "Gate Entry",
    PROCESSING: "Quality Check",
    QC_PASSED: "Quality Check",
    WEIGHED: "Weighment",
    COMPLETED: "Payment",
  };
  booking.status = input.status;
  booking.stage = stageByStatus[input.status];
  booking.lastUpdated = nowIso();
  if (input.status === "QC_PASSED") {
    booking.qc = { moisture: booking.qc.moisture || Math.min(booking.qc.limit - 1, 13.4), limit: booking.qc.limit, result: "PASSED" };
  }
  if (input.status === "COMPLETED") booking.paymentStatus = "DBT_PROCESSING_INITIATED";
  state.activity.unshift({ id: `act-${nanoid(5)}`, type: input.status, message: `${booking.token} moved to ${booking.stage}`, timestamp: "Just now", tone: input.status === "COMPLETED" ? "green" : "blue" });
  recalculateCentre(booking.centreId);
  return clone(booking);
}

export function recordWeighment(input: { bookingId: string; gross: number; tare: number }) {
  if (input.gross <= 0 || input.tare < 0 || input.gross < input.tare) throw new Error("Gross weight must be greater than tare weight");
  const booking = state.bookings.find((entry) => entry.id === input.bookingId);
  if (!booking) throw new Error("Booking not found");
  booking.weighment = { gross: input.gross, tare: input.tare, net: Number((input.gross - input.tare).toFixed(2)) };
  booking.status = "WEIGHED";
  booking.stage = "Weighment";
  booking.lastUpdated = nowIso();
  state.activity.unshift({ id: `act-${nanoid(5)}`, type: "WEIGHMENT", message: `${booking.token} weighment recorded · net ${booking.weighment.net} qtl`, timestamp: "Just now", tone: "green" });
  state.notifications.unshift({ id: `note-${nanoid(5)}`, title: "Weighment completed", body: `Net weight for ${booking.token}: ${booking.weighment.net} qtl.`, channel: "Portal", timestamp: "Just now", unread: true });
  recalculateCentre(booking.centreId);
  return clone(booking);
}

export function resetDemo() {
  state.delayMinutes = 0;
  state.centres.forEach((centre) => { centre.status = "ACTIVE"; });
  for (let index = state.bookings.length - 1; index >= 0; index -= 1) {
    if (!baselineBookingIds.has(state.bookings[index].id)) state.bookings.splice(index, 1);
  }
  state.bookings.forEach((booking, index) => {
    booking.status = baselineStatus[booking.id] ?? "BOOKED";
    booking.stage = booking.status === "PROCESSING" ? "Quality Check" : "Gate Entry";
    booking.weighment = null;
    booking.paymentStatus = "NOT_STARTED";
    booking.qc = { moisture: booking.status === "PROCESSING" ? 13.2 : 0, limit: booking.qc.limit, result: booking.status === "PROCESSING" ? "PASSED" : "PENDING" };
    booking.delayMinutes = 0;
    booking.queuePosition = index + 1;
  });
  recalculateCentre("centre-a");
  recalculateCentre("centre-b");
  state.activity.unshift({ id: `act-${nanoid(5)}`, type: "DEMO_RESET", message: "Demo state reset to the SIH baseline scenario", timestamp: "Just now", tone: "slate" });
  return getSnapshot();
}
