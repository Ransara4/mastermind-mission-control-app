"use client";

import { useMemo } from "react";
import { Calendar } from "lucide-react";
import { ContentItem } from "@/hooks/useLinkedInData";

export function CalendarView({
  items,
  onEdit,
}: {
  items: ContentItem[];
  onEdit: (item: ContentItem) => void;
}) {
  const scheduledAndPublished = items.filter(
    (i) => i.status === "scheduled" || i.status === "published"
  );

  // Group by date
  const byDate = useMemo(() => {
    const map: Record<string, ContentItem[]> = {};
    for (const item of scheduledAndPublished) {
      const date = item.scheduledFor || item.publishedAt || item.updatedAt;
      const key = new Date(date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return Object.entries(map).sort(
      ([, a], [, b]) =>
        new Date(a[0].scheduledFor || a[0].publishedAt || a[0].updatedAt).getTime() -
        new Date(b[0].scheduledFor || b[0].publishedAt || b[0].updatedAt).getTime()
    );
  }, [scheduledAndPublished]);

  if (byDate.length === 0) {
    return (
      <div className="bg-dark-panel rounded-xl border border-dark-border p-12 text-center">
        <Calendar size={32} className="mx-auto mb-3 text-dark-muted" />
        <p className="text-dark-muted">No scheduled or published content yet</p>
        <p className="text-sm text-dark-muted mt-1">
          Move content to &quot;Scheduled&quot; and set a date to see it here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {byDate.map(([date, dateItems]) => (
        <div
          key={date}
          className="bg-dark-panel rounded-xl border border-dark-border overflow-hidden"
        >
          <div className="px-4 py-2.5 bg-dark-bg border-b border-dark-border">
            <h3 className="font-semibold  text-sm text-dark-text">{date}</h3>
          </div>
          <div className="divide-y divide-dark-border">
            {dateItems.map((item) => (
              <div
                key={item.id}
                className="px-4 py-3 flex items-center justify-between hover:bg-dark-bg cursor-pointer"
                onClick={() => onEdit(item)}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      item.status === "published"
                        ? "bg-dark-success/100"
                        : "bg-purple-500"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-dark-text">
                      {item.title}
                    </p>
                    <p className="text-xs text-dark-muted">
                      {item.contentType}
                      {item.scheduledFor &&
                        ` \u2022 ${new Date(
                          item.scheduledFor
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    item.status === "published"
                      ? "bg-dark-success/20 text-dark-success"
                      : "bg-purple-500/20 text-purple-300"
                  }`}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
