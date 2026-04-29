"use client";

import { useEffect, useState, useCallback } from "react";
import { useRegistryAgents, useAgentAvatars } from "@/hooks/useAgentRegistry";
import { Activity, Clock, TrendingUp, Candy } from "lucide-react";

interface LollipopEntry {
  date: string;
  reason: string;
  count: number;
}

function useLollipops() {
  const [total, setTotal] = useState(0);
  const [history, setHistory] = useState<LollipopEntry[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/office/lollipops");
      const data = await res.json();
      setTotal(data.total || 0);
      setHistory(data.history || []);
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { total, history, refresh };
}

const statusColors = {
  idle: "bg-dark-panel2 text-dark-text",
  working: "bg-cm-purple/20 text-cm-purple",
  blocked: "bg-dark-danger/20 text-dark-danger",
  done: "bg-dark-success/20 text-dark-success",
};

const statusIcons = {
  idle: "😴",
  working: "🚀",
  blocked: "🚫",
  done: "✅",
};

// agentAvatars now derived from agent-registry.json via useAgentAvatars()

function AgentAvatar({ avatar, fallback, size = "sm" }: { avatar?: string; fallback?: string; size?: "sm" | "lg" }) {
  const px = size === "lg" ? 48 : 28;
  if (avatar?.startsWith("/")) {
    return <img src={avatar} alt="" width={px} height={px} style={{ width: px, height: px, objectFit: "contain", display: "inline-block" }} />;
  }
  return <span className={size === "lg" ? "text-4xl" : "text-lg"}>{avatar || fallback}</span>;
}

const pulseColors = {
  idle: "bg-dark-muted",
  working: "bg-cm-purple",
  blocked: "bg-dark-danger",
  done: "bg-dark-success",
};

export default function OfficePage() {
  const agents = useRegistryAgents();
  const agentAvatars = useAgentAvatars();
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update time every second for real-time countdown
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const { total: lollipopTotal, history: lollipopHistory } = useLollipops();
  const [showLollipops, setShowLollipops] = useState(false);

  const statusOrder: Record<string, number> = { working: 0, blocked: 1, idle: 2, done: 3 };
  const sortedAgents = [...agents].sort((a: any, b: any) => {
    const statusDiff = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
    if (statusDiff !== 0) return statusDiff;
    return a.name.localeCompare(b.name);
  });

  const workingAgents = agents.filter((a: any) => a.status === "working");
  const idleAgents = agents.filter((a: any) => a.status === "idle");
  const blockedAgents = agents.filter((a: any) => a.status === "blocked");
  const totalTasks = agents.reduce((sum: number, a: any) => sum + (a.tasksCompleted || 0), 0);
  const avgTime = agents.reduce((sum: number, a: any) => sum + (a.avgTaskTime || 0), 0) / agents.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-dark-text mb-2">Agent Office Space</h2>
          <p className="text-dark-muted">
            Real-time status of all agents in the OpenClaw network
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-dark-muted">
          <div className="w-2 h-2 bg-dark-success rounded-full animate-pulse"></div>
          <span>Live</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-dark-panel rounded-lg p-4 border border-dark-border shadow-md shadow-black/20">
          <p className="text-sm text-dark-muted flex items-center gap-2">
            <Activity size={16} />
            Total Agents
          </p>
          <p className="text-3xl font-bold text-dark-text mt-1">{agents.length}</p>
        </div>
        <div className="bg-dark-panel rounded-lg p-4 border border-cm-purple/30 shadow-md shadow-black/20 bg-cm-purple/10">
          <p className="text-sm text-cm-purple flex items-center gap-2">
            <TrendingUp size={16} />
            Working
          </p>
          <p className="text-3xl font-bold text-cm-purple mt-1">{workingAgents.length}</p>
        </div>
        <div className="bg-dark-panel rounded-lg p-4 border border-dark-danger/30 shadow-md shadow-black/20 bg-dark-danger/10">
          <p className="text-sm text-dark-danger">Blocked</p>
          <p className="text-3xl font-bold text-dark-danger mt-1">{blockedAgents.length}</p>
        </div>
        <div className="bg-dark-panel rounded-lg p-4 border border-dark-border shadow-md shadow-black/20">
          <p className="text-sm text-dark-muted">Tasks Done</p>
          <p className="text-3xl font-bold text-dark-success mt-1">{totalTasks}</p>
        </div>
        <div className="bg-dark-panel rounded-lg p-4 border border-dark-border shadow-md shadow-black/20">
          <p className="text-sm text-dark-muted flex items-center gap-2">
            <Clock size={16} />
            Avg Time
          </p>
          <p className="text-3xl font-bold text-dark-text mt-1">
            {avgTime > 0 ? `${Math.round(avgTime)}s` : "-"}
          </p>
        </div>
        <button
          onClick={() => setShowLollipops(!showLollipops)}
          className="bg-dark-panel rounded-lg p-4 border border-dark-warn/30 shadow-md shadow-black/20 bg-dark-warn/10 hover:bg-dark-warn/20 transition-colors text-left"
        >
          <p className="text-sm text-dark-warn flex items-center gap-2">
            <Candy size={16} />
            Lollipops
          </p>
          <p className="text-3xl font-bold text-dark-warn mt-1">{lollipopTotal}</p>
        </button>
      </div>

      {/* Lollipop History */}
      {showLollipops && lollipopHistory.length > 0 && (
        <div className="bg-dark-panel rounded-lg border border-dark-warn/30 shadow-md shadow-black/20 p-4">
          <h3 className="font-semibold tracking-tight text-dark-text mb-3 flex items-center gap-2">
            <Candy size={16} className="text-dark-warn" />
            Lollipop History
          </h3>
          <div className="space-y-2">
            {lollipopHistory.slice(0, 20).map((entry, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 bg-dark-warn/10 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🍭</span>
                  <div>
                    <p className="text-sm text-dark-text">{entry.reason}</p>
                    <p className="text-xs text-dark-muted">{entry.date}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-dark-warn">
                  +{entry.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Agent Status Summary */}
        <div className="lg:col-span-1">
          <div className="bg-dark-panel rounded-lg border border-dark-border shadow-md shadow-black/20 overflow-hidden sticky top-6">
            <div className="p-4 border-b border-dark-border bg-dark-panel2">
              <h3 className="font-semibold tracking-tight text-dark-text">Agent Status</h3>
            </div>

            {/* Working Agents */}
            <div className="p-4 border-b border-dark-border">
              <div className="flex items-center gap-2 text-sm font-medium text-cm-purple mb-3">
                <div className="w-2 h-2 bg-cm-purple rounded-full animate-pulse"></div>
                Working ({workingAgents.length})
              </div>
              {workingAgents.length === 0 ? (
                <p className="text-xs text-dark-muted">No agents working</p>
              ) : (
                <div className="space-y-2">
                  {workingAgents.map((agent: any) => (
                    <button
                      key={agent._id}
                      onClick={() => setSelectedAgent(agent)}
                      className={`w-full text-left p-2 rounded transition-colors ${
                        selectedAgent?._id === agent._id
                          ? "bg-cm-purple/15"
                          : "hover:bg-dark-panel2"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <AgentAvatar avatar={agentAvatars[agent.agentId]} fallback={statusIcons[agent.status as keyof typeof statusIcons]} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-dark-text truncate">
                            {agent.name}
                          </p>
                          <p className="text-xs text-dark-muted truncate">
                            {agent.currentTask || "No task"}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Idle Agents */}
            <div className="p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-dark-muted mb-3">
                <div className="w-2 h-2 bg-dark-muted rounded-full"></div>
                Idle ({idleAgents.length})
              </div>
              {idleAgents.length === 0 ? (
                <p className="text-xs text-dark-muted">No idle agents</p>
              ) : (
                <div className="space-y-2">
                  {idleAgents.map((agent: any) => (
                    <button
                      key={agent._id}
                      onClick={() => setSelectedAgent(agent)}
                      className={`w-full text-left p-2 rounded transition-colors ${
                        selectedAgent?._id === agent._id
                          ? "bg-dark-panel2"
                          : "hover:bg-dark-panel2"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <AgentAvatar avatar={agentAvatars[agent.agentId]} fallback={statusIcons[agent.status as keyof typeof statusIcons]} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-dark-text truncate">
                            {agent.name}
                          </p>
                          <p className="text-xs text-dark-muted">Available</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content - Agent Desks */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sortedAgents.map((agent: any) => {
              const timeSinceHeartbeat = Math.floor((currentTime - agent.heartbeatAt) / 1000);
              const isStale = timeSinceHeartbeat > 60;

              return (
                <div
                  key={agent._id}
                  className={`bg-dark-panel rounded-lg p-6 border border-dark-border shadow-md shadow-black/20 hover:shadow-lg hover:shadow-black/30 transition-all ${
                    selectedAgent?._id === agent._id ? "ring-2 ring-cm-purple" : ""
                  }`}
                  onClick={() => setSelectedAgent(agent)}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <AgentAvatar avatar={agentAvatars[agent.agentId]} fallback={statusIcons[agent.status as keyof typeof statusIcons]} size="lg" />
                        {/* Pulse indicator */}
                        {agent.status === "working" && !isStale && (
                          <div className="absolute -top-1 -right-1">
                            <span className="relative flex h-3 w-3">
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pulseColors[agent.status as keyof typeof pulseColors]} opacity-75`}></span>
                              <span className={`relative inline-flex rounded-full h-3 w-3 ${pulseColors[agent.status as keyof typeof pulseColors]}`}></span>
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold tracking-tight text-dark-text">{agent.name}</h3>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        statusColors[agent.status as keyof typeof statusColors]
                      }`}
                    >
                      {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                    </span>
                  </div>

                  {/* Current Task with Progress */}
                  {agent.currentTask && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-dark-muted font-medium">Current Task</p>
                        {agent.taskProgress !== undefined && (
                          <span className="text-xs font-bold text-cm-purple">
                            {agent.taskProgress}%
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-dark-text p-2 bg-dark-panel2 rounded mb-2">
                        {agent.currentTask}
                      </p>
                      {/* Progress Bar */}
                      {agent.taskProgress !== undefined && (
                        <div className="h-1.5 bg-dark-panel2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cm-purple to-cm-purple/60 transition-all duration-500"
                            style={{ width: `${agent.taskProgress}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Activity Level */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-dark-muted font-medium">Activity Level</p>
                      <span className="text-sm font-bold text-dark-text">
                        {agent.currentActivityLevel}%
                      </span>
                    </div>
                    <div className="h-2 bg-dark-panel2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cm-purple via-cm-purple/80 to-cm-pink transition-all"
                        style={{ width: `${agent.currentActivityLevel}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Productivity Metrics */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-dark-panel2 rounded p-2">
                      <p className="text-xs text-dark-muted">Tasks Done</p>
                      <p className="text-lg font-bold text-dark-text">
                        {agent.tasksCompleted || 0}
                      </p>
                    </div>
                    <div className="bg-dark-panel2 rounded p-2">
                      <p className="text-xs text-dark-muted">Avg Time</p>
                      <p className="text-lg font-bold text-dark-text">
                        {agent.avgTaskTime ? `${Math.round(agent.avgTaskTime)}s` : "-"}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="text-xs text-dark-muted pt-3 border-t border-dark-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${isStale ? 'bg-dark-danger' : 'bg-dark-success'}`}></div>
                        <span>
                          {isStale ? "Stale" : "Active"}
                        </span>
                      </div>
                      <p>
                        {timeSinceHeartbeat < 60
                          ? `${timeSinceHeartbeat}s ago`
                          : `${Math.floor(timeSinceHeartbeat / 60)}m ago`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
