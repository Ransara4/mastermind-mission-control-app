# Mission Control Dark Navy Reskin — Execution Plan

**Goal**: Flip the entire app from light cream/purple to dark navy, matching the approved mockup at `.claude/taskboard-mockup.html`. CSS/Tailwind classes and color values ONLY — no functional changes.

**Total files**: ~173 TSX files + 1 CSS + 1 Tailwind config = ~175 files

---

## Transformation Cheatsheet

Every executor must apply these substitutions. This is the single source of truth.

### Background colors
| Find | Replace |
|---|---|
| `bg-slate-50` | `bg-dark-bg` |
| `bg-white` | `bg-dark-panel` |
| `bg-cm-cream-soft` | `bg-dark-bg` |
| `bg-cm-cream` | `bg-dark-panel` |
| `bg-slate-100` | `bg-dark-panel2` |
| `bg-slate-200` | `bg-dark-panel2` |
| `bg-slate-50/60` | `bg-dark-panel2/60` |

### Text colors
| Find | Replace |
|---|---|
| `text-slate-900` | `text-dark-text` |
| `text-slate-800` | `text-dark-text` |
| `text-slate-700` | `text-dark-text` |
| `text-slate-600` | `text-dark-muted` |
| `text-slate-500` | `text-dark-muted` |
| `text-slate-400` | `text-dark-muted` |
| `text-slate-300` | `text-dark-muted` |

### Border colors
| Find | Replace |
|---|---|
| `border-slate-200` | `border-dark-border` |
| `border-slate-100` | `border-dark-border` |
| `border-slate-300` | `border-dark-border` |
| `border-cm-purple-light` | `border-dark-border` |

### Button colors
| Find | Replace |
|---|---|
| `bg-blue-500` | `bg-cm-purple` |
| `bg-blue-600` | `bg-cm-purple` |
| `bg-indigo-500` | `bg-cm-purple` |
| `bg-indigo-600` | `bg-cm-purple` |
| `hover:bg-blue-600` | `hover:bg-purple2` |
| `hover:bg-blue-700` | `hover:bg-purple2` |
| `hover:bg-indigo-600` | `hover:bg-purple2` |
| `hover:bg-indigo-700` | `hover:bg-purple2` |
| `hover:bg-slate-100` | `hover:bg-dark-panel2` |
| `hover:bg-slate-50` | `hover:bg-dark-panel2` |

### Focus rings
| Find | Replace |
|---|---|
| `focus:ring-blue-500` | `focus:ring-cm-purple` |
| `focus:ring-blue-400` | `focus:ring-cm-purple` |
| `focus:border-blue-400` | `focus:border-cm-purple` |
| `focus:border-blue-500` | `focus:border-cm-purple` |
| `ring-blue-500` | `ring-cm-purple` |

### Links
| Find | Replace |
|---|---|
| `text-blue-500` | `text-cm-purple` |
| `text-blue-600` | `text-cm-purple` |
| `text-blue-700` | `text-cm-purple` |
| `hover:text-blue-600` | `hover:text-purple2` |
| `hover:text-blue-700` | `hover:text-purple2` |

### Success/status (green → gold)
| Find | Replace |
|---|---|
| `bg-green-100 text-green-700` (success badges) | `bg-dark-success/20 text-dark-success` |
| `bg-green-50 text-green-700` | `bg-dark-success/10 text-dark-success` |
| `bg-emerald-100 text-emerald-700` | `bg-dark-success/20 text-dark-success` |
| `text-green-500` (checkmarks) | `text-dark-success` |
| `text-green-600` | `text-dark-success` |
| `text-green-700` | `text-dark-success` |
| `border-green-200` | `border-dark-success/30` |
| `bg-green-500` (online dot indicators) | **no change — keep green** |

### Warning/amber
| Find | Replace |
|---|---|
| `bg-amber-50` | `bg-dark-warn/10` |
| `bg-amber-100` | `bg-dark-warn/20` |
| `text-amber-600` | `text-dark-warn` |
| `text-amber-700` | `text-dark-warn` |
| `text-amber-800` | `text-dark-warn` |
| `text-amber-900` | `text-dark-warn` |
| `border-amber-200` | `border-dark-warn/30` |

