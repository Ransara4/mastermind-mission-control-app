"use client";

import { useState } from "react";
import { X, Globe, Loader2, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

const BLANK = {
  name: "",
  domain: "",
  hosting: "wix",
  gscPropertyUrl: "",
  wixSiteId: "",
  wixApiKey: "",
  wixAccountId: "",
  notes: "",
  clientId: "",
};

export default function AddSiteModal({ onClose, onSaved }: Props) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const set = (key: string, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  // Auto-fill GSC property URL when domain is entered
  const handleDomainBlur = () => {
    if (form.domain && !form.gscPropertyUrl) {
      set("gscPropertyUrl", `sc-domain:${form.domain.trim()}`);
    }
  };

  const handleSave = async () => {
    setError("");
    if (!form.name.trim() || !form.domain.trim()) {
      setError("Name and domain are required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/seo/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          domain: form.domain.trim().replace(/^https?:\/\//, "").replace(/\/$/, ""),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save site.");
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 800);
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setSaving(false);
    }
  };

  const isWix = form.hosting === "wix";

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-dark-panel border border-dark-border rounded-xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-xl shadow-black/40">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-border">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-cm-purple/15 rounded-lg">
              <Globe size={16} className="text-cm-purple" />
            </div>
            <h2 className="text-base font-bold text-dark-text">Add New Website</h2>
          </div>
          <button
            onClick={onClose}
            className="text-dark-muted hover:text-dark-text transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Basic info */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-dark-muted uppercase tracking-wider">
              Site Info
            </p>

            <div>
              <label className="text-xs text-dark-muted block mb-1">
                Business / site name *
              </label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ashley's Photography"
                className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-cm-purple"
              />
            </div>

            <div>
              <label className="text-xs text-dark-muted block mb-1">
                Domain *
              </label>
              <input
                value={form.domain}
                onChange={(e) => set("domain", e.target.value)}
                onBlur={handleDomainBlur}
                placeholder="clientsite.com"
                className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-cm-purple"
              />
              <p className="text-[11px] text-dark-muted mt-1">
                Without https:// — e.g. clientsite.com
              </p>
            </div>

            <div>
              <label className="text-xs text-dark-muted block mb-1">
                Hosting platform
              </label>
              <select
                value={form.hosting}
                onChange={(e) => set("hosting", e.target.value)}
                className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-cm-purple"
              >
                <option value="wix">Wix</option>
                <option value="wordpress">WordPress</option>
                <option value="shopify">Shopify</option>
                <option value="squarespace">Squarespace</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Google Search Console */}
          <div className="space-y-3 pt-2 border-t border-dark-border">
            <p className="text-xs font-semibold text-dark-muted uppercase tracking-wider pt-1">
              Google Search Console
            </p>

            <div>
              <label className="text-xs text-dark-muted block mb-1">
                GSC Property URL
              </label>
              <input
                value={form.gscPropertyUrl}
                onChange={(e) => set("gscPropertyUrl", e.target.value)}
                placeholder="sc-domain:clientsite.com"
                className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-cm-purple"
              />
              <p className="text-[11px] text-dark-muted mt-1">
                Domain property: <span className="text-dark-text">sc-domain:example.com</span>
                {" · "}URL prefix: <span className="text-dark-text">https://www.example.com/</span>
              </p>
            </div>
          </div>

          {/* Wix credentials — only for Wix */}
          {isWix && (
            <div className="space-y-3 pt-2 border-t border-dark-border">
              <p className="text-xs font-semibold text-dark-muted uppercase tracking-wider pt-1">
                Wix API Access
              </p>
              <p className="text-xs text-dark-muted">
                Optional — required to auto-fix SEO issues. Leave blank if the client hasn't provided credentials yet; you can add them later.
              </p>

              {[
                {
                  key: "wixSiteId",
                  label: "Wix Site ID",
                  placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
                },
                {
                  key: "wixApiKey",
                  label: "Wix API Key",
                  placeholder: "Paste the generated key here",
                },
                {
                  key: "wixAccountId",
                  label: "Wix Account ID",
                  placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
                },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-xs text-dark-muted block mb-1">
                    {f.label}
                  </label>
                  <input
                    value={(form as any)[f.key]}
                    onChange={(e) => set(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    type={f.key === "wixApiKey" ? "password" : "text"}
                    className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-cm-purple font-mono"
                  />
                </div>
              ))}

              {(form.wixSiteId || form.wixApiKey || form.wixAccountId) && (
                <p className="text-[11px] text-dark-muted">
                  All three fields required for validation. Credentials are tested against the Wix API before saving.
                </p>
              )}
            </div>
          )}

          {/* Advanced */}
          <div className="pt-2 border-t border-dark-border">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs text-dark-muted hover:text-dark-text transition-colors"
            >
              <ChevronDown
                size={13}
                className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`}
              />
              Advanced
            </button>
            {showAdvanced && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-xs text-dark-muted block mb-1">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    placeholder="Any notes about this site..."
                    rows={2}
                    className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-cm-purple resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error / success */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-dark-danger/10 border border-dark-danger/30 rounded-lg">
              <AlertCircle size={14} className="text-dark-danger shrink-0 mt-0.5" />
              <p className="text-xs text-dark-danger">{error}</p>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-dark-success/10 border border-dark-success/30 rounded-lg">
              <CheckCircle2 size={14} className="text-dark-success" />
              <p className="text-xs text-dark-success">Site added successfully.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-dark-border bg-dark-panel2 rounded-b-xl">
          <p className="text-[11px] text-dark-muted">
            {isWix && form.wixSiteId && form.wixApiKey && form.wixAccountId
              ? "Wix credentials will be validated on save."
              : "Wix credentials can be added later."}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-dark-muted hover:text-dark-text transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || success || !form.name.trim() || !form.domain.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg text-sm font-medium hover:bg-cm-purple/80 transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              {success ? "Saved!" : saving ? "Validating..." : "Save Site"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
