import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookingRow {
  bookingId: number;
  guestId: number;
  checkInDate: string;
  checkOutDate: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  guest: { guestId: number; guestName: string; email: string; phone: string | null; isMember: boolean } | null;
  rooms: { roomId: number; roomName: string; capacity: number }[];
}

interface GuestRow {
  guestId: number;
  guestName: string;
  email: string;
  phone: string | null;
  isMember: boolean;
}

interface RoomRow {
  roomId: number;
  roomName: string;
  capacity: number;
  pricePerNightNonmember: number;
  pricePerNightMember: number;
  description: string;
  imageUrl: string | null;
}

interface ReservationRow {
  reservationId: number;
  bookingId: number;
  roomId: number;
  priceAtBooking: number;
  roomName: string | null;
  guestId: number | null;
  checkInDate: string | null;
  checkOutDate: string | null;
  bookingStatus: string | null;
}

type Tab = "bookings" | "guests" | "rooms" | "reservations";

const API_BASE = "/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  const map: Record<string, string> = {
    confirmed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    pending: "bg-amber-100 text-amber-700",
  };
  return map[status] ?? "bg-stone-100 text-stone-600";
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td className={`px-4 py-3 text-sm ${mono ? "font-mono text-stone-500" : "text-stone-700"}`}>
      {children}
    </td>
  );
}

function IdBadge({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-600 text-xs font-mono px-2 py-0.5 rounded">
      <span className="text-stone-400">{label}</span>
      <span className="font-bold text-stone-800">{value}</span>
    </span>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Login failed"); return; }
      localStorage.setItem("admin_token", data.token);
      onLogin(data.token);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-amber-600 text-xs font-semibold tracking-widest uppercase mb-1">Admin</p>
          <h1 className="text-2xl font-serif font-bold text-stone-800">Staff Login</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Username</label>
            <input
              type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full bg-stone-900 hover:bg-stone-700 text-white font-semibold py-3 rounded-lg text-sm uppercase tracking-wide transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="text-center text-xs text-stone-400 mt-4">Default: admin / admin123</p>
      </div>
    </div>
  );
}

// ─── Tables ───────────────────────────────────────────────────────────────────

