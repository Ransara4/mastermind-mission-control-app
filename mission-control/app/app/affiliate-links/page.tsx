"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Copy, Check, Pencil, Trash2, Search, List, LayoutGrid, ChevronDown, ChevronRight } from "lucide-react";

interface AffiliateLink {
  id: number;
  program_name: string;
  referral_link: string | null;
  referral_code: string | null;
  category: string | null;
  commission_info: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function AffiliateLinksPage() {
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const [editing, setEditing] = useState<AffiliateLink | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Partial<AffiliateLink>>({});
  const [grouped, setGrouped] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/affiliate-links");
      const data = await res.json();
      setLinks(data.links || []);
    } catch { /* empty */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Expand all groups on first switch to grouped view
  useEffect(() => {
    if (grouped) {
      const cats = [...new Set(links.map(l => l.category || "Uncategorized"))];
      setExpandedGroups(new Set(cats));
    }
  }, [grouped, links]);

  const copyToClipboard = async (text: string, id: number) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  };

  const startAdd = () => {
    setForm({ program_name: "", referral_link: "", referral_code: "", category: "", commission_info: "", status: "active", notes: "" });
    setAdding(true);
    setEditing(null);
  };

  const startEdit = (link: AffiliateLink) => {
    setForm({ ...link });
    setEditing(link);
    setAdding(false);
  };

  const cancelForm = () => { setAdding(false); setEditing(null); setForm({}); };

