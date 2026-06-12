import { db, pool } from "./index";
import {
    roomsTable,
    guestsTable,
    bookingsTable,
    reservationsTable,
    adminsTable
} from "./schema/index.js";

async function seed() {
    console.log("Seeding Databases...");

    // Rooms
    const rooms = await db.insert(roomsTable).values([
        { roomName: "CR", capacity: 10, pricePerNightNonmember: "7000.00", pricePerNightMember: "4000.00", description: "Conference Room, double AC, large bathroom", imageUrl: null },
        { roomName: "201", capacity: 4, pricePerNightNonmember: "3580.00", pricePerNightMember: "1800.00", description: "4 bed room with 1 bathroom. 2 rooms with 2 beds and each room has a tv and AC.", imageUrl: null },
        { roomName: "212", capacity: 4, pricePerNightNonmember: "3580.00", pricePerNightMember: "1800.00", description: "4 bed room with 1 bathroom. 2 rooms with 2 beds and each room has a tv and AC.", imageUrl: null },
        { roomName: "101", capacity: 3, pricePerNightNonmember: "2700.00", pricePerNightMember: "1350.00", description: "3 bed room with 1 bathroom. 1 room with 3 beds and a tv and AC.", imageUrl: null },
        { roomName: "102", capacity: 2, pricePerNightNonmember: "1800.00", pricePerNightMember: "900.00", description: "2 bed room with 1 bathroom. 1 room with 2 beds and a tv and AC.", imageUrl: null },
        { roomName: "202", capacity: 2, pricePerNightNonmember: "1800.00", pricePerNightMember: "900.00", description: "2 bed room with 1 bathroom. 1 room with 2 beds and a tv and AC.", imageUrl: null },
        { roomName: "203", capacity: 2, pricePerNightNonmember: "1800.00", pricePerNightMember: "900.00", description: "2 bed room with 1 bathroom. 1 room with 2 beds and a tv and AC.", imageUrl: null },
        { roomName: "204", capacity: 2, pricePerNightNonmember: "1800.00", pricePerNightMember: "900.00", description: "2 bed room with 1 bathroom. 1 room with 2 beds and a tv and AC.", imageUrl: null },
        { roomName: "205", capacity: 2, pricePerNightNonmember: "1800.00", pricePerNightMember: "900.00", description: "2 bed room with 1 bathroom. 1 room with 2 beds and a tv and AC.", imageUrl: null },
        { roomName: "206", capacity: 2, pricePerNightNonmember: "1800.00", pricePerNightMember: "900.00", description: "2 bed room with 1 bathroom. 1 room with 2 beds and a tv and AC.", imageUrl: null },
        { roomName: "207", capacity: 2, pricePerNightNonmember: "1800.00", pricePerNightMember: "900.00", description: "2 bed room with 1 bathroom. 1 room with 2 beds and a tv and AC.", imageUrl: null },
        { roomName: "208", capacity: 2, pricePerNightNonmember: "1800.00", pricePerNightMember: "900.00", description: "2 bed room with 1 bathroom. 1 room with 2 beds and a tv and AC.", imageUrl: null },
        { roomName: "209", capacity: 2, pricePerNightNonmember: "1800.00", pricePerNightMember: "900.00", description: "2 bed room with 1 bathroom. 1 room with 2 beds and a tv and AC.", imageUrl: null },
        { roomName: "210", capacity: 2, pricePerNightNonmember: "1800.00", pricePerNightMember: "900.00", description: "2 bed room with 1 bathroom. 1 room with 2 beds and a tv and AC.", imageUrl: null },
        { roomName: "211", capacity: 2, pricePerNightNonmember: "1800.00", pricePerNightMember: "900.00", description: "2 bed room with 1 bathroom. 1 room with 2 beds and a tv and AC.", imageUrl: null },
        { roomName: "307", capacity: 2, pricePerNightNonmember: "1800.00", pricePerNightMember: "900.00", description: "2 bed room with 1 bathroom. 1 room with 2 beds and a tv and AC.", imageUrl: null },
        { roomName: "308", capacity: 2, pricePerNightNonmember: "1800.00", pricePerNightMember: "900.00", description: "2 bed room with 1 bathroom. 1 room with 2 beds and a tv and AC.", imageUrl: null },

    ]).returning();
    console.log(rooms.length, " num Rooms seeded");

    // Guests
    const guests = await db.insert(guestsTable).values([
        { guestName: "Alice Johnson", email: "[EMAIL_ADDRESS]", phone: "555-0101", isMember: true },
        { guestName: "Bob Smith", email: "[EMAIL_ADDRESS]", phone: "555-0102", isMember: false },
        { guestName: "Charlie Brown", email: "[EMAIL_ADDRESS]", phone: "555-0103", isMember: true },
        { guestName: "Diana Prince", email: "[EMAIL_ADDRESS]", phone: "555-0104", isMember: false },
        { guestName: "Eve Martinez", email: "[EMAIL_ADDRESS]", phone: "555-0105", isMember: true },
        { guestName: "Frank Wright", email: "[EMAIL_ADDRESS]", phone: "555-0106", isMember: false },
        { guestName: "Grace Lee", email: "[EMAIL_ADDRESS]", phone: "555-0107", isMember: true },
        { guestName: "Henry Davis", email: "[EMAIL_ADDRESS]", phone: "555-0108", isMember: false },
        { guestName: "Ivy Wilson", email: "[EMAIL_ADDRESS]", phone: "555-0109", isMember: true },
        { guestName: "Jack Taylor", email: "[EMAIL_ADDRESS]", phone: "555-0110", isMember: false },
    ])
        .returning();
    console.log(guests.length, " num Guests seeded");

    // Bookings

    const bookings = await db.insert(bookingsTable).values([
        { guestId: guests[0].guestId, checkInDate: "2026-07-01", checkOutDate: "2026-07-05", totalPrice: "320.00", status: "confirmed" },
        { guestId: guests[1].guestId, checkInDate: "2026-08-10", checkOutDate: "2026-08-12", totalPrice: "400.00", status: "pending" },
        { guestId: guests[2].guestId, checkInDate: "2026-09-01", checkOutDate: "2026-09-05", totalPrice: "320.00", status: "confirmed" },
        { guestId: guests[3].guestId, checkInDate: "2026-09-01", checkOutDate: "2026-09-05", totalPrice: "400.00", status: "pending" },
        { guestId: guests[4].guestId, checkInDate: "2026-09-01", checkOutDate: "2026-09-05", totalPrice: "320.00", status: "confirmed" },
        { guestId: guests[5].guestId, checkInDate: "2026-09-01", checkOutDate: "2026-09-05", totalPrice: "400.00", status: "pending" },
        { guestId: guests[6].guestId, checkInDate: "2026-09-01", checkOutDate: "2026-09-05", totalPrice: "320.00", status: "confirmed" },
        { guestId: guests[7].guestId, checkInDate: "2026-09-01", checkOutDate: "2026-09-05", totalPrice: "400.00", status: "pending" },
        { guestId: guests[8].guestId, checkInDate: "2026-09-01", checkOutDate: "2026-09-05", totalPrice: "320.00", status: "confirmed" },
        { guestId: guests[9].guestId, checkInDate: "2026-09-01", checkOutDate: "2026-09-05", totalPrice: "400.00", status: "pending" },
    ])
        .returning();
    console.log(bookings.length, " num Bookings seeded");

    // Reservations
    const reservations = await db
        .insert(reservationsTable)
        .values([
            { bookingId: bookings[0].bookingId, roomId: rooms[11].roomId, priceAtBooking: "80.00", reservationDate: "2026-07-01" },
            { bookingId: bookings[1].bookingId, roomId: rooms[12].roomId, priceAtBooking: "200.00", reservationDate: "2026-08-10" },
            { bookingId: bookings[2].bookingId, roomId: rooms[13].roomId, priceAtBooking: "300.00", reservationDate: "2026-09-01" },
            { bookingId: bookings[3].bookingId, roomId: rooms[14].roomId, priceAtBooking: "150.00", reservationDate: "2026-09-01" },
        ])
        .returning();

    console.log(reservations.length, " num Reservations seeded");

    // Admins
    await db.insert(adminsTable).values([
        { username: "admin", passwordHash: "CHANGE_ME_use_a_real_bcrypt_hash_here" },
    ]); // Temp only, use real bycrypt hash here

    console.log("Admins seeded successfully");

    console.log("Seeding complete");

}

seed().catch((err) => { console.error("Seeding failed:", err); process.exit(1) });