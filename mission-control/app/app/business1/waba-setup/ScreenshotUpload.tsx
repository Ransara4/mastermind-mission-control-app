"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

interface AnalysisResult {
  stage: string | null;
  errors: string[];
  search_query: string;
  description: string;
  relevant?: boolean;
  irrelevant_reason?: string;
  error_codes?: string[];
}

interface ScreenshotStatusInfo {
  state: UploadState;
  description: string | null;
  previewUrl: string | null;
  errorMessage: string | null;
}

interface ScreenshotUploadProps {
  onAnalysisComplete: (analysis: AnalysisResult) => void;
  onStatusChange?: (status: ScreenshotStatusInfo) => void;
  disabled?: boolean;
  clearKey?: number;         // increment to reset component
  currentQuery?: string;     // existing text query to combine with image
}

type UploadState = "idle" | "uploading" | "success" | "error";

export default function ScreenshotUpload({ onAnalysisComplete, onStatusChange, disabled, clearKey, currentQuery }: ScreenshotUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset when parent increments clearKey (e.g., on new text search)
  useEffect(() => {
    if (clearKey !== undefined && clearKey > 0) {
      reset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearKey]);

  const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
  const MAX_SIZE = 10 * 1024 * 1024;

  const handleFile = useCallback(
    async (file: File) => {
      // Client-side validation
      if (!ALLOWED_TYPES.includes(file.type)) {
        const msg = "Only PNG, JPEG, WebP, or GIF images are supported";
        setUploadState("error");
        onStatusChange?.({ state: "error", description: null, previewUrl: null, errorMessage: msg });
        return;
      }
      if (file.size > MAX_SIZE) {
        const msg = "File too large (max 10MB)";
        setUploadState("error");
        onStatusChange?.({ state: "error", description: null, previewUrl: null, errorMessage: msg });
        return;
      }

      // Show preview
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setUploadState("uploading");

      try {
        const fd = new FormData();
        fd.append("file", file);
        if (currentQuery?.trim()) {
          fd.append("context", currentQuery.trim());
        }
        const res = await fetch("/api/business1/waba-upload", { method: "POST", body: fd });
        const data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data.error || "Upload failed");
        }

        // Check relevance
        if (data.analysis?.relevant === false) {
          const msg = data.analysis.irrelevant_reason
            ? `Not relevant: ${data.analysis.irrelevant_reason}`
            : "This image does not look relevant to WABA or Meta setup. Please upload a screenshot from the WhatsApp Business Account setup process.";
          setUploadState("error");
          onStatusChange?.({ state: "error", description: null, previewUrl: url, errorMessage: msg });
          return;
        }

        setUploadState("success");
        const desc = data.analysis?.description || null;
        onStatusChange?.({ state: "success", description: desc, previewUrl: url, errorMessage: null });
        onAnalysisComplete(data.analysis);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setUploadState("error");
        onStatusChange?.({ state: "error", description: null, previewUrl: url, errorMessage: msg });
      }
    },
    [onAnalysisComplete, onStatusChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const reset = () => {
    setUploadState("idle");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    onStatusChange?.({ state: "idle", description: null, previewUrl: null, errorMessage: null });
  };

  return (
    <div className="relative flex items-center">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleInputChange}
        className="hidden"
        aria-label="Upload screenshot for analysis"
      />

      {/* Main button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        disabled={disabled || uploadState === "uploading"}
        title="Upload screenshot to identify issue"
        className={`flex items-center gap-1.5 px-3 py-2.5 text-sm rounded-xl border transition-colors disabled:opacity-50 ${
          uploadState === "success"
            ? "bg-dark-success/10 border-dark-success/30 text-dark-success"
            : uploadState === "error"
            ? "bg-dark-danger/10 border-dark-danger/30 text-dark-danger"
            : "bg-dark-panel2 border-dark-border text-dark-muted hover:border-cm-purple hover:text-cm-purple hover:bg-cm-purple/10"
        }`}
      >
        {uploadState === "uploading" ? (
          <Loader2 size={15} className="animate-spin" />
        ) : uploadState === "success" ? (
          <CheckCircle size={15} />
        ) : uploadState === "error" ? (
          <AlertTriangle size={15} />
        ) : (
          <Camera size={15} />
        )}
        <span className="text-xs font-medium">
          {uploadState === "uploading"
            ? "Analyzing..."
            : uploadState === "success"
            ? "Analyzed"
            : uploadState === "error"
            ? "Retry"
            : "Screenshot"}
        </span>
      </button>

    </div>
  );
}
