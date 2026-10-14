import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ThemeProvider } from "./context/ThemeContext";

// Components & Pages
import Layout from "./components/Layout";
import AuthPage from "./pages/AuthPage";
import Profile from "./pages/Profile";

// Customer Views
import CustomerDashboard from "./pages/customer/Dashboard";
import CreateTicket from "./pages/customer/CreateTicket";
import MyTickets from "./pages/customer/MyTickets";
import TicketDetail from "./pages/customer/TicketDetail";
import KbArticles from "./pages/customer/KbArticles";

// Agent Views
import AgentDashboard from "./pages/agent/Dashboard";
import AgentTicketDetail from "./pages/agent/TicketDetail";

// Admin Views
import AdminDashboard from "./pages/admin/Dashboard";
import ManageCustomers from "./pages/admin/ManageCustomers";
import ManageAgents from "./pages/admin/ManageAgents";
import ManageKb from "./pages/admin/ManageKb";
import AdminAgentChat from "./pages/admin/AdminAgentChat";

// ==========================================
// PRIVATE ROUTE SKELETON
// ==========================================
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09111F] flex flex-col items-center justify-center space-y-6 relative overflow-hidden font-sans">
        {/* Soft radial backgrounds */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.08)_0%,transparent_70%)] rounded-full blur-[60px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(109,93,246,0.08)_0%,transparent_70%)] rounded-full blur-[60px] pointer-events-none" />

        <div className="flex items-center space-x-3 animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#5B6CFF] to-[#8B5CF6] flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-white">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            Swift Ticket
          </span>
        </div>

        <div className="flex flex-col items-center space-y-2">
          <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-[#6D5DF6] rounded-full animate-spin" />
          <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest font-mono">
            Booting secure core...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// ==========================================
// ROLE ROUTER ROUTING DISPATCHER
// ==========================================
const DashboardDispatcher: React.FC = () => {
  const { user } = useAuth();

  if (user?.role === "CUSTOMER") {
    return <CustomerDashboard />;
  } else if (user?.role === "AGENT") {
    return <AgentDashboard />;
  } else if (user?.role === "ADMIN") {
    return <AdminDashboard />;
  }
  return <Navigate to="/auth" />;
};

const TicketDetailDispatcher: React.FC = () => {
  const { user } = useAuth();

  if (user?.role === "CUSTOMER") {
    return <TicketDetail />;
  } else {
    // AGENT and ADMIN use the enhanced agent workspace with AI Suggestion controls
    return <AgentTicketDetail />;
  }
};

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
          <Routes>
            {/* PUBLIC AUTH */}
            <Route path="/auth" element={<AuthPage />} />

            {/* DASHBOARD CONSOLE DISPATCH */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DashboardDispatcher />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* CUSTOMER ONLY LINKS */}
            <Route
              path="/create-ticket"
              element={
                <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                  <Layout>
                    <CreateTicket />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets"
              element={
                <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                  <Layout>
                    <MyTickets />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* SHARED DYNAMIC TICKET COMMUNICATION DETAIL VIEW */}
            <Route
              path="/tickets/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <TicketDetailDispatcher />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* SHARED SELF-HELP MANUALS */}
            <Route
              path="/kb"
              element={
                <ProtectedRoute allowedRoles={["CUSTOMER", "AGENT"]}>
                  <Layout>
                    <KbArticles />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* STAFF INTERNAL COMMUNICATIONS CHAT */}
            <Route
              path="/chat"
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "AGENT"]}>
                  <Layout>
                    <AdminAgentChat />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* SHARED USER PROFILE */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Profile />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* ADMINISTRATOR ONLY PANELS */}
            <Route
              path="/manage-customers"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <Layout>
                    <ManageCustomers />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-agents"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <Layout>
                    <ManageAgents />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-kb"
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "AGENT"]}>
                  <Layout>
                    <ManageKb />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* CATCH ALL DEFAULT REDIRECT */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
  );
}
