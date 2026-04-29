"use client";

import { Chat, Message } from "./types";

interface ChatsTabProps {
  chats: Chat[];
  selectedChat: Chat | null;
  messages: Message[];
  loading: boolean;
  msgLoading: boolean;
  chatSearch: string;
  setChatSearch: (v: string) => void;
  filteredChats: Chat[];
  loadChats: () => void;
  loadMessages: (chat: Chat) => void;
  msgEndRef: React.RefObject<HTMLDivElement | null>;
  onReply: (chat: Chat) => void;
}

export function ChatsTab({
  loading,
  msgLoading,
  chatSearch,
  setChatSearch,
  filteredChats,
  selectedChat,
  messages,
  loadChats,
  loadMessages,
  msgEndRef,
  onReply,
}: ChatsTabProps) {
  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Chat list */}
      <div className="col-span-1 bg-dark-panel rounded-xl border border-dark-border overflow-hidden">
        <div className="p-3 border-b border-dark-border flex gap-2">
          <input
            type="text"
            placeholder="Search chats..."
            value={chatSearch}
            onChange={(e) => setChatSearch(e.target.value)}
            className="flex-1 px-3 py-2 border border-dark-border rounded-lg text-sm bg-dark-panel2 text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple"
          />
          <button
            onClick={loadChats}
            className="px-3 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 text-xs font-medium"
          >
            Refresh
          </button>
        </div>
        <div className="max-h-[550px] overflow-y-auto">
          {loading ? (
            <p className="p-4 text-sm text-dark-muted">Loading chats...</p>
          ) : filteredChats.length === 0 ? (
            <p className="p-4 text-sm text-dark-muted">No chats found</p>
          ) : (
            filteredChats.map((chat, i) => (
              <button
                key={chat.jid || i}
                onClick={() => loadMessages(chat)}
                className={`w-full text-left px-4 py-3 border-b border-dark-border hover:bg-dark-panel2 transition-colors ${
                  selectedChat?.jid === chat.jid ? "bg-cm-purple/10" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm text-dark-text truncate">
                    {chat.name || chat.pushName || chat.jid}
                  </div>
                  {(chat.unreadCount ?? 0) > 0 && (
                    <span className="px-2 py-0.5 bg-cm-purple text-white text-xs rounded-full">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
                {chat.lastMessageTime && (
                  <div className="text-xs text-dark-muted mt-0.5">
                    {new Date(chat.lastMessageTime).toLocaleString()}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Conversation view */}
      <div className="col-span-2 bg-dark-panel rounded-xl border border-dark-border overflow-hidden flex flex-col">
        <div className="p-4 border-b border-dark-border flex items-center justify-between">
          <h3 className="font-semibold text-dark-text">
            {selectedChat
              ? selectedChat.name || selectedChat.pushName || selectedChat.jid
              : "Select a chat"}
          </h3>
          {selectedChat && (
            <button
              onClick={() => onReply(selectedChat)}
              className="px-3 py-1.5 bg-cm-purple text-white rounded-lg text-xs font-medium hover:bg-cm-purple/80"
            >
              Reply
            </button>
          )}
        </div>
        <div className="flex-1 max-h-[500px] overflow-y-auto p-4 space-y-3 bg-dark-bg">
          {msgLoading ? (
            <p className="text-sm text-dark-muted">Loading messages...</p>
          ) : !selectedChat ? (
            <p className="text-sm text-dark-muted text-center mt-12">
              Click a chat to view messages
            </p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-dark-muted">No messages</p>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div
                  key={msg.id || i}
                  className={`flex ${msg.fromMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm shadow-sm shadow-black/20 ${
                      msg.fromMe
                        ? "bg-cm-purple text-white rounded-br-md"
                        : "bg-dark-panel text-dark-text rounded-bl-md border border-dark-border"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text || "[media]"}</p>
                    {msg.timestamp && (
                      <p
                        className={`text-xs mt-1 ${
                          msg.fromMe ? "text-white/60" : "text-dark-muted"
                        }`}
                      >
                        {new Date(msg.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={msgEndRef} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
