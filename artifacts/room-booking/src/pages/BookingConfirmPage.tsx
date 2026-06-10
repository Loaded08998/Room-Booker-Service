import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import useRazorpay from "react-razorpay";
import { useGetBooking } from "@workspace/api-client-react";
import { formatDate } from "@/lib/utils";

function useQuery() {
  return new URLSearchParams(window.location.search);
}

interface RazorpayOrder {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
}

function fmtINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export default function BookingConfirmPage() {
  const query = useQuery();
  const bookingId = Number(query.get("bookingId") ?? 0);
  const [, navigate] = useLocation();

  const { data: booking, isLoading: bookingLoading } = useGetBooking(bookingId, {
    query: { enabled: !!bookingId },
  });

  const [Razorpay] = useRazorpay();
  const [order, setOrder] = useState<RazorpayOrder | null>(null);
  const [orderError, setOrderError] = useState("");
  const [orderLoading, setOrderLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  // Create Razorpay order once booking is loaded
  useEffect(() => {
    if (!booking || order || orderLoading) return;

    setOrderLoading(true);
    fetch("/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: booking.bookingId, total_amount: booking.totalPrice }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setOrderError(data.error); return; }
        setOrder(data as RazorpayOrder);
      })
      .catch(() => setOrderError("Could not initialize payment. Please try again."))
      .finally(() => setOrderLoading(false));
  }, [booking]);

  const handlePay = useCallback(() => {
    if (!order || !booking || !Razorpay) return;
    setVerifyError("");

    const options = {
      key: order.key_id ?? import.meta.env.VITE_RAZORPAY_KEY_ID,
      order_id: order.order_id,
      amount: order.amount,
      currency: "INR",
      name: "Room Booking Service",
      description: `Booking #${booking.bookingId}`,
      prefill: {
        name: booking.guest?.guestName ?? "",
        email: booking.guest?.email ?? "",
        contact: booking.guest?.phone ?? "",
      },
      theme: { color: "#d97706" },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        setVerifying(true);
        try {
          const result = await fetch("/api/payments/verify-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              booking_id: booking.bookingId,
            }),
          });
          const data = await result.json();
          if (data.success) {
            navigate(`/booking/success?bookingId=${booking.bookingId}`);
          } else {
            setVerifyError("Payment verification failed. Contact support.");
          }
        } catch {
          setVerifyError("Network error during verification.");
        } finally {
          setVerifying(false);
        }
      },
    };

    const rzp = new Razorpay(options);
    rzp.on("payment.failed", (response: { error: { description: string } }) => {
      setVerifyError(`Payment failed: ${response.error.description}`);
    });
    rzp.open();
  }, [order, booking, Razorpay, navigate]);

  if (!bookingId) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-stone-400">No booking found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-amber-600 text-xs font-semibold tracking-widest uppercase mb-1">Almost there</p>
          <h1 className="text-3xl font-serif font-bold text-stone-800">Complete your booking</h1>
        </div>

        {/* Booking summary */}
        {bookingLoading && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-6 animate-pulse">
            <div className="h-4 bg-stone-200 rounded mb-3 w-1/2" />
            <div className="space-y-2">
              <div className="h-3 bg-stone-100 rounded" />
              <div className="h-3 bg-stone-100 rounded w-2/3" />
            </div>
          </div>
        )}

        {booking && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-6">
            <h2 className="font-semibold text-stone-700 text-sm uppercase tracking-wider mb-4">
              Booking Summary
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">Guest</span>
                <span className="font-medium text-stone-800">{booking.guest?.guestName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Email</span>
                <span className="font-medium text-stone-800">{booking.guest?.email}</span>
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
                <span className="font-semibold text-stone-700">Total</span>
                <span className="font-bold text-amber-600 text-base">
                  {fmtINR(booking.totalPrice)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Payment section */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
          <h2 className="font-semibold text-stone-700 text-sm uppercase tracking-wider mb-4">Payment</h2>

          {orderError && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4 text-red-500 text-sm">
              {orderError}
            </div>
          )}
          {verifyError && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4 text-red-500 text-sm">
              {verifyError}
            </div>
          )}

          {orderLoading && (
            <div className="text-center py-6 text-stone-400 text-sm animate-pulse">
              Preparing payment…
            </div>
          )}

          {verifying && (
            <div className="text-center py-6 text-stone-500 text-sm">
              Verifying payment…
            </div>
          )}

          {order && !verifying && (
            <div>
              <div className="bg-stone-50 rounded-lg px-4 py-3 mb-5 text-xs text-stone-500 flex items-center justify-between">
                <span>Secure payment via Razorpay</span>
                <span className="font-semibold text-stone-700">{fmtINR(booking?.totalPrice ?? 0)}</span>
              </div>
              <button
                onClick={handlePay}
                disabled={!Razorpay}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-stone-200 disabled:text-stone-400 text-white font-semibold py-3.5 rounded-lg transition-colors text-sm uppercase tracking-wide"
              >
                Pay {booking ? fmtINR(booking.totalPrice) : ""}
              </button>
              <p className="text-center text-xs text-stone-400 mt-3">
                You'll be redirected to Razorpay's secure checkout
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
