"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Briefcase,
  Plus,
  X,
  Globe,
  Phone,
  Mail,
  Loader2,
  CheckCircle2,
  Circle,
  Search,
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  services: string[];
  status: "active" | "inactive";
  plan: string;
  addedAt: string;
  notes: string;
}

const SERVICE_COLORS: Record<string, string> = {
  seo: "bg-cm-purple/20 text-cm-purple",
  blog: "bg-dark-warn/20 text-dark-warn",
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-dark-panel2 text-dark-muted border-dark-border",
  starter: "bg-cm-purple-mid/15 text-cm-purple-mid border-cm-purple-mid/30",
  growth: "bg-cm-purple/15 text-cm-purple border-cm-purple/30",
  pro: "bg-dark-warn/15 text-dark-warn border-dark-warn/30",
};

const BLANK_FORM = {
  name: "",
  email: "",
  phone: "",
  company: "",
  website: "",
  services: [] as string[],
  plan: "free",
  notes: "",
};

type FilterTab = "all" | "seo" | "blog";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = clients.filter((c) => {
    if (filter !== "all" && !c.services.includes(filter)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.website.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const toggleService = (s: string) =>
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(s)
        ? prev.services.filter((x) => x !== s)
        : [...prev.services, s],
    }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setSaveError(d.error || "Failed to save");
        return;
      }
      setShowModal(false);
      setForm(BLANK_FORM);
      load();
    } catch {
      setSaveError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const total = clients.length;
  const active = clients.filter((c) => c.status === "active").length;
  const seoCount = clients.filter((c) => c.services.includes("seo")).length;
  const blogCount = clients.filter((c) => c.services.includes("blog")).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-cm-purple/15 rounded-lg">
              <Briefcase size={22} className="text-cm-purple" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-dark-text">
                Clients
              </h1>
              <p className="text-sm text-dark-muted mt-0.5">
                SEO clients, blog clients, and managed sites
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setForm(BLANK_FORM);
              setSaveError("");
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors text-sm font-medium shrink-0"
          >
            <Plus size={15} />
            Add Client
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total clients", value: total },
          { label: "Active", value: active },
          { label: "SEO clients", value: seoCount },
          { label: "Blog clients", value: blogCount },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-dark-panel border border-dark-border rounded-xl p-4"
          >
            <p className="text-2xl font-bold text-dark-text">{s.value}</p>
            <p className="text-xs text-dark-muted mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2">
          {(["all", "seo", "blog"] as FilterTab[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-cm-purple text-white"
                  : "bg-dark-panel border border-dark-border text-dark-muted hover:text-dark-text"
              }`}
            >
              {f === "all" ? "All" : f.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="w-full pl-8 pr-3 py-1.5 bg-dark-panel border border-dark-border rounded-lg text-sm text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-cm-purple"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-cm-purple" size={28} />
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-dark-panel2 border border-dashed border-dark-border rounded-xl p-10 text-center">
          <Briefcase size={28} className="text-dark-muted mx-auto mb-3" />
          <p className="text-sm text-dark-muted">
            {clients.length === 0
              ? "No clients yet. Add your first one."
              : "No clients match your filter."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((client) => (
            <div
              key={client.id}
              className="bg-dark-panel border border-dark-border rounded-xl p-5 flex flex-col gap-3 hover:border-cm-purple/40 transition-colors"
            >
              {/* Name + status */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-dark-text truncate">
                    {client.name}
                  </p>
                  {client.company && (
                    <p className="text-xs text-dark-muted truncate">
                      {client.company}
                    </p>
                  )}
                </div>
                <span
                  className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border shrink-0 ${
                    client.status === "active"
                      ? "text-dark-success border-dark-success/30 bg-dark-success/10"
                      : "text-dark-muted border-dark-border bg-dark-panel2"
                  }`}
                >
                  {client.status === "active" ? (
                    <CheckCircle2 size={10} />
                  ) : (
                    <Circle size={10} />
                  )}
                  {client.status}
                </span>
              </div>

              {/* Services + plan */}
              <div className="flex flex-wrap gap-1.5">
                {client.services.map((s) => (
                  <span
                    key={s}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      SERVICE_COLORS[s] || "bg-dark-panel2 text-dark-muted"
                    }`}
                  >
                    {s.toUpperCase()}
                  </span>
                ))}
                {client.plan && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${
                      PLAN_COLORS[client.plan] ||
                      "bg-dark-panel2 text-dark-muted border-dark-border"
                    }`}
                  >
                    {client.plan}
                  </span>
                )}
              </div>

              {/* Contact info */}
              <div className="space-y-1">
                {client.website && (
                  <p className="flex items-center gap-1.5 text-xs text-dark-muted truncate">
                    <Globe size={11} className="shrink-0" />
                    {client.website}
                  </p>
                )}
                {client.phone && (
                  <p className="flex items-center gap-1.5 text-xs text-dark-muted">
                    <Phone size={11} className="shrink-0" />
                    {client.phone}
                  </p>
                )}
                {client.email && (
                  <p className="flex items-center gap-1.5 text-xs text-dark-muted truncate">
                    <Mail size={11} className="shrink-0" />
                    {client.email}
                  </p>
                )}
              </div>

              {/* Notes */}
              {client.notes && (
                <p className="text-xs text-dark-muted italic border-t border-dark-border pt-2 line-clamp-2">
                  {client.notes}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-auto pt-2 border-t border-dark-border">
                {client.services.includes("seo") && (
                  <a
                    href="/app/seo"
                    className="text-xs px-3 py-1.5 bg-cm-purple/15 text-cm-purple rounded-lg hover:bg-cm-purple/25 transition-colors font-medium"
                  >
                    SEO Dashboard
                  </a>
                )}
                {client.services.includes("blog") && (
                  <a
                    href="/app/postpilot/clients"
                    className="text-xs px-3 py-1.5 bg-dark-panel2 text-dark-muted border border-dark-border rounded-lg hover:text-dark-text transition-colors"
                  >
                    Blog Posts
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Client Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-dark-panel border border-dark-border rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-dark-text">Add Client</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-dark-muted hover:text-dark-text transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              {[
                { key: "name", label: "Name *", placeholder: "Ashley Bennett" },
                { key: "company", label: "Company", placeholder: "Acme Ltd" },
                {
                  key: "email",
                  label: "Email",
                  placeholder: "ashley@example.com",
                },
                {
                  key: "phone",
                  label: "Phone / WhatsApp",
                  placeholder: "+63 917 814 1482",
                },
                {
                  key: "website",
                  label: "Website",
                  placeholder: "clientsite.com",
                },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-xs text-dark-muted block mb-1">
                    {f.label}
                  </label>
                  <input
                    value={(form as any)[f.key]}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                    }
                    placeholder={f.placeholder}
                    className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-cm-purple"
                  />
                </div>
              ))}

              {/* Services */}
              <div>
                <label className="text-xs text-dark-muted block mb-2">
                  Services
                </label>
                <div className="flex gap-2">
                  {["seo", "blog"].map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleService(s)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        form.services.includes(s)
                          ? "bg-cm-purple text-white"
                          : "bg-dark-panel2 border border-dark-border text-dark-muted hover:text-dark-text"
                      }`}
                    >
                      {s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Plan */}
              <div>
                <label className="text-xs text-dark-muted block mb-1">
                  Plan
                </label>
                <select
                  value={form.plan}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, plan: e.target.value }))
                  }
                  className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-cm-purple"
                >
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="growth">Growth</option>
                  <option value="pro">Pro</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-dark-muted block mb-1">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="First test client, meeting in person..."
                  rows={2}
                  className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-cm-purple resize-none"
                />
              </div>
            </div>

            {saveError && (
              <p className="text-xs text-dark-danger">{saveError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-dark-muted hover:text-dark-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || saving}
                className="px-4 py-2 bg-cm-purple text-white rounded-lg text-sm font-medium hover:bg-cm-purple/80 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add Client"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