### Error/danger
| Find | Replace |
|---|---|
| `bg-red-50` | `bg-dark-danger/10` |
| `bg-red-100 text-red-700` | `bg-dark-danger/20 text-dark-danger` |
| `text-red-500` | `text-dark-danger` |
| `text-red-600` | `text-dark-danger` |
| `hover:bg-red-50` | `hover:bg-dark-danger/10` |

### Card info badges (blue tones)
| Find | Replace |
|---|---|
| `bg-blue-50 text-blue-700` | `bg-cm-purple/10 text-cm-purple` |
| `bg-blue-100 text-blue-700` | `bg-cm-purple/20 text-cm-purple` |
| `border-blue-100` | `border-cm-purple/20` |
| `border-blue-200` | `border-cm-purple/30` |
| `border-blue-400` | `border-cm-purple` |

### Gradients
| Find | Replace |
|---|---|
| `gradient-cm-header` class | `bg-gradient-to-r from-cm-purple/10 via-dark-panel to-dark-panel` |
| `gradient-cm` class | `bg-gradient-to-br from-cm-purple/8 to-dark-panel` |
| `gradient-cm-chart` class | `bg-gradient-to-b from-cm-purple/10 to-dark-panel` |
| `from-cm-purple-light via-cm-pink-light to-white` | `from-cm-purple/10 via-dark-panel to-dark-panel` |
| `from-cm-purple-light/40 to-white` | `from-cm-purple/15 to-dark-sidebar` |

### Sidebar active states
| Find | Replace |
|---|---|
| `bg-cm-purple-light text-cm-purple` | `bg-cm-purple/15 text-cm-purple` |
| `hover:bg-cm-purple-light/50` | `hover:bg-cm-purple/10` |
| `bg-cm-purple-light/50` | `bg-cm-purple/10` |
| `bg-cm-purple-light` (standalone) | `bg-cm-purple/15` |
| `hover:bg-cm-purple-light` | `hover:bg-cm-purple/15` |
| `border-cm-purple-light` (tree lines) | `border-cm-purple/20` |

### Card project palette (TaskCard.tsx)
| Find | Replace |
|---|---|
| `bg-violet-100 text-violet-700` | `bg-violet-500/20 text-violet-300` |
| `bg-sky-100 text-sky-700` | `bg-sky-500/20 text-sky-300` |
| `bg-emerald-100 text-emerald-700` | `bg-emerald-500/20 text-emerald-300` |
| `bg-rose-100 text-rose-700` | `bg-rose-500/20 text-rose-300` |
| `bg-amber-100 text-amber-700` | `bg-amber-500/20 text-amber-300` |
| `bg-teal-100 text-teal-700` | `bg-teal-500/20 text-teal-300` |
| `bg-indigo-100 text-indigo-700` | `bg-indigo-500/20 text-indigo-300` |
| `bg-pink-100 text-pink-700` | `bg-pink-500/20 text-pink-300` |
| `bg-lime-100 text-lime-700` | `bg-lime-500/20 text-lime-300` |
| `bg-cyan-100 text-cyan-700` | `bg-cyan-500/20 text-cyan-300` |
| `bg-fuchsia-100 text-fuchsia-700` | `bg-fuchsia-500/20 text-fuchsia-300` |
| `bg-orange-100 text-orange-700` | `bg-orange-500/20 text-orange-300` |

### Inputs & selects
| Find | Replace |
|---|---|
| `bg-white` on inputs | `bg-dark-panel2` |
| `placeholder-slate-300` | `placeholder-dark-muted` |
| `placeholder-slate-400` | `placeholder-dark-muted` |
| `placeholder:text-slate-400` | `placeholder:text-dark-muted` |

### Dropdowns
| Find | Replace |
|---|---|
| `bg-white border border-slate-200 rounded-lg shadow-lg` | `bg-dark-panel2 border border-dark-border rounded-lg shadow-lg` |
| `hover:bg-slate-50` (dropdown item) | `hover:bg-cm-purple/10` |
| `hover:bg-violet-50` | `hover:bg-cm-purple/10` |

