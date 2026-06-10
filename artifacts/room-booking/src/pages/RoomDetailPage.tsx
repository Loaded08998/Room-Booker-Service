import { useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useGetRoom, useCreateBooking } from "@workspace/api-client-react";
import { formatCurrency, calcNights } from "@/lib/utils";

function useQuery() {
  const [location] = useLocation();
  return new URLSearchParams(location.includes("?") ? location.split("?")[1] : "");
}

export default function RoomDetailPage() {
  const [, params] = useRoute("/rooms/:id");
  const roomId = Number(params?.id ?? 0);
  const query = useQuery();

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const [checkIn, setCheckIn] = useState(query.get("check_in") ?? today);
  const [checkOut, setCheckOut] = useState(query.get("check_out") ?? tomorrow);
  const [guestName, setGuestName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isMember, setIsMember] = useState(false);
  const [error, setError] = useState("");

  const { data: room, isLoading } = useGetRoom(roomId, {
    query: { enabled: !!roomId },
  });

  const createBooking = useCreateBooking();
  const [, navigate] = useLocation();

  const nights = checkIn && checkOut ? calcNights(checkIn, checkOut) : 0;
  const pricePerNight = room
    ? isMember
      ? room.pricePerNightMember
      : room.pricePerNightNonmember
    : 0;
  const totalPrice = pricePerNight * nights;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (nights <= 0) {
      setError("Check-out must be after check-in.");
      return;
    }

    createBooking.mutate(
      {
        data: {
          guestName,
          email,
          phone: phone || null,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          roomIds: [roomId],
          isMember,
        },
      },
      {
        onSuccess: (booking) => {
          navigate(`/booking/confirm?bookingId=${booking.bookingId}&total=${booking.totalPrice}`);
        },
        onError: (err: any) => {
          setError(err?.data?.error ?? "Could not create booking. Please try again.");
        },
      }
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-pulse text-stone-400">Loading room details...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-500 mb-4">Room not found.</p>
          <Link href="/rooms" className="text-amber-600 font-semibold hover:underline">
            Back to rooms
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Back nav */}
      <div className="max-w-5xl mx-auto px-4 pt-8">
        <Link href="/rooms" className="text-stone-500 hover:text-stone-800 text-sm flex items-center gap-1">
          ← Back to rooms
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left: Room info */}
        <div>
          <div className="rounded-2xl overflow-hidden shadow-sm mb-6">
            <img
              src={room.imageUrl ?? "https://picsum.photos/seed/default/800/600"}
              alt={`Room ${room.roomName}`}
              className="w-full h-72 object-cover"
            />
          </div>
          <h1 className="text-3xl font-serif font-bold text-stone-800 mb-2">Room {room.roomName}</h1>
          <p className="text-stone-400 text-sm mb-4">{room.capacity} bed{room.capacity > 1 ? "s" : ""}</p>
          <p className="text-stone-600 leading-relaxed mb-6">{room.description}</p>

          <div className="bg-white rounded-xl border border-stone-100 p-5">
            <h3 className="font-semibold text-stone-700 text-sm uppercase tracking-wider mb-3">Pricing</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">Standard rate</span>
                <span className="font-semibold text-stone-800">{formatCurrency(room.pricePerNightNonmember)} / night</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-600">Member rate</span>
                <span className="font-semibold text-amber-700">{formatCurrency(room.pricePerNightMember)} / night</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Booking form */}
        <div>
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
            <h2 className="font-serif text-2xl font-bold text-stone-800 mb-6">Reserve this room</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                    Check-in
                  </label>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    min={today}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                    Check-out
                  </label>
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    min={checkIn}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Phone <span className="text-stone-300 font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+66 81 234 5678"
                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMember}
                  onChange={(e) => setIsMember(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
                <span className="text-sm text-stone-700">
                  I am a member <span className="text-amber-600 font-medium">(save up to 50%)</span>
                </span>
              </label>

              {/* Price summary */}
              {nights > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <div className="flex justify-between text-sm text-stone-600 mb-1">
                    <span>{formatCurrency(pricePerNight)} × {nights} night{nights > 1 ? "s" : ""}</span>
                    <span>{isMember ? <span className="text-amber-700 font-medium">Member price</span> : "Standard price"}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-stone-800 text-base pt-2 border-t border-amber-200">
                    <span>Total</span>
                    <span>{formatCurrency(totalPrice)}</span>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={createBooking.isPending || nights <= 0}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-stone-200 disabled:text-stone-400 text-white font-semibold py-3 rounded-lg transition-colors text-sm uppercase tracking-wide"
              >
                {createBooking.isPending ? "Processing..." : "Proceed to Payment"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
