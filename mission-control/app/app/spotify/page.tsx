"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Music2, Play, Pause, SkipForward, SkipBack, Search,
  Clock, CheckCircle, XCircle, ListMusic, Plus, Loader2,
} from "lucide-react";

interface Status {
  lastRun: string | null;
  lastCommand: string | null;
  authenticated: boolean;
  currentTrack: string | null;
  isPlaying: boolean;
  lastResult: string | null;
}

function formatRelTime(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

const EXAMPLE_PLAYLIST = `At Last - Etta James
La Vie En Rose - Edith Piaf
Unforgettable - Nat King Cole
Can't Help Falling in Love - Elvis Presley
The Very Thought of You - Nat King Cole
Moon River - Frank Sinatra
My Funny Valentine - Chet Baker
Someone Like You - Adele
All of Me - John Legend
A Thousand Years - Christina Perri
Make You Feel My Love - Adele
Thinking Out Loud - Ed Sheeran
Your Song - Elton John
Unchained Melody - The Righteous Brothers
When I Fall in Love - Nat King Cole
I Will Always Love You - Whitney Houston
Fly Me to the Moon - Frank Sinatra
Come Away with Me - Norah Jones
Let's Stay Together - Al Green
Wonderful Tonight - Eric Clapton`;

export default function SpotifyPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cmdOutput, setCmdOutput] = useState<string | null>(null);

  // Playlist creator
  const [plName, setPlName] = useState("");
  const [plTracks, setPlTracks] = useState("");
  const [plLoading, setPlLoading] = useState(false);
  const [plResult, setPlResult] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/agent-status?agent=spotify");
      if (res.ok) setStatus(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    loadStatus();
    const iv = setInterval(loadStatus, 10000);
    return () => clearInterval(iv);
  }, [loadStatus]);

  const runCommand = async (command: string, args: string[] = []) => {
    setLoading(command);
    setCmdOutput(null);
    try {
      const res = await fetch("/api/spotify/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, args }),
      });
      const data = await res.json();
      if (data.output) setCmdOutput(data.output);
      await loadStatus();
    } catch (err) {
      setCmdOutput(`Error: ${err}`);
    } finally {
      setLoading(null);
    }
  };

  const handlePlay = () => {
    if (!searchQuery.trim()) return;
    runCommand("play", [searchQuery.trim()]);
  };

  const handleCreatePlaylist = async () => {
    const name = plName.trim();
    const tracks = plTracks.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!name) return;

    setPlLoading(true);
    setPlResult(null);
    try {
      const args = [name];
      if (tracks.length > 0) {
        args.push(tracks.join(" | "));
      }
      const res = await fetch("/api/spotify/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "create-playlist", args }),
      });
      const data = await res.json();
      setPlResult(data.output || data.error || "Done");
      await loadStatus();
    } catch (err) {
      setPlResult(`Error: ${err}`);
    } finally {
      setPlLoading(false);
    }
  };

  const authed = status?.authenticated ?? false;

  const Btn = ({ label, icon: Icon, cmd, disabled }: { label: string; icon: any; cmd: string; disabled?: boolean }) => (
    <button
      onClick={() => runCommand(cmd)}
      disabled={!!loading || disabled}
      className="bg-dark-panel2 border border-dark-border rounded-lg p-3 flex flex-col items-center gap-2 hover:border-cm-purple/40 transition-colors disabled:opacity-40"
    >
      {loading === cmd ? (
        <Loader2 className="w-4 h-4 text-cm-purple animate-spin" />
      ) : (
        <Icon className="w-4 h-4 text-cm-purple" />
      )}
      <span className="text-dark-muted text-xs text-center">{label}</span>
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="bg-cm-purple/15 rounded-lg p-3">
            <Music2 className="w-6 h-6 text-cm-purple" />
          </div>
          <div className="flex-1">
            <h1 className="text-dark-text font-bold text-xl tracking-tight">Spotify</h1>
            <p className="text-dark-muted text-sm">Playback control via Web API</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${authed ? "bg-dark-success/10 text-dark-success border-dark-success/20" : "bg-dark-danger/10 text-dark-danger border-dark-danger/20"}`}>
            {authed ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {authed ? "Authenticated" : "Not Authenticated"}
          </div>
        </div>
      </div>

      {/* Setup notice */}
      {!authed && (
        <div className="bg-dark-panel border border-dark-warn/30 rounded-xl p-4">
          <p className="text-dark-warn text-sm font-medium mb-1">Not yet set up</p>
          <p className="text-dark-muted text-xs mb-2">Create a Spotify app at developer.spotify.com, add your Client ID to .env, then run:</p>
          <code className="block bg-dark-panel2 border border-dark-border rounded p-2 text-dark-muted text-xs font-dm-mono">
            node ~/.openclaw/workspace/agents/spotify/src/index.js setup
          </code>
        </div>
      )}

      {/* Now playing */}
      {authed && (
        <div className="bg-dark-panel border border-dark-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-2 h-2 rounded-full ${status?.isPlaying ? "bg-dark-success animate-pulse" : "bg-dark-border"}`} />
            <span className="text-dark-muted text-xs">{status?.isPlaying ? "Now playing" : "Paused"}</span>
          </div>
          <p className="text-dark-text font-medium text-sm">
            {status?.currentTrack ?? "Nothing playing"}
          </p>
        </div>
      )}

      {/* Playback controls */}
      {authed && (
        <div className="bg-dark-panel border border-dark-border rounded-xl p-4">
          <p className="text-dark-muted text-xs font-medium mb-3">Controls</p>

          {/* Search + Play */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePlay()}
              placeholder="Search and play a song, album, or artist..."
              className="flex-1 bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm placeholder:text-dark-muted/50 focus:outline-none focus:border-cm-purple/40"
            />
            <button
              onClick={handlePlay}
              disabled={!!loading || !searchQuery.trim()}
              className="bg-cm-purple/15 border border-cm-purple/30 rounded-lg px-4 py-2 text-cm-purple text-sm font-medium hover:bg-cm-purple/25 transition-colors disabled:opacity-40 flex items-center gap-2"
            >
              {loading === "play" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Play
            </button>
          </div>

          {/* Resume / Pause / Next / Prev */}
          <div className="grid grid-cols-4 gap-2">
            <Btn label="Resume" icon={Play} cmd="play" />
            <Btn label="Pause" icon={Pause} cmd="pause" />
            <Btn label="Next" icon={SkipForward} cmd="next" />
            <Btn label="Previous" icon={SkipBack} cmd="prev" />
          </div>
        </div>
      )}

      {/* Command output */}
      {cmdOutput && (
        <div className="bg-dark-panel2 border border-dark-border rounded-xl p-3">
          <pre className="text-dark-muted text-xs font-dm-mono whitespace-pre-wrap">{cmdOutput}</pre>
        </div>
      )}

      {/* Create Playlist */}
      {authed && (
        <div className="bg-dark-panel border border-dark-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ListMusic className="w-4 h-4 text-cm-purple" />
            <p className="text-dark-muted text-xs font-medium">Create Playlist</p>
          </div>

          <input
            type="text"
            value={plName}
            onChange={(e) => setPlName(e.target.value)}
            placeholder="Playlist name"
            className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm placeholder:text-dark-muted/50 focus:outline-none focus:border-cm-purple/40 mb-3"
          />

          <textarea
            value={plTracks}
            onChange={(e) => setPlTracks(e.target.value)}
            placeholder="One track per line (Artist - Song or just a search query)"
            rows={6}
            className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm placeholder:text-dark-muted/50 focus:outline-none focus:border-cm-purple/40 resize-y font-dm-mono mb-3"
          />

          <div className="flex items-center gap-3">
            <button
              onClick={handleCreatePlaylist}
              disabled={plLoading || !plName.trim()}
              className="bg-cm-purple/15 border border-cm-purple/30 rounded-lg px-4 py-2 text-cm-purple text-sm font-medium hover:bg-cm-purple/25 transition-colors disabled:opacity-40 flex items-center gap-2"
            >
              {plLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create
            </button>
            <button
              onClick={() => { setPlName("Beautiful Romantic Classics"); setPlTracks(EXAMPLE_PLAYLIST); }}
              className="text-dark-muted text-xs hover:text-cm-purple transition-colors"
            >
              Load example
            </button>
          </div>

          {plResult && (
            <pre className="mt-3 bg-dark-panel2 border border-dark-border rounded-lg p-3 text-dark-muted text-xs font-dm-mono whitespace-pre-wrap">{plResult}</pre>
          )}
        </div>
      )}

      {/* CLI reference */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-4">
        <p className="text-dark-muted text-xs font-medium mb-3">CLI Reference</p>
        <div className="space-y-1.5">
          {[
            ["play <query>", "Search and play a track/album/playlist"],
            ["pause / next / prev", "Playback control"],
            ["volume <0-100>", "Set volume"],
            ["search <query>", "Search Spotify"],
            ["playlists", "List your playlists"],
            ["create-playlist <name> <tracks>", "Create playlist (tracks separated by |)"],
            ["devices", "Show active devices"],
          ].map(([cmd, desc]) => (
            <div key={cmd} className="flex items-start gap-3">
              <code className="text-cm-purple text-xs font-dm-mono whitespace-nowrap">{cmd}</code>
              <span className="text-dark-muted text-xs">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Last activity */}
      {status?.lastRun && (
        <div className="bg-dark-panel border border-dark-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-dark-muted text-xs mb-2">
            <Clock className="w-3 h-3" />
            Last: <span className="font-dm-mono">{status.lastCommand}</span> — {formatRelTime(status.lastRun)}
          </div>
          {status.lastResult && (
            <div className="bg-dark-panel2 border border-dark-border rounded p-2 text-dark-muted text-xs font-dm-mono truncate">
              {typeof status.lastResult === "string" ? status.lastResult : JSON.stringify(status.lastResult)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
