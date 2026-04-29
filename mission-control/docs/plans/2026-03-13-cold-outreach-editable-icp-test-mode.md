# Cold Outreach: Editable ICP Fields + Test Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make all ICP fields editable from Mission Control and add a Test Mode that generates 3 sample hooks, displays them inline, and supports a "Rewrite Hook" button for rapid iteration.

**Architecture:** Two work streams converging on one page. Stream 1 converts 7 read-only ICP sections into editable form fields, wired through the existing `updateIcp` PUT flow. Stream 2 adds a Test Mode toggle that calls a new `/api/cold-outreach/test-hook-batch` endpoint (generates 3 hooks via Claude CLI), displays results in a dedicated panel with Rewrite buttons, and skips the Instantly upload step. All changes are in 3 files: the page component, the data hook, and 1 new API route.

**Tech Stack:** Next.js 15 App Router, React (client components), better-sqlite3, Claude CLI (`claude -p`), Tailwind CSS, lucide-react icons.

---

## Context for the implementor

### Key files you will modify

| File | Purpose |
|------|---------|
| `app/app/masterminds-hq/cold-outreach/page.tsx` | Main 1200-line page component. All UI lives here. |
| `hooks/useColdOutreachData.ts` | Data hook with all API calls, state, types. |
| `app/api/cold-outreach/test-hook/route.ts` | Existing single-hook tester. You will extend this. |

### Key files you should read (don't modify)

| File | Purpose |
|------|---------|
| `app/api/cold-outreach/icps/route.ts` | ICP CRUD API. PUT handler already accepts all JSON fields (target_profile, niche_categories, qualification_rules, track_definitions) and syncs to both DB and filesystem. No backend changes needed for editable fields. |
| `app/api/cold-outreach/_db.ts` | Database schema, `getDb()`, `ICP_BASE` path, `getEnvVar()`. |
| `icps/icp_v1/hook_template.json` | Hook template shape (has `format_rules`, `subject_line_formula`, `track_hooks`, `credibility_block`, `banned_words`, `prompt_template`). |
| `icps/icp_v1/icp.json` | ICP data shape (has `target_profile` as key-value object, `niche_categories_searched` as string array, `qualification_rules.must_have` / `.disqualify_if` as string arrays, `track_definitions` as keyed objects with `name`/`criteria`/`angle`). |

### How the save flow works (already implemented)

The page calls `updateIcp(id, { field: newValue })` which does:
1. PUT `/api/cold-outreach/icps` with `{ id, ...fields }`
2. API updates SQLite (JSON.stringify for object fields)
3. API updates `icp.json` on filesystem (field mapping: `niche_categories` -> `niche_categories_searched`, `name` -> `icp_name`)
4. If `hook_template` key is present, API merges it into `hook_template.json` on filesystem
5. After save, hook re-fetches the ICP to refresh state

The PUT handler already handles `target_profile`, `niche_categories`, `qualification_rules`, `track_definitions` in the `columnMap` and `jsonFields` sets. The `hook_template` object is merged (spread) with the existing file. So **no backend changes are needed** for the editable fields feature.

### ICP data shapes from icp.json

```json
"target_profile": {
  "business_type": "Solo practitioner...",
  "revenue_range": "$50k-$500k/yr",
  "team_size": "1-5 people",
  "tech_savviness": "Low to moderate...",
  "content_presence": "Active blog...",
  "geography": "English-speaking..."
}

"niche_categories_searched": ["life coaches", "business coaches", ...]

"qualification_rules": {
  "must_have": ["Discoverable personal email...", ...],
  "disqualify_if": ["Already offers automation...", ...]
}

"track_definitions": {
  "A": { "name": "Collaboration", "criteria": "Has clients...", "angle": "Offer free session..." },
  "B": { "name": "Direct", "criteria": "Solo practitioner...", "angle": "Offer learning AI tools..." }
}
```

### Hook template data shapes from hook_template.json

```json
"format_rules": {
  "word_count": "75-115 words...",
  "opening": "Start with 'Hey [first name],'",
  "voice": "First person as Joe...",
  "closings": "SIMPLER closings...",
  "dashes": "No dashes...",
  "never_use": "NEVER use 'Worth a quick conversation?'"
}

"subject_line_formula": {
  "pattern": "{First name}, I saw your {specific thing}",
  "case": "Sentence case, casual...",
  "variations": ["I saw", "I came across", "I found"],
  "max_words_after_comma": 7,
  "no_emojis": true,
  "no_dashes": true
}
```

### MC restart protocol (MANDATORY after every build)

After EVERY change that requires a build:
```bash
cd ~/.openclaw/workspace/mission-control
rm -rf .next && npm run build
launchctl unload ~/Library/LaunchAgents/ai.openclaw.mission-control.plist
sleep 2
pkill -f "next.*mission-control"
sleep 1
kill -9 $(pgrep -f "next.*mission-control") 2>/dev/null
sleep 1
launchctl load ~/Library/LaunchAgents/ai.openclaw.mission-control.plist
sleep 20
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/app/masterminds-hq/cold-outreach
# Must return 200
curl -s http://localhost:3000/app/masterminds-hq/cold-outreach | grep -o 'link rel="stylesheet"'
# Must return: link rel="stylesheet"
```

