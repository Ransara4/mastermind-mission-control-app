"use client";

import dynamic from "next/dynamic";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useMachineLearningData } from "@/hooks/useMachineLearningData";
import StatCards from "./sections/StatCards";
import LastRunDetail from "./sections/LastRunDetail";

// PersonalityRadar uses recharts which accesses browser-only APIs (ResizeObserver, window).
// Disable SSR to prevent "Something went wrong" during server render.
const PersonalityRadar = dynamic(() => import("./sections/PersonalityRadar"), { ssr: false });
import FeedbackLoop from "./sections/FeedbackLoop";
import KnowledgeBase from "./sections/KnowledgeBase";
import PredictorStatus from "./sections/PredictorStatus";
import ErrorClusters from "./sections/ErrorClusters";
import SettingsPanel from "./sections/SettingsPanel";
import EvolutionTimeline from "./sections/EvolutionTimeline";
import GenesTable from "./sections/GenesTable";
import CandidatesTable from "./sections/CandidatesTable";
import MemoryGraphSummary from "./sections/MemoryGraphSummary";

export default function MachineLearningPage() {
  const { data, loading, error, refresh, updateSetting } = useMachineLearningData();

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="animate-spin text-cm-purple mb-4" size={32} />
        <p className="text-dark-muted">Loading Machine Learning data...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="text-dark-danger mb-4" size={32} />
        <h3 className="text-lg font-semibold text-dark-text mb-2">
          Failed to load data
        </h3>
        <p className="text-dark-muted mb-4">{error}</p>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-dark-text">
            Machine Learning
          </h1>
          <p className="text-sm text-dark-muted">
            Self-healing ML engine — learns from every evolution cycle
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="p-1.5 text-dark-muted hover:text-dark-text transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <StatCards
        stats={data.stats}
        eventCount={data.events?.length || 0}
        ml={data.ml}
        events={data.events}
        lastUpdated={data.lastUpdated}
      />

      {/* ML Intelligence Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FeedbackLoop feedback={data.ml?.feedback} />
        <KnowledgeBase knowledge={data.ml?.knowledge} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PredictorStatus predictor={data.ml?.predictor} />
        <ErrorClusters
          clusters={data.ml?.clusters}
          ollamaAvailable={data.settings.ollamaAvailable}
        />
      </div>

      {/* Evolution Engine Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PersonalityRadar personality={data.personality} />
        <LastRunDetail lastRun={data.lastRun} />
      </div>

      <SettingsPanel
        settings={data.settings}
        daemon={data.daemon}
        version={data.version}
        onUpdate={updateSetting}
      />

      <EvolutionTimeline events={data.events || []} />

      <GenesTable genes={data.genes} events={data.events} />

      <CandidatesTable
        candidates={data.candidates}
        candidateStats={data.candidateStats}
      />

      <MemoryGraphSummary memoryGraph={data.memoryGraph} />
    </div>
  );
}
