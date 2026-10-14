import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useLocation } from "react-router-dom";
import { agentAPI, userAPI, chatAPI, uploadAPI } from "../../services/api";
import {
  MessageSquare,
  User,
  Send,
  Paperclip,
  Trash2,
  FileText,
  Clock,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Participant {
  id: number;
  name: string;
  email: string;
  role: string;
  isAvailable?: boolean;
}

interface ChatMessage {
  id: number;
  senderId: number;
  receiverId: number;
  message: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  createdAt: string;
  sender: {
    name: string;
    role: string;
  };
}

const AdminAgentChat: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (location.state?.openParticipantId && participants.length > 0) {
      const found = participants.find((p) => p.id === location.state.openParticipantId);
      if (found) {
        setSelectedParticipant(found);
      }
    }
  }, [location.state?.openParticipantId, participants]);

  // Paginated chat history states
  const [messagesPage, setMessagesPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Send Message States
  const [text, setText] = useState("");
  const [attUrl, setAttUrl] = useState("");
  const [attName, setAttName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch participants list on load
  useEffect(() => {
    const fetchParticipants = async () => {
      setLoadingParticipants(true);
      try {
        if (user?.role === "ADMIN") {
          // Admins chat with agents
          const data = await agentAPI.list();
          setParticipants(data);
        } else if (user?.role === "AGENT") {
          // Agents chat with admins
          const data = await userAPI.listAll({ role: "ADMIN" });
          setParticipants(data);
        }
      } catch (err) {
        console.error("Failed to load internal chat participants:", err);
      } finally {
        setLoadingParticipants(false);
      }
    };

    if (user) fetchParticipants();
  }, [user]);

  const isNearBottom = () => {
    if (!chatContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  };

  const syncLatestMessages = async (isInitial = false) => {
    if (!selectedParticipant) return;
    try {
      const res = await chatAPI.getHistory(selectedParticipant.id, { page: 1, limit: 30 });
      const newMessagesList = Array.isArray(res) ? res : res.messages;
      const resHasMore = Array.isArray(res) ? false : res.hasMore;

      setMessages((prev) => {
        if (isInitial || prev.length === 0) {
          setHasMoreMessages(resHasMore);
          setMessagesPage(1);
          setTimeout(() => {
            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
          }, 100);
          return newMessagesList;
        }

        const prevIds = new Set(prev.map((m) => m.id));
        const newMessages = newMessagesList.filter((m: any) => !prevIds.has(m.id));

        if (newMessages.length > 0) {
          const nearBottom = isNearBottom();
          const updated = [...prev, ...newMessages];

          if (nearBottom) {
            setTimeout(() => {
              if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
              }
            }, 100);
          }
          return updated;
        }
        return prev;
      });
    } catch (err) {
      console.error("Failed to sync latest internal messages:", err);
    }
  };

  useEffect(() => {
    if (!selectedParticipant) {
      setMessages([]);
      return;
    }
    setLoadingChat(true);
    syncLatestMessages(true).finally(() => setLoadingChat(false));

    // Poll history every 15 seconds for responsive chat feel (only when tab is visible)
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        syncLatestMessages(false);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedParticipant]);

  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop === 0 && hasMoreMessages && !loadingMore && selectedParticipant) {
      setLoadingMore(true);
      const previousScrollHeight = target.scrollHeight;

      try {
        const nextPage = messagesPage + 1;
        const res = await chatAPI.getHistory(selectedParticipant.id, { page: nextPage, limit: 30 });
        const newMessagesList = Array.isArray(res) ? res : res.messages;
        const resHasMore = Array.isArray(res) ? false : res.hasMore;

        setMessages((prev) => [...newMessagesList, ...prev]);
        setMessagesPage(nextPage);
        setHasMoreMessages(resHasMore);

        setTimeout(() => {
          if (chatContainerRef.current) {
            const newScrollHeight = chatContainerRef.current.scrollHeight;
            chatContainerRef.current.scrollTop = newScrollHeight - previousScrollHeight;
          }
        }, 50);
      } catch (err) {
        console.error("Failed to load more internal messages:", err);
      } finally {
        setLoadingMore(false);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    setError("");

    try {
      const file = e.target.files[0];
      const result = await uploadAPI.uploadFile(file);
      setAttUrl(result.secure_url);
      setAttName(result.fileName);
    } catch (err: any) {
      setError("File upload failed. Format must be Image, PDF or Word (max 10MB).");
    } finally {
      setUploading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParticipant || (!text.trim() && !attUrl)) return;
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        message: text,
        attachmentUrl: attUrl || undefined,
        attachmentName: attName || undefined,
      };

      await chatAPI.sendMessage(selectedParticipant.id, payload);
      setText("");
      setAttUrl("");
      setAttName("");
      await syncLatestMessages(true);
    } catch (err: any) {
      setError("Failed to dispatch internal message.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      {/* HEADER */}
      <div className={`border-b pb-6 shrink-0 ${isLight ? "border-slate-100" : "border-white/5"}`}>
        <div className="space-y-1.5 text-left">
          <div className="flex items-center space-x-2 text-[#6D5DF6] font-semibold text-xs tracking-wider uppercase">
            <MessageSquare className="w-4 h-4" />
            <span>Staff HQ Comms</span>
          </div>
          <h2 className={`text-3xl font-extrabold tracking-tight ${
            isLight ? "text-[#0F172A]" : "text-white"
          }`}>Internal Operator Communication</h2>
          <p className={`text-xs max-w-2xl leading-relaxed ${
            isLight ? "text-slate-500" : "text-[#A1A1AA]"
          }`}>
            Secure private channels between Support Engineers (Agents) and System Administrators.
          </p>
        </div>
      </div>

      {error && (
        <div className={`border p-4 rounded-xl flex items-center space-x-3 text-xs shrink-0 ${
          isLight ? "bg-red-50 border-red-200 text-red-800" : "bg-red-500/10 border border-red-500/20 text-red-400"
        }`}>
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* CHAT INTERACTION DESKTOP VIEW */}
      <div className={`border rounded-[24px] shadow-sm flex-1 flex overflow-hidden min-h-0 ${
        isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
      }`}>
        {/* PARTICIPANTS LEFT COLUMN */}
        <div className={`w-1/3 border-r flex flex-col min-w-[220px] max-w-[320px] ${
          isLight ? "border-slate-100 bg-slate-50/20" : "border-white/5 bg-[#121A2B]/40"
        }`}>
          <div className={`p-4 border-b shrink-0 text-left ${
            isLight ? "bg-slate-50/50 border-slate-100" : "bg-white/[0.01] border-white/5"
          }`}>
            <h3 className={`font-extrabold text-xs uppercase tracking-wider ${
              isLight ? "text-[#0F172A]" : "text-white"
            }`}>
              {user?.role === "ADMIN" ? "Support Agents" : "System Administrators"}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {loadingParticipants ? (
              <div className="py-12 flex justify-center">
                <div className="w-5 h-5 border-2 border-[#6D5DF6]/30 border-t-[#6D5DF6] rounded-full animate-spin" />
              </div>
            ) : participants.length === 0 ? (
              <div className={`text-center py-12 text-xs ${isLight ? "text-slate-400" : "text-zinc-600"}`}>No active staff discovered.</div>
            ) : (
              participants.map((part) => {
                const isSelected = selectedParticipant?.id === part.id;
                return (
                  <button
                    key={part.id}
                    onClick={() => setSelectedParticipant(part)}
                    className={`w-full text-left p-3.5 rounded-xl transition-all duration-300 flex items-center space-x-3 border group cursor-pointer ${
                      isSelected
                        ? isLight
                          ? "bg-indigo-50 border-indigo-200/50 shadow-xs text-[#0F172A]"
                          : "bg-indigo-500/10 border-indigo-500/20 shadow-md text-white"
                        : isLight
                          ? "bg-transparent border-transparent hover:bg-slate-50 text-slate-700"
                          : "bg-transparent border-transparent hover:bg-white/5 text-zinc-300"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold font-mono text-xs group-hover:scale-105 transition-transform duration-300 ${
                      isLight 
                        ? "bg-indigo-50 text-[#6D5DF6]" 
                        : "bg-indigo-500/10 text-indigo-400"
                    }`}>
                      {part.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <h4 className={`font-bold text-xs sm:text-sm truncate ${
                        isLight ? "text-slate-800" : "text-white"
                      }`}>{part.name}</h4>
                      <p className={`text-[10px] capitalize ${
                        isLight ? "text-slate-500" : "text-zinc-500"
                      }`}>{part.role.toLowerCase()}</p>
                    </div>

                    {part.isAvailable !== undefined && (
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          part.isAvailable ? "bg-[#22C55E]" : isLight ? "bg-slate-300" : "bg-zinc-600"
                        }`}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ACTIVE CONVERSATION CANVAS */}
        <div className={`flex-1 flex flex-col min-w-0 ${
          isLight ? "bg-slate-50/10" : "bg-white/[0.01]"
        }`}>
          {selectedParticipant ? (
            <>
              {/* CHAT HEADER */}
              <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
                isLight ? "bg-slate-50/50 border-slate-100" : "bg-white/[0.01] border-white/5"
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono text-xs ${
                    isLight ? "bg-purple-50 text-purple-600" : "bg-purple-500/15 text-purple-400"
                  }`}>
                    {selectedParticipant.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <h4 className={`font-bold text-sm ${isLight ? "text-[#0F172A]" : "text-white"}`}>{selectedParticipant.name}</h4>
                    <p className={`text-[10px] ${isLight ? "text-slate-500" : "text-zinc-500"}`}>{selectedParticipant.email}</p>
                  </div>
                </div>

                <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                  isLight 
                    ? "text-[#6D5DF6] bg-indigo-50 border-indigo-200" 
                    : "text-indigo-400 bg-indigo-500/10 border-indigo-500/15"
                }`}>
                  Secure Private Link
                </span>
              </div>

              {/* MESSAGES LOG CONTAINER */}
              <div 
                ref={chatContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-5 space-y-4"
              >
                {loadingChat ? (
                  <div className="py-24 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-[#6D5DF6]/30 border-t-[#6D5DF6] rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-2 text-xs py-24">
                    <MessageSquare className={`w-8 h-8 ${isLight ? "text-slate-300" : "text-zinc-700"} animate-pulse`} />
                    <span className={isLight ? "text-slate-400" : "text-[#A1A1AA]"}>No messages logged on this link. Say hello!</span>
                  </div>
                ) : (
                  <>
                    {/* LOADING MORE SPINNER */}
                    {loadingMore && (
                      <div className={`py-3 text-center text-[10px] font-extrabold uppercase tracking-widest flex items-center justify-center space-x-1.5 border rounded-xl mb-4 ${
                        isLight 
                          ? "text-[#6D5DF6] bg-indigo-50 border-indigo-100" 
                          : "text-indigo-400 bg-indigo-500/5 border border-indigo-500/10"
                      }`}>
                        <div className="w-1.5 h-1.5 bg-[#6D5DF6] rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1.5 h-1.5 bg-[#6D5DF6] rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1.5 h-1.5 bg-[#6D5DF6] rounded-full animate-bounce" />
                        <span>Loading Older Messages</span>
                      </div>
                    )}

                    {/* NO MORE MESSAGES INDICATOR */}
                    {!hasMoreMessages && !loadingMore && messages.length > 0 && (
                      <div className={`py-2 text-center text-[9px] font-extrabold uppercase tracking-widest border-b mb-4 ${
                        isLight ? "text-slate-400 border-slate-100" : "text-zinc-500 border-white/5"
                      }`}>
                        No earlier messages.
                      </div>
                    )}

                    {(() => {
                      let lastGroupDate = "";
                      return messages.map((msg) => {
                        const isMyMsg = msg.senderId === user?.id;

                        // Group messages by date
                        const msgGroupDate = (() => {
                          const date = new Date(msg.createdAt);
                          const today = new Date();
                          const yesterday = new Date();
                          yesterday.setDate(today.getDate() - 1);

                          if (date.toDateString() === today.toDateString()) {
                            return "Today";
                          } else if (date.toDateString() === yesterday.toDateString()) {
                            return "Yesterday";
                          } else {
                            return date.toLocaleDateString("en-US", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            });
                          }
                        })();

                        const showSeparator = msgGroupDate !== lastGroupDate;
                        lastGroupDate = msgGroupDate;

                        return (
                          <React.Fragment key={msg.id}>
                            {showSeparator && (
                              <div className="flex items-center my-6">
                                <div className={`flex-1 h-px ${isLight ? "bg-slate-200" : "bg-white/5"}`} />
                                <span className={`mx-4 text-[9px] font-extrabold uppercase tracking-widest border px-2.5 py-1 rounded-full ${
                                  isLight 
                                    ? "text-slate-500 bg-slate-100 border-slate-200" 
                                    : "text-zinc-400 bg-white/5 border border-white/5"
                                }`}>
                                  {msgGroupDate}
                                </span>
                                <div className={`flex-1 h-px ${isLight ? "bg-slate-200" : "bg-white/5"}`} />
                              </div>
                            )}

                            <div
                              className={`flex flex-col max-w-[75%] p-4 rounded-[20px] shadow-sm text-left ${
                                isMyMsg
                                  ? isLight
                                    ? "bg-indigo-50 border border-indigo-200 text-[#0F172A] ml-auto text-right rounded-tr-none items-end"
                                    : "bg-indigo-600/10 border border-indigo-500/20 ml-auto text-right rounded-tr-none items-end"
                                  : isLight
                                    ? "bg-slate-100 border border-slate-200 text-slate-800 mr-auto text-left rounded-tl-none"
                                    : "bg-[#18181B] border border-white/5 mr-auto text-left rounded-tl-none"
                              }`}
                            >
                              <span className={`text-[9px] font-extrabold block mb-1 ${
                                isLight ? "text-slate-500" : "text-zinc-400"
                              }`}>
                                {isMyMsg ? "You" : msg.sender.name} •{" "}
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <p className={`text-xs leading-relaxed whitespace-pre-wrap text-left ${
                                isLight ? "text-[#0F172A]" : "text-zinc-200"
                              }`}>
                                {msg.message}
                              </p>

                              {/* Inline Attachment link */}
                              {msg.attachmentUrl && (
                                <div className={`mt-2 pt-2 border-t text-left w-full ${isLight ? "border-slate-200" : "border-white/5"}`}>
                                  <a
                                    href={msg.attachmentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-[10px] hover:underline transition-colors ${
                                      isLight 
                                        ? "bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#6D5DF6]" 
                                        : "bg-white/5 hover:bg-white/10 border border-white/5 text-indigo-300 hover:text-indigo-400"
                                    }`}
                                  >
                                    <Paperclip className="w-3 h-3 text-zinc-400 shrink-0" />
                                    <span className="truncate max-w-[150px]">{msg.attachmentName || "Attached asset"}</span>
                                  </a>
                                </div>
                              )}
                            </div>
                          </React.Fragment>
                        );
                      });
                    })()}
                  </>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* MESSAGE EDITOR BAR */}
              <div className={`p-4 border-t shrink-0 ${
                isLight ? "bg-white border-slate-200" : "bg-white/[0.01] border-white/5"
              }`}>
                <form onSubmit={handleSendMessage} className="space-y-3">
                  <div className={`flex items-center space-x-3 rounded-xl px-4 py-2.5 transition-all duration-300 border ${
                    isLight 
                      ? "bg-slate-100/50 border-slate-200 focus-within:border-[#6D5DF6] focus-within:ring-4 focus-within:ring-[#6D5DF6]/12" 
                      : "bg-white/5 border border-white/5 focus-within:border-[#6366F1]/30 focus-within:ring-4 focus-within:ring-[#6366F1]/12"
                  }`}>
                    <input
                      type="text"
                      required={!attUrl}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={`Send a secure direct message to ${selectedParticipant.name}...`}
                      className={`flex-1 bg-transparent border-none outline-none text-xs ${
                        isLight ? "text-[#0F172A] placeholder-[#94A3B8]" : "text-white placeholder-zinc-500"
                      }`}
                    />

                    <div className="flex items-center space-x-2">
                      <label className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        isLight ? "bg-slate-200/50 hover:bg-slate-200 text-slate-500 hover:text-[#0F172A]" : "bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
                      }`}>
                        <Paperclip className="w-4 h-4" />
                        <input
                          type="file"
                          disabled={uploading}
                          onChange={handleFileUpload}
                          className="hidden"
                          accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx"
                        />
                      </label>

                      <button
                        type="submit"
                        disabled={submitting || (!text.trim() && !attUrl)}
                        className="p-1.5 bg-[#6D5DF6] hover:bg-[#5C4EE3] text-white rounded-lg transition-all cursor-pointer disabled:opacity-40"
                      >
                        {submitting ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {uploading && (
                    <div className="flex items-center space-x-1.5 text-[10px] text-zinc-500 text-left">
                      <div className="w-3.5 h-3.5 border-2 border-[#6D5DF6]/30 border-t-[#6D5DF6] rounded-full animate-spin" />
                      <span>Uploading asset attachment...</span>
                    </div>
                  )}

                  {attUrl && (
                    <div className={`flex items-center space-x-2 border px-3 py-1.5 rounded-lg text-[10px] w-fit ${
                      isLight ? "bg-slate-100 border-slate-200 text-[#0F172A]" : "bg-white/5 border border-white/5 text-zinc-300"
                    }`}>
                      <FileText className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="truncate max-w-[150px] font-medium">{attName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAttUrl("");
                          setAttName("");
                        }}
                        className="text-red-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-center p-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
                isLight ? "bg-indigo-50 border-indigo-100 text-[#6D5DF6]" : "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
              }`}>
                <MessageSquare className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className={`font-extrabold text-sm uppercase tracking-wider ${isLight ? "text-[#0F172A]" : "text-white"}`}>Internal Operator Console</h3>
              <p className={`text-xs max-w-xs leading-relaxed ${isLight ? "text-slate-500" : "text-[#A1A1AA]"}`}>
                Choose a registered operator participant from the left-hand directory to start secure, persistent direct messages.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAgentChat;
