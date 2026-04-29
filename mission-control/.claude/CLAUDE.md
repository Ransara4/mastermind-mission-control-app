# Mission Control — Build Rules

## New Page / Project Checklist (MANDATORY)

Every new MC page must complete all four steps before it is done:

1. **Create** — `app/app/<section>/<name>/page.tsx` using dark theme patterns below
2. **Nav** — add entry to `layout.tsx` (nav array + submenu if applicable); use Tailwind tokens only — no hardcoded hex values (`#...`) in `className`
3. **Verify** — `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/app/<page>` must return `200`
4. **Context doc** — create or update `~/.openclaw/workspace/projects/<name>/CONTEXT.md`

Do not mark a page done until all four are checked.

---

## Color Tokens

All colors must use named Tailwind tokens. Never use raw hex (`bg-[#abc123]`) in classNames — if a color isn't in the token set, add it to `tailwind.config.js` first.

| Token | Use |
|---|---|
| `cm-purple` | Primary accent — buttons, active states, links |
| `cm-purple-mid` | Muted purple — disabled, decorative |
| `dark-panel` | Card / section backgrounds |
| `dark-panel2` | Inset backgrounds, code blocks, tags |
| `dark-sidebar` | Sidebar background |
| `dark-border` | All borders |
| `dark-text` | Primary text |
| `dark-muted` | Secondary text, labels |
| `dark-success` | Positive values |
| `dark-warn` | Warnings |
| `dark-danger` | Errors / critical |

---

## Dark Theme Patterns (Every New Page)

**Page wrapper**: `<div className="space-y-6">`
**Hero/header card**: `bg-dark-panel border border-dark-border rounded-xl p-6`
**Icon**: `bg-cm-purple/15 rounded-lg` + `text-cm-purple`
**Title**: `text-dark-text font-bold tracking-tight`
**Subtitle**: `text-dark-muted`
**Stat cards**: `bg-dark-panel border border-dark-border rounded-xl p-4`
**Tags/badges**: `bg-dark-panel2 border border-dark-border text-dark-muted rounded-full px-2 py-0.5 text-xs`
**Status**: `text-dark-success` / `text-dark-warn` / `text-dark-danger`

### Never use on new pages
`bg-white` · `bg-slate-*` · `bg-cm-cream*` · `text-slate-*` · `border-slate-*` · `text-blue-*` · `bg-green-*` · `bg-emerald-*` · hardcoded hex

---

## Icon Rule (Dark Mode)

- **Lucide**: parent must have `text-dark-muted` or `text-dark-text` — never black on dark
- **PNG/SVG sidebar icons**: `style={{filter:"brightness(0) invert(1)", opacity:0.75}}`

## Icon Source Rule — No CDN Icons

**All icons must be bundled locally. Never load icons from an external CDN at runtime.**

- Use `lucide-react` (already installed) — icons are tree-shaken into the JS bundle at build time, zero network requests at runtime
- Never use CDN-linked icon fonts or SVG sprites: no `fonts.googleapis.com`, `fontawesome.com`, `unpkg.com`, `cdn.jsdelivr.net`, or similar
- Never add a `<link>` or `<script>` tag that fetches icons from an external URL
- If you need an icon not in lucide-react, download the SVG and add it to `public/icons/` or inline it as a component

---

## Textarea Rule

All `<textarea>` elements must use `resize-y` (never `resize-none`). Users must always be able to drag larger text areas taller.

---

## Scroll Position Rule — NEVER Break Scroll

**Never define sub-components (function Foo) inside another component's function body.**

This causes React to create a new function reference on every render, which forces it to unmount and remount every instance of that component. When child components remount, the DOM height momentarily collapses, snapping the window scroll to 0 before any `requestAnimationFrame` can restore it.

**Wrong:**
```tsx
function SessionPanel() {
  function StageCard({ ... }) { ... }  // new ref every render — causes scroll jump
  return STAGES.map(s => <StageCard ... />);
}
```

**Correct — define at module level, pass state as props:**
```tsx
function StageCard({ stage, pipeline, expandedStages, onToggle, ... }: Props) { ... }

function SessionPanel() {
  return STAGES.map(s => <StageCard pipeline={pipeline} expandedStages={expandedStages} onToggle={toggleStage} ... />);
}
```

**If refactoring is not feasible**, use `useLayoutEffect` to restore scroll synchronously before paint:
```tsx
const pendingScrollY = useRef<number | null>(null);
useLayoutEffect(() => {
  if (pendingScrollY.current !== null) { window.scrollTo(0, pendingScrollY.current); pendingScrollY.current = null; }
});
// In toggle handler:
pendingScrollY.current = window.scrollY;
setState(...);
```

`useLayoutEffect` fires synchronously after DOM mutation but before paint — it's the only reliable way to prevent visible scroll jumps when DOM height changes during a re-render.

---

## Build Protocol

MC runs as `next dev` — hot reload always active. Edits are live instantly.
- **Never run `mc-deploy`** — deprecated
- **Never restart the launchd service**

---

## Websites Database Rule

Every website (owner's or client's) must be registered in the central `data/websites.db` database. This is mandatory whenever:

- A new website or domain is set up
- A client site is onboarded
- Hosting, credentials, or integrations change for any site
- A new domain is registered or transferred

The database is the single source of truth for all website connection info. Use the `/api/websites` endpoint or the Websites page in MC to add/update entries. Never hardcode site IDs, API keys, or domain-specific credentials in route files. Always read them from `websites.db` via `lib/websites-db.ts`.

Required fields: `domain`, `name`, `hosting`, `base_url`, `entity`.
Recommended: `hosting_credentials`, `search_console`, `registrar`, `tech_stack`.

---

## Help Content Rule

Every new page must have a help entry in `lib/help-content.ts`. This is part of the definition of "done" for any page.

The help entry must include:
- `description`: 2-3 plain-English sentences explaining what the page does (for beginners)
- `advanced`: 3-5 sentences about the backend, data storage, and customization (for developers)
