import React, { useState, useEffect } from "react";
import { agentAPI } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { useLocation } from "react-router-dom";
import { Search, UserCog, Calendar, Activity, RefreshCw } from "lucide-react";

interface Agent {
  id: number;
  name: string;
  email: string;
  isAvailable: boolean;
  createdAt: string;
  _count: {
    agentTickets: number;
  };
}

const ManageAgents: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const location = useLocation();

  useEffect(() => {
    if (location.state?.searchAgent) {
      setSearch(location.state.searchAgent);
    }
  }, [location.state?.searchAgent]);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const data = await agentAPI.list();
      setAgents(data);
    } catch (err) {
      console.error("Failed to load agent registry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleToggleAvailability = async (id: number, currentStatus: boolean) => {
    try {
      await agentAPI.updateAvailability(id, !currentStatus);
      // Optimistic state update
      setAgents((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isAvailable: !currentStatus } : a))
      );
    } catch (err) {
      console.error("Failed to toggle agent availability:", err);
    }
  };

  const filteredAgents = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 ${
        isLight ? "border-slate-100" : "border-white/5"
      }`}>
        <div className="space-y-1.5 text-left">
          <div className="flex items-center space-x-2 text-[#6D5DF6] font-semibold text-xs tracking-wider uppercase">
            <UserCog className="w-4 h-4" />
            <span>HQ Team Registry</span>
          </div>
          <h2 className={`text-3xl font-extrabold tracking-tight ${
            isLight ? "text-[#0F172A]" : "text-white"
          }`}>Manage Support Staff</h2>
          <p className={`text-xs max-w-2xl leading-relaxed ${
            isLight ? "text-slate-500" : "text-[#A1A1AA]"
          }`}>
            Oversee help desk performance, toggle assignment-routing queues, inspect ticket densities, and monitor staff status indexes.
          </p>
        </div>

        <button
          onClick={fetchAgents}
          className={`self-start md:self-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center space-x-2 cursor-pointer shadow-sm ${
            isLight 
              ? "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50" 
              : "bg-white/5 hover:bg-white/10 border border-white/5 text-white"
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reload Registry</span>
        </button>
      </div>

      {/* FILTER SEARCH BAR */}
      <div className={`border rounded-[18px] p-4 shadow-sm flex items-center ${
        isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
      }`}>
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search agents by name or help-desk email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full h-12 px-4 pr-4 rounded-xl text-xs outline-none transition-all duration-300 border ${
              isLight
                ? "bg-[#F8FAFC] border-slate-200 text-[#0F172A] focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12 placeholder-[#94A3B8]"
                : "bg-white/5 border border-white/5 text-white focus:border-[#6366F1]/30 focus:ring-4 focus:ring-[#6366F1]/12 placeholder-zinc-500"
            }`}
          />
        </div>
      </div>

      {/* AGENTS LIST */}
      <div className={`border rounded-[18px] shadow-sm overflow-hidden ${
        isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
      }`}>
        {loading ? (
          <div className="py-24 flex justify-center">
            <div className="w-8 h-8 border-2 border-[#6D5DF6]/30 border-t-[#6D5DF6] rounded-full animate-spin" />
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
            <UserCog className={`w-12 h-12 ${isLight ? "text-slate-300" : "text-zinc-600"}`} />
            <h4 className={`font-bold text-sm ${isLight ? "text-[#0F172A]" : "text-white"}`}>No agents found</h4>
            <p className={`text-xs max-w-xs leading-relaxed ${isLight ? "text-slate-500" : "text-[#A1A1AA]"}`}>
              No support agents matched your query terms. Ensure agents are registered with the AGENT role.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                  isLight ? "text-slate-400 border-slate-100 bg-slate-50/50" : "text-zinc-500 border-white/5 bg-white/[0.01]"
                }`}>
                  <th className="py-4 px-6">Support Engineer</th>
                  <th className="py-4 px-4">Workload Metrics</th>
                  <th className="py-4 px-4">Status Index</th>
                  <th className="py-4 px-4">Joined Date</th>
                  <th className="py-4 px-6 text-right">Routing Controls</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs ${
                isLight ? "divide-slate-100 text-slate-700" : "divide-white/5 text-zinc-300"
              }`}>
                {filteredAgents.map((agent) => (
                  <tr key={agent.id} className={`transition-colors duration-150 ${
                    isLight ? "hover:bg-slate-50/50" : "hover:bg-white/[0.01]"
                  }`}>
                    <td className="py-5 px-6">
                      <div className="flex items-center space-x-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold font-mono text-xs ${
                          isLight ? "bg-indigo-50 text-[#6D5DF6]" : "bg-purple-500/10 border border-purple-500/20 text-purple-400"
                        }`}>
                          {agent.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className={`font-bold text-sm ${isLight ? "text-[#0F172A]" : "text-white"}`}>{agent.name}</h4>
                          <span className={`font-mono text-[10px] ${isLight ? "text-slate-400" : "text-zinc-500"}`}>{agent.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-5 px-4 font-mono">
                      <div className={`flex items-center space-x-1.5 font-semibold text-xs px-2.5 py-1 rounded-lg border inline-flex ${
                        isLight 
                          ? "text-[#6D5DF6] bg-[#6D5DF6]/5 border-[#6D5DF6]/10"
                          : "text-indigo-400 bg-indigo-500/5 border border-indigo-500/10"
                      }`}>
                        <Activity className="w-3.5 h-3.5" />
                        <span>{agent._count?.agentTickets || 0} active cases</span>
                      </div>
                    </td>

                    <td className="py-5 px-4">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            agent.isAvailable ? "bg-[#10B981]" : "bg-zinc-400"
                          }`}
                        />
                        <span className={`font-medium ${isLight ? "text-slate-600" : "text-zinc-300"}`}>
                          {agent.isAvailable ? "Available (Routing ON)" : "Offline (Routing OFF)"}
                        </span>
                      </div>
                    </td>

                    <td className="py-5 px-4">
                      <div className="flex items-center space-x-1.5 font-medium text-zinc-400">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{new Date(agent.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>

                    <td className="py-5 px-6 text-right">
                      <button
                        onClick={() => handleToggleAvailability(agent.id, agent.isAvailable)}
                        className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold tracking-wide uppercase transition-all duration-300 cursor-pointer ${
                          agent.isAvailable
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-600 hover:bg-amber-500/25"
                            : "bg-green-500/10 border-green-500/20 text-green-600 hover:bg-green-500/25"
                        }`}
                      >
                        {agent.isAvailable ? "Set Offline" : "Set Online"}
                      </button>
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

export default ManageAgents;
