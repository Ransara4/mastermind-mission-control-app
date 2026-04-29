"use client";

import { Clock, Shield, Zap } from "lucide-react";
import type { GuardDogDashboard } from "@/lib/guard-dog-types";

function StatusDot({ active }: { active: boolean }) {
  return (
    <div
      className={`w-2.5 h-2.5 rounded-full ${
        active ? "bg-cm-purple" : "bg-dark-danger"
      }`}
    />
  );
}

export default function AutomationStatus({
  protectionStatus,
}: {
  protectionStatus: GuardDogDashboard["protectionStatus"];
}) {
  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <h3 className="text-lg font-semibold tracking-tight text-dark-text mb-4">
        🤖 Watch Patrol
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pre-Install Hook */}
        <div className="border border-dark-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-dark-muted" />
            <span className="text-sm font-medium text-dark-text">Pre-Install Hook</span>
            <StatusDot active={protectionStatus.preInstallHook} />
          </div>
          {protectionStatus.preInstallHook ? (
            <p className="text-xs text-dark-muted">🐾 Scanning packages before install</p>
          ) : (
            <p className="text-xs text-dark-muted">💤 Not active</p>
          )}
        </div>

        {/* Nightly Scan */}
        <div className="border border-dark-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-dark-muted" />
            <span className="text-sm font-medium text-dark-text">Nightly Scan</span>
            <StatusDot active={protectionStatus.cronNightly} />
          </div>
          {protectionStatus.cronNightly ? (
            <>
              <p className="text-xs text-dark-muted">Schedule: 2:30 AM daily</p>
              {protectionStatus.lastNightlyScan && (
                <p className="text-xs text-dark-muted mt-1">
                  Last: {new Date(protectionStatus.lastNightlyScan).toLocaleDateString()}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-dark-muted">💤 Not configured</p>
          )}
        </div>

        {/* Threat Intel */}
        <div className="border border-dark-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-dark-muted" />
            <span className="text-sm font-medium text-dark-text">Threat Intel</span>
            <StatusDot active={protectionStatus.cronThreatIntel} />
          </div>
          {protectionStatus.cronThreatIntel ? (
            <>
              <p className="text-xs text-dark-muted">Schedule: 3:00 AM daily</p>
              {protectionStatus.lastThreatIntelScan && (
                <p className="text-xs text-dark-muted mt-1">
                  Last: {new Date(protectionStatus.lastThreatIntelScan).toLocaleDateString()}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-dark-muted">💤 Not yet configured</p>
          )}
        </div>
      </div>
    </div>
  );
}
