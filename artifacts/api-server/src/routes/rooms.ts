import { Router, type IRouter } from "express";
import { and, eq, or, notInArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db, roomsTable, bookingsTable, reservationsTable } from "@workspace/db";
import {
  GetRoomParams,
  GetAvailabilityQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapRoom(r: typeof roomsTable.$inferSelect) {
  return {
    roomId: r.roomId,
    roomName: r.roomName,
    capacity: r.capacity,
    pricePerNightNonmember: Number(r.pricePerNightNonmember),
    pricePerNightMember: Number(r.pricePerNightMember),
    description: r.description,
    imageUrl: r.imageUrl,
  };
}

router.get("/rooms", async (_req, res): Promise<void> => {
  const rooms = await db.select().from(roomsTable).orderBy(roomsTable.roomId);
  res.json(rooms.map(mapRoom));
});

router.get("/rooms/:id", async (req, res): Promise<void> => {
  const params = GetRoomParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [room] = await db
    .select()
    .from(roomsTable)
    .where(eq(roomsTable.roomId, params.data.id));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  res.json(mapRoom(room));
});

router.get("/availability", async (req, res): Promise<void> => {
  const query = GetAvailabilityQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { check_in, check_out } = query.data;

  // Find room IDs with overlapping confirmed/pending bookings in a single SQL query
  const overlapping = await db
    .selectDistinct({ roomId: reservationsTable.roomId })
    .from(reservationsTable)
    .innerJoin(bookingsTable, eq(reservationsTable.bookingId, bookingsTable.bookingId))
    .where(
      and(
        or(eq(bookingsTable.status, "confirmed"), eq(bookingsTable.status, "pending")),
        sql`${bookingsTable.checkInDate} < ${check_out}`,
        sql`${bookingsTable.checkOutDate} > ${check_in}`,
      )
    );

  const unavailableIds = overlapping.map((r) => r.roomId);

  const availableRooms =
    unavailableIds.length > 0
      ? await db
          .select()
          .from(roomsTable)
          .where(notInArray(roomsTable.roomId, unavailableIds))
          .orderBy(roomsTable.roomId)
      : await db.select().from(roomsTable).orderBy(roomsTable.roomId);

  res.json(availableRooms.map(mapRoom));
});

export default router;
