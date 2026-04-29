"use client";

import React, { useState, useRef } from "react";
import { Loader2, AlertCircle, DollarSign, X } from "lucide-react";

interface AddPaymentModalProps {
  clientId: string;
  onClose: () => void;
  onCreated: () => void;
}

export function AddPaymentModal({ clientId, onClose, onCreated }: AddPaymentModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const hoursRef = useRef<HTMLInputElement>(null);
  const methodRef = useRef<HTMLSelectElement>(null);
  const notesRef = useRef<HTMLInputElement>(null);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const amount = parseFloat(amountRef.current?.value || "0");
      const hours = parseFloat(hoursRef.current?.value || "0");
      if (!amount || !hours) throw new Error("Amount and hours are required");
      const res = await fetch(`/api/mentorships/${clientId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateRef.current?.value || new Date().toISOString().split("T")[0],
          amount, hours_purchased: hours,
          method: methodRef.current?.value || "manual",
          notes: notesRef.current?.value || "",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      onCreated();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-dark-panel rounded-2xl shadow-2xl shadow-black/40 w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border bg-gradient-to-r from-cm-purple/10 via-dark-panel to-dark-panel rounded-t-2xl">
          <h2 className="text-lg font-semibold tracking-tight text-dark-text">Add Payment</h2>
          <button onClick={onClose} className="text-dark-muted hover:text-dark-text"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-text mb-1">Date</label>
              <input ref={dateRef} type="date" defaultValue={new Date().toISOString().split("T")[0]}
                className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text bg-dark-panel2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text mb-1">Method</label>
              <select ref={methodRef} defaultValue="manual"
                className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text bg-dark-panel2">
                <option value="stripe">Stripe</option>
                <option value="manual">Manual</option>
                <option value="zelle">Zelle</option>
                <option value="cash">Cash</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-text mb-1">Amount ($)</label>
              <input ref={amountRef} type="number" min={0} step={0.01} placeholder="500.00"
                className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text bg-dark-panel2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text mb-1">Hours Purchased</label>
              <input ref={hoursRef} type="number" min={0} step={0.5} placeholder="5"
                className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text bg-dark-panel2" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Notes</label>
            <input ref={notesRef} type="text" placeholder="Payment notes..."
              className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text bg-dark-panel2" />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-dark-danger bg-dark-danger/10 rounded-lg px-3 py-2">
              <AlertCircle size={16} />{error}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-border">
          <button onClick={onClose} className="px-4 py-2 text-sm text-dark-muted hover:text-dark-text transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-cm-purple text-white rounded-lg hover:bg-[#5b4fa8] disabled:opacity-50 text-sm font-semibold transition-colors">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <DollarSign size={15} />}
            {saving ? "Saving..." : "Add Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
