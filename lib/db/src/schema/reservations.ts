import { pgTable, serial, integer, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bookingsTable } from "./bookings";
import { roomsTable } from "./rooms";

export const reservationsTable = pgTable("reservations", {
  reservationId: serial("reservation_id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookingsTable.bookingId),
  roomId: integer("room_id").notNull().references(() => roomsTable.roomId),
  priceAtBooking: numeric("price_at_booking", { precision: 10, scale: 2 }).notNull(),
  reservationDate: date("reservation_date", { mode: "string" }).notNull(),
});

export const insertReservationSchema = createInsertSchema(reservationsTable).omit({ reservationId: true });
export type InsertReservation = z.infer<typeof insertReservationSchema>;
export type Reservation = typeof reservationsTable.$inferSelect;
