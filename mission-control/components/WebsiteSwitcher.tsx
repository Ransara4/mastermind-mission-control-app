"use client";

import { Globe, ChevronDown, Circle } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface Website {
  domain: string;
  name: string;
  hosting: string;
  status: string;
}

interface Props {
  websites: Website[];
  selectedDomain: string | null;
  onSelect: (domain: string) => void;
  label?: string;
}

const hostingColors: Record<string, string> = {
  wix: "bg-cm-purple/20 text-cm-purple",
  wordpress: "bg-dark-success/20 text-dark-success",
  vercel: "bg-dark-panel2 text-dark-text",
  shopify: "bg-dark-success/15 text-dark-success",
};

function HostingBadge({ hosting }: { hosting: string }) {
  if (!hosting) return null;
  const color = hostingColors[hosting.toLowerCase()] || "bg-dark-panel2 text-dark-muted";
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${color} uppercase`}>
      {hosting}
    </span>
  );
}

export default function WebsiteSwitcher({ websites, selectedDomain, onSelect, label }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = websites.find((s) => s.domain === selectedDomain);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 px-4 py-2.5 bg-dark-panel border border-dark-border rounded-xl hover:border-cm-purple transition-colors w-full sm:w-auto"
      >
        <Globe size={18} className="text-cm-purple" />
        <div className="text-left flex-1 min-w-0">
          {label && <p className="text-[10px] text-dark-muted uppercase tracking-wider font-medium">{label}</p>}
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-dark-text truncate">
              {selected?.name || "Select a site"}
            </p>
            {selected?.hosting && <HostingBadge hosting={selected.hosting} />}
          </div>
          <p className="text-xs text-dark-muted truncate">
            {selected?.domain || ""}
          </p>
        </div>
        <ChevronDown
          size={16}
          className={`text-dark-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-dark-panel2 border border-dark-border rounded-xl shadow-lg shadow-black/30 z-50 overflow-hidden">
          {websites.map((site) => {
            const isActive = site.domain === selectedDomain;
            return (
              <button
                key={site.domain}
                onClick={() => {
                  onSelect(site.domain);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-cm-purple/10 transition-colors ${
                  isActive ? "bg-cm-purple/10" : ""
                }`}
              >
                <Circle
                  size={8}
                  className={
                    site.status === "active"
                      ? "text-dark-success fill-dark-success"
                      : "text-dark-muted fill-dark-muted"
                  }
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm font-medium truncate ${
                        isActive ? "text-cm-purple" : "text-dark-text"
                      }`}
                    >
                      {site.name}
                    </p>
                    {site.hosting && <HostingBadge hosting={site.hosting} />}
                  </div>
                  <p className="text-xs text-dark-muted truncate">{site.domain}</p>
                </div>
                {isActive && (
                  <span className="text-xs text-cm-purple font-medium shrink-0">Active</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
