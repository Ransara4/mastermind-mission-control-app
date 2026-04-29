"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Shield, Search } from "lucide-react";

interface WhitelistEntry {
  id: string;
  email: string;
  name?: string;
  reason?: string;
  pattern?: string;
  addedAt: number;
}

export default function WhitelistSection() {
  const [whitelist, setWhitelist] = useState<WhitelistEntry[] | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    reason: "",
    pattern: "",
  });

  useEffect(() => {
    fetch("/api/emmie/whitelist")
      .then((r) => r.json())
      .then((data) => setWhitelist(data.whitelist || []))
      .catch(() => setWhitelist([]));
  }, []);

  const handleAdd = async () => {
    if (!formData.email) {
      alert("Email is required");
      return;
    }

    try {
      const res = await fetch("/api/emmie/whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setWhitelist((prev) => [...(prev || []), data.entry]);
      setFormData({ email: "", name: "", reason: "", pattern: "" });
      setIsAdding(false);
    } catch (err: any) {
      alert(err.message || "Failed to add to whitelist");
    }
  };

  const handleRemove = async (id: string) => {
    if (confirm("Remove this sender from the whitelist?")) {
      try {
        const res = await fetch(`/api/emmie/whitelist?id=${id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        setWhitelist((prev) => (prev || []).filter((e) => e.id !== id));
      } catch {
        alert("Failed to remove from whitelist");
      }
    }
  };

  const filteredWhitelist = whitelist?.filter((item) =>
    item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (whitelist === null) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold  text-dark-text mb-2">
            Whitelist
          </h1>
          <p className="text-dark-muted">
            Protected senders that Emmie will never delete or archive
          </p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple transition-colors"
          >
            <Plus size={18} />
            <span>Add Sender</span>
          </button>
        )}
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
          <h3 className="text-lg font-bold  text-dark-text mb-4">
            Add to Whitelist
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-dark-border rounded-lg focus:ring-2 focus:ring-cm-purple focus:border-cm-purple"
                  placeholder="sender@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  Name (optional)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-dark-border rounded-lg focus:ring-2 focus:ring-cm-purple focus:border-cm-purple"
                  placeholder="e.g., John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">
                Reason (optional)
              </label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                className="w-full px-3 py-2 border border-dark-border rounded-lg focus:ring-2 focus:ring-cm-purple focus:border-cm-purple"
                placeholder="Why is this sender protected?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">
                Pattern (optional)
              </label>
              <input
                type="text"
                value={formData.pattern}
                onChange={(e) =>
                  setFormData({ ...formData, pattern: e.target.value })
                }
                className="w-full px-3 py-2 border border-dark-border rounded-lg focus:ring-2 focus:ring-cm-purple focus:border-cm-purple"
                placeholder="e.g., @company.com or *@domain.com"
              />
              <p className="text-xs text-dark-muted mt-1">
                Use patterns to protect entire domains
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple transition-colors"
              >
                Add to Whitelist
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setFormData({ email: "", name: "", reason: "", pattern: "" });
                }}
                className="px-4 py-2 text-dark-muted hover:text-dark-text transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-dark-panel rounded-lg border border-dark-border p-4">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search whitelist..."
            className="w-full pl-10 pr-4 py-2 border border-dark-border rounded-lg focus:ring-2 focus:ring-cm-purple focus:border-cm-purple"
          />
        </div>
      </div>

      {/* Whitelist */}
      <div className="space-y-3">
        {filteredWhitelist && filteredWhitelist.length === 0 ? (
          <div className="bg-dark-panel rounded-lg border border-dark-border p-8 text-center">
            <Shield size={48} className="mx-auto mb-4 text-dark-muted" />
            <p className="text-dark-muted">
              {searchTerm ? "No matching senders" : "No whitelisted senders yet"}
            </p>
          </div>
        ) : (
          filteredWhitelist?.map((item) => (
            <div
              key={item.id}
              className="bg-dark-panel rounded-lg border border-dark-border p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-dark-success/20 rounded-lg">
                    <Shield size={20} className="text-dark-success" />
                  </div>
                  <div>
                    <h3 className="font-bold  text-dark-text">
                      {item.name || item.email}
                    </h3>
                    {item.name && (
                      <p className="text-sm text-dark-muted">{item.email}</p>
                    )}
                    {item.reason && (
                      <p className="text-xs text-dark-muted mt-1">
                        {item.reason}
                      </p>
                    )}
                    {item.pattern && (
                      <p className="text-xs text-cm-purple mt-1">
                        Pattern: {item.pattern}
                      </p>
                    )}
                    <p className="text-xs text-dark-muted mt-1">
                      Added {new Date(item.addedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(item.id)}
                  className="p-2 rounded-lg hover:bg-dark-danger/20 text-dark-danger transition-colors"
                  title="Remove from whitelist"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stats */}
      <div className="bg-gradient-to-r from-cm-purple to-cm-purple/60 text-white rounded-lg p-6">
        <h3 className="text-lg font-bold mb-2">Protected Senders</h3>
        <p className="text-3xl font-bold">{whitelist.length}</p>
        <p className="text-sm text-dark-muted mt-1">
          These senders are safe from automated cleanup
        </p>
      </div>
    </div>
  );
}
