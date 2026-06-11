import { useState } from "react";
import { useLocation } from "wouter";

const CAPACITY_OPTIONS = [
  { value: "", label: "Any size" },
  { value: "2", label: "2 beds" },
  { value: "3", label: "3 beds" },
  { value: "4", label: "4 beds" },
  { value: "10", label: "10 beds (Conference)" },
];

export default function HomePage() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const [checkIn, setCheckIn] = useState(fmt(today));
  const [checkOut, setCheckOut] = useState(fmt(tomorrow));
  const [capacity, setCapacity] = useState("");
  const [, navigate] = useLocation();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ check_in: checkIn, check_out: checkOut });
    if (capacity) params.set("capacity", capacity);
    navigate(`/rooms?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Hero */}
      <div
        className="relative h-[85vh] flex items-center justify-center"
        style={{
          backgroundImage: "url('https://picsum.photos/seed/hero-lobby/1600/900')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-stone-900/55" />
        <div className="relative z-10 text-center px-4 w-full">
          <p className="text-amber-300 text-sm font-semibold tracking-widest uppercase mb-3">
            Welcome
          </p>
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 leading-tight">
            A place to rest,<br />a place to gather.
          </h1>
          <p className="text-stone-200 text-lg md:text-xl max-w-xl mx-auto mb-10">
            Comfortable rooms for solo travelers, groups, and everyone in between.
          </p>

          {/* Search Form */}
          <form
            onSubmit={handleSearch}
            className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 md:p-8 max-w-3xl mx-auto"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <div className="text-left">
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Check-in
                </label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  min={fmt(today)}
                  className="w-full border border-stone-200 rounded-lg px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                  required
                />
              </div>
              <div className="text-left">
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Check-out
                </label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  min={checkIn || fmt(tomorrow)}
                  className="w-full border border-stone-200 rounded-lg px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                  required
                />
              </div>
              <div className="text-left">
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Capacity
                </label>
                <select
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full border border-stone-200 rounded-lg px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm bg-white appearance-none cursor-pointer"
                >
                  {CAPACITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3.5 rounded-lg transition-colors text-sm tracking-wide uppercase"
            >
              Find Available Rooms
            </button>
          </form>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-serif text-stone-800 text-center mb-12">Why stay with us?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: "Member Pricing", desc: "Members enjoy up to 50% off room rates. Register once, save every stay." },
            { title: "All Room Types", desc: "From cozy 2-bed rooms to group conference rooms that sleep 10." },
            { title: "Simple Booking", desc: "Pick dates, choose a room, pay securely — confirmation arrives in your inbox." },
          ].map((f) => (
            <div key={f.title} className="text-center p-6">
              <div className="w-12 h-1 bg-amber-400 mx-auto mb-5 rounded" />
              <h3 className="font-semibold text-stone-800 text-lg mb-2">{f.title}</h3>
              <p className="text-stone-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
