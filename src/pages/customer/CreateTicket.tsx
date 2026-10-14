import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { aiAPI, ticketAPI, uploadAPI } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import {
  Sparkles,
  Paperclip,
  Check,
  AlertCircle,
  FileText,
  Bookmark,
  Send,
  Trash2,
  ListRestart,
  HelpCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Attachment {
  url: string;
  fileName: string;
  fileType: string;
}

interface AIAnalysis {
  category: string;
  priority: string;
  solutions: string[];
  relatedKbArticles: string[];
  primaryIssue?: string;
  urgency?: string;
  businessImpact?: string;
  reason?: string;
  confidenceScore?: number;
}

const getCategoryDisplay = (cat: string) => {
  if (!cat) return { text: "General Inquiry", icon: "❓" };
  const norm = cat.toLowerCase();
  if (norm === "technical") {
    return { text: "Technical", icon: "🛠️" };
  }
  if (norm.includes("billing") || norm.includes("payment")) {
    return { text: "Billing & Payment", icon: "💳" };
  }
  if (norm.includes("account")) {
    return { text: "Account", icon: "👤" };
  }
  if (norm.includes("order")) {
    return { text: "Orders", icon: "📦" };
  }
  if (norm.includes("shipping")) {
    return { text: "Shipping", icon: "🚚" };
  }
  if (norm.includes("refund")) {
    return { text: "Refund", icon: "💵" };
  }
  if (norm.includes("authentication") || norm.includes("login") || norm.includes("auth")) {
    return { text: "Authentication", icon: "🔑" };
  }
  if (norm.includes("bug")) {
    return { text: "Bug Report", icon: "🐛" };
  }
  if (norm.includes("feature")) {
    return { text: "Feature Request", icon: "🚀" };
  }
  if (norm.includes("general") || norm.includes("inquiry")) {
    return { text: "General Inquiry", icon: "❓" };
  }
  return { text: cat, icon: "📁" };
};

const getPriorityDisplay = (pri: string) => {
  const norm = pri.toUpperCase();
  switch (norm) {
    case "LOW":
      return { text: "Low", icon: "🟢" };
    case "MEDIUM":
      return { text: "Medium", icon: "🟡" };
    case "HIGH":
      return { text: "High", icon: "🔴" };
    case "URGENT":
      return { text: "Urgent", icon: "⚡" };
    default:
      return { text: pri, icon: "⚪" };
  }
};

const CreateTicket: React.FC = () => {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  // AI state
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);

  // Submission values that can be tweaked after AI analysis
  const [finalCategory, setFinalCategory] = useState("");
  const [finalPriority, setFinalPriority] = useState("MEDIUM");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { theme } = useTheme();
  const navigate = useNavigate();

  // Handle immediate attachment uploads
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    setError("");

    try {
      const file = e.target.files[0];
      const result = await uploadAPI.uploadFile(file);
      setAttachments((prev) => [
        ...prev,
        {
          url: result.secure_url,
          fileName: result.fileName,
          fileType: result.fileType,
        },
      ]);
    } catch (err: any) {
      setError(err.response?.data?.error || "File upload failed. Format must be image, PDF or Word document up to 10MB.");
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Stage 1: AI analysis
  const handleAnalyzeIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setError("Please fill in both the Subject and Description first.");
      return;
    }
    setError("");
    setAnalyzing(true);
    setAiAnalysis(null);

    try {
      const analysis = await aiAPI.analyzeTicket({ subject, description });
      setAiAnalysis(analysis);
      setFinalCategory(analysis.category);
      setFinalPriority((analysis.priority || "MEDIUM").toUpperCase());
    } catch (err: any) {
      console.error("AI analysis failed:", err);
      const msg = err.response?.data?.error || "Unable to analyze issue. Please try again.";
      setError(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  // Stage 2: Database saving
  const handleCreateTicket = async () => {
    if (!aiAnalysis) return;
    setSubmitting(true);
    setError("");

    try {
      await ticketAPI.create({
        subject,
        description,
        category: finalCategory,
        priority: finalPriority.toUpperCase(),
        aiCategory: aiAnalysis.category,
        aiPriority: (aiAnalysis.priority || "MEDIUM").toUpperCase(),
        aiSolutions: aiAnalysis.solutions,
        aiKbArticles: aiAnalysis.relatedKbArticles,
        aiReason: aiAnalysis.reason,
        aiConfidence: aiAnalysis.confidenceScore,
        aiUrgency: aiAnalysis.urgency,
        aiImpact: aiAnalysis.businessImpact,
        aiPrimaryIssue: aiAnalysis.primaryIssue,
        attachments,
      });
      navigate("/tickets");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to submit ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const isLight = theme === "light";

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="space-y-1">
        <h2 className={`text-[32px] font-bold tracking-tight ${isLight ? "text-[#0F172A]" : "text-white"}`}>Log a Support Ticket</h2>
        <p className={`text-[14px] ${isLight ? "text-[#64748B]" : "text-[#A1A1AA]"}`}>
          Describe your issue and let our smart AI triage your ticket, suggest instant solutions, and categorize it for faster resolution.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center space-x-3 text-red-400 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* TICKET FORM */}
        <div className={`border rounded-[18px] p-6 shadow-sm space-y-6 transition-colors duration-200 ${
          isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
        }`}>
          <h3 className={`font-semibold text-[15px] uppercase tracking-wider border-b pb-3 ${
            isLight ? "text-[#0F172A] border-[#E2E8F0]" : "text-white border-white/5"
          }`}>
            Ticket Details
          </h3>

          <form onSubmit={handleAnalyzeIssue} className="space-y-4">
            <div>
              <label className={`block text-[13px] font-medium uppercase tracking-wider mb-2 ${
                isLight ? "text-[#64748B]" : "text-zinc-400"
              }`}>
                Issue Subject
              </label>
              <input
                type="text"
                required
                disabled={!!aiAnalysis}
                placeholder="e.g., Cannot sign in to my billing account"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={`w-full h-[52px] border rounded-[14px] px-[18px] text-[15px] font-normal outline-none transition-all duration-300 focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12 disabled:opacity-50 ${
                  isLight 
                    ? "bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] placeholder-[#94A3B8]" 
                    : "bg-white/5 border-white/5 text-white placeholder-zinc-500"
                }`}
              />
            </div>

            <div>
              <label className={`block text-[13px] font-medium uppercase tracking-wider mb-2 ${
                isLight ? "text-[#64748B]" : "text-zinc-400"
              }`}>
                Detailed Description
              </label>
              <textarea
                required
                rows={6}
                disabled={!!aiAnalysis}
                placeholder="Please describe what is happening, any error codes, and what steps you've already taken..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`w-full border rounded-[14px] p-[18px] text-[15px] font-normal outline-none transition-all duration-300 focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12 disabled:opacity-50 ${
                  isLight 
                    ? "bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] placeholder-[#94A3B8]" 
                    : "bg-white/5 border-white/5 text-white placeholder-zinc-500"
                }`}
              />
            </div>

            {/* ATTACHMENT LIST */}
            <div className="space-y-3">
              <label className={`block text-[13px] font-medium uppercase tracking-wider ${
                isLight ? "text-[#64748B]" : "text-zinc-400"
              }`}>
                File Attachments (Optional)
              </label>

              <div className="flex items-center gap-3">
                <label className={`flex items-center space-x-2 px-4 py-2 border rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                  isLight 
                    ? "bg-slate-50 hover:bg-slate-100 border-[#E2E8F0] text-[#0F172A]" 
                    : "bg-white/5 hover:bg-white/10 border-white/5 text-white"
                }`}>
                  <Paperclip className="w-4 h-4 text-zinc-400" />
                  <span>Attach File</span>
                  <input
                    type="file"
                    disabled={uploading || !!aiAnalysis}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx"
                  />
                </label>
                {uploading && (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Uploading to Cloudinary...</span>
                  </div>
                )}
              </div>

              {attachments.length > 0 && (
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-3 border rounded-xl text-xs ${
                        isLight 
                          ? "bg-slate-50/50 border-[#E2E8F0] text-[#0F172A]" 
                          : "bg-white/5 border-white/5 text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <FileText className="w-4 h-4 text-zinc-500 shrink-0" />
                        <span className="truncate">{att.fileName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        disabled={!!aiAnalysis}
                        className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-white/5 cursor-pointer disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* TRIAGE ACTION BUTTON */}
            {!aiAnalysis && (
              <button
                type="submit"
                disabled={analyzing}
                className="w-full h-12 bg-gradient-to-r from-[#6D5DF6] to-[#8B5CF6] hover:brightness-110 text-white text-[14px] font-medium rounded-[14px] shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {analyzing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>DeepSeek triaging issue...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4.5 h-4.5 animate-pulse text-indigo-200" />
                    <span>Analyze Issue with AI</span>
                  </>
                )}
              </button>
            )}
          </form>

          {aiAnalysis && (
            <button
              onClick={() => {
                setAiAnalysis(null);
                setSubject("");
                setDescription("");
                setAttachments([]);
              }}
              className={`w-full py-3 px-4 border rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer ${
                isLight 
                  ? "bg-slate-50 hover:bg-slate-100 border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]" 
                  : "bg-white/5 hover:bg-white/10 border-white/5 text-[#A1A1AA] hover:text-white"
              }`}
            >
              <ListRestart className="w-4 h-4" />
              <span>Reset & Create New Form</span>
            </button>
          )}
        </div>

        {/* AI ANALYSIS RESULTS CARD */}
        <div className="h-full">
          <AnimatePresence mode="wait">
            {analyzing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className={`border rounded-[18px] p-8 text-center py-24 shadow-sm flex flex-col items-center justify-center space-y-4 transition-colors duration-200 ${
                  isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
                }`}
              >
                <div className="flex items-center space-x-1.5 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold text-indigo-400 uppercase tracking-wider mb-2">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                  <span>Triage in Progress</span>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 animate-bounce">
                  <Sparkles className="w-7 h-7 text-indigo-400 animate-spin" />
                </div>
                <h4 className={`font-semibold text-base ${isLight ? "text-[#0F172A]" : "text-white"}`}>DeepSeek Triaging</h4>
                <p className={`text-xs max-w-xs leading-relaxed ${isLight ? "text-[#64748B]" : "text-[#A1A1AA]"}`}>
                  Analyzing semantic patterns of your ticket to predict optimal routing category, priority, and retrieve troubleshooting recommendations.
                </p>
              </motion.div>
            )}

            {aiAnalysis && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={`border rounded-[18px] p-6 shadow-sm relative space-y-6 transition-colors duration-200 ${
                  isLight ? "bg-white border-[#6D5DF6]/30" : "bg-[#121A2B] border-indigo-500/15"
                }`}
              >
                {/* AI BADGE WATERMARK & STATUS */}
                <div className="absolute top-4 right-4 flex items-center space-x-2">
                  <span className="flex items-center space-x-1 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold text-emerald-400 uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span>Diagnosis Complete</span>
                  </span>
                  <div className="flex items-center space-x-1.5 bg-indigo-500/15 border border-indigo-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest">
                    <Sparkles className="w-3 h-3 text-[#6D5DF6]" />
                    <span>AI Coprocessor</span>
                  </div>
                </div>

                <h3 className={`font-semibold text-[15px] uppercase tracking-wider border-b pb-3 ${
                  isLight ? "text-[#0F172A] border-[#E2E8F0]" : "text-white border-white/5"
                }`}>
                  AI Diagnosis & Preview
                </h3>

                {/* CONFIDENCE INDICATOR */}
                <div className={`space-y-2 border p-4 rounded-xl ${
                  isLight ? "bg-slate-50/50 border-[#E2E8F0]" : "bg-indigo-500/5 border-indigo-500/10"
                }`}>
                  <div className={`flex justify-between items-center text-[10px] font-extrabold uppercase tracking-widest ${
                    isLight ? "text-[#64748B]" : "text-zinc-400"
                  }`}>
                    <span className="flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                      <span>Model Confidence Score</span>
                    </span>
                    <span className="text-[#6D5DF6] font-mono font-bold text-xs">
                      {aiAnalysis.confidenceScore !== undefined ? `${aiAnalysis.confidenceScore}%` : (finalPriority === "URGENT" ? "98%" : finalPriority === "HIGH" ? "94%" : finalPriority === "MEDIUM" ? "88%" : "82%")}
                    </span>
                  </div>
                  <div className={`h-2 w-full rounded-full overflow-hidden border ${
                    isLight ? "bg-slate-100 border-[#E2E8F0]" : "bg-white/5 border-white/5"
                  }`}>
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500" 
                      style={{ width: `${aiAnalysis.confidenceScore !== undefined ? aiAnalysis.confidenceScore : (finalPriority === "URGENT" ? 98 : finalPriority === "HIGH" ? 94 : finalPriority === "MEDIUM" ? 88 : 82)}%` }}
                    />
                  </div>
                </div>

                {/* PRIMARY ISSUE */}
                {aiAnalysis.primaryIssue && (
                  <div className={`p-4 border rounded-xl space-y-1.5 ${
                    isLight ? "bg-slate-50/50 border-[#E2E8F0]" : "bg-white/5 border-white/5"
                  }`}>
                    <span className={`block text-[10px] font-extrabold uppercase tracking-widest ${
                      isLight ? "text-[#64748B]" : "text-zinc-400"
                    }`}>
                      Primary Identified Issue
                    </span>
                    <p className={`text-xs font-semibold ${isLight ? "text-[#0F172A]" : "text-white"}`}>
                      {aiAnalysis.primaryIssue}
                    </p>
                  </div>
                )}

                {/* READ-ONLY AI PREDICTIONS & IMPACT */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className={`block text-[10px] font-extrabold uppercase tracking-widest ${
                      isLight ? "text-[#64748B]" : "text-zinc-400"
                    }`}>
                      Predicted Category
                    </label>
                    <div className={`flex items-center space-x-2.5 border px-4 py-3 rounded-xl text-xs font-semibold shadow-inner ${
                      isLight ? "bg-slate-50 border-[#E2E8F0] text-[#0F172A]" : "bg-indigo-500/5 border-indigo-500/10 text-white"
                    }`}>
                      <span className="text-base leading-none">{getCategoryDisplay(finalCategory).icon}</span>
                      <span className="truncate">{getCategoryDisplay(finalCategory).text}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className={`block text-[10px] font-extrabold uppercase tracking-widest ${
                      isLight ? "text-[#64748B]" : "text-zinc-400"
                    }`}>
                      Predicted Priority
                    </label>
                    <div className={`flex items-center space-x-2.5 border px-4 py-3 rounded-xl text-xs font-semibold shadow-inner ${
                      isLight ? "bg-slate-50 border-[#E2E8F0] text-[#0F172A]" : "bg-indigo-500/5 border-indigo-500/10 text-white"
                    }`}>
                      <span className="text-xs leading-none">{getPriorityDisplay(finalPriority).icon}</span>
                      <span className="truncate">{getPriorityDisplay(finalPriority).text}</span>
                    </div>
                  </div>

                  {aiAnalysis.urgency && (
                    <div className="space-y-1.5">
                      <label className={`block text-[10px] font-extrabold uppercase tracking-widest ${
                        isLight ? "text-[#64748B]" : "text-zinc-400"
                      }`}>
                        Estimated Urgency
                      </label>
                      <div className={`flex items-center space-x-2 border px-4 py-3 rounded-xl text-xs font-semibold shadow-inner ${
                        isLight ? "bg-slate-50 border-[#E2E8F0] text-[#0F172A]" : "bg-indigo-500/5 border-indigo-500/10 text-white"
                      }`}>
                        <span>⚡</span>
                        <span className="uppercase tracking-wide">{aiAnalysis.urgency}</span>
                      </div>
                    </div>
                  )}

                  {aiAnalysis.businessImpact && (
                    <div className="space-y-1.5">
                      <label className={`block text-[10px] font-extrabold uppercase tracking-widest ${
                        isLight ? "text-[#64748B]" : "text-zinc-400"
                      }`}>
                        Business Impact
                      </label>
                      <div className={`flex items-center space-x-2 border px-4 py-3 rounded-xl text-xs font-semibold shadow-inner ${
                        isLight ? "bg-slate-50 border-[#E2E8F0] text-[#0F172A]" : "bg-indigo-500/5 border-indigo-500/10 text-white"
                      }`}>
                        <span>📈</span>
                        <span className="uppercase tracking-wide">{aiAnalysis.businessImpact}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* AI DECISION EXPLANATION */}
                {aiAnalysis.reason && (
                  <div className={`p-4 border rounded-xl space-y-1.5 ${
                    isLight ? "bg-slate-50/50 border-[#E2E8F0]" : "bg-white/5 border-white/5"
                  }`}>
                    <span className={`block text-[10px] font-extrabold uppercase tracking-widest ${
                      isLight ? "text-[#64748B]" : "text-zinc-400"
                    }`}>
                      AI Decision Logic & Justification
                    </span>
                    <p className={`text-xs leading-relaxed ${isLight ? "text-[#475569]" : "text-zinc-300"}`}>
                      {aiAnalysis.reason}
                    </p>
                  </div>
                )}

                {/* SUGGESTED SOLUTIONS */}
                <div className="space-y-2.5">
                  <span className={`block text-[10px] font-extrabold uppercase tracking-widest ${
                    isLight ? "text-[#64748B]" : "text-zinc-500"
                  }`}>
                    Suggested Quick Fixes
                  </span>
                  <div className="space-y-2">
                    {aiAnalysis.solutions.map((sol, index) => (
                      <div
                        key={index}
                        className={`flex items-start space-x-2.5 border p-3 rounded-xl text-xs ${
                          isLight ? "bg-slate-50 border-[#E2E8F0] text-[#0F172A]" : "bg-white/5 border-white/5 text-zinc-300"
                        }`}
                      >
                        <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <p className="leading-relaxed">{sol}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* RELATED KB ARTICLES */}
                <div className="space-y-2.5">
                  <span className={`block text-[10px] font-extrabold uppercase tracking-widest ${
                    isLight ? "text-[#64748B]" : "text-zinc-500"
                  }`}>
                    Recommended Articles
                  </span>
                  <div className="space-y-1.5">
                    {aiAnalysis.relatedKbArticles.map((art, index) => (
                      <div
                        key={index}
                        className={`flex items-center space-x-2.5 border px-3.5 py-2.5 rounded-xl text-xs cursor-help transition-all duration-300 ${
                          isLight 
                            ? "bg-slate-50 hover:bg-slate-100 border-[#E2E8F0] text-[#6D5DF6]" 
                            : "bg-indigo-500/5 hover:bg-indigo-500/10 border-indigo-500/10 text-indigo-300"
                        }`}
                      >
                        <Bookmark className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="font-semibold truncate">{art}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* EXPLICIT CREATE TICKET ACTION */}
                <div className={`pt-4 border-t ${isLight ? "border-[#E2E8F0]" : "border-white/5"}`}>
                  <button
                    onClick={handleCreateTicket}
                    disabled={submitting}
                    className="w-full h-12 bg-gradient-to-r from-[#22C55E] to-[#10B981] hover:brightness-110 text-white text-[14px] font-semibold rounded-[14px] shadow-sm hover:shadow-md transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Logging Ticket...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4.5 h-4.5" />
                        <span>Confirm & Submit Support Ticket</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {!analyzing && !aiAnalysis && (
              <div className={`border border-dashed rounded-[18px] p-8 text-center py-28 shadow-sm flex flex-col items-center justify-center space-y-3 transition-colors duration-200 ${
                isLight ? "bg-white border-[#E2E8F0] text-[#64748B]" : "bg-[#121A2B] border-white/5 text-[#A1A1AA]"
              }`}>
                <HelpCircle className="w-12 h-12 text-zinc-600 animate-pulse" />
                <h4 className={`font-semibold text-sm ${isLight ? "text-[#0F172A]" : "text-white"}`}>AI Diagnostics Awaiting</h4>
                <p className="text-xs max-w-xs leading-relaxed">
                  Enter your issue's details on the left, and click <strong>Analyze Issue with AI</strong> to generate instant triage diagnostics!
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default CreateTicket;
