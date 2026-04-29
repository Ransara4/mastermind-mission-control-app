"use client";

import { useState } from "react";
import {
  Edit2,
  ChevronRight,
  Eye,
  Hash,
  Archive,
  Clock,
  Trash2,
  ThumbsUp,
  MessageSquare,
} from "lucide-react";
import { ContentItem } from "@/hooks/useLinkedInData";
import { formatNumber } from "./shared";

export function ContentCard({
  item,
  nextStatus,
  onEdit,
  onMove,
  onDelete,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  item: ContentItem;
  nextStatus?: ContentItem["status"];
  onEdit: () => void;
  onMove: (id: string, status: ContentItem["status"]) => void;
  onDelete: () => void;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const [showActions, setShowActions] = useState(false);

  const typeColors: Record<string, string> = {
    text: "bg-dark-panel2 text-dark-muted",
    image: "bg-pink-500/20 text-pink-300",
    carousel: "bg-cm-purple/20 text-cm-purple",
    video: "bg-dark-danger/20 text-dark-danger",
    poll: "bg-cm-purple/20 text-cm-purple",
    document: "bg-orange-500/20 text-orange-300",
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", item.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      className={`rounded-lg border border-dark-border p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-sm ${
        isDragging ? "opacity-40" : "bg-dark-panel"
      }`}
    >
      {/* Title */}
      <p className="font-medium text-sm text-dark-text line-clamp-2 mb-1.5">
        {item.title}
      </p>

      {/* Preview */}
      {item.body && (
        <p className="text-xs text-dark-muted line-clamp-2 mb-2">{item.body}</p>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            typeColors[item.contentType] || typeColors.text
          }`}
        >
          {item.contentType}
        </span>
        {item.scheduledFor && (
          <span className="text-[10px] text-purple-600 flex items-center gap-0.5">
            <Clock size={10} />
            {new Date(item.scheduledFor).toLocaleDateString()}
          </span>
        )}
        {item.hashtags.length > 0 && (
          <span className="text-[10px] text-dark-muted flex items-center gap-0.5">
            <Hash size={10} />
            {item.hashtags.length}
          </span>
        )}
      </div>

      {/* Analytics (for published) */}
      {item.status === "published" && item.analytics && (
        <div className="flex items-center gap-3 text-[10px] text-dark-muted mb-2">
          {item.analytics.impressions !== undefined && (
            <span className="flex items-center gap-0.5">
              <Eye size={10} />
              {formatNumber(item.analytics.impressions)}
            </span>
          )}
          {item.analytics.likes !== undefined && (
            <span className="flex items-center gap-0.5">
              <ThumbsUp size={10} />
              {item.analytics.likes}
            </span>
          )}
          {item.analytics.comments !== undefined && (
            <span className="flex items-center gap-0.5">
              <MessageSquare size={10} />
              {item.analytics.comments}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className="flex items-center gap-1 pt-1 border-t border-dark-border">
          <button
            onClick={onEdit}
            className="p-1 rounded hover:bg-dark-panel2 text-dark-muted hover:text-cm-purple"
            title="Edit"
          >
            <Edit2 size={12} />
          </button>
          {nextStatus && (
            <button
              onClick={() => onMove(item.id, nextStatus)}
              className="p-1 rounded hover:bg-dark-panel2 text-dark-muted hover:text-dark-success flex items-center gap-0.5"
              title={`Move to ${nextStatus}`}
            >
              <ChevronRight size={12} />
              <span className="text-[10px]">{nextStatus}</span>
            </button>
          )}
          {item.status !== "archived" && (
            <button
              onClick={() => onMove(item.id, "archived")}
              className="p-1 rounded hover:bg-dark-panel2 text-dark-muted hover:text-dark-muted"
              title="Archive"
            >
              <Archive size={12} />
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-dark-panel2 text-dark-muted hover:text-dark-danger ml-auto"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
