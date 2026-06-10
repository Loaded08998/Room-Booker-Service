import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useGetBooking, useCreatePaymentIntent } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";

function useQuery() {
  const [location] = useLocation();
  return new URLSearchParams(location.includes("?") ? location.split("?")[1] : "");
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "");

function PaymentForm({ bookingId, clientSecret }: { bookingId: number; clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [, navigate] = useLocation();
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError("");

    const card = elements.getElement(CardElement);
    if (!card) {
      setProcessing(false);
      return;
    }

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    });

    if (stripeError) {
      setError(stripeError.message ?? "Payment failed");
      setProcessing(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      navigate(`/booking/success?bookingId=${bookingId}`);
    }

    setProcessing(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
          Card Details
        </label>
        <div className="border border-stone-200 rounded-lg px-4 py-4 focus-within:ring-2 focus-within:ring-amber-400">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "15px",
                  color: "#1c1917",
                  "::placeholder": { color: "#a8a29e" },
                },
              },
            }}
          />
        </div>
        <p className="text-xs text-stone-400 mt-1.5">Test card: 4242 4242 4242 4242 · Any future date · Any CVC</p>
      </div>

      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={processing || !stripe}
        className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-stone-200 disabled:text-stone-400 text-white font-semibold py-3.5 rounded-lg transition-colors text-sm uppercase tracking-wide"
      >
        {processing ? "Processing payment..." : "Confirm Payment"}
      </button>
    </form>
  );
}

export default function BookingConfirmPage() {
  const query = useQuery();
  const bookingId = Number(query.get("bookingId") ?? 0);

  const { data: booking } = useGetBooking(bookingId, {
    query: { enabled: !!bookingId },
  });

  const createPaymentIntent = useCreatePaymentIntent();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentError, setIntentError] = useState("");

  useEffect(() => {
    if (!bookingId) return;
    createPaymentIntent.mutate(
      { data: { bookingId } },
      {
        onSuccess: (data) => setClientSecret(data.clientSecret ?? null),
        onError: (err: any) => setIntentError(err?.data?.error ?? "Could not initialize payment."),
      }
    );
  }, [bookingId]);

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
        {booking && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-6">
            <h2 className="font-semibold text-stone-700 text-sm uppercase tracking-wider mb-4">Booking Summary</h2>
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
                <span className="font-bold text-amber-600 text-base">{formatCurrency(booking.totalPrice)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Payment */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
          <h2 className="font-semibold text-stone-700 text-sm uppercase tracking-wider mb-4">Payment</h2>

          {intentError && (
            <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
              {intentError}
            </p>
          )}

          {!clientSecret && !intentError && (
            <div className="animate-pulse text-stone-300 text-sm text-center py-6">Loading payment form...</div>
          )}

          {clientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm bookingId={bookingId} clientSecret={clientSecret} />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
}
