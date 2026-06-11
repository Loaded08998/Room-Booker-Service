import { Link } from "wouter";
import { useGetBooking, getGetBookingQueryKey } from "@workspace/api-client-react";
import { formatDate, formatCurrency } from "@/lib/utils";

function useQuery() {
  return new URLSearchParams(window.location.search);
}

export default function BookingSuccessPage() {
  const query = useQuery();
  const bookingId = Number(query.get("bookingId") ?? 0);

  const { data: booking, isLoading } = useGetBooking(bookingId, {
    query: { queryKey: getGetBookingQueryKey(bookingId), enabled: !!bookingId },
  });

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        {/* Success icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-serif font-bold text-stone-800 mb-2">Booking Confirmed</h1>
        <p className="text-stone-500 mb-8">Thank you for your reservation.</p>

        {isLoading && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 animate-pulse">
            <div className="h-4 bg-stone-200 rounded mb-3 w-1/2 mx-auto" />
            <div className="h-3 bg-stone-100 rounded mb-2" />
            <div className="h-3 bg-stone-100 rounded mb-2 w-2/3 mx-auto" />
          </div>
        )}

        {booking && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 mb-6 text-left">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Booking Details</span>
              <span className="text-xs font-bold bg-stone-900 text-white px-2.5 py-1 rounded">
                #{booking.bookingId}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">Guest</span>
                <span className="font-medium text-stone-800">{booking.guest?.guestName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Rooms</span>
                <span className="font-medium text-stone-800">
                  {booking.rooms?.map((r) => `Room ${r.roomName}`).join(", ")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Check-in</span>
                <span className="font-medium text-stone-800">{formatDate(booking.checkInDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Check-out</span>
                <span className="font-medium text-stone-800">{formatDate(booking.checkOutDate)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-stone-100">
                <span className="font-semibold text-stone-700">Total Paid</span>
                <span className="font-bold text-amber-600">{formatCurrency(booking.totalPrice)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Email notice */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-8 text-sm text-amber-800">
          <p>A confirmation email has been sent to</p>
          {booking && <p className="font-semibold mt-0.5">{booking.guest?.email}</p>}
        </div>

        <Link
          href="/"
          className="inline-block bg-stone-900 hover:bg-stone-700 text-white font-semibold px-8 py-3 rounded-lg text-sm uppercase tracking-wide transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
