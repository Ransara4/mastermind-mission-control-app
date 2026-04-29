"use client";

import { CheckCircle, FileText, Loader2, Upload } from "lucide-react";
import { type Batch } from "@/hooks/useColdOutreachData";

export function BatchHistory({
  batches,
  selectedCampaignId,
  uploadingBatchId,
  onUpload,
  onSelectCampaignError,
}: {
  batches: Batch[];
  selectedCampaignId: string;
  uploadingBatchId: string | null;
  onUpload: (batchId: string, campaignId: string) => Promise<{ uploaded: number }>;
  onSelectCampaignError: (msg: string) => void;
}) {
  const sortedBatches = [...batches].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl">
      <div className="px-4 py-3 border-b border-dark-border">
        <h3 className="font-semibold text-dark-text flex items-center gap-2">
          <FileText size={16} />
          Batch History
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-border text-left">
              <th className="px-4 py-2.5 font-medium text-dark-muted">Batch ID</th>
              <th className="px-4 py-2.5 font-medium text-dark-muted">ICP</th>
              <th className="px-4 py-2.5 font-medium text-dark-muted">Date</th>
              <th className="px-4 py-2.5 font-medium text-dark-muted text-right">Searched</th>
              <th className="px-4 py-2.5 font-medium text-dark-muted text-right">Verified</th>
              <th className="px-4 py-2.5 font-medium text-dark-muted text-right">Qualified</th>
              <th className="px-4 py-2.5 font-medium text-dark-muted text-right">Track A</th>
              <th className="px-4 py-2.5 font-medium text-dark-muted text-right">Track B</th>
              <th className="px-4 py-2.5 font-medium text-dark-muted text-right">Uploaded</th>
              <th className="px-4 py-2.5 font-medium text-dark-muted">Campaign</th>
              <th className="px-4 py-2.5 font-medium text-dark-muted">Upload Status</th>
              <th className="px-4 py-2.5 font-medium text-dark-muted"></th>
            </tr>
          </thead>
          <tbody>
            {sortedBatches.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-dark-muted">
                  No batches yet. Run a pipeline to create the first batch.
                </td>
              </tr>
            ) : (
              sortedBatches.map((batch, i) => (
                <tr
                  key={batch.id}
                  className={`border-b border-dark-border ${i % 2 === 1 ? "bg-dark-bg/50" : ""}`}
                >
                  <td className="px-4 py-2.5 font-mono text-xs text-dark-muted">{batch.id}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs bg-cm-purple/10 text-cm-purple px-2 py-0.5 rounded-full">
                      {batch.icp_tag}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-dark-muted">
                    {new Date(batch.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-right text-dark-text">{batch.candidates_searched}</td>
                  <td className="px-4 py-2.5 text-right text-dark-text">{batch.emails_verified}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-dark-success">{batch.qualified}</td>
                  <td className="px-4 py-2.5 text-right text-cm-purple">{batch.track_a}</td>
                  <td className="px-4 py-2.5 text-right text-cm-purple">{batch.track_b}</td>
                  <td className="px-4 py-2.5 text-right text-dark-text">{batch.uploaded}</td>
                  <td className="px-4 py-2.5 text-dark-muted text-xs">
                    {batch.instantly_campaign_id ? (
                      <a
                        href={`https://app.instantly.ai/app/campaign/${batch.instantly_campaign_id}/leads`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cm-purple hover:underline"
                      >
                        View Campaign
                      </a>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {batch.instantly_uploaded_at ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-dark-success/20 text-dark-success">
                        <CheckCircle size={10} />
                        {batch.instantly_upload_count} uploaded {new Date(batch.instantly_uploaded_at).toLocaleDateString()}
                      </span>
                    ) : batch.uploaded > 0 ? (
                      <span className="text-xs text-dark-warn font-medium">Pending</span>
                    ) : (
                      <span className="text-xs text-dark-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {batch.uploaded > 0 && !batch.instantly_uploaded_at && (
                      <button
                        onClick={async () => {
                          if (!selectedCampaignId) {
                            onSelectCampaignError("Select a campaign first");
                            return;
                          }
                          await onUpload(batch.id, selectedCampaignId);
                        }}
                        disabled={uploadingBatchId === batch.id}
                        className="flex items-center gap-1.5 px-3 py-1 text-xs bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 whitespace-nowrap"
                      >
                        {uploadingBatchId === batch.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Upload size={12} />
                        )}
                        {uploadingBatchId === batch.id ? "Uploading..." : "Upload to Instantly"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
