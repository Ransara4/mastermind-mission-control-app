"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  AlertCircle,
  Settings,
  BarChart3,
  FileText,
  TestTube,
  Loader2,
  Play,
} from "lucide-react";
import UncertainEmailsSection from "./sections/UncertainEmailsSection";
import ApiKeyBanner from "@/components/ApiKeyBanner";

// Real data sections
const RulesSection = ({ rules, loading }: { rules: any[]; loading: boolean }) => (
  <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
    <h2 className="text-xl font-bold  text-dark-text mb-4">Rules & Instructions</h2>
    <p className="text-dark-muted mb-4">Active cleanup rules from gmail-cleanup script.</p>
    
    {loading ? (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-dark-muted" size={24} />
      </div>
    ) : rules.length > 0 ? (
      <div className="space-y-3">
        {rules.map((rule: any) => (
          <div
            key={rule._id}
            className={`p-4 rounded-lg border ${
              rule.enabled
                ? 'bg-dark-success/10 border-dark-success/30'
                : 'bg-dark-bg border-dark-border'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold  text-dark-text">{rule.name}</h3>
                  {rule.enabled ? (
                    <span className="px-2 py-0.5 bg-dark-success text-white text-xs font-medium rounded">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-dark-muted text-white text-xs font-medium rounded">
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-sm text-dark-muted mb-2">{rule.description}</p>
                <code className="text-xs bg-dark-panel2 px-2 py-1 rounded text-dark-text">
                  {rule.query}
                </code>
              </div>
              <div className="ml-4 text-sm text-dark-muted">
                Priority: {rule.priority}
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="text-center py-8">
        <p className="text-dark-muted">No cleanup rules configured yet</p>
        <p className="text-sm text-dark-muted mt-2">
          Add search_and_trash calls to the gmail-cleanup script
        </p>
      </div>
    )}
  </div>
);

const WhitelistSection = () => {
  const [whitelist, setWhitelist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    reason: '',
    pattern: ''
  });

  const fetchWhitelist = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/emmie/whitelist');
      const data = await res.json();
      setWhitelist(data.whitelist || []);
    } catch (error) {
      console.error('Error fetching whitelist:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWhitelist();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name && !formData.email && !formData.pattern) {
      alert('Please provide at least a name, email, or pattern');
      return;
    }

    try {
      setAdding(true);
      const res = await fetch('/api/emmie/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setFormData({ name: '', email: '', reason: '', pattern: '' });
        setShowForm(false);
        await fetchWhitelist();
      } else {
        alert('Failed to add entry');
      }
    } catch (error) {
      console.error('Error adding entry:', error);
      alert('Error adding entry');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this entry from the whitelist?')) {
      return;
    }

    try {
      setDeleting(id);
      const res = await fetch(`/api/emmie/whitelist?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await fetchWhitelist();
      } else {
        alert('Failed to delete entry');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Error deleting entry');
    } finally {
      setDeleting(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear the entire whitelist? This cannot be undone!')) {
      return;
    }

    try {
      for (const entry of whitelist) {
        await fetch(`/api/emmie/whitelist?id=${entry.id}`, {
          method: 'DELETE'
        });
      }
      await fetchWhitelist();
    } catch (error) {
      console.error('Error clearing whitelist:', error);
      alert('Error clearing whitelist');
    }
  };

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold  text-dark-text">Whitelist</h2>
          <p className="text-dark-muted text-sm mt-1">
            Add senders here to prevent their emails from being deleted
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors text-sm font-medium"
        >
          {showForm ? 'Cancel' : '+ Add to Whitelist'}
        </button>
      </div>

      {/* Instructions */}
      <div className="mb-6 p-4 bg-cm-purple/10 border border-cm-purple/30 rounded-lg">
        <h3 className="font-bold  text-cm-purple mb-2">How Whitelisting Works</h3>
        <p className="text-cm-purple text-sm mb-3">
          Protected senders will never have their emails automatically deleted by Emmie. 
          You can whitelist by:
        </p>
        <ul className="text-cm-purple text-sm space-y-1 list-disc list-inside">
          <li><strong>Name:</strong> Person or organization name (e.g., "Jay Shetty", "Audible")</li>
          <li><strong>Email:</strong> Exact email address (e.g., "operations@mikibeach.com")</li>
          <li><strong>Domain:</strong> All emails from domain (e.g., "domain:gmail.com")</li>
          <li><strong>Pattern:</strong> Match multiple senders (e.g., "pattern:noreply-*")</li>
        </ul>
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleAdd} className="mb-6 p-4 bg-dark-bg border border-dark-border rounded-lg">
          <h3 className="font-bold  text-dark-text mb-3">Add New Entry</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-dark-text mb-1">
                Name (person/organization)
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-cm-purple"
                placeholder="e.g., Jay Shetty, Audible"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text mb-1">
                Email address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-cm-purple"
                placeholder="e.g., contact@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text mb-1">
                Pattern (optional)
              </label>
              <input
                type="text"
                value={formData.pattern}
                onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                className="w-full px-3 py-2 border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-cm-purple"
                placeholder="e.g., domain:gmail.com, pattern:noreply-*"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text mb-1">
                Reason (optional)
              </label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-cm-purple"
                placeholder="Why is this whitelisted?"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={adding}
              className="px-4 py-2 bg-dark-success text-white rounded-lg hover:bg-dark-success/30 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {adding ? 'Adding...' : 'Add Entry'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-dark-panel2 text-dark-text rounded-lg hover:bg-dark-panel2 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Whitelist Table */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-dark-muted" size={24} />
        </div>
      ) : whitelist.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-dark-text">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-dark-text">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-dark-text">Pattern</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-dark-text">Reason</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-dark-text">Actions</th>
                </tr>
              </thead>
              <tbody>
                {whitelist.map((entry: any) => (
                  <tr key={entry.id} className="border-b border-dark-border hover:bg-dark-bg">
                    <td className="py-3 px-4 text-sm text-dark-text">
                      {entry.name || <span className="text-dark-muted">—</span>}
                    </td>
                    <td className="py-3 px-4 text-sm text-dark-text">
                      {entry.email || <span className="text-dark-muted">—</span>}
                    </td>
                    <td className="py-3 px-4 text-sm text-dark-text">
                      {entry.pattern ? (
                        <code className="px-2 py-1 bg-dark-panel2 rounded text-xs">{entry.pattern}</code>
                      ) : (
                        <span className="text-dark-muted">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-dark-muted">
                      {entry.reason || <span className="text-dark-muted">—</span>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deleting === entry.id}
                        className="text-dark-danger hover:text-dark-danger text-sm font-medium disabled:opacity-50"
                      >
                        {deleting === entry.id ? 'Removing...' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 pt-4 border-t border-dark-border flex items-center justify-between">
            <p className="text-sm text-dark-muted">
              {whitelist.length} {whitelist.length === 1 ? 'entry' : 'entries'} in whitelist
            </p>
            <button
              onClick={handleClearAll}
              className="text-sm text-dark-danger hover:text-dark-danger font-medium"
            >
              Clear All
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <Shield size={48} className="mx-auto text-dark-muted mb-3" />
          <p className="text-dark-muted">No whitelist entries yet</p>
          <p className="text-sm text-dark-muted mt-2">
            Click "Add to Whitelist" to protect important senders
          </p>
        </div>
      )}
    </div>
  );
};

// UncertainEmailsSection is now imported from ./sections/UncertainEmailsSection

const MetricsSection = ({ metrics, dailyStats, platformStats, loading }: any) => (
  <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
    <h2 className="text-xl font-bold  text-dark-text mb-4">Metrics</h2>
    <p className="text-dark-muted mb-4">Historical email tracking data from emmie-metrics.csv.</p>
    
    {loading ? (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-dark-muted" size={24} />
      </div>
    ) : metrics.length > 0 ? (
      <div className="space-y-6">
        {/* Platform breakdown */}
        {platformStats && platformStats.length > 0 && (
          <div>
            <h3 className="font-bold  text-dark-text mb-3">Emails by Platform</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {platformStats.slice(0, 6).map((stat: any) => (
                <div key={stat.platform} className="bg-dark-bg rounded-lg p-3">
                  <p className="text-sm font-medium text-dark-text">{stat.platform}</p>
                  <p className="text-2xl font-bold text-dark-text">{stat.count}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Daily activity */}
        {dailyStats && dailyStats.length > 0 && (
          <div>
            <h3 className="font-bold  text-dark-text mb-3">Daily Activity (Last 7 Days)</h3>
            <div className="space-y-2">
              {dailyStats.slice(0, 7).map((stat: any) => (
                <div key={stat.date} className="flex items-center justify-between">
                  <span className="text-sm text-dark-muted">{stat.date}</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 bg-cm-purple rounded"
                      style={{ width: `${Math.min((stat.count / Math.max(...dailyStats.map((s: any) => s.count))) * 200, 200)}px` }}
                    />
                    <span className="text-sm font-medium text-dark-text w-12 text-right">
                      {stat.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent emails */}
        <div>
          <h3 className="font-bold  text-dark-text mb-3">Recent Emails Tracked</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {metrics.slice(0, 20).map((email: any, idx: number) => (
              <div key={idx} className="p-3 bg-dark-bg rounded-lg text-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-dark-text truncate">{email.subject}</p>
                    <p className="text-dark-muted text-xs">{email.sender}</p>
                  </div>
                  <div className="ml-4 text-right flex-shrink-0">
                    <p className="text-xs text-dark-muted">{email.date.split(' ')[0]}</p>
                    {email.platform && (
                      <span className="text-xs bg-cm-purple/20 text-cm-purple px-2 py-0.5 rounded mt-1 inline-block">
                        {email.platform}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ) : (
      <div className="text-center py-8">
        <p className="text-dark-muted">No metrics data available yet</p>
        <p className="text-sm text-dark-muted mt-2">
          Data will appear here after Emmie runs
        </p>
      </div>
    )}
  </div>
);

const LogsSection = ({ logs, summary, loading }: any) => (
  <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
    <h2 className="text-xl font-bold  text-dark-text mb-4">Execution Logs</h2>
    <p className="text-dark-muted mb-4">Detailed history of cleanup operations.</p>
    
    {loading ? (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-dark-muted" size={24} />
      </div>
    ) : logs.length > 0 ? (
      <div className="space-y-6">
        {/* Summary stats */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-dark-bg rounded-lg">
            <div>
              <p className="text-sm text-dark-muted">Total Runs</p>
              <p className="text-2xl font-bold text-dark-text">{summary.totalRuns}</p>
            </div>
            <div>
              <p className="text-sm text-dark-muted">Emails Processed</p>
              <p className="text-2xl font-bold text-dark-text">{summary.totalEmailsProcessed}</p>
            </div>
            <div>
              <p className="text-sm text-dark-muted">Emails Trashed</p>
              <p className="text-2xl font-bold text-dark-success">{summary.totalEmailsTrashed}</p>
            </div>
            <div>
              <p className="text-sm text-dark-muted">Success Rate</p>
              <p className="text-2xl font-bold text-cm-purple">{summary.successRate}%</p>
            </div>
          </div>
        )}

        {/* Log entries */}
        <div className="space-y-4">
          {logs.map((log: any, idx: number) => (
            <div key={idx} className="border border-dark-border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold  text-dark-text">{log.date}</h3>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${
                        log.status === 'completed'
                          ? 'bg-dark-success/20 text-dark-success'
                          : log.status === 'failed'
                          ? 'bg-dark-danger/20 text-dark-danger'
                          : 'bg-dark-warn/20 text-dark-warn'
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                  <p className="text-sm text-dark-muted mt-1">
                    {log.startTime} - {log.endTime}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-dark-muted">
                    <span className="font-semibold text-dark-success">{log.emailsTrashed}</span> trashed
                  </p>
                  {log.emailsFailed > 0 && (
                    <p className="text-sm text-dark-danger">
                      {log.emailsFailed} failed
                    </p>
                  )}
                </div>
              </div>

              {/* Query details */}
              {log.queries && log.queries.length > 0 && (
                <div className="space-y-2">
                  {log.queries.map((query: any, qIdx: number) => (
                    <div key={qIdx} className="bg-dark-bg rounded p-3">
                      <p className="text-sm font-medium text-dark-text">{query.description}</p>
                      <p className="text-xs text-dark-muted mt-1">
                        Found: {query.found} | Trashed: {query.trashed}
                        {query.failed > 0 && ` | Failed: ${query.failed}`}
                      </p>
                      <code className="text-xs text-dark-muted mt-1 block">{query.query}</code>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    ) : (
      <div className="text-center py-8">
        <p className="text-dark-muted">No cleanup logs available yet</p>
        <p className="text-sm text-dark-muted mt-2">
          Logs will appear here after Emmie runs
        </p>
      </div>
    )}
  </div>
);

const TestRulesSection = () => (
  <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
    <h2 className="text-xl font-bold  text-dark-text mb-4">Test Rules</h2>
    <p className="text-dark-muted mb-4">Preview the effects of your cleanup rules before applying them.</p>
    <div className="mt-4 p-4 bg-cm-purple/10 border border-cm-purple/30 rounded-lg">
      <p className="text-cm-purple text-sm">
        This feature requires Gmail API integration to preview rule effects.
        Edit rules directly in /Users/openclaw/.openclaw/workspace/bin/gmail-cleanup
      </p>
    </div>
  </div>
);

type Section =
  | "rules"
  | "whitelist"
  | "uncertain"
  | "metrics"
  | "logs"
  | "test";

export default function EmailCleanupPage() {
  const [activeSection, setActiveSection] = useState<Section>("uncertain");
  const [emmyRunning, setEmmyRunning] = useState(false);
  const [emmyResult, setEmmyResult] = useState<{ success: boolean; message: string } | null>(null);

  // Check if Emmy is already running on mount
  useEffect(() => {
    fetch('/api/emmie/run')
      .then(res => res.json())
      .then(data => setEmmyRunning(data.running))
      .catch(() => {});
  }, []);

  const handleRunEmmy = async () => {
    setEmmyRunning(true);
    setEmmyResult(null);
    try {
      const res = await fetch('/api/emmie/run', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmmyResult({ success: true, message: 'Cleanup completed successfully' });
      } else {
        setEmmyResult({ success: false, message: data.error || 'Cleanup failed' });
      }
    } catch {
      setEmmyResult({ success: false, message: 'Failed to reach server' });
    } finally {
      setEmmyRunning(false);
    }
  };

  // Real data state
  const [rules, setRules] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [platformStats, setPlatformStats] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsSummary, setLogsSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch real data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch config/rules
        const configRes = await fetch('/api/emmie/config');
        const configData = await configRes.json();
        setRules(configData.rules || []);

        // Fetch metrics
        const metricsRes = await fetch('/api/emmie/metrics');
        const metricsData = await metricsRes.json();
        setMetrics(metricsData.metrics || []);
        setDailyStats(metricsData.dailyStats || []);
        setPlatformStats(metricsData.platformStats || []);

        // Fetch logs
        const logsRes = await fetch('/api/emmie/logs');
        const logsData = await logsRes.json();
        setLogs(logsData.logs || []);
        setLogsSummary(logsData.summary || null);
      } catch (error) {
        console.error('Error fetching Emmie data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const menuItems: { id: Section; label: string; icon: any }[] = [
    { id: "uncertain", label: "Uncertain Emails", icon: AlertCircle },
    { id: "rules", label: "Rules", icon: Settings },
    { id: "whitelist", label: "Whitelist", icon: Shield },
    { id: "metrics", label: "Metrics", icon: BarChart3 },
    { id: "logs", label: "Logs", icon: FileText },
    { id: "test", label: "Test Rules", icon: TestTube },
  ];

  return (
    <div className="space-y-4">
      <ApiKeyBanner slug="google" agentName="Gmail / Email Cleanup" />
      {/* Run Emmy Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleRunEmmy}
          disabled={emmyRunning}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            emmyRunning
              ? 'bg-dark-warn text-white cursor-not-allowed'
              : 'bg-cm-purple text-white hover:bg-cm-purple/80'
          }`}
        >
          {emmyRunning ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play size={16} />
              Run Emmy
            </>
          )}
        </button>
        {emmyResult && (
          <span
            className={`text-sm font-medium ${
              emmyResult.success ? 'text-dark-success' : 'text-dark-danger'
            }`}
          >
            {emmyResult.message}
          </span>
        )}
      </div>

    <div className="flex gap-6">
      {/* Sidebar Menu */}
      <div className="w-64 flex-shrink-0">
        <div className="bg-dark-panel rounded-lg border border-dark-border overflow-hidden sticky top-6">
          <div className="p-4 bg-gradient-to-r from-cm-purple/15 via-dark-panel to-dark-panel text-dark-text">
            <h2 className="text-lg font-bold ">📧 Emmie</h2>
            <p className="text-xs text-dark-muted">Email Cleanup Assistant</p>
          </div>

          <div className="p-2 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-cm-purple/10 text-cm-purple font-medium"
                      : "text-dark-muted hover:bg-dark-bg"
                  }`}
                >
                  <Icon size={16} className="flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {activeSection === "rules" && <RulesSection rules={rules} loading={loading} />}
        {activeSection === "whitelist" && <WhitelistSection />}
        {activeSection === "uncertain" && <UncertainEmailsSection />}
        {activeSection === "metrics" && (
          <MetricsSection
            metrics={metrics}
            dailyStats={dailyStats}
            platformStats={platformStats}
            loading={loading}
          />
        )}
        {activeSection === "logs" && (
          <LogsSection logs={logs} summary={logsSummary} loading={loading} />
        )}
        {activeSection === "test" && <TestRulesSection />}
      </div>
    </div>
    </div>
  );
}