### Shadows
| Find | Replace |
|---|---|
| `shadow-md` | `shadow-md shadow-black/20` |
| `shadow-lg` | `shadow-lg shadow-black/30` |
| `shadow-2xl` | `shadow-2xl shadow-black/40` |

### Typography
- Every page's main `<h1>` or `<h2>` page title: add `font-syne font-extrabold`
- Section headings (`<h3>`, `<h2>` within cards): add `font-syne font-bold`
- `font-mono` text: also add `font-dm-mono`

---

## Phase 0: Foundation (sequential — must complete before any batch)

### 0.1 `tailwind.config.ts`
Add to `theme.extend.colors`:
```ts
dark: {
  bg:      '#080c14',
  sidebar: '#0d1220',
  panel:   '#111827',
  panel2:  '#161e2e',
  border:  'rgba(124,105,199,0.15)',
  text:    '#f0eeff',
  muted:   '#8b8fa8',
  success: '#f5c842',
  warn:    '#f0c060',
  danger:  '#f07070',
},
purple2: '#9d8de0',
```
Add to `theme.extend.fontFamily`:
```ts
fontFamily: {
  syne:     ['"Syne"', 'sans-serif'],
  'dm-sans':  ['"DM Sans"', 'sans-serif'],
  'dm-mono':  ['"DM Mono"', 'monospace'],
},
```
Keep all existing `cm` tokens intact.

### 0.2 `app/globals.css`
1. Add Google Fonts `@import` at top (before `@tailwind` directives)
2. Update `body` font-family to `'DM Sans'`
3. Update `.skeleton` shimmer gradient to dark panel colors (`#111827` / `#161e2e`)
4. Update `.draggable-over`: `background-color: #161e2e; border: 2px dashed rgba(124,105,199,0.25)`
5. Update markdown styles for dark: code bg `#161e2e`, blockquote border/color, table border/th bg
6. Update gradient classes: `.gradient-cm`, `.gradient-cm-header`, `.gradient-cm-chart` to dark versions
7. Update `.card-shadow` and `.card-hover` shadow opacities to `rgba(0,0,0,0.3+)`
8. Update `.modal-backdrop` to `rgba(0,0,0,0.7)`
9. Scrollbars stay purple — already correct

### 0.3 `app/layout.tsx`
1. Add Google Fonts `<link>` tags in `<head>`
2. Change body class: `bg-slate-50` → `bg-dark-bg text-dark-text`

### 0.4 `app/app/layout.tsx` (~1229 lines — highest priority)
Apply full cheatsheet to the sidebar/nav shell:
- Sidebar bg: `bg-dark-sidebar`
- Sidebar border: `border-dark-border`
- Header gradient: `from-cm-purple/15 to-dark-sidebar`
- All nav items: dark text, dark hover, active purple/15
- Search input: dark bg, dark border, dark placeholder
- Tree borders: `border-cm-purple/20`
- Footer: `border-dark-border`, `text-dark-muted`
- Top bar: `bg-dark-panel border-dark-border`
- Page title in top bar: add `font-syne font-extrabold`

### 0.5 `components/TaskCard.tsx`
- Card bg: `bg-dark-panel`, border: `border-dark-border hover:border-cm-purple`
- All 12 PROJECT_PALETTE entries: light-100/700 → dark-mode /20 /300 variants
- `priorityColors`: update to dark variants
- `statusConfig`: update all 3 executor status entries

### 0.6 `components/TaskModal.tsx`
- Modal bg: `bg-dark-panel`
- All inputs, selects, textareas: `bg-dark-panel2 border-dark-border`
- All focus rings: blue → `focus:ring-cm-purple`
- All labels/helper text: `text-dark-muted`
- Cancel button: dark muted style
- Save button: `bg-cm-purple hover:bg-purple2`
- Project dropdown: dark bg
- Footer: `bg-dark-panel border-dark-border`

