"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Settings,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Send,
  FileText,
  Users,
  FileVideo,
  Library,
  BookOpen,
} from "lucide-react";
import ApiKeyBanner from "@/components/ApiKeyBanner";

interface AgentStatus {
  agentId?: string;
  status?: string;
  lastRun?: string | null;
  lastResult?: string | null;
  lastMessage?: string | null;
  errorCount?: number;
  enabled?: boolean;
}

interface Transcript {
  shortcode: string;
  url: string;
  username: string;
  caption: string;
  transcribedAt: string;
  transcript: string;
  model: string;
}

const CAPABILITIES = [
  {
    title: "Transcribe a Post",
    icon: FileText,
    description:
      "Paste any public Instagram post URL, get the full spoken transcript in seconds.",
    command: 'python3 src/main.py transcribe --url https://www.instagram.com/p/ABC123/',
  },
  {
    title: "Profile Sweep",
    icon: Users,
    description:
      "Enter a handle like @hubermanlab and transcribe the last 10 reels automatically.",
    command: "python3 src/main.py transcribe-profile --username hubermanlab --limit 10 --reels-only",
  },
  {
    title: "Local File",
    icon: FileVideo,
    description:
      "Drop any .mp4 file path, transcribe without downloading anything.",
    command: "python3 src/main.py transcribe-file --path /path/to/video.mp4",
  },
  {
    title: "Transcript Library",
    icon: Library,
    description:
      "Browse and search all previously transcribed videos.",
    command: "python3 src/main.py list",
  },
];

const WHISPER_MODELS = ["base", "small", "medium", "large"];

