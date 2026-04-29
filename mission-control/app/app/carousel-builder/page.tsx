"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  LayoutTemplate,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Search,
  Upload,
  Download,
  Linkedin,
  Instagram,
  Trash2,
  Sparkles,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  X,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

interface FormData {
  mode: "create" | "recreate";
  recreateUrl: string;
  productDescription: string;
  pricePoint: "low" | "mid" | "high" | "";
  desiredCta: string;
  slideCount: number;
  targetAudience: string;
  painPoints: string;
  desiredTransformation: string;
  framework: string;
  tone: string;
  platform: "Instagram" | "LinkedIn" | "";
  palette: string; // theme id or "custom"
  customPalette?: CustomPalette; // used when palette === "custom"
}

interface Slide {
  type: "cover" | "content" | "cta";
  heading: string;
  body: string;
  bullets?: string[];
}

interface CarouselResult {
  slides: Slide[];
}

interface SlideImage {
  url: string;
  thumb?: string;
  photographer?: string;
  alt?: string;
  isTemplate?: boolean;
  templateId?: string;
}

interface PexelsPhoto {
  id?: string;
  url: string;
  thumb?: string;
  photographer: string;
  alt?: string;
}

interface Template {
  id: string;
  filename: string;
  url: string;
  createdAt: string;
}

interface ExportedCarousel {
  carouselId: string;
  folder: string;
  pngs: string[];
  servePaths: string[];
}

// ── Constants ────────────────────────────────────────────────────────

const FRAMEWORKS = [
  { id: "AIDA",     label: "AIDA",     desc: "Attention, Interest, Desire, Action" },
  { id: "PAS",      label: "PAS",      desc: "Problem, Agitate, Solution" },
  { id: "Story",    label: "Story",    desc: "Hook, conflict, resolution" },
  { id: "Tips",     label: "Tips",     desc: "Numbered tips list" },
  { id: "Listicle", label: "Listicle", desc: "List-based format" },
];

const TONES = ["Bold", "Casual", "Professional", "Nurturing"];

// ── Custom palette type ───────────────────────────────────────────────
interface CustomPalette {
  overlay: string; // hex: "#0A2540"
  accent: string;  // hex: "#00D4AA"
  alpha: number;   // 0.62
}

// ── Theme definitions (preset + custom support) ───────────────────────
interface ThemeDef {
  id: string;
  name: string;
  overlay: string; // hex
  accent: string;  // hex
  alpha: number;
}

const THEMES: ThemeDef[] = [
  { id: "royal",    name: "Royal",      overlay: "#1A0033", accent: "#BB86FC", alpha: 0.62 },
  { id: "ocean",    name: "Ocean",      overlay: "#0A2540", accent: "#00D4AA", alpha: 0.62 },
  { id: "midnight", name: "Midnight",   overlay: "#040B14", accent: "#38BDF8", alpha: 0.72 },
  { id: "sunset",   name: "Sunset",     overlay: "#1A1A2E", accent: "#E94560", alpha: 0.62 },
  { id: "forest",   name: "Forest",     overlay: "#1B2D1B", accent: "#4CAF50", alpha: 0.62 },
  { id: "jade",     name: "Jade",       overlay: "#021A14", accent: "#00BFA5", alpha: 0.68 },
  { id: "gold",     name: "Gold Rush",  overlay: "#1A1000", accent: "#F5C518", alpha: 0.68 },
  { id: "ember",    name: "Ember",      overlay: "#1C0800", accent: "#FF6B35", alpha: 0.68 },
  { id: "ruby",     name: "Ruby",       overlay: "#280308", accent: "#FF4D6D", alpha: 0.65 },
  { id: "coral",    name: "Coral",      overlay: "#1A0A0A", accent: "#FF6B6B", alpha: 0.65 },
  { id: "plum",     name: "Plum",       overlay: "#1A0D2E", accent: "#D4A5F5", alpha: 0.65 },
  { id: "arctic",   name: "Arctic",     overlay: "#0A1520", accent: "#A8DAFF", alpha: 0.60 },
  { id: "slate",    name: "Slate",      overlay: "#0F1820", accent: "#94A3B8", alpha: 0.70 },
  { id: "neon",     name: "Neon Noir",  overlay: "#050505", accent: "#39FF14", alpha: 0.75 },
  { id: "minimal",  name: "Minimal",    overlay: "#0F0F0F", accent: "#ffffff", alpha: 0.72 },
];

// Kept for backward compat with SlidePreview (preset IDs map to overlay data)
const PALETTE_OVERLAYS: Record<string, { rgb: string; alpha: number; accent: string }> = Object.fromEntries(
  THEMES.map((t) => {
    const r = parseInt(t.overlay.slice(1, 3), 16);
    const g = parseInt(t.overlay.slice(3, 5), 16);
    const b = parseInt(t.overlay.slice(5, 7), 16);
    return [t.id, { rgb: `${r},${g},${b}`, alpha: t.alpha, accent: t.accent }];
  })
);

