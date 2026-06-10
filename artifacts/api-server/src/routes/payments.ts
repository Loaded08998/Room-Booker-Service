import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db, bookingsTable, guestsTable } from "@workspace/db";
import { CreatePaymentIntentBody } from "@workspace/api-zod";
import { sendBookingConfirmation } from "../lib/email";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(key);
}

router.post("/payments/create-intent", async (req, res): Promise<void> => {
  const parsed = CreatePaymentIntentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.bookingId, parsed.data.bookingId));

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  try {
    const stripe = getStripe();
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(Number(booking.totalPrice) * 100), // in cents
      currency: "thb",
      metadata: { bookingId: booking.bookingId.toString() },
    });

    res.json({ clientSecret: intent.client_secret });
  } catch (err) {
    req.log.error({ err }, "Stripe error");
    res.status(500).json({ error: "Payment service error" });
  }
});

// Webhook: mark booking confirmed after payment, send email
router.post("/payments/webhook", async (req, res): Promise<void> => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (webhookSecret && sig) {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = req.body as Stripe.Event;
    }
  } catch (err) {
    req.log.error({ err }, "Webhook signature error");
    res.status(400).json({ error: "Webhook error" });
    return;
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const bookingId = parseInt(intent.metadata.bookingId, 10);

    const [booking] = await db
      .update(bookingsTable)
      .set({ status: "confirmed" })
      .where(eq(bookingsTable.bookingId, bookingId))
      .returning();

    if (booking) {
      const [guest] = await db
        .select()
        .from(guestsTable)
        .where(eq(guestsTable.guestId, booking.guestId));

      if (guest) {
        try {
          await sendBookingConfirmation({
            to: guest.email,
            guestName: guest.guestName,
            bookingId: booking.bookingId,
            checkInDate: booking.checkInDate,
            checkOutDate: booking.checkOutDate,
            totalPrice: Number(booking.totalPrice),
          });
        } catch (emailErr) {
          logger.error({ emailErr }, "Failed to send confirmation email");
        }
      }
    }
  }

  res.json({ received: true });
});

export default router;
