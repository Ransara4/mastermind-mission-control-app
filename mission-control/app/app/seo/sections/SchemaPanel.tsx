"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertCircle, CheckCircle2, XCircle, Star } from "lucide-react";
import type { SchemaTestResult } from "@/lib/seo-types";

interface SchemaPanelProps {
  domain: string;
}

export default function SchemaPanel({ domain }: SchemaPanelProps) {
  const [result, setResult] = useState<SchemaTestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!domain) return;
    load();
  }, [domain]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/seo/schema-test?domain=${encodeURIComponent(domain)}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const data: SchemaTestResult = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Failed to load schema data");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-dark-text">Schema Validation</h3>

      {loading && (
        <div className="flex items-center gap-2 text-dark-muted text-sm py-4">
          <Loader2 size={16} className="animate-spin" />
          Checking schema markup...
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-2 text-dark-danger text-sm py-2">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {!loading && !error && result && (
        <div className="space-y-4">
          {/* Summary row */}
          <div className="flex items-center gap-4">
            <div className="bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-center min-w-[80px]">
              <p className="text-xl font-bold text-dark-text">{result.totalSchemas}</p>
              <p className="text-xs text-dark-muted">Schemas found</p>
            </div>
            {result.hasErrors ? (
              <div className="flex items-center gap-1.5 text-dark-danger text-sm">
                <XCircle size={15} />
                Has errors
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-dark-success text-sm">
                <CheckCircle2 size={15} />
                No errors
              </div>
            )}
          </div>

          {/* Schema list */}
          {result.schemasFound.length === 0 ? (
            <p className="text-sm text-dark-muted">No schema markup found on this domain.</p>
          ) : (
            <div className="space-y-2">
              {result.schemasFound.map((schema, i) => (
                <div
                  key={i}
                  className="bg-dark-panel2 border border-dark-border rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Type badge */}
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cm-purple/15 text-cm-purple border border-cm-purple/30">
                      {schema.type}
                    </span>
                    {/* Valid status */}
                    {schema.valid ? (
                      <span className="flex items-center gap-1 text-xs text-dark-success">
                        <CheckCircle2 size={11} /> Valid
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-dark-danger">
                        <XCircle size={11} /> Invalid
                      </span>
                    )}
                    {/* Rich result badge */}
                    {schema.richResultEligible && (
                      <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-dark-success/15 text-dark-success border border-dark-success/30">
                        <Star size={10} /> Rich result eligible
                      </span>
                    )}
                  </div>
                  {/* Issues */}
                  {schema.issues.length > 0 && (
                    <ul className="space-y-0.5">
                      {schema.issues.map((issue, j) => (
                        <li key={j} className="flex items-start gap-1.5 text-xs text-dark-warn">
                          <AlertCircle size={11} className="mt-0.5 shrink-0" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-dark-muted">
            Tested: {new Date(result.testedAt).toLocaleString()}
          </p>
        </div>
      )}

      {!loading && !error && !result && (
        <p className="text-sm text-dark-muted">No schema data available.</p>
      )}
    </div>
  );
}