export default function IGVideoTranscriberPage() {
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [expandedCap, setExpandedCap] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiOpen, setApiOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [whisperModel, setWhisperModel] = useState("base");
  const [transcriptionMode, setTranscriptionMode] = useState("auto");

  // Quick Transcribe
  const [inputUrl, setInputUrl] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeResult, setTranscribeResult] = useState<string | null>(null);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  // Transcript Library
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [transcriptsLoading, setTranscriptsLoading] = useState(true);
  const [expandedTranscript, setExpandedTranscript] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ig-video-transcriber/status")
      .then((res) => res.json())
      .then((data) => setAgentStatus(data))
      .catch(() => setAgentStatus({ status: "error", lastMessage: "Could not fetch status" }))
      .finally(() => setStatusLoading(false));

    fetch("/api/ig-video-transcriber/transcripts")
      .then((res) => res.json())
      .then((data) => setTranscripts(data))
      .catch(() => setTranscripts([]))
      .finally(() => setTranscriptsLoading(false));
  }, []);

  const handleTranscribe = async () => {
    if (!inputUrl.trim()) return;
    setTranscribing(true);
    setTranscribeResult(null);
    setTranscribeError(null);
    try {
      const res = await fetch("/api/ig-video-transcriber/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: inputUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTranscribeError(data.error || "Unknown error");
      } else {
        setTranscribeResult(data.output);
        // Refresh transcript library
        fetch("/api/ig-video-transcriber/transcripts")
          .then((r) => r.json())
          .then((d) => setTranscripts(d))
          .catch(() => {});
      }
    } catch (e) {
      setTranscribeError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setTranscribing(false);
    }
  };

  const statusBadge = () => {
    if (statusLoading) return <Loader2 size={14} className="animate-spin text-dark-muted" />;
    const s = agentStatus?.status || "unknown";
    if (s === "working") return <span className="flex items-center gap-1 text-xs text-cm-purple bg-cm-purple/10 border border-cm-purple/20 rounded-full px-2 py-0.5">Working</span>;
    if (agentStatus?.lastResult === "error") return <span className="flex items-center gap-1 text-xs text-dark-danger bg-dark-danger/10 border border-dark-danger/30 rounded-full px-2 py-0.5"><AlertCircle size={11} /> Error</span>;
    return <span className="flex items-center gap-1 text-xs text-dark-success bg-dark-success/10 border border-dark-success/30 rounded-full px-2 py-0.5"><CheckCircle2 size={11} /> Idle</span>;
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <ApiKeyBanner slug="ig-video-transcriber" />

      {/* Section 1: Hero */}
      <div className="bg-dark-panel rounded-xl shadow-sm border border-dark-border p-6">
        <div className="flex items-center gap-4">
          <Image src="/icons/instagram.png" width={40} height={40} alt="Instagram" className="rounded-xl" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-dark-text">IGVideoTranscriber</h1>
            <p className="text-sm text-dark-muted">
              Download Instagram videos and transcribe them with Whisper
            </p>
          </div>
          {statusBadge()}
        </div>
      </div>

      {/* Section 2: Settings Panel */}
      <div className="bg-dark-panel rounded-xl shadow-sm border border-dark-border overflow-hidden">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="w-full flex items-center gap-2 p-4 text-left hover:bg-dark-panel2 transition-colors"
        >
          <Settings size={18} className="text-dark-muted" />
          <h2 className="text-lg font-semibold  text-dark-text flex-1">Settings</h2>
          {settingsOpen ? <ChevronUp size={14} className="text-dark-muted" /> : <ChevronDown size={14} className="text-dark-muted" />}
        </button>
        {settingsOpen && (
          <div className="px-6 pb-6 space-y-4 border-t border-dark-border pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-dark-text">Default Whisper Model</p>
                <p className="text-xs text-dark-muted">base = fast, large = most accurate</p>
              </div>
              <select
                value={whisperModel}
                onChange={(e) => setWhisperModel(e.target.value)}
                className="px-3 py-1.5 text-sm border border-dark-border rounded-lg bg-dark-panel2 text-dark-text focus:outline-none focus:border-cm-purple"
              >
                {WHISPER_MODELS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-dark-text">Transcription Mode</p>
                <p className="text-xs text-dark-muted">How transcription is performed</p>
              </div>
              <select
                value={transcriptionMode}
                onChange={(e) => setTranscriptionMode(e.target.value)}
                className="px-3 py-1.5 text-sm border border-dark-border rounded-lg bg-dark-panel2 text-dark-text focus:outline-none focus:border-cm-purple"
              >
                <option value="auto">Auto (OpenAI first, fallback local)</option>
                <option value="openai">OpenAI API only</option>
                <option value="local">Local Whisper only</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-dark-text">Output Directory</p>
                <p className="text-xs text-dark-muted">Where transcripts are stored</p>
              </div>
              <code className="text-xs bg-dark-panel2 px-2 py-1 rounded font-mono font-dm-mono text-dark-muted">
                ~/.openclaw/workspace/agents/ig-video-transcriber/data/
              </code>
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Capabilities */}
      <div className="bg-dark-panel rounded-xl shadow-sm border border-dark-border p-6">
        <h2 className="text-lg font-semibold  text-dark-text mb-4">Capabilities</h2>
        <div className="space-y-2">
          {CAPABILITIES.map((cap, idx) => {
            const isOpen = expandedCap === idx;
            const Icon = cap.icon;
            return (
              <div key={idx} className="border border-dark-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedCap(isOpen ? null : idx)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-dark-panel2 transition-colors"
                >
                  <Icon size={16} className="text-dark-muted shrink-0" />
                  <span className="flex-1 text-sm font-medium text-dark-text">{cap.title}</span>
                  {isOpen ? <ChevronUp size={14} className="text-dark-muted" /> : <ChevronDown size={14} className="text-dark-muted" />}
                </button>
                {isOpen && (
                  <div className="px-4 pb-3 border-t border-dark-border">
                    <p className="text-sm text-dark-muted mt-2">{cap.description}</p>
                    <code className="block mt-2 px-3 py-2 bg-dark-bg text-dark-success text-xs rounded-lg font-mono font-dm-mono">
                      $ {cap.command}
                    </code>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 4: Quick Transcribe */}
      <div className="bg-dark-panel rounded-xl shadow-sm border border-dark-border p-6">
        <h2 className="text-lg font-semibold  text-dark-text mb-4">Quick Transcribe</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTranscribe()}
            placeholder="Enter Instagram URL or @username"
            className="flex-1 px-4 py-2 text-sm border border-dark-border rounded-lg bg-dark-panel2 text-dark-text placeholder-dark-muted focus:outline-none focus:border-cm-purple"
            disabled={transcribing}
          />
          <button
            onClick={handleTranscribe}
            disabled={transcribing || !inputUrl.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-cm-purple rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 transition-colors"
          >
            {transcribing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {transcribing ? "Transcribing..." : "Transcribe"}
          </button>
        </div>
        {transcribeError && (
          <div className="mt-3 p-3 bg-dark-danger/10 border border-dark-danger/30 rounded-lg text-sm text-dark-danger">
            {transcribeError}
          </div>
        )}
        {transcribeResult && (
          <div className="mt-3 p-4 bg-dark-panel2 border border-dark-border rounded-lg">
            <pre className="text-sm text-dark-text whitespace-pre-wrap font-mono font-dm-mono">{transcribeResult}</pre>
          </div>
        )}
      </div>

      {/* Section 5: API / Credentials */}
      <div className="bg-dark-panel rounded-xl shadow-sm border border-dark-border overflow-hidden">
        <button
          onClick={() => setApiOpen(!apiOpen)}
          className="w-full flex items-center gap-2 p-4 text-left hover:bg-dark-panel2 transition-colors"
        >
          <CheckCircle2 size={18} className="text-dark-success" />
          <h2 className="text-lg font-semibold  text-dark-text flex-1">API / Credentials</h2>
          <span className="text-xs text-dark-muted mr-2">Public profiles work without credentials</span>
          {apiOpen ? <ChevronUp size={14} className="text-dark-muted" /> : <ChevronDown size={14} className="text-dark-muted" />}
        </button>
        {apiOpen && (
          <div className="px-6 pb-6 border-t border-dark-border pt-4 space-y-3">
            <p className="text-sm text-dark-muted">
              InstaLoader works without any credentials for public profiles. For private profiles,
              set <code className="bg-dark-panel2 px-1 rounded text-xs">IG_USERNAME</code> and{" "}
              <code className="bg-dark-panel2 px-1 rounded text-xs">IG_PASSWORD</code> in your .env file.
            </p>
            <p className="text-sm text-dark-muted">
              <code className="bg-dark-panel2 px-1 rounded text-xs">OPENAI_API_KEY</code> enables
              faster cloud transcription as an alternative to local Whisper.
            </p>
            <div className="flex gap-3">
              <a
                href="https://www.instagram.com/accounts/login/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cm-purple bg-cm-purple/10 border border-cm-purple/20 rounded-lg hover:bg-cm-purple/20 transition-colors"
              >
                <ExternalLink size={12} />
                Instagram Login
              </a>
              <a
                href="/app/settings"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-dark-muted bg-dark-panel2 border border-dark-border rounded-lg hover:bg-dark-border transition-colors"
              >
                <Settings size={12} />
                Manage Keys
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Section 6: Transcript Library */}
      <div className="bg-dark-panel rounded-xl shadow-sm border border-dark-border p-6">
        <h2 className="text-lg font-semibold  text-dark-text mb-4">Transcript Library</h2>
        {transcriptsLoading ? (
          <div className="flex items-center gap-2 text-dark-muted">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Loading transcripts...</span>
          </div>
        ) : transcripts.length === 0 ? (
          <p className="text-sm text-dark-muted">No transcripts yet. Use Quick Transcribe above to get started.</p>
        ) : (
          <div className="space-y-2">
            {transcripts.map((t) => {
              const isExpanded = expandedTranscript === t.shortcode;
              return (
                <div key={t.shortcode} className="border border-dark-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedTranscript(isExpanded ? null : t.shortcode)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-dark-panel2 transition-colors"
                  >
                    <FileText size={14} className="text-dark-muted shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-dark-text">@{t.username}</span>
                        <span className="text-xs text-dark-muted font-mono font-dm-mono">{t.shortcode}</span>
                      </div>
                      <p className="text-xs text-dark-muted truncate">{t.transcript.slice(0, 100)}...</p>
                    </div>
                    <span className="text-xs text-dark-muted shrink-0">
                      {t.transcribedAt ? new Date(t.transcribedAt).toLocaleDateString() : ""}
                    </span>
                    {isExpanded ? <ChevronUp size={14} className="text-dark-muted" /> : <ChevronDown size={14} className="text-dark-muted" />}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-dark-border pt-3 space-y-2">
                      {t.caption && (
                        <p className="text-xs text-dark-muted italic">{t.caption}</p>
                      )}
                      <pre className="text-sm text-dark-text whitespace-pre-wrap bg-dark-panel2 p-3 rounded-lg font-mono font-dm-mono">
                        {t.transcript}
                      </pre>
                      <div className="flex items-center gap-4 text-xs text-dark-muted">
                        <span>Model: {t.model}</span>
                        <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-cm-purple hover:underline">
                          View on Instagram
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 7: Documentation */}
      <div className="bg-dark-panel rounded-xl shadow-sm border border-dark-border overflow-hidden">
        <button
          onClick={() => setDocsOpen(!docsOpen)}
          className="w-full flex items-center gap-2 p-4 text-left hover:bg-dark-panel2 transition-colors"
        >
          <BookOpen size={18} className="text-dark-muted" />
          <h2 className="text-lg font-semibold  text-dark-text flex-1">Documentation</h2>
          {docsOpen ? <ChevronUp size={14} className="text-dark-muted" /> : <ChevronDown size={14} className="text-dark-muted" />}
        </button>
        {docsOpen && (
          <div className="px-6 pb-6 border-t border-dark-border pt-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold  text-dark-text mb-2">CLI Commands</h3>
              <div className="space-y-2">
                {[
                  { cmd: 'transcribe --url <url>', desc: 'Download and transcribe a single Instagram post' },
                  { cmd: 'transcribe-profile --username <handle> [--limit N] [--reels-only]', desc: 'Transcribe recent videos from a profile' },
                  { cmd: 'transcribe-file --path <file>', desc: 'Transcribe a local video file' },
                  { cmd: 'list', desc: 'List all saved transcripts' },
                  { cmd: 'get --id <shortcode>', desc: 'Retrieve a specific transcript as JSON' },
                ].map((c, i) => (
                  <div key={i}>
                    <code className="text-xs bg-dark-bg text-dark-success px-2 py-1 rounded font-mono font-dm-mono">
                      python3 src/main.py {c.cmd}
                    </code>
                    <p className="text-xs text-dark-muted mt-0.5 ml-1">{c.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold  text-dark-text mb-2">Whisper Model Comparison</h3>
              <div className="overflow-x-auto">
                <table className="text-xs text-dark-muted w-full">
                  <thead>
                    <tr className="border-b border-dark-border">
                      <th className="text-left py-1.5 pr-4">Model</th>
                      <th className="text-left py-1.5 pr-4">Size</th>
                      <th className="text-left py-1.5 pr-4">Speed</th>
                      <th className="text-left py-1.5">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'base', size: '74 MB', speed: 'Fast', accuracy: 'Good' },
                      { name: 'small', size: '244 MB', speed: 'Moderate', accuracy: 'Better' },
                      { name: 'medium', size: '769 MB', speed: 'Slow', accuracy: 'Great' },
                      { name: 'large', size: '1550 MB', speed: 'Very slow', accuracy: 'Best' },
                    ].map((m) => (
                      <tr key={m.name} className="border-b border-dark-border">
                        <td className="py-1.5 pr-4 font-mono font-dm-mono">{m.name}</td>
                        <td className="py-1.5 pr-4">{m.size}</td>
                        <td className="py-1.5 pr-4">{m.speed}</td>
                        <td className="py-1.5">{m.accuracy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold  text-dark-text mb-2">InstaLoader Notes</h3>
              <ul className="text-xs text-dark-muted space-y-1 list-disc list-inside">
                <li>Public profiles work without credentials</li>
                <li>Instagram may rate-limit anonymous requests after many downloads</li>
                <li>Private profiles require IG_USERNAME and IG_PASSWORD in .env</li>
                <li>Two-factor authentication is not supported via CLI login</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <a
                href="https://instaloader.github.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-cm-purple hover:underline"
              >
                <ExternalLink size={11} /> InstaLoader Docs
              </a>
              <a
                href="https://github.com/openai/whisper"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-cm-purple hover:underline"
              >
                <ExternalLink size={11} /> OpenAI Whisper
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
