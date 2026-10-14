import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { agentAPI } from "../../services/api";
import {
  Clock,
  CheckCircle,
  Users,
  Eye,
  UserCheck,
  AlertCircle,
  Sparkles,
  Inbox,
} from "lucide-react";

interface TicketType {
  id: number;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  customer: {
    id: number;
    name: string;
    email: string;
  };
}

const AgentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [assignedTickets, setAssignedTickets] = useState<TicketType[]>([]);
  const [unassignedTickets, setUnassignedTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [stats, setStats] = useState({ assignedOpen: 0, claimable: 0 });
  const isFetchingRef = useRef(false);

  const fetchDashboardData = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const [assigned, unassigned] = await Promise.all([
        agentAPI.getMyTickets(),
        agentAPI.getAvailableTickets(),
      ]);

      setAssignedTickets(assigned);
      setUnassignedTickets(unassigned);

      const assignedOpen = assigned.filter(
        (t: any) => t.status !== "CLOSED" && t.status !== "RESOLVED"
      ).length;
      setStats({ assignedOpen, claimable: unassigned.length });
    } catch (err) {
      console.error("Failed to load agent dashboard tickets:", err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchDashboardData();
      }
    }, 30000); // Poll every 30s when visible
    return () => clearInterval(interval);
  }, [user]);

  const handleClaimTicket = async (id: number) => {
    setErrorText(null);
    try {
      await agentAPI.acceptTicket(id);
      await fetchDashboardData();
    } catch (err: any) {
      console.error("Failed to claim ticket:", err);
      if (err.response?.status === 409) {
        setErrorText("This ticket has already been accepted by another agent.");
      } else {
        setErrorText(
          err.response?.data?.error || "Failed to claim the ticket. Please try again."
        );
      }
      // Refresh to get the latest accurate lists
      await fetchDashboardData();
    }
  };

  const isLight = theme === "light";

  const formatPriority = (priority: string) => {
    switch (priority) {
      case "LOW":
        return { label: "Low", class: isLight ? "bg-slate-100 text-slate-500" : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/10" };
      case "MEDIUM":
        return { label: "Medium", class: isLight ? "bg-blue-50 text-blue-500" : "bg-blue-500/10 text-blue-400 border border-blue-500/10" };
      case "HIGH":
        return { label: "High", class: isLight ? "bg-amber-50 text-amber-500" : "bg-amber-500/10 text-amber-400 border border-amber-500/10" };
      case "URGENT":
        return { label: "Urgent", class: isLight ? "bg-red-50 text-red-500" : "bg-red-500/10 text-red-400 border border-red-500/10 animate-pulse" };
      default:
        return { label: priority, class: "bg-zinc-500/10 text-zinc-400 border border-zinc-500/10" };
    }
  };

  return (
    <div className="space-y-8">
      {/* HEADER COCKPIT */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 ${
        isLight ? "border-slate-100" : "border-white/5"
      }`}>
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-[#6D5DF6] font-semibold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-[#6D5DF6]" />
            <span>Agent Console</span>
          </div>
          <h2 className={`text-[32px] font-bold tracking-tight ${isLight ? "text-[#0F172A]" : "text-white"}`}>Welcome back, {user?.name}</h2>
          <p className={`text-[14px] ${isLight ? "text-[#64748B]" : "text-[#A1A1AA]"}`}>
            Review your active workloads, claim unassigned customer tickets, and use DeepSeek to resolve cases.
          </p>
        </div>
      </div>

      {/* ERROR BANNER */}
      {errorText && (
        <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-xl flex items-center space-x-3 text-red-500 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorText}</span>
        </div>
      )}

      {/* WORKLOAD METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`border rounded-[18px] p-6 flex items-center justify-between shadow-sm transition-all duration-200 group ${
          isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
        }`}>
          <div className="space-y-1 text-left">
            <span className={`text-[11px] font-semibold uppercase tracking-wider block ${isLight ? "text-[#64748B]" : "text-[#94A3B8]"}`}>
              My Active Assigned Workload
            </span>
            <h3 className={`text-3xl font-bold group-hover:text-[#6D5DF6] transition-colors ${isLight ? "text-[#0F172A]" : "text-white"}`}>
              {stats.assignedOpen}
            </h3>
          </div>
          <div className="w-12 h-12 bg-[#6D5DF6]/10 border border-[#6D5DF6]/20 rounded-xl flex items-center justify-center group-hover:bg-[#6D5DF6]/20 transition-colors">
            <Clock className="w-6 h-6 text-[#6D5DF6]" />
          </div>
        </div>

        <div className={`border rounded-[18px] p-6 flex items-center justify-between shadow-sm transition-all duration-200 group ${
          isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
        }`}>
          <div className="space-y-1 text-left">
            <span className={`text-[11px] font-semibold uppercase tracking-wider block ${isLight ? "text-[#64748B]" : "text-[#94A3B8]"}`}>
              Claimable in Triage Queue
            </span>
            <h3 className={`text-3xl font-bold group-hover:text-[#8B5CF6] transition-colors ${isLight ? "text-[#0F172A]" : "text-white"}`}>
              {stats.claimable}
            </h3>
          </div>
          <div className="w-12 h-12 bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 rounded-xl flex items-center justify-center group-hover:bg-[#8B5CF6]/20 transition-colors">
            <Users className="w-6 h-6 text-[#8B5CF6]" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* ASSIGNED TO ME QUEUE */}
        <div className={`border rounded-[18px] p-6 shadow-sm space-y-6 transition-all duration-200 ${
          isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
        }`}>
          <div className={`border-b pb-4 ${isLight ? "border-slate-100" : "border-white/5"}`}>
            <h3 className={`font-bold text-base flex items-center space-x-2 ${isLight ? "text-[#0F172A]" : "text-white"}`}>
              <Clock className="w-5 h-5 text-[#6D5DF6]" />
              <span>My Assigned Tickets</span>
            </h3>
            <p className="text-[13px] text-zinc-500 mt-1">Tickets assigned to you that are currently active or pending reply.</p>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : assignedTickets.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#A1A1AA] flex flex-col items-center space-y-3">
              <CheckCircle className="w-8 h-8 text-zinc-400" />
              <p className={isLight ? "text-[#64748B]" : "text-[#A1A1AA]"}>Hooray! No assigned open tickets on your workload.</p>
            </div>
          ) : (
            <div className={`divide-y max-h-[400px] overflow-y-auto pr-1 ${isLight ? "divide-slate-100" : "divide-white/5"}`}>
              {assignedTickets.map((ticket) => {
                const priorityInfo = formatPriority(ticket.priority);
                return (
                  <div key={ticket.id} className="py-4 flex items-center justify-between gap-4 group">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[9px] font-semibold text-[#6D5DF6] bg-[#6D5DF6]/10 px-2 py-0.5 rounded uppercase tracking-wider">
                          {ticket.category}
                        </span>
                        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${priorityInfo.class}`}>
                          {priorityInfo.label}
                        </span>
                        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                          isLight ? "bg-slate-100 text-[#64748B]" : "text-[#A1A1AA] bg-white/5"
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                      <h4 className={`font-bold text-[14px] transition-colors duration-200 truncate ${
                        isLight ? "text-[#0F172A] group-hover:text-[#6D5DF6]" : "text-white group-hover:text-indigo-300"
                      }`}>
                        {ticket.subject}
                      </h4>
                      <p className="text-[11px] text-zinc-500">
                        Logged by {ticket.customer.name} on {new Date(ticket.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="shrink-0">
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 border rounded-lg text-xs font-semibold transition-all duration-300 ${
                          isLight 
                            ? "bg-white hover:bg-[#6D5DF6]/5 border-[#E2E8F0] hover:border-[#6D5DF6]/20 text-[#64748B] hover:text-[#6D5DF6]" 
                            : "bg-white/5 hover:bg-indigo-500/10 border-white/5 hover:border-indigo-500/20 text-[#A1A1AA] hover:text-indigo-400"
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* AVAILABLE TRIAGE QUEUE */}
        <div className={`border rounded-[18px] p-6 shadow-sm space-y-6 transition-all duration-200 ${
          isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
        }`}>
          <div className={`border-b pb-4 ${isLight ? "border-slate-100" : "border-white/5"}`}>
            <h3 className={`font-bold text-base flex items-center space-x-2 ${isLight ? "text-[#0F172A]" : "text-white"}`}>
              <Inbox className="w-5 h-5 text-purple-500" />
              <span>Available Tickets Pool</span>
            </h3>
            <p className="text-[13px] text-zinc-500 mt-1">Open unassigned tickets. Click accept to claim.</p>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : unassignedTickets.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#A1A1AA] flex flex-col items-center space-y-3">
              <CheckCircle className="w-8 h-8 text-zinc-400" />
              <p className={isLight ? "text-[#64748B]" : "text-[#A1A1AA]"}>Support Queue is clean. No unassigned cases pending.</p>
            </div>
          ) : (
            <div className={`divide-y max-h-[400px] overflow-y-auto pr-1 ${isLight ? "divide-slate-100" : "divide-white/5"}`}>
              {unassignedTickets.map((ticket) => {
                const priorityInfo = formatPriority(ticket.priority);
                return (
                  <div key={ticket.id} className="py-4 flex items-center justify-between gap-4 group">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[9px] font-semibold text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded uppercase tracking-wider">
                          {ticket.category}
                        </span>
                        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${priorityInfo.class}`}>
                          {priorityInfo.label}
                        </span>
                      </div>
                      <h4 className={`font-bold text-[14px] transition-colors duration-200 truncate ${
                        isLight ? "text-[#0F172A] group-hover:text-purple-600" : "text-white group-hover:text-purple-300"
                      }`}>
                        {ticket.subject}
                      </h4>
                      <p className="text-[11px] text-zinc-500">
                        Customer: {ticket.customer.name} ({new Date(ticket.createdAt).toLocaleDateString()})
                      </p>
                    </div>

                    <div className="shrink-0">
                      <button
                        onClick={() => handleClaimTicket(ticket.id)}
                        className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 border rounded-lg text-xs font-semibold transition-all duration-300 cursor-pointer ${
                          isLight 
                            ? "bg-[#6D5DF6]/5 border-[#6D5DF6]/20 text-[#6D5DF6] hover:bg-[#6D5DF6] hover:text-white"
                            : "bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/20 text-indigo-400"
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentDashboard;