---

## STREAM 1: Editable ICP Fields

### Task 1: Add editable state variables for all 7 field groups

**Files:**
- Modify: `app/app/masterminds-hq/cold-outreach/page.tsx` (lines ~293-315, state declarations)

**Step 1: Add state declarations**

Find the existing state block (around line 293-308) that has `editName`, `editDescription`, etc. Add these new state variables right after `editDescription`:

```tsx
// Target Profile (key-value pairs)
const [editTargetProfile, setEditTargetProfile] = useState<Record<string, string>>({});
const [newProfileKey, setNewProfileKey] = useState("");
const [newProfileValue, setNewProfileValue] = useState("");

// Niche Categories (string array)
const [editNicheCategories, setEditNicheCategories] = useState<string[]>([]);
const [nicheCategoryInput, setNicheCategoryInput] = useState("");

// Qualification Rules
const [editMustHave, setEditMustHave] = useState<string[]>([]);
const [mustHaveInput, setMustHaveInput] = useState("");
const [editDisqualifyIf, setEditDisqualifyIf] = useState<string[]>([]);
const [disqualifyIfInput, setDisqualifyIfInput] = useState("");

// Track Definitions (keyed object)
const [editTrackDefs, setEditTrackDefs] = useState<Record<string, { name: string; criteria: string; angle: string }>>({});

// Format Rules (key-value, lives on hookTemplate)
const [editFormatRules, setEditFormatRules] = useState<Record<string, string>>({});
const [newFormatKey, setNewFormatKey] = useState("");
const [newFormatValue, setNewFormatValue] = useState("");

// Subject Line Formula (key-value, lives on hookTemplate)
const [editSubjectFormula, setEditSubjectFormula] = useState<Record<string, unknown>>({});
```

**Step 2: Populate new fields in `populateFields`**

Find the `populateFields` function (around line 322-343). Replace it entirely:

```tsx
const populateFields = (icp: ICP) => {
  setEditName(icp.name);
  setEditDescription(icp.description);

  // Target profile
  const tp = typeof icp.target_profile === "object" && icp.target_profile ? icp.target_profile : {};
  const tpStrings: Record<string, string> = {};
  for (const [k, v] of Object.entries(tp)) tpStrings[k] = String(v);
  setEditTargetProfile(tpStrings);

  // Niche categories
  setEditNicheCategories(Array.isArray(icp.niche_categories) ? [...icp.niche_categories] : []);

  // Qualification rules
  const qr = icp.qualification_rules || { must_have: [], disqualify_if: [] };
  setEditMustHave(Array.isArray(qr.must_have) ? [...qr.must_have] : []);
  setEditDisqualifyIf(Array.isArray(qr.disqualify_if) ? [...qr.disqualify_if] : []);

  // Track definitions
  const td = typeof icp.track_definitions === "object" && icp.track_definitions ? icp.track_definitions : {};
  const tdClone: Record<string, { name: string; criteria: string; angle: string }> = {};
  for (const [k, v] of Object.entries(td)) {
    tdClone[k] = { name: v.name || "", criteria: v.criteria || "", angle: (v as Record<string, string>).angle || (v as Record<string, string>).hook_angle || "" };
  }
  setEditTrackDefs(tdClone);

  // Hook template fields
  const ht = icp.hookTemplate;
  if (ht) {
    setEditCredibility(
      typeof ht.credibility_block === "string"
        ? ht.credibility_block
        : JSON.stringify(ht.credibility_block, null, 2)
    );
    setEditBannedWords([...(ht.banned_words || [])]);
    setEditPromptTemplate(ht.prompt_template || "");

    const fr = ht.format_rules || {};
    const frStrings: Record<string, string> = {};
    for (const [k, v] of Object.entries(fr)) frStrings[k] = String(v);
    setEditFormatRules(frStrings);

    setEditSubjectFormula(ht.subject_line_formula || {});
  } else {
    setEditCredibility("");
    setEditBannedWords([]);
    setEditPromptTemplate("");
    setEditFormatRules({});
    setEditSubjectFormula({});
  }
  setSavedIcp(false);
  setSavedHook(false);
  setSaveIcpError(null);
  setSaveHookError(null);
};
```

**Step 3: Update `handleSaveIcp` to include all ICP fields**

Find `handleSaveIcp` (around line 352-368). Replace:

```tsx
const handleSaveIcp = async () => {
  if (!selectedIcp) return;
  setSavingIcp(true);
  setSaveIcpError(null);
  try {
    await updateIcp(selectedIcp.id, {
      name: editName,
      description: editDescription,
      target_profile: editTargetProfile,
      niche_categories: editNicheCategories,
      qualification_rules: { must_have: editMustHave, disqualify_if: editDisqualifyIf },
      track_definitions: editTrackDefs,
    });
    setSavedIcp(true);
    setTimeout(() => setSavedIcp(false), 3000);
  } catch (err) {
    setSaveIcpError(err instanceof Error ? err.message : "Failed to save");
  } finally {
    setSavingIcp(false);
  }
};
```

