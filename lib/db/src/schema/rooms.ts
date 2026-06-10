import { pgTable, serial, varchar, integer, numeric, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roomsTable = pgTable("rooms", {
  roomId: serial("room_id").primaryKey(),
  roomName: varchar("room_name", { length: 50 }).notNull(),
  capacity: integer("capacity").notNull(),
  pricePerNightNonmember: numeric("price_per_night_nonmember", { precision: 10, scale: 2 }).notNull(),
  pricePerNightMember: numeric("price_per_night_member", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull().default(""),
  imageUrl: text("image_url"),
});

export const insertRoomSchema = createInsertSchema(roomsTable).omit({ roomId: true });
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof roomsTable.$inferSelect;
