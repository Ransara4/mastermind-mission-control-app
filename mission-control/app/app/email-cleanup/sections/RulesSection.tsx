"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Power,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Save,
  X,
} from "lucide-react";

interface Rule {
  _id: string;
  name: string;
  query: string;
  description: string;
  enabled: boolean;
  priority: number;
  type?: string;
  action?: string;
  condition?: string;
  targetLabel?: string;
  ageThresholdDays?: number;
  maxPerRun?: number;
}

export default function RulesSection() {
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "age" as "age" | "sender" | "label" | "category" | "custom",
    action: "delete" as "delete" | "archive" | "file",
    condition: "",
    targetLabel: "",
    ageThresholdDays: 30,
    enabled: true,
    priority: 5,
    maxPerRun: 100,
  });

  useEffect(() => {
    fetch("/api/emmie/config")
      .then((r) => r.json())
      .then((data) => setRules(data.rules || []))
      .catch(() => setRules([]));
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "age",
      action: "delete",
      condition: "",
      targetLabel: "",
      ageThresholdDays: 30,
      enabled: true,
      priority: 5,
      maxPerRun: 100,
    });
    setIsCreating(false);
    setEditingId(null);
  };

  const handleCreate = async () => {
    try {
      const res = await fetch("/api/emmie/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRules((prev) => [...(prev || []), data.rule]);
      resetForm();
    } catch {
      alert("Failed to create rule");
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    try {
      const res = await fetch("/api/emmie/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...formData }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRules((prev) =>
        (prev || []).map((r) => (r._id === editingId ? data.rule : r))
      );
      resetForm();
    } catch {
      alert("Failed to update rule");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this rule?")) {
      try {
        const res = await fetch(`/api/emmie/config?id=${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error();
        setRules((prev) => (prev || []).filter((r) => r._id !== id));
      } catch {
        alert("Failed to delete rule");
      }
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await fetch("/api/emmie/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRules((prev) =>
        (prev || []).map((r) => (r._id === id ? data.rule : r))
      );
    } catch {
      alert("Failed to toggle rule");
    }
  };

  const startEdit = (rule: Rule) => {
    setFormData({
      name: rule.name,
      description: rule.description || "",
      type: (rule.type as any) || "age",
      action: (rule.action as any) || "delete",
      condition: rule.condition || rule.query || "",
      targetLabel: rule.targetLabel || "",
      ageThresholdDays: rule.ageThresholdDays || 30,
      enabled: rule.enabled,
      priority: rule.priority,
      maxPerRun: rule.maxPerRun || 100,
    });
    setEditingId(rule._id);
    setIsCreating(false);
  };

  const ruleTemplates = [
    {
      name: "Old Promotions Cleanup",
      type: "category" as const,
      action: "delete" as const,
      condition: "category:promotions older_than:30d -is:starred",
      ageThresholdDays: 30,
    },
    {
      name: "Social Notifications Archive",
      type: "category" as const,
      action: "archive" as const,
      condition: "category:social older_than:7d -is:starred",
      ageThresholdDays: 7,
    },
    {
      name: "Newsletter Cleanup",
      type: "sender" as const,
      action: "delete" as const,
      condition: "from:newsletter@example.com older_than:14d",
      ageThresholdDays: 14,
    },
  ];

  const applyTemplate = (template: any) => {
    setFormData({
      ...formData,
      ...template,
    });
    setIsCreating(true);
  };

  if (rules === null) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold  text-dark-text mb-2">
            Rules & Instructions
          </h1>
          <p className="text-dark-muted">
            Configure Emmie's cleanup behavior with custom rules
          </p>
        </div>
        {!isCreating && !editingId && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple transition-colors"
          >
            <Plus size={18} />
            <span>New Rule</span>
          </button>
        )}
      </div>

      {/* Rule Templates (shown when creating) */}
      {isCreating && !formData.name && (
        <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
          <h3 className="font-bold  text-dark-text mb-4">
            Quick Templates
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ruleTemplates.map((template, idx) => (
              <button
                key={idx}
                onClick={() => applyTemplate(template)}
                className="text-left p-4 border border-dark-border rounded-lg hover:border-cm-purple hover:bg-cm-purple/10 transition-all"
              >
                <p className="font-medium text-dark-text mb-1">
                  {template.name}
                </p>
                <p className="text-xs text-dark-muted">
                  {template.action} · {template.ageThresholdDays} days
                </p>
              </button>
            ))}
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-dark-muted mb-2">Or create from scratch</p>
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (
        <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold  text-dark-text">
              {editingId ? "Edit Rule" : "Create New Rule"}
            </h3>
            <button
              onClick={resetForm}
              className="text-dark-muted hover:text-dark-text"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  Rule Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-dark-border rounded-lg focus:ring-2 focus:ring-cm-purple focus:border-cm-purple"
                  placeholder="e.g., Old Promotions Cleanup"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 border border-dark-border rounded-lg focus:ring-2 focus:ring-cm-purple focus:border-cm-purple"
                >
                  <option value="age">Age-based</option>
                  <option value="sender">Sender-based</option>
                  <option value="label">Label-based</option>
                  <option value="category">Category-based</option>
                  <option value="custom">Custom Query</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-dark-border rounded-lg focus:ring-2 focus:ring-cm-purple focus:border-cm-purple"
                rows={2}
                placeholder="What does this rule do?"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  Action *
                </label>
                <select
                  value={formData.action}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      action: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 border border-dark-border rounded-lg focus:ring-2 focus:ring-cm-purple focus:border-cm-purple"
                >
                  <option value="delete">Delete</option>
                  <option value="archive">Archive</option>
                  <option value="file">File to Label</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  Age Threshold (days)
                </label>
                <input
                  type="number"
                  value={formData.ageThresholdDays}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      ageThresholdDays: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-dark-border rounded-lg focus:ring-2 focus:ring-cm-purple focus:border-cm-purple"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  Max Per Run
                </label>
                <input
                  type="number"
                  value={formData.maxPerRun}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxPerRun: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-dark-border rounded-lg focus:ring-2 focus:ring-cm-purple focus:border-cm-purple"
                  min="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">
                Gmail Search Condition *
              </label>
              <input
                type="text"
                value={formData.condition}
                onChange={(e) =>
                  setFormData({ ...formData, condition: e.target.value })
                }
                className="w-full px-3 py-2 border border-dark-border rounded-lg focus:ring-2 focus:ring-cm-purple focus:border-cm-purple font-mono font-dm-mono text-sm"
                placeholder="e.g., category:promotions older_than:30d -is:starred"
              />
              <p className="text-xs text-dark-muted mt-1">
                Use Gmail search syntax
              </p>
            </div>

            {formData.action === "file" && (
              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  Target Label
                </label>
                <input
                  type="text"
                  value={formData.targetLabel}
                  onChange={(e) =>
                    setFormData({ ...formData, targetLabel: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-dark-border rounded-lg focus:ring-2 focus:ring-cm-purple focus:border-cm-purple"
                  placeholder="e.g., Archive/Old"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  Priority (higher = runs first)
                </label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-dark-border rounded-lg focus:ring-2 focus:ring-cm-purple focus:border-cm-purple"
                  min="0"
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) =>
                      setFormData({ ...formData, enabled: e.target.checked })
                    }
                    className="w-4 h-4 text-cm-purple border-dark-border rounded focus:ring-cm-purple"
                  />
                  <span className="text-sm font-medium text-dark-text">
                    Enabled
                  </span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                onClick={editingId ? handleUpdate : handleCreate}
                className="flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple transition-colors"
                disabled={!formData.name || !formData.condition}
              >
                <Save size={18} />
                <span>{editingId ? "Update Rule" : "Create Rule"}</span>
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 text-dark-muted hover:text-dark-text transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="space-y-3">
        {rules.length === 0 ? (
          <div className="bg-dark-panel rounded-lg border border-dark-border p-8 text-center">
            <AlertCircle size={48} className="mx-auto mb-4 text-dark-muted" />
            <p className="text-dark-muted">No rules configured yet</p>
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule._id}
              className={`bg-dark-panel rounded-lg border ${
                rule.enabled ? "border-dark-border" : "border-dark-border opacity-60"
              } overflow-hidden`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold  text-dark-text">
                        {rule.name}
                      </h3>
                      {rule.action && (
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            rule.action === "delete"
                              ? "bg-dark-danger/20 text-dark-danger"
                              : rule.action === "archive"
                              ? "bg-cm-purple/20 text-cm-purple"
                              : "bg-cm-purple/20 text-cm-purple"
                          }`}
                        >
                          {rule.action}
                        </span>
                      )}
                      {rule.type && (
                        <span className="px-2 py-1 text-xs font-medium rounded bg-dark-panel2 text-dark-text">
                          {rule.type}
                        </span>
                      )}
                      {!rule.enabled && (
                        <span className="px-2 py-1 text-xs font-medium rounded bg-dark-warn/20 text-dark-warn">
                          Disabled
                        </span>
                      )}
                    </div>
                    {rule.description && (
                      <p className="text-sm text-dark-muted mb-2">
                        {rule.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-dark-muted">
                      <span>Priority: {rule.priority}</span>
                      {rule.ageThresholdDays && (
                        <span>{rule.ageThresholdDays} days</span>
                      )}
                      {rule.maxPerRun && <span>Max: {rule.maxPerRun}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(rule._id)}
                      className={`p-2 rounded-lg transition-colors ${
                        rule.enabled
                          ? "bg-dark-success/20 text-dark-success hover:bg-dark-success/30"
                          : "bg-dark-panel2 text-dark-muted hover:bg-dark-panel2"
                      }`}
                      title={rule.enabled ? "Disable" : "Enable"}
                    >
                      <Power size={16} />
                    </button>
                    <button
                      onClick={() =>
                        setExpandedRuleId(
                          expandedRuleId === rule._id ? null : rule._id
                        )
                      }
                      className="p-2 rounded-lg hover:bg-dark-panel2 transition-colors"
                    >
                      {expandedRuleId === rule._id ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>
                    <button
                      onClick={() => startEdit(rule)}
                      className="p-2 rounded-lg hover:bg-cm-purple/20 text-cm-purple transition-colors"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(rule._id)}
                      className="p-2 rounded-lg hover:bg-dark-danger/20 text-dark-danger transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {expandedRuleId === rule._id && (
                  <div className="mt-4 pt-4 border-t border-dark-border">
                    <div className="bg-dark-bg rounded p-3">
                      <p className="text-xs text-dark-muted mb-1 font-medium">
                        Condition:
                      </p>
                      <code className="text-xs text-dark-text font-mono font-dm-mono">
                        {rule.condition || rule.query}
                      </code>
                    </div>
                    {rule.targetLabel && (
                      <div className="mt-2 bg-dark-bg rounded p-3">
                        <p className="text-xs text-dark-muted mb-1 font-medium">
                          Target Label:
                        </p>
                        <code className="text-xs text-dark-text font-mono font-dm-mono">
                          {rule.targetLabel}
                        </code>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
