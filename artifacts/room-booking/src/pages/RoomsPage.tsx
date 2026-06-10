import { useLocation, Link } from "wouter";
import { useGetAvailability, useListRooms } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";

function useQuery() {
  const [location] = useLocation();
  return new URLSearchParams(location.includes("?") ? location.split("?")[1] : "");
}

export default function RoomsPage() {
  const query = useQuery();
  const checkIn = query.get("check_in") ?? "";
  const checkOut = query.get("check_out") ?? "";

  const hasDateRange = !!checkIn && !!checkOut;

  const { data: availableRooms, isLoading: loadingAvail } = useGetAvailability(
    { check_in: checkIn, check_out: checkOut },
    { query: { enabled: hasDateRange } }
  );
  const { data: allRooms, isLoading: loadingAll } = useListRooms({
    query: { enabled: !hasDateRange },
  });

  const rooms = hasDateRange ? availableRooms : allRooms;
  const isLoading = hasDateRange ? loadingAvail : loadingAll;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-stone-900 text-white py-14 px-4 text-center">
        <p className="text-amber-300 text-xs font-semibold tracking-widest uppercase mb-2">
          Browse
        </p>
        <h1 className="text-4xl font-serif font-bold mb-3">Our Rooms</h1>
        {hasDateRange ? (
          <p className="text-stone-300 text-sm">
            Available rooms from <strong>{checkIn}</strong> to <strong>{checkOut}</strong>
          </p>
        ) : (
          <p className="text-stone-300 text-sm">All rooms — select dates on the home page to filter availability</p>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Date hint */}
        {!hasDateRange && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 text-amber-800 text-sm text-center">
            No dates selected. <Link href="/" className="font-semibold underline">Select dates</Link> to check availability.
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
                <div className="h-48 bg-stone-200" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-stone-200 rounded w-1/3" />
                  <div className="h-3 bg-stone-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && rooms && rooms.length === 0 && (
          <div className="text-center py-20">
            <p className="text-stone-400 text-lg">No rooms available for the selected dates.</p>
            <Link href="/" className="mt-4 inline-block text-amber-600 font-semibold hover:underline">
              Try different dates
            </Link>
          </div>
        )}

        {!isLoading && rooms && rooms.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div
                key={room.roomId}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={room.imageUrl ?? "https://picsum.photos/seed/default/800/600"}
                    alt={`Room ${room.roomName}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-stone-900/80 text-white text-xs font-bold px-2.5 py-1 rounded">
                    Room {room.roomName}
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-stone-800 text-lg">Room {room.roomName}</h3>
                    <span className="text-stone-400 text-xs">{room.capacity} bed{room.capacity > 1 ? "s" : ""}</span>
                  </div>
                  <p className="text-stone-500 text-sm mb-4 line-clamp-2">{room.description}</p>

                  <div className="bg-stone-50 rounded-lg p-3 mb-4 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Standard rate</span>
                      <span className="font-semibold text-stone-800">{formatCurrency(room.pricePerNightNonmember)}/night</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-600 font-medium">Member rate</span>
                      <span className="font-semibold text-amber-700">{formatCurrency(room.pricePerNightMember)}/night</span>
                    </div>
                  </div>

                  <Link
                    href={`/rooms/${room.roomId}?check_in=${checkIn}&check_out=${checkOut}`}
                    className="block w-full text-center bg-stone-900 hover:bg-stone-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
                  >
                    Book this room
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
