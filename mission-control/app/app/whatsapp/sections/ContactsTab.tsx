"use client";

import { Contact } from "./types";

interface ContactsTabProps {
  contactQuery: string;
  setContactQuery: (v: string) => void;
  contactResults: Contact[];
  contactSearching: boolean;
  searchContacts: () => void;
  selectContact: (c: Contact) => void;
}

export function ContactsTab({
  contactQuery,
  setContactQuery,
  contactResults,
  contactSearching,
  searchContacts,
  selectContact,
}: ContactsTabProps) {
  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
      <h2 className="text-lg font-semibold tracking-tight text-dark-text mb-4">Contact Search</h2>
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name, phone, or alias..."
          value={contactQuery}
          onChange={(e) => setContactQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchContacts()}
          className="flex-1 px-3 py-2 border border-dark-border rounded-lg text-sm bg-dark-panel2 text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple"
        />
        <button
          onClick={searchContacts}
          disabled={contactSearching || !contactQuery.trim()}
          className="px-6 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 text-sm font-medium"
        >
          {contactSearching ? "Searching..." : "Search"}
        </button>
      </div>

      {contactResults.length > 0 ? (
        <div className="border border-dark-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-panel2 text-left text-xs font-medium text-dark-muted uppercase">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone / JID</th>
                <th className="px-4 py-3">Alias</th>
                <th className="px-4 py-3 w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {contactResults.map((c, i) => (
                <tr key={i} className="hover:bg-dark-panel2 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-dark-text">
                    {c.name || c.pushName || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-dark-muted font-mono">
                    {c.phone || c.jid || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-dark-muted">{c.alias || "-"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => selectContact(c)}
                      className="px-3 py-1 bg-cm-purple text-white rounded text-xs font-medium hover:bg-cm-purple/80"
                    >
                      Select
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : contactQuery && !contactSearching ? (
        <p className="text-sm text-dark-muted text-center py-8">
          No contacts found. Try a different search.
        </p>
      ) : (
        <p className="text-sm text-dark-muted text-center py-8">
          Search your WhatsApp contacts by name, phone number, or alias.
          <br />
          Select a contact to auto-fill the compose form.
        </p>
      )}
    </div>
  );
}
