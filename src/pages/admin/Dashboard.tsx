import React, { useState, useEffect } from "react";
import { ticketAPI, agentAPI } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  Ticket,
  Users,
  ShieldAlert,
  Clock,
  RefreshCw,
  Award,
  XCircle,
} from "lucide-react";

interface TicketType {
  id: number;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
}

const AdminDashboard: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    total: 0,
    open: 0,
    escalated: 0,
    resolved: 0,
  });

  // Chart Datas
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [priorityData, setPriorityData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);

  // Assignment states
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleManualAssign = async (ticketId: number, agentId: number) => {
    setAssigning(true);
    setActionError(null);
    setActionMessage(null);
    try {
      await ticketAPI.assign(ticketId, agentId);
      setActionMessage("Ticket assigned successfully!");
      setShowAssignModal(false);
      setSelectedTicket(null);
      await fetchStats(); // Refresh dashboard data
    } catch (err: any) {
      setActionError(err.response?.data?.error || "Failed to assign ticket.");
    } finally {
      setAssigning(false);
    }
  };

  const handleAutoAssign = async (ticketId: number) => {
    setAssigning(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const res = await ticketAPI.autoAssign(ticketId);
      setActionMessage(res.message || "Ticket auto-assigned successfully!");
      await fetchStats(); // Refresh dashboard data
    } catch (err: any) {
      setActionError(err.response?.data?.error || "Failed to auto-assign ticket.");
    } finally {
      setAssigning(false);
    }
  };

  const getSLARemaining = (createdAt: string, priority: string) => {
    const created = new Date(createdAt).getTime();
    let slaHours = 24;
    if (priority === "URGENT") slaHours = 2;
    else if (priority === "HIGH") slaHours = 6;
    else if (priority === "MEDIUM") slaHours = 12;
    const slaTime = created + slaHours * 60 * 60 * 1000;
    const remaining = slaTime - Date.now();
    if (remaining <= 0) return { text: "SLA Breached", isBreached: true };
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return { text: `${hours}h ${minutes}m left`, isBreached: false };
  };

  const getAgentTicketStats = (agentId: number) => {
    const agentTickets = tickets.filter((t: any) => t.agentId === agentId);
    const open = agentTickets.filter((t: any) => t.status === "OPEN" || t.status === "ASSIGNED").length;
    const active = agentTickets.filter((t: any) => t.status === "IN_PROGRESS" || t.status === "PENDING_CUSTOMER").length;
    const totalActive = open + active;
    return { open, active, totalActive };
  };

  const unassignedTickets = tickets.filter((t: any) => t.agentId === null && t.status !== "CLOSED" && t.status !== "RESOLVED");

  const fetchStats = async () => {
    setLoading(true);
    try {
      const ticketData = await ticketAPI.list();
      const agentData = await agentAPI.list();

      setTickets(ticketData);
      setAgents(agentData);

      // Compute general metrics
      const total = ticketData.length;
      const open = ticketData.filter((t: any) => t.status === "OPEN" || t.status === "IN_PROGRESS").length;
      const escalated = ticketData.filter((t: any) => t.priority === "URGENT" && t.status !== "CLOSED" && t.status !== "RESOLVED").length;
      const resolved = ticketData.filter((t: any) => t.status === "RESOLVED" || t.status === "CLOSED").length;

      setMetrics({ total, open, escalated, resolved });

      // Compute category distribution
      const categories: { [key: string]: number } = {};
      ticketData.forEach((t: any) => {
        categories[t.category] = (categories[t.category] || 0) + 1;
      });
      const catChart = Object.keys(categories).map((key) => ({
        name: key,
        value: categories[key],
      }));
      setCategoryData(catChart);

      // Compute priority distribution
      const priorities: { [key: string]: number } = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
      ticketData.forEach((t: any) => {
        priorities[t.priority] = (priorities[t.priority] || 0) + 1;
      });
      const priChart = Object.keys(priorities).map((key) => ({
        name: key,
        value: priorities[key],
      }));
      setPriorityData(priChart);

      // Compute trend data (last 7 days intake)
      const dayCounts: { [key: string]: { intake: number; resolved: number } } = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayKey = d.toLocaleDateString([], { month: "short", day: "numeric" });
        dayCounts[dayKey] = { intake: 0, resolved: 0 };
      }

      ticketData.forEach((t: any) => {
        const dayKey = new Date(t.createdAt).toLocaleDateString([], { month: "short", day: "numeric" });
        if (dayCounts[dayKey]) {
          dayCounts[dayKey].intake += 1;
          if (t.status === "RESOLVED" || t.status === "CLOSED") {
            dayCounts[dayKey].resolved += 1;
          }
        }
      });

      const trendChart = Object.keys(dayCounts).map((key) => ({
        day: key,
        Intake: dayCounts[key].intake,
        Resolved: dayCounts[key].resolved,
      }));
      setTrendData(trendChart);
    } catch (err) {
      console.error("Failed to load admin stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const COLORS = ["#6D5DF6", "#A855F7", "#F59E0B", "#10B981", "#EF4444", "#EC4899"];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* COCKPIT HEADER */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 ${
        isLight ? "border-slate-100" : "border-white/5"
      }`}>
        <div className="space-y-1.5 text-left">
          <div className="flex items-center space-x-2 text-[#6D5DF6] font-semibold text-xs tracking-wider uppercase">
            <Award className="w-4 h-4" />
            <span>Command Center</span>
          </div>
          <h2 className={`text-3xl font-extrabold tracking-tight ${
            isLight ? "text-[#0F172A]" : "text-white"
          }`}>Administrative Intelligence</h2>
          <p className={`text-xs max-w-2xl leading-relaxed ${
            isLight ? "text-slate-500" : "text-[#A1A1AA]"
          }`}>
            Real-time analytics, critical SLAs, availability tracking, and incident command overview.
          </p>
        </div>

        <button
          onClick={fetchStats}
          className={`self-start md:self-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center space-x-2 cursor-pointer shadow-sm ${
            isLight 
              ? "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50" 
              : "bg-white/5 hover:bg-white/10 border border-white/5 text-white"
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-2 border-[#6D5DF6]/30 border-t-[#6D5DF6] rounded-full animate-spin" />
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Compiling dashboard analytics...</span>
        </div>
      ) : (
        <>
          {/* SYSTEM BENTO STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className={`border rounded-[18px] p-6 flex items-center justify-between shadow-sm hover:-translate-y-1 transition-all duration-300 group ${
              isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
            }`}>
              <div className="space-y-1 text-left">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                  Total Cases Logged
                </span>
                <h3 className={`text-3xl font-extrabold transition-colors ${
                  isLight ? "text-[#0F172A] group-hover:text-[#6D5DF6]" : "text-white group-hover:text-indigo-400"
                }`}>{metrics.total}</h3>
                <span className="text-[10px] text-[#10B981] font-semibold block">All-time registry</span>
              </div>
              <div className="w-12 h-12 bg-[#6D5DF6]/10 border border-[#6D5DF6]/20 rounded-2xl flex items-center justify-center transition-colors group-hover:bg-[#6D5DF6]/20">
                <Ticket className="w-5 h-5 text-[#6D5DF6]" />
              </div>
            </div>

            <div className={`border rounded-[18px] p-6 flex items-center justify-between shadow-sm hover:-translate-y-1 transition-all duration-300 group ${
              isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
            }`}>
              <div className="space-y-1 text-left">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                  Active Workloads
                </span>
                <h3 className={`text-3xl font-extrabold transition-colors ${
                  isLight ? "text-[#0F172A] group-hover:text-amber-500" : "text-white group-hover:text-amber-400"
                }`}>{metrics.open}</h3>
                <span className="text-[10px] text-amber-500 font-semibold block">SLA timer counting</span>
              </div>
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center transition-colors group-hover:bg-amber-500/20">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
            </div>

            <div className={`border rounded-[18px] p-6 flex items-center justify-between shadow-sm hover:-translate-y-1 transition-all duration-300 group ${
              isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
            }`}>
              <div className="space-y-1 text-left">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                  Escalated Priority
                </span>
                <h3 className="text-3xl font-extrabold text-red-500 animate-pulse">{metrics.escalated}</h3>
                <span className="text-[10px] text-red-500 font-semibold block">Attention required</span>
              </div>
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center transition-colors group-hover:bg-red-500/20">
                <ShieldAlert className="w-5 h-5 text-red-500" />
              </div>
            </div>

            <div className={`border rounded-[18px] p-6 flex items-center justify-between shadow-sm hover:-translate-y-1 transition-all duration-300 group ${
              isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
            }`}>
              <div className="space-y-1 text-left">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                  Active Roster Online
                </span>
                <h3 className="text-3xl font-extrabold text-[#10B981]">
                  {agents.filter((a: any) => a.isAvailable).length}
                </h3>
                <span className="text-[10px] text-[#10B981] font-semibold block">Engineers ready</span>
              </div>
              <div className="w-12 h-12 bg-[#10B981]/10 border border-[#10B981]/20 rounded-2xl flex items-center justify-center transition-colors group-hover:bg-[#10B981]/20">
                <Users className="w-5 h-5 text-[#10B981]" />
              </div>
            </div>
          </div>

          {/* RECHARTS ECOSYSTEM */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* TICKET INTAKE TREND (7 days) */}
            <div className={`border rounded-[18px] p-6 shadow-sm space-y-4 ${
              isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
            }`}>
              <div className={`border-b pb-3 ${isLight ? "border-slate-100" : "border-white/5"}`}>
                <h4 className={`font-bold text-sm ${isLight ? "text-[#0F172A]" : "text-white"}`}>Support Volume Trend</h4>
                <p className="text-[10px] text-zinc-500">Case intake and solution completions over trailing 7 days.</p>
              </div>

              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)"} />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isLight ? "#ffffff" : "#18181b",
                        borderColor: isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)",
                        borderRadius: "12px",
                        fontSize: "11px",
                        color: isLight ? "#0f172a" : "#ffffff",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "10px" }} />
                    <Line type="monotone" dataKey="Intake" stroke="#6D5DF6" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="Resolved" stroke="#10B981" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PIE: CATEGORIES */}
            <div className={`border rounded-[18px] p-6 shadow-sm space-y-4 flex flex-col justify-between ${
              isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
            }`}>
              <div>
                <div className={`border-b pb-3 ${isLight ? "border-slate-100" : "border-white/5"}`}>
                  <h4 className={`font-bold text-sm ${isLight ? "text-[#0F172A]" : "text-white"}`}>Category Distribution</h4>
                  <p className="text-[10px] text-zinc-500">Relative allocation percentages across active categories.</p>
                </div>

                <div className="h-48 mt-4">
                  {categoryData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-zinc-500">No category statistics.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isLight ? "#ffffff" : "#18181b",
                            borderColor: isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)",
                            borderRadius: "12px",
                            fontSize: "11px",
                            color: isLight ? "#0f172a" : "#ffffff",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {categoryData.length > 0 && (
                <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400 mt-2">
                  {categoryData.slice(0, 6).map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-1.5 truncate">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className={`truncate font-medium ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                        {item.name} ({item.value})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BAR: PRIORITY */}
            <div className={`border rounded-[18px] p-6 shadow-sm space-y-4 ${
              isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
            }`}>
              <div className={`border-b pb-3 ${isLight ? "border-slate-100" : "border-white/5"}`}>
                <h4 className={`font-bold text-sm ${isLight ? "text-[#0F172A]" : "text-white"}`}>Tickets by Priority</h4>
                <p className="text-[10px] text-zinc-500">Distribution mapping over urgent, high, medium, and low levels.</p>
              </div>

              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)"} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isLight ? "#ffffff" : "#18181b",
                        borderColor: isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)",
                        borderRadius: "12px",
                        fontSize: "11px",
                        color: isLight ? "#0f172a" : "#ffffff",
                      }}
                    />
                    <Bar dataKey="value" fill="#A855F7" radius={[6, 6, 0, 0]}>
                      {priorityData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.name === "URGENT"
                              ? "#EF4444"
                              : entry.name === "HIGH"
                              ? "#F59E0B"
                              : entry.name === "MEDIUM"
                              ? "#6D5DF6"
                              : "#10B981"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* UNASSIGNED DISPATCH QUEUE */}
            <div className={`border rounded-[18px] p-6 shadow-sm space-y-4 ${
              isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
            }`}>
              <div className={`border-b pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                isLight ? "border-slate-100" : "border-white/5"
              }`}>
                <div>
                  <h4 className={`font-bold text-sm ${isLight ? "text-[#0F172A]" : "text-white"}`}>Unassigned Dispatch Queue</h4>
                  <p className="text-[10px] text-zinc-500">Tickets awaiting manual agent assignment or load balanced auto-dispatch.</p>
                </div>
                {actionMessage && (
                  <div className="text-[11px] text-[#10B981] font-semibold bg-[#10B981]/10 px-3 py-1 rounded-lg">
                    {actionMessage}
                  </div>
                )}
                {actionError && (
                  <div className="text-[11px] text-red-500 font-semibold bg-red-500/10 px-3 py-1 rounded-lg">
                    {actionError}
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                      isLight ? "text-slate-400 border-slate-100" : "text-zinc-500 border-white/5"
                    }`}>
                      <th className="pb-3 pt-1">ID</th>
                      <th className="pb-3 pt-1">Subject / Customer</th>
                      <th className="pb-3 pt-1">Category</th>
                      <th className="pb-3 pt-1">Priority</th>
                      <th className="pb-3 pt-1">SLA Countdown</th>
                      <th className="pb-3 pt-1 text-right">Dispatch Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-xs font-medium ${
                    isLight ? "divide-slate-100 text-slate-700" : "divide-white/5 text-zinc-300"
                  }`}>
                    {unassignedTickets.map((ticket: any) => {
                      const sla = getSLARemaining(ticket.createdAt, ticket.priority);
                      return (
                        <tr key={ticket.id} className="hover:bg-slate-50/30 dark:hover:bg-white/[0.01] transition-colors">
                          <td className={`py-4 font-semibold ${isLight ? "text-[#0F172A]" : "text-white"}`}>
                            #{ticket.id}
                          </td>
                          <td className="py-4">
                            <div className="font-semibold text-sm max-w-xs truncate text-[#6D5DF6]">
                              {ticket.subject}
                            </div>
                            <div className={`text-[10px] mt-0.5 ${isLight ? "text-slate-500" : "text-zinc-400"}`}>
                              by {ticket.customer?.name} ({ticket.customer?.email})
                            </div>
                          </td>
                          <td className="py-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isLight ? "bg-slate-100 text-slate-600" : "bg-white/5 text-zinc-300"
                            }`}>
                              {ticket.category}
                            </span>
                          </td>
                          <td className="py-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              ticket.priority === "URGENT"
                                ? "bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse"
                                : ticket.priority === "HIGH"
                                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                : ticket.priority === "MEDIUM"
                                ? "bg-[#6D5DF6]/10 text-[#6D5DF6] border border-[#6D5DF6]/20"
                                : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            }`}>
                              {ticket.priority}
                            </span>
                          </td>
                          <td className="py-4 font-mono font-bold">
                            <span className={sla.isBreached ? "text-red-500" : isLight ? "text-slate-700" : "text-zinc-300"}>
                              {sla.text}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedTicket(ticket);
                                  setShowAssignModal(true);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-300 cursor-pointer ${
                                  isLight
                                    ? "bg-[#6D5DF6] hover:bg-[#5C4EE4] text-white shadow-sm"
                                    : "bg-indigo-600 hover:bg-indigo-500 text-white"
                                }`}
                              >
                                Assign
                              </button>
                              <button
                                disabled={assigning}
                                onClick={() => handleAutoAssign(ticket.id)}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-300 cursor-pointer ${
                                  isLight
                                    ? "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
                                    : "bg-white/5 hover:bg-white/10 border border-white/5 text-white"
                                }`}
                              >
                                Auto
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {unassignedTickets.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-zinc-500">
                          No unassigned tickets in queue. Support workloads are fully optimized!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* QUICK ACTIONS TABLE & AGENT WORKLOAD STATUS */}
            <div className={`border rounded-[18px] p-6 shadow-sm space-y-4 ${
              isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
            }`}>
              <div className={`border-b pb-3 ${isLight ? "border-slate-100" : "border-white/5"}`}>
                <h4 className={`font-bold text-sm ${isLight ? "text-[#0F172A]" : "text-white"}`}>Support Agent Workload Registry</h4>
                <p className="text-[10px] text-zinc-500">Live operational overview of engineers, allocations, and connectivity.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                      isLight ? "text-slate-400 border-slate-100" : "text-zinc-500 border-white/5"
                    }`}>
                      <th className="pb-3 pt-1">Agent Name</th>
                      <th className="pb-3 pt-1">Email Identifier</th>
                      <th className="pb-3 pt-1 text-center">Open Assignments</th>
                      <th className="pb-3 pt-1 text-right">Connectivity Status</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-xs font-medium ${
                    isLight ? "divide-slate-100 text-slate-700" : "divide-white/5 text-zinc-300"
                  }`}>
                    {agents.slice(0, 10).map((agent: any) => (
                      <tr key={agent.id}>
                        <td className={`py-3 font-semibold ${isLight ? "text-[#0F172A]" : "text-white"}`}>{agent.name}</td>
                        <td className={`py-3 ${isLight ? "text-slate-500" : "text-zinc-400"}`}>{agent.email}</td>
                        <td className="py-3 text-center font-extrabold text-[#6D5DF6]">{agent._count?.agentTickets || 0}</td>
                        <td className="py-3 text-right">
                          <span
                            className={`inline-block w-2 h-2 rounded-full mr-2 ${
                              agent.isAvailable ? "bg-[#10B981]" : "bg-zinc-400"
                            }`}
                          />
                          <span className={`font-medium ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                            {agent.isAvailable ? "Available" : "Offline"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {agents.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-zinc-500">No registered engineers on roster.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MANUAL ASSIGN MODAL */}
      {showAssignModal && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl border transition-all duration-300 ${
            isLight ? "bg-white border-slate-100" : "bg-[#0F172A] border-white/10 text-white"
          }`}>
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <h3 className="font-extrabold text-base">Assign Ticket #{selectedTicket.id}</h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedTicket(null);
                  setActionError(null);
                }}
                className={`p-1.5 rounded-lg transition-colors ${
                  isLight ? "hover:bg-slate-100 text-slate-500" : "hover:bg-white/10 text-zinc-400"
                }`}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Ticket Subject</span>
              <p className="font-semibold text-sm text-[#6D5DF6] truncate">{selectedTicket.subject}</p>
            </div>

            {actionError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl font-medium">
                {actionError}
              </div>
            )}

            <div className="space-y-3">
              <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Select Available Agent</span>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {agents.filter((a: any) => a.role === "AGENT" && a.isAvailable).map((agent: any) => {
                  const stats = getAgentTicketStats(agent.id);
                  return (
                    <div
                      key={agent.id}
                      onClick={() => handleManualAssign(selectedTicket.id, agent.id)}
                      className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all duration-300 hover:scale-[1.01] ${
                        isLight
                          ? "border-slate-100 hover:border-[#6D5DF6] bg-slate-50/50 hover:bg-slate-50"
                          : "border-white/5 hover:border-indigo-500/30 bg-white/[0.02] hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-xs">{agent.name}</h4>
                        <p className={`text-[10px] ${isLight ? "text-slate-500" : "text-zinc-400"}`}>{agent.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                          <span className="text-[9px] text-[#10B981] font-semibold">Online / Available</span>
                        </div>
                      </div>

                      <div className="text-right space-y-0.5 shrink-0">
                        <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Active Workload</div>
                        <div className="font-mono text-sm font-extrabold text-[#6D5DF6]">
                          {stats.totalActive} <span className="text-[10px] text-zinc-400 font-normal">active</span>
                        </div>
                        <div className="text-[9px] text-zinc-500">
                          {stats.open} open • {stats.active} in-progress
                        </div>
                      </div>
                    </div>
                  );
                })}

                {agents.filter((a: any) => a.role === "AGENT" && a.isAvailable).length === 0 && (
                  <p className="text-xs text-zinc-500 text-center py-6">
                    No available online agents are currently ready to receive assignments.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedTicket(null);
                  setActionError(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  isLight ? "hover:bg-slate-100 text-slate-700" : "hover:bg-white/10 text-white"
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