**Step 4: Update `handleSaveHook` to include format_rules and subject_line_formula**

Find `handleSaveHook` (around line 370-389). Replace:

```tsx
const handleSaveHook = async () => {
  if (!selectedIcp) return;
  setSavingHook(true);
  setSaveHookError(null);
  try {
    await updateIcp(selectedIcp.id, {
      hook_template: {
        credibility_block: editCredibility,
        banned_words: editBannedWords,
        prompt_template: editPromptTemplate,
        format_rules: editFormatRules,
        subject_line_formula: editSubjectFormula,
      },
    });
    setSavedHook(true);
    setTimeout(() => setSavedHook(false), 3000);
  } catch (err) {
    setSaveHookError(err instanceof Error ? err.message : "Failed to save hook");
  } finally {
    setSavingHook(false);
  }
};
```

**Step 5: Commit**

```bash
git add app/app/masterminds-hq/cold-outreach/page.tsx
git commit -m "feat(cold-outreach): add state and save logic for all editable ICP fields"
```

---

### Task 2: Replace read-only Target Profile with editable key-value editor

**Files:**
- Modify: `app/app/masterminds-hq/cold-outreach/page.tsx` (lines ~660-673, Target Profile section)

**Step 1: Replace the Target Profile section**

Find this block (around line 660-673):
```tsx
{/* Target Profile */}
{selectedIcp.target_profile && Object.keys(selectedIcp.target_profile).length > 0 && (
```

Replace the entire Target Profile section (from `{/* Target Profile */}` to its closing `</div>` + `)}`) with:

```tsx
{/* Target Profile (editable key-value) */}
<div>
  <label className="block text-sm font-medium text-slate-700 mb-1">Target Profile</label>
  <div className="space-y-2">
    {Object.entries(editTargetProfile).map(([key, val]) => (
      <div key={key} className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-600 min-w-[140px] bg-slate-50 px-2 py-1.5 rounded-l-lg border border-slate-200">{key}</span>
        <input
          value={val}
          onChange={(e) => setEditTargetProfile({ ...editTargetProfile, [key]: e.target.value })}
          className="flex-1 border border-slate-300 rounded-r-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => {
            const next = { ...editTargetProfile };
            delete next[key];
            setEditTargetProfile(next);
          }}
          className="p-1 text-red-400 hover:text-red-600"
          title="Remove"
        >
          <X size={14} />
        </button>
      </div>
    ))}
    <div className="flex items-center gap-2 pt-1">
      <input
        value={newProfileKey}
        onChange={(e) => setNewProfileKey(e.target.value)}
        placeholder="New key..."
        className="w-36 border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        value={newProfileValue}
        onChange={(e) => setNewProfileValue(e.target.value)}
        placeholder="Value..."
        className="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={() => {
          if (newProfileKey.trim()) {
            setEditTargetProfile({ ...editTargetProfile, [newProfileKey.trim()]: newProfileValue.trim() });
            setNewProfileKey("");
            setNewProfileValue("");
          }
        }}
        className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
      >
        Add
      </button>
    </div>
  </div>
</div>
```

**Step 2: Verify file saves without syntax errors**

Run: `cd ~/.openclaw/workspace/mission-control && npx tsc --noEmit --pretty 2>&1 | grep -c error`
Expected: 0

**Step 3: Commit**

```bash
git add app/app/masterminds-hq/cold-outreach/page.tsx
git commit -m "feat(cold-outreach): make Target Profile editable with key-value editor"
```

---

### Task 3: Replace read-only Niche Categories with editable tag list

**Files:**
- Modify: `app/app/masterminds-hq/cold-outreach/page.tsx` (lines ~675-691, Niche Categories section)

**Step 1: Replace the Niche Categories section**

Find the `{/* Niche Categories */}` block. Replace the entire section with:

```tsx
{/* Niche Categories (editable tag list) */}
<div>
  <label className="block text-sm font-medium text-slate-700 mb-1">
    Niche Categories <span className="text-slate-400 font-normal">({editNicheCategories.length})</span>
  </label>
  <div className="flex flex-wrap gap-1.5 mb-2">
    {editNicheCategories.map((cat, idx) => (
      <span
        key={idx}
        className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
      >
        <Tag size={10} />
        {cat}
        <button
          onClick={() => setEditNicheCategories(editNicheCategories.filter((_, i) => i !== idx))}
          className="hover:text-blue-900 ml-0.5"
        >
          <X size={10} />
        </button>
      </span>
    ))}
    {editNicheCategories.length === 0 && (
      <span className="text-xs text-slate-400 italic">No niches defined</span>
    )}
  </div>
  <div className="flex gap-2">
    <input
      value={nicheCategoryInput}
      onChange={(e) => setNicheCategoryInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const val = nicheCategoryInput.trim();
          if (val && !editNicheCategories.includes(val)) {
            setEditNicheCategories([...editNicheCategories, val]);
          }
          setNicheCategoryInput("");
        }
      }}
      placeholder="Add niche category..."
      className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
    <button
      onClick={() => {
        const val = nicheCategoryInput.trim();
        if (val && !editNicheCategories.includes(val)) {
          setEditNicheCategories([...editNicheCategories, val]);
        }
        setNicheCategoryInput("");
      }}
      className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
    >
      Add
    </button>
  </div>
</div>
```

