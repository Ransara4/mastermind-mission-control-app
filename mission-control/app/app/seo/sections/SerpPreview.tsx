"use client";

interface SerpPreviewProps {
  title: string;
  url: string;
  description: string;
  siteName?: string;
}

const TITLE_MAX = 60;
const DESC_MAX = 160;

function CharBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = Math.min(value / max, 1);
  const over = value > max;
  const barColor = over
    ? "bg-dark-danger"
    : value >= max * 0.75
    ? "bg-dark-success"
    : "bg-dark-warn";
  const textColor = over ? "text-dark-danger" : "text-dark-muted";
  const statusIcon = over ? "✗" : value >= max * 0.5 ? "✓" : "–";
  const statusColor = over
    ? "text-dark-danger"
    : value >= max * 0.5
    ? "text-dark-success"
    : "text-dark-muted";

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`w-32 shrink-0 ${textColor}`}>
        {label}: {value}/{max} chars
      </span>
      <div className="flex-1 h-1.5 bg-dark-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <span className={`w-4 text-center shrink-0 font-medium ${statusColor}`}>
        {statusIcon}
      </span>
    </div>
  );
}

export default function SerpPreview({
  title,
  url,
  description,
  siteName,
}: SerpPreviewProps) {
  // Derive breadcrumb: siteName › path
  let breadcrumb = "";
  try {
    const u = new URL(url);
    const parts: string[] = [];
    if (siteName) {
      parts.push(siteName);
    } else {
      parts.push(u.hostname.replace(/^www\./, ""));
    }
    if (u.pathname && u.pathname !== "/") {
      const pathParts = u.pathname.split("/").filter(Boolean);
      parts.push(...pathParts);
    }
    breadcrumb = parts.join(" › ");
  } catch {
    breadcrumb = siteName || url;
  }

  const displayTitle =
    title.length > TITLE_MAX ? title.slice(0, TITLE_MAX - 1) + "…" : title;

  const displayDesc =
    description.length > DESC_MAX
      ? description.slice(0, DESC_MAX - 1) + "…"
      : description;

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-4 space-y-3">
      {/* Section header */}
      <p className="text-xs font-semibold text-dark-muted uppercase tracking-wide">
        SERP Preview
      </p>

      {/* Google result mockup — white bg to simulate Google's results page */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        {/* Breadcrumb row */}
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-xs" role="img" aria-label="globe">
            🌐
          </span>
          <span
            className="text-xs truncate max-w-xs"
            style={{ color: "#202124", fontFamily: "Arial, sans-serif" }}
          >
            {breadcrumb}
          </span>
        </div>

        {/* Title — Google blue, exception to no-hex rule (Google UI simulation) */}
        <p
          className="font-normal leading-snug mb-1 cursor-pointer hover:underline"
          style={{
            color: "#1a0dab",
            fontSize: "18px",
            fontFamily: "Arial, sans-serif",
            lineHeight: "1.35",
          }}
        >
          {displayTitle || (
            <span style={{ color: "#9aa0a6", fontStyle: "italic" }}>
              No title
            </span>
          )}
        </p>

        {/* Description — Google gray, exception to no-hex rule (Google UI simulation) */}
        <p
          className="leading-snug line-clamp-2"
          style={{
            color: "#4d5156",
            fontSize: "14px",
            fontFamily: "Arial, sans-serif",
            lineHeight: "1.57",
          }}
        >
          {displayDesc || (
            <span style={{ color: "#9aa0a6", fontStyle: "italic" }}>
              No description
            </span>
          )}
        </p>
      </div>

      {/* Character count bars */}
      <div className="space-y-1.5">
        <CharBar label="Title" value={title.length} max={TITLE_MAX} />
        <CharBar label="Description" value={description.length} max={DESC_MAX} />
      </div>
    </div>
  );
}
