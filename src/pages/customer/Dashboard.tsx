import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ticketAPI } from "../../services/api";
import { useNotifications } from "../../context/NotificationContext";
import { useTheme } from "../../context/ThemeContext";
import {
  Ticket,
  PlusCircle,
  HelpCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface TicketType {
  id: number;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
}

const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { notifications, unreadCount, markRead } = useNotifications();
  const { theme } = useTheme();
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ open: 0, closed: 0, pending: 0 });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const data = await ticketAPI.list();
        setTickets(data.slice(0, 5)); // top 5 recent

        // Calculate simple stats
        const open = data.filter((t: any) => t.status === "OPEN").length;
        const pending = data.filter((t: any) => t.status === "IN_PROGRESS").length;
        const closed = data.filter((t: any) => t.status === "CLOSED" || t.status === "RESOLVED").length;
        setStats({ open, closed, pending });
      } catch (err) {
        console.error("Failed to load dashboard tickets:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const isLight = theme === "light";

  return (
    <div className="space-y-8">
      {/* WELCOME BANNER */}
      <div className={`border rounded-[18px] p-8 flex flex-col md:flex-row items-center justify-between relative overflow-hidden transition-all duration-300 ${
        isLight 
          ? "bg-gradient-to-r from-[#6D5DF6]/10 via-slate-50 to-transparent border-[#E2E8F0] shadow-sm"
          : "bg-gradient-to-r from-[#6D5DF6]/15 via-[#8B5CF6]/10 to-transparent border-white/5 shadow-lg"
      }`}>
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-[#6D5DF6]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2 text-center md:text-left z-10">
          <div className="flex items-center space-x-2 text-[#6D5DF6] font-bold text-[12px] tracking-wider uppercase justify-center md:justify-start">
            <Sparkles className="w-4.5 h-4.5 animate-pulse" />
            <span>WELCOME BACK</span>
          </div>
          <h2 className={`text-[28px] md:text-[32px] font-bold tracking-tight ${isLight ? "text-[#0F172A]" : "text-white"}`}>
            Hello, {user?.name}!
          </h2>
          <p className={`text-[14px] max-w-md leading-relaxed ${isLight ? "text-[#64748B]" : "text-[#94A3B8]"}`}>
            Have a question or running into an issue? Our AI-driven support system is ready to help resolve your problems instantly.
          </p>
        </div>
        <div className="mt-6 md:mt-0 flex flex-wrap gap-3 z-10 justify-center md:justify-end">
          <Link
            to="/create-ticket"
            className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-[#6D5DF6] to-[#8B5CF6] hover:brightness-110 text-white text-[14px] font-medium rounded-[14px] shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Create Ticket</span>
          </Link>
          <Link
            to="/kb"
            className={`flex items-center space-x-2 px-5 py-3 border rounded-[14px] text-[14px] font-medium transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer ${
              isLight 
                ? "bg-white hover:bg-slate-50 border-[#E2E8F0] text-[#0F172A]" 
                : "bg-[#1A2335] hover:bg-[#1A2335]/80 border-white/5 text-white"
            }`}
          >
            <HelpCircle className="w-5 h-5 text-[#64748B]" />
            <span>Knowledge Base</span>
          </Link>
          <Link
            to="/tickets"
            className={`flex items-center space-x-2 px-5 py-3 border rounded-[14px] text-[14px] font-medium transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer ${
              isLight 
                ? "bg-white hover:bg-slate-50 border-[#E2E8F0] text-[#0F172A]" 
                : "bg-[#1A2335] hover:bg-[#1A2335]/80 border-white/5 text-white"
            }`}
          >
            <Ticket className="w-5 h-5 text-[#64748B]" />
            <span>My Tickets</span>
          </Link>
        </div>
      </div>

      {/* STATS BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* OPEN TICKETS CARD */}
        <div className={`border rounded-[18px] p-6 flex items-center justify-between transition-all duration-300 hover:-translate-y-0.5 shadow-sm group ${
          isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
        }`}>
          <div className="space-y-1.5 text-left">
            <span className={`text-[12px] font-medium uppercase tracking-wider block ${isLight ? "text-[#64748B]" : "text-[#94A3B8]"}`}>
              Open Tickets
            </span>
            <h3 className={`text-[28px] font-bold tracking-tight group-hover:text-[#6D5DF6] transition-colors ${
              isLight ? "text-[#0F172A]" : "text-white"
            }`}>
              {stats.open}
            </h3>
            <span className="text-[12px] text-[#22C55E] font-medium flex items-center gap-1">
              <span>↑ 12%</span>
              <span className={isLight ? "text-[#94A3B8]" : "text-[#64748B]"}>vs last week</span>
            </span>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
            isLight ? "bg-[#6D5DF6]/10 border border-[#6D5DF6]/15 group-hover:bg-[#6D5DF6]/20" : "bg-[#6D5DF6]/10 border border-[#6D5DF6]/20 group-hover:bg-[#6D5DF6]/20"
          }`}>
            <AlertCircle className="w-5.5 h-5.5 text-[#6D5DF6]" />
          </div>
        </div>

        {/* IN PROGRESS CARD */}
        <div className={`border rounded-[18px] p-6 flex items-center justify-between transition-all duration-300 hover:-translate-y-0.5 shadow-sm group ${
          isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
        }`}>
          <div className="space-y-1.5 text-left">
            <span className={`text-[12px] font-medium uppercase tracking-wider block ${isLight ? "text-[#64748B]" : "text-[#94A3B8]"}`}>
              In Progress
            </span>
            <h3 className={`text-[28px] font-bold tracking-tight group-hover:text-[#F59E0B] transition-colors ${
              isLight ? "text-[#0F172A]" : "text-white"
            }`}>
              {stats.pending}
            </h3>
            <span className="text-[12px] text-[#22C55E] font-medium flex items-center gap-1">
              <span>↑ 4%</span>
              <span className={isLight ? "text-[#94A3B8]" : "text-[#64748B]"}>active focus</span>
            </span>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
            isLight ? "bg-[#F59E0B]/10 border border-[#F59E0B]/15 group-hover:bg-[#F59E0B]/20" : "bg-[#F59E0B]/10 border border-[#F59E0B]/20 group-hover:bg-[#F59E0B]/20"
          }`}>
            <Clock className="w-5.5 h-5.5 text-[#F59E0B] animate-spin" style={{ animationDuration: '6s' }} />
          </div>
        </div>

        {/* RESOLVED CARD */}
        <div className={`border rounded-[18px] p-6 flex items-center justify-between transition-all duration-300 hover:-translate-y-0.5 shadow-sm group ${
          isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
        }`}>
          <div className="space-y-1.5 text-left">
            <span className={`text-[12px] font-medium uppercase tracking-wider block ${isLight ? "text-[#64748B]" : "text-[#94A3B8]"}`}>
              Resolved & Closed
            </span>
            <h3 className={`text-[28px] font-bold tracking-tight group-hover:text-[#22C55E] transition-colors ${
              isLight ? "text-[#0F172A]" : "text-white"
            }`}>
              {stats.closed}
            </h3>
            <span className="text-[12px] text-[#22C55E] font-medium flex items-center gap-1">
              <span>98.4%</span>
              <span className={isLight ? "text-[#94A3B8]" : "text-[#64748B]"}>satisfaction rate</span>
            </span>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
            isLight ? "bg-[#22C55E]/10 border border-[#22C55E]/15 group-hover:bg-[#22C55E]/20" : "bg-[#22C55E]/10 border border-[#22C55E]/20 group-hover:bg-[#22C55E]/20"
          }`}>
            <CheckCircle className="w-5.5 h-5.5 text-[#22C55E]" />
          </div>
        </div>
      </div>

      {/* RECENT TICKETS & LOGS CHASSIS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RECENT TICKETS */}
        <div className={`border rounded-[18px] p-6 shadow-sm flex flex-col justify-between transition-colors duration-200 ${
          isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
        }`}>
          <div>
            <div className={`flex items-center justify-between border-b pb-4 mb-4 ${isLight ? "border-[#E2E8F0]" : "border-white/5"}`}>
              <h3 className={`font-semibold text-[18px] ${isLight ? "text-[#0F172A]" : "text-white"}`}>Recent Support Tickets</h3>
              <Link
                to="/tickets"
                className="text-[13px] font-medium text-[#6D5DF6] hover:text-[#8B5CF6] flex items-center space-x-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center">
                <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-12 text-center text-[14px] text-[#64748B] flex flex-col items-center space-y-3">
                <Ticket className="w-8 h-8 text-[#94A3B8]" />
                <p>You haven't logged any tickets yet.</p>
                <Link
                  to="/create-ticket"
                  className="text-[13px] font-medium text-indigo-400 hover:underline"
                >
                  Create your first ticket
                </Link>
              </div>
            ) : (
              <div className={`divide-y ${isLight ? "divide-[#E2E8F0]" : "divide-white/5"}`}>
                {tickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    to={`/tickets/${ticket.id}`}
                    className={`py-4 flex items-center justify-between px-2 rounded-xl transition-all duration-200 group ${
                      isLight ? "hover:bg-slate-50/60" : "hover:bg-white/[0.01]"
                    }`}
                  >
                    <div className="space-y-1 pr-4 min-w-0">
                      <span className="text-[11px] font-medium text-indigo-500 bg-indigo-500/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block">
                        {ticket.category}
                      </span>
                      <h4 className={`font-semibold text-[14px] group-hover:text-[#6D5DF6] transition-colors duration-200 truncate ${
                        isLight ? "text-[#0F172A]" : "text-white"
                      }`}>
                        {ticket.subject}
                      </h4>
                      <p className={`text-[12px] ${isLight ? "text-[#94A3B8]" : "text-zinc-500"}`}>
                        Logged on {new Date(ticket.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-full uppercase tracking-wide ${
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
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          ticket.status === "OPEN"
                            ? "bg-indigo-500/10 text-indigo-500"
                            : ticket.status === "IN_PROGRESS"
                            ? "bg-amber-500/10 text-amber-500 animate-pulse"
                            : ticket.status === "RESOLVED"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-zinc-700/30 text-zinc-500"
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RECENT NOTIFICATIONS SIDEBAR */}
        <div className={`border rounded-[18px] p-6 shadow-sm flex flex-col justify-between transition-colors duration-200 ${
          isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
        }`}>
          <div>
            <div className={`flex items-center justify-between border-b pb-4 mb-4 ${isLight ? "border-[#E2E8F0]" : "border-white/5"}`}>
              <h3 className={`font-semibold text-[18px] ${isLight ? "text-[#0F172A]" : "text-white"}`}>Recent Activity Log</h3>
              {unreadCount > 0 && (
                <span className="text-[11px] font-semibold bg-[#6D5DF6]/15 text-[#6D5DF6] px-2.5 py-0.5 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <div className={`py-12 text-center text-[14px] ${isLight ? "text-[#94A3B8]" : "text-[#A1A1AA]"}`}>
                  No activities logged yet.
                </div>
              ) : (
                notifications.slice(0, 4).map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3.5 rounded-xl border transition-all duration-300 ${
                      notif.isRead
                        ? "bg-transparent border-transparent"
                        : isLight 
                          ? "bg-slate-50 border-[#E2E8F0]" 
                          : "bg-white/[0.02] border-indigo-500/10"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <h4 className={`font-semibold text-[13px] leading-snug ${isLight ? "text-[#0F172A]" : "text-white"}`}>{notif.title}</h4>
                      {!notif.isRead && (
                        <button
                          onClick={() => markRead(notif.id)}
                          className="text-[12px] font-medium text-indigo-500 hover:underline cursor-pointer shrink-0"
                        >
                          Read
                        </button>
                      )}
                    </div>
                    <p className={`text-[12px] mt-1 leading-relaxed ${isLight ? "text-[#64748B]" : "text-[#A1A1AA]"}`}>
                      {notif.message}
                    </p>
                    <span className="text-[11px] text-zinc-500 block mt-2">
                      {new Date(notif.createdAt).toLocaleDateString()}
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

export default CustomerDashboard;