### 0.7 `components/ApiKeyBanner.tsx`
- Configured badge: green → `text-dark-success bg-dark-success/10 border-dark-success/30`
- Warning banner: amber → `border-dark-warn/30 bg-dark-warn/10 text-dark-warn`
- Expanded panel: `bg-dark-panel border-dark-warn/30`
- Step numbers: `bg-cm-purple/15 text-cm-purple`
- Input: `border-dark-border`

### Also Phase 0: UI primitives (`components/ui/*.tsx`)
- `alert.tsx`, `button.tsx`, `dialog.tsx`, `input.tsx`, `label.tsx`, `select.tsx`
- Apply cheatsheet: bg-white → bg-dark-panel, border-slate → border-dark-border, text colors

### Also Phase 0: Sub-layouts
- `app/app/guard-dog/layout.tsx`
- `app/app/masterminds-hq/layout.tsx`
- `app/app/mentorships/layout.tsx`
- `app/app/error.tsx`

---

## Batches 1–14 (parallel after Phase 0)

### Batch 1: Tasks + Daily Summary + Office + Calendar + Home
- `app/app/tasks/page.tsx`
- `app/app/daily-summary/page.tsx`
- `app/app/office/page.tsx`
- `app/app/calendar/page.tsx`
- `app/app/page.tsx`

### Batch 2: Masterminds HQ (all sub-pages)
- `app/app/masterminds-hq/page.tsx`
- `app/app/masterminds-hq/participants/page.tsx`
- `app/app/masterminds-hq/connections/page.tsx`
- `app/app/masterminds-hq/session-prep/page.tsx`
- `app/app/masterminds-hq/blog/page.tsx`
- `app/app/masterminds-hq/discoveries/page.tsx`
- `app/app/masterminds-hq/cold-outreach/page.tsx`
- `app/app/masterminds-hq/wrap-up/page.tsx`
- `app/app/masterminds-hq/questions/page.tsx`

### Batch 3: Stripe + Zoho + Mandiri + Investments
- `app/app/stripe/page.tsx` + all `sections/*.tsx`
- `app/app/zoho-books/page.tsx`
- `app/app/mandiri-export/page.tsx`
- `app/app/investments/page.tsx` + sub-pages

### Batch 4: SEO (all section files)
- `app/app/seo/page.tsx` + all `sections/*.tsx` (~20 files)

### Batch 5: Guard Dog + Machine Learning
- `app/app/guard-dog/` (all pages + sections)
- `app/app/machine-learning/page.tsx` + all `sections/*.tsx`

### Batch 6: Email Cleanup + Scrooge + Descript + Stock Photo AI
- `app/app/email-cleanup/page.tsx` + sections
- `app/app/scrooge/page.tsx` + sections
- `app/app/descript/page.tsx` + sections
- `app/app/stock-photo-ai/page.tsx` + sections

### Batch 7: X + LinkedIn + YouTube + Meta Ads
- `app/app/x/page.tsx` + sections
- `app/app/linkedin/page.tsx`
- `app/app/linkedin-images/page.tsx`
- `app/app/youtube/page.tsx`
- `app/app/meta-ads/page.tsx`

### Batch 8: Rio (all sub-pages)
- `app/app/rio/page.tsx`
- `app/app/rio/icps/page.tsx` + sub-pages
- `app/app/rio/store-leads/page.tsx`
- `app/app/rio/waba-setup/page.tsx` + components

### Batch 9: PostPilot + Mentorships + Heliconia + Iron Amethyst
- `app/app/postpilot/` (all pages)
- `app/app/mentorships/` (all pages)
- `app/app/heliconia-cantik/page.tsx`
- `app/app/iron-amethyst/page.tsx`

### Batch 10: MiroFish + ManyChat + Tokopedia + CashClaw
- `app/app/mirofish/page.tsx`
- `app/app/manychat-giveaways/page.tsx`
- `app/app/manychat-sync/page.tsx`
- `app/app/tokopedia/page.tsx`
- `app/app/cashclaw/page.tsx`

