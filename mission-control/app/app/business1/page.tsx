"use client";

import Link from "next/link";
import { ExternalLink, Users, Rocket, Hash, Database, BookOpen, Map } from "lucide-react";

export default function RioPage() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <Rocket size={28} className="text-cm-purple" />
        <h1 className="text-2xl font-bold tracking-tight text-dark-text">BUSINESS1</h1>
      </div>
      <p className="text-dark-muted mb-8">WhatsApp AI Copilot for SMBs</p>

      <div className="bg-dark-panel border border-dark-border rounded-xl p-5 mb-8">
        <p className="text-dark-muted text-sm font-medium mb-3">
          Most BUSINESS1 information lives in the BUSINESS1 Notion workspace.
        </p>
        <div className="flex items-center gap-3">
          <a
            href="https://notion.so"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-dark-panel2 border border-dark-border hover:border-cm-purple/40 text-dark-text text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Open BUSINESS1 Notion
            <ExternalLink size={14} />
          </a>
          <a
            href="https://app.slack.com/client/T08GVKXHFM5/D09L0SC6LES"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-cm-purple hover:bg-cm-purple/80 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            title="BUSINESS1 Slack channel not yet configured"
          >
            <Hash size={14} />
            BUSINESS1 Slack
          </a>
        </div>
      </div>

      <h2 className="text-lg font-semibold tracking-tight text-dark-text mb-4">Sections</h2>
      <div className="grid gap-3">
        <Link
          href="/app/business1/icps"
          className="flex items-center gap-4 p-4 bg-dark-panel border border-dark-border rounded-xl hover:border-cm-purple hover:shadow-sm transition-all"
        >
          <div className="w-10 h-10 bg-cm-purple/10 rounded-lg flex items-center justify-center">
            <Users size={20} className="text-cm-purple" />
          </div>
          <div>
            <div className="font-medium text-dark-text">ICPs</div>
            <div className="text-sm text-dark-muted">Ideal Customer Profiles — research and targeting</div>
          </div>
        </Link>
        <Link
          href="/app/business1/store-leads"
          className="flex items-center gap-4 p-4 bg-dark-panel border border-dark-border rounded-xl hover:border-cm-purple hover:shadow-sm transition-all"
        >
          <div className="w-10 h-10 bg-cm-purple/15 rounded-lg flex items-center justify-center">
            <Database size={20} className="text-cm-purple" />
          </div>
          <div>
            <div className="font-medium text-dark-text">Store Leads</div>
            <div className="text-sm text-dark-muted">Shopify store sourcing — StoreLeads.app pipeline</div>
          </div>
        </Link>
        <Link
          href="/app/business1/waba-setup"
          className="flex items-center gap-4 p-4 bg-dark-panel border border-dark-border rounded-xl hover:border-cm-purple hover:shadow-sm transition-all"
        >
          <div className="w-10 h-10 bg-cm-purple/15 rounded-lg flex items-center justify-center">
            <BookOpen size={20} className="text-cm-purple" />
          </div>
          <div>
            <div className="font-medium text-dark-text">WABA Setup</div>
            <div className="text-sm text-dark-muted">WhatsApp Business API setup knowledge base</div>
          </div>
        </Link>
        <a
          href="https://business1-onboarding.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 p-4 bg-dark-panel border border-dark-border rounded-xl hover:border-cm-purple hover:shadow-sm transition-all"
        >
          <div className="w-10 h-10 bg-cm-purple/15 rounded-lg flex items-center justify-center">
            <Map size={20} className="text-cm-purple" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-dark-text flex items-center gap-2">
              Onboarding Guide
              <ExternalLink size={12} className="text-dark-muted" />
            </div>
            <div className="text-sm text-dark-muted">Interactive WABA onboarding flowchart — business1-onboarding.vercel.app</div>
          </div>
        </a>
      </div>
    </div>
  );
}
