import { Resend } from "resend";
import { logger } from "./logger";

interface BookingConfirmationData {
  to: string;
  guestName: string;
  bookingId: number;
  checkInDate: string;
  checkOutDate: string;
  totalPrice: number;
}

export async function sendBookingConfirmation(data: BookingConfirmationData): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn("RESEND_API_KEY not set, skipping email");
    return;
  }

  const resend = new Resend(apiKey);
  const fromEmail = process.env.EMAIL_FROM ?? "bookings@resend.dev";

  await resend.emails.send({
    from: fromEmail,
    to: data.to,
    subject: `Booking Confirmation #${data.bookingId}`,
    html: `
      <h2>Booking Confirmed</h2>
      <p>Dear ${data.guestName},</p>
      <p>Your booking has been confirmed!</p>
      <ul>
        <li><strong>Booking ID:</strong> ${data.bookingId}</li>
        <li><strong>Check-in:</strong> ${data.checkInDate}</li>
        <li><strong>Check-out:</strong> ${data.checkOutDate}</li>
        <li><strong>Total:</strong> ₹${data.totalPrice.toLocaleString("en-IN")}</li>
      </ul>
      <p>We look forward to welcoming you.</p>
    `,
  });
}
