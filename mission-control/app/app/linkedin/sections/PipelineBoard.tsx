"use client";

import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { ContentItem } from "@/hooks/useLinkedInData";
import { PIPELINE_COLUMNS } from "./shared";
import { ContentCard } from "./ContentCard";

export function PipelineBoard({
  items,
  onEdit,
  onMove,
  onDelete,
  onCreateIn,
}: {
  items: ContentItem[];
  onEdit: (item: ContentItem) => void;
  onMove: (id: string, status: ContentItem["status"]) => void;
  onDelete: (id: string) => void;
  onCreateIn: (status: ContentItem["status"]) => void;
}) {
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const columnItems = useMemo(() => {
    const map: Record<string, ContentItem[]> = {};
    for (const col of PIPELINE_COLUMNS) {
      map[col.key] = items
        .filter((i) => i.status === col.key)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    return map;
  }, [items]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {PIPELINE_COLUMNS.map((col) => {
        const Icon = col.icon;
        const colItems = columnItems[col.key] || [];
        const isOver = dragOverCol === col.key;
        const nextStatus = PIPELINE_COLUMNS[
          PIPELINE_COLUMNS.findIndex((c) => c.key === col.key) + 1
        ]?.key;

        return (
          <div
            key={col.key}
            className={`rounded-xl border-2 transition-colors ${
              isOver
                ? "border-cm-purple bg-cm-purple/10/50"
                : "border-dark-border bg-dark-panel"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverCol(col.key);
            }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              if (id && id !== col.key) {
                onMove(id, col.key);
              }
              setDragOverCol(null);
              setDraggingId(null);
            }}
          >
            {/* Column Header */}
            <div className="px-4 py-3 border-b border-dark-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon size={16} className={col.color} />
                <span className="font-semibold text-sm text-dark-text">
                  {col.label}
                </span>
                <span className="text-xs bg-dark-panel2 text-dark-muted px-1.5 py-0.5 rounded-full">
                  {colItems.length}
                </span>
              </div>
              <button
                onClick={() => onCreateIn(col.key)}
                className="p-1 rounded hover:bg-dark-panel2 text-dark-muted hover:text-dark-muted"
                title={`Add to ${col.label}`}
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Column Items */}
            <div className="p-2 space-y-2 min-h-[120px]">
              {colItems.length === 0 && (
                <div className="text-center py-6 text-dark-muted text-xs">
                  No {col.label.toLowerCase()}
                </div>
              )}
              {colItems.map((item) => (
                <ContentCard
                  key={item.id}
                  item={item}
                  nextStatus={nextStatus}
                  onEdit={() => onEdit(item)}
                  onMove={onMove}
                  onDelete={() => onDelete(item.id)}
                  isDragging={draggingId === item.id}
                  onDragStart={() => setDraggingId(item.id)}
                  onDragEnd={() => setDraggingId(null)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