**Step 2: Commit**

```bash
git add app/app/masterminds-hq/cold-outreach/page.tsx
git commit -m "feat(cold-outreach): make Niche Categories editable with tag list"
```

---

### Task 4: Replace read-only Qualification Rules with editable lists

**Files:**
- Modify: `app/app/masterminds-hq/cold-outreach/page.tsx` (lines ~693-725, Qualification Rules section)

**Step 1: Replace the Qualification Rules section**

Find `{/* Qualification Rules */}`. Replace the entire section with:

```tsx
{/* Qualification Rules (editable lists) */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Must Have */}
  <div>
    <label className="block text-sm font-medium text-green-700 mb-1">Must Have</label>
    <ul className="space-y-1 mb-2">
      {editMustHave.map((rule, i) => (
        <li key={i} className="flex items-start gap-1.5 text-sm text-slate-600 group">
          <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
          <input
            value={rule}
            onChange={(e) => {
              const next = [...editMustHave];
              next[i] = e.target.value;
              setEditMustHave(next);
            }}
            className="flex-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none py-0.5 text-sm"
          />
          <button
            onClick={() => setEditMustHave(editMustHave.filter((_, idx) => idx !== i))}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:text-red-600"
          >
            <X size={12} />
          </button>
        </li>
      ))}
      {editMustHave.length === 0 && (
        <li className="text-xs text-slate-400 italic">None defined</li>
      )}
    </ul>
    <div className="flex gap-2">
      <input
        value={mustHaveInput}
        onChange={(e) => setMustHaveInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (mustHaveInput.trim()) {
              setEditMustHave([...editMustHave, mustHaveInput.trim()]);
              setMustHaveInput("");
            }
          }
        }}
        placeholder="Add rule..."
        className="flex-1 border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={() => {
          if (mustHaveInput.trim()) {
            setEditMustHave([...editMustHave, mustHaveInput.trim()]);
            setMustHaveInput("");
          }
        }}
        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
      >
        Add
      </button>
    </div>
  </div>

  {/* Disqualify If */}
  <div>
    <label className="block text-sm font-medium text-red-700 mb-1">Disqualify If</label>
    <ul className="space-y-1 mb-2">
      {editDisqualifyIf.map((rule, i) => (
        <li key={i} className="flex items-start gap-1.5 text-sm text-slate-600 group">
          <XCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
          <input
            value={rule}
            onChange={(e) => {
              const next = [...editDisqualifyIf];
              next[i] = e.target.value;
              setEditDisqualifyIf(next);
            }}
            className="flex-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none py-0.5 text-sm"
          />
          <button
            onClick={() => setEditDisqualifyIf(editDisqualifyIf.filter((_, idx) => idx !== i))}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:text-red-600"
          >
            <X size={12} />
          </button>
        </li>
      ))}
      {editDisqualifyIf.length === 0 && (
        <li className="text-xs text-slate-400 italic">None defined</li>
      )}
    </ul>
    <div className="flex gap-2">
      <input
        value={disqualifyIfInput}
        onChange={(e) => setDisqualifyIfInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (disqualifyIfInput.trim()) {
              setEditDisqualifyIf([...editDisqualifyIf, disqualifyIfInput.trim()]);
              setDisqualifyIfInput("");
            }
          }
        }}
        placeholder="Add rule..."
        className="flex-1 border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={() => {
          if (disqualifyIfInput.trim()) {
            setEditDisqualifyIf([...editDisqualifyIf, disqualifyIfInput.trim()]);
            setDisqualifyIfInput("");
          }
        }}
        className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
      >
        Add
      </button>
    </div>
  </div>
</div>
```

**Step 2: Commit**

```bash
git add app/app/masterminds-hq/cold-outreach/page.tsx
git commit -m "feat(cold-outreach): make Qualification Rules editable with inline editing"
```

---

### Task 5: Replace read-only Track Definitions with editable cards

**Files:**
- Modify: `app/app/masterminds-hq/cold-outreach/page.tsx` (lines ~727-750, Track Definitions section)

**Step 1: Replace the Track Definitions section**

Find `{/* Track Definitions */}`. Replace the entire section with:

```tsx
{/* Track Definitions (editable) */}
<div>
  <label className="block text-sm font-medium text-slate-700 mb-2">Track Definitions</label>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    {Object.entries(editTrackDefs).map(([trackKey, track]) => (
      <div key={trackKey} className="bg-slate-50 rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
            trackKey.toLowerCase().includes("a") || trackKey.toLowerCase().includes("collab")
              ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
          }`}>
            {trackKey}
          </span>
          <input
            value={track.name}
            onChange={(e) => setEditTrackDefs({ ...editTrackDefs, [trackKey]: { ...track, name: e.target.value } })}
            className="flex-1 text-sm font-semibold bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
            placeholder="Track name"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Criteria</label>
          <input
            value={track.criteria}
            onChange={(e) => setEditTrackDefs({ ...editTrackDefs, [trackKey]: { ...track, criteria: e.target.value } })}
            className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Angle</label>
          <input
            value={track.angle}
            onChange={(e) => setEditTrackDefs({ ...editTrackDefs, [trackKey]: { ...track, angle: e.target.value } })}
            className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
    ))}
  </div>
  {Object.keys(editTrackDefs).length === 0 && (
    <p className="text-xs text-slate-400 italic">No tracks defined</p>
  )}
