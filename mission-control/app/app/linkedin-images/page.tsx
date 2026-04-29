"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ImageIcon,
  Upload,
  Wand2,
  Send,
  Trash2,
  RefreshCw,
  Loader2,
  AlertCircle,
  Check,
  Eye,
  Palette,
} from "lucide-react";
import ApiKeyBanner from "@/components/ApiKeyBanner";

interface PresetConfig {
  name: string;
  overlay_color: number[];
  overlay_alpha: number;
  headline_font: string;
  headline_color: number[];
  headline_size: number;
  subtitle_font: string;
  subtitle_color: number[];
  subtitle_size: number;
  cta_font: string;
  cta_color: number[];
  cta_size: number;
}

export default function LinkedInImagesPage() {
  const [backgrounds, setBackgrounds] = useState<string[]>([]);
  const [outputs, setOutputs] = useState<string[]>([]);
  const [presets, setPresets] = useState<Record<string, PresetConfig>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form state
  const [selectedBg, setSelectedBg] = useState("");
  const [headline, setHeadline] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [cta, setCta] = useState("");
  const [preset, setPreset] = useState("dark-authority");
  const [postText, setPostText] = useState("");

  // Action state
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [generatedImage, setGeneratedImage] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/linkedin-images");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBackgrounds(data.backgrounds || []);
      setOutputs(data.outputs || []);
      setPresets(data.presets || {});
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/linkedin-images", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSelectedBg(data.filename);
      setStatusMsg("Background uploaded");
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && /\.(png|jpg|jpeg|webp|gif)$/i.test(file.name)) {
      uploadFile(file);
    }
  };

  const generatePreview = async () => {
    if (!selectedBg) {
      setError("Select a background image first");
      return;
    }
    if (!headline && !subtitle && !cta) {
      setError("Enter at least one text field");
      return;
    }
    setGenerating(true);
    setError("");
    setGeneratedImage("");
    try {
      const res = await fetch("/api/linkedin-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", background: selectedBg, headline, subtitle, cta, preset }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGeneratedImage(data.filename);
      setStatusMsg("Image generated!");
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const publishToLinkedIn = async () => {
    if (!generatedImage) {
      setError("Generate a preview first");
      return;
    }
    setPublishing(true);
    setError("");
    try {
      const res = await fetch("/api/linkedin-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", filename: generatedImage, postText }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStatusMsg("Published to LinkedIn!");
      setGeneratedImage("");
      setHeadline("");
      setSubtitle("");
      setCta("");
      setPostText("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPublishing(false);
    }
  };

  const deleteBackground = async (filename: string) => {
    await fetch("/api/linkedin-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-background", filename }),
    });
    if (selectedBg === filename) setSelectedBg("");
    await fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-dark-muted" size={32} />
        <span className="ml-3 text-dark-muted">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ApiKeyBanner slug="linkedin-images" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold  text-dark-text">LinkedIn Image Generator</h1>
          <p className="text-sm text-dark-muted">Create branded post images — upload, overlay text, publish</p>
        </div>
        <button
          onClick={fetchData}
          className="p-2 text-dark-muted hover:text-dark-muted hover:bg-dark-panel2 rounded-lg"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Status / Error */}
      {error && (
        <div className="bg-dark-danger/10 border border-dark-danger/30 rounded-lg p-3 flex items-center gap-2 text-dark-danger text-sm">
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError("")} className="ml-auto text-dark-danger hover:opacity-80">×</button>
        </div>
      )}
      {statusMsg && (
        <div className="bg-dark-success/10 border border-dark-success/30 rounded-lg p-3 flex items-center gap-2 text-dark-success text-sm">
          <Check size={16} />
          {statusMsg}
          <button onClick={() => setStatusMsg("")} className="ml-auto text-dark-success hover:text-dark-success">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column — Inputs */}
        <div className="space-y-5">
          {/* Upload / Select Background */}
          <div className="bg-dark-panel rounded-lg border border-dark-border p-5">
            <h2 className="text-lg font-semibold  text-dark-text mb-3 flex items-center gap-2">
              <Upload size={18} />
              Background Image
            </h2>

            {/* Drag & Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                dragOver ? "border-cm-purple bg-cm-purple/10" : "border-dark-border hover:border-dark-border"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {uploading ? (
                <Loader2 className="animate-spin mx-auto text-cm-purple" size={24} />
              ) : (
                <>
                  <ImageIcon className="mx-auto text-dark-muted mb-2" size={32} />
                  <p className="text-sm text-dark-muted">Drop image here or click to upload</p>
                </>
              )}
            </div>

            {/* Background thumbnails */}
            {backgrounds.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {backgrounds.map((bg) => (
                  <div
                    key={bg}
                    className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedBg === bg ? "border-cm-purple" : "border-transparent hover:border-dark-border"
                    }`}
                    onClick={() => setSelectedBg(bg)}
                  >
                    <img
                      src={`/api/linkedin-images/preview?type=background&file=${bg}`}
                      alt={bg}
                      className="w-full h-20 object-cover"
                    />
                    {selectedBg === bg && (
                      <div className="absolute inset-0 bg-cm-purple/20 flex items-center justify-center">
                        <Check className="text-white bg-cm-purple rounded-full p-0.5" size={20} />
                      </div>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteBackground(bg); }}
                      className="absolute top-1 right-1 p-1 bg-dark-danger/100 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Text Inputs */}
          <div className="bg-dark-panel rounded-lg border border-dark-border p-5">
            <h2 className="text-lg font-semibold  text-dark-text mb-3 flex items-center gap-2">
              <Wand2 size={18} />
              Text Overlay
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-dark-text mb-1">Headline</label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Your big bold statement"
                  className="w-full px-3 py-2 border border-dark-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text mb-1">Subtitle</label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Supporting detail or question"
                  className="w-full px-3 py-2 border border-dark-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text mb-1">Call to Action</label>
                <input
                  type="text"
                  value={cta}
                  onChange={(e) => setCta(e.target.value)}
                  placeholder="Follow for more | Link in comments"
                  className="w-full px-3 py-2 border border-dark-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
                />
              </div>
            </div>
          </div>

          {/* Style Preset */}
          <div className="bg-dark-panel rounded-lg border border-dark-border p-5">
            <h2 className="text-lg font-semibold  text-dark-text mb-3 flex items-center gap-2">
              <Palette size={18} />
              Style Preset
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(presets).map(([key, p]) => {
                const overlayRgb = p.overlay_color;
                const headlineRgb = p.headline_color;
                return (
                  <button
                    key={key}
                    onClick={() => setPreset(key)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-colors ${
                      preset === key ? "border-cm-purple bg-cm-purple/10" : "border-dark-border hover:border-dark-border"
                    }`}
                  >
                    <div className="flex gap-1">
                      <div
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: `rgb(${overlayRgb.join(",")})` }}
                      />
                      <div
                        className="w-6 h-6 rounded border border-dark-border"
                        style={{ backgroundColor: `rgb(${headlineRgb.join(",")})` }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-dark-text">{p.name}</p>
                    </div>
                    {preset === key && <Check size={16} className="ml-auto text-cm-purple" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generatePreview}
            disabled={generating || !selectedBg}
            className="w-full py-3 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
          >
            {generating ? <Loader2 className="animate-spin" size={18} /> : <Eye size={18} />}
            {generating ? "Generating..." : "Generate Preview"}
          </button>
        </div>

        {/* Right Column — Preview & Publish */}
        <div className="space-y-5">
          {/* Preview */}
          <div className="bg-dark-panel rounded-lg border border-dark-border p-5">
            <h2 className="text-lg font-semibold  text-dark-text mb-3 flex items-center gap-2">
              <Eye size={18} />
              Preview
            </h2>
            <div className="bg-dark-panel2 rounded-lg overflow-hidden" style={{ aspectRatio: "1200/627" }}>
              {generatedImage ? (
                <img
                  src={`/api/linkedin-images/preview?type=output&file=${generatedImage}`}
                  alt="Generated preview"
                  className="w-full h-full object-contain"
                />
              ) : selectedBg ? (
                <div className="relative w-full h-full">
                  <img
                    src={`/api/linkedin-images/preview?type=background&file=${selectedBg}`}
                    alt="Background preview"
                    className="w-full h-full object-cover opacity-50"
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-dark-muted text-sm">
                    Click &quot;Generate Preview&quot; to see result
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-dark-muted text-sm">
                  Upload a background to get started
                </div>
              )}
            </div>
          </div>

          {/* Post Text + Publish */}
          {generatedImage && (
            <div className="bg-dark-panel rounded-lg border border-dark-border p-5 space-y-4">
              <h2 className="text-lg font-semibold  text-dark-text flex items-center gap-2">
                <Send size={18} />
                Publish to LinkedIn
              </h2>
              <div>
                <label className="block text-sm font-medium text-dark-text mb-1">Post Text (optional)</label>
                <textarea
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  placeholder="Write your LinkedIn post text here..."
                  rows={4}
                  className="w-full px-3 py-2 border border-dark-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple resize-none"
                />
              </div>
              <button
                onClick={publishToLinkedIn}
                disabled={publishing}
                className="w-full py-3 bg-cm-purple text-white rounded-lg hover:bg-cm-purple disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
              >
                {publishing ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                {publishing ? "Publishing..." : "Approve & Publish to LinkedIn"}
              </button>
            </div>
          )}

          {/* Recent Outputs */}
          {outputs.length > 0 && (
            <div className="bg-dark-panel rounded-lg border border-dark-border p-5">
              <h2 className="text-lg font-semibold  text-dark-text mb-3">Recent Outputs</h2>
              <div className="grid grid-cols-2 gap-2">
                {outputs.slice(0, 6).map((out) => (
                  <div key={out} className="relative group rounded-lg overflow-hidden border border-dark-border">
                    <img
                      src={`/api/linkedin-images/preview?type=output&file=${out}`}
                      alt={out}
                      className="w-full h-24 object-cover"
                    />
                    <button
                      onClick={() => setGeneratedImage(out)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium"
                    >
                      Use This
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
