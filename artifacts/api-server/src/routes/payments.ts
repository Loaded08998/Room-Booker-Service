import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import crypto from "crypto";
import Razorpay from "razorpay";
import { db, bookingsTable, guestsTable, reservationsTable, roomsTable } from "@workspace/db";
import { sendBookingConfirmation } from "../lib/email";
import { sendWhatsAppConfirmation } from "../services/whatsapp";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function getRazorpay(): Razorpay {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set");
  }
  return new Razorpay({ key_id, key_secret });
}

// POST /api/payments/create-order
router.post("/payments/create-order", async (req, res): Promise<void> => {
  const { booking_id, total_amount } = req.body as {
    booking_id?: unknown;
    total_amount?: unknown;
  };

  if (!booking_id || typeof booking_id !== "number") {
    res.status(400).json({ error: "booking_id (number) is required" });
    return;
  }
  if (total_amount === undefined || typeof total_amount !== "number") {
    res.status(400).json({ error: "total_amount (number) is required" });
    return;
  }

  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.bookingId, booking_id));

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  try {
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: Math.round(total_amount * 100), // paise
      currency: "INR",
      receipt: String(booking_id),
    });

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    req.log.error({ err }, "Razorpay create-order error");
    res.status(500).json({ error: "Payment service error" });
  }
});

// POST /api/payments/verify-order
router.post("/payments/verify-order", async (req, res): Promise<void> => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_id } =
    req.body as {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
      booking_id?: number;
    };

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !booking_id) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    res.status(500).json({ error: "Payment service not configured" });
    return;
  }

  // Verify HMAC SHA256 signature
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");

  if (expected !== razorpay_signature) {
    req.log.warn({ booking_id }, "Razorpay signature mismatch");
    res.status(400).json({ success: false, error: "Invalid payment signature" });
    return;
  }

  // Mark booking confirmed
  const [booking] = await db
    .update(bookingsTable)
    .set({ status: "confirmed" })
    .where(eq(bookingsTable.bookingId, booking_id))
    .returning();

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  // Fetch guest and rooms for notifications
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

  const roomNames = rooms.map((r) => `Room ${r.roomName}`);

  // Send email confirmation (non-blocking)
  if (guest) {
    sendBookingConfirmation({
      to: guest.email,
      guestName: guest.guestName,
      bookingId: booking.bookingId,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      totalPrice: Number(booking.totalPrice),
    }).catch((err) => logger.error({ err }, "Email send failed"));

    // Send WhatsApp confirmation (non-blocking, never throws)
    sendWhatsAppConfirmation({
      phone: guest.phone ?? null,
      guestName: guest.guestName,
      bookingId: booking.bookingId,
      rooms: roomNames,
      checkIn: booking.checkInDate,
      checkOut: booking.checkOutDate,
      totalPrice: Number(booking.totalPrice),
    }).catch((err) => logger.warn({ err }, "WhatsApp send error"));
  }

  res.json({ success: true, booking_id: booking.bookingId });
});

export default router;