// Helper: hex overlay color to "r,g,b" string
function hexToRgbString(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// HSL helpers for auto-theme generation
function hslToHex(h: number, s: number, l: number): string {
  const sl = s / 100;
  const ll = l / 100;
  const a = sl * Math.min(ll, 1 - ll);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function generateAutoTheme(seedHue: number, scheme: "complementary" | "triadic" | "analogous" | "split"): CustomPalette {
  const accentHue =
    scheme === "complementary" ? (seedHue + 180) % 360 :
    scheme === "triadic"       ? (seedHue + 120) % 360 :
    scheme === "split"         ? (seedHue + 150) % 360 :
    (seedHue + 30) % 360;
  return {
    overlay: hslToHex(seedHue, 65, 10),
    accent: hslToHex(accentHue, 85, 65),
    alpha: 0.65,
  };
}

const PRICE_POINTS = [
  { id: "low",  label: "Low-Ticket",  range: "$7–47" },
  { id: "mid",  label: "Mid-Ticket",  range: "$97–497" },
  { id: "high", label: "High-Ticket", range: "$500+" },
] as const;

const IMAGE_SOURCES = [
  { id: "pexels",       label: "Pexels (Free)" },
  { id: "unsplash",     label: "Unsplash (Free)" },
  { id: "web",          label: "Web Search (Free)" },
  { id: "huggingface",  label: "AI Generate (FLUX)" },
] as const;

const STEP_LABELS = ["Offer", "Audience", "Style", "Generate Text", "Images"];

// ── Author config (social preview identity) ───────────────────────────
const AUTHOR = {
  handle: "joe.che.official",
  name: "Joe Che",
  initials: "JC",
  bio: "Business Automation Expert",
  avatar: "/joe-avatar.png",
};

// ── ICP Data ─────────────────────────────────────────────────────────

interface IcpEntry {
  id: string;
  label: string;
  product?: string;
  audience: string;
  painPoints: string;
  transformation: string;
}

interface ProjectIcps {
  label: string;
  icps: IcpEntry[];
}

const PROJECT_ICPS: Record<string, ProjectIcps> = {
  rio: {
    label: "Rio",
    icps: [
      {
        id: "rio-coaches",
        label: "Coaches & Consultants",
        audience:
          "Founder-led service businesses doing $150K-$350K/year. Digital nomad or location-independent. 1-5 person team. Business coaches, consultants, fractional CMOs, agencies, high-ticket service providers.",
        painPoints:
          "Doing too much manually, leads slipping through the cracks, no structured CRM or follow-up system, founder is the operational bottleneck, inconsistent monthly revenue, overwhelmed and reactive.",
        transformation:
          "A systemized backend where leads are followed up automatically, clients onboard themselves via WhatsApp, and the founder can focus on delivery and growth instead of repetitive ops.",
      },
      {
        id: "rio-fashion",
        label: "Shopify Fashion Stores",
        audience:
          "Founder-led boutique fashion brands in Bali, Colombia, Mexico, or Brazil. $150K-$2M/year. Run Instagram as their storefront and WhatsApp as the channel where the sale actually closes. 2-10 person team.",
        painPoints:
          "Managing hundreds of customer conversations manually on WhatsApp every day, no real CRM (WhatsApp chat history is their entire customer database), orders and follow-ups falling through the cracks, can't scale without hiring more staff.",
        transformation:
          "An automated WhatsApp sales workflow that handles inquiries, follows up on abandoned conversations, sends order updates, and lets one person do what used to take three.",
      },
    ],
  },
  masterminds: {
    label: "Masterminds HQ",
    icps: [
      {
        id: "mm-founder",
        label: "Founder-Led Service Business",
        product:
          "Business Automation Mastermind: a high-ticket group program for founder-led service businesses doing $150K-$350K/year who want to systemize their backend, automate client onboarding, and build a business that runs without them being in every task.",
        audience:
          "Founder-led service businesses doing $150K-$350K/year. Business coaches, consultants, marketing agencies, fractional executives. 1-5 person team with no dedicated ops leader. Decision maker is the founder.",
        painPoints:
          "Revenue plateau despite active marketing, inconsistent monthly income, too much manual backend work, overwhelmed and reactive, afraid to scale because the systems are fragile and everything breaks when they get busy.",
        transformation:
          "A systemized, scalable business with consistent revenue, automated client onboarding, and a backend that runs without the founder being personally involved in every task.",
      },
    ],
  },
  allsorted: {
    label: "All Sorted",
    icps: [
      {
        id: "allsorted-solopreneur",
        label: "Solopreneur / Coach / Consultant",
        audience:
          "Solo coaches, consultants, therapists, freelancers, and course creators doing $50K-$500K/year. 0-3 person team. Know they should be creating content but have no time or system to do it consistently.",
        painPoints:
          "Blog is dead or never started. Tried ChatGPT but output was generic, off-brand, and still needed heavy editing. Competitors are ranking on Google for keywords they should own. No consistent content publishing system.",
        transformation:
          "Get found on Google without paying for ads. Positioned as the go-to expert in their niche with fresh content published automatically every week. Inbound leads from SEO within 3-6 months.",
      },
    ],
  },
};

const MM_ICP = PROJECT_ICPS.masterminds.icps[0];

const DEFAULT_FORM: FormData = {
  mode: "create",
  recreateUrl: "",
  productDescription: MM_ICP.product ?? "",
  pricePoint: "high",
  desiredCta: "Join the Mastermind",
  slideCount: 5,
  targetAudience: MM_ICP.audience,
  painPoints: MM_ICP.painPoints,
  desiredTransformation: MM_ICP.transformation,
  framework: "AIDA",
  tone: "Professional",
  platform: "LinkedIn",
  palette: "royal",
};

// ── Sub-components (module level) ─────────────────────────────────────

interface StepDotProps {
  step: number;
  current: number;
  label: string;
  onClick: (step: number) => void;
}

function StepDot({ step, current, label, onClick }: StepDotProps) {
  const isActive = step === current;
  const isDone = step < current;
  return (
    <button
      onClick={() => onClick(step)}
      className="flex flex-col items-center gap-1 group"
      type="button"
    >
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center font-bold transition-colors ${
          isActive
            ? "bg-cm-purple text-white"
            : isDone
            ? "bg-cm-purple/40 text-white"
            : "bg-dark-panel2 text-dark-muted"
        }`}
        style={{ fontSize: "10px" }}
      >
        {step}
      </div>
      <span
        className={`font-medium truncate max-w-[52px] transition-colors ${
          isActive ? "text-cm-purple" : "text-dark-muted"
        }`}
        style={{ fontSize: "10px" }}
      >
        {label}
      </span>
    </button>
  );
}

// ── ThemePicker ─────────────────────────────────────────────────────────

interface ThemePickerProps {
  palette: string;
  customPalette?: CustomPalette;
  onChange: (id: string, custom?: CustomPalette) => void;
}

const SCHEME_LABELS: { id: "complementary" | "triadic" | "analogous" | "split"; label: string }[] = [
  { id: "complementary", label: "Complementary" },
  { id: "triadic",       label: "Triadic" },
  { id: "analogous",     label: "Analogous" },
  { id: "split",         label: "Split Comp." },
];

function ThemePicker({ palette, customPalette, onChange }: ThemePickerProps) {
  const [tab, setTab] = useState<"presets" | "custom" | "autogen">("presets");
  const [customOverlay, setCustomOverlay] = useState(customPalette?.overlay || "#1A0033");
  const [customAccent, setCustomAccent] = useState(customPalette?.accent || "#BB86FC");
  const [customAlpha, setCustomAlpha] = useState(customPalette?.alpha ?? 0.65);
  const [autoScheme, setAutoScheme] = useState<"complementary" | "triadic" | "analogous" | "split">("complementary");
  const [autoSuggestions, setAutoSuggestions] = useState<CustomPalette[]>([]);

  function applyCustom() {
    onChange("custom", { overlay: customOverlay, accent: customAccent, alpha: customAlpha });
  }

  function generateSuggestions() {
    const hues = [0, 45, 120, 200, 270, 330];
    const picks = hues.slice(0, 4).map((h) => generateAutoTheme(h + Math.round(Math.random() * 20 - 10), autoScheme));
    setAutoSuggestions(picks);
  }

  const activePal =
    palette === "custom" && customPalette
      ? { rgb: hexToRgbString(customPalette.overlay), alpha: customPalette.alpha, accent: customPalette.accent }
      : PALETTE_OVERLAYS[palette] || PALETTE_OVERLAYS.royal;

  return (
    <div className="space-y-3">
      {/* Tab bar */}
      <div className="flex gap-1 bg-dark-panel2 border border-dark-border rounded-lg p-1 w-fit">
        {(["presets", "custom", "autogen"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              tab === t ? "bg-cm-purple text-white" : "text-dark-muted hover:text-dark-text"
            }`}
          >
            {t === "presets" ? "Presets" : t === "custom" ? "Custom" : "Auto-Generate"}
          </button>
        ))}
      </div>

      {/* Current selection preview */}
      <div className="flex items-center gap-2 text-xs text-dark-muted">
        <span
          className="w-5 h-5 rounded-full border border-dark-border flex-shrink-0"
          style={{ background: `rgba(${activePal.rgb}, 1)` }}
        />
        <span
          className="w-5 h-5 rounded-full border border-dark-border flex-shrink-0"
          style={{ background: activePal.accent }}
        />
        <span>{palette === "custom" ? "Custom theme" : THEMES.find((t) => t.id === palette)?.name || palette}</span>
      </div>

      {/* Presets tab */}
      {tab === "presets" && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => onChange(theme.id)}
              className={`relative rounded-xl overflow-hidden border-2 transition-all group ${
                palette === theme.id && palette !== "custom"
                  ? "border-cm-purple"
                  : "border-transparent hover:border-cm-purple/60"
              }`}
            >
              {/* Swatch preview */}
              <div className="h-12" style={{ background: theme.overlay }}>
                <div className="h-full w-full flex flex-col justify-center px-2 gap-0.5"
                  style={{ background: `rgba(${hexToRgbString(theme.overlay)}, ${theme.alpha})` }}>
                  <div className="h-1 rounded-full w-4/5 bg-white/80" />
                  <div className="h-0.5 rounded-full w-3/5 bg-white/50" />
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: theme.accent }} />
                    <div className="h-0.5 rounded-full w-2/5" style={{ background: theme.accent, opacity: 0.7 }} />
                  </div>
                </div>
              </div>
              <div className="bg-dark-panel border-t border-dark-border px-1 py-1 text-center">
                <p className="text-dark-text font-medium truncate" style={{ fontSize: "9px" }}>{theme.name}</p>
              </div>
              {palette === theme.id && palette !== "custom" && (
                <div className="absolute top-1 right-1 w-3 h-3 bg-cm-purple rounded-full flex items-center justify-center">
                  <Check className="w-2 h-2 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Custom tab */}
      {tab === "custom" && (
        <div className="bg-dark-panel2 border border-dark-border rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-dark-muted mb-2">Overlay Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customOverlay}
                  onChange={(e) => setCustomOverlay(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-dark-border cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={customOverlay}
                  onChange={(e) => setCustomOverlay(e.target.value)}
                  className="flex-1 bg-dark-panel border border-dark-border rounded-lg px-2 py-1.5 text-dark-text text-xs font-mono focus:outline-none focus:border-cm-purple"
                  maxLength={7}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-dark-muted mb-2">Accent Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customAccent}
                  onChange={(e) => setCustomAccent(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-dark-border cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={customAccent}
                  onChange={(e) => setCustomAccent(e.target.value)}
                  className="flex-1 bg-dark-panel border border-dark-border rounded-lg px-2 py-1.5 text-dark-text text-xs font-mono focus:outline-none focus:border-cm-purple"
                  maxLength={7}
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs text-dark-muted mb-2">Overlay Opacity — {Math.round(customAlpha * 100)}%</label>
            <input
              type="range"
              min="0.3"
              max="0.9"
              step="0.01"
              value={customAlpha}
              onChange={(e) => setCustomAlpha(parseFloat(e.target.value))}
              className="w-full accent-cm-purple"
            />
          </div>
          {/* Live preview */}
          <div className="rounded-lg overflow-hidden h-20" style={{ background: customOverlay }}>
            <div
              className="h-full flex flex-col justify-center px-4 gap-1"
              style={{ background: `rgba(${hexToRgbString(customOverlay)}, ${customAlpha})` }}
            >
              <div className="h-2 bg-white/80 rounded w-2/3" />
              <div className="h-1 bg-white/50 rounded w-1/2" />
              <div className="flex gap-1 mt-1">
                <span className="w-2 h-2 rounded-full" style={{ background: customAccent }} />
                <div className="h-1 rounded mt-0.5 w-1/3" style={{ background: customAccent, opacity: 0.7 }} />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={applyCustom}
            className="w-full py-2 rounded-lg bg-cm-purple text-white text-sm font-semibold hover:bg-cm-purple/90 transition-colors"
          >
            Apply Custom Theme
          </button>
        </div>
      )}

      {/* Auto-generate tab */}
      {tab === "autogen" && (
        <div className="bg-dark-panel2 border border-dark-border rounded-xl p-4 space-y-4">
          <div>
            <label className="block text-xs text-dark-muted mb-2">Color Harmony</label>
            <div className="flex gap-2 flex-wrap">
              {SCHEME_LABELS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setAutoScheme(s.id)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    autoScheme === s.id
                      ? "bg-cm-purple/15 border-cm-purple text-cm-purple"
                      : "bg-dark-panel border-dark-border text-dark-muted hover:text-dark-text"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-dark-muted mt-2">
              {autoScheme === "complementary" && "Opposite colors on the wheel — high contrast, bold."}
              {autoScheme === "triadic" && "Three equally spaced hues — vibrant and balanced."}
              {autoScheme === "analogous" && "Adjacent hues — harmonious and cohesive."}
              {autoScheme === "split" && "Split-complementary — dynamic with softer contrast."}
            </p>
          </div>
          <button
            type="button"
            onClick={generateSuggestions}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cm-purple text-white text-sm font-semibold hover:bg-cm-purple/90 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Generate 4 Themes
          </button>
          {autoSuggestions.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {autoSuggestions.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onChange("custom", sug)}
                  className="rounded-lg overflow-hidden border-2 border-transparent hover:border-cm-purple transition-all"
                >
                  <div className="h-14" style={{ background: sug.overlay }}>
                    <div
                      className="h-full flex flex-col justify-center px-3 gap-1"
                      style={{ background: `rgba(${hexToRgbString(sug.overlay)}, ${sug.alpha})` }}
                    >
                      <div className="h-1.5 bg-white/80 rounded w-3/4" />
                      <div className="h-1 bg-white/50 rounded w-1/2" />
                      <div className="flex gap-1 mt-0.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sug.accent }} />
                        <div className="h-1 rounded mt-0.5 w-1/3" style={{ background: sug.accent, opacity: 0.7 }} />
                      </div>
                    </div>
                  </div>
                  <div className="bg-dark-panel border-t border-dark-border px-2 py-1 text-left">
                    <p className="text-dark-muted font-mono" style={{ fontSize: "8px" }}>
                      {sug.overlay} + {sug.accent}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Editable inline field — autosaves on blur
interface EditableFieldProps {
  value: string;
  onChange: (v: string) => void;
  tag?: "p" | "h3" | "span";
  className?: string;
  placeholder?: string;
}

function EditableField({ value, onChange, tag, className, placeholder }: EditableFieldProps) {
  const ref = useRef<HTMLElement>(null);
  const editing = useRef(false);

  useEffect(() => {
    if (!editing.current && ref.current) {
      if (ref.current.textContent !== value) {
        ref.current.textContent = value;
      }
    }
  }, [value]);

  const handleFocus = () => { editing.current = true; };
  const handleBlur = () => {
    editing.current = false;
    const next = ref.current?.textContent ?? "";
    if (next !== value) onChange(next);
  };

  const Tag = (tag || "p") as React.ElementType;
  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onFocus={handleFocus}
      onBlur={handleBlur}
      data-placeholder={placeholder}
      className={`cursor-text outline-none hover:ring-1 hover:ring-dark-border focus:ring-1 focus:ring-cm-purple rounded px-1 -mx-1 transition-all empty:before:content-[attr(data-placeholder)] empty:before:text-dark-muted ${className ?? ""}`}
    />
  );
}

// Editable slide card for step 4
interface EditableSlideCardProps {
  slide: Slide;
  index: number;
  onCopy: (text: string) => void;
  copiedKey: string | null;
  onUpdate: (field: keyof Slide, value: string | string[]) => void;
}

function EditableSlideCard({ slide, index, onCopy, copiedKey, onUpdate }: EditableSlideCardProps) {
  const [expanded, setExpanded] = useState(true);
  const key = `slide-${index}`;

  const slideText = [
    slide.heading,
    slide.body,
    ...(slide.bullets ?? []).map((b) => `• ${b}`),
  ].filter(Boolean).join("\n");

  return (
    <div className="bg-dark-panel2 border border-dark-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-mono text-dark-muted bg-dark-panel px-2 py-0.5 rounded-full border border-dark-border uppercase flex-shrink-0">
            {slide.type === "cover" ? "Cover" : slide.type === "cta" ? "CTA" : `Slide ${index}`}
          </span>
          <span className="text-dark-text font-medium text-sm truncate">{slide.heading}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onCopy(slideText)}
            className="p-1.5 rounded-lg bg-dark-panel border border-dark-border text-dark-muted hover:text-dark-text transition-colors"
            title="Copy slide"
            type="button"
          >
            {copiedKey === key ? (
              <Check className="w-3.5 h-3.5 text-dark-success" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 rounded-lg bg-dark-panel border border-dark-border text-dark-muted hover:text-dark-text transition-colors"
            type="button"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-dark-border pt-3">
          <div>
            <p className="text-xs text-dark-muted mb-1">Heading</p>
            <EditableField
              value={slide.heading}
              onChange={(v) => onUpdate("heading", v)}
              tag="p"
              className="text-dark-text font-semibold text-sm leading-snug"
              placeholder="Heading..."
            />
          </div>
          {slide.body && (
            <div>
              <p className="text-xs text-dark-muted mb-1">Body</p>
              <EditableField
                value={slide.body}
                onChange={(v) => onUpdate("body", v)}
                tag="p"
                className="text-dark-muted text-sm leading-relaxed"
                placeholder="Body text..."
              />
            </div>
          )}
          {slide.bullets && slide.bullets.length > 0 && (
            <div>
              <p className="text-xs text-dark-muted mb-1">Bullets</p>
              <ul className="space-y-1">
                {slide.bullets.map((b, bi) => (
                  <li key={bi} className="flex gap-2 text-sm">
                    <span className="text-cm-purple mt-0.5 flex-shrink-0">•</span>
                    <EditableField
                      value={b}
                      onChange={(v) => {
                        const next = [...(slide.bullets || [])];
                        next[bi] = v;
                        onUpdate("bullets", next);
                      }}
                      tag="span"
                      className="text-dark-muted flex-1"
                      placeholder="Bullet..."
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-dark-muted/50 italic">Click any field to edit. Autosaves on click-away.</p>
        </div>
      )}
    </div>
  );
}

// Visual slide preview (scaled inline preview of the final PNG)
interface SlidePreviewProps {
  slide: Slide;
  image: SlideImage | undefined;
  palette: string;
  customPalette?: CustomPalette;
  platform: string;
  index: number;
  total: number;
  size?: number;
  panoramicImage?: SlideImage | null;
  panoramicIndex?: number;
  panoramicTotal?: number;
}

function SlidePreview({
  slide,
  image,
  palette,
  customPalette,
  platform,
  index,
  total,
  size = 260,
  panoramicImage,
  panoramicIndex,
  panoramicTotal,
}: SlidePreviewProps) {
  const pal =
    palette === "custom" && customPalette
      ? { rgb: hexToRgbString(customPalette.overlay), alpha: customPalette.alpha, accent: customPalette.accent }
      : (PALETTE_OVERLAYS[palette] || PALETTE_OVERLAYS.royal);
  const isLinkedIn = platform?.toLowerCase() === "linkedin";
  const aspectH = isLinkedIn ? size * (1350 / 1080) : size;

  // Determine which image to show and objectPosition for panoramic
  const displayImage = panoramicImage ?? image;
  const objectPos =
    panoramicImage && panoramicTotal && panoramicTotal > 1
      ? `${((panoramicIndex ?? 0) / (panoramicTotal - 1)) * 100}% center`
      : "center center";

  return (
    <div
      className="relative rounded-lg overflow-hidden flex-shrink-0"
      style={{ width: size, height: aspectH }}
    >
      {/* Background */}
      {displayImage?.url ? (
        <img
          src={displayImage.url}
          alt={displayImage.alt || "background"}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: objectPos }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: `rgb(${pal.rgb})` }} />
      )}

      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{ background: `rgba(${pal.rgb},${pal.alpha})` }}
      />

      {/* Text */}
      <div className="absolute inset-0 flex flex-col justify-center p-4 gap-2">
        <p className="text-white font-bold leading-tight drop-shadow-lg" style={{ fontSize: size * 0.055 }}>
          {slide.heading}
        </p>
        {slide.body && (
          <p className="text-white/85 leading-snug drop-shadow" style={{ fontSize: size * 0.033 }}>
            {slide.body.slice(0, 120)}{slide.body.length > 120 ? "…" : ""}
          </p>
        )}
        {slide.bullets && slide.bullets.length > 0 && (
          <ul className="space-y-0.5" style={{ fontSize: size * 0.030 }}>
            {slide.bullets.slice(0, 3).map((b, i) => (
              <li key={i} className="flex gap-1 text-white/85">
                <span style={{ color: pal.accent }}>•</span>
                <span>{b.slice(0, 50)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Slide number */}
      {slide.type !== "cover" && (
        <div className="absolute bottom-2 right-3 text-white/40 font-medium" style={{ fontSize: size * 0.024 }}>
          {index} / {total}
        </div>
      )}
    </div>
  );
}

// ── CarouselPreview component (Instagram phone + LinkedIn feed) ───────

interface CarouselPreviewProps {
  slides: Slide[];
  slideImages: Record<number, SlideImage>;
  imageMode: "unique" | "panoramic" | "same";
  panoramicImage: SlideImage | null;
  sameImage: SlideImage | null;
  palette: string;
  customPalette?: CustomPalette;
  platform: string;
  caption: string;
}

function InstagramPhonePreview({
  slides,
  slideImages,
  imageMode,
  panoramicImage,
  sameImage,
  palette,
  customPalette,
  caption,
}: CarouselPreviewProps) {
  const [previewIndex, setPreviewIndex] = useState(0);

  const prevSlide = () => setPreviewIndex((i) => Math.max(0, i - 1));
  const nextSlide = () => setPreviewIndex((i) => Math.min(slides.length - 1, i + 1));

  const currentSlide = slides[previewIndex];
  const currentImage =
    imageMode === "panoramic" ? undefined :
    imageMode === "same" ? (sameImage ?? undefined) :
    slideImages[previewIndex];
  const panImage = imageMode === "panoramic" ? (panoramicImage ?? undefined) : undefined;

  // Phone shell: 260×540 — proper portrait aspect ratio
  const PHONE_W = 260;
  const SCREEN_W = PHONE_W - 12; // 6px border each side
  const SLIDE_SIZE = SCREEN_W;

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs text-dark-muted font-medium">Instagram</p>
      <div className="flex items-center gap-3">
        <button
          onClick={prevSlide}
          disabled={previewIndex === 0}
          type="button"
          className="p-1.5 rounded-full bg-dark-panel2 border border-dark-border text-dark-muted hover:text-dark-text transition-colors disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Phone shell */}
        <div
          className="bg-gray-900 rounded-[2.2rem] border-[6px] border-gray-700 shadow-2xl overflow-hidden relative flex-shrink-0"
          style={{ width: PHONE_W, height: 540 }}
        >
          {/* Dynamic island pill */}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-16 h-4 bg-black rounded-full z-10" />
          {/* Screen content */}
          <div className="bg-black h-full flex flex-col">
            {/* Status bar */}
            <div className="flex items-center justify-between px-4 pt-7 pb-1 flex-shrink-0">
              <span className="text-white" style={{ fontSize: "9px" }}>9:41</span>
              <span className="text-white" style={{ fontSize: "9px" }}>▓▓▓</span>
            </div>
            {/* IG Header */}
            <div className="h-9 flex items-center px-2 gap-2 border-b border-gray-800 flex-shrink-0">
              <img src={AUTHOR.avatar} alt={AUTHOR.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
              <span className="text-white text-xs font-semibold flex-1">{AUTHOR.handle}</span>
              <span className="text-white text-xs">•••</span>
            </div>
            {/* Carousel slot */}
            <div className="relative overflow-hidden bg-black flex-shrink-0" style={{ width: "100%", height: SLIDE_SIZE }}>
              <SlidePreview
                slide={currentSlide}
                image={currentImage}
                palette={palette}
                customPalette={customPalette}
                platform="Instagram"
                index={previewIndex + 1}
                total={slides.length}
                size={SLIDE_SIZE}
                panoramicImage={panImage}
                panoramicIndex={previewIndex}
                panoramicTotal={slides.length}
              />
              {/* Slide counter badge */}
              <div className="absolute top-2 right-2 bg-black/60 text-white rounded-full px-2 py-0.5" style={{ fontSize: "10px" }}>
                {previewIndex + 1}/{slides.length}
              </div>
              {previewIndex > 0 && (
                <div className="absolute left-1 top-1/2 -translate-y-1/2 w-5 h-5 bg-black/40 rounded-full flex items-center justify-center">
                  <ChevronLeft className="w-3 h-3 text-white" />
                </div>
              )}
              {previewIndex < slides.length - 1 && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 bg-black/40 rounded-full flex items-center justify-center">
                  <ChevronRight className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            {/* Dot indicators */}
            <div className="flex justify-center gap-1 py-1.5 flex-shrink-0">
              {slides.map((_, di) => (
                <div
                  key={di}
                  className={`rounded-full transition-all ${di === previewIndex ? "bg-blue-500 w-2 h-2" : "bg-gray-600 w-1.5 h-1.5"}`}
                />
              ))}
            </div>
            {/* Actions row */}
            <div className="h-8 flex items-center gap-3 px-3 flex-shrink-0">
              <Heart className="w-5 h-5 text-white" />
              <MessageCircle className="w-5 h-5 text-white" />
              <Share2 className="w-5 h-5 text-white" />
            </div>
            {/* Caption */}
            <div className="px-3 flex-1">
              <p className="text-white leading-tight line-clamp-2" style={{ fontSize: "10px" }}>
                <span className="font-semibold mr-1">{AUTHOR.handle}</span>
                {caption || "Your caption will appear here..."}
              </p>
            </div>
            {/* Home bar */}
            <div className="flex justify-center pb-3">
              <div className="w-24 h-1 bg-gray-600 rounded-full" />
            </div>
          </div>
        </div>

        <button
          onClick={nextSlide}
          disabled={previewIndex === slides.length - 1}
          type="button"
          className="p-1.5 rounded-full bg-dark-panel2 border border-dark-border text-dark-muted hover:text-dark-text transition-colors disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function LinkedInFeedPreview({
  slides,
  slideImages,
  imageMode,
  panoramicImage,
  sameImage,
  palette,
  customPalette,
  caption,
}: CarouselPreviewProps) {
  const [previewIndex, setPreviewIndex] = useState(0);

  const prevSlide = () => setPreviewIndex((i) => Math.max(0, i - 1));
  const nextSlide = () => setPreviewIndex((i) => Math.min(slides.length - 1, i + 1));

  const currentSlide = slides[previewIndex];
  const currentImage =
    imageMode === "panoramic" ? undefined :
    imageMode === "same" ? (sameImage ?? undefined) :
    slideImages[previewIndex];
  const panImage = imageMode === "panoramic" ? (panoramicImage ?? undefined) : undefined;

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs text-dark-muted font-medium">LinkedIn</p>
      <div className="flex items-center gap-3">
        <button
          onClick={prevSlide}
          disabled={previewIndex === 0}
          type="button"
          className="p-1.5 rounded-full bg-dark-panel2 border border-dark-border text-dark-muted hover:text-dark-text transition-colors disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* LinkedIn card */}
        <div className="rounded-lg overflow-hidden shadow-md" style={{ width: 320, background: "#f3f2ef" }}>
          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-3 bg-white">
            <img src={AUTHOR.avatar} alt={AUTHOR.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 font-semibold text-sm leading-tight">{AUTHOR.name}</p>
              <p className="text-gray-500 text-xs leading-tight truncate">{AUTHOR.bio} • 1st</p>
            </div>
            <button
              type="button"
              className="text-blue-600 border border-blue-600 rounded-full px-3 py-1 text-xs font-medium flex-shrink-0"
            >
              Connect
            </button>
          </div>
          {/* Caption */}
          <div className="bg-white px-4 py-2 border-t border-gray-100">
            <p className="text-sm text-gray-700 line-clamp-2">
              {caption || "Your caption will appear here..."}
            </p>
          </div>
          {/* Document card */}
          <div className="bg-white border-t border-gray-100">
            {/* Slide area */}
            <div className="relative overflow-hidden" style={{ aspectRatio: "1/1" }}>
              <SlidePreview
                slide={currentSlide}
                image={currentImage}
                palette={palette}
                customPalette={customPalette}
                platform="LinkedIn"
                index={previewIndex + 1}
                total={slides.length}
                size={320}
                panoramicImage={panImage}
                panoramicIndex={previewIndex}
                panoramicTotal={slides.length}
              />
              {/* Page indicator */}
              <div className="absolute bottom-2 left-2 bg-white rounded-full px-2 py-0.5 text-gray-700 text-xs font-medium shadow">
                {previewIndex + 1} / {slides.length}
              </div>
            </div>
            {/* Document title bar */}
            <div className="px-3 py-2 flex items-center justify-between" style={{ background: "#f3f2ef" }}>
              <div>
                <p className="text-gray-800 text-xs font-medium">Carousel</p>
                <p className="text-gray-500 text-xs">PDF Document</p>
              </div>
              <Download className="w-4 h-4 text-gray-500" />
            </div>
          </div>
          {/* Reactions row */}
          <div className="bg-white px-4 py-2 flex items-center gap-4 text-gray-600 text-xs border-t border-gray-100">
            <span>👍 Like</span>
            <span>Comment</span>
            <span>Repost</span>
            <span>Send</span>
          </div>
        </div>

        <button
          onClick={nextSlide}
          disabled={previewIndex === slides.length - 1}
          type="button"
          className="p-1.5 rounded-full bg-dark-panel2 border border-dark-border text-dark-muted hover:text-dark-text transition-colors disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function CarouselPreview(props: CarouselPreviewProps) {
  const isLinkedIn = props.platform?.toLowerCase() === "linkedin";

  if (isLinkedIn) {
    // Show both side by side
    return (
      <div className="overflow-x-auto">
        <div className="flex gap-8 justify-center min-w-max px-4 py-2">
          <InstagramPhonePreview {...props} />
          <LinkedInFeedPreview {...props} />
        </div>
      </div>
    );
  }

  return <InstagramPhonePreview {...props} />;
}

// ── Main Component ─────────────────────────────────────────────────────

export default function CarouselBuilderPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM);
  const [result, setResult] = useState<CarouselResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Step 5 state (lifted so it persists if user navigates back)
  const [slideImages, setSlideImages] = useState<Record<number, SlideImage>>({});
  const [imageSource, setImageSource] = useState<ImageSourceId>("pexels");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [exportedCarousel, setExportedCarousel] = useState<ExportedCarousel | null>(null);

  // Image mode state (lifted)
  const [imageMode, setImageMode] = useState<"unique" | "panoramic" | "same">("unique");
  const [panoramicImage, setPanoramicImage] = useState<SlideImage | null>(null);
  const [sameImage, setSameImage] = useState<SlideImage | null>(null);

  const update = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateCustomPalette = useCallback((custom?: CustomPalette) => {
    setFormData((prev) => ({ ...prev, customPalette: custom }));
  }, []);

  const updateSlide = useCallback((index: number, field: keyof Slide, value: string | string[]) => {
    setResult((prev) => {
      if (!prev) return prev;
      const slides = [...prev.slides];
      slides[index] = { ...slides[index], [field]: value };
      return { ...prev, slides };
    });
  }, []);

  const copyText = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  }, []);

  const generateCarousel = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setExportedCarousel(null);
    setSlideImages({});
    try {
      const res = await fetch("/api/carousel-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: formData.mode,
          recreateUrl: formData.recreateUrl,
          product: formData.productDescription,
          pricePoint: formData.pricePoint,
          cta: formData.desiredCta,
          slideCount: formData.slideCount,
          audience: formData.targetAudience,
          painPoints: formData.painPoints,
          transformation: formData.desiredTransformation,
          framework: formData.framework.toLowerCase(),
          tone: formData.tone.toLowerCase(),
          platform: formData.platform.toLowerCase(),
          palette: formData.palette,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const output = data.slides;
      const flatSlides: Slide[] = [
        { type: "cover", heading: output.title, body: output.subtitle },
        ...output.slides.map((s: { heading: string; body: string; bullets?: string[] | null }) => ({
          type: "content" as const,
          heading: s.heading,
          body: s.body,
          bullets: s.bullets ?? undefined,
        })),
        { type: "cta", heading: output.cta.heading, body: output.cta.body },
      ];
      setResult({ slides: flatSlides });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }, [formData]);

  const handleNext = useCallback(() => {
    const next = currentStep + 1;
    if (next === 4) generateCarousel();
    setCurrentStep(next);
  }, [currentStep, generateCarousel]);

  const handleBack = useCallback(() => {
    setCurrentStep((s) => s - 1);
  }, []);

  const canAdvance =
    currentStep === 1
      ? formData.productDescription.trim().length > 0
      : currentStep === 2
      ? formData.targetAudience.trim().length > 0
      : currentStep === 3
      ? formData.framework.length > 0 && formData.tone.length > 0
      : currentStep === 4
      ? result !== null && !loading
      : false;

  const allSlidesText = result
    ? result.slides
        .map((s) =>
          [s.heading, s.body, ...(s.bullets ?? []).map((b) => `• ${b}`)].filter(Boolean).join("\n")
        )
        .join("\n\n---\n\n")
    : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="bg-cm-purple/15 rounded-lg p-3">
            <LayoutTemplate className="w-6 h-6 text-cm-purple" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-dark-text">Carousel Builder</h1>
            <p className="text-dark-muted text-sm mt-0.5">
              Build high-converting Instagram and LinkedIn carousels in minutes
            </p>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-3">
        <div className="flex items-start justify-between relative">
          <div className="absolute top-2.5 left-0 right-0 h-px bg-dark-border mx-6" />
          {STEP_LABELS.map((label, i) => (
            <StepDot
              key={label}
              step={i + 1}
              current={currentStep}
              label={label}
              onClick={(s) => { if (s < currentStep) setCurrentStep(s); }}
            />
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6 space-y-6">
        {currentStep === 1 && <Step1 formData={formData} update={update} />}
        {currentStep === 2 && <Step2 formData={formData} update={update} />}
        {currentStep === 3 && <Step3 formData={formData} update={update} updateCustomPalette={updateCustomPalette} />}
        {currentStep === 4 && (
          <Step4
            result={result}
            loading={loading}
            error={error}
            formData={formData}
            allSlidesText={allSlidesText}
            copiedKey={copiedKey}
            onCopy={copyText}
            onRegenerate={generateCarousel}
            onUpdateSlide={updateSlide}
          />
        )}
        {currentStep === 5 && result && (
          <Step5
            slides={result.slides}
            slideImages={slideImages}
            onSlideImagesChange={setSlideImages}
            imageSource={imageSource}
            onImageSourceChange={setImageSource}
            templates={templates}
            onTemplatesChange={setTemplates}
            platform={formData.platform}
            palette={formData.palette}
            customPalette={formData.customPalette}
            productTitle={formData.productDescription.slice(0, 60)}
            exportedCarousel={exportedCarousel}
            onExported={setExportedCarousel}
            imageMode={imageMode}
            setImageMode={setImageMode}
            panoramicImage={panoramicImage}
            setPanoramicImage={setPanoramicImage}
            sameImage={sameImage}
            setSameImage={setSameImage}
          />
        )}
        {currentStep === 5 && !result && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertCircle className="w-8 h-8 text-dark-warn" />
            <p className="text-dark-muted text-sm">Go back to step 4 and generate your text first.</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      {currentStep < 5 && (
        <div className="flex justify-between items-center">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="px-5 py-2.5 rounded-lg border border-dark-border bg-dark-panel2 text-dark-muted hover:text-dark-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            type="button"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={!canAdvance}
            className="px-6 py-2.5 rounded-lg bg-cm-purple text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cm-purple/90 transition-colors"
            type="button"
          >
            {currentStep === 3 ? "Generate Text" : currentStep === 4 ? "Generate Images" : "Next"}
          </button>
        </div>
      )}
      {currentStep === 5 && (
        <div className="flex justify-start">
          <button
            onClick={handleBack}
            className="px-5 py-2.5 rounded-lg border border-dark-border bg-dark-panel2 text-dark-muted hover:text-dark-text transition-colors text-sm font-medium"
            type="button"
          >
            Back to Text
          </button>
        </div>
      )}
    </div>
  );
}

// ── Step 1 ────────────────────────────────────────────────────────────

interface StepProps {
  formData: FormData;
  update: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}

function Step1({ formData, update }: StepProps) {
  const [selectedProject, setSelectedProject] = useState("masterminds");
  const [selectedIcp, setSelectedIcp] = useState("mm-founder");

  const projectOptions = Object.entries(PROJECT_ICPS);
  const icpOptions = selectedProject ? PROJECT_ICPS[selectedProject]?.icps ?? [] : [];

  function applyIcp(projectId: string, icpId: string) {
    const proj = PROJECT_ICPS[projectId];
    if (!proj) return;
    const icp = proj.icps.find((i) => i.id === icpId);
    if (!icp) return;
    if (icp.product) update("productDescription", icp.product);
    update("targetAudience", icp.audience);
    update("painPoints", icp.painPoints);
    update("desiredTransformation", icp.transformation);
  }

  function handleProjectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedProject(e.target.value);
    setSelectedIcp("");
  }

  function handleIcpChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const icpId = e.target.value;
    setSelectedIcp(icpId);
    if (icpId && selectedProject) applyIcp(selectedProject, icpId);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-dark-text">What are you building?</h2>
        <p className="text-dark-muted text-sm mt-1">Tell us about your offer and goals</p>
      </div>

      {/* ICP Preloader */}
      <div className="bg-dark-panel2 border border-dark-border rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-dark-muted">Quick start: load from a project ICP</p>
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <select
              value={selectedProject}
              onChange={handleProjectChange}
              className="w-full bg-dark-panel border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm focus:outline-none focus:border-cm-purple transition-colors"
            >
              <option value="">Select project...</option>
              {projectOptions.map(([id, proj]) => (
                <option key={id} value={id}>{proj.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <select
              value={selectedIcp}
              onChange={handleIcpChange}
              disabled={!selectedProject}
              className="w-full bg-dark-panel border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm focus:outline-none focus:border-cm-purple transition-colors disabled:opacity-40"
            >
              <option value="">Select ICP...</option>
              {icpOptions.map((icp) => (
                <option key={icp.id} value={icp.id}>{icp.label}</option>
              ))}
            </select>
          </div>
        </div>
        {selectedIcp && (
          <p className="text-xs text-dark-success">ICP loaded. All fields pre-filled — edit as needed.</p>
        )}
      </div>

      {/* Mode toggle */}
      <div>
        <label className="block text-sm font-medium text-dark-muted mb-2">Mode</label>
        <div className="flex gap-2">
          {(["create", "recreate"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => update("mode", mode)}
              type="button"
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                formData.mode === mode
                  ? "bg-cm-purple/10 border-cm-purple text-cm-purple"
                  : "bg-dark-panel2 border-dark-border text-dark-muted hover:text-dark-text"
              }`}
            >
              {mode === "create" ? "Create New" : "Recreate Viral"}
            </button>
          ))}
        </div>
      </div>

      {formData.mode === "recreate" && (
        <div>
          <label className="block text-sm font-medium text-dark-muted mb-2">Viral post URL to recreate</label>
          <input
            type="url"
            value={formData.recreateUrl}
            onChange={(e) => update("recreateUrl", e.target.value)}
            placeholder="https://www.instagram.com/p/..."
            className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-4 py-2.5 text-dark-text placeholder:text-dark-muted text-sm focus:outline-none focus:border-cm-purple transition-colors"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-dark-muted mb-2">
          What are you selling? <span className="text-dark-danger">*</span>
        </label>
        <textarea
          value={formData.productDescription}
          onChange={(e) => update("productDescription", e.target.value)}
          placeholder="e.g. A 6-week group coaching program for female entrepreneurs who want to scale to $10k months without burning out..."
          rows={4}
          className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-4 py-2.5 text-dark-text placeholder:text-dark-muted text-sm focus:outline-none focus:border-cm-purple transition-colors resize-y"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-dark-muted mb-2">Price Point</label>
        <div className="flex gap-3 flex-wrap">
          {PRICE_POINTS.map((pp) => (
            <button
              key={pp.id}
              onClick={() => update("pricePoint", pp.id)}
              type="button"
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                formData.pricePoint === pp.id
                  ? "bg-cm-purple/10 border-cm-purple text-cm-purple"
                  : "bg-dark-panel2 border-dark-border text-dark-muted hover:text-dark-text"
              }`}
            >
              {pp.label} <span className="opacity-70 text-xs">({pp.range})</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-dark-muted mb-2">Desired CTA</label>
        <input
          type="text"
          value={formData.desiredCta}
          onChange={(e) => update("desiredCta", e.target.value)}
          placeholder="e.g. Join the Mastermind"
          className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-4 py-2.5 text-dark-text placeholder:text-dark-muted text-sm focus:outline-none focus:border-cm-purple transition-colors"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-dark-muted">Number of Slides</label>
          <span className="text-cm-purple font-bold text-lg">{formData.slideCount}</span>
        </div>
        <input
          type="range"
          min={5}
          max={15}
          value={formData.slideCount}
          onChange={(e) => update("slideCount", parseInt(e.target.value))}
          style={{ accentColor: "#7C69C7" }}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-dark-muted mt-1">
          <span>5</span>
          <span>15</span>
        </div>
      </div>
    </div>
  );
}

// ── Step 2 ────────────────────────────────────────────────────────────

function Step2({ formData, update }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-dark-text">Who is this for?</h2>
        <p className="text-dark-muted text-sm mt-1">Define your ideal reader so every slide speaks directly to them</p>
      </div>

      {[
        { key: "targetAudience", label: "Target Audience", placeholder: "e.g. Female coaches selling $500+ programs online", required: true },
        { key: "painPoints", label: "Their Pain Points", placeholder: "e.g. They feel overwhelmed creating content that actually converts" },
        { key: "desiredTransformation", label: "Desired Transformation", placeholder: "e.g. They want a proven system that sells on autopilot" },
      ].map(({ key, label, placeholder, required }) => (
        <div key={key}>
          <label className="block text-sm font-medium text-dark-muted mb-2">
            {label} {required && <span className="text-dark-danger">*</span>}
          </label>
          <textarea
            value={formData[key as keyof FormData] as string}
            onChange={(e) => update(key as keyof FormData, e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-4 py-2.5 text-dark-text placeholder:text-dark-muted text-sm focus:outline-none focus:border-cm-purple transition-colors resize-y"
          />
        </div>
      ))}
    </div>
  );
}

// ── Step 3 ────────────────────────────────────────────────────────────

interface Step3Props extends StepProps {
  updateCustomPalette: (custom?: CustomPalette) => void;
}

function Step3({ formData, update, updateCustomPalette }: Step3Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-dark-text">Your style</h2>
        <p className="text-dark-muted text-sm mt-1">Choose how your carousel is structured and sounds</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-dark-muted mb-3">
          Framework <span className="text-dark-danger">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {FRAMEWORKS.map((fw) => (
            <button
              key={fw.id}
              onClick={() => update("framework", fw.id)}
              type="button"
              className={`p-3 rounded-xl border text-left transition-colors ${
                formData.framework === fw.id
                  ? "bg-cm-purple/10 border-cm-purple"
                  : "bg-dark-panel2 border-dark-border hover:border-dark-text"
              }`}
            >
              <div className={`font-bold text-sm mb-0.5 ${formData.framework === fw.id ? "text-cm-purple" : "text-dark-text"}`}>
                {fw.label}
              </div>
              <div className="text-dark-muted text-xs">{fw.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-dark-muted mb-3">
          Tone <span className="text-dark-danger">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {TONES.map((tone) => (
            <button
              key={tone}
              onClick={() => update("tone", tone)}
              type="button"
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                formData.tone === tone
                  ? "bg-cm-purple/10 border-cm-purple text-cm-purple"
                  : "bg-dark-panel2 border-dark-border text-dark-muted hover:text-dark-text"
              }`}
            >
              {tone}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-dark-muted mb-3">Platform</label>
        <div className="flex gap-3">
          {(["Instagram", "LinkedIn"] as const).map((p) => (
            <button
              key={p}
              onClick={() => update("platform", p)}
              type="button"
              className={`px-5 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                formData.platform === p
                  ? "bg-cm-purple/10 border-cm-purple text-cm-purple"
                  : "bg-dark-panel2 border-dark-border text-dark-muted hover:text-dark-text"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-dark-muted mb-3">Theme</label>
        <ThemePicker
          palette={formData.palette}
          customPalette={formData.customPalette}
          onChange={(id, custom) => {
            update("palette", id);
            updateCustomPalette(custom);
          }}
        />
      </div>
    </div>
  );
}

// ── Step 4 ────────────────────────────────────────────────────────────

interface Step4Props {
  result: CarouselResult | null;
  loading: boolean;
  error: string | null;
  formData: FormData;
  allSlidesText: string;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
  onRegenerate: () => void;
  onUpdateSlide: (index: number, field: keyof Slide, value: string | string[]) => void;
}

function Step4({ result, loading, error, allSlidesText, copiedKey, onCopy, onRegenerate, onUpdateSlide }: Step4Props) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 text-cm-purple animate-spin" />
        <p className="text-dark-muted text-sm">Generating your carousel slides...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="bg-dark-danger/10 border border-dark-danger/30 rounded-xl p-4 flex items-start gap-3 max-w-md w-full">
          <AlertCircle className="w-5 h-5 text-dark-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-dark-text font-medium text-sm">Generation failed</p>
            <p className="text-dark-muted text-xs mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={onRegenerate}
          type="button"
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cm-purple text-white text-sm font-semibold hover:bg-cm-purple/90 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <LayoutTemplate className="w-10 h-10 text-dark-muted" />
        <p className="text-dark-muted text-sm">Your carousel will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-dark-text">Edit your slides</h2>
          <p className="text-dark-muted text-sm mt-0.5">
            {result.slides.length} slides — click any text to edit
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onCopy(allSlidesText, "all")}
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-panel2 border border-dark-border text-dark-muted hover:text-dark-text text-sm font-medium transition-colors"
          >
            {copiedKey === "all" ? <Check className="w-4 h-4 text-dark-success" /> : <Copy className="w-4 h-4" />}
            Copy All
          </button>
          <button
            onClick={onRegenerate}
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cm-purple text-white text-sm font-semibold hover:bg-cm-purple/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Regenerate
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {result.slides.map((slide, i) => (
          <EditableSlideCard
            key={i}
            slide={slide}
            index={i + 1}
            copiedKey={copiedKey}
            onCopy={(text) => onCopy(text, `slide-${i}`)}
            onUpdate={(field, value) => onUpdateSlide(i, field, value)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Step 5 ────────────────────────────────────────────────────────────

type ImageSourceId = "pexels" | "unsplash" | "web" | "huggingface";

interface Step5Props {
  slides: Slide[];
  slideImages: Record<number, SlideImage>;
  onSlideImagesChange: (images: Record<number, SlideImage>) => void;
  imageSource: ImageSourceId;
  onImageSourceChange: (s: ImageSourceId) => void;
  templates: Template[];
  onTemplatesChange: (t: Template[]) => void;
  platform: string;
  palette: string;
  customPalette?: CustomPalette;
  productTitle: string;
  exportedCarousel: ExportedCarousel | null;
  onExported: (c: ExportedCarousel) => void;
  imageMode: "unique" | "panoramic" | "same";
  setImageMode: (v: "unique" | "panoramic" | "same") => void;
  panoramicImage: SlideImage | null;
  setPanoramicImage: (v: SlideImage | null) => void;
  sameImage: SlideImage | null;
  setSameImage: (v: SlideImage | null) => void;
}

function Step5({
  slides,
  slideImages,
  onSlideImagesChange,
  imageSource,
  onImageSourceChange,
  templates,
  onTemplatesChange,
  platform,
  palette,
  customPalette,
  productTitle,
  exportedCarousel,
  onExported,
  imageMode,
  setImageMode,
  panoramicImage,
  setPanoramicImage,
  sameImage,
  setSameImage,
}: Step5Props) {
  const [searching, setSearching] = useState<Record<number, boolean>>({});
  const [searchResults, setSearchResults] = useState<Record<number, PexelsPhoto[]>>({});
  const [selectedSlide, setSelectedSlide] = useState<number | null>(null);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [autoGenerateProgress, setAutoGenerateProgress] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("#businessautomation #mastermind #entrepreneurship");
  const [posting, setPosting] = useState<Record<string, boolean>>({});
  const [postResults, setPostResults] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [showPreview, setShowPreview] = useState(true);

  // Panoramic / Same search state
  const [panoramicQuery, setPanoramicQuery] = useState("");
  const [panoramicSearching, setPanoramicSearching] = useState(false);
  const [panoramicResults, setPanoramicResults] = useState<PexelsPhoto[]>([]);
  const [sameQuery, setSameQuery] = useState("");
  const [sameSearching, setSameSearching] = useState(false);
  const [sameResults, setSameResults] = useState<PexelsPhoto[]>([]);

  // Template upload inline form state
  const [pendingUpload, setPendingUpload] = useState<{
    file: File;
    previewUrl: string;
    name: string;
    saveAsTemplate: boolean;
    forSlide?: number;
  } | null>(null);

  // Load templates on mount
  useEffect(() => {
    fetch("/api/carousel-builder/templates")
      .then((r) => r.json())
      .then((d) => onTemplatesChange(d.templates || []))
      .catch(() => {});
  }, [onTemplatesChange]);

  const orientation = platform?.toLowerCase() === "linkedin" ? "portrait" : "square";

  function buildSearchQuery(slide: Slide): string {
    const words = slide.heading.split(" ").slice(0, 4).join(" ");
    return `${words} business professional`;
  }

  function buildImgUrl(q: string, extraParams: Record<string, string> = {}) {
    const src = imageSource === "huggingface" ? "huggingface" : imageSource;
    const params = new URLSearchParams({ q, source: src, ...extraParams });
    return `/api/carousel-builder/images?${params}`;
  }

  async function searchForSlide(index: number) {
    setSearching((p) => ({ ...p, [index]: true }));
    try {
      const q = buildSearchQuery(slides[index]);
      const isAI = imageSource === "huggingface";
      const url = buildImgUrl(q, isAI ? { generate: "true" } : { count: "6", orientation });
      const res = await fetch(url, { signal: AbortSignal.timeout(65000) });
      const data = await res.json();
      setSearchResults((p) => ({ ...p, [index]: data.photos || [] }));
      setSelectedSlide(index);
    } catch {
      // silently fail
    } finally {
      setSearching((p) => ({ ...p, [index]: false }));
    }
  }

  async function searchPanoramic() {
    if (!panoramicQuery.trim()) return;
    setPanoramicSearching(true);
    try {
      const res = await fetch(
        `/api/carousel-builder/images?q=${encodeURIComponent(panoramicQuery)}&count=6&mode=panoramic&source=${imageSource}`
      );
      const data = await res.json();
      setPanoramicResults(data.photos || []);
    } catch {
      // silently fail
    } finally {
      setPanoramicSearching(false);
    }
  }

  async function generateAIPanoramic() {
    if (!panoramicQuery.trim()) return;
    setPanoramicSearching(true);
    try {
      const prompt = `${panoramicQuery}, ultra-wide panoramic landscape photography, high resolution, cinematic`;
      const res = await fetch(
        `/api/carousel-builder/images?q=${encodeURIComponent(prompt)}&source=huggingface&generate=true`,
        { signal: AbortSignal.timeout(65000) }
      );
      const data = await res.json();
      if (data.photos?.[0]) {
        setPanoramicImage({ url: data.photos[0].url, photographer: "AI Generated (FLUX)" });
      }
      setPanoramicResults(data.photos || []);
    } catch {
      // silently fail
    } finally {
      setPanoramicSearching(false);
    }
  }

  async function autoGenerateAll() {
    setAutoGenerating(true);
    setAutoGenerateProgress(0);
    const newImages: Record<number, SlideImage> = { ...slideImages };
    for (let i = 0; i < slides.length; i++) {
      setAutoGenerateProgress(i + 1);
      try {
        const q = buildSearchQuery(slides[i]);
        const isAI = imageSource === "huggingface";
        const url = buildImgUrl(q, isAI ? { generate: "true" } : { count: "3", orientation });
        const res = await fetch(url, { signal: AbortSignal.timeout(65000) });
        const data = await res.json();
        if (data.photos?.[0]) {
          newImages[i] = {
            url: data.photos[0].url,
            thumb: data.photos[0].thumb,
            photographer: data.photos[0].photographer,
            alt: data.photos[0].alt,
          };
        }
      } catch { /* skip */ }
    }
    onSlideImagesChange(newImages);
    setAutoGenerating(false);
    setAutoGenerateProgress(0);
  }

  async function searchSameImage() {
    if (!sameQuery.trim()) return;
    setSameSearching(true);
    try {
      const isAI = imageSource === "huggingface";
      const url = buildImgUrl(sameQuery, isAI ? { generate: "true" } : { count: "6", orientation });
      const res = await fetch(url, { signal: AbortSignal.timeout(65000) });
      const data = await res.json();
      setSameResults(data.photos || []);
    } catch { /* silently fail */ }
    finally { setSameSearching(false); }
  }

  function pickImage(index: number, photo: PexelsPhoto) {
    onSlideImagesChange({
      ...slideImages,
      [index]: {
        url: photo.url,
        thumb: photo.thumb,
        photographer: photo.photographer,
        alt: photo.alt,
      },
    });
    setSelectedSlide(null);
  }

  function useTemplate(index: number, template: Template) {
    onSlideImagesChange({
      ...slideImages,
      [index]: {
        url: template.url,
        isTemplate: true,
        templateId: template.id,
      },
    });
    setSelectedSlide(null);
  }

  function handleFileSelect(file: File, forSlide?: number) {
    const previewUrl = URL.createObjectURL(file);
    const name = file.name.replace(/\.[^.]+$/, "");
    setPendingUpload({ file, previewUrl, name, saveAsTemplate: true, forSlide });
  }

  async function confirmUpload() {
    if (!pendingUpload) return;
    const { file, name, saveAsTemplate, forSlide, previewUrl } = pendingUpload;

    // Assign image to slide if applicable
    if (forSlide !== undefined) {
      onSlideImagesChange({
        ...slideImages,
        [forSlide]: { url: previewUrl },
      });
      setSelectedSlide(null);
    }

    if (saveAsTemplate) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", name);
      try {
        const res = await fetch("/api/carousel-builder/templates", { method: "POST", body: fd });
        const data = await res.json();
        if (data.id) {
          const updated = [
            { id: data.id, filename: data.filename || name, url: data.url, createdAt: new Date().toISOString() },
            ...templates,
          ];
          onTemplatesChange(updated);
          // Update slide image to use the saved URL if we were assigning to slide
          if (forSlide !== undefined && data.url) {
            onSlideImagesChange({
              ...slideImages,
              [forSlide]: { url: data.url, isTemplate: true, templateId: data.id },
            });
          }
        }
      } catch { /* silently fail */ }
    }

    setPendingUpload(null);
  }

  async function deleteTemplate(id: string) {
    await fetch(`/api/carousel-builder/templates?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    onTemplatesChange(templates.filter((t) => t.id !== id));
  }

  async function exportCarousel() {
    setExporting(true);
    setExportError(null);
    try {
      const body: Record<string, unknown> = {
        title: productTitle || "Carousel",
        slides,
        platform,
        palette,
        ...(palette === "custom" && customPalette ? {
          customPalette: {
            overlay: [
              parseInt(customPalette.overlay.slice(1, 3), 16),
              parseInt(customPalette.overlay.slice(3, 5), 16),
              parseInt(customPalette.overlay.slice(5, 7), 16),
            ],
            alpha: customPalette.alpha,
            accent: customPalette.accent,
          }
        } : {}),
      };

      if (imageMode === "panoramic" && panoramicImage) {
        body.panoramic = true;
        body.panoramicImageUrl = panoramicImage.url;
      } else if (imageMode === "same" && sameImage) {
        // Apply same image to all slides
        const imagesMap: Record<string, { url: string }> = {};
        slides.forEach((_, i) => { imagesMap[String(i)] = { url: sameImage.url }; });
        body.slideImages = imagesMap;
      } else {
        const imagesMap: Record<string, { url: string; isTemplate?: boolean; templateId?: string }> = {};
        Object.entries(slideImages).forEach(([k, v]) => {
          imagesMap[k] = { url: v.url, isTemplate: v.isTemplate, templateId: v.templateId };
        });
        body.slideImages = imagesMap;
      }

      const res = await fetch("/api/carousel-builder/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Export failed");
      onExported(data);
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  async function publishTo(platform_: "linkedin" | "instagram") {
    if (!exportedCarousel) return;
    setPosting((p) => ({ ...p, [platform_]: true }));
    setPostResults((p) => ({ ...p, [platform_]: { ok: false, msg: "" } }));
    try {
      const body = caption + (hashtags ? `\n\n${hashtags}` : "");
      const res = await fetch("/api/carousel-builder/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carouselId: exportedCarousel.carouselId, platform: platform_, caption: body, title: productTitle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPostResults((p) => ({
        ...p,
        [platform_]: { ok: true, msg: data.postUrl || data.mediaId || "Posted!" },
      }));
    } catch (err: unknown) {
      setPostResults((p) => ({
        ...p,
        [platform_]: { ok: false, msg: err instanceof Error ? err.message : "Failed" },
      }));
    } finally {
      setPosting((p) => ({ ...p, [platform_]: false }));
    }
  }

  const coveredCount =
    imageMode === "panoramic" ? (panoramicImage ? slides.length : 0) :
    imageMode === "same" ? (sameImage ? slides.length : 0) :
    Object.keys(slideImages).length;

  return (
    <div className="space-y-8">
      {/* Export loading overlay */}
      {exporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-dark-panel border border-dark-border rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl min-w-[260px]">
            <Loader2 className="w-10 h-10 text-cm-purple animate-spin" />
            <p className="text-dark-text font-semibold text-lg">Generating PNGs...</p>
            <p className="text-dark-muted text-sm text-center">Compositing {slides.length} slides with sharp.<br />This usually takes 5-15 seconds.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-dark-text">Generate Images</h2>
          <p className="text-dark-muted text-sm mt-1">
            Pick a background for each slide, then export.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {/* Image source */}
          <select
            value={imageSource}
            onChange={(e) => onImageSourceChange(e.target.value as ImageSourceId)}
            className="bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm focus:outline-none focus:border-cm-purple"
          >
            {IMAGE_SOURCES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          {/* Mode toggle: Unique / Panoramic / Same */}
          <div className="flex rounded-lg overflow-hidden border border-dark-border">
            {(["unique", "panoramic", "same"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setImageMode(mode)}
                type="button"
                className={`px-3 py-2 text-xs font-medium transition-colors capitalize ${
                  imageMode === mode
                    ? "bg-cm-purple text-white"
                    : "bg-dark-panel2 text-dark-muted hover:text-dark-text"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          {imageMode === "unique" && (
            <button
              onClick={autoGenerateAll}
              disabled={autoGenerating}
              type="button"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cm-purple text-white text-sm font-semibold hover:bg-cm-purple/90 disabled:opacity-50 transition-colors"
            >
              {autoGenerating
                ? <><Loader2 className="w-4 h-4 animate-spin" />{autoGenerateProgress}/{slides.length}</>
                : <><Sparkles className="w-4 h-4" />Match Images to Slides</>
              }
            </button>
          )}
        </div>
      </div>

      {/* Templates section (at top for quick access) */}
      <div className="bg-dark-panel2 border border-dark-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-dark-text">Background Templates</p>
            <p className="text-xs text-dark-muted mt-0.5">Upload once, reuse across carousels</p>
          </div>
          <button
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleFileSelect(file, undefined);
              };
              input.click();
            }}
            type="button"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dark-border bg-dark-panel text-dark-muted hover:text-dark-text text-xs font-medium transition-colors"
          >
            <Upload className="w-3.5 h-3.5" /> Upload Background / Template
          </button>
        </div>
        {templates.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {templates.map((t) => (
              <div key={t.id} className="relative group">
                <img src={t.url} alt={t.filename} className="w-14 h-14 object-cover rounded-lg border border-dark-border" />
                <button
                  onClick={() => deleteTemplate(t.id)}
                  type="button"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-dark-danger text-white hidden group-hover:flex items-center justify-center"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export section (near top) */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-dark-text">Export Carousel</p>
            <p className="text-xs text-dark-muted mt-0.5">
              {coveredCount}/{slides.length} slides have images.
              {coveredCount < slides.length ? " Slides without images will use a solid color." : ""}
            </p>
          </div>
          <button
            onClick={exportCarousel}
            disabled={exporting}
            type="button"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cm-purple text-white font-semibold text-sm hover:bg-cm-purple/90 disabled:opacity-50 transition-colors"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export PNGs
          </button>
        </div>

        {exportError && (
          <div className="flex items-center gap-2 text-dark-danger text-sm bg-dark-danger/10 border border-dark-danger/30 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {exportError}
          </div>
        )}

        {exportedCarousel && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-dark-success text-sm bg-dark-success/10 border border-dark-success/30 rounded-lg p-3">
              <Check className="w-4 h-4 flex-shrink-0" />
              <div>
                <p className="font-medium">{exportedCarousel.pngs.length} PNGs saved</p>
                <p className="text-xs text-dark-muted font-mono mt-0.5">{exportedCarousel.folder}</p>
              </div>
            </div>

            {/* Preview strip */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {exportedCarousel.servePaths.map((src, i) => (
                <a
                  key={i}
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-dark-border hover:border-cm-purple transition-colors"
                >
                  <img src={src} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
                </a>
              ))}
            </div>

            {/* Publish section */}
            <div className="space-y-3 pt-2 border-t border-dark-border">
              <p className="text-sm font-medium text-dark-text">Publish</p>

              <div>
                <label className="block text-xs text-dark-muted mb-1">Caption</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write your post caption..."
                  rows={3}
                  className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text placeholder:text-dark-muted text-sm focus:outline-none focus:border-cm-purple resize-y"
                />
              </div>

              <div>
                <label className="block text-xs text-dark-muted mb-1">Hashtags</label>
                <input
                  type="text"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm focus:outline-none focus:border-cm-purple"
                />
              </div>

              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => publishTo("linkedin")}
                  disabled={posting.linkedin || !caption}
                  type="button"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {posting.linkedin ? <Loader2 className="w-4 h-4 animate-spin" /> : <Linkedin className="w-4 h-4" />}
                  Post to LinkedIn
                </button>
                <button
                  onClick={() => publishTo("instagram")}
                  disabled={posting.instagram || !caption}
                  type="button"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-pink-600 text-white font-semibold text-sm hover:bg-pink-700 disabled:opacity-50 transition-colors"
                >
                  {posting.instagram ? <Loader2 className="w-4 h-4 animate-spin" /> : <Instagram className="w-4 h-4" />}
                  Post to Instagram
                </button>
              </div>

              {Object.entries(postResults).map(([plt, res]) => (
                <div
                  key={plt}
                  className={`flex items-start gap-2 text-sm rounded-lg p-3 border ${
                    res.ok
                      ? "text-dark-success bg-dark-success/10 border-dark-success/30"
                      : "text-dark-danger bg-dark-danger/10 border-dark-danger/30"
                  }`}
                >
                  {res.ok ? <Check className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                  <span className="capitalize font-medium mr-1">{plt}:</span>
                  <span className="text-xs break-all">{res.msg}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Carousel Preview (Instagram/LinkedIn phone mockup) */}
      <div className="bg-dark-panel2 border border-dark-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
          <p className="text-sm font-medium text-dark-text">Preview</p>
          <button
            onClick={() => setShowPreview((v) => !v)}
            type="button"
            className="text-xs text-dark-muted hover:text-dark-text transition-colors"
          >
            {showPreview ? "Hide Preview" : "Show Preview"}
          </button>
        </div>
        {showPreview && slides.length > 0 && (
          <div className="p-4">
            <CarouselPreview
              slides={slides}
              slideImages={slideImages}
              imageMode={imageMode}
              panoramicImage={panoramicImage}
              sameImage={sameImage}
              palette={palette}
              customPalette={customPalette}
              platform={platform}
              caption={caption}
            />
          </div>
        )}
      </div>

      {/* Panoramic mode UI */}
      {imageMode === "panoramic" && (
        <div className="bg-dark-panel2 border border-dark-border rounded-xl p-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-dark-text mb-1">Panoramic Image</p>
            <p className="text-xs text-dark-muted">One wide image panned smoothly across all {slides.length} slides</p>
          </div>

          {/* Slide content list (always visible in panoramic mode) */}
          <div className="space-y-1.5">
            <p className="text-xs text-dark-muted font-medium">Your slides (text will overlay the panoramic image):</p>
            {slides.map((slide, i) => (
              <div key={i} className="flex items-center gap-3 bg-dark-panel border border-dark-border rounded-lg px-3 py-2">
                <span className="text-xs font-mono text-dark-muted bg-dark-panel2 px-1.5 py-0.5 rounded flex-shrink-0">
                  {slide.type === "cover" ? "Cover" : slide.type === "cta" ? "CTA" : i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-dark-text text-xs font-medium truncate">{slide.heading}</p>
                  {slide.body && <p className="text-dark-muted text-xs truncate">{slide.body.slice(0, 60)}</p>}
                </div>
              </div>
            ))}
          </div>

          {/* Search + AI generate */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={panoramicQuery}
                onChange={(e) => setPanoramicQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") searchPanoramic(); }}
                placeholder="e.g. mountain landscape, city skyline, ocean..."
                className="flex-1 bg-dark-panel border border-dark-border rounded-lg px-3 py-2 text-dark-text placeholder:text-dark-muted text-sm focus:outline-none focus:border-cm-purple"
              />
              <button
                onClick={searchPanoramic}
                disabled={panoramicSearching}
                type="button"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-panel border border-dark-border text-dark-muted hover:text-dark-text text-sm font-medium hover:border-cm-purple disabled:opacity-50 transition-colors"
              >
                {panoramicSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Search
              </button>
              <button
                onClick={generateAIPanoramic}
                disabled={panoramicSearching || !panoramicQuery.trim()}
                type="button"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cm-purple text-white text-sm font-semibold hover:bg-cm-purple/90 disabled:opacity-50 transition-colors"
                title="Generate with FLUX AI (free, ~30s)"
              >
                {panoramicSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate AI
              </button>
            </div>
            <p className="text-xs text-dark-muted">
              Search finds real photos (Pexels). Generate AI creates a wide image with FLUX (free, ~30s).
            </p>
          </div>

          {/* Panoramic search results */}
          {panoramicResults.length > 0 && (
            <div>
              <p className="text-xs text-dark-muted mb-2">Click to use as panoramic image</p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {panoramicResults.map((photo, pi) => (
                  <button
                    key={pi}
                    onClick={() => setPanoramicImage({ url: photo.url, photographer: photo.photographer })}
                    type="button"
                    className={`relative rounded-lg overflow-hidden aspect-video group border-2 transition-all ${
                      panoramicImage?.url === photo.url ? "border-cm-purple" : "border-transparent hover:border-cm-purple"
                    }`}
                  >
                    <img
                      src={photo.thumb || photo.url}
                      alt={photo.alt || "panoramic photo"}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected panoramic image + strip preview */}
          {panoramicImage && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-dark-panel border border-cm-purple/40 rounded-lg p-3">
                {!panoramicImage.url.startsWith("data:") && (
                  <img src={panoramicImage.url} alt="panoramic" className="w-24 h-14 object-cover rounded flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-dark-text">Panoramic image selected</p>
                  {panoramicImage.photographer && (
                    <p className="text-xs text-dark-muted mt-0.5">By {panoramicImage.photographer}</p>
                  )}
                  <p className="text-xs text-dark-muted mt-1">Sliced across all {slides.length} slides</p>
                </div>
                <button onClick={() => setPanoramicImage(null)} type="button" className="p-1 rounded text-dark-muted hover:text-dark-danger transition-colors flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <p className="text-xs text-dark-muted mb-2">Strip preview</p>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {slides.map((slide, i) => (
                    <div key={i} className="flex-shrink-0">
                      <SlidePreview
                        slide={slide}
                        image={undefined}
                        palette={palette}
                        customPalette={customPalette}
                        platform={platform}
                        index={i + 1}
                        total={slides.length}
                        size={120}
                        panoramicImage={panoramicImage}
                        panoramicIndex={i}
                        panoramicTotal={slides.length}
                      />
                      <p className="text-center mt-1 text-dark-muted" style={{ fontSize: "9px" }}>{i + 1}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Same image mode UI */}
      {imageMode === "same" && (
        <div className="bg-dark-panel2 border border-dark-border rounded-xl p-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-dark-text mb-1">Same Image for All Slides</p>
            <p className="text-xs text-dark-muted">One image applied to every slide as the background</p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={sameQuery}
              onChange={(e) => setSameQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") searchSameImage(); }}
              placeholder="Search Pexels for a background..."
              className="flex-1 bg-dark-panel border border-dark-border rounded-lg px-3 py-2 text-dark-text placeholder:text-dark-muted text-sm focus:outline-none focus:border-cm-purple"
            />
            <button
              onClick={searchSameImage}
              disabled={sameSearching}
              type="button"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cm-purple text-white text-sm font-semibold hover:bg-cm-purple/90 disabled:opacity-50 transition-colors"
            >
              {sameSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </button>
          </div>
          {sameResults.length > 0 && (
            <div>
              <p className="text-xs text-dark-muted mb-2">Click to use as background for all slides</p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {sameResults.map((photo, pi) => (
                  <button
                    key={pi}
                    onClick={() => setSameImage({ url: photo.url, thumb: photo.thumb, photographer: photo.photographer })}
                    type="button"
                    className={`relative rounded-lg overflow-hidden aspect-square group border-2 transition-all ${
                      sameImage?.url === photo.url ? "border-cm-purple" : "border-transparent hover:border-cm-purple"
                    }`}
                  >
                    <img src={photo.thumb || photo.url} alt={photo.alt || "photo"} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {sameImage && (
            <div className="flex items-start gap-3 bg-dark-panel border border-dark-border rounded-lg p-3">
              <img src={sameImage.thumb || sameImage.url} alt="same" className="w-16 h-16 object-cover rounded flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-dark-text">Selected for all slides</p>
                {sameImage.photographer && (
                  <p className="text-xs text-dark-muted mt-0.5">Photo by {sameImage.photographer}</p>
                )}
              </div>
              <button onClick={() => setSameImage(null)} type="button" className="p-1 rounded text-dark-muted hover:text-dark-danger transition-colors flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Unique mode: Slide grid */}
      {imageMode === "unique" && (
        <div className="space-y-3">
          {slides.map((slide, i) => {
            const img = slideImages[i];
            const isSearching = searching[i];
            const isOpen = selectedSlide === i;
            const results = searchResults[i] || [];

            return (
              <div key={i} className="bg-dark-panel2 border border-dark-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  {/* Mini preview */}
                  <SlidePreview
                    slide={slide}
                    image={img}
                    palette={palette}
                    customPalette={customPalette}
                    platform={platform}
                    index={i + 1}
                    total={slides.length}
                    size={80}
                  />

                  {/* Slide info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-dark-muted bg-dark-panel border border-dark-border px-2 py-0.5 rounded-full uppercase">
                        {slide.type === "cover" ? "Cover" : slide.type === "cta" ? "CTA" : `Slide ${i + 1}`}
                      </span>
                      {img && <span className="text-xs text-dark-success">Image set</span>}
                    </div>
                    <p className="text-dark-text font-medium text-sm truncate">{slide.heading}</p>
                    {img?.photographer && (
                      <p className="text-dark-muted text-xs mt-0.5">Photo by {img.photographer}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setSelectedSlide(isOpen ? null : i)}
                      type="button"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dark-border bg-dark-panel text-dark-muted hover:text-dark-text text-xs font-medium transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {isOpen ? "Close" : "Browse"}
                    </button>
                    <button
                      onClick={() => searchForSlide(i)}
                      disabled={isSearching}
                      type="button"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dark-border bg-dark-panel text-dark-muted hover:text-dark-text text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      Find Image
                    </button>
                  </div>
                </div>

                {/* Image picker (when open) */}
                {isOpen && (
                  <div className="border-t border-dark-border p-4 space-y-4">
                    {/* Pexels results */}
                    {results.length > 0 && (
                      <div>
                        <p className="text-xs text-dark-muted mb-2">Pexels results — click to use</p>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                          {results.map((photo, pi) => (
                            <button
                              key={pi}
                              onClick={() => pickImage(i, photo)}
                              type="button"
                              className="relative rounded-lg overflow-hidden aspect-square group border-2 border-transparent hover:border-cm-purple transition-all"
                            >
                              <img
                                src={photo.thumb || photo.url}
                                alt={photo.alt || "photo"}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Templates */}
                    {templates.length > 0 && (
                      <div>
                        <p className="text-xs text-dark-muted mb-2">Your templates</p>
                        <div className="flex gap-2 flex-wrap">
                          {templates.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => useTemplate(i, t)}
                              type="button"
                              className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-transparent hover:border-cm-purple transition-all group"
                            >
                              <img src={t.url} alt={t.filename} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Upload for this slide */}
                    <div>
                      <button
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = "image/*";
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) handleFileSelect(file, i);
                          };
                          input.click();
                        }}
                        type="button"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dark-border bg-dark-panel text-dark-muted hover:text-dark-text text-xs font-medium transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" /> Upload for this slide
                      </button>
                    </div>

                    {results.length === 0 && templates.length === 0 && (
                      <p className="text-xs text-dark-muted text-center py-4">
                        Click "Find Image" above to search Pexels, or upload an image below.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pending upload inline form */}
      {pendingUpload && (
        <div className="bg-dark-panel2 border border-cm-purple/40 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-dark-text">Upload Image</p>
            <button
              onClick={() => setPendingUpload(null)}
              type="button"
              className="p-1 rounded text-dark-muted hover:text-dark-danger transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-start gap-4">
            <img
              src={pendingUpload.previewUrl}
              alt="preview"
              className="w-20 h-20 object-cover rounded-lg border border-dark-border flex-shrink-0"
            />
            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-xs text-dark-muted mb-1">Name</label>
                <input
                  type="text"
                  value={pendingUpload.name}
                  onChange={(e) => setPendingUpload((p) => p ? { ...p, name: e.target.value } : p)}
                  className="w-full bg-dark-panel border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm focus:outline-none focus:border-cm-purple"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pendingUpload.saveAsTemplate}
                  onChange={(e) => setPendingUpload((p) => p ? { ...p, saveAsTemplate: e.target.checked } : p)}
                  className="accent-cm-purple"
                />
                <span className="text-sm text-dark-muted">Save as template (reuse across carousels)</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={confirmUpload}
              type="button"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cm-purple text-white text-sm font-semibold hover:bg-cm-purple/90 transition-colors"
            >
              <Check className="w-4 h-4" />
              {pendingUpload.forSlide !== undefined ? "Upload for this carousel" : "Upload for this carousel"}
            </button>
            <button
              onClick={() => setPendingUpload(null)}
              type="button"
              className="px-4 py-2 rounded-lg border border-dark-border bg-dark-panel2 text-dark-muted hover:text-dark-text text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
