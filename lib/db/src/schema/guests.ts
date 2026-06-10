import { pgTable, serial, varchar, text, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const guestsTable = pgTable("guests", {
  guestId: serial("guest_id").primaryKey(),
  guestName: varchar("guest_name", { length: 200 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  isMember: boolean("is_member").notNull().default(false),
});

export const insertGuestSchema = createInsertSchema(guestsTable).omit({ guestId: true });
export type InsertGuest = z.infer<typeof insertGuestSchema>;
export type Guest = typeof guestsTable.$inferSelect;
