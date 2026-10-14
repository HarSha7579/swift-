import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ticketAPI, uploadAPI, aiAPI, agentAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  MessageSquare,
  User,
  Calendar,
  AlertCircle,
  Paperclip,
  Send,
  Trash2,
  FileText,
  Clock,
  CheckCircle,
  ArrowLeft,
  XCircle,
  Sparkles,
  ShieldAlert,
  Save,
  UserCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface UserType {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Attachment {
  id?: number;
  url: string;
  fileName: string;
  fileType: string;
}

interface Message {
  id: number;
  senderId: number;
  message: string;
  createdAt: string;
  sender: UserType;
  attachments: Attachment[];
}

interface HistoryLog {
  id: number;
  createdAt: string;
  action: string;
  user: {
    name: string;
    role: string;
  };
}

interface TicketDetail {
  id: number;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  customer: UserType;
  agent: UserType | null;
  attachments: Attachment[];
  messages: Message[];
  history: HistoryLog[];
  aiCategory?: string | null;
  aiPriority?: string | null;
  aiSolutions?: string | null;
  aiKbArticles?: string | null;
  aiReason?: string | null;
  aiConfidence?: number | null;
  aiUrgency?: string | null;
  aiImpact?: string | null;
  aiPrimaryIssue?: string | null;
}

const AgentTicketDetail: React.FC = () => {
  const { id } = useParams();
  const ticketId = parseInt(id || "", 10);
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Paginated chat history states
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesPage, setMessagesPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Communication states
  const [replyMessage, setReplyMessage] = useState("");
  const [replyAttachments, setReplyAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Status/Priority Tweaking States
  const [ticketStatus, setTicketStatus] = useState("");
  const [ticketPriority, setTicketPriority] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);

  // AI Coprocessor States
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isNearBottom = () => {
    if (!chatContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  };

  const syncLatestMessages = async (isInitial = false) => {
    try {
      const res = await ticketAPI.getMessages(ticketId, { page: 1, limit: 30 });
      setMessages((prev) => {
        if (isInitial || prev.length === 0) {
          setHasMoreMessages(res.hasMore);
          setMessagesPage(1);
          setTimeout(() => {
            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
          }, 100);
          return res.messages;
        }

        const prevIds = new Set(prev.map((m) => m.id));
        const newMessages = res.messages.filter((m: any) => !prevIds.has(m.id));

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
      console.error("Failed to sync latest messages:", err);
    }
  };

  const fetchDetails = async () => {
    try {
      const data = await ticketAPI.getDetails(ticketId);
      setTicket(data);
      setTicketStatus(data.status);
      setTicketPriority(data.priority);
      setError("");
    } catch (err: any) {
      console.error("Failed to load agent ticket details:", err);
      setError("Ticket not found or access denied.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isNaN(ticketId)) {
      setError("Invalid Ticket ID");
      setLoading(false);
      return;
    }
    fetchDetails();
    syncLatestMessages(true);

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchDetails();
        syncLatestMessages(false);
      }
    }, 30000); // poll changes
    return () => clearInterval(interval);
  }, [ticketId]);

  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop === 0 && hasMoreMessages && !loadingMore) {
      setLoadingMore(true);
      const previousScrollHeight = target.scrollHeight;

      try {
        const nextPage = messagesPage + 1;
        const res = await ticketAPI.getMessages(ticketId, { page: nextPage, limit: 30 });

        setMessages((prev) => [...res.messages, ...prev]);
        setMessagesPage(nextPage);
        setHasMoreMessages(res.hasMore);

        setTimeout(() => {
          if (chatContainerRef.current) {
            const newScrollHeight = chatContainerRef.current.scrollHeight;
            chatContainerRef.current.scrollTop = newScrollHeight - previousScrollHeight;
          }
        }, 50);
      } catch (err) {
        console.error("Failed to load more messages:", err);
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
      setReplyAttachments((prev) => [
        ...prev,
        {
          url: result.secure_url,
          fileName: result.fileName,
          fileType: result.fileType,
        },
      ]);
    } catch (err: any) {
      setError(err.response?.data?.error || "Upload failed. Size limit 10MB.");
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setReplyAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() && replyAttachments.length === 0) return;
    setSubmitting(true);
    setError("");

    try {
      const result = await ticketAPI.addReply(ticketId, {
        message: replyMessage,
        attachments: replyAttachments,
      });
      setReplyMessage("");
      setReplyAttachments([]);
      setTicketStatus(result.ticketStatus);
      await fetchDetails();
      await syncLatestMessages(true);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to post reply.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveMetadata = async () => {
    setSavingMeta(true);
    setError("");
    try {
      await ticketAPI.update(ticketId, {
        status: ticketStatus,
        priority: ticketPriority,
      });
      await fetchDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update metadata.");
    } finally {
      setSavingMeta(false);
    }
  };

  const handleEscalateTicket = async () => {
    if (!window.confirm("Are you sure you want to escalate this ticket to senior administration? This marks priority as URGENT.")) return;
    setError("");
    try {
      await ticketAPI.escalate(ticketId);
      await fetchDetails();
    } catch (err) {
      console.error("Escalation failed:", err);
      setError("Failed to escalate ticket.");
    }
  };

  const handleClaimTicket = async () => {
    setError("");
    try {
      await agentAPI.acceptTicket(ticketId);
      await fetchDetails();
    } catch (err: any) {
      console.error("Failed to claim ticket:", err);
      if (err.response?.status === 409) {
        setError("This ticket has already been accepted by another agent.");
      } else {
        setError(err.response?.data?.error || "Failed to claim the ticket.");
      }
    }
  };

  // AI CORE: Suggest response based on context
  const handleSuggestReply = async () => {
    if (!ticket) return;
    setAiGenerating(true);
    setAiSuggestion("");
    setError("");

    try {
      const historyContext = ticket.history.map(h => `${h.user.name}: ${h.action}`);
      const conversationContext = ticket.messages.map(m => `${m.sender.name}: ${m.message}`);

      const result = await aiAPI.suggestReply({
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        history: historyContext,
        conversation: conversationContext,
      });

      setAiSuggestion(result.suggestion);
    } catch (err) {
      console.error("AI Suggested reply failed:", err);
      setError("Failed to generate AI response. Make sure DeepSeek API Key is configured.");
    } finally {
      setAiGenerating(false);
    }
  };

  const applySuggestion = () => {
    setReplyMessage(aiSuggestion);
    setAiSuggestion("");
  };

  const isLight = theme === "light";

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Loading Support Workspace...</span>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="py-12 max-w-md mx-auto text-center space-y-4">
        <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto text-red-400">
          <AlertCircle className="w-6 h-6 animate-bounce" />
        </div>
        <h3 className="font-bold text-[#0F172A] text-base dark:text-white">Error Loading Ticket</h3>
        <p className="text-xs text-[#A1A1AA]">{error || "Access denied or ticket not found."}</p>
        <Link
          to="/dashboard"
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#6D5DF6] hover:bg-[#5C4EE4] rounded-xl text-xs font-bold text-white transition-all duration-300"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    );
  }

  const isAgent = user?.role === "AGENT";
  const isAssignedToMe = ticket?.agent?.id === user?.id;
  const isUnassigned = !ticket?.agent;
  const canReplyAndModify = user?.role === "ADMIN" || isAssignedToMe;

  return (
    <div className="space-y-6">
      {/* HEADER NAV */}
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard"
          className={`flex items-center space-x-2 text-xs font-bold transition-colors duration-200 ${
            isLight ? "text-[#64748B] hover:text-[#0F172A]" : "text-[#A1A1AA] hover:text-white"
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Console</span>
        </Link>

        {ticket && ticket.status !== "CLOSED" && canReplyAndModify && (
          <button
            onClick={handleEscalateTicket}
            className="flex items-center space-x-2 px-4 py-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/25 rounded-xl text-red-400 text-xs font-bold transition-all duration-300 cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400 animate-pulse" />
            <span>Escalate to Admin</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center space-x-3 text-red-400 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {ticket && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* CONVERSATION STREAM */}
          <div className="lg:col-span-2 space-y-6">
            {/* INITIAL PROBLEM STATEMENT */}
            <div className={`border rounded-[18px] p-6 shadow-sm relative transition-all duration-300 ${
              isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
            }`}>
              <span className={`absolute top-4 right-4 border px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-widest ${
                isLight ? "bg-[#6D5DF6]/5 border-[#6D5DF6]/10 text-[#6D5DF6]" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-300"
              }`}>
                Client Query
              </span>

              <div className="flex items-center space-x-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border text-xs font-bold font-mono ${
                  isLight ? "bg-[#6D5DF6]/10 border-[#6D5DF6]/10 text-[#6D5DF6]" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                }`}>
                  {ticket.customer.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className={`font-bold text-sm ${isLight ? "text-[#0F172A]" : "text-white"}`}>{ticket.customer.name}</h4>
                  <p className={`text-[10px] font-semibold ${isLight ? "text-[#64748B]" : "text-zinc-500"}`}>
                    {ticket.customer.email} • {new Date(ticket.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className={`text-base font-bold leading-snug ${isLight ? "text-[#0F172A]" : "text-white"}`}>{ticket.subject}</h3>
                <p className={`text-xs leading-relaxed whitespace-pre-line ${isLight ? "text-[#334155]" : "text-zinc-300"}`}>
                  {ticket.description}
                </p>

                {/* Attachments */}
                {ticket.attachments && ticket.attachments.length > 0 && (
                  <div className={`pt-4 border-t space-y-2 ${isLight ? "border-slate-100" : "border-white/5"}`}>
                    <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Submitted Attachments:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ticket.attachments.map((att, index) => (
                        <a
                          key={index}
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 text-xs truncate ${
                            isLight 
                              ? "bg-slate-50 hover:bg-[#6D5DF6]/5 border-slate-200 text-[#334155] hover:text-[#6D5DF6]" 
                              : "bg-white/5 hover:bg-white/10 border-white/5 text-zinc-300 hover:text-indigo-400"
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                            <span className="truncate font-semibold">{att.fileName}</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CHAT LOG */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-2">Case Correspondence</h4>
              {messages.length === 0 ? (
                <div className={`text-center py-12 border border-dashed rounded-[18px] text-xs ${
                  isLight ? "bg-slate-50 border-slate-200 text-[#64748B]" : "bg-[#18181B]/20 border-white/5 text-[#A1A1AA]"
                }`}>
                  No replies posted yet. Send a response below to start conversation.
                </div>
              ) : (
                <div 
                  ref={chatContainerRef}
                  onScroll={handleScroll}
                  className="space-y-4 max-h-[450px] overflow-y-auto pr-2"
                >
                  {/* LOADING MORE SPINNER */}
                  {loadingMore && (
                    <div className="py-3 text-center text-[10px] font-bold text-[#6D5DF6] animate-pulse uppercase tracking-widest flex items-center justify-center space-x-1.5 bg-[#6D5DF6]/5 border border-[#6D5DF6]/10 rounded-xl mb-4">
                      <div className="w-1.5 h-1.5 bg-[#6D5DF6] rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1.5 h-1.5 bg-[#6D5DF6] rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1.5 h-1.5 bg-[#6D5DF6] rounded-full animate-bounce" />
                      <span>Loading Older Messages</span>
                    </div>
                  )}

                  {/* NO MORE MESSAGES INDICATOR */}
                  {!hasMoreMessages && !loadingMore && messages.length > 0 && (
                    <div className={`py-2 text-center text-[9px] font-bold uppercase tracking-widest border-b mb-4 ${
                      isLight ? "border-slate-100 text-slate-400" : "border-white/5 text-zinc-500"
                    }`}>
                      No earlier messages.
                    </div>
                  )}

                  {(() => {
                    let lastGroupDate = "";
                    return messages.map((msg) => {
                      const isSupport = msg.sender.role === "AGENT" || msg.sender.role === "ADMIN";
                      
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
                              <div className={`flex-1 h-px ${isLight ? "bg-slate-100" : "bg-white/5"}`} />
                              <span className={`mx-4 text-[9px] font-bold uppercase tracking-widest border px-2.5 py-1 rounded-full ${
                                isLight ? "bg-slate-50 border-slate-200 text-slate-500" : "bg-white/5 border-white/5 text-zinc-400"
                              }`}>
                                {msgGroupDate}
                              </span>
                              <div className={`flex-1 h-px ${isLight ? "bg-slate-100" : "bg-white/5"}`} />
                            </div>
                          )}

                          <div
                            className={`flex flex-col max-w-[85%] rounded-[18px] p-5 shadow-sm transition-all duration-300 ${
                              isSupport
                                ? isLight 
                                  ? "bg-[#6D5DF6]/5 border border-[#6D5DF6]/20 ml-auto text-right rounded-tr-none items-end"
                                  : "bg-indigo-600/10 border border-indigo-500/20 ml-auto text-right rounded-tr-none items-end"
                                : isLight 
                                  ? "bg-white border border-[#E2E8F0] mr-auto text-left rounded-tl-none"
                                  : "bg-[#121A2B] border border-white/5 mr-auto text-left rounded-tl-none"
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 mb-2.5">
                              {!isSupport && (
                                <span className={`text-[8px] font-bold border px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                  isLight ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-zinc-500/15 text-zinc-400 border border-white/5"
                                }`}>
                                  Customer
                                </span>
                              )}
                              <span className={`text-xs font-bold ${isLight ? "text-[#0F172A]" : "text-white"}`}>{msg.sender.name}</span>
                              <span className="text-[9px] text-zinc-500 font-medium">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <p className={`text-xs leading-relaxed whitespace-pre-line text-left ${
                              isLight ? "text-[#334155]" : "text-zinc-300"
                            }`}>
                              {msg.message}
                            </p>

                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className={`mt-3 pt-3 border-t w-full flex flex-col gap-1.5 text-left ${
                                isLight ? "border-slate-100" : "border-white/5"
                              }`}>
                                {msg.attachments.map((att, aIdx) => (
                                  <a
                                    key={aIdx}
                                    href={att.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center space-x-1.5 text-xs text-[#6D5DF6] hover:underline hover:text-[#5C4EE4]"
                                  >
                                    <Paperclip className="w-3.5 h-3.5" />
                                    <span className="truncate">{att.fileName}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    });
                  })()}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* AI SUGGESTION SANDBOX */}
            <AnimatePresence>
              {aiSuggestion && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  className={`border rounded-[18px] p-5 shadow-sm space-y-4 relative ${
                    isLight ? "bg-[#6D5DF6]/5 border-[#6D5DF6]/15" : "bg-indigo-500/5 border border-indigo-500/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4.5 h-4.5 text-[#6D5DF6] animate-pulse" />
                      <span className={`text-xs font-bold tracking-wide ${isLight ? "text-[#0F172A]" : "text-white"}`}>DeepSeek drafted response</span>
                    </div>
                    <button
                      onClick={() => setAiSuggestion("")}
                      className="text-[#94A3B8] hover:text-red-500 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>

                  <div className={`p-4 rounded-xl border text-xs leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap ${
                    isLight ? "bg-white border-slate-200 text-[#334155]" : "bg-[#18181B]/80 border-white/5 text-zinc-300"
                  }`}>
                    {aiSuggestion}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={applySuggestion}
                      className="px-4 py-2 bg-[#6D5DF6] hover:bg-[#5C4EE4] text-white text-xs font-bold rounded-lg shadow transition-all duration-300 cursor-pointer"
                    >
                      Apply to Reply Input
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* REPLY WORKSPACE */}
            {canReplyAndModify ? (
              <div className={`border rounded-[18px] p-5 shadow-sm space-y-4 transition-all duration-300 ${
                isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Draft Response</span>

                  <button
                    type="button"
                    onClick={handleSuggestReply}
                    disabled={aiGenerating}
                    className={`flex items-center space-x-1.5 px-3.5 py-1.5 border rounded-lg text-[10px] font-bold transition-all duration-300 cursor-pointer disabled:opacity-40 ${
                      isLight 
                        ? "bg-[#6D5DF6]/5 border-[#6D5DF6]/20 hover:bg-[#6D5DF6]/10 text-[#6D5DF6]"
                        : "bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-400"
                    }`}
                  >
                    {aiGenerating ? (
                      <>
                        <div className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400/80 rounded-full animate-spin" />
                        <span>DeepSeek drafting...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-[#6D5DF6] animate-pulse" />
                        <span>Suggest Reply with AI</span>
                      </>
                    )}
                  </button>
                </div>

                <form onSubmit={handleSubmitReply} className="space-y-4">
                  <textarea
                    required
                    rows={5}
                    placeholder="Type your response to the customer..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className={`w-full border rounded-xl px-4 py-3 text-xs outline-none transition-all duration-300 resize-none ${
                      isLight 
                        ? "bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] placeholder-[#94A3B8] focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12" 
                        : "bg-white/5 border border-white/5 text-white placeholder-zinc-500 focus:border-[#6366F1]/30 focus:ring-4 focus:ring-[#6366F1]/12"
                    }`}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <label className={`flex items-center space-x-2 px-3 py-1.5 border rounded-lg text-[10px] font-bold transition-all duration-300 cursor-pointer ${
                        isLight ? "bg-slate-50 hover:bg-slate-100 border-[#E2E8F0] text-[#334155]" : "bg-white/5 hover:bg-white/10 border-white/5 text-white"
                      }`}>
                        <Paperclip className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Attach File</span>
                        <input
                          type="file"
                          disabled={uploading}
                          onChange={handleFileUpload}
                          className="hidden"
                          accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx"
                        />
                      </label>

                      {uploading && (
                        <div className="flex items-center space-x-1.5">
                          <div className="w-3.5 h-3.5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                          <span className="text-[9px] font-bold text-zinc-500 uppercase">Uploading...</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || (!replyMessage.trim() && replyAttachments.length === 0)}
                      className="px-5 py-2.5 bg-[#6D5DF6] hover:bg-[#5C4EE4] text-white text-[11px] font-bold rounded-lg shadow-sm transition-all duration-300 transform active:scale-95 disabled:opacity-40 flex items-center space-x-1.5 cursor-pointer"
                    >
                      {submitting ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Message</span>
                        </>
                      )}
                    </button>
                  </div>

                  {replyAttachments.length > 0 && (
                    <div className={`flex flex-wrap gap-2 pt-2 border-t ${isLight ? "border-slate-100" : "border-white/5"}`}>
                      {replyAttachments.map((att, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-[10px] ${
                            isLight ? "bg-slate-50 border-slate-200 text-[#334155]" : "bg-white/5 border-white/5 text-zinc-300"
                          }`}
                        >
                          <span className="truncate max-w-[120px] font-semibold">{att.fileName}</span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(idx)}
                            className="text-red-400 hover:text-red-300 p-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </form>
              </div>
            ) : isUnassigned ? (
              <div className={`border rounded-[18px] p-8 text-center space-y-4 shadow-sm ${
                isLight ? "bg-[#6D5DF6]/5 border-[#6D5DF6]/15" : "bg-indigo-500/5 border border-indigo-500/10"
              }`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border ${
                  isLight ? "bg-white border-[#E2E8F0] text-[#6D5DF6]" : "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
                }`}>
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className={`text-sm font-bold ${isLight ? "text-[#0F172A]" : "text-white"}`}>Unassigned Support Ticket</h3>
                  <p className={`text-xs leading-relaxed ${isLight ? "text-[#334155]" : "text-[#A1A1AA]"}`}>
                    This ticket is currently in the unassigned triage pool. You must claim this ticket and assign it to yourself before replying or resolving this case.
                  </p>
                </div>
                <button
                  onClick={handleClaimTicket}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-[#6D5DF6] hover:bg-[#5C4EE4] rounded-xl text-xs text-white font-bold shadow transition-all duration-300 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Claim & Accept Ticket</span>
                </button>
              </div>
            ) : (
              <div className={`border border-dashed rounded-[18px] p-8 text-center space-y-3 ${
                isLight ? "bg-slate-50/50 border-slate-200" : "bg-zinc-500/5 border border-white/5"
              }`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border ${
                  isLight ? "bg-white border-slate-200 text-slate-400" : "bg-zinc-500/10 border border-white/5 text-zinc-400"
                }`}>
                  <User className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h3 className={`text-sm font-bold ${isLight ? "text-[#0F172A]" : "text-white"}`}>Ticket Assigned</h3>
                  <p className={`text-xs leading-relaxed ${isLight ? "text-[#64748B]" : "text-[#A1A1AA]"}`}>
                    This ticket is assigned to <span className={isLight ? "text-[#0F172A] font-bold" : "text-white font-bold"}>{ticket.agent?.name}</span>. Only the assigned agent or system administrators can reply or update its metadata.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* METADATA ADJUSTMENT SIDEBAR */}
          <div className="space-y-6">
            {/* AI ANALYSIS COPROCESSOR CARD */}
            {(ticket.aiReason || ticket.aiPrimaryIssue) && (
              <div className={`border rounded-[18px] p-6 shadow-sm space-y-4 transition-colors duration-200 ${
                isLight ? "bg-white border-[#6D5DF6]/30" : "bg-[#121A2B] border-indigo-500/15"
              }`}>
                <div className="flex justify-between items-center border-b pb-3 border-slate-100 dark:border-white/5">
                  <h3 className={`font-bold text-[13px] uppercase tracking-wider flex items-center space-x-1.5 ${
                    isLight ? "text-[#0F172A]" : "text-white"
                  }`}>
                    <Sparkles className="w-4 h-4 text-[#6D5DF6]" />
                    <span>AI Diagnostics</span>
                  </h3>
                  {ticket.aiConfidence !== undefined && ticket.aiConfidence !== null && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400">
                      {ticket.aiConfidence}% match
                    </span>
                  )}
                </div>

                {ticket.aiPrimaryIssue && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">Identified Issue</span>
                    <p className={`text-xs font-semibold ${isLight ? "text-[#334155]" : "text-white"}`}>
                      {ticket.aiPrimaryIssue}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-[11px] pt-1">
                  {ticket.aiUrgency && (
                    <div className={`p-2 border rounded-xl ${isLight ? "bg-slate-50/50 border-slate-100" : "bg-white/5 border-white/5"}`}>
                      <span className="block text-[8px] font-semibold text-zinc-500 uppercase tracking-widest">Urgency</span>
                      <span className={`font-semibold uppercase tracking-wide text-indigo-400`}>
                        {ticket.aiUrgency}
                      </span>
                    </div>
                  )}
                  {ticket.aiImpact && (
                    <div className={`p-2 border rounded-xl ${isLight ? "bg-slate-50/50 border-[#E2E8F0]" : "bg-white/5 border-white/5"}`}>
                      <span className="block text-[8px] font-semibold text-zinc-500 uppercase tracking-widest">Impact</span>
                      <span className={`font-semibold uppercase tracking-wide text-indigo-400`}>
                        {ticket.aiImpact}
                      </span>
                    </div>
                  )}
                </div>

                {ticket.aiReason && (
                  <div className={`p-3 border rounded-xl ${isLight ? "bg-slate-50/50 border-[#E2E8F0]" : "bg-white/5 border-white/5"}`}>
                    <span className="block text-[9px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Decision Logic</span>
                    <p className={`text-[11px] leading-relaxed ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
                      {ticket.aiReason}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* CONTROL BOARD */}
            <div className={`border rounded-[18px] p-6 shadow-sm space-y-4 transition-all duration-300 ${
              isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
            }`}>
              <h3 className={`font-bold text-xs uppercase tracking-wider border-b pb-3 ${
                isLight ? "text-[#0F172A] border-slate-100" : "text-white border-white/5"
              }`}>
                Lifecycle Controls
              </h3>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    Ticket Status
                  </label>
                  <select
                    disabled={!canReplyAndModify}
                    value={ticketStatus}
                    onChange={(e) => setTicketStatus(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2.5 text-xs outline-none transition-all duration-300 disabled:opacity-50 ${
                      isLight 
                        ? "bg-white border-[#E2E8F0] text-[#0F172A] focus:border-[#6D5DF6]" 
                        : "bg-white/5 border border-white/5 text-white focus:border-[#6366F1]/30"
                    }`}
                  >
                    <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#121A2B]"} value="OPEN">OPEN</option>
                    <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#121A2B]"} value="IN_PROGRESS">IN PROGRESS</option>
                    <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#121A2B]"} value="RESOLVED">RESOLVED</option>
                    <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#121A2B]"} value="CLOSED">CLOSED</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    Assign Priority
                  </label>
                  <select
                    disabled={!canReplyAndModify}
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2.5 text-xs outline-none transition-all duration-300 disabled:opacity-50 ${
                      isLight 
                        ? "bg-white border-[#E2E8F0] text-[#0F172A] focus:border-[#6D5DF6]" 
                        : "bg-white/5 border border-white/5 text-white focus:border-[#6366F1]/30"
                    }`}
                  >
                    <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#121A2B]"} value="LOW">LOW</option>
                    <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#121A2B]"} value="MEDIUM">MEDIUM</option>
                    <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#121A2B]"} value="HIGH">HIGH</option>
                    <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#121A2B]"} value="URGENT">URGENT</option>
                  </select>
                </div>

                {canReplyAndModify && (
                  <button
                    onClick={handleSaveMetadata}
                    disabled={savingMeta}
                    className="w-full py-2.5 px-4 bg-[#6D5DF6] hover:bg-[#5C4EE4] text-white text-xs font-bold rounded-xl shadow transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Adjustments</span>
                  </button>
                )}
              </div>
            </div>

            {/* AUDIT HISTORY PANEL */}
            <div className={`border rounded-[18px] p-6 shadow-sm space-y-4 transition-all duration-300 ${
              isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
            }`}>
              <h3 className={`font-bold text-xs uppercase tracking-wider border-b pb-3 ${
                isLight ? "text-[#0F172A] border-slate-100" : "text-white border-white/5"
              }`}>
                Action Logging Timeline
              </h3>

              <div className="space-y-4 max-h-48 overflow-y-auto pr-1">
                {ticket.history && ticket.history.length === 0 ? (
                  <p className="text-[10px] text-zinc-500 text-center">No logs recorded yet.</p>
                ) : (
                  ticket.history?.map((log) => (
                    <div key={log.id} className={`relative pl-4 border-l text-[10px] ${
                      isLight ? "border-slate-100" : "border-white/5"
                    }`}>
                      <div className={`absolute -left-[4.5px] top-1 w-2 rounded-full border ${
                        isLight ? "h-2 bg-[#6D5DF6] border-white" : "h-2 bg-indigo-500 border-[#18181B]"
                      }`} />
                      <p className={`font-semibold leading-relaxed ${isLight ? "text-[#334155]" : "text-zinc-300"}`}>{log.action}</p>
                      <span className="text-[8px] text-zinc-500 block mt-0.5 font-medium">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentTicketDetail;
