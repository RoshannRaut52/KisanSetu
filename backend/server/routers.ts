import { z } from "zod";
import { publicProcedure, router } from "./trpc";
import {
  createBooking,
  getSnapshot,
  quoteBooking,
  recordWeighment,
  reportDelay,
  resetDemo,
  updateBookingStatus,
} from "./kisan";

const cropSchema = z.enum(["Paddy", "Wheat", "Maize"]);
const bookingIdSchema = z.object({ bookingId: z.string().min(1) });

export const appRouter = router({
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(() => ({ success: true } as const)),
  }),
  kisan: router({
    snapshot: publicProcedure.query(() => getSnapshot()),
    quote: publicProcedure
      .input(z.object({ crop: cropSchema, quantity: z.number().positive().max(500), centreId: z.string() }))
      .query(({ input }) => quoteBooking(input)),
    createBooking: publicProcedure
      .input(z.object({ crop: cropSchema, quantity: z.number().positive().max(500), centreId: z.string(), slot: z.string().min(1) }))
      .mutation(({ input }) => createBooking(input)),
    updateStatus: publicProcedure
      .input(bookingIdSchema.extend({ status: z.enum(["BOOKED", "ARRIVED", "PROCESSING", "QC_PASSED", "WEIGHED", "COMPLETED"]) }))
      .mutation(({ input }) => updateBookingStatus(input)),
    weighment: publicProcedure
      .input(bookingIdSchema.extend({ gross: z.number().positive(), tare: z.number().nonnegative() }))
      .mutation(({ input }) => recordWeighment(input)),
    delay: publicProcedure
      .input(z.object({ centreId: z.string(), minutes: z.number().int().min(5).max(180), reason: z.string().min(3).max(160) }))
      .mutation(({ input }) => reportDelay(input)),
    resetDemo: publicProcedure.mutation(() => resetDemo()),
  }),
});

export type AppRouter = typeof appRouter;