</div>
```

**Step 2: Commit**

```bash
git add app/app/masterminds-hq/cold-outreach/page.tsx
git commit -m "feat(cold-outreach): make Track Definitions editable"
```

---

### Task 6: Replace read-only Format Rules with editable key-value editor

**Files:**
- Modify: `app/app/masterminds-hq/cold-outreach/page.tsx` (lines ~823-837, Format Rules section in Hook Writer)

**Step 1: Replace the Format Rules section**

Find the `{/* Format Rules */}` block inside the Hook Writer section. Replace the entire section with:

```tsx
{/* Format Rules (editable key-value) */}
<div>
  <label className="block text-sm font-medium text-slate-700 mb-1">Format Rules</label>
  <div className="space-y-2">
    {Object.entries(editFormatRules).map(([key, val]) => (
      <div key={key} className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-600 min-w-[140px] bg-slate-50 px-2 py-1.5 rounded-l-lg border border-slate-200 truncate">{key}</span>
        <input
          value={val}
          onChange={(e) => setEditFormatRules({ ...editFormatRules, [key]: e.target.value })}
          className="flex-1 border border-slate-300 rounded-r-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => {
            const next = { ...editFormatRules };
            delete next[key];
            setEditFormatRules(next);
          }}
          className="p-1 text-red-400 hover:text-red-600"
        >
          <X size={14} />
        </button>
      </div>
    ))}
    {Object.keys(editFormatRules).length === 0 && (
      <p className="text-xs text-slate-400 italic">No format rules</p>
    )}
    <div className="flex items-center gap-2 pt-1">
      <input
        value={newFormatKey}
        onChange={(e) => setNewFormatKey(e.target.value)}
        placeholder="Rule name..."
        className="w-36 border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        value={newFormatValue}
        onChange={(e) => setNewFormatValue(e.target.value)}
        placeholder="Rule value..."
        className="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={() => {
          if (newFormatKey.trim()) {
            setEditFormatRules({ ...editFormatRules, [newFormatKey.trim()]: newFormatValue.trim() });
            setNewFormatKey("");
            setNewFormatValue("");
          }
        }}
        className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
      >
        Add
      </button>
    </div>
  </div>
