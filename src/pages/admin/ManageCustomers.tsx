import React, { useState, useEffect } from "react";
import { userAPI, ticketAPI } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { useLocation } from "react-router-dom";
import { 
  Search, User, Mail, Calendar, Ticket, X, Clock, 
  ArrowLeft, Paperclip, ChevronRight, Activity, ShieldAlert 
} from "lucide-react";

interface Customer {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

const ManageCustomers: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const location = useLocation();

  useEffect(() => {
    if (location.state?.openCustomerId && customers.length > 0) {
      handleSelectCustomer(location.state.openCustomerId);
    }
  }, [location.state?.openCustomerId, customers]);

  // Customer Detail Modal States
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerDetails, setCustomerDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Ticket Detail Modal States (nested view)
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [ticketDetails, setTicketDetails] = useState<any | null>(null);
  const [loadingTicket, setLoadingTicket] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await userAPI.listAll({ role: "CUSTOMER", search: search || undefined });
      setCustomers(data);
    } catch (err) {
      console.error("Failed to load customer registry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSelectCustomer = async (id: number) => {
    setSelectedCustomerId(id);
    setCustomerDetails(null);
    setLoadingDetails(true);
    try {
      const data = await userAPI.getCustomerDetails(id);
      setCustomerDetails(data);
    } catch (err) {
      console.error("Failed to load customer details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSelectTicket = async (id: number) => {
    setSelectedTicketId(id);
    setTicketDetails(null);
    setLoadingTicket(true);
    try {
      const data = await ticketAPI.getDetails(id);
      setTicketDetails(data);
    } catch (err) {
      console.error("Failed to load ticket details:", err);
    } finally {
      setLoadingTicket(false);
    }
  };

  // Label Mappers
  const formatPriority = (priority: string) => {
    if (!priority) return "Low";
    const mapping: Record<string, string> = {
      LOW: "Low",
      MEDIUM: "Medium",
      HIGH: "High",
      URGENT: "Urgent"
    };
    return mapping[priority.toUpperCase()] || priority;
  };

  const getPriorityBadgeClass = (priority: string) => {
    if (!priority) return isLight ? "bg-slate-100 text-slate-500 border border-slate-200" : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/15";
    switch (priority.toUpperCase()) {
      case "URGENT": return isLight ? "bg-red-50 text-red-600 border border-red-200" : "bg-red-500/10 text-red-400 border border-red-500/15";
      case "HIGH": return isLight ? "bg-amber-50 text-amber-600 border border-amber-200" : "bg-amber-500/10 text-amber-400 border border-amber-500/15";
      case "MEDIUM": return isLight ? "bg-indigo-50 text-indigo-600 border border-indigo-200" : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/15";
      default: return isLight ? "bg-slate-100 text-slate-500 border border-slate-200" : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/15";
    }
  };

  const formatStatus = (status: string) => {
    if (!status) return "Open";
    const mapping: Record<string, string> = {
      OPEN: "Open",
      IN_PROGRESS: "In Progress",
      RESOLVED: "Resolved",
      CLOSED: "Closed"
    };
    return mapping[status.toUpperCase()] || status;
  };

  const getStatusBadgeClass = (status: string) => {
    if (!status) return isLight ? "bg-slate-100 text-slate-500 border border-slate-200" : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/15";
    switch (status.toUpperCase()) {
      case "CLOSED": return isLight ? "bg-slate-100 text-slate-500 border border-slate-200" : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/15";
      case "RESOLVED": return isLight ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15";
      case "IN_PROGRESS": return isLight ? "bg-indigo-50 text-indigo-600 border border-indigo-200" : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/15";
      default: return isLight ? "bg-amber-50 text-amber-600 border border-amber-200" : "bg-amber-500/10 text-amber-400 border border-amber-500/15";
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER */}
      <div className={`border-b pb-6 ${isLight ? "border-slate-100" : "border-white/5"}`}>
        <div className="space-y-1.5 text-left">
          <div className="flex items-center space-x-2 text-[#6D5DF6] font-semibold text-xs tracking-wider uppercase">
            <User className="w-4 h-4" />
            <span>HQ Customer Accounts</span>
          </div>
          <h2 className={`text-3xl font-extrabold tracking-tight ${
            isLight ? "text-[#0F172A]" : "text-white"
          }`}>Manage System Customers</h2>
          <p className={`text-xs max-w-2xl leading-relaxed ${
            isLight ? "text-slate-500" : "text-[#A1A1AA]"
          }`}>
            Search profiles, investigate logged issues, view email mappings, and analyze account activity across our support portal.
          </p>
        </div>
      </div>

      {/* FILTER SEARCH BAR */}
      <div className={`border rounded-[18px] p-4 shadow-sm flex items-center ${
        isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
      }`}>
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search customer records by name or email address..."
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

      {/* CUSTOMERS TABLE */}
      <div className={`border rounded-[18px] shadow-sm overflow-hidden ${
        isLight ? "bg-white border-[#E2E8F0]" : "bg-[#121A2B] border-white/5"
      }`}>
        {loading ? (
          <div className="py-24 flex justify-center">
            <div className="w-8 h-8 border-2 border-[#6D5DF6]/30 border-t-[#6D5DF6] rounded-full animate-spin" />
          </div>
        ) : customers.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
            <User className={`w-12 h-12 ${isLight ? "text-slate-300" : "text-zinc-600"}`} />
            <h4 className={`font-bold text-sm ${isLight ? "text-[#0F172A]" : "text-white"}`}>No customers found</h4>
            <p className={`text-xs max-w-xs leading-relaxed ${isLight ? "text-slate-500" : "text-[#A1A1AA]"}`}>
              We couldn't find any registered customers matching your search query. Try expanding your search filter terms.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                  isLight ? "text-slate-400 border-slate-100 bg-slate-50/50" : "text-zinc-500 border-white/5 bg-white/[0.01]"
                }`}>
                  <th className="py-4 px-6">Customer Details</th>
                  <th className="py-4 px-4">Contact Email</th>
                  <th className="py-4 px-4">Role Designation</th>
                  <th className="py-4 px-4">Joined Date</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs ${
                isLight ? "divide-slate-100 text-slate-700" : "divide-white/5 text-zinc-300"
              }`}>
                {customers.map((cust) => (
                  <tr 
                    key={cust.id} 
                    onClick={() => handleSelectCustomer(cust.id)}
                    className={`cursor-pointer transition-colors duration-150 ${
                      isLight ? "hover:bg-slate-50/50" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <td className="py-5 px-6">
                      <div className="flex items-center space-x-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold font-mono text-xs ${
                          isLight ? "bg-indigo-50 text-[#6D5DF6]" : "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
                        }`}>
                          {cust.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className={`font-bold text-sm ${isLight ? "text-[#0F172A]" : "text-white"}`}>{cust.name}</h4>
                          <span className={`font-mono text-[10px] ${isLight ? "text-slate-400" : "text-zinc-500"}`}>USER_ID: #{cust.id}</span>
                        </div>
                      </div>
                    </td>

                    <td className={`py-5 px-4 font-mono ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                      <div className="flex items-center space-x-1.5">
                        <Mail className={`w-3.5 h-3.5 ${isLight ? "text-slate-400" : "text-zinc-600"}`} />
                        <span>{cust.email}</span>
                      </div>
                    </td>

                    <td className="py-5 px-4">
                      <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                        isLight 
                          ? "bg-indigo-50 text-[#6D5DF6] border-indigo-200" 
                          : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/15"
                      }`}>
                        CUSTOMER
                      </span>
                    </td>

                    <td className={`py-5 px-4 ${isLight ? "text-slate-500" : "text-zinc-500"}`}>
                      <div className="flex items-center space-x-1.5 font-medium">
                        <Calendar className={`w-3.5 h-3.5 ${isLight ? "text-slate-400" : "text-zinc-600"}`} />
                        <span>{new Date(cust.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CUSTOMER DETAILS MODAL/DRAWER */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className={`w-full max-w-3xl h-full border-l flex flex-col shadow-2xl relative transition-all duration-300 ${
            isLight ? "bg-white border-slate-200" : "bg-[#09090B] border-white/5"
          }`}>
            
            {/* MODAL HEADER */}
            <div className={`p-6 border-b flex items-center justify-between ${
              isLight ? "border-slate-100" : "border-white/5"
            }`}>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setSelectedCustomerId(null)}
                  className={`p-2 rounded-lg transition-colors ${
                    isLight ? "hover:bg-slate-100 text-slate-500 hover:text-slate-900" : "hover:bg-white/5 text-zinc-400 hover:text-white"
                  }`}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="text-left">
                  <h3 className={`text-base font-extrabold ${isLight ? "text-[#0F172A]" : "text-white"}`}>Customer Record</h3>
                  <span className="text-xs text-zinc-500">Detailed overview and interaction history</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCustomerId(null)}
                className={`p-2 rounded-lg transition-colors ${
                  isLight ? "hover:bg-slate-100 text-slate-500 hover:text-slate-900" : "hover:bg-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* MODAL CONTENT */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingDetails ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[#6D5DF6]/30 border-t-[#6D5DF6] rounded-full animate-spin" />
                </div>
              ) : !customerDetails ? (
                <div className="text-center py-12 text-zinc-500">Failed to load details.</div>
              ) : (
                <>
                  {/* PROFILE CARD */}
                  <div className={`border rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-start md:items-center ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-[#18181B]/30 border border-white/5"
                  }`}>
                    <div className="flex items-center space-x-4">
                      {customerDetails.profile.profilePicture ? (
                        <img 
                          src={customerDetails.profile.profilePicture} 
                          alt={customerDetails.profile.name}
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 rounded-full object-cover border border-white/10"
                        />
                      ) : (
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center font-extrabold text-xl ${
                          isLight ? "bg-indigo-50 text-[#6D5DF6] border border-indigo-100" : "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
                        }`}>
                          {customerDetails.profile.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="space-y-1 text-left">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-lg font-bold ${isLight ? "text-[#0F172A]" : "text-white"}`}>{customerDetails.profile.name}</h4>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                            isLight ? "bg-white border-slate-200 text-slate-600" : "bg-white/5 text-zinc-400 border border-white/5"
                          }`}>
                            ID: #{customerDetails.profile.id}
                          </span>
                        </div>
                        <p className={`text-xs flex items-center gap-1.5 ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                          <Mail className="w-3.5 h-3.5 text-zinc-400" /> {customerDetails.profile.email}
                        </p>
                        {customerDetails.profile.username && (
                          <p className={`text-xs font-mono ${isLight ? "text-slate-500" : "text-zinc-400"}`}>
                            @{customerDetails.profile.username}
                          </p>
                        )}
                        <p className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400" /> Joined {new Date(customerDetails.profile.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-3 gap-3 w-full md:w-auto">
                      <div className={`border rounded-xl p-3 text-center ${
                        isLight ? "bg-white border-slate-200" : "bg-white/[0.02] border border-white/5"
                      }`}>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase block">Total</span>
                        <span className={`text-lg font-extrabold font-mono ${isLight ? "text-[#0F172A]" : "text-white"}`}>{customerDetails.stats.totalTickets}</span>
                      </div>
                      <div className={`border rounded-xl p-3 text-center ${
                        isLight ? "bg-amber-500/5 border-amber-500/10" : "bg-amber-500/5 border border-amber-500/10"
                      }`}>
                        <span className="text-[10px] font-bold text-amber-500 uppercase block">Open</span>
                        <span className="text-lg font-extrabold text-amber-500 font-mono">{customerDetails.stats.openTickets}</span>
                      </div>
                      <div className={`border rounded-xl p-3 text-center ${
                        isLight ? "bg-emerald-500/5 border-emerald-500/10" : "bg-emerald-500/5 border border-emerald-500/10"
                      }`}>
                        <span className="text-[10px] font-bold text-emerald-500 uppercase block">Closed</span>
                        <span className="text-lg font-extrabold text-emerald-500 font-mono">{customerDetails.stats.closedTickets}</span>
                      </div>
                    </div>
                  </div>

                  {/* ADDITIONAL DETAILS IF AVAILABLE */}
                  {(customerDetails.profile.phone || customerDetails.profile.bio) && (
                    <div className={`border rounded-xl p-4 space-y-3 text-left ${
                      isLight ? "bg-slate-50 border-slate-200" : "bg-[#18181B]/20 border border-white/5"
                    }`}>
                      {customerDetails.profile.phone && (
                        <div className="text-xs">
                          <span className="text-zinc-500 font-semibold mr-2">Phone:</span>
                          <span className={`font-mono ${isLight ? "text-slate-700" : "text-zinc-300"}`}>{customerDetails.profile.phone}</span>
                        </div>
                      )}
                      {customerDetails.profile.bio && (
                        <div className="text-xs">
                          <span className="text-zinc-500 font-semibold block mb-1">Biography/Notes:</span>
                          <p className={`leading-relaxed italic ${isLight ? "text-slate-600" : "text-zinc-300"}`}>"{customerDetails.profile.bio}"</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TICKETS TABLE HEADER */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-sm font-bold flex items-center gap-1.5 ${isLight ? "text-[#0F172A]" : "text-white"}`}>
                        <Ticket className="w-4 h-4 text-[#6D5DF6]" /> Support Ticket Log
                      </h4>
                      <span className="text-xs font-mono text-zinc-500">{customerDetails.tickets.length} tickets recorded</span>
                    </div>

                    {/* TICKETS LIST */}
                    <div className="space-y-2.5">
                      {customerDetails.tickets.length === 0 ? (
                        <div className={`border rounded-xl p-8 text-center text-xs text-zinc-500 ${
                          isLight ? "bg-slate-50 border-slate-200" : "bg-[#18181B]/10 border border-white/5"
                        }`}>
                          No tickets created by this customer yet.
                        </div>
                      ) : (
                        customerDetails.tickets.map((t: any) => (
                          <div 
                            key={t.id} 
                            onClick={() => handleSelectTicket(t.id)}
                            className={`border rounded-xl p-4 cursor-pointer transition-all duration-150 flex items-center justify-between gap-4 ${
                              isLight 
                                ? "bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300" 
                                : "bg-white/[0.01] hover:bg-white/[0.03] border border-white/5"
                            }`}
                          >
                            <div className="space-y-1.5 flex-1 min-w-0 text-left">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-zinc-500">#{t.id}</span>
                                <h5 className={`text-sm font-bold truncate ${isLight ? "text-[#0F172A]" : "text-white"}`}>{t.subject}</h5>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-2 text-[10px]">
                                <span className={`px-2 py-0.5 rounded-full border ${
                                  isLight ? "bg-slate-100 border-slate-200 text-slate-600" : "bg-white/5 border border-white/5 text-zinc-400"
                                }`}>
                                  {t.category}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full ${getPriorityBadgeClass(t.priority)}`}>
                                  {formatPriority(t.priority)}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full ${getStatusBadgeClass(t.status)}`}>
                                  {formatStatus(t.status)}
                                </span>
                                <span className="text-zinc-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {new Date(t.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-3 text-right">
                              <div className="hidden sm:block">
                                <span className="text-[10px] text-zinc-400 uppercase block font-semibold">Agent Assigned</span>
                                <span className={`text-xs font-semibold ${isLight ? "text-slate-800" : "text-white"}`}>
                                  {t.agent ? t.agent.name : <span className="text-zinc-400 font-medium italic">Unassigned Pool</span>}
                                </span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-zinc-400" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NESTED TICKET INSPECTOR MODAL */}
      {selectedTicketId && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className={`w-full max-w-4xl h-[90vh] border rounded-2xl flex flex-col shadow-2xl relative overflow-hidden transition-all duration-300 ${
            isLight ? "bg-white border-slate-200" : "bg-[#0E0E11] border-white/10"
          }`}>
            
            {/* TICKET MODAL HEADER */}
            <div className={`p-6 border-b flex items-center justify-between ${
              isLight ? "border-slate-100 bg-slate-50/50" : "border-white/5 bg-white/[0.01]"
            }`}>
              <div className="space-y-1 text-left">
                <div className="flex items-center gap-2.5">
                  <span className={`text-[10px] font-mono border px-2.5 py-0.5 rounded-full font-bold uppercase ${
                    isLight ? "bg-indigo-50 border-indigo-100 text-[#6D5DF6]" : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/15"
                  }`}>
                    TICKET INSPECTOR
                  </span>
                  <span className="text-xs font-mono text-zinc-500">ID: #{selectedTicketId}</span>
                </div>
                {ticketDetails && <h3 className={`text-base font-extrabold ${isLight ? "text-[#0F172A]" : "text-white"}`}>{ticketDetails.subject}</h3>}
              </div>
              <button 
                onClick={() => setSelectedTicketId(null)}
                className={`p-2 rounded-lg transition-colors ${
                  isLight ? "hover:bg-slate-100 text-slate-500 hover:text-slate-900" : "hover:bg-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* TICKET CONTENT */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {loadingTicket ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[#6D5DF6]/30 border-t-[#6D5DF6] rounded-full animate-spin" />
                </div>
              ) : !ticketDetails ? (
                <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
                  Failed to load ticket inspector details.
                </div>
              ) : (
                <>
                  {/* LEFT COLUMN: INFORMATION, METADATA, ATTACHMENTS, AUDIT TRAIL */}
                  <div className={`w-full md:w-1/2 p-6 overflow-y-auto space-y-6 border-r ${
                    isLight ? "border-slate-100" : "border-white/5"
                  }`}>
                    {/* DETAILS CARD */}
                    <div className={`border rounded-xl p-4 space-y-4 text-left ${
                      isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.01] border border-white/5"
                    }`}>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Core Meta</h4>
                      
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-zinc-500 block">Category</span>
                          <span className={`font-semibold ${isLight ? "text-slate-800" : "text-white"}`}>{ticketDetails.category}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block">Priority</span>
                          <span className={`inline-block px-2 py-0.5 rounded-full mt-0.5 ${getPriorityBadgeClass(ticketDetails.priority)}`}>
                            {formatPriority(ticketDetails.priority)}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block">Status</span>
                          <span className={`inline-block px-2 py-0.5 rounded-full mt-0.5 ${getStatusBadgeClass(ticketDetails.status)}`}>
                            {formatStatus(ticketDetails.status)}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block">Created On</span>
                          <span className={`font-mono font-medium ${isLight ? "text-slate-700" : "text-zinc-300"}`}>{new Date(ticketDetails.createdAt).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className={`border-t pt-3 ${isLight ? "border-slate-200" : "border-white/5"}`}>
                        <span className="text-zinc-500 text-xs block mb-1">Issue Description</span>
                        <p className={`text-xs leading-relaxed p-3 rounded-lg border whitespace-pre-wrap ${
                          isLight ? "bg-white border-slate-200 text-slate-700" : "bg-white/5 border border-white/5 text-zinc-300"
                        }`}>
                          {ticketDetails.description}
                        </p>
                      </div>
                    </div>

                    {/* ATTACHMENTS */}
                    <div className="space-y-2 text-left">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Attachments</h4>
                      {ticketDetails.attachments && ticketDetails.attachments.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {ticketDetails.attachments.map((file: any) => (
                            <a 
                              key={file.id}
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className={`border rounded-lg p-2.5 flex items-center space-x-2 text-xs transition-colors ${
                                isLight 
                                  ? "bg-slate-50 hover:bg-slate-100 border-slate-200 text-[#6D5DF6]" 
                                  : "bg-white/5 hover:bg-white/10 border border-white/5 text-indigo-400 hover:text-indigo-300"
                              }`}
                            >
                              <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className={`truncate text-[11px] ${isLight ? "text-slate-700" : "text-zinc-300"}`}>{file.fileName || "View Attachment"}</span>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-zinc-400 text-xs italic">No attached documents.</p>
                      )}
                    </div>

                    {/* AUDIT TRAIL / TIMELINE */}
                    <div className="space-y-3 text-left">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-zinc-400" /> Ticket Audit Trail
                      </h4>
                      <div className={`relative border-l pl-4 ml-1 space-y-4 ${
                        isLight ? "border-slate-200" : "border-white/5"
                      }`}>
                        {ticketDetails.history && ticketDetails.history.length > 0 ? (
                          ticketDetails.history.map((item: any) => (
                            <div key={item.id} className="relative text-xs">
                              <div className={`absolute -left-[21px] top-1.5 w-2 h-2 rounded-full border ${
                                isLight ? "bg-[#6D5DF6] border-white" : "bg-indigo-500 border-[#0E0E11]"
                              }`} />
                              <div className={`border p-2.5 rounded-lg space-y-1 ${
                                isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.01] border border-white/5"
                              }`}>
                                <p className={`text-[11px] leading-snug ${isLight ? "text-slate-800" : "text-white"}`}>{item.action}</p>
                                <div className="flex items-center justify-between text-[9px] text-zinc-500">
                                  <span>{item.user ? item.user.name : "System Daemon"}</span>
                                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-zinc-400 text-xs italic">No events logged.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: COMPLETE SUPPORT CONVERSATION (READ-ONLY) */}
                  <div className={`w-full md:w-1/2 flex flex-col h-full ${
                    isLight ? "bg-slate-50/50" : "bg-black/20"
                  }`}>
                    <div className={`px-4 py-3 border-b flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider ${
                      isLight ? "border-slate-100 bg-slate-50" : "border-white/5 bg-white/[0.02]"
                    }`}>
                      <span>Conversation Records</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 uppercase font-bold font-mono ${
                        isLight 
                          ? "bg-amber-50 border-amber-200 text-amber-700" 
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/15"
                      }`}>
                        <ShieldAlert className="w-3 h-3" /> Read Only
                      </span>
                    </div>

                    {/* MESSAGES VIEW */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {ticketDetails.messages && ticketDetails.messages.length > 0 ? (
                        ticketDetails.messages.map((msg: any) => {
                          const isCustomer = msg.sender?.role === "CUSTOMER";
                          return (
                            <div 
                              key={msg.id}
                              className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}
                            >
                              <div className={`max-w-[85%] rounded-2xl p-3.5 space-y-1.5 shadow-sm text-xs text-left ${
                                isCustomer 
                                  ? isLight
                                    ? "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
                                    : "bg-white/5 border border-white/5 text-zinc-200 rounded-tl-none" 
                                  : "bg-[#6D5DF6] text-white rounded-tr-none"
                              }`}>
                                <div className="flex items-center gap-2 text-[9px] text-zinc-400">
                                  <span className={isCustomer ? (isLight ? "text-slate-800 font-bold" : "text-zinc-200 font-bold") : "text-white font-bold"}>
                                    {msg.sender?.name || "Deleted User"}
                                  </span>
                                  <span className="font-mono text-[8px]">
                                    ({msg.sender?.role || "UNKNOWN"})
                                  </span>
                                </div>

                                <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>

                                {msg.attachments && msg.attachments.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-white/5 space-y-1.5">
                                    {msg.attachments.map((file: any) => (
                                      <a 
                                        key={file.id}
                                        href={file.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center space-x-1.5 text-[10px] text-zinc-300 hover:text-white bg-white/5 px-2 py-1 rounded border border-white/5"
                                      >
                                        <Paperclip className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate">{file.fileName || "Attachment"}</span>
                                      </a>
                                    ))}
                                  </div>
                                )}

                                <div className={`text-[8px] text-right block font-mono ${
                                  isCustomer ? "text-zinc-500" : "text-white/70"
                                }`}>
                                  {new Date(msg.createdAt).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center text-zinc-600 text-xs py-24 space-y-2">
                          <Clock className="w-8 h-8 text-zinc-400" />
                          <p>No messages exchanged in this conversation yet.</p>
                        </div>
                      )}
                    </div>

                    {/* LOCK BANNER FOR READ ONLY */}
                    <div className={`p-4 border-t text-center text-zinc-400 text-[11px] leading-relaxed select-none italic ${
                      isLight ? "border-slate-100 bg-slate-50" : "border-white/5 bg-white/[0.01]"
                    }`}>
                      This chat log is read-only. Conversational updates are managed exclusively between the client and assigned support staff.
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCustomers;
