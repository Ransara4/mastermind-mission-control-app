"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CalendarClock,
  RefreshCw,
  Loader2,
  AlertCircle,
  Users,
  Clock,
  ExternalLink,
  XCircle,
} from "lucide-react";
import ApiKeyBanner from "@/components/ApiKeyBanner";

interface BookingType {
  id: number;
  title: string;
  formatted_duration: string;
  duration_minutes: number;
  localized_price: string;
  price: string;
  booking_page_url: string;
  disabled_at: string | null;
  slug: string;
  zoom_enabled_at: string | null;
  google_meet_enabled_at: string | null;
}

interface Booking {
  id: number;
  starts_at: string;
  name: string;
  contact?: { name: string; email: string };
  booking_type?: { title: string };
  cancelled_at: string | null;
  email: string;
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
}

export default function TidyCalPage() {
  const [types, setTypes] = useState<BookingType[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"types" | "upcoming" | "past">("types");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tRes, bRes] = await Promise.all([
        fetch("/api/tidycal?cmd=raw GET /booking-types"),
        fetch("/api/tidycal?cmd=raw GET /bookings"),
      ]);
      const tData = await tRes.json();
      const bData = await bRes.json();
      if (tData.error) throw new Error(tData.error);
      if (bData.error) throw new Error(bData.error);
      setTypes(tData.data?.data || []);
      setBookings(bData.data?.data || []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const now = new Date().toISOString();
  const upcoming = bookings
    .filter((b) => b.starts_at >= now && !b.cancelled_at)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const past = bookings
    .filter((b) => b.starts_at < now || b.cancelled_at)
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));

  if (loading && bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="animate-spin text-cm-purple mb-4" size={32} />
        <p className="text-dark-muted">Loading TidyCal data...</p>
      </div>
    );
  }

  if (error && bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="text-dark-danger mb-4" size={32} />
        <p className="text-dark-muted mb-4">{error}</p>
        <button
          onClick={load}
          className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ApiKeyBanner slug="tidycal" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-dark-text">TidyCal</h1>
          <p className="text-sm text-dark-muted">
            Bookings, scheduling &amp; availability
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-1.5 text-dark-muted hover:text-dark-text transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Booking Types"
          value={types.length}
          icon={<CalendarClock className="w-5 h-5 text-cm-purple" />}
        />
        <StatCard
          label="Upcoming"
          value={upcoming.length}
          icon={<Clock className="w-5 h-5 text-dark-success" />}
        />
        <StatCard
          label="Total Bookings"
          value={bookings.filter((b) => !b.cancelled_at).length}
          icon={<Users className="w-5 h-5 text-cm-purple" />}
        />
        <StatCard
          label="Cancelled"
          value={bookings.filter((b) => b.cancelled_at).length}
          icon={<XCircle className="w-5 h-5 text-dark-danger" />}
        />
      </div>

      {/* Folder Tabs + Content */}
      <div>
        <div className="flex">
          {(["types", "upcoming", "past"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-medium border transition-colors ${
                tab === t
                  ? "bg-dark-panel text-dark-text border-dark-border border-b-dark-panel rounded-t-lg -mb-px z-10"
                  : "bg-dark-panel2 text-dark-muted border-transparent hover:text-dark-text rounded-t-lg"
              }`}
            >
              {t === "types"
                ? `Types (${types.length})`
                : t === "upcoming"
                  ? `Upcoming (${upcoming.length})`
                  : `Past (${past.length})`}
            </button>
          ))}
        </div>
        <div className="bg-dark-panel border border-dark-border rounded-b-xl rounded-tr-xl overflow-hidden">
        {tab === "types" ? (
          <div className="divide-y divide-dark-border">
            {types.map((t) => (
              <div
                key={t.id}
                className="px-5 py-4 hover:bg-dark-panel2 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-dark-text">{t.title}</p>
                  <span className="text-xs text-dark-muted">
                    {t.formatted_duration} &middot;{" "}
                    {parseFloat(t.price) > 0 ? t.localized_price : "Free"}
                    {t.disabled_at && (
                      <span className="ml-2 text-dark-danger">Disabled</span>
                    )}
                  </span>
                </div>
                <a
                  href={t.booking_page_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-cm-purple hover:text-cm-purple-mid flex items-center gap-1 mt-1"
                >
                  {t.booking_page_url}
                  <ExternalLink size={12} />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-dark-border">
            {(tab === "upcoming" ? upcoming : past).length === 0 ? (
              <div className="py-12 text-center text-dark-muted text-sm">
                No {tab} bookings
              </div>
            ) : (
              (tab === "upcoming" ? upcoming : past).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between px-5 py-4 hover:bg-dark-panel2 transition-colors"
                >
                  <div>
                    <p className="font-medium text-dark-text">
                      {b.name || b.contact?.name || "Unknown"}
                      {b.cancelled_at && (
                        <span className="ml-2 text-xs text-dark-danger font-normal">
                          Cancelled
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-dark-muted">
                      {formatDate(b.starts_at)}
                      {b.booking_type?.title && ` · ${b.booking_type.title}`}
                    </p>
                  </div>
                  <span className="text-xs text-dark-muted">#{b.id}</span>
                </div>
              ))
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-dark-muted">{label}</span>
      </div>
      <p className="text-2xl font-bold text-dark-text">{value}</p>
    </div>
  );
}
