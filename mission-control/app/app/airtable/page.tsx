"use client";

import {
  Grid3X3,
  Database,
  Table2,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  Plus,
  X,
  ChevronRight,
  Clock,
} from "lucide-react";
import { useState } from "react";
import ApiKeyBanner from "@/components/ApiKeyBanner";
import { useAirtableData } from "@/hooks/useAirtableData";
import type { AirtableField, AirtableRecord } from "@/hooks/useAirtableData";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "--";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "--";
  }
}

function cellValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  return JSON.stringify(val);
}

function RecordsTable({
  fields,
  records,
  loading,
}: {
  fields: AirtableField[];
  records: AirtableRecord[];
  loading: boolean;
}) {
  const visibleFields = fields.slice(0, 5);
  const hiddenCount = Math.max(0, fields.length - 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-dark-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading records…
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-dark-muted">
        <Table2 className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">No records found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-dark-border">
            {visibleFields.map((f) => (
              <th
                key={f.id}
                className="text-left py-2 px-3 font-medium text-dark-muted whitespace-nowrap"
              >
                {f.name}
              </th>
            ))}
            {hiddenCount > 0 && (
              <th className="py-2 px-3 text-dark-muted font-normal text-xs">
                +{hiddenCount} more
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {records.map((rec) => (
            <tr
              key={rec.id}
              className="border-b border-dark-border hover:bg-dark-panel2 transition-colors"
            >
              {visibleFields.map((f) => (
                <td
                  key={f.id}
                  className="py-2 px-3 text-dark-text max-w-[200px] truncate"
                  title={cellValue(rec.fields[f.name])}
                >
                  {cellValue(rec.fields[f.name])}
                </td>
              ))}
              {hiddenCount > 0 && <td />}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CreateRecordModal({
  fields,
  onClose,
  onSubmit,
}: {
  fields: AirtableField[];
  onClose: () => void;
  onSubmit: (fields: Record<string, unknown>) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(values)) {
        if (v.trim()) cleaned[k] = v;
      }
      await onSubmit(cleaned);
      onClose();
    } catch (error) {
      setErr(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  };

  // Only show text-compatible fields
  const editableFields = fields.filter((f) =>
    ["singleLineText", "multilineText", "email", "url", "phoneNumber", "number", "currency", "percent", "singleSelect", "date", ""].includes(f.type)
  );

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-dark-panel rounded-xl shadow-2xl shadow-black/40 w-full max-w-md border border-dark-border">
        <div className="flex items-center justify-between p-4 border-b border-dark-border">
          <h2 className="font-semibold tracking-tight text-dark-text">New Record</h2>
          <button
            onClick={onClose}
            className="text-dark-muted hover:text-dark-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {editableFields.length === 0 && (
            <p className="text-sm text-dark-muted">No editable text fields in this table.</p>
          )}
          {editableFields.map((f) => (
            <div key={f.id}>
              <label className="block text-xs font-medium text-dark-muted mb-1">{f.name}</label>
              <input
                type="text"
                value={values[f.name] || ""}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [f.name]: e.target.value }))
                }
                className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm bg-dark-panel2 text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple"
                placeholder={`Enter ${f.name}…`}
              />
            </div>
          ))}
          {err && (
            <div className="flex items-center gap-2 text-dark-danger text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {err}
            </div>
          )}
        </form>
        <div className="flex gap-2 justify-end p-4 border-t border-dark-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-dark-muted hover:text-dark-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-sm bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
            Create Record
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AirtablePage() {
  const {
    bases,
    tables,
    records,
    agentStatus,
    selectedBaseId,
    setSelectedBaseId,
    selectedTableId,
    setSelectedTableId,
    searchQuery,
    setSearchQuery,
    loading,
    tablesLoading,
    recordsLoading,
    error,
    refresh,
    createRecord,
  } = useAirtableData();

  const [showCreateModal, setShowCreateModal] = useState(false);

  const selectedBase = bases.find((b) => b.id === selectedBaseId);
  const selectedTable = tables.find((t) => t.id === selectedTableId);
  const isConnected = !error && (agentStatus?.status !== "error");

  const handleCreateRecord = async (fields: Record<string, unknown>) => {
    if (!selectedBaseId || !selectedTableId) return;
    await createRecord(selectedBaseId, selectedTableId, fields);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <ApiKeyBanner slug="airtable" />
      {/* Header */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-dark-warn/10 rounded-xl flex items-center justify-center">
              <Grid3X3 className="w-6 h-6 text-dark-warn" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-dark-text">Airtable</h1>
              <p className="text-sm text-dark-muted">Browse bases, tables, and records</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-dark-danger"
                }`}
              />
              <span className="text-sm text-dark-muted">
                {isConnected ? "Connected" : "Not Connected"}
              </span>
            </div>
            <button
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-dark-muted border border-dark-border rounded-lg hover:bg-dark-panel2 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-dark-danger/10 border border-dark-danger/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-dark-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-dark-danger">Connection error</p>
            <p className="text-sm text-dark-danger mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-dark-panel rounded-xl border border-dark-border p-4">
          <p className="text-xs text-dark-muted uppercase tracking-wide font-medium">Total Bases</p>
          <p className="text-2xl font-bold text-dark-text mt-1">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-dark-muted" /> : bases.length}
          </p>
        </div>
        <div className="bg-dark-panel rounded-xl border border-dark-border p-4">
          <p className="text-xs text-dark-muted uppercase tracking-wide font-medium">Tables in Base</p>
          <p className="text-2xl font-bold text-dark-text mt-1">
            {tablesLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-dark-muted" />
            ) : selectedBaseId ? (
              tables.length
            ) : (
              <span className="text-dark-muted">--</span>
            )}
          </p>
        </div>
        <div className="bg-dark-panel rounded-xl border border-dark-border p-4">
          <p className="text-xs text-dark-muted uppercase tracking-wide font-medium">Last Synced</p>
          <p className="text-sm font-medium text-dark-text mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-dark-muted" />
            {agentStatus?.lastRun ? formatDate(agentStatus.lastRun) : "--"}
          </p>
        </div>
      </div>

      {/* Main split panel */}
      <div className="grid grid-cols-3 gap-4">
        {/* Bases list */}
        <div className="bg-dark-panel rounded-xl border border-dark-border overflow-hidden">
          <div className="px-4 py-3 border-b border-dark-border flex items-center gap-2">
            <Database className="w-4 h-4 text-dark-muted" />
            <h2 className="font-medium text-dark-text text-sm">Bases</h2>
          </div>
          <div className="divide-y divide-dark-border">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-dark-muted">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : bases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-dark-muted">
                <Database className="w-6 h-6 mb-2 opacity-40" />
                <p className="text-sm">No bases found</p>
              </div>
            ) : (
              bases.map((base) => (
                <button
                  key={base.id}
                  onClick={() => setSelectedBaseId(base.id === selectedBaseId ? null : base.id)}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors hover:bg-dark-panel2 ${
                    selectedBaseId === base.id
                      ? "bg-cm-purple/10 border-l-2 border-cm-purple"
                      : ""
                  }`}
                >
                  <span
                    className={`text-sm font-medium truncate ${
                      selectedBaseId === base.id ? "text-cm-purple" : "text-dark-text"
                    }`}
                  >
                    {base.name}
                  </span>
                  {selectedBaseId === base.id && (
                    <ChevronRight className="w-3.5 h-3.5 text-cm-purple flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Tables + Records */}
        <div className="col-span-2 bg-dark-panel rounded-xl border border-dark-border overflow-hidden">
          {!selectedBaseId ? (
            <div className="flex flex-col items-center justify-center h-64 text-dark-muted">
              <Grid3X3 className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Select a base to view tables</p>
            </div>
          ) : tablesLoading ? (
            <div className="flex items-center justify-center h-64 text-dark-muted">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading tables…
            </div>
          ) : !selectedTableId ? (
            <div>
              <div className="px-4 py-3 border-b border-dark-border flex items-center gap-2">
                <Table2 className="w-4 h-4 text-dark-muted" />
                <h2 className="font-medium text-dark-text text-sm">
                  Tables in {selectedBase?.name}
                </h2>
              </div>
              {tables.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-dark-muted">
                  <Table2 className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm">No tables found</p>
                </div>
              ) : (
                <div className="p-4 flex flex-wrap gap-2">
                  {tables.map((table) => (
                    <button
                      key={table.id}
                      onClick={() => setSelectedTableId(table.id)}
                      className="px-4 py-2 bg-dark-panel2 hover:bg-cm-purple/10 hover:text-cm-purple text-dark-text text-sm font-medium rounded-lg border border-dark-border hover:border-cm-purple/20 transition-colors"
                    >
                      {table.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Table header with breadcrumb */}
              <div className="px-4 py-3 border-b border-dark-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <button
                    onClick={() => setSelectedTableId(null)}
                    className="text-dark-muted hover:text-dark-text transition-colors"
                  >
                    {selectedBase?.name}
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-dark-muted" />
                  <span className="font-medium text-dark-text">{selectedTable?.name}</span>
                  <span className="text-dark-muted text-xs">({records.length} records)</span>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-purple hover:bg-cm-purple/80 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Record
                </button>
              </div>

              {/* Search */}
              <div className="px-4 py-3 border-b border-dark-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search in ${selectedTable?.name}…`}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-dark-border rounded-lg bg-dark-panel2 text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple"
                  />
                </div>
              </div>

              {/* Records */}
              <div className="p-2">
                <RecordsTable
                  fields={selectedTable?.fields || []}
                  records={records}
                  loading={recordsLoading}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Record Modal */}
      {showCreateModal && selectedTable && (
        <CreateRecordModal
          fields={selectedTable.fields}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateRecord}
        />
      )}
    </div>
  );
}
