"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import type { FixQueueItem } from "@/lib/seo-types";

interface Props {
  items: FixQueueItem[];
}

export default function FixesMade({ items }: Props) {
  const [open, setOpen] = useState(false);

  const doneItems = items.filter(
    (i) => i.status === "fixed" || i.status === "dismissed"
  );

  if (doneItems.length === 0) return null;

  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 text-left"
      >
        {open ? (
          <ChevronDown size={14} className="text-dark-muted shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-dark-muted shrink-0" />
        )}
        <CheckCircle2 size={15} className="text-dark-success shrink-0" />
        <span className="text-sm font-semibold text-dark-text">Fixes Made</span>
        <span className="ml-1 text-xs bg-dark-success/20 text-dark-success px-2 py-0.5 rounded-full font-medium">
          {doneItems.length}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-1.5">
          {doneItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2.5 py-2 px-3 rounded-lg bg-dark-panel2"
            >
              <CheckCircle2
                size={13}
                className={
                  item.status === "fixed"
                    ? "text-dark-success mt-0.5 shrink-0"
                    : "text-dark-muted mt-0.5 shrink-0"
                }
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-dark-text truncate">{item.message}</p>
                {item.page && (
                  <p className="text-[10px] text-dark-muted truncate mt-0.5">{item.page}</p>
                )}
              </div>
              <span
                className={`text-[10px] font-medium shrink-0 px-1.5 py-0.5 rounded ${
                  item.status === "fixed"
                    ? "bg-dark-success/20 text-dark-success"
                    : "bg-dark-panel2 text-dark-muted border border-dark-border"
                }`}
              >
                {item.status === "fixed" ? "Fixed" : "Dismissed"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
