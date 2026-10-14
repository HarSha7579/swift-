import React, { useState, useEffect } from "react";
import { kbAPI } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { useLocation } from "react-router-dom";
import { Search, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Article {
  id: number;
  title: string;
  content: string;
  category: string;
}

const KbArticles: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { theme } = useTheme();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.expandKbId && articles.length > 0) {
      setExpandedId(location.state.expandKbId);
    }
  }, [location.state?.expandKbId, articles]);

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      try {
        const data = await kbAPI.list({
          search: search || undefined,
          category: category || undefined,
        });
        setArticles(data);
      } catch (err) {
        console.error("Failed to load knowledge base articles:", err);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchArticles();
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [search, category]);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const isLight = theme === "light";

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="space-y-1">
        <h2 className={`text-[32px] font-bold tracking-tight ${isLight ? "text-[#0F172A]" : "text-white"}`}>Knowledge Base & Guides</h2>
        <p className={`text-[14px] ${isLight ? "text-[#64748B]" : "text-[#A1A1AA]"}`}>
          Browse our compiled troubleshoot guides, login troubleshooting, billing details, and help documents to resolve issues instantly.
        </p>
      </div>

      {/* FILTER/SEARCH HUB */}
      <div className={`border rounded-[18px] p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center transition-colors duration-200 ${
        isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
      }`}>
        {/* Search */}
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Search guides, passwords, error codes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full h-11 border rounded-xl px-4 py-2 text-[13px] outline-none transition-all duration-300 focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12 ${
              isLight 
                ? "bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] placeholder-[#94A3B8]" 
                : "bg-white/5 border border-white/5 text-white placeholder-zinc-500"
            }`}
          />
        </div>

        {/* Categories select */}
        <div className="w-full md:w-64">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`w-full h-11 border rounded-xl px-3 text-[13px] outline-none transition-all duration-300 focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12 cursor-pointer ${
              isLight 
                ? "bg-white border-[#E2E8F0] text-[#0F172A]" 
                : "bg-white/5 border border-white/5 text-white"
            }`}
          >
            <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#121A2B] text-white"} value="">All Categories</option>
            <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#121A2B] text-white"} value="Login & Authentication">Login & Authentication</option>
            <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#121A2B] text-white"} value="Billing">Billing & Payments</option>
            <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#121A2B] text-white"} value="Performance Issue">Performance Issue</option>
            <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#121A2B] text-white"} value="General Inquiry">General Inquiry</option>
          </select>
        </div>
      </div>

      {/* ARTICLES CANVAS */}
      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : articles.length === 0 ? (
        <div className={`py-20 text-center flex flex-col items-center justify-center space-y-3 border border-dashed rounded-[18px] ${
          isLight ? "bg-slate-50/50 border-slate-200 text-[#64748B]" : "bg-[#18181B]/20 border-white/5 text-[#A1A1AA]"
        }`}>
          <HelpCircle className="w-12 h-12 text-[#94A3B8] animate-pulse" />
          <h4 className={`font-semibold text-sm ${isLight ? "text-[#0F172A]" : "text-white"}`}>No articles found</h4>
          <p className="text-xs max-w-xs leading-relaxed">
            We couldn't find any articles matching your search description. Please try searching something else or open a support ticket.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => {
            const isExpanded = expandedId === article.id;
            return (
              <div
                key={article.id}
                className={`border rounded-[18px] shadow-sm overflow-hidden transition-all duration-300 ${
                  isLight 
                    ? isExpanded 
                      ? "border-[#6D5DF6]/30 bg-slate-50/50" 
                      : "border-[#E2E8F0] bg-white hover:border-[#6D5DF6]/30"
                    : isExpanded 
                      ? "border-indigo-500/20 bg-[#121A2B]" 
                      : "border-white/5 bg-[#121A2B] hover:border-white/10"
                }`}
              >
                {/* ACCORDION HEADER */}
                <button
                  onClick={() => toggleExpand(article.id)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="space-y-1.5 min-w-0 pr-4">
                    <span className="text-[10px] font-semibold text-[#6D5DF6] bg-[#6D5DF6]/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block">
                      {article.category}
                    </span>
                    <h3 className={`font-bold text-sm sm:text-base truncate group-hover:text-[#6D5DF6] ${
                      isLight ? "text-[#0F172A]" : "text-white"
                    }`}>
                      {article.title}
                    </h3>
                  </div>
                  <div className={`shrink-0 p-2 rounded-xl border ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5"
                  }`}>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                  </div>
                </button>

                {/* ACCORDION BODY */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className={`p-6 border-t text-[13px] leading-relaxed whitespace-pre-wrap ${
                        isLight 
                          ? "border-slate-100 bg-white text-[#334155]" 
                          : "border-white/5 bg-white/[0.01] text-zinc-300"
                      }`}>
                        {article.content}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default KbArticles;