</div>
```

**Step 2: Commit**

```bash
git add app/app/masterminds-hq/cold-outreach/page.tsx
git commit -m "feat(cold-outreach): make Format Rules editable in Hook Writer"
```

---

### Task 7: Replace read-only Subject Line Formula with editable fields

**Files:**
- Modify: `app/app/masterminds-hq/cold-outreach/page.tsx` (lines ~880-894, Subject Line Formula section)

**Step 1: Replace the Subject Line Formula section**

Find `{/* Subject Line Formula */}`. Replace the entire section with:

```tsx
{/* Subject Line Formula (editable) */}
<div>
  <label className="block text-sm font-medium text-slate-700 mb-1">Subject Line Formula</label>
  <div className="space-y-2">
    {Object.entries(editSubjectFormula).map(([key, val]) => (
      <div key={key} className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-600 min-w-[140px] bg-slate-50 px-2 py-1.5 rounded-l-lg border border-slate-200">{key}</span>
        {typeof val === "boolean" ? (
          <label className="flex items-center gap-2 flex-1 px-3 py-1.5">
            <input
              type="checkbox"
              checked={val}
              onChange={(e) => setEditSubjectFormula({ ...editSubjectFormula, [key]: e.target.checked })}
              className="rounded border-slate-300"
            />
            <span className="text-sm text-slate-600">{val ? "Yes" : "No"}</span>
          </label>
        ) : typeof val === "number" ? (
          <input
            type="number"
            value={val}
            onChange={(e) => setEditSubjectFormula({ ...editSubjectFormula, [key]: Number(e.target.value) })}
            className="flex-1 border border-slate-300 rounded-r-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : Array.isArray(val) ? (
          <input
            value={val.join(", ")}
            onChange={(e) => setEditSubjectFormula({ ...editSubjectFormula, [key]: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })}
            className="flex-1 border border-slate-300 rounded-r-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Comma-separated values"
          />
        ) : (
          <input
            value={String(val)}
            onChange={(e) => setEditSubjectFormula({ ...editSubjectFormula, [key]: e.target.value })}
            className="flex-1 border border-slate-300 rounded-r-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>
    ))}
    {Object.keys(editSubjectFormula).length === 0 && (
      <p className="text-xs text-slate-400 italic">No subject line formula</p>
    )}
  </div>
</div>
```

**Step 2: Build and verify**

Run the full MC restart protocol (see top of plan).

**Step 3: Commit**

```bash
git add app/app/masterminds-hq/cold-outreach/page.tsx
git commit -m "feat(cold-outreach): make Subject Line Formula editable with type-aware inputs"
```

---

## STREAM 2: Test Mode

### Task 8: Add test mode types and state to the data hook

**Files:**
- Modify: `hooks/useColdOutreachData.ts`

**Step 1: Add TestModeResult interface**

After the existing `HookResult` interface (around line 67-80), add:

```tsx
export interface TestModeResult {
  prospect: { name: string; domain: string; email?: string; research?: string };
  hookResult: HookResult;
}
```

**Step 2: Add test mode batch function**

Inside `useColdOutreachData()`, after the `testHook` callback (around line 239), add:

```tsx
// Test mode batch (3 prospects)
const [testModeResults, setTestModeResults] = useState<TestModeResult[]>([]);
const [testModeLoading, setTestModeLoading] = useState(false);
const [testModeError, setTestModeError] = useState<string | null>(null);

const testModeBatch = useCallback(async (prospects: { name: string; domain: string; email?: string; research?: string }[]) => {
  if (!selectedIcpId) throw new Error("No ICP selected");
  setTestModeLoading(true);
  setTestModeResults([]);
  setTestModeError(null);
  try {
    const res = await fetch("/api/cold-outreach/test-hook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        icp_id: selectedIcpId,
        batch: prospects,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setTestModeError(data.error || "Failed to run test batch");
      return [];
    }
    setTestModeResults(data.results || []);
    return data.results || [];
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Test mode failed";
    setTestModeError(msg);
    return [];
  } finally {
    setTestModeLoading(false);
  }
}, [selectedIcpId]);

const rewriteHook = useCallback(async (prospect: { name: string; domain: string; email?: string; research?: string }, index: number) => {
  if (!selectedIcpId) return null;
  try {
    const res = await fetch("/api/cold-outreach/test-hook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        icp_id: selectedIcpId,
        prospect_name: prospect.name,
        prospect_domain: prospect.domain,
        prospect_email: prospect.email,
        research_notes: prospect.research,
      }),
    });
    const data = await res.json();
    if (!res.ok) return null;
    // Update the specific result in testModeResults
    setTestModeResults(prev => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { prospect, hookResult: data.hookResult };
      }
      return next;
    });
    return data.hookResult;
  } catch {
    return null;
  }
}, [selectedIcpId]);
```

**Step 3: Add new exports to the return object**

In the return statement (around line 324), add these fields:

```tsx
testModeResults,
testModeLoading,
testModeError,
testModeBatch,
rewriteHook,
```

**Step 4: Commit**

```bash
git add hooks/useColdOutreachData.ts
git commit -m "feat(cold-outreach): add test mode batch and rewrite hook functions to data hook"
```

---

### Task 9: Add batch mode to the test-hook API route

**Files:**
- Modify: `app/api/cold-outreach/test-hook/route.ts`

**Step 1: Extend the POST handler to support batch requests**

The existing handler processes a single prospect. We need to add a `batch` mode that processes an array of prospects. Replace the entire file content with:

```tsx
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { ICP_BASE, validateIcpId } from "../_db";

const execFileAsync = promisify(execFile);

// Simple in-memory rate limiter: max 10 requests per minute (raised for test mode)
const rateLimitWindow = 60_000;
const rateLimitMax = 10;
const requestTimestamps: number[] = [];

function checkRateLimit(): boolean {
  const now = Date.now();
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - rateLimitWindow) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= rateLimitMax) {
    return false;
  }
  requestTimestamps.push(now);
  return true;
}

