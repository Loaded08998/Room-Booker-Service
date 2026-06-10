import { useState, useEffect } from "react";
import { formatDate, formatCurrency } from "@/lib/utils";

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

const API_BASE = "/api";

function statusColor(status: string) {
  if (status === "confirmed") return "bg-green-100 text-green-700";
  if (status === "cancelled") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

export default function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem("admin_token") ?? "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [updateError, setUpdateError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setLoginError(data.error ?? "Login failed");
        return;
      }
      const { token: t } = await res.json();
      localStorage.setItem("admin_token", t);
      setToken(t);
    } catch {
      setLoginError("Network error");
    }
  }

  async function fetchBookings() {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const res = await fetch(`${API_BASE}/admin/bookings?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("admin_token");
        setToken("");
        return;
      }
      const data = await res.json();
      setBookings(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) fetchBookings();
  }, [token, statusFilter, dateFrom, dateTo]);

  async function updateStatus(bookingId: number, status: string) {
    setUpdateError("");
    try {
      const res = await fetch(`${API_BASE}/admin/bookings/${bookingId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        setUpdateError(data.error ?? "Update failed");
        return;
      }
      fetchBookings();
    } catch {
      setUpdateError("Network error");
    }
  }

  function handleLogout() {
    localStorage.removeItem("admin_token");
    setToken("");
    setBookings([]);
  }

  // Login screen
  if (!token) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
          <div className="text-center mb-8">
            <p className="text-amber-600 text-xs font-semibold tracking-widest uppercase mb-1">Admin</p>
            <h1 className="text-2xl font-serif font-bold text-stone-800">Staff Login</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                required
              />
            </div>
            {loginError && (
              <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">{loginError}</p>
            )}
            <button
              type="submit"
              className="w-full bg-stone-900 hover:bg-stone-700 text-white font-semibold py-3 rounded-lg text-sm uppercase tracking-wide transition-colors"
            >
              Sign In
            </button>
          </form>
          <p className="text-center text-xs text-stone-400 mt-4">Default: admin / admin123</p>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Nav */}
      <div className="bg-stone-900 text-white px-4 py-4 flex items-center justify-between">
        <h1 className="font-serif font-bold text-lg">Admin Dashboard</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-stone-400 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-stone-100 p-4 mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <button
            onClick={() => { setStatusFilter(""); setDateFrom(""); setDateTo(""); }}
            className="text-xs text-stone-500 hover:text-stone-800 underline"
          >
            Clear filters
          </button>
        </div>

        {updateError && (
          <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-2 mb-4 text-red-500 text-sm">
            {updateError}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-stone-400 text-sm animate-pulse">Loading bookings...</div>
          ) : bookings.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-sm">No bookings found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Guest</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Rooms</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Check-in</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Check-out</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Total</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {bookings.map((b) => (
                    <tr key={b.bookingId} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-stone-600">#{b.bookingId}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-stone-800">{b.guest?.guestName ?? "—"}</div>
                        <div className="text-xs text-stone-400">{b.guest?.email}</div>
                        {b.guest?.isMember && <span className="text-xs text-amber-600">Member</span>}
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {b.rooms.map((r) => `Room ${r.roomName}`).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-stone-600">{b.checkInDate}</td>
                      <td className="px-4 py-3 text-stone-600">{b.checkOutDate}</td>
                      <td className="px-4 py-3 font-semibold text-stone-800">{formatCurrency(b.totalPrice)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor(b.status)}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {b.status !== "confirmed" && (
                            <button
                              onClick={() => updateStatus(b.bookingId, "confirmed")}
                              className="text-xs bg-green-50 text-green-700 hover:bg-green-100 px-2.5 py-1 rounded-lg font-medium transition-colors"
                            >
                              Confirm
                            </button>
                          )}
                          {b.status !== "cancelled" && (
                            <button
                              onClick={() => updateStatus(b.bookingId, "cancelled")}
                              className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2.5 py-1 rounded-lg font-medium transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
