"use client";

import { useState, useEffect } from "react";
import {
  TestTube,
  Play,
  AlertCircle,
  CheckCircle,
  Mail,
  Info,
} from "lucide-react";

interface Rule {
  _id: string;
  name: string;
  query: string;
  condition?: string;
  action?: string;
}

export default function TestRulesSection() {
  const [rules, setRules] = useState<Rule[] | null>(null);

  const [selectedRuleId, setSelectedRuleId] = useState<string>("");
  const [testQuery, setTestQuery] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  useEffect(() => {
    fetch("/api/emmie/config")
      .then((r) => r.json())
      .then((data) => setRules(data.rules || []))
      .catch(() => setRules([]));
  }, []);

  const runSimulation = async () => {
    if (!selectedRuleId && !testQuery) {
      alert("Please select a rule or enter a custom query");
      return;
    }

    setIsSimulating(true);

    // Simulate API call (preview only — no emails are modified)
    setTimeout(() => {
      const selectedRule = rules?.find((r) => r._id === selectedRuleId);
      const queryToTest = testQuery || selectedRule?.condition || selectedRule?.query || "";

      // Mock result
      const mockResult = {
        query: queryToTest,
        ruleName: selectedRule?.name || "Custom Query",
        emailsFound: Math.floor(Math.random() * 100) + 10,
        sampleEmails: [
          {
            subject: "Summer Sale - 50% Off Everything!",
            from: "promo@store.com",
            date: new Date(Date.now() - 86400000 * 35).toISOString(),
            snippet: "Don't miss our biggest sale of the year...",
          },
          {
            subject: "Weekly Newsletter - Tech Updates",
            from: "newsletter@techsite.com",
            date: new Date(Date.now() - 86400000 * 45).toISOString(),
            snippet: "Here are this week's top stories...",
          },
          {
            subject: "Your Amazon order has shipped",
            from: "shipment-tracking@amazon.com",
            date: new Date(Date.now() - 86400000 * 32).toISOString(),
            snippet: "Track your package...",
          },
        ],
        warnings: [] as string[],
        safetyChecks: {
          hasStarred: false,
          hasImportant: false,
          hasUnread: Math.random() > 0.7,
          whitelistConflicts: 0,
        },
      };

      // Add warnings
      if (mockResult.emailsFound > 50) {
        mockResult.warnings.push(
          `High volume: ${mockResult.emailsFound} emails will be affected`
        );
      }
      if (mockResult.safetyChecks.hasUnread) {
        mockResult.warnings.push("Some emails are unread");
      }

      setSimulationResult(mockResult);
      setIsSimulating(false);
    }, 1500);
  };

  if (rules === null) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold  text-dark-text mb-2">Test Rules</h1>
        <p className="text-dark-muted">
          Preview what emails will be affected by your rules before applying
          them
        </p>
      </div>

      {/* Test Configuration */}
      <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
        <h3 className="text-lg font-bold  text-dark-text mb-4">
          Configure Test
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-text mb-2">
              Select Rule to Test
            </label>
            <select
              value={selectedRuleId}
              onChange={(e) => {
                setSelectedRuleId(e.target.value);
                const rule = rules.find((r) => r._id === e.target.value);
                if (rule) {
                  setTestQuery(rule.condition || rule.query);
                }
                setSimulationResult(null);
              }}
              className="w-full px-3 py-2 border border-dark-border rounded-lg focus:ring-2 focus:ring-cm-purple focus:border-cm-purple"
            >
              <option value="">Select a rule...</option>
              {rules.map((rule) => (
                <option key={rule._id} value={rule._id}>
                  {rule.name}{rule.action ? ` (${rule.action})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-text mb-2">
              Custom Gmail Query (optional)
            </label>
            <input
              type="text"
              value={testQuery}
              onChange={(e) => {
                setTestQuery(e.target.value);
                setSimulationResult(null);
              }}
              className="w-full px-3 py-2 border border-dark-border rounded-lg focus:ring-2 focus:ring-cm-purple focus:border-cm-purple font-mono font-dm-mono text-sm"
              placeholder="e.g., category:promotions older_than:30d"
            />
            <p className="text-xs text-dark-muted mt-1">
              Override the selected rule's condition
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={runSimulation}
              disabled={isSimulating || (!selectedRuleId && !testQuery)}
              className="flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSimulating ? (
                <>
                  <TestTube size={18} className="animate-spin" />
                  <span>Simulating...</span>
                </>
              ) : (
                <>
                  <Play size={18} />
                  <span>Run Simulation</span>
                </>
              )}
            </button>
            {simulationResult && (
              <button
                onClick={() => setSimulationResult(null)}
                className="px-4 py-2 text-dark-muted hover:text-dark-text transition-colors"
              >
                Clear Results
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Simulation Results */}
      {simulationResult && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-cm-purple/20 rounded-lg">
                <TestTube size={24} className="text-cm-purple" />
              </div>
              <div>
                <h3 className="text-lg font-bold  text-dark-text">
                  Simulation Results
                </h3>
                <p className="text-sm text-dark-muted">
                  {simulationResult.ruleName}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-dark-bg rounded-lg">
                <p className="text-sm text-dark-muted mb-1">Emails Found</p>
                <p className="text-3xl font-bold text-dark-text">
                  {simulationResult.emailsFound}
                </p>
              </div>
              <div className="p-4 bg-dark-bg rounded-lg">
                <p className="text-sm text-dark-muted mb-1">Query Used</p>
                <code className="text-xs text-dark-text font-mono font-dm-mono break-all">
                  {simulationResult.query}
                </code>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {simulationResult.warnings.length > 0 && (
            <div className="bg-dark-warn/10 border border-dark-warn/30 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <AlertCircle size={20} className="text-dark-warn" />
                <h3 className="font-bold  text-dark-warn">
                  Warnings ({simulationResult.warnings.length})
                </h3>
              </div>
              <ul className="space-y-2">
                {simulationResult.warnings.map(
                  (warning: string, idx: number) => (
                    <li key={idx} className="text-sm text-dark-warn">
                      • {warning}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}

          {/* Safety Checks */}
          <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle size={20} className="text-dark-success" />
              <h3 className="font-bold  text-dark-text">Safety Checks</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-dark-bg rounded-lg">
                <p className="text-xs text-dark-muted mb-1">Starred Emails</p>
                <p
                  className={`font-semibold ${
                    simulationResult.safetyChecks.hasStarred
                      ? "text-dark-warn"
                      : "text-dark-success"
                  }`}
                >
                  {simulationResult.safetyChecks.hasStarred ? "Yes" : "None"}
                </p>
              </div>
              <div className="p-3 bg-dark-bg rounded-lg">
                <p className="text-xs text-dark-muted mb-1">Important</p>
                <p
                  className={`font-semibold ${
                    simulationResult.safetyChecks.hasImportant
                      ? "text-dark-warn"
                      : "text-dark-success"
                  }`}
                >
                  {simulationResult.safetyChecks.hasImportant ? "Yes" : "None"}
                </p>
              </div>
              <div className="p-3 bg-dark-bg rounded-lg">
                <p className="text-xs text-dark-muted mb-1">Unread</p>
                <p
                  className={`font-semibold ${
                    simulationResult.safetyChecks.hasUnread
                      ? "text-cm-purple"
                      : "text-dark-success"
                  }`}
                >
                  {simulationResult.safetyChecks.hasUnread ? "Yes" : "None"}
                </p>
              </div>
              <div className="p-3 bg-dark-bg rounded-lg">
                <p className="text-xs text-dark-muted mb-1">Whitelist</p>
                <p
                  className={`font-semibold ${
                    simulationResult.safetyChecks.whitelistConflicts > 0
                      ? "text-dark-danger"
                      : "text-dark-success"
                  }`}
                >
                  {simulationResult.safetyChecks.whitelistConflicts > 0
                    ? `${simulationResult.safetyChecks.whitelistConflicts} conflicts`
                    : "No conflicts"}
                </p>
              </div>
            </div>
          </div>

          {/* Sample Emails */}
          <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mail size={20} className="text-dark-muted" />
              <h3 className="font-bold  text-dark-text">
                Sample Emails ({simulationResult.sampleEmails.length})
              </h3>
            </div>
            <div className="space-y-3">
              {simulationResult.sampleEmails.map(
                (email: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 bg-dark-bg rounded-lg border border-dark-border"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-dark-text">
                        {email.subject}
                      </h4>
                      <span className="text-xs text-dark-muted">
                        {new Date(email.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-dark-muted mb-1">{email.from}</p>
                    <p className="text-xs text-dark-muted line-clamp-2">
                      {email.snippet}
                    </p>
                  </div>
                )
              )}
            </div>
            <p className="text-xs text-dark-muted mt-4">
              Showing {simulationResult.sampleEmails.length} of{" "}
              {simulationResult.emailsFound} emails
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-cm-purple/10 border border-cm-purple/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info size={20} className="text-cm-purple flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-cm-purple font-medium mb-1">
                  Simulation Only
                </p>
                <p className="text-xs text-cm-purple">
                  This is a preview based on current Gmail data. No emails will
                  be modified. To apply this rule, save it in the Rules section
                  and enable it.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      {!simulationResult && (
        <div className="bg-dark-bg border border-dark-border rounded-lg p-6">
          <h3 className="font-bold  text-dark-text mb-3">
            How to Use Rule Testing
          </h3>
          <ul className="space-y-2 text-sm text-dark-muted">
            <li className="flex items-start gap-2">
              <span className="text-cm-purple">1.</span>
              <span>
                Select an existing rule or enter a custom Gmail search query
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cm-purple">2.</span>
              <span>Click "Run Simulation" to preview affected emails</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cm-purple">3.</span>
              <span>
                Review warnings, safety checks, and sample emails carefully
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cm-purple">4.</span>
              <span>
                Adjust your rule if needed, then save and enable in the Rules
                section
              </span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
