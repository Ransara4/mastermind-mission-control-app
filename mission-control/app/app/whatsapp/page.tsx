"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AutocompleteResult, Chat, Config, Contact, Message, Tab, Template } from "./sections/types";
import { ComposeTab } from "./sections/ComposeTab";
import { ChatsTab } from "./sections/ChatsTab";
import { ContactsTab } from "./sections/ContactsTab";
import { HistoryTab } from "./sections/HistoryTab";
import { SettingsTab } from "./sections/SettingsTab";

interface AttachedFile {
  filePath: string;
  fileName: string;
  size: number;
  type: string;
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "compose", label: "Compose", icon: "+" },
  { id: "chats", label: "Chats", icon: "💬" },
  { id: "contacts", label: "Contacts", icon: "👤" },
  { id: "history", label: "History", icon: "📊" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

export default function WhatsAppPage() {
  const [tab, setTab] = useState<Tab>("compose");
  const [config, setConfig] = useState<Config | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);

  // Compose state
  const [sendTo, setSendTo] = useState("");
  const [sendToName, setSendToName] = useState("");
  const [sendMessage, setSendMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Autocomplete
  const [acQuery, setAcQuery] = useState("");
  const [acResults, setAcResults] = useState<AutocompleteResult[]>([]);
  const [acLoading, setAcLoading] = useState(false);
  const [acOpen, setAcOpen] = useState(false);
  const [acHighlight, setAcHighlight] = useState(-1);
  const acTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const acContainerRef = useRef<HTMLDivElement>(null);

  // Contact search
  const [contactQuery, setContactQuery] = useState("");
  const [contactResults, setContactResults] = useState<Contact[]>([]);
  const [contactSearching, setContactSearching] = useState(false);

  // Chat search
  const [chatSearch, setChatSearch] = useState("");

  // Settings
  const [sigDraft, setSigDraft] = useState("");
  const [sigEnabled, setSigEnabled] = useState(true);
  const [templateDraft, setTemplateDraft] = useState<Template>({ label: "", text: "" });
  const [configSaving, setConfigSaving] = useState(false);

  const msgEndRef = useRef<HTMLDivElement>(null);

  // Load config on mount
  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp?action=config");
      const data: Config = await res.json();
      setConfig(data);
      setSigDraft(data.signature);
      setSigEnabled(data.signatureEnabled);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Autocomplete — debounced search
  const fetchAutocomplete = useCallback(async (q: string) => {
    if (q.length < 2) {
      setAcResults([]);
      setAcOpen(false);
      return;
    }
    setAcLoading(true);
    try {
      const res = await fetch(`/api/whatsapp?action=autocomplete&q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setAcResults(data.results || []);
      setAcOpen((data.results || []).length > 0);
      setAcHighlight(-1);
    } catch {
      setAcResults([]);
    }
    setAcLoading(false);
  }, []);

  const handleAcInput = useCallback(
    (val: string) => {
      setAcQuery(val);
      setSendToName(val);
      setSendTo("");
      if (acTimerRef.current) clearTimeout(acTimerRef.current);
      acTimerRef.current = setTimeout(() => fetchAutocomplete(val), 200);
    },
    [fetchAutocomplete]
  );

  const selectAcResult = useCallback((r: AutocompleteResult) => {
    setSendTo(r.jid);
    setSendToName(r.name);
    setAcQuery(r.name);
    setAcOpen(false);
    setAcResults([]);
  }, []);

  // Close autocomplete on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (acContainerRef.current && !acContainerRef.current.contains(e.target as Node)) {
        setAcOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load chats
  const loadChats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp?action=chats");
      const data = await res.json();
      setChats(Array.isArray(data.chats) ? data.chats : []);
    } catch {
      setChats([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "chats") loadChats();
  }, [tab, loadChats]);

  // Load messages for a chat
  const loadMessages = async (chat: Chat) => {
    setSelectedChat(chat);
    setMsgLoading(true);
    try {
      const res = await fetch(
        `/api/whatsapp?action=messages&jid=${encodeURIComponent(chat.jid || "")}&limit=30`
      );
      const data = await res.json();
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch {
      setMessages([]);
    }
    setMsgLoading(false);
    setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  // Contact search
  const searchContacts = async () => {
    if (!contactQuery.trim()) return;
    setContactSearching(true);
    try {
      const res = await fetch(
        `/api/whatsapp?action=contacts&q=${encodeURIComponent(contactQuery)}`
      );
      const data = await res.json();
      setContactResults(Array.isArray(data.contacts) ? data.contacts : []);
    } catch {
      setContactResults([]);
    }
    setContactSearching(false);
  };

  // Upload file
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/whatsapp/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setAttachedFile({
          filePath: data.filePath,
          fileName: data.fileName,
          size: data.size,
          type: data.type,
        });
      } else {
        setSendResult({ ok: false, text: data.error || "Upload failed" });
      }
    } catch {
      setSendResult({ ok: false, text: "Upload failed" });
    }
    setUploading(false);
  };

  // Send message (text or file)
  const handleSend = async () => {
    if (!sendTo || (!sendMessage && !attachedFile)) return;
    setSending(true);
    setSendResult(null);
    try {
      if (attachedFile) {
        const res = await fetch("/api/whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "send-file",
            to: sendTo,
            filePath: attachedFile.filePath,
            caption: sendMessage || "",
            contactName: sendToName || sendTo,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSendResult({ ok: true, text: `File "${attachedFile.fileName}" sent!` });
          setSendMessage("");
          setAttachedFile(null);
          loadConfig();
        } else {
          setSendResult({ ok: false, text: data.error || data.result || "Failed" });
        }
      } else {
        const res = await fetch("/api/whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "send-text",
            to: sendTo,
            message: sendMessage,
            contactName: sendToName || sendTo,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSendResult({ ok: true, text: "Message sent!" });
          setSendMessage("");
          loadConfig();
        } else {
          setSendResult({ ok: false, text: data.error || data.result || "Failed" });
        }
      }
    } catch {
      setSendResult({ ok: false, text: "Network error" });
    }
    setSending(false);
  };

  // Save settings
  const saveSettings = async () => {
    setConfigSaving(true);
    try {
      await fetch("/api/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-config",
          signature: sigDraft,
          signatureEnabled: sigEnabled,
          templates: config?.templates || [],
        }),
      });
      await loadConfig();
    } catch {
      /* ignore */
    }
    setConfigSaving(false);
  };

  // Add template
  const addTemplate = async () => {
    if (!templateDraft.label || !templateDraft.text) return;
    const templates = [...(config?.templates || []), templateDraft];
    setConfigSaving(true);
    try {
      await fetch("/api/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-config", templates }),
      });
      setTemplateDraft({ label: "", text: "" });
      await loadConfig();
    } catch {
      /* ignore */
    }
    setConfigSaving(false);
  };

  // Delete template
  const deleteTemplate = async (idx: number) => {
    const templates = (config?.templates || []).filter((_, i) => i !== idx);
    await fetch("/api/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-config", templates }),
    });
    await loadConfig();
  };

  // Select contact from search — auto-fills compose
  const selectContact = (c: Contact) => {
    setSendTo(c.jid || c.phone || "");
    setSendToName(c.alias || c.name || c.pushName || c.phone || "");
    setTab("compose");
  };

  const filteredChats = chats.filter((c) => {
    const name = (c.name || c.pushName || c.jid || "").toLowerCase();
    return name.includes(chatSearch.toLowerCase());
  });

  const stats = config?.stats;
  const topContacts: [string, number][] = stats
    ? Object.entries(stats.byContact)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
    : [];

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-cm-purple/15 rounded-lg p-2">
            <span className="text-3xl">💬</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-dark-text">WhatsApp Agent</h1>
            <p className="text-sm text-dark-muted">
              {config?.signatureEnabled
                ? `Signature: "${(config.signature || "").replace(/^\n+/, "").trim()}"`
                : "Signature disabled"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-3 text-center">
            <div className="bg-dark-panel border border-dark-border rounded-lg px-4 py-2">
              <div className="text-xl font-bold text-dark-text">{stats?.totalSent ?? 0}</div>
              <div className="text-xs text-dark-muted">Messages</div>
            </div>
            <div className="bg-dark-panel border border-dark-border rounded-lg px-4 py-2">
              <div className="text-xl font-bold text-dark-text">{stats?.totalFiles ?? 0}</div>
              <div className="text-xs text-dark-muted">Files</div>
            </div>
            <div className="bg-dark-panel border border-dark-border rounded-lg px-4 py-2">
              <div className="text-xl font-bold text-dark-text">
                {(stats?.totalSent ?? 0) + (stats?.totalFiles ?? 0)}
              </div>
              <div className="text-xs text-dark-muted">Total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-panel2 rounded-lg p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-dark-panel text-cm-purple shadow-sm shadow-black/20"
                : "text-dark-muted hover:text-dark-text"
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "compose" && (
        <ComposeTab
          config={config}
          sendTo={sendTo}
          setSendTo={setSendTo}
          sendToName={sendToName}
          setSendToName={setSendToName}
          sendMessage={sendMessage}
          setSendMessage={setSendMessage}
          sending={sending}
          sendResult={sendResult}
          setSendResult={setSendResult}
          attachedFile={attachedFile}
          setAttachedFile={setAttachedFile}
          uploading={uploading}
          setUploading={setUploading}
          dragOver={dragOver}
          setDragOver={setDragOver}
          fileInputRef={fileInputRef}
          acQuery={acQuery}
          setAcQuery={setAcQuery}
          acResults={acResults}
          acLoading={acLoading}
          acOpen={acOpen}
          setAcOpen={setAcOpen}
          acHighlight={acHighlight}
          setAcHighlight={setAcHighlight}
          acContainerRef={acContainerRef}
          handleAcInput={handleAcInput}
          selectAcResult={selectAcResult}
          handleSend={handleSend}
          handleFileUpload={handleFileUpload}
        />
      )}

      {tab === "chats" && (
        <ChatsTab
          chats={chats}
          selectedChat={selectedChat}
          messages={messages}
          loading={loading}
          msgLoading={msgLoading}
          chatSearch={chatSearch}
          setChatSearch={setChatSearch}
          filteredChats={filteredChats}
          loadChats={loadChats}
          loadMessages={loadMessages}
          msgEndRef={msgEndRef}
          onReply={(chat) => {
            setSendTo(chat.jid || "");
            setSendToName(chat.name || chat.pushName || "");
            setTab("compose");
          }}
        />
      )}

      {tab === "contacts" && (
        <ContactsTab
          contactQuery={contactQuery}
          setContactQuery={setContactQuery}
          contactResults={contactResults}
          contactSearching={contactSearching}
          searchContacts={searchContacts}
          selectContact={selectContact}
        />
      )}

      {tab === "history" && (
        <HistoryTab
          stats={stats}
          topContacts={topContacts}
        />
      )}

      {tab === "settings" && (
        <SettingsTab
          config={config}
          sigDraft={sigDraft}
          setSigDraft={setSigDraft}
          sigEnabled={sigEnabled}
          setSigEnabled={setSigEnabled}
          templateDraft={templateDraft}
          setTemplateDraft={setTemplateDraft}
          configSaving={configSaving}
          saveSettings={saveSettings}
          addTemplate={addTemplate}
          deleteTemplate={deleteTemplate}
        />
      )}
    </div>
  );
}
