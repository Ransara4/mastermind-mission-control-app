"use client";

import { useState, useMemo } from "react";
import { useMockMemories, useTogglePin } from "@/hooks/useMockMemory";
import {
  Search,
  Tag,
  Calendar,
  Pin,
  Download,
  Folder,
  Filter
} from "lucide-react";

interface Memory {
  _id: string;
  key: string;
  title: string;
  content: string;
  tags: string[];
  category?: string;
  isPinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

// Simple fuzzy match function
function fuzzyMatch(str: string, pattern: string): boolean {
  if (!pattern) return true;

  const patternLower = pattern.toLowerCase();
  const strLower = str.toLowerCase();

  // Exact substring match
  if (strLower.includes(patternLower)) return true;

  // Fuzzy match - check if all characters in pattern appear in order
  let patternIdx = 0;
  for (let i = 0; i < strLower.length && patternIdx < patternLower.length; i++) {
    if (strLower[i] === patternLower[patternIdx]) {
      patternIdx++;
    }
  }
  return patternIdx === patternLower.length;
}

export default function MemoryPage() {
  const memories = useMockMemories();
  const { pinnedIds, togglePin: handleTogglePin } = useTogglePin();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "title">("date-desc");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });

  // Filter and sort memories
  const filteredMemories = useMemo(() => {
    if (!memories) return [];

    let filtered = memories.filter((memory: any) => {
      // Fuzzy search
      const matchesSearch = fuzzyMatch(memory.title, searchQuery) ||
        fuzzyMatch(memory.content, searchQuery) ||
        memory.tags.some((tag: string) => fuzzyMatch(tag, searchQuery));

      // Tag filter
      const matchesTag = !selectedTag || memory.tags.includes(selectedTag);

      // Category filter
      const matchesCategory = !selectedCategory || memory.category === selectedCategory;

      // Date range filter
      let matchesDateRange = true;
      if (dateRange.start) {
        const startTime = new Date(dateRange.start).getTime();
        matchesDateRange = matchesDateRange && memory.createdAt >= startTime;
      }
      if (dateRange.end) {
        const endTime = new Date(dateRange.end).getTime() + 86400000; // Add 1 day
        matchesDateRange = matchesDateRange && memory.createdAt < endTime;
      }

      return matchesSearch && matchesTag && matchesCategory && matchesDateRange;
    });

    // Sort
    filtered.sort((a: any, b: any) => {
      // Pinned items always first
      const aPinned = pinnedIds.has(a._id);
      const bPinned = pinnedIds.has(b._id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      switch (sortBy) {
        case "date-desc":
          return b.createdAt - a.createdAt;
        case "date-asc":
          return a.createdAt - b.createdAt;
        case "title":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [memories, searchQuery, selectedTag, selectedCategory, sortBy, dateRange, pinnedIds]);

  // Get all unique tags and categories
  const { allTags, allCategories } = useMemo(() => {
    if (!memories) return { allTags: [], allCategories: [] };

    const tags = new Set<string>();
    const categories = new Set<string>();

    memories.forEach((m: any) => {
      m.tags.forEach((t: string) => tags.add(t));
      if (m.category) categories.add(m.category);
    });

    return {
      allTags: Array.from(tags).sort(),
      allCategories: Array.from(categories).sort(),
    };
  }, [memories]);

  // Export memory as JSON
  const exportMemory = (memory: Memory) => {
    const dataStr = JSON.stringify(memory, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `memory-${memory.key}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export all filtered memories
  const exportAll = () => {
    const dataStr = JSON.stringify(filteredMemories, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `memories-export-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (memories === undefined) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-dark-panel2 rounded mb-4"></div>
          <div className="h-4 w-32 bg-dark-panel2 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-dark-text mb-2">Memory Bank</h2>
          <p className="text-dark-muted">
            Long-term memories and knowledge base
          </p>
        </div>
        <button
          onClick={exportAll}
          className="flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors"
        >
          <Download size={16} />
          Export All
        </button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-dark-muted" size={20} />
          <input
            type="text"
            placeholder="Fuzzy search memories (e.g., 'trllo' finds 'Trello')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-dark-border bg-dark-panel2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cm-purple shadow-sm text-dark-text placeholder:text-dark-muted"
          />
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Sort */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-dark-muted" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 border border-dark-border bg-dark-panel2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="title">Title A-Z</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-dark-muted" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-1.5 border border-dark-border bg-dark-panel2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text"
              placeholder="Start"
            />
            <span className="text-dark-muted">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-1.5 border border-dark-border bg-dark-panel2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text"
              placeholder="End"
            />
            {(dateRange.start || dateRange.end) && (
              <button
                onClick={() => setDateRange({ start: "", end: "" })}
                className="text-xs text-dark-muted hover:text-dark-text"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Categories */}
        {allCategories.length > 0 && (
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-dark-muted">
              <Folder size={16} />
              <span>Category:</span>
            </div>
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedCategory === null
                  ? "bg-cm-purple text-white"
                  : "bg-dark-panel2 text-dark-text hover:bg-dark-panel2"
              }`}
            >
              All
            </button>
            {allCategories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category === selectedCategory ? null : category)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedCategory === category
                    ? "bg-cm-purple text-white"
                    : "bg-dark-panel2 text-dark-text hover:bg-dark-panel2"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-dark-muted">
              <Tag size={16} />
              <span>Tags:</span>
            </div>
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedTag === null
                  ? "bg-cm-purple text-white"
                  : "bg-dark-panel2 text-dark-text hover:bg-dark-panel2"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedTag === tag
                    ? "bg-cm-purple text-white"
                    : "bg-dark-panel2 text-dark-text hover:bg-dark-panel2"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-1">
          <div className="bg-dark-panel rounded-lg border border-dark-border overflow-hidden flex flex-col shadow-sm shadow-black/20" style={{ maxHeight: "600px" }}>
            <div className="p-4 border-b border-dark-border bg-dark-panel2">
              <p className="text-sm font-medium text-dark-text">
                {filteredMemories.length} {filteredMemories.length === 1 ? "Memory" : "Memories"}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredMemories.length === 0 ? (
                <div className="p-4 text-center text-dark-muted">
                  <p className="text-sm">No memories found</p>
                </div>
              ) : (
                filteredMemories.map((memory: any) => (
                  <button
                    key={memory._id}
                    onClick={() => setSelectedMemory(memory)}
                    className={`w-full text-left p-4 border-b border-dark-border transition-colors ${
                      selectedMemory?._id === memory._id
                        ? "bg-cm-purple/10"
                        : "hover:bg-dark-panel2"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {pinnedIds.has(memory._id) && (
                            <Pin size={14} className="text-cm-purple flex-shrink-0" />
                          )}
                          <h4 className="font-semibold text-dark-text text-sm line-clamp-1">
                            {memory.title}
                          </h4>
                        </div>
                        {memory.category && (
                          <span className="text-xs text-dark-muted bg-dark-panel2 px-1.5 py-0.5 rounded mt-1 inline-block">
                            {memory.category}
                          </span>
                        )}
                        <p className="text-xs text-dark-muted mt-1">
                          {new Date(memory.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Detail View */}
        <div className="lg:col-span-2">
          {selectedMemory ? (
            <div className="bg-dark-panel rounded-lg border border-dark-border p-6 shadow-sm shadow-black/20" style={{ maxHeight: "600px", overflow: "auto" }}>
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold tracking-tight text-dark-text mb-2 flex items-center gap-2">
                    {pinnedIds.has(selectedMemory._id) && (
                      <Pin size={24} className="text-cm-purple" />
                    )}
                    {selectedMemory.title}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-dark-muted flex-wrap">
                    <div className="flex items-center gap-1">
                      <Calendar size={16} />
                      {new Date(selectedMemory.createdAt).toLocaleDateString()}
                    </div>
                    <span>•</span>
                    <span>Key: {selectedMemory.key}</span>
                    {selectedMemory.category && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Folder size={16} />
                          {selectedMemory.category}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTogglePin(selectedMemory._id)}
                    className={`p-2 rounded-lg transition-colors ${
                      pinnedIds.has(selectedMemory._id)
                        ? "bg-cm-purple text-white hover:bg-cm-purple/80"
                        : "bg-dark-panel2 text-dark-muted hover:bg-dark-panel2"
                    }`}
                    title={pinnedIds.has(selectedMemory._id) ? "Unpin" : "Pin"}
                  >
                    <Pin size={18} />
                  </button>
                  <button
                    onClick={() => exportMemory(selectedMemory)}
                    className="p-2 bg-dark-panel2 text-dark-muted rounded-lg hover:bg-dark-panel2 transition-colors"
                    title="Export"
                  >
                    <Download size={18} />
                  </button>
                </div>
              </div>

              {/* Tags */}
              {selectedMemory.tags.length > 0 && (
                <div className="mb-6 flex flex-wrap gap-2">
                  {selectedMemory.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-sm bg-cm-purple/10 text-cm-purple rounded-full border border-cm-purple/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Content */}
              <div className="prose prose-sm prose-invert max-w-none text-dark-text whitespace-pre-wrap prose-headings:text-dark-text prose-p:text-dark-muted prose-strong:text-dark-text prose-code:text-cm-purple prose-code:bg-cm-purple/10 prose-a:text-cm-purple">
                {selectedMemory.content}
              </div>
            </div>
          ) : (
            <div className="bg-dark-panel rounded-lg border border-dark-border p-6 shadow-sm shadow-black/20 flex items-center justify-center text-dark-muted" style={{ minHeight: "400px" }}>
              <div className="text-center">
                <div className="text-4xl mb-4">📚</div>
                <p className="text-lg font-medium">No memory selected</p>
                <p className="text-sm mt-2">Click a memory to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
