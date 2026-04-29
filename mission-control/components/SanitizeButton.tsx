"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { CheckSquare, Square } from "lucide-react";

const storageKey = (path: string) => `gc-sanitized:${path}`;

export default function SanitizeButton() {
  const pathname = usePathname();
  const [sanitized, setSanitized] = useState(false);

  useEffect(() => {
    setSanitized(localStorage.getItem(storageKey(pathname)) === "1");
  }, [pathname]);

  const toggle = () => {
    const next = !sanitized;
    setSanitized(next);
    if (next) {
      localStorage.setItem(storageKey(pathname), "1");
    } else {
      localStorage.removeItem(storageKey(pathname));
    }
  };

  return (
    <button
      onClick={toggle}
      className={`fixed bottom-6 right-[4.5rem] z-50 w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${
        sanitized
          ? "bg-dark-success/20 border-dark-success/40 text-dark-success hover:bg-dark-success/30"
          : "bg-dark-panel2 border-dark-border text-dark-muted hover:bg-cm-purple/10 hover:border-cm-purple/40 hover:text-cm-purple"
      }`}
      title={sanitized ? "Marked as sanitized — click to unmark" : "Mark page as sanitized"}
      aria-label="Toggle sanitization status"
    >
      {sanitized ? <CheckSquare size={18} /> : <Square size={18} />}
    </button>
  );
}
