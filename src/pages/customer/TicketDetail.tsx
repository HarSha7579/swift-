import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ticketAPI, uploadAPI } from "../../services/api";
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
} from "lucide-react";

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

const TicketDetail: React.FC = () => {
  const { id } = useParams();
  const ticketId = parseInt(id || "", 10);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Paginated chat history states
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesPage, setMessagesPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Reply states
  const [replyMessage, setReplyMessage] = useState("");
  const [replyAttachments, setReplyAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      setError("");
    } catch (err: any) {
      console.error("Failed to load ticket details:", err);
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
    }, 30000); // Poll details for live-like replies
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
      setError(err.response?.data?.error || "Upload failed. Supported: Images, PDF, Word docs (max 10MB).");
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
      await ticketAPI.addReply(ticketId, {
        message: replyMessage,
        attachments: replyAttachments,
      });
      setReplyMessage("");
      setReplyAttachments([]);
      await fetchDetails();
      await syncLatestMessages(true);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to post reply.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!window.confirm("Are you sure you want to close this ticket? This marks the issue as resolved.")) return;
    try {
      await ticketAPI.close(ticketId);
      await fetchDetails();
    } catch (err) {
      console.error("Failed to close ticket:", err);
      setError("Failed to close ticket.");
    }
  };

  const isLight = theme === "light";

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <span className={`text-xs font-semibold uppercase tracking-widest ${isLight ? "text-[#64748B]" : "text-zinc-500"}`}>Loading Conversation details...</span>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="py-12 max-w-md mx-auto text-center space-y-4">
        <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto text-red-500">
          <AlertCircle className="w-6 h-6 animate-bounce" />
        </div>
        <h3 className={`font-bold text-base ${isLight ? "text-[#0F172A]" : "text-white"}`}>Error Loading Ticket</h3>
        <p className="text-xs text-[#64748B]">{error || "This ticket does not exist or you do not have permission to view it."}</p>
        <Link
          to="/tickets"
          className={`inline-flex items-center space-x-2 px-5 py-2.5 border rounded-xl text-xs font-bold transition-all duration-300 ${
            isLight ? "bg-white hover:bg-slate-50 border-[#E2E8F0] text-[#0F172A]" : "bg-white/5 hover:bg-white/10 border-white/5 text-white"
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Tickets</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER NAV */}
      <div className="flex items-center justify-between">
        <Link
          to="/tickets"
          className={`flex items-center space-x-2 text-xs font-semibold transition-colors duration-200 ${
            isLight ? "text-[#64748B] hover:text-[#0F172A]" : "text-[#A1A1AA] hover:text-white"
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Tickets</span>
        </Link>

        {ticket.status !== "CLOSED" && (
          <button
            onClick={handleCloseTicket}
            className="flex items-center space-x-2 px-4 py-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-xl text-red-500 text-xs font-semibold transition-all duration-300 cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
            <span>Close Ticket</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* CONVERSATION AREA */}
        <div className="lg:col-span-2 space-y-6">
          {/* INITIAL TICKET DESCRIPTION */}
          <div className={`border rounded-[18px] p-6 shadow-sm relative transition-colors duration-200 ${
            isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
          }`}>
            <span className="absolute top-4 right-4 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">
              Initial Request
            </span>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#6D5DF6]/10 flex items-center justify-center border border-[#6D5DF6]/20 text-[#6D5DF6] text-xs font-bold font-mono">
                {ticket.customer.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 className={`font-bold text-sm ${isLight ? "text-[#0F172A]" : "text-white"}`}>{ticket.customer.name}</h4>
                <p className="text-[10px] text-zinc-500 font-semibold">{new Date(ticket.createdAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className={`text-base font-bold leading-snug ${isLight ? "text-[#0F172A]" : "text-white"}`}>{ticket.subject}</h3>
              <p className={`text-[13px] leading-relaxed whitespace-pre-line ${isLight ? "text-[#334155]" : "text-zinc-300"}`}>{ticket.description}</p>

              {/* Initial Attachments */}
              {ticket.attachments && ticket.attachments.filter((a) => !a.id).length === 0 && ticket.attachments.length > 0 && (
                <div className={`pt-4 border-t space-y-2 ${isLight ? "border-slate-100" : "border-white/5"}`}>
                  <span className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Initial Attachments:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ticket.attachments.map((att, index) => (
                      <a
                        key={index}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 text-xs truncate ${
                          isLight 
                            ? "bg-slate-50 hover:bg-slate-100 border-[#E2E8F0] text-[#334155] hover:text-[#6D5DF6]" 
                            : "bg-white/5 hover:bg-white/10 border-white/5 text-zinc-300 hover:text-indigo-400"
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                          <span className="truncate">{att.fileName}</span>
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
            <h4 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider pl-2">Conversation History</h4>
            {messages.length === 0 ? (
              <div className={`text-center py-8 border border-dashed rounded-[18px] text-xs ${
                isLight ? "bg-slate-50/50 border-slate-200 text-[#64748B]" : "bg-[#18181B]/20 border-white/5 text-[#A1A1AA]"
              }`}>
                No replies posted yet. Agent will respond shortly.
              </div>
            ) : (
              <div 
                ref={chatContainerRef}
                onScroll={handleScroll}
                className="space-y-4 max-h-[450px] overflow-y-auto pr-2"
              >
                {/* LOADING MORE SPINNER */}
                {loadingMore && (
                  <div className="py-3 text-center text-[10px] font-bold text-indigo-500 animate-pulse uppercase tracking-widest flex items-center justify-center space-x-1.5 bg-indigo-500/5 border border-indigo-500/10 rounded-xl mb-4">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                    <span>Loading Older Messages</span>
                  </div>
                )}

                {/* NO MORE MESSAGES INDICATOR */}
                {!hasMoreMessages && !loadingMore && messages.length > 0 && (
                  <div className={`py-2 text-center text-[9px] font-semibold uppercase tracking-wider border-b mb-4 ${
                    isLight ? "border-slate-100 text-[#94A3B8]" : "border-white/5 text-zinc-500"
                  }`}>
                    No earlier messages.
                  </div>
                )}

                {(() => {
                  let lastGroupDate = "";
                  return messages.map((msg) => {
                    const isAgent = msg.sender.role === "AGENT" || msg.sender.role === "ADMIN";
                    
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
                            <span className={`mx-4 text-[9px] font-semibold uppercase tracking-wider border px-2.5 py-1 rounded-full ${
                              isLight ? "bg-slate-50 border-slate-200 text-[#64748B]" : "bg-white/5 border-white/5 text-zinc-400"
                            }`}>
                              {msgGroupDate}
                            </span>
                            <div className={`flex-1 h-px ${isLight ? "bg-slate-100" : "bg-white/5"}`} />
                          </div>
                        )}

                        <div
                          className={`flex flex-col max-w-[85%] rounded-[18px] p-5 shadow-sm border ${
                            isAgent
                              ? isLight 
                                ? "bg-slate-50 border-slate-200/60 mr-auto text-left rounded-tl-none text-[#0F172A]" 
                                : "bg-[#18181B]/40 border-indigo-500/10 mr-auto text-left rounded-tl-none"
                              : isLight 
                                ? "bg-indigo-50/50 border-indigo-100/70 ml-auto text-right rounded-tr-none text-[#0F172A] items-end" 
                                : "bg-indigo-600/10 border border-indigo-500/20 ml-auto text-right rounded-tr-none items-end"
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 mb-2.5">
                            {isAgent && (
                              <span className="text-[9px] font-semibold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                Support Team
                              </span>
                            )}
                            <span className={`text-xs font-bold ${isLight ? "text-[#0F172A]" : "text-white"}`}>{msg.sender.name}</span>
                            <span className="text-[10px] text-zinc-400">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <p className={`text-[13px] leading-relaxed whitespace-pre-line text-left ${isLight ? "text-[#334155]" : "text-zinc-300"}`}>
                            {msg.message}
                          </p>

                          {/* Reply Attachments */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className={`mt-3 pt-3 border-t w-full flex flex-col gap-1.5 text-left ${isLight ? "border-slate-200/50" : "border-white/5"}`}>
                              {msg.attachments.map((att, aIdx) => (
                                <a
                                  key={aIdx}
                                  href={att.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center space-x-1.5 text-xs text-indigo-500 hover:underline hover:text-indigo-600"
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

          {/* REPLY EDITOR (Disabled if Closed) */}
          {ticket.status === "CLOSED" ? (
            <div className={`border p-6 rounded-[18px] text-center text-xs flex items-center justify-center space-x-2 ${
              isLight ? "bg-slate-50 border-slate-200 text-[#64748B]" : "bg-[#18181B]/40 border-white/5 text-[#A1A1AA]"
            }`}>
              <CheckCircle className="w-5 h-5 text-zinc-400" />
              <span>This support ticket is closed and resolved. Replies are disabled.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmitReply} className={`border rounded-[18px] p-5 shadow-sm space-y-4 ${
              isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
            }`}>
              <div className="relative">
                <textarea
                  required
                  rows={4}
                  placeholder="Type your response to the support team..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 text-[13px] outline-none transition-all duration-300 resize-none ${
                    isLight 
                      ? "bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] placeholder-[#94A3B8] focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12" 
                      : "bg-white/5 border border-white/5 text-white placeholder-zinc-500 focus:border-[#6366F1]/30 focus:bg-white/[0.08]"
                  }`}
                />
              </div>

              {/* Uploading Attachments */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-3">
                  <label className={`flex items-center space-x-2 px-3 py-1.5 border rounded-lg text-[10px] font-semibold transition-all duration-300 cursor-pointer ${
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
                      <span className="text-[9px] font-semibold text-zinc-500 uppercase">Uploading...</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting || (!replyMessage.trim() && replyAttachments.length === 0)}
                  className="px-4.5 py-2.5 bg-[#6D5DF6] hover:bg-[#5C4EE5] text-white text-[11px] font-semibold rounded-xl shadow-sm transition-all duration-300 transform active:scale-95 disabled:opacity-40 flex items-center space-x-1.5 cursor-pointer"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Post Reply</span>
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
                        isLight ? "bg-slate-50 border-[#E2E8F0]" : "bg-white/5 border-white/5"
                      }`}
                    >
                      <span className={`truncate max-w-[120px] ${isLight ? "text-[#334155]" : "text-zinc-300"}`}>{att.fileName}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="text-red-500 hover:text-red-400 p-0.5 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </form>
          )}
        </div>

        {/* METADATA SIDEBAR */}
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

          {/* SUMMARY PANEL */}
          <div className={`border rounded-[18px] p-6 shadow-sm space-y-5 transition-colors duration-200 ${
            isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
          }`}>
            <h3 className={`font-bold text-[13px] uppercase tracking-wider border-b pb-3 ${
              isLight ? "border-slate-100 text-[#0F172A]" : "border-white/5 text-white"
            }`}>
              Ticket Metadata
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex justify-between">
                <span className={`${isLight ? "text-[#64748B]" : "text-[#A1A1AA]"} font-medium`}>Ticket ID:</span>
                <span className={`font-mono font-semibold ${isLight ? "text-[#0F172A]" : "text-white"}`}>#{ticket.id}</span>
              </div>

              <div className="flex justify-between">
                <span className={`${isLight ? "text-[#64748B]" : "text-[#A1A1AA]"} font-medium`}>Category:</span>
                <span className={`font-semibold ${isLight ? "text-[#0F172A]" : "text-white"}`}>{ticket.category}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className={`${isLight ? "text-[#64748B]" : "text-[#A1A1AA]"} font-medium`}>Priority:</span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                    ticket.priority === "URGENT"
                      ? "bg-red-500/10 text-red-500"
                      : ticket.priority === "HIGH"
                      ? "bg-orange-500/10 text-orange-500"
                      : ticket.priority === "MEDIUM"
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-zinc-500/10 text-zinc-500"
                  }`}
                >
                  {ticket.priority}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className={`${isLight ? "text-[#64748B]" : "text-[#A1A1AA]"} font-medium`}>Status:</span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                    ticket.status === "OPEN"
                      ? "bg-indigo-500/10 text-indigo-500"
                      : ticket.status === "IN_PROGRESS"
                      ? "bg-amber-500/10 text-amber-500"
                      : ticket.status === "RESOLVED"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-zinc-700/30 text-zinc-500"
                  }`}
                >
                  {ticket.status}
                </span>
              </div>

              <div className="flex justify-between">
                <span className={`${isLight ? "text-[#64748B]" : "text-[#A1A1AA]"} font-medium`}>Created:</span>
                <span className={`font-semibold ${isLight ? "text-[#0F172A]" : "text-zinc-300"}`}>{new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* ASSIGNED AGENT CARD */}
          <div className={`border rounded-[18px] p-6 shadow-sm space-y-4 transition-colors duration-200 ${
            isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
          }`}>
            <h3 className={`font-bold text-[13px] uppercase tracking-wider border-b pb-3 ${
              isLight ? "border-slate-100 text-[#0F172A]" : "border-white/5 text-white"
            }`}>
              Assigned Specialist
            </h3>

            {ticket.agent ? (
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full border flex items-center justify-center ${
                  isLight ? "bg-slate-100 border-[#E2E8F0] text-[#0F172A]" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                }`}>
                  <User className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <h4 className={`text-xs font-bold truncate ${isLight ? "text-[#0F172A]" : "text-white"}`}>{ticket.agent.name}</h4>
                  <p className="text-[10px] text-zinc-500 truncate">{ticket.agent.email}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2 bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl text-amber-600 text-xs">
                <Clock className="w-4.5 h-4.5 shrink-0 animate-pulse" />
                <span className="font-semibold">Triage in progress...</span>
              </div>
            )}
          </div>

          {/* TIMELINE HISTORIC */}
          <div className={`border rounded-[18px] p-6 shadow-sm space-y-4 transition-colors duration-200 ${
            isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
          }`}>
            <h3 className={`font-bold text-[13px] uppercase tracking-wider border-b pb-3 ${
              isLight ? "border-slate-100 text-[#0F172A]" : "border-white/5 text-white"
            }`}>
              Audit Timeline
            </h3>

            <div className="space-y-4 max-h-48 overflow-y-auto pr-1">
              {ticket.history && ticket.history.length === 0 ? (
                <p className="text-[10px] text-zinc-500 text-center">No timeline updates recorded.</p>
              ) : (
                ticket.history?.map((log) => (
                  <div key={log.id} className={`relative pl-4 border-l text-[11px] ${
                    isLight ? "border-slate-100" : "border-white/5"
                  }`}>
                    <div className="absolute -left-[5.5px] top-1 w-2.5 h-2.5 bg-[#6D5DF6] rounded-full border-2 border-white" />
                    <p className={`font-medium leading-relaxed ${isLight ? "text-[#334155]" : "text-zinc-300"}`}>{log.action}</p>
                    <span className="text-[9px] text-zinc-400 block mt-0.5">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;
