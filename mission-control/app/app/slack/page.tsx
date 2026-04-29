"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Settings,
  ChevronDown,
  ChevronRight,
  Clock,
  RefreshCw,
  Zap,
  FileText,
  Save,
  X,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Check,
} from "lucide-react";
import ApiKeyBanner from "@/components/ApiKeyBanner";

interface RuleFile {
  name: string;
  filename: string;
  content: string;
}

function useSlackRules() {
  const [rules, setRules] = useState<RuleFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/slack/rules");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRules(data.rules);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  const save = async (filename: string, content: string) => {
    const res = await fetch("/api/slack/rules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, content }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    await fetch_();
  };

  const create = async (name: string, content: string) => {
    const res = await fetch("/api/slack/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, content }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    await fetch_();
  };

  const remove = async (filename: string) => {
    const res = await fetch("/api/slack/rules", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    await fetch_();
  };

  return { rules, loading, error, refresh: fetch_, save, create, remove };
}

// ── Rule editor component ────────────────────────────────────────────

function RuleEditor({
  rule,
  onSave,
  onCancel,
}: {
  rule: RuleFile;
  onSave: (content: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [content, setContent] = useState(rule.content);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(content);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full h-96 font-mono font-dm-mono text-sm border border-dark-border rounded-lg p-4 focus:ring-2 focus:ring-cm-purple focus:border-cm-purple outline-none resize-y bg-dark-panel2 text-dark-text"
        spellCheck={false}
      />
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving || content === rule.content}
          className="flex items-center gap-1.5 px-4 py-2 bg-cm-purple text-white rounded-lg text-sm font-medium hover:bg-cm-purple/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 bg-dark-panel2 text-dark-muted rounded-lg text-sm font-medium hover:bg-dark-panel2 transition-colors"
        >
          <X size={14} />
          Cancel
        </button>
        {content !== rule.content && (
          <span className="text-xs text-dark-warn ml-2">Unsaved changes</span>
        )}
      </div>
    </div>
  );
}

// ── New rule form ────────────────────────────────────────────────────

function NewRuleForm({
  onCreate,
  onCancel,
}: {
  onCreate: (name: string, content: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("# New Rule\n\n");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onCreate(name.trim(), content);
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 p-4 bg-dark-panel2 rounded-lg border border-dark-border">
      <div>
        <label className="block text-sm font-medium text-dark-text mb-1">
          Rule Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. rio-workspace"
          className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm bg-dark-panel text-dark-text placeholder:text-dark-muted focus:ring-2 focus:ring-cm-purple focus:border-cm-purple outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-dark-text mb-1">
          Content (Markdown)
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-48 font-mono font-dm-mono text-sm border border-dark-border rounded-lg p-3 bg-dark-panel text-dark-text placeholder:text-dark-muted focus:ring-2 focus:ring-cm-purple focus:border-cm-purple outline-none resize-y"
          spellCheck={false}
        />
      </div>
      {error && (
        <p className="text-sm text-dark-danger">{error}</p>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={handleCreate}
          disabled={saving || !name.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-cm-purple text-white rounded-lg text-sm font-medium hover:bg-cm-purple/80 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Plus size={14} />
          )}
          Create
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 bg-dark-panel text-dark-muted rounded-lg text-sm font-medium hover:bg-dark-panel2 transition-colors"
        >
          <X size={14} />
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Rule card ────────────────────────────────────────────────────────

function RuleCard({
  rule,
  onSave,
  onDelete,
}: {
  rule: RuleFile;
  onSave: (filename: string, content: string) => Promise<void>;
  onDelete: (filename: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (content: string) => {
    await onSave(rule.filename, content);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = async () => {
    await onDelete(rule.filename);
  };

  const lineCount = rule.content.split("\n").length;
  const title = rule.content.split("\n")[0]?.replace(/^#+\s*/, "") || rule.name;

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 min-w-0">
          <FileText size={18} className="text-cm-purple flex-shrink-0" />
          <div className="min-w-0">
            <h4 className="font-medium text-dark-text truncate">{title}</h4>
            <p className="text-xs text-dark-muted">
              {rule.filename} &middot; {lineCount} lines
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {saved && (
            <span className="flex items-center gap-1 text-xs text-dark-success mr-2">
              <Check size={12} /> Saved
            </span>
          )}
          <button
            onClick={() => setEditing(!editing)}
            className={`p-1.5 rounded-lg transition-colors ${
              editing
                ? "bg-cm-purple/15 text-cm-purple"
                : "text-dark-muted hover:text-dark-text hover:bg-dark-panel2"
            }`}
            title={editing ? "Close editor" : "Edit"}
          >
            {editing ? <X size={16} /> : <Pencil size={16} />}
          </button>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 text-dark-muted hover:text-dark-danger hover:bg-dark-danger/10 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDelete}
                className="px-2 py-1 text-xs bg-dark-danger text-white rounded hover:opacity-80"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 text-xs bg-dark-panel2 text-dark-muted rounded hover:bg-dark-panel2"
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Preview when not editing */}
      {!editing && (
        <div className="px-4 pb-4">
          <pre className="text-xs text-dark-muted bg-dark-panel2 rounded-lg p-3 max-h-48 overflow-auto whitespace-pre-wrap font-mono font-dm-mono border border-dark-border">
            {rule.content}
          </pre>
        </div>
      )}

      {/* Editor */}
      {editing && (
        <div className="px-4 pb-4">
          <RuleEditor
            rule={rule}
            onSave={handleSave}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────

export default function SlackPage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [capabilitiesOpen, setCapabilitiesOpen] = useState(false);
  const [addingRule, setAddingRule] = useState(false);
  const { rules, loading, error, refresh, save, create, remove } =
    useSlackRules();

  const handleCreate = async (name: string, content: string) => {
    await create(name, content);
    setAddingRule(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ApiKeyBanner slug="slack" />
      {/* 1. Hero / Overview */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <div className="flex items-center gap-4">
          <div className="text-4xl">#</div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-dark-text">Slack Agent</h1>
            <p className="text-dark-muted mt-1">
              Sends and reads Slack messages via the Slack Web API. Supports
              channels, DMs, and message search.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-dark-success rounded-full"></div>
            <span className="text-sm text-dark-muted">Idle</span>
          </div>
        </div>
      </div>

      {/* 2. Rules & Instructions */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold tracking-tight text-dark-text flex items-center gap-2">
            <FileText size={18} className="text-cm-purple" />
            Workspace Rules &amp; Instructions
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={loading}
              className="p-1.5 text-dark-muted hover:text-dark-text transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
            </button>
            <button
              onClick={() => setAddingRule(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-purple text-white rounded-lg text-xs font-medium hover:bg-cm-purple/80 transition-colors"
            >
              <Plus size={14} />
              Add Rule
            </button>
          </div>
        </div>

        <p className="text-xs text-dark-muted mb-4">
          These markdown files in{" "}
          <code className="bg-dark-panel2 px-1 rounded">
            agents/slack/data/
          </code>{" "}
          define workspace channels, message formats, and instructions the
          agent follows.
        </p>

        {error && (
          <div className="p-3 bg-dark-danger/10 border border-dark-danger/30 rounded-lg mb-4">
            <p className="text-sm text-dark-danger">{error}</p>
          </div>
        )}

        {loading && rules.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-dark-muted" />
          </div>
        )}

        {addingRule && (
          <div className="mb-4">
            <NewRuleForm
              onCreate={handleCreate}
              onCancel={() => setAddingRule(false)}
            />
          </div>
        )}

        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleCard
              key={rule.filename}
              rule={rule}
              onSave={save}
              onDelete={remove}
            />
          ))}
        </div>

        {!loading && rules.length === 0 && !addingRule && (
          <div className="text-center py-8">
            <FileText size={28} className="text-dark-muted mx-auto mb-2 opacity-40" />
            <p className="text-sm text-dark-muted">No rules files yet</p>
            <p className="text-xs text-dark-muted mt-1">
              Add workspace rules, channel formats, and instructions
            </p>
          </div>
        )}
      </div>

      {/* 3. Settings Panel */}
      <div className="bg-dark-panel rounded-xl border border-dark-border">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="w-full flex items-center justify-between p-5 hover:bg-dark-panel2 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-3">
            <Settings size={20} className="text-dark-muted" />
            <span className="font-semibold tracking-tight text-dark-text">Settings</span>
          </div>
          {settingsOpen ? (
            <ChevronDown size={20} className="text-dark-muted" />
          ) : (
            <ChevronRight size={20} className="text-dark-muted" />
          )}
        </button>
        {settingsOpen && (
          <div className="px-5 pb-5 space-y-4 border-t border-dark-border pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-text mb-1">
                  API Token
                </label>
                <code className="text-sm bg-dark-panel2 px-3 py-1.5 rounded-lg block text-dark-muted font-dm-mono">
                  SLACK_BOT_TOKEN (in .env)
                </code>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text mb-1">
                  Telegram Commands
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm bg-dark-panel2 px-2 py-1 rounded text-dark-muted font-dm-mono">
                    /slack
                  </code>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text mb-1">
                Agent Location
              </label>
              <code className="text-sm bg-dark-panel2 px-3 py-1.5 rounded-lg block text-dark-muted font-dm-mono">
                ~/.openclaw/workspace/agents/slack/
              </code>
              <p className="text-xs text-dark-muted mt-1">
                Rules stored in: agents/slack/data/*.md
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 4. Capabilities */}
      <div className="bg-dark-panel rounded-xl border border-dark-border">
        <button
          onClick={() => setCapabilitiesOpen(!capabilitiesOpen)}
          className="w-full flex items-center justify-between p-5 hover:bg-dark-panel2 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-3">
            <Zap size={20} className="text-dark-muted" />
            <span className="font-semibold tracking-tight text-dark-text">
              What It Can Do
            </span>
          </div>
          {capabilitiesOpen ? (
            <ChevronDown size={20} className="text-dark-muted" />
          ) : (
            <ChevronRight size={20} className="text-dark-muted" />
          )}
        </button>
        {capabilitiesOpen && (
          <div className="px-5 pb-5 space-y-4 border-t border-dark-border pt-4">
            <div className="space-y-3">
              <div className="p-4 bg-cm-purple/10 rounded-lg border border-cm-purple/20">
                <h4 className="font-medium text-cm-purple">Send Messages</h4>
                <p className="text-sm text-dark-muted mt-1">
                  Post messages to any channel or DM. Example:{" "}
                  <code className="bg-cm-purple/15 px-1 rounded text-cm-purple">
                    /slack send #general &quot;Hey team!&quot;
                  </code>
                </p>
              </div>
              <div className="p-4 bg-cm-purple/10 rounded-lg border border-cm-purple/20">
                <h4 className="font-medium text-cm-purple">Read Channels</h4>
                <p className="text-sm text-dark-muted mt-1">
                  Fetch recent messages from any channel or conversation.
                  Returns formatted messages with timestamps and authors.
                </p>
              </div>
              <div className="p-4 bg-cm-purple/10 rounded-lg border border-cm-purple/20">
                <h4 className="font-medium text-cm-purple">
                  Search Messages
                </h4>
                <p className="text-sm text-dark-muted mt-1">
                  Search across workspace messages by keyword, user, or
                  channel. Example:{" "}
                  <code className="bg-cm-purple/15 px-1 rounded text-cm-purple">
                    /slack search &quot;deployment status&quot;
                  </code>
                </p>
              </div>
              <div className="p-4 bg-cm-purple/10 rounded-lg border border-cm-purple/20">
                <h4 className="font-medium text-cm-purple">
                  Channel Management
                </h4>
                <p className="text-sm text-dark-muted mt-1">
                  List channels, get channel info, and manage workspace
                  conversations programmatically.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Status / Activity */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <h3 className="font-semibold tracking-tight text-dark-text mb-4 flex items-center gap-2">
          <RefreshCw size={18} className="text-dark-muted" />
          Recent Activity
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-dark-panel2 rounded-lg">
            <Clock size={16} className="text-dark-muted" />
            <span className="text-sm text-dark-muted">
              Agent registered. Configure SLACK_BOT_TOKEN in .env to activate.
            </span>
          </div>
          <div className="text-xs text-dark-muted mt-2">
            Trigger via Telegram:{" "}
            <code className="bg-dark-panel2 px-1.5 py-0.5 rounded font-dm-mono">
              /slack
            </code>{" "}
            or invoke directly from Claude Code.
          </div>
        </div>
      </div>
    </div>
  );
}
