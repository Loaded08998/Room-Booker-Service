import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { db, roomsTable, guestsTable, bookingsTable, reservationsTable } from "@workspace/db";
import { CreateBookingBody, GetBookingParams } from "@workspace/api-zod";
import { sendBookingConfirmation } from "../lib/email";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/bookings", async (req, res): Promise<void> => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { guestName, email, phone, checkInDate, checkOutDate, roomIds, isMember } = parsed.data;

  if (new Date(checkInDate) >= new Date(checkOutDate)) {
    res.status(400).json({ error: "Check-out must be after check-in" });
    return;
  }

  // Validate rooms exist
  const rooms = await db
    .select()
    .from(roomsTable)
    .where(inArray(roomsTable.roomId, roomIds));

  if (rooms.length !== roomIds.length) {
    res.status(400).json({ error: "One or more rooms not found" });
    return;
  }

  const nights =
    (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) /
    (1000 * 60 * 60 * 24);

  const totalPrice = rooms.reduce((sum, room) => {
    const pricePerNight = isMember
      ? Number(room.pricePerNightMember)
      : Number(room.pricePerNightNonmember);
    return sum + pricePerNight * nights;
  }, 0);

  // Run in a transaction
  const result = await db.transaction(async (tx) => {
    // Check availability within the transaction
    const overlapping = await tx
      .select({ roomId: reservationsTable.roomId })
      .from(reservationsTable)
      .innerJoin(bookingsTable, eq(reservationsTable.bookingId, bookingsTable.bookingId))
      .where(inArray(reservationsTable.roomId, roomIds));

    const conflicts = overlapping.filter(
      async (b) =>
        b.roomId !== null
    );

    // Get actual dates for overlap check
    const allReservations = await tx
      .select({
        roomId: reservationsTable.roomId,
        checkIn: bookingsTable.checkInDate,
        checkOut: bookingsTable.checkOutDate,
        status: bookingsTable.status,
      })
      .from(reservationsTable)
      .innerJoin(bookingsTable, eq(reservationsTable.bookingId, bookingsTable.bookingId))
      .where(inArray(reservationsTable.roomId, roomIds));

    const hasConflict = allReservations.some(
      (b) =>
        (b.status === "confirmed" || b.status === "pending") &&
        b.checkIn < checkOutDate &&
        b.checkOut > checkInDate
    );

    if (hasConflict) {
      throw new Error("ROOM_UNAVAILABLE");
    }

    // Create or find guest
    const [existingGuest] = await tx
      .select()
      .from(guestsTable)
      .where(eq(guestsTable.email, email));

    let guest = existingGuest;
    if (!guest) {
      const [newGuest] = await tx
        .insert(guestsTable)
        .values({ guestName, email, phone: phone ?? null, isMember })
        .returning();
      guest = newGuest;
    }

    // Create booking
    const [booking] = await tx
      .insert(bookingsTable)
      .values({
        guestId: guest.guestId,
        checkInDate,
        checkOutDate,
        totalPrice: totalPrice.toFixed(2),
        status: "pending",
      })
      .returning();

    // Create reservations
    for (const room of rooms) {
      const priceAtBooking = isMember
        ? Number(room.pricePerNightMember)
        : Number(room.pricePerNightNonmember);
      await tx.insert(reservationsTable).values({
        bookingId: booking.bookingId,
        roomId: room.roomId,
        priceAtBooking: (priceAtBooking * nights).toFixed(2),
      });
    }

    return { booking, guest };
  });

  res.status(201).json({
    bookingId: result.booking.bookingId,
    guestId: result.booking.guestId,
    checkInDate: result.booking.checkInDate,
    checkOutDate: result.booking.checkOutDate,
    totalPrice: Number(result.booking.totalPrice),
    status: result.booking.status,
    createdAt: result.booking.createdAt.toISOString(),
  });
});

router.get("/bookings/:id", async (req, res): Promise<void> => {
  const params = GetBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.bookingId, params.data.id));

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  const [guest] = await db
    .select()
    .from(guestsTable)
    .where(eq(guestsTable.guestId, booking.guestId));

  const reservations = await db
    .select()
    .from(reservationsTable)
    .where(eq(reservationsTable.bookingId, booking.bookingId));

  const roomIds = reservations.map((r) => r.roomId);
  const rooms =
    roomIds.length > 0
      ? await db.select().from(roomsTable).where(inArray(roomsTable.roomId, roomIds))
      : [];

  res.json({
    bookingId: booking.bookingId,
    guestId: booking.guestId,
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
    totalPrice: Number(booking.totalPrice),
    status: booking.status,
    createdAt: booking.createdAt.toISOString(),
    guest: {
      guestId: guest.guestId,
      guestName: guest.guestName,
      email: guest.email,
      phone: guest.phone,
      isMember: guest.isMember,
    },
    rooms: rooms.map((r) => ({
      roomId: r.roomId,
      roomName: r.roomName,
      capacity: r.capacity,
      pricePerNightNonmember: Number(r.pricePerNightNonmember),
      pricePerNightMember: Number(r.pricePerNightMember),
      description: r.description,
      imageUrl: r.imageUrl,
    })),
  });
});

export default router;
