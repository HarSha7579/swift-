import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ticketAPI } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import {
  Search,
  Calendar,
  HelpCircle,
  Eye,
} from "lucide-react";

interface TicketType {
  id: number;
  subject: string;
  category: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  createdAt: string;
}

const MyTickets: React.FC = () => {
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const { theme } = useTheme();

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      try {
        const data = await ticketAPI.list({
          search: search || undefined,
          status: status || undefined,
          priority: priority || undefined,
          category: category || undefined,
          sortBy,
        });
        setTickets(data);
      } catch (err) {
        console.error("Failed to load tickets:", err);
      } finally {
        setLoading(false);
      }
    };

    const handler = setTimeout(() => {
      fetchTickets();
    }, 300); // Debounce API calls

    return () => clearTimeout(handler);
  }, [search, status, priority, category, sortBy]);

  const isLight = theme === "light";

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className={`text-[32px] font-bold tracking-tight ${isLight ? "text-[#0F172A]" : "text-white"}`}>My Support Tickets</h2>
          <p className={`text-[14px] ${isLight ? "text-[#64748B]" : "text-[#A1A1AA]"}`}>
            Track the statuses, view updates, and converse directly with support agents on active queries.
          </p>
        </div>
        <Link
          to="/create-ticket"
          className="px-5 py-2.5 bg-gradient-to-r from-[#6D5DF6] to-[#8B5CF6] hover:brightness-110 text-white text-[13px] font-medium rounded-xl shadow-sm transition-all duration-300 flex items-center justify-center cursor-pointer"
        >
          Open New Ticket
        </Link>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className={`border rounded-[18px] p-4 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-3 items-center transition-colors duration-200 ${
        isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
      }`}>
        {/* Search */}
        <div className="relative md:col-span-2">
          <input
            type="text"
            placeholder="Search tickets by subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full h-11 border rounded-xl px-4 pr-4 py-2 text-[13px] outline-none transition-all duration-300 focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12 ${
              isLight 
                ? "bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] placeholder-[#94A3B8]" 
                : "bg-white/5 border-white/5 text-white placeholder-zinc-500"
            }`}
          />
        </div>

        {/* Filter Status */}
        <div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`w-full h-11 border rounded-xl px-3 text-[13px] outline-none transition-all duration-300 focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12 cursor-pointer ${
              isLight 
                ? "bg-white border-[#E2E8F0] text-[#0F172A]" 
                : "bg-white/5 border-white/5 text-white"
            }`}
          >
            <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#121A2B] text-white"} value="">All Statuses</option>
            <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#121A2B] text-white"} value="OPEN">OPEN</option>
            <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#121A2B] text-white"} value="IN_PROGRESS">IN_PROGRESS</option>
            <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#121A2B] text-white"} value="RESOLVED">RESOLVED</option>
            <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#121A2B] text-white"} value="CLOSED">CLOSED</option>
          </select>
        </div>

        {/* Filter Priority */}
        <div>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className={`w-full h-11 border rounded-xl px-3 text-[13px] outline-none transition-all duration-300 focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12 cursor-pointer ${
              isLight 
                ? "bg-white border-[#E2E8F0] text-[#0F172A]" 
                : "bg-white/5 border-white/5 text-white"
            }`}
          >
            <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#121A2B] text-white"} value="">All Priorities</option>
            <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#121A2B] text-white"} value="LOW">LOW</option>
            <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#121A2B] text-white"} value="MEDIUM">MEDIUM</option>
            <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#121A2B] text-white"} value="HIGH">HIGH</option>
            <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#121A2B] text-white"} value="URGENT">URGENT</option>
          </select>
        </div>

        {/* Sorting option */}
        <div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`w-full h-11 border rounded-xl px-3 text-[13px] outline-none transition-all duration-300 focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12 cursor-pointer ${
              isLight 
                ? "bg-white border-[#E2E8F0] text-[#0F172A]" 
                : "bg-white/5 border-white/5 text-white"
            }`}
          >
            <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#121A2B] text-white"} value="createdAt">Sort: Newest</option>
            <option className={isLight ? "bg-white text-[#0F172A]" : "bg-[#121A2B] text-white"} value="priority">Sort: Priority</option>
          </select>
        </div>
      </div>

      {/* TICKETS TABLE / GRID */}
      <div className={`border rounded-[18px] shadow-sm overflow-hidden transition-colors duration-200 ${
        isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
      }`}>
        {loading ? (
          <div className="py-24 flex justify-center">
            <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className={`py-20 text-center flex flex-col items-center justify-center space-y-3 ${
            isLight ? "text-[#64748B]" : "text-[#A1A1AA]"
          }`}>
            <HelpCircle className="w-12 h-12 text-[#94A3B8]" />
            <h4 className={`font-semibold text-sm ${isLight ? "text-[#0F172A]" : "text-white"}`}>No tickets found</h4>
            <p className="text-xs max-w-xs leading-relaxed">
              We couldn't find any tickets matching your exact filter settings. Try relaxing your filters or create a new ticket.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[11px] font-semibold uppercase tracking-wider ${
                  isLight ? "border-[#E2E8F0] bg-slate-50/50 text-[#64748B]" : "border-white/5 bg-white/[0.01] text-zinc-500"
                }`}>
                  <th className="py-4 px-6">ID & Subject</th>
                  <th className="py-4 px-4">Category</th>
                  <th className="py-4 px-4">Priority</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Created Date</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-[13px] ${isLight ? "divide-[#E2E8F0]" : "divide-white/5"}`}>
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className={`transition-colors duration-150 group ${
                      isLight ? "hover:bg-slate-50/40" : "hover:bg-white/[0.01]"
                    }`}
                  >
                    <td className="py-5 px-6 min-w-[250px]">
                      <div className="space-y-1">
                        <span className="font-mono text-[11px] text-zinc-500 block">#{ticket.id}</span>
                        <Link
                          to={`/tickets/${ticket.id}`}
                          className={`font-semibold hover:text-[#6D5DF6] transition-colors duration-200 line-clamp-1 ${
                            isLight ? "text-[#0F172A]" : "text-white"
                          }`}
                        >
                          {ticket.subject}
                        </Link>
                      </div>
                    </td>

                    <td className="py-5 px-4">
                      <span className={`font-medium ${isLight ? "text-[#334155]" : "text-zinc-300"}`}>{ticket.category}</span>
                    </td>

                    <td className="py-5 px-4">
                      <span
                        className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
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
                    </td>

                    <td className="py-5 px-4">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
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
                    </td>

                    <td className="py-5 px-4 text-zinc-500">
                      <div className="flex items-center space-x-1.5 text-[12px]">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>

                    <td className="py-5 px-6 text-right">
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className={`inline-flex items-center space-x-1 px-3 py-1.5 border rounded-lg text-xs font-semibold transition-all duration-300 ${
                          isLight 
                            ? "bg-white hover:bg-[#6D5DF6]/5 border-[#E2E8F0] hover:border-[#6D5DF6]/20 text-[#64748B] hover:text-[#6D5DF6]" 
                            : "bg-white/5 hover:bg-indigo-500/10 border-white/5 hover:border-indigo-500/20 text-[#A1A1AA] hover:text-indigo-400"
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTickets;
