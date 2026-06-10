import { Router, type IRouter } from "express";
import { eq, notInArray } from "drizzle-orm";
import { db, roomsTable, bookingsTable, reservationsTable } from "@workspace/db";
import {
  GetRoomParams,
  GetAvailabilityQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/rooms", async (_req, res): Promise<void> => {
  const rooms = await db.select().from(roomsTable).orderBy(roomsTable.roomId);
  res.json(
    rooms.map((r) => ({
      roomId: r.roomId,
      roomName: r.roomName,
      capacity: r.capacity,
      pricePerNightNonmember: Number(r.pricePerNightNonmember),
      pricePerNightMember: Number(r.pricePerNightMember),
      description: r.description,
      imageUrl: r.imageUrl,
    }))
  );
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
  res.json({
    roomId: room.roomId,
    roomName: room.roomName,
    capacity: room.capacity,
    pricePerNightNonmember: Number(room.pricePerNightNonmember),
    pricePerNightMember: Number(room.pricePerNightMember),
    description: room.description,
    imageUrl: room.imageUrl,
  });
});

router.get("/availability", async (req, res): Promise<void> => {
  const query = GetAvailabilityQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { check_in, check_out } = query.data;

  // Find room IDs that have overlapping confirmed/pending bookings
  const overlappingBookings = await db
    .select({ roomId: reservationsTable.roomId })
    .from(reservationsTable)
    .innerJoin(bookingsTable, eq(reservationsTable.bookingId, bookingsTable.bookingId))
    .where(
      // Overlap condition: booking's check_in < requested check_out AND booking's check_out > requested check_in
      // Using raw SQL expression via db.execute style — using Drizzle sql template
      // Simple approach: exclude rooms whose bookings overlap
      eq(bookingsTable.status, "confirmed")
    );

  // Filter properly for date overlap
  const allBookings = await db
    .select({
      roomId: reservationsTable.roomId,
      checkIn: bookingsTable.checkInDate,
      checkOut: bookingsTable.checkOutDate,
      status: bookingsTable.status,
    })
    .from(reservationsTable)
    .innerJoin(bookingsTable, eq(reservationsTable.bookingId, bookingsTable.bookingId));

  const unavailableRoomIds = allBookings
    .filter(
      (b) =>
        (b.status === "confirmed" || b.status === "pending") &&
        b.checkIn < check_out &&
        b.checkOut > check_in
    )
    .map((b) => b.roomId);

  const uniqueUnavailable = [...new Set(unavailableRoomIds)];

  let availableRooms;
  if (uniqueUnavailable.length > 0) {
    availableRooms = await db
      .select()
      .from(roomsTable)
      .where(notInArray(roomsTable.roomId, uniqueUnavailable))
      .orderBy(roomsTable.roomId);
  } else {
    availableRooms = await db.select().from(roomsTable).orderBy(roomsTable.roomId);
  }

  res.json(
    availableRooms.map((r) => ({
      roomId: r.roomId,
      roomName: r.roomName,
      capacity: r.capacity,
      pricePerNightNonmember: Number(r.pricePerNightNonmember),
      pricePerNightMember: Number(r.pricePerNightMember),
      description: r.description,
      imageUrl: r.imageUrl,
    }))
  );
});

export default router;