### Batch 11: Personal + Bank + Affiliate + Settings + Memory + WHOOP + System
- `app/app/personal-info/page.tsx`
- `app/app/bank-accounts/page.tsx`
- `app/app/affiliate-links/page.tsx`
- `app/app/settings/page.tsx`
- `app/app/memory/page.tsx`
- `app/app/whoop/page.tsx`
- `app/app/backups/page.tsx`
- `app/app/installed-skills/page.tsx`
- `app/app/logs/page.tsx`
- `app/app/mac-cleaner/page.tsx`

### Batch 12: Skills + WhatsApp + Slack + Zoom + Airtable + TidyCal
- `app/app/skills/page.tsx` + components
- `app/app/whatsapp/page.tsx`
- `app/app/slack/page.tsx`
- `app/app/zoom/page.tsx`
- `app/app/airtable/page.tsx`
- `app/app/tidycal/page.tsx`
- `components/SkillAuthModal.tsx`
- `components/SkillToggle.tsx`
- `components/CelebrationBurst.tsx`

### Batch 13: Content Tools
- `app/app/canva/page.tsx`
- `app/app/remotion/page.tsx`
- `app/app/pexel/page.tsx`
- `app/app/unsplash/page.tsx`
- `app/app/notion-templates/page.tsx`
- `app/app/prompt-packs/page.tsx`
- `app/app/story-engine/page.tsx`
- `app/app/ig-video-transcriber/page.tsx`
- `app/app/blog-service/page.tsx`

### Batch 14: Remaining
- `app/app/dropbox/page.tsx`
- `app/app/paperclip/page.tsx`
- `app/app/clanforge/page.tsx`
- `app/app/passive-ideas/page.tsx`
- `app/app/apollo/page.tsx`
- `app/app/porkbun/page.tsx`
- `app/app/vercel/page.tsx`
- `app/app/projects/page.tsx`

---

## Verification Checklist (per page)

- [ ] No `bg-white`, `bg-slate-50`, `bg-cm-cream*` remaining
- [ ] No `text-slate-900/800/700` remaining (should be `text-dark-text`)
- [ ] No `border-slate-200/100` remaining (should be `border-dark-border`)
- [ ] No `bg-blue-500/600` or `bg-indigo-*` buttons (should be `bg-cm-purple`)
- [ ] No `focus:ring-blue-*` (should be `focus:ring-cm-purple`)
- [ ] No `text-blue-*` links (should be `text-cm-purple`)
- [ ] Page title `<h1>`/`<h2>` has `font-syne font-extrabold`
- [ ] Success badges are gold `text-dark-success` (not green-700)
- [ ] Inputs/selects have `bg-dark-panel2`
- [ ] `npm run build` exits 0

## Grep validation (after all batches)
```bash
cd /Users/openclaw/.openclaw/workspace/mission-control
grep -rn "bg-white\|bg-slate-50\|bg-cm-cream" --include="*.tsx" app/app/ components/ | grep -v "//" | wc -l
grep -rn "text-slate-900\|text-slate-800\|text-slate-700" --include="*.tsx" app/app/ components/ | grep -v "//" | wc -l
grep -rn "border-slate-200\|border-slate-100" --include="*.tsx" app/app/ components/ | grep -v "//" | wc -l
grep -rn "bg-blue-500\|bg-blue-600\|bg-indigo-" --include="*.tsx" app/app/ components/ | grep -v "//" | wc -l
```
All should return 0.

---

## Execution Notes

1. **Phase 0 is blocking** — no batch starts until all foundation files pass `npm run build`.
2. **Batches 1–14 are fully parallel** — no cross-dependencies between batches.
3. **Preserve all `cm-purple` and `cm-pink` accent references** — only backgrounds, borders, and text change.
4. **Do NOT change** API routes, data fetching, state, event handlers, props, or business logic.
5. **Watch ternary color classes** — `isActive ? "bg-cm-purple-light" : "text-slate-500"` — both branches need updating.
6. **After all batches**: run full MC Build/Test Protocol (unload plist → pkill → rm .next → reload → wait 20s → curl check).