async function generateHook(hookTemplate: Record<string, unknown>, prospect: { name: string; domain: string; email?: string; research?: string }) {
  const promptTemplate = hookTemplate.prompt_template as string;
  if (!promptTemplate) throw new Error("No prompt_template in hook template");

  const filledPrompt = promptTemplate
    .replace(/\{name\}/g, prospect.name)
    .replace(/\{domain\}/g, prospect.domain)
    .replace(/\{email\}/g, prospect.email || "not provided")
    .replace(/\{research\}/g, prospect.research || "No additional research provided");

  const { stdout } = await execFileAsync(
    "claude",
    [
      "--print",
      "--model", "claude-sonnet-4-6",
      "--max-tokens", "1024",
      filledPrompt,
    ],
    { timeout: 60_000 }
  );

  const textContent = stdout.trim();

  try {
    const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : textContent;
    return JSON.parse(jsonStr);
  } catch {
    return { raw_response: textContent };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { icp_id, batch } = body;

    if (!icp_id) {
      return NextResponse.json({ error: "icp_id is required" }, { status: 400 });
    }

    if (!validateIcpId(icp_id)) {
      return NextResponse.json({ error: "Invalid ICP ID format" }, { status: 400 });
    }

    if (!checkRateLimit()) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Max ${rateLimitMax} requests per minute.` },
        { status: 429 }
      );
    }

    // Read hook template
    const hookPath = path.join(ICP_BASE, icp_id, "hook_template.json");
    if (!fs.existsSync(hookPath)) {
      return NextResponse.json(
        { error: `Hook template not found for ICP: ${icp_id}. Configure one in the Hook Writer section.` },
        { status: 404 }
      );
    }

    const hookTemplate = JSON.parse(fs.readFileSync(hookPath, "utf-8"));

    if (!hookTemplate.prompt_template) {
      return NextResponse.json(
        { error: "Hook template has no prompt_template field." },
        { status: 400 }
      );
    }

    // Batch mode: process array of prospects
    if (Array.isArray(batch)) {
      const prospects = batch.slice(0, 3); // Cap at 3
      const results = [];
      for (const p of prospects) {
        if (!p.name || !p.domain) continue;
        try {
          const hookResult = await generateHook(hookTemplate, p);
          results.push({ prospect: p, hookResult });
        } catch (err) {
          results.push({
            prospect: p,
            hookResult: { raw_response: `Error: ${err instanceof Error ? err.message : "Unknown error"}` },
          });
        }
      }
      return NextResponse.json({ success: true, results });
    }

    // Single mode (original behavior)
    const { prospect_name, prospect_domain, prospect_email, research_notes } = body;

    if (!prospect_name || !prospect_domain) {
      return NextResponse.json(
        { error: "prospect_name and prospect_domain are required" },
        { status: 400 }
      );
    }

    const hookResult = await generateHook(hookTemplate, {
      name: prospect_name,
      domain: prospect_domain,
      email: prospect_email,
      research: research_notes,
    });

    return NextResponse.json({ success: true, hookResult });
  } catch (err) {
    console.error("cold-outreach test-hook POST error:", err);
    const message = err instanceof Error ? err.message : "Failed to test hook";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add app/api/cold-outreach/test-hook/route.ts
git commit -m "feat(cold-outreach): add batch mode to test-hook API for test mode"
```

---

### Task 10: Add Test Mode UI to the page

**Files:**
- Modify: `app/app/masterminds-hq/cold-outreach/page.tsx`

**Step 1: Add test mode imports and state**

In the import from `useColdOutreachData` (line ~29-32), add `TestModeResult` to the type imports:

```tsx
import {
  useColdOutreachData,
  type ICP,
  type HookTemplate,
  type TestModeResult,
} from "@/hooks/useColdOutreachData";
```

In the destructuring of `useColdOutreachData()` (around line 253-277), add the new fields:

```tsx
testModeResults,
testModeLoading,
testModeError,
testModeBatch,
rewriteHook,
```

Add test mode state variables after the existing state block (around line 314):

```tsx
// Test Mode
const [testModeEnabled, setTestModeEnabled] = useState(false);
const [testProspects, setTestProspects] = useState([
  { name: "", domain: "", email: "", research: "" },
  { name: "", domain: "", email: "", research: "" },
  { name: "", domain: "", email: "", research: "" },
]);
const [rewritingIndex, setRewritingIndex] = useState<number | null>(null);
```

**Step 2: Add the Test Mode panel**

Find `{/* Section C: Hook Tester */}` (around line 917). **Before** the Hook Tester section, add this new Test Mode section:

```tsx
{/* Section C: Test Mode */}
<div className="bg-white border-2 border-amber-300 rounded-xl p-6">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
      <Zap size={18} className="text-amber-500" />
      Test Mode
      {testModeEnabled && (
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 animate-pulse">
          ACTIVE
        </span>
      )}
    </h3>
    <button
      onClick={() => setTestModeEnabled(!testModeEnabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        testModeEnabled ? "bg-amber-500" : "bg-slate-300"
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        testModeEnabled ? "translate-x-6" : "translate-x-1"
      }`} />
    </button>
  </div>

  {testModeEnabled && (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Enter 3 test prospects. Hooks will be generated using your current ICP and hook template settings.
        Results display below for comparison. Nothing uploads to Instantly.
      </p>

      {/* Test Prospect Inputs */}
      <div className="space-y-3">
        {testProspects.map((tp, idx) => (
          <div key={idx} className="grid grid-cols-4 gap-2 items-center">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}.</span>
              <input
                value={tp.name}
                onChange={(e) => {
                  const next = [...testProspects];
                  next[idx] = { ...next[idx], name: e.target.value };
                  setTestProspects(next);
                }}
                placeholder="Name"
                className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <input
              value={tp.domain}
              onChange={(e) => {
                const next = [...testProspects];
                next[idx] = { ...next[idx], domain: e.target.value };
                setTestProspects(next);
              }}
              placeholder="Domain"
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <input
              value={tp.email}
              onChange={(e) => {
                const next = [...testProspects];
                next[idx] = { ...next[idx], email: e.target.value };
                setTestProspects(next);
              }}
              placeholder="Email (optional)"
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <input
              value={tp.research}
              onChange={(e) => {
                const next = [...testProspects];
                next[idx] = { ...next[idx], research: e.target.value };
                setTestProspects(next);
              }}
              placeholder="Research notes (optional)"
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          const filled = testProspects.filter(p => p.name.trim() && p.domain.trim());
          if (filled.length === 0) return;
          testModeBatch(filled);
        }}
        disabled={testModeLoading || testProspects.every(p => !p.name.trim() || !p.domain.trim())}
        className="flex items-center gap-2 px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium"
      >
        {testModeLoading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Play size={14} />
        )}
        {testModeLoading ? "Generating hooks..." : "Run Test (3 prospects)"}
      </button>

      {testModeError && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={14} className="flex-shrink-0" />
          {testModeError}
        </div>
      )}

      {/* Test Mode Results */}
      {testModeResults.length > 0 && (
        <div className="space-y-4 pt-2">
          <h4 className="text-sm font-bold text-slate-700">Results</h4>
          {testModeResults.map((result, idx) => (
            <div key={idx} className="border border-slate-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-900">
                    {idx + 1}. {result.prospect.name}
                  </span>
                  <span className="text-xs text-slate-400">{result.prospect.domain}</span>
                  {result.hookResult.qualified != null && (
                    <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                      result.hookResult.qualified ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {result.hookResult.qualified ? <CheckCircle size={10} /> : <XCircle size={10} />}
                      {result.hookResult.qualified ? "Qualified" : "DQ"}
                    </span>
                  )}
                  {result.hookResult.track && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      {result.hookResult.track}
                    </span>
                  )}
                  {result.hookResult.open_rating != null && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      Open: {result.hookResult.open_rating}/10
                    </span>
                  )}
                  {result.hookResult.response_likelihood != null && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                      Response: {result.hookResult.response_likelihood}/10
                    </span>
                  )}
                </div>
                <button
                  onClick={async () => {
                    setRewritingIndex(idx);
                    await rewriteHook(result.prospect, idx);
                    setRewritingIndex(null);
                  }}
                  disabled={rewritingIndex === idx}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {rewritingIndex === idx ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <RefreshCw size={12} />
                  )}
                  {rewritingIndex === idx ? "Rewriting..." : "Rewrite Hook"}
                </button>
              </div>

              {result.hookResult.raw_response ? (
                <pre className="text-xs text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-lg p-3">
                  {result.hookResult.raw_response}
                </pre>
              ) : (
                <>
                  {result.hookResult.subject && (
                    <p className="text-sm font-bold text-slate-900">{result.hookResult.subject}</p>
                  )}
                  {result.hookResult.hook && (
                    <blockquote className="border-l-4 border-amber-300 pl-4 py-2 bg-amber-50/50 rounded-r-lg text-sm text-slate-700 whitespace-pre-wrap">
                      {result.hookResult.hook}
                    </blockquote>
                  )}
                  {!result.hookResult.qualified && result.hookResult.disqualify_reason && (
                    <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                      DQ: {result.hookResult.disqualify_reason}
                    </p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )}
</div>
```

**Step 3: Commit**

```bash
git add app/app/masterminds-hq/cold-outreach/page.tsx
git commit -m "feat(cold-outreach): add Test Mode UI with 3-prospect batch and Rewrite Hook button"
```

---

### Task 11: Build, restart, and verify

**Step 1: Run the full MC restart protocol**

```bash
cd ~/.openclaw/workspace/mission-control
rm -rf .next && npm run build
launchctl unload ~/Library/LaunchAgents/ai.openclaw.mission-control.plist
sleep 2
pkill -f "next.*mission-control"
sleep 1
kill -9 $(pgrep -f "next.*mission-control") 2>/dev/null
sleep 1
launchctl load ~/Library/LaunchAgents/ai.openclaw.mission-control.plist
sleep 20
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/app/masterminds-hq/cold-outreach
curl -s http://localhost:3000/app/masterminds-hq/cold-outreach | grep -o 'link rel="stylesheet"'
```

Expected: `200` and `link rel="stylesheet"`

**Step 2: Verify API**

```bash
# Verify ICP list returns parsed JSON
curl -s http://localhost:3000/api/cold-outreach/icps | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d[\"icps\"])} ICPs loaded')"

# Verify single ICP returns all editable fields
curl -s "http://localhost:3000/api/cold-outreach/icps?id=icp_v1" | python3 -c "
import sys,json; d=json.load(sys.stdin)['icp']
print(f'target_profile keys: {list(d[\"target_profile\"].keys())[:3]}')
print(f'niche_categories count: {len(d[\"niche_categories\"])}')
print(f'must_have count: {len(d[\"qualification_rules\"][\"must_have\"])}')
print(f'tracks: {list(d[\"track_definitions\"].keys())}')
print(f'hookTemplate format_rules: {list(d[\"hookTemplate\"][\"format_rules\"].keys())[:3]}')
"
```

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(cold-outreach): complete editable ICP fields + test mode with rewrite hooks"
```

---

## Summary of changes

| File | What changed |
|------|-------------|
| `page.tsx` | 7 read-only sections become editable form fields; new Test Mode panel with toggle, 3-prospect inputs, results display, and Rewrite Hook buttons |
| `useColdOutreachData.ts` | Added `TestModeResult` type, `testModeBatch()`, `rewriteHook()` functions and their state |
| `test-hook/route.ts` | Refactored to extract `generateHook()` helper; added batch mode (accepts `batch` array, returns `results` array, caps at 3) |

No backend changes needed for editable ICP fields — the PUT handler already supports all fields.
