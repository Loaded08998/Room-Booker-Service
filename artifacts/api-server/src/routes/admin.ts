import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, adminsTable, bookingsTable, guestsTable, reservationsTable, roomsTable } from "@workspace/db";
import {
  AdminLoginBody,
  ListAdminBookingsQueryParams,
  UpdateBookingStatusParams,
  UpdateBookingStatusBody,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function getJwtSecret(): string {
  return process.env.SESSION_SECRET ?? "dev-secret-change-me";
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = auth.slice(7);
  try {
    jwt.verify(token, getJwtSecret());
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [admin] = await db
    .select()
    .from(adminsTable)
    .where(eq(adminsTable.username, parsed.data.username));

  if (!admin) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(parsed.data.password, admin.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = jwt.sign(
    { adminId: admin.adminId, username: admin.username },
    getJwtSecret(),
    { expiresIn: "24h" }
  );

  res.json({ token });
});

router.get("/admin/bookings", requireAdmin, async (req, res): Promise<void> => {
  const queryParams = ListAdminBookingsQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }

  const { status, date_from, date_to } = queryParams.data;

  let bookings = await db
    .select()
    .from(bookingsTable)
    .orderBy(bookingsTable.createdAt);

  // Apply filters
  if (status) {
    bookings = bookings.filter((b) => b.status === status);
  }
  if (date_from) {
    bookings = bookings.filter((b) => b.checkInDate >= date_from);
  }
  if (date_to) {
    bookings = bookings.filter((b) => b.checkOutDate <= date_to);
  }

  const bookingIds = bookings.map((b) => b.bookingId);
  const guestIds = bookings.map((b) => b.guestId);

  const guests =
    guestIds.length > 0
      ? await db.select().from(guestsTable).where(inArray(guestsTable.guestId, guestIds))
      : [];

  const reservations =
    bookingIds.length > 0
      ? await db
          .select()
          .from(reservationsTable)
          .where(inArray(reservationsTable.bookingId, bookingIds))
      : [];

  const roomIds = reservations.map((r) => r.roomId);
  const rooms =
    roomIds.length > 0
      ? await db.select().from(roomsTable).where(inArray(roomsTable.roomId, roomIds))
      : [];

  const result = bookings.map((booking) => {
    const guest = guests.find((g) => g.guestId === booking.guestId);
    const bookingRoomIds = reservations
      .filter((r) => r.bookingId === booking.bookingId)
      .map((r) => r.roomId);
    const bookingRooms = rooms.filter((r) => bookingRoomIds.includes(r.roomId));

    return {
      bookingId: booking.bookingId,
      guestId: booking.guestId,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      totalPrice: Number(booking.totalPrice),
      status: booking.status,
      createdAt: booking.createdAt.toISOString(),
      guest: guest
        ? {
            guestId: guest.guestId,
            guestName: guest.guestName,
            email: guest.email,
            phone: guest.phone,
            isMember: guest.isMember,
          }
        : null,
      rooms: bookingRooms.map((r) => ({
        roomId: r.roomId,
        roomName: r.roomName,
        capacity: r.capacity,
        pricePerNightNonmember: Number(r.pricePerNightNonmember),
        pricePerNightMember: Number(r.pricePerNightMember),
        description: r.description,
        imageUrl: r.imageUrl,
      })),
    };
  });

  res.json(result);
});

router.put("/admin/bookings/:id/status", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateBookingStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateBookingStatusBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const allowed = ["pending", "confirmed", "cancelled"];
  if (!allowed.includes(body.data.status)) {
    res.status(400).json({ error: "Invalid status value" });
    return;
  }

  const [booking] = await db
    .update(bookingsTable)
    .set({ status: body.data.status })
    .where(eq(bookingsTable.bookingId, params.data.id))
    .returning();

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  res.json({
    bookingId: booking.bookingId,
    guestId: booking.guestId,
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
    totalPrice: Number(booking.totalPrice),
    status: booking.status,
    createdAt: booking.createdAt.toISOString(),
  });
});

export default router;
