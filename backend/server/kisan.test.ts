import { beforeEach, describe, expect, it } from "vitest";
import {
  createBooking,
  getSnapshot,
  quoteBooking,
  recordWeighment,
  reportDelay,
  resetDemo,
  updateBookingStatus,
} from "./kisan";

describe("KisanSetu queue and procurement domain", () => {
  beforeEach(async () => {
    await resetDemo();
  });

  it("returns a queue-aware prediction with configured price and available slots", async () => {
    const quote = await quoteBooking({ crop: "Paddy", quantity: 50, centreId: "centre-a" });
    expect(quote.price).toBe(2320);
    expect(quote.predictedMinutes).toBeGreaterThan(30);
    expect(quote.slots.filter((slot) => slot.available)).toHaveLength(3);
    expect(quote.explanation).toContain("50 qtl quantity");
  });

  it("creates a booking with a token and queue position", async () => {
    const booking = await createBooking({ crop: "Wheat", quantity: 20, centreId: "centre-b", slot: "02:00 PM" });
    expect(booking.token).toMatch(/^B/);
    expect(booking.status).toBe("BOOKED");
    expect(booking.queuePosition).toBeGreaterThan(1);
    expect(booking.price).toBe(2275);
  });

  it("propagates an operational delay to all affected bookings and notifications", async () => {
    const before = await getSnapshot();
    const beforeEta = before.bookings.find((booking) => booking.id === "booking-a104")?.eta;
    const result = await reportDelay({ centreId: "centre-a", minutes: 25, reason: "QC re-inspection" });
    const after = await getSnapshot();
    const afterBooking = after.bookings.find((booking) => booking.id === "booking-a104");
    expect(result.affectedBookings.length).toBeGreaterThan(0);
    expect(after.centres.find((centre) => centre.id === "centre-a")?.status).toBe("DELAYED");
    expect(afterBooking?.delayMinutes).toBe(25);
    expect(afterBooking?.eta).not.toBe(beforeEta);
    expect(after.notifications.some((notification) => notification.title === "ETA updated")).toBe(true);
  });

  it("calculates net weight and completes the payment reference lifecycle", async () => {
    const arrived = await updateBookingStatus({ bookingId: "booking-a105", status: "PROCESSING" });
    expect(arrived.stage).toBe("Quality Check");
    const passed = await updateBookingStatus({ bookingId: "booking-a105", status: "QC_PASSED" });
    expect(passed.qc.result).toBe("PASSED");
    const weighed = await recordWeighment({ bookingId: "booking-a105", gross: 55.4, tare: 5.4 });
    expect(weighed.weighment?.net).toBe(50);
    const completed = await updateBookingStatus({ bookingId: "booking-a105", status: "COMPLETED" });
    expect(completed.paymentStatus).toBe("DBT_PROCESSING_INITIATED");
    expect(completed.stage).toBe("Payment");
  });

  it("rejects invalid weighment values", async () => {
    await expect(recordWeighment({ bookingId: "booking-a104", gross: 5, tare: 9 })).rejects.toThrow("Gross weight must be greater than tare weight");
  });

  it("restores the SIH baseline after a demo run", async () => {
    await createBooking({ crop: "Maize", quantity: 12, centreId: "centre-a", slot: "01:30 PM" });
    expect((await getSnapshot()).bookings.length).toBe(7);
    await resetDemo();
    const snapshot = await getSnapshot();
    expect(snapshot.bookings.length).toBe(6);
    expect(snapshot.centres.every((centre) => centre.status === "ACTIVE")).toBe(true);
    expect(snapshot.bookings.find((booking) => booking.id === "booking-a104")?.status).toBe("BOOKED");
  });
});