  const saveForm = async () => {
    if (!form.program_name) return;
    try {
      if (editing) {
        await fetch("/api/affiliate-links", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, id: editing.id }),
        });
      } else {
        await fetch("/api/affiliate-links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      cancelForm();
      await fetchData();
    } catch { /* empty */ }
  };

  const deleteLink = async (id: number) => {
    if (!confirm("Delete this affiliate link?")) return;
    try {
      await fetch("/api/affiliate-links", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await fetchData();
    } catch { /* empty */ }
  };

  const lf = filter.toLowerCase();
  const filtered = links.filter(
    (l) => !filter || l.program_name?.toLowerCase().includes(lf) || l.category?.toLowerCase().includes(lf) || l.notes?.toLowerCase().includes(lf)
  );

  const catGroups: Record<string, AffiliateLink[]> = {};
  for (const l of filtered) {
    const key = l.category || "Uncategorized";
    (catGroups[key] ??= []).push(l);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-dark-muted" size={32} />
      </div>
    );
  }

  const statusBadge = (status: string) => (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
      status === "active" ? "bg-dark-success/10 text-dark-success" :
      status === "pending" ? "bg-dark-warn/10 text-dark-warn" :
      "bg-dark-panel2 text-dark-muted"
    }`}>{status}</span>
  );

  const renderForm = () => (
    <div className="bg-dark-panel rounded-xl border border-dark-border shadow-sm p-5 mb-6">
      <h3 className="font-semibold tracking-tight text-dark-text mb-4">{editing ? "Edit Link" : "Add New Link"}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input placeholder="Program name *" value={form.program_name || ""} onChange={(e) => setForm({ ...form, program_name: e.target.value })} className="px-3 py-2 border border-dark-border bg-dark-panel2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text placeholder:text-dark-muted" />
        <input placeholder="Referral link" value={form.referral_link || ""} onChange={(e) => setForm({ ...form, referral_link: e.target.value })} className="px-3 py-2 border border-dark-border bg-dark-panel2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text placeholder:text-dark-muted" />
        <input placeholder="Referral code" value={form.referral_code || ""} onChange={(e) => setForm({ ...form, referral_code: e.target.value })} className="px-3 py-2 border border-dark-border bg-dark-panel2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text placeholder:text-dark-muted" />
        <input placeholder="Category" value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} className="px-3 py-2 border border-dark-border bg-dark-panel2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text placeholder:text-dark-muted" />
        <input placeholder="Commission info" value={form.commission_info || ""} onChange={(e) => setForm({ ...form, commission_info: e.target.value })} className="px-3 py-2 border border-dark-border bg-dark-panel2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text placeholder:text-dark-muted" />
        <select value={form.status || "active"} onChange={(e) => setForm({ ...form, status: e.target.value })} className="px-3 py-2 border border-dark-border bg-dark-panel2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
      </div>
      <input placeholder="Notes" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-4 w-full px-3 py-2 border border-dark-border bg-dark-panel2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text placeholder:text-dark-muted" />
      <div className="flex gap-2 mt-4">
        <button onClick={saveForm} className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 text-sm font-medium">Save</button>
        <button onClick={cancelForm} className="px-4 py-2 bg-dark-panel2 text-dark-muted rounded-lg hover:bg-dark-panel2 text-sm">Cancel</button>
      </div>
    </div>
  );

  const renderRow = (link: AffiliateLink) => (
    <tr key={link.id} className="hover:bg-dark-panel2 transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-dark-text">{link.program_name}</td>
      <td className="px-4 py-3 text-sm text-dark-muted">{link.category || "—"}</td>
      <td className="px-4 py-3 text-sm">{statusBadge(link.status)}</td>
      <td className="px-4 py-3 text-sm">
        {link.referral_link ? (
          <div className="flex items-center gap-1.5 max-w-[250px]">
            <span className="text-cm-purple truncate">{link.referral_link}</span>
            <button onClick={() => copyToClipboard(link.referral_link || "", link.id)} className="text-dark-muted hover:text-cm-purple shrink-0">
              {copied === link.id ? <Check size={13} className="text-dark-success" /> : <Copy size={13} />}
            </button>
          </div>
        ) : <span className="text-dark-muted">—</span>}
      </td>
      <td className="px-4 py-3 text-sm font-mono font-dm-mono text-dark-muted">{link.referral_code || "—"}</td>
      <td className="px-4 py-3 text-sm text-dark-muted">{link.commission_info || "—"}</td>
      <td className="px-4 py-3 text-xs text-dark-muted max-w-[180px] truncate" title={link.notes || ""}>{link.notes || "—"}</td>
      <td className="px-4 py-3 text-sm">
        <div className="flex items-center gap-0.5">
          <button onClick={() => startEdit(link)} className="p-1.5 text-dark-muted hover:text-dark-text rounded hover:bg-dark-panel2" title="Edit">
            <Pencil size={14} />
          </button>
          <button onClick={() => deleteLink(link.id)} className="p-1.5 text-dark-muted hover:text-dark-danger rounded hover:bg-dark-danger/10" title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );

  const tableHeader = (
    <thead>
      <tr className="border-b border-dark-border bg-dark-panel2/60">
        <th className="px-4 py-2.5 text-left text-xs font-semibold text-dark-muted uppercase tracking-wider">Program</th>
        <th className="px-4 py-2.5 text-left text-xs font-semibold text-dark-muted uppercase tracking-wider">Category</th>
        <th className="px-4 py-2.5 text-left text-xs font-semibold text-dark-muted uppercase tracking-wider">Status</th>
        <th className="px-4 py-2.5 text-left text-xs font-semibold text-dark-muted uppercase tracking-wider">Referral Link</th>
        <th className="px-4 py-2.5 text-left text-xs font-semibold text-dark-muted uppercase tracking-wider">Code</th>
        <th className="px-4 py-2.5 text-left text-xs font-semibold text-dark-muted uppercase tracking-wider">Commission</th>
        <th className="px-4 py-2.5 text-left text-xs font-semibold text-dark-muted uppercase tracking-wider">Notes</th>
        <th className="px-4 py-2.5 text-left text-xs font-semibold text-dark-muted uppercase tracking-wider w-[80px]"></th>
      </tr>
    </thead>
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-dark-text">Affiliate Links</h1>
          <p className="text-sm text-dark-muted mt-1">{links.length} programs</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-dark-panel border border-dark-border rounded-lg overflow-hidden">
            <button
              onClick={() => setGrouped(false)}
              className={`p-2 transition-colors ${!grouped ? "bg-dark-panel2 text-dark-text" : "text-dark-muted hover:text-dark-text"}`}
              title="Table view"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setGrouped(true)}
              className={`p-2 transition-colors ${grouped ? "bg-dark-panel2 text-dark-text" : "text-dark-muted hover:text-dark-text"}`}
              title="Group by category"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" />
            <input type="text" placeholder="Filter..." value={filter} onChange={(e) => setFilter(e.target.value)} className="pl-9 pr-4 py-2 border border-dark-border bg-dark-panel2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text placeholder:text-dark-muted w-48" />
          </div>
          <button onClick={startAdd} className="flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 text-sm font-medium">
            <Plus size={16} /> Add New
          </button>
        </div>
      </div>

      {(adding || editing) && renderForm()}

      {filtered.length === 0 && !adding && (
        <div className="bg-dark-panel rounded-xl border border-dark-border shadow-sm p-8 text-center text-dark-muted">
          {links.length === 0 ? "No affiliate links yet. Click \"Add New\" to create one." : "No links match your filter."}
        </div>
      )}

      {/* Table view */}
      {filtered.length > 0 && !grouped && (
        <div className="bg-dark-panel rounded-xl border border-dark-border shadow-sm overflow-x-auto">
          <table className="w-full min-w-[900px]">
            {tableHeader}
            <tbody className="divide-y divide-dark-border">
              {filtered.map(renderRow)}
            </tbody>
          </table>
        </div>
      )}

      {/* Grouped view */}
      {filtered.length > 0 && grouped && (
        <div className="space-y-4">
          {Object.entries(catGroups).sort(([a], [b]) => a.localeCompare(b)).map(([cat, catLinks]) => (
            <div key={cat} className="bg-dark-panel rounded-xl border border-dark-border shadow-sm overflow-hidden">
              <button
                onClick={() => toggleGroup(cat)}
                className="w-full flex items-center justify-between px-4 py-3 bg-dark-panel2/80 hover:bg-dark-panel2 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {expandedGroups.has(cat) ? <ChevronDown size={16} className="text-dark-muted" /> : <ChevronRight size={16} className="text-dark-muted" />}
                  <span className="text-sm font-semibold text-dark-text">{cat}</span>
                  <span className="text-xs text-dark-muted">{catLinks.length} program{catLinks.length !== 1 ? "s" : ""}</span>
                </div>
              </button>
              {expandedGroups.has(cat) && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    {tableHeader}
                    <tbody className="divide-y divide-dark-border">
                      {catLinks.map(renderRow)}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
