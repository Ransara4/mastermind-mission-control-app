"use client";

import {
  Building2,
  MapPin,
  FileText,
  BookText,
  FileSpreadsheet,
  ExternalLink,
  Hash,
  Mail,
  Phone,
  Globe,
  FolderOpen,
} from "lucide-react";
import Link from "next/link";

const INVESTMENTS = [
  {
    name: "Example Property A",
    description: "Commercial property held under the company.",
    status: "active",
  },
  {
    name: "Example Investment B",
    description: "Partnership investment — hospitality sector.",
    status: "active",
  },
  {
    name: "Example Investment C",
    description: "Long-term equity holding.",
    status: "active",
  },
];

const QUICK_LINKS = [
  {
    label: "Zoho Books",
    href: "/app/zoho-books",
    icon: BookText,
    description: "Invoices, expenses, accounts",
  },
  {
    label: "Bookkeeping",
    href: "/app/bookkeeping",
    icon: FileSpreadsheet,
    description: "Bank statement classification and accounting import",
  },
];

const DROPBOX_DOCS: { label: string; url: string; type: "file" | "folder" }[] = [
  {
    label: "Company Registration (Example)",
    url: "#",
    type: "file",
  },
  {
    label: "Tax Registration",
    url: "#",
    type: "file",
  },
  {
    label: "Blank Letterhead",
    url: "#",
    type: "file",
  },
  {
    label: "All Corporate Documents",
    url: "#",
    type: "folder",
  },
  {
    label: "Payroll Records",
    url: "#",
    type: "folder",
  },
  {
    label: "Filing & Taxes",
    url: "#",
    type: "folder",
  },
];

const GOOGLE_DRIVE_DOCS = [
  {
    label: "Bookkeeping Processes (Current Year)",
    id: "",
    note: "Primary — updated regularly",
  },
  {
    label: "Bookkeeping Processes (Previous Year)",
    id: "",
    note: "Previous version",
  },
];

export default function Business2Page() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-dark-success/10 rounded-xl">
            <Building2 size={28} className="text-dark-success" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-dark-text">Example Ventures Ltd.</h1>
            <p className="text-dark-muted mt-1">
              Foreign investment holding company for real estate and investment operations.
            </p>
            <div className="flex flex-wrap gap-3 mt-3 text-sm text-dark-muted">
              <span className="flex items-center gap-1.5">
                <MapPin size={14} className="text-dark-muted" />
                <span className="font-medium">Domicile:</span>&nbsp;123 Example Street, Example City
              </span>
              <span className="flex items-center gap-1.5">
                <Mail size={14} className="text-dark-muted" />
                admin@example.com
              </span>
              <span className="flex items-center gap-1.5">
                <Phone size={14} className="text-dark-muted" />
                +1 (555) 000-0000
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Company Info + Tools grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Company Info */}
        <div className="bg-dark-panel border border-dark-border rounded-xl p-5">
          <h2 className=" font-semibold tracking-tight text-dark-text mb-4 flex items-center gap-2">
            <Hash size={16} className="text-dark-muted" /> Company Details
          </h2>
          <dl className="space-y-2 text-sm">
            {[
              ["Reg. No.", "000-000-000"],
              ["Tax ID", "00.000.000.0-000.0000"],
              ["Type", "Foreign Investment Company"],
              ["Status", "Active Legal Entity"],
              ["Director", "Example Director (100%)"],
              ["Sectors", "Real Estate · Management Consulting · Education"],
              ["Domicile", "123 Example Street, Example City"],
            ].map(([label, val]) => (
              <div key={label} className="flex gap-2">
                <dt className="w-36 flex-shrink-0 text-dark-muted font-medium">{label}</dt>
                <dd className="text-dark-text">{val}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Tools */}
        <div className="bg-dark-panel border border-dark-border rounded-xl p-5">
          <h2 className=" font-semibold tracking-tight text-dark-text mb-3 flex items-center gap-2">
            <Globe size={16} className="text-dark-muted" /> Tools
          </h2>
          <div className="space-y-2">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 p-3 rounded-lg border border-dark-border hover:border-dark-success/30 hover:bg-dark-success/10 transition-colors group"
                >
                  <Icon size={18} className="text-dark-success flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-dark-text text-sm group-hover:text-dark-success">{link.label}</p>
                    <p className="text-xs text-dark-muted">{link.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Investments */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-5">
        <h2 className=" font-semibold tracking-tight text-dark-text mb-4 flex items-center gap-2">
          <Building2 size={16} className="text-dark-muted" /> Investment Portfolio
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {INVESTMENTS.map((inv) => (
            <div key={inv.name} className="border border-dark-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className=" font-semibold tracking-tight text-dark-text text-sm">{inv.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-dark-success/20 text-dark-success font-medium">
                  {inv.status}
                </span>
              </div>
              <p className="text-xs text-dark-muted">{inv.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Google Drive */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-5">
        <h2 className=" font-semibold tracking-tight text-dark-text mb-3 flex items-center gap-2">
          <FileText size={16} className="text-dark-muted" /> Google Drive — Bookkeeping
        </h2>
        <div className="space-y-2">
          {GOOGLE_DRIVE_DOCS.map((doc) => (
            <div
              key={doc.label}
              className="flex items-center gap-3 p-3 rounded-lg border border-dark-border text-dark-muted"
            >
              <FileText size={16} className="text-cm-purple flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-dark-text text-sm">{doc.label}</p>
                {doc.note && <p className="text-xs text-dark-muted">{doc.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dropbox Key Docs */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-5">
        <h2 className=" font-semibold tracking-tight text-dark-text mb-3 flex items-center gap-2">
          <FileText size={16} className="text-dark-muted" /> Dropbox — Key Documents
        </h2>
        <div className="space-y-1.5">
          {DROPBOX_DOCS.map((doc) => {
            const Icon = doc.type === "folder" ? FolderOpen : FileText;
            return (
              <div
                key={doc.label}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-dark-border text-dark-muted"
              >
                <Icon
                  size={15}
                  className={`flex-shrink-0 ${doc.type === "folder" ? "text-yellow-500" : "text-dark-muted"}`}
                />
                <span className="text-sm text-dark-text flex-1">{doc.label}</span>
                <ExternalLink size={13} className="text-dark-muted flex-shrink-0 opacity-30" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
