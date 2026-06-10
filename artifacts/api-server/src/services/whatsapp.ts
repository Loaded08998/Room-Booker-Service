import { logger } from "../lib/logger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: any = null;
let isReady = false;

export interface WhatsAppBookingData {
  phone: string | null;
  guestName: string;
  bookingId: number;
  rooms: string[];
  checkIn: string;
  checkOut: string;
  totalPrice: number;
}

export function initWhatsApp(): void {
  try {
    // Dynamic require so a missing/broken install never crashes the server
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Client, LocalAuth } = require("whatsapp-web.js");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const qrcode = require("qrcode-terminal");

    client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium-browser",
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      },
    });

    client.on("qr", (qr: string) => {
      logger.info("Scan this QR code in WhatsApp to connect:");
      qrcode.generate(qr, { small: true });
    });

    client.on("ready", () => {
      isReady = true;
      logger.info("WhatsApp client is ready");
    });

    client.on("auth_failure", (msg: string) => {
      isReady = false;
      logger.warn({ msg }, "WhatsApp auth failure");
    });

    client.on("disconnected", (reason: string) => {
      isReady = false;
      logger.warn({ reason }, "WhatsApp client disconnected");
    });

    client.initialize();
    logger.info("WhatsApp client initializing — scan QR code when prompted in server logs");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ msg }, "WhatsApp init skipped — Chromium or whatsapp-web.js unavailable");
  }
}

export async function sendWhatsAppConfirmation(data: WhatsAppBookingData): Promise<void> {
  if (!isReady || !client) {
    logger.warn("WhatsApp not ready — skipping message");
    return;
  }

  if (!data.phone) {
    logger.warn("No phone number for guest — skipping WhatsApp");
    return;
  }

  try {
    const cleaned = data.phone.replace(/\D/g, "").replace(/^0/, "");
    const number = `91${cleaned}@c.us`;

    const message =
      `🏨 *Booking Confirmed!*\n\n` +
      `Hi ${data.guestName},\n` +
      `Your booking has been confirmed.\n\n` +
      `📋 *Booking ID:* ${data.bookingId}\n` +
      `🛏️ *Rooms:* ${data.rooms.join(", ")}\n` +
      `📅 *Check-in:* ${data.checkIn}\n` +
      `📅 *Check-out:* ${data.checkOut}\n` +
      `💰 *Total Paid:* ₹${Number(data.totalPrice).toLocaleString("en-IN")}\n\n` +
      `Thank you for your booking!`;

    await client.sendMessage(number, message);
    logger.info({ number }, "WhatsApp confirmation sent");
  } catch (err) {
    logger.warn({ err }, "WhatsApp send failed — skipping");
  }
}

export function getWhatsAppStatus(): boolean {
  return isReady;
}