function BookingsTable({ token, onExpire }: { token: string; onExpire: () => void }) {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [actionError, setActionError] = useState("");

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    const res = await fetch(`${API_BASE}/admin/bookings?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) { onExpire(); return; }
    setRows(await res.json());
    setLoading(false);
  }, [token, statusFilter, dateFrom, dateTo, onExpire]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  async function updateStatus(bookingId: number, status: string) {
    setActionError("");
    const res = await fetch(`${API_BASE}/admin/bookings/${bookingId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) { const d = await res.json(); setActionError(d.error ?? "Update failed"); return; }
    fetchRows();
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end mb-4">
        <div>
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <button onClick={() => { setStatusFilter(""); setDateFrom(""); setDateTo(""); }}
          className="text-xs text-stone-400 hover:text-stone-700 underline mt-4">Clear</button>
      </div>

      {actionError && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2 mb-3">{actionError}</p>}

      <div className="bg-white rounded-xl border border-stone-100 overflow-hidden shadow-sm">
        {loading ? <div className="p-8 text-center text-stone-400 text-sm animate-pulse">Loading…</div>
          : rows.length === 0 ? <div className="p-8 text-center text-stone-400 text-sm">No bookings found.</div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b border-stone-100">
                  <tr>
                    <Th>Booking ID</Th><Th>Guest ID</Th><Th>Guest</Th>
                    <Th>Rooms</Th><Th>Check-in</Th><Th>Check-out</Th>
                    <Th>Total</Th><Th>Status</Th><Th>Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {rows.map((b) => (
                    <tr key={b.bookingId} className="hover:bg-stone-50 transition-colors">
                      <Td><IdBadge label="B#" value={b.bookingId} /></Td>
                      <Td><IdBadge label="G#" value={b.guestId} /></Td>
                      <Td>
                        <div className="font-medium text-stone-800">{b.guest?.guestName ?? "—"}</div>
                        <div className="text-xs text-stone-400">{b.guest?.email}</div>
                        {b.guest?.isMember && <span className="text-xs text-amber-600 font-medium">Member</span>}
                      </Td>
                      <Td>{b.rooms.map((r) => `Room ${r.roomName}`).join(", ") || "—"}</Td>
                      <Td mono>{b.checkInDate}</Td>
                      <Td mono>{b.checkOutDate}</Td>
                      <Td><span className="font-semibold text-stone-800">{formatCurrency(b.totalPrice)}</span></Td>
                      <Td>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge(b.status)}`}>
                          {b.status}
                        </span>
                      </Td>
                      <Td>
                        <div className="flex gap-1.5">
                          {b.status !== "confirmed" && (
                            <button onClick={() => updateStatus(b.bookingId, "confirmed")}
                              className="text-xs bg-green-50 text-green-700 hover:bg-green-100 px-2.5 py-1 rounded-lg font-medium transition-colors">
                              Confirm
                            </button>
                          )}
                          {b.status !== "cancelled" && (
                            <button onClick={() => updateStatus(b.bookingId, "cancelled")}
                              className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2.5 py-1 rounded-lg font-medium transition-colors">
                              Cancel
                            </button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}

function GuestsTable({ token, onExpire }: { token: string; onExpire: () => void }) {
  const [rows, setRows] = useState<GuestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/admin/guests`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => { if (r.status === 401) { onExpire(); return r; } return r; })
      .then((r) => r.json())
      .then(setRows)
      .finally(() => setLoading(false));
  }, [token, onExpire]);

  return (
    <div className="bg-white rounded-xl border border-stone-100 overflow-hidden shadow-sm">
      {loading ? <div className="p-8 text-center text-stone-400 text-sm animate-pulse">Loading…</div>
        : rows.length === 0 ? <div className="p-8 text-center text-stone-400 text-sm">No guests yet.</div>
        : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-stone-100">
                <tr><Th>Guest ID</Th><Th>Name</Th><Th>Email</Th><Th>Phone</Th><Th>Member</Th></tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {rows.map((g) => (
                  <tr key={g.guestId} className="hover:bg-stone-50 transition-colors">
                    <Td><IdBadge label="G#" value={g.guestId} /></Td>
                    <Td><span className="font-medium text-stone-800">{g.guestName}</span></Td>
                    <Td mono>{g.email}</Td>
                    <Td mono>{g.phone ?? <span className="text-stone-300">—</span>}</Td>
                    <Td>
                      {g.isMember
                        ? <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">Member</span>
                        : <span className="text-xs text-stone-400">Standard</span>}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

function RoomsTable({ token, onExpire }: { token: string; onExpire: () => void }) {
  const [rows, setRows] = useState<RoomRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/admin/rooms`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => { if (r.status === 401) { onExpire(); return r; } return r; })
      .then((r) => r.json())
      .then(setRows)
      .finally(() => setLoading(false));
  }, [token, onExpire]);

  return (
    <div className="bg-white rounded-xl border border-stone-100 overflow-hidden shadow-sm">
      {loading ? <div className="p-8 text-center text-stone-400 text-sm animate-pulse">Loading…</div>
        : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-stone-100">
                <tr>
                  <Th>Room ID</Th><Th>Name</Th><Th>Capacity</Th>
                  <Th>Standard Rate/night</Th><Th>Member Rate/night</Th><Th>Description</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {rows.map((r) => (
                  <tr key={r.roomId} className="hover:bg-stone-50 transition-colors">
                    <Td><IdBadge label="R#" value={r.roomId} /></Td>
                    <Td><span className="font-semibold text-stone-800">Room {r.roomName}</span></Td>
                    <Td>{r.capacity} bed{r.capacity > 1 ? "s" : ""}</Td>
                    <Td><span className="font-medium">{formatCurrency(r.pricePerNightNonmember)}</span></Td>
                    <Td><span className="font-medium text-amber-700">{formatCurrency(r.pricePerNightMember)}</span></Td>
                    <Td><span className="text-stone-500 text-xs line-clamp-2">{r.description}</span></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

function ReservationsTable({ token, onExpire }: { token: string; onExpire: () => void }) {
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/admin/reservations`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => { if (r.status === 401) { onExpire(); return r; } return r; })
      .then((r) => r.json())
      .then(setRows)
      .finally(() => setLoading(false));
  }, [token, onExpire]);

  return (
    <div className="bg-white rounded-xl border border-stone-100 overflow-hidden shadow-sm">
      {loading ? <div className="p-8 text-center text-stone-400 text-sm animate-pulse">Loading…</div>
        : rows.length === 0 ? <div className="p-8 text-center text-stone-400 text-sm">No reservations yet.</div>
        : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-stone-100">
                <tr>
                  <Th>Reservation ID</Th><Th>Booking ID</Th><Th>Guest ID</Th>
                  <Th>Room</Th><Th>Price at Booking</Th>
                  <Th>Check-in</Th><Th>Check-out</Th><Th>Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {rows.map((r) => (
                  <tr key={r.reservationId} className="hover:bg-stone-50 transition-colors">
                    <Td><IdBadge label="RV#" value={r.reservationId} /></Td>
                    <Td><IdBadge label="B#" value={r.bookingId} /></Td>
                    <Td>{r.guestId != null ? <IdBadge label="G#" value={r.guestId} /> : "—"}</Td>
                    <Td>
                      <span className="font-medium text-stone-800">
                        {r.roomName ? `Room ${r.roomName}` : `#${r.roomId}`}
                      </span>
                    </Td>
                    <Td><span className="font-semibold">{formatCurrency(r.priceAtBooking)}</span></Td>
                    <Td mono>{r.checkInDate ?? "—"}</Td>
                    <Td mono>{r.checkOutDate ?? "—"}</Td>
                    <Td>
                      {r.bookingStatus && (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge(r.bookingStatus)}`}>
                          {r.bookingStatus}
                        </span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: "bookings",     label: "Bookings",     desc: "All guest bookings and status" },
  { id: "guests",       label: "Guests",       desc: "Registered guests" },
  { id: "rooms",        label: "Rooms",        desc: "All rooms and pricing" },
  { id: "reservations", label: "Reservations", desc: "Room-level reservation records" },
];

export default function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem("admin_token") ?? "");
  const [activeTab, setActiveTab] = useState<Tab>("bookings");
  const [waConnected, setWaConnected] = useState<boolean | null>(null);

  function handleExpire() {
    localStorage.removeItem("admin_token");
    setToken("");
  }

  function handleLogout() {
    localStorage.removeItem("admin_token");
    setToken("");
  }

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/admin/whatsapp-status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setWaConnected(d.connected); })
      .catch(() => {});
  }, [token]);

  if (!token) {
    return <LoginScreen onLogin={setToken} />;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Top nav */}
      <div className="bg-stone-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-amber-400 text-xs font-bold tracking-widest uppercase">Admin</span>
          <span className="text-stone-600">·</span>
          <h1 className="font-serif font-bold text-lg">Database Viewer</h1>
        </div>
        <div className="flex items-center gap-4">
          {waConnected !== null && (
            <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
              waConnected
                ? "bg-green-900/50 text-green-300"
                : "bg-stone-800 text-stone-400"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${waConnected ? "bg-green-400" : "bg-red-500"}`} />
              {waConnected ? "WhatsApp Connected" : "WhatsApp Offline — scan QR in server logs"}
            </span>
          )}
          <button onClick={handleLogout} className="text-sm text-stone-400 hover:text-white transition-colors">
            Sign out
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-stone-200 px-6">
        <div className="flex gap-0 max-w-7xl">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-amber-500 text-stone-900"
                  : "border-transparent text-stone-400 hover:text-stone-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-5">
          <p className="text-stone-400 text-sm">
            {TABS.find((t) => t.id === activeTab)?.desc}
          </p>
        </div>

        {activeTab === "bookings" && <BookingsTable token={token} onExpire={handleExpire} />}
        {activeTab === "guests" && <GuestsTable token={token} onExpire={handleExpire} />}
        {activeTab === "rooms" && <RoomsTable token={token} onExpire={handleExpire} />}
        {activeTab === "reservations" && <ReservationsTable token={token} onExpire={handleExpire} />}
      </div>
    </div>
  );
}
