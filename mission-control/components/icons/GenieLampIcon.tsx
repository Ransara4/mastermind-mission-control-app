import type { SVGProps } from "react";

interface Props extends SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

export default function GenieLampIcon({ className, size, width, height, ...props }: Props) {
  const dim = size ?? 24;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={width ?? dim}
      height={height ?? dim}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Sparkle 1 (larger) */}
      <path d="M6 1L6.5 2.5L8 3L6.5 3.5L6 5L5.5 3.5L4 3L5.5 2.5Z" />
      {/* Sparkle 2 (smaller) */}
      <path d="M2.5 5.5L2.8 6.4L3.7 6.7L2.8 7L2.5 7.9L2.2 7L1.3 6.7L2.2 6.4Z" />

      {/* Spout — wide sweep left then hooked tip */}
      <path d="M7.5 14C5.5 14 3.5 13 2 11.5C1.3 10.8 1.3 10 2 9.5C2.5 9.2 3.3 9.5 3.5 10" />

      {/* Lamp body — very wide, flat oval */}
      <path d="M10 11.5C8.5 11.5 7 12.5 7 14.5C7 16.5 8.5 17.5 12.5 17.5C16.5 17.5 19.5 16.5 19.5 14.5C19.5 12.5 18 11.5 15.5 11.5Z" />

      {/* Handle — D-loop on right */}
      <path d="M19.5 13C21 13.3 22 13.8 22 14.5C22 15.2 21 15.7 19.5 16" />

      {/* Lid collar — bar at top of body, slightly wider */}
      <line x1="9.5" y1="11.5" x2="16" y2="11.5" />

      {/* Lid dome — low flat arc */}
      <path d="M10 11.5C10 10 11 9 12.8 9C14.5 9 15.5 10 15.5 11.5" />

      {/* Lid knob — tiny stem + ball */}
      <line x1="12.8" y1="9" x2="12.8" y2="8.3" />
      <circle cx="12.8" cy="7.8" r="0.6" />

      {/* Base — two tiered bars */}
      <rect x="10" y="17.5" width="5" height="0.9" rx="0.3" />
      <rect x="9" y="18.4" width="7" height="1.1" rx="0.3" />
    </svg>
  );
}
