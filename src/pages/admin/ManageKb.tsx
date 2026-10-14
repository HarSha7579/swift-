import React, { useState, useEffect } from "react";
import { kbAPI, aiAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  PlusCircle,
  BookOpen,
  Edit2,
  Trash2,
  Save,
  XCircle,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Tag,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Article {
  id: number;
  title: string;
  content: string;
  category: string;
  problem?: string | null;
  solution?: string | null;
  tags?: string | null;
  createdBy?: {
    id: number;
    name: string;
    role: string;
  };
}

const ManageKb: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  // Editor Modal/Form states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("General Inquiry");
  const [formSummary, setFormSummary] = useState("");
  const [formProblem, setFormProblem] = useState("");
  const [formPossibleCauses, setFormPossibleCauses] = useState("");
  const [formSolution, setFormSolution] = useState("");
  const [formAdditionalNotes, setFormAdditionalNotes] = useState("");
  const [formTags, setFormTags] = useState("");

  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [aiDrafting, setAiDrafting] = useState(false);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const data = await kbAPI.list();
      setArticles(data);
    } catch (err) {
      console.error("Failed to load KB index:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormTitle("");
    setFormCategory("General Inquiry");
    setFormSummary("");
    setFormProblem("");
    setFormPossibleCauses("");
    setFormSolution("");
    setFormAdditionalNotes("");
    setFormTags("");
    setFormError("");
    setShowForm(true);
  };

  const handleOpenEdit = (art: Article) => {
    setEditingId(art.id);
    setFormTitle(art.title);
    setFormCategory(art.category);
    setFormSummary("");
    setFormProblem(art.problem || "");
    setFormPossibleCauses("");
    setFormSolution(art.solution || "");
    setFormAdditionalNotes("");
    setFormTags(art.tags || "");
    setFormError("");
    setShowForm(true);
  };

  // Draft with AI — reads directly from existing form fields
  const handleAiDraft = async () => {
    const title = formTitle.trim();
    const problem = formProblem.trim();

    console.log("[Draft with AI] Button clicked");
    console.log("[Draft with AI] Title:", title);
    console.log("[Draft with AI] Problem:", problem);

    if (!title && !problem) {
      setFormError("Please enter at least a Title or Problem Description.");
      return;
    }

    setAiDrafting(true);
    setFormError("");

    try {
      // Build context from existing form fields
      const keywords = [
        formCategory !== "General Inquiry" ? formCategory : "",
        formTags.trim(),
        formPossibleCauses.trim(),
      ]
        .filter(Boolean)
        .join(", ");

      const requestBody = {
        title: title || "Knowledge Base Article",
        problemDescription: problem || undefined,
        keywords: keywords || undefined,
      };
      console.log("[Draft with AI] Sending request:", requestBody);

      const res = await aiAPI.draftKb(requestBody);
      console.log("[Draft with AI] Response received:", res);

      // Check if AI service returned unavailable
      if (res && res.success === false) {
        console.error("[Draft with AI] AI service unavailable:", res.message);
        setFormError("Unable to generate article draft. Please try again.");
        return;
      }

      // Log each field for debugging
      console.log("[Draft with AI] Parsing fields:", {
        title: res.title,
        category: res.category,
        summary: res.summary,
        problem: res.problem,
        possibleCauses: res.possibleCauses,
        solution: res.solution,
        additionalNotes: res.additionalNotes,
        tags: res.tags,
      });

      // Only fill empty fields — preserve existing user content
      if (res.title && !title) {
        console.log("[Draft with AI] Setting title:", res.title);
        setFormTitle(res.title);
      }
      if (res.category) {
        const mapped = mapAiCategory(res.category);
        if (mapped) setFormCategory(mapped);
      }
      if (res.summary && !formSummary.trim()) {
        console.log("[Draft with AI] Setting summary:", res.summary);
        setFormSummary(res.summary);
      }
      if (res.problem && !problem) {
        console.log("[Draft with AI] Setting problem:", res.problem);
        setFormProblem(res.problem);
      }
      if (res.possibleCauses && Array.isArray(res.possibleCauses) && !formPossibleCauses.trim()) {
        console.log("[Draft with AI] Setting possibleCauses:", res.possibleCauses);
        setFormPossibleCauses(res.possibleCauses.join("\n"));
      }
      if (res.solution && !formSolution.trim()) {
        console.log("[Draft with AI] Setting solution:", res.solution);
        setFormSolution(res.solution);
      }
      if (res.additionalNotes && !formAdditionalNotes.trim()) {
        console.log("[Draft with AI] Setting additionalNotes:", res.additionalNotes);
        setFormAdditionalNotes(res.additionalNotes);
      }
      if (res.tags && !formTags.trim()) {
        console.log("[Draft with AI] Setting tags:", res.tags);
        setFormTags(res.tags);
      }

      console.log("[Draft with AI] Form population complete");

    } catch (err: any) {
      console.error("[Draft with AI] Request failed:", err);
      setFormError("Unable to generate article draft. Please try again.");
    } finally {
      setAiDrafting(false);
    }
  };

  // Map AI category to the form's allowed category values
  const mapAiCategory = (aiCat: string): string => {
    if (!aiCat) return "General Inquiry";
    const lower = aiCat.toLowerCase();
    if (lower.includes("login") || lower.includes("auth")) return "Login & Authentication";
    if (lower.includes("billing") || lower.includes("payment")) return "Billing";
    if (lower.includes("performance") || lower.includes("slow")) return "Performance Issue";
    return "General Inquiry";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSuccessMsg("");

    if (!formTitle.trim() || !formProblem.trim() || !formSolution.trim()) {
      setFormError("Title, Problem, and Solution fields are required.");
      return;
    }

    try {
      const payload: any = {
        title: formTitle,
        category: formCategory,
        problem: formProblem,
        solution: formSolution,
        tags: formTags,
      };

      if (formSummary.trim()) payload.summary = formSummary;
      if (formPossibleCauses.trim()) payload.possibleCauses = formPossibleCauses;
      if (formAdditionalNotes.trim()) payload.additionalNotes = formAdditionalNotes;

      if (editingId) {
        await kbAPI.update(editingId, payload);
        setSuccessMsg("Article updated successfully.");
      } else {
        await kbAPI.create(payload);
        setSuccessMsg("New guide created successfully.");
      }

      setShowForm(false);
      await fetchArticles();
    } catch (err: any) {
      setFormError(err.response?.data?.error || "Failed to process request.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this guide from the knowledge base?")) return;
    try {
      await kbAPI.delete(id);
      setSuccessMsg("Article deleted.");
      await fetchArticles();
    } catch (err) {
      console.error("Failed to delete guide:", err);
    }
  };

  // Client-side multi-dimensional search/filter
  const filteredArticles = articles.filter((art) => {
    const q = search.toLowerCase();
    const titleMatch = art.title.toLowerCase().includes(q);
    const contentMatch = art.content.toLowerCase().includes(q);
    const problemMatch = art.problem ? art.problem.toLowerCase().includes(q) : false;
    const solutionMatch = art.solution ? art.solution.toLowerCase().includes(q) : false;
    const queryMatches = !search || titleMatch || contentMatch || problemMatch || solutionMatch;

    const categoryMatches = !categoryFilter || art.category === categoryFilter;

    const t = tagFilter.toLowerCase();
    const tagMatches = !tagFilter || (art.tags ? art.tags.toLowerCase().includes(t) : false);

    return queryMatches && categoryMatches && tagMatches;
  });

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      {/* HEADER */}
      <div className={`border-b pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 ${isLight ? "border-slate-100" : "border-white/5"}`}>
        <div className="space-y-1.5 text-left">
          <div className="flex items-center space-x-2 text-[#6D5DF6] font-semibold text-xs tracking-wider uppercase">
            <BookOpen className="w-4 h-4" />
            <span>Support Documentation Hub</span>
          </div>
          <h2 className={`text-3xl font-extrabold tracking-tight ${
            isLight ? "text-[#0F172A]" : "text-white"
          }`}>Manage Knowledge Base</h2>
          <p className={`text-xs max-w-2xl leading-relaxed ${
            isLight ? "text-slate-500" : "text-[#A1A1AA]"
          }`}>
            Publish reference documentation, self-service solutions, updates, and troubleshooting manuals to assist customers.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="self-start md:self-auto h-11 px-5 bg-[#6D5DF6] hover:bg-[#5C4EE3] text-white text-xs font-bold rounded-xl shadow-md transition-all duration-300 flex items-center space-x-2 cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Write New Guide</span>
        </button>
      </div>

      {successMsg && (
        <div className={`border p-4 rounded-xl flex items-center space-x-3 text-xs ${
          isLight ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
        }`}>
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* FILTER SEARCH BAR */}
      <div className={`border rounded-[18px] p-5 shadow-sm ${
        isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search title, problem, solution..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full h-11 px-4 rounded-xl text-xs outline-none transition-all duration-300 border ${
                isLight
                  ? "bg-[#F8FAFC] border-slate-200 text-[#0F172A] focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12 placeholder-[#94A3B8]"
                  : "bg-white/5 border border-white/5 text-white focus:border-[#6366F1]/30 focus:ring-4 focus:ring-[#6366F1]/12 placeholder-zinc-500"
              }`}
            />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`w-full h-11 px-3 rounded-xl text-xs outline-none transition-all duration-300 border ${
                isLight
                  ? "bg-[#F8FAFC] border-slate-200 text-[#0F172A] focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12"
                  : "bg-white/5 border border-white/5 text-white focus:border-[#6366F1]/30"
              }`}
            >
              <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#18181B] text-white"} value="">All Categories</option>
              <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#18181B] text-white"} value="Login & Authentication">Login & Authentication</option>
              <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#18181B] text-white"} value="Billing">Billing & Payments</option>
              <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#18181B] text-white"} value="Performance Issue">Performance Issue</option>
              <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#18181B] text-white"} value="General Inquiry">General Inquiry</option>
            </select>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Filter by tag (e.g. billing, password)"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className={`w-full h-11 px-4 rounded-xl text-xs outline-none transition-all duration-300 border ${
                isLight
                  ? "bg-[#F8FAFC] border-slate-200 text-[#0F172A] focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12 placeholder-[#94A3B8]"
                  : "bg-white/5 border border-white/5 text-white focus:border-[#6366F1]/30 focus:ring-4 focus:ring-[#6366F1]/12 placeholder-zinc-500"
              }`}
            />
          </div>
        </div>
      </div>

      {/* EDITOR FORM PANEL modal-like */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`border rounded-[24px] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col ${
                isLight ? "bg-white border-slate-200" : "bg-[#18181B] border-white/5"
              }`}
            >
              <div className={`p-6 border-b flex items-center justify-between shrink-0 ${
                isLight ? "border-slate-100 bg-slate-50/50" : "border-white/5 bg-white/[0.01]"
              }`}>
                <h3 className={`font-extrabold text-base ${isLight ? "text-[#0F172A]" : "text-white"}`}>
                  {editingId ? "Edit Reference Guide" : "Draft New Troubleshooting Guide"}
                </h3>
                <button
                  onClick={() => { setShowForm(false); setFormError(""); setSuccessMsg(""); }}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isLight ? "hover:bg-slate-100 text-slate-500 hover:text-slate-900" : "hover:bg-white/5 text-zinc-500 hover:text-white"
                  }`}
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
                {formError && (
                  <div className={`border p-3.5 rounded-xl flex items-center space-x-2.5 text-xs ${
                    isLight ? "bg-red-50 border-red-200 text-red-800" : "bg-red-500/10 border border-red-500/20 text-red-400"
                  }`}>
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Title + Draft with AI button */}
                <div className="flex flex-col sm:flex-row items-end justify-between gap-4">
                  <div className="flex-1 space-y-1.5 w-full text-left">
                    <label className={`block text-[10px] font-extrabold uppercase tracking-widest ${
                      isLight ? "text-slate-500" : "text-zinc-500"
                    }`}>
                      Article Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Setting Up Stripe Account Payment Details"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className={`w-full h-11 px-4 rounded-xl text-xs outline-none transition-all duration-300 border ${
                        isLight
                          ? "bg-[#F8FAFC] border-slate-200 text-[#0F172A] focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12 placeholder-[#94A3B8]"
                          : "bg-white/5 border border-white/5 text-white focus:border-[#6366F1]/30 focus:ring-4 focus:ring-[#6366F1]/12 placeholder-zinc-500"
                      }`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAiDraft}
                    disabled={aiDrafting}
                    className={`h-11 px-4 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all duration-300 disabled:opacity-40 shrink-0 border ${
                      isLight 
                        ? "bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-[#6D5DF6]" 
                        : "bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400"
                    }`}
                  >
                    {aiDrafting ? (
                      <>
                        <div className={`w-3.5 h-3.5 border-2 rounded-full animate-spin ${isLight ? "border-indigo-400/30 border-t-[#6D5DF6]" : "border-indigo-400/30 border-t-indigo-400"}`} />
                        <span>Drafting...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 animate-pulse" />
                        <span>Draft with AI</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Category + Tags row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className={`block text-[10px] font-extrabold uppercase tracking-widest ${
                      isLight ? "text-slate-500" : "text-zinc-500"
                    }`}>
                      Routing Category
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className={`w-full h-11 px-3 rounded-xl text-xs outline-none transition-all duration-300 border ${
                        isLight
                          ? "bg-[#F8FAFC] border-slate-200 text-[#0F172A] focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12"
                          : "bg-white/5 border border-white/5 text-white focus:border-[#6366F1]/30"
                      }`}
                    >
                      <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#18181B] text-white"} value="Login & Authentication">Login & Authentication</option>
                      <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#18181B] text-white"} value="Billing">Billing & Payments</option>
                      <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#18181B] text-white"} value="Performance Issue">Performance Issue</option>
                      <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#18181B] text-white"} value="General Inquiry">General Inquiry</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className={`block text-[10px] font-extrabold uppercase tracking-widest ${
                      isLight ? "text-slate-500" : "text-zinc-500"
                    }`}>
                      Tags (Comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. billing, stripe, charge"
                      value={formTags}
                      onChange={(e) => setFormTags(e.target.value)}
                      className={`w-full h-11 px-4 rounded-xl text-xs outline-none transition-all duration-300 border ${
                        isLight
                          ? "bg-[#F8FAFC] border-slate-200 text-[#0F172A] focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12 placeholder-[#94A3B8]"
                          : "bg-white/5 border border-white/5 text-white focus:border-[#6366F1]/30 focus:ring-4 focus:ring-[#6366F1]/12 placeholder-zinc-500"
                      }`}
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="space-y-1.5 text-left">
                  <label className={`block text-[10px] font-extrabold uppercase tracking-widest ${
                    isLight ? "text-slate-500" : "text-zinc-500"
                  }`}>
                    Summary
                  </label>
                  <input
                    type="text"
                    placeholder="Brief summary of the article..."
                    value={formSummary}
                    onChange={(e) => setFormSummary(e.target.value)}
                    className={`w-full h-11 px-4 rounded-xl text-xs outline-none transition-all duration-300 border ${
                      isLight
                        ? "bg-[#F8FAFC] border-slate-200 text-[#0F172A] focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12 placeholder-[#94A3B8]"
                        : "bg-white/5 border border-white/5 text-white focus:border-[#6366F1]/30 focus:ring-4 focus:ring-[#6366F1]/12 placeholder-zinc-500"
                    }`}
                  />
                </div>

                {/* Problem Description */}
                <div className="space-y-1.5 text-left">
                  <label className={`block text-[10px] font-extrabold uppercase tracking-widest ${
                    isLight ? "text-slate-500" : "text-zinc-500"
                  }`}>
                    Problem Description
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe the problem, question, or diagnostic symptoms clearly..."
                    value={formProblem}
                    onChange={(e) => setFormProblem(e.target.value)}
                    className={`w-full px-4 py-3 text-xs outline-none transition-all duration-300 border rounded-xl resize-none font-sans leading-relaxed ${
                      isLight
                        ? "bg-[#F8FAFC] border-slate-200 text-[#0F172A] focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12 placeholder-[#94A3B8]"
                        : "bg-white/5 border border-white/5 text-white focus:border-[#6366F1]/30 focus:ring-4 focus:ring-[#6366F1]/12 placeholder-zinc-500"
                    }`}
                  />
                </div>

                {/* Possible Causes */}
                <div className="space-y-1.5 text-left">
                  <label className={`block text-[10px] font-extrabold uppercase tracking-widest ${
                    isLight ? "text-slate-500" : "text-zinc-500"
                  }`}>
                    Possible Causes <span className="text-zinc-500 font-normal normal-case">(one per line)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Incorrect configuration&#10;Missing API credentials&#10;Network timeout"
                    value={formPossibleCauses}
                    onChange={(e) => setFormPossibleCauses(e.target.value)}
                    className={`w-full px-4 py-3 text-xs outline-none transition-all duration-300 border rounded-xl resize-none font-sans leading-relaxed ${
                      isLight
                        ? "bg-[#F8FAFC] border-slate-200 text-[#0F172A] focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12 placeholder-[#94A3B8]"
                        : "bg-white/5 border border-white/5 text-white focus:border-[#6366F1]/30 focus:ring-4 focus:ring-[#6366F1]/12 placeholder-zinc-500"
                    }`}
                  />
                </div>

                {/* Solution Details */}
                <div className="space-y-1.5 text-left">
                  <label className={`block text-[10px] font-extrabold uppercase tracking-widest ${
                    isLight ? "text-slate-500" : "text-zinc-500"
                  }`}>
                    Solution Details / Instructions
                  </label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Provide step-by-step resolution instructions or guidelines..."
                    value={formSolution}
                    onChange={(e) => setFormSolution(e.target.value)}
                    className={`w-full px-4 py-3 text-xs outline-none transition-all duration-300 border rounded-xl resize-none font-sans leading-relaxed ${
                      isLight
                        ? "bg-[#F8FAFC] border-slate-200 text-[#0F172A] focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12 placeholder-[#94A3B8]"
                        : "bg-white/5 border border-white/5 text-white focus:border-[#6366F1]/30 focus:ring-4 focus:ring-[#6366F1]/12 placeholder-zinc-500"
                    }`}
                  />
                </div>

                {/* Additional Notes */}
                <div className="space-y-1.5 text-left">
                  <label className={`block text-[10px] font-extrabold uppercase tracking-widest ${
                    isLight ? "text-slate-500" : "text-zinc-500"
                  }`}>
                    Additional Notes <span className="text-zinc-500 font-normal normal-case">(optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Any additional context, prerequisites, or notes..."
                    value={formAdditionalNotes}
                    onChange={(e) => setFormAdditionalNotes(e.target.value)}
                    className={`w-full px-4 py-3 text-xs outline-none transition-all duration-300 border rounded-xl resize-none font-sans leading-relaxed ${
                      isLight
                        ? "bg-[#F8FAFC] border-slate-200 text-[#0F172A] focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12 placeholder-[#94A3B8]"
                        : "bg-white/5 border border-white/5 text-white focus:border-[#6366F1]/30 focus:ring-4 focus:ring-[#6366F1]/12 placeholder-zinc-500"
                    }`}
                  />
                </div>

                <div className={`pt-4 border-t flex justify-end space-x-3 shrink-0 ${isLight ? "border-slate-100" : "border-white/5"}`}>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setFormError(""); setSuccessMsg(""); }}
                    className={`px-4 py-2.5 text-xs font-semibold rounded-xl border transition-all duration-300 cursor-pointer ${
                      isLight 
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200" 
                        : "bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#6D5DF6] hover:bg-[#5C4EE3] text-white text-xs font-bold rounded-xl shadow transition-all duration-300 flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Article</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ARTICLES CANVAS */}
      <div className={`border rounded-[18px] shadow-sm overflow-hidden ${
        isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
      }`}>
        {loading ? (
          <div className="py-24 flex justify-center">
            <div className="w-8 h-8 border-2 border-[#6D5DF6]/30 border-t-[#6D5DF6] rounded-full animate-spin" />
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
            <BookOpen className={`w-12 h-12 ${isLight ? "text-slate-300" : "text-zinc-600"} animate-pulse`} />
            <h4 className={`font-bold text-sm ${isLight ? "text-[#0F172A]" : "text-white"}`}>No articles found</h4>
            <p className={`text-xs max-w-xs leading-relaxed ${isLight ? "text-slate-500" : "text-[#A1A1AA]"}`}>
              We couldn't find any articles matching your filters. Write a new guide to expand the Knowledge Base!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                  isLight ? "text-slate-400 border-slate-100 bg-slate-50/50" : "text-zinc-500 border-white/5 bg-white/[0.01]"
                }`}>
                  <th className="py-4 px-6">Guide Title</th>
                  <th className="py-4 px-4">Subject Category</th>
                  <th className="py-4 px-4">Problem</th>
                  <th className="py-4 px-4">Solution</th>
                  <th className="py-4 px-4">Tags</th>
                  {user?.role === "ADMIN" && <th className="py-4 px-6 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className={`divide-y text-xs ${
                isLight ? "divide-slate-100 text-slate-700" : "divide-white/5 text-zinc-300"
              }`}>
                {filteredArticles.map((art) => {
                  const isCreatorMe = art.createdBy?.id === user?.id;
                  const canEdit = user?.role === "ADMIN" || isCreatorMe;
                  const canDelete = user?.role === "ADMIN";

                  return (
                    <tr key={art.id} className={`transition-colors duration-150 ${
                      isLight ? "hover:bg-slate-50/50" : "hover:bg-white/[0.01]"
                    }`}>
                      <td className="py-5 px-6 min-w-[200px]">
                        <h4 className={`font-bold text-sm truncate text-left ${isLight ? "text-[#0F172A]" : "text-white"}`}>{art.title}</h4>
                        <span className={`font-mono text-[9px] text-left block ${isLight ? "text-slate-400" : "text-zinc-500"}`}>
                          BY {art.createdBy?.name || "System"} • #{art.id}
                        </span>
                      </td>

                      <td className="py-5 px-4 font-semibold text-left">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                          isLight 
                            ? "text-[#6D5DF6] bg-indigo-50 border-indigo-200"
                            : "text-indigo-400 bg-indigo-500/10 border border-indigo-500/15"
                        }`}>
                          {art.category}
                        </span>
                      </td>

                      <td className={`py-5 px-4 max-w-[180px] truncate font-sans text-left ${isLight ? "text-slate-600" : "text-zinc-300"}`}>
                        {art.problem || art.content}
                      </td>

                      <td className={`py-5 px-4 max-w-[180px] truncate font-sans text-left ${isLight ? "text-slate-500" : "text-zinc-500"}`}>
                        {art.solution || "N/A"}
                      </td>

                      <td className="py-5 px-4 max-w-[150px] text-left">
                        <div className="flex flex-wrap gap-1">
                          {art.tags ? (
                            art.tags.split(",").map((t, idx) => (
                              <span
                                key={idx}
                                className={`inline-flex items-center space-x-1 text-[9px] border px-2 py-0.5 rounded ${
                                  isLight 
                                    ? "bg-slate-100 border-slate-200 text-slate-600" 
                                    : "bg-white/5 border border-white/5 text-zinc-400"
                                }`}
                              >
                                <Tag className="w-2.5 h-2.5 shrink-0" />
                                <span>{t.trim()}</span>
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-zinc-600 italic">No tags</span>
                          )}
                        </div>
                      </td>

                      {user?.role === "ADMIN" && (
                        <td className="py-5 px-6 text-right">
                          <div className="inline-flex space-x-2">
                            {canEdit && (
                              <button
                                onClick={() => handleOpenEdit(art)}
                                className={`p-2 border rounded-lg transition-all duration-300 cursor-pointer ${
                                  isLight 
                                    ? "bg-slate-50 hover:bg-[#6D5DF6]/10 border-slate-200 hover:border-[#6D5DF6]/20 text-slate-500 hover:text-[#6D5DF6]" 
                                    : "bg-white/5 hover:bg-indigo-500/10 border border-white/5 hover:border-indigo-500/20 text-[#A1A1AA] hover:text-indigo-400"
                                }`}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(art.id)}
                                className={`p-2 border rounded-lg transition-all duration-300 cursor-pointer ${
                                  isLight 
                                    ? "bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-600" 
                                    : "bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 text-[#A1A1AA] hover:text-red-400"
                                }`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageKb;