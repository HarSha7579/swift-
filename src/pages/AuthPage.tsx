import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, UserPlus, LogIn, AlertCircle, Sun, Moon, Zap } from "lucide-react";
import { motion } from "motion/react";

const AuthPage: React.FC = () => {
  const { login, register, error } = useAuth() as any;
  const { theme, toggleTheme } = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    setLoading(true);

    if (!email || !password || (!isLogin && (!name || !confirmPassword))) {
      setLocalError("Please fill out all fields.");
      setLoading(false);
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setLocalError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        await login(email, password);
        navigate("/dashboard");
      } else {
        await register(name, email, password);
        navigate("/dashboard");
      }
    } catch (err: any) {
      setLocalError(err.response?.data?.error || "Authentication failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${theme === "light" ? "bg-[#F8FAFC]" : "bg-[#09111F] text-[#F8FAFC]"} flex flex-col items-center justify-center relative p-6 overflow-hidden font-sans`}>
      {/* BACKGROUND DECORATIONS */}
      {theme === "light" ? (
        <>
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(91,76,247,0.06)_0%,transparent_70%)] rounded-full blur-[80px] pointer-events-none -z-10" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.05)_0%,transparent_70%)] rounded-full blur-[80px] pointer-events-none -z-10" />
        </>
      ) : (
        <>
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.12)_0%,transparent_70%)] rounded-full blur-[60px] pointer-events-none -z-10" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(109,93,246,0.12)_0%,transparent_70%)] rounded-full blur-[60px] pointer-events-none -z-10" />
        </>
      )}

      {/* THEME TOGGLE BUTTON */}
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={toggleTheme}
          className={theme === "light"
            ? "p-2.5 bg-white hover:bg-slate-50 rounded-xl border border-[#E2E8F0] transition-all duration-300 text-[#64748B] hover:text-[#5B4CF7] flex items-center justify-center cursor-pointer shadow-sm"
            : "p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 hover:border-white/10 transition-all duration-300 text-[#A1A1AA] hover:text-white flex items-center justify-center cursor-pointer shadow-lg"
          }
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-indigo-500" />
          )}
        </button>
      </div>

      {/* LOGO & HEADING SECTION */}
      <div className="flex flex-col items-center text-center max-w-xl w-full relative z-10">
        {/* LOGO CONTAINER */}
        <div className="flex items-center space-x-3 mb-2.5">
          <div className="w-[48px] h-[48px] rounded-[12px] bg-[#5B4CF7] flex items-center justify-center shadow-md shadow-indigo-500/10">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <span className={`text-[42px] font-bold tracking-tight leading-none ${theme === "light" ? "text-[#111827]" : "bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent"}`}>
            Swift Ticket
          </span>
        </div>
        
        {/* SUBTITLE */}
        <p 
          className={`text-[12px] font-semibold uppercase mb-8 ${theme === "light" ? "text-[#475569]" : "text-[#A1A1AA]"}`} 
          style={{ letterSpacing: "3px" }}
        >
          SMART AI-POWERED SUPPORT SYSTEM
        </p>
        
        {/* HEADING (Logo -> Heading is 32px, achieved by mb-8 above) */}
        <h1 className={`text-[32px] font-bold tracking-tight mb-[28px] ${theme === "light" ? "text-[#111827]" : "text-white"}`}>
          {isLogin ? "Sign in to your account" : "Create your account"}
        </h1>
      </div>

      {/* CARD WRAPPER */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[460px] relative z-10"
      >
        <div
          className={theme === "light" 
            ? "bg-white border border-[#E5E7EB] rounded-[20px] p-10 shadow-[0_10px_25px_rgba(15,23,42,0.04)] relative"
            : "bg-[rgba(20,27,45,0.82)] border border-white/5 backdrop-blur-xl rounded-[20px] p-10 shadow-2xl relative"
          }
        >
          {/* ERROR DISPLAY */}
          {(localError || error) && (
            <div className={`mb-6 border p-3.5 rounded-xl flex items-center space-x-2.5 text-xs ${theme === "light" ? "bg-red-50 border-red-100 text-[#EF4444]" : "bg-[#EF4444]/15 border-[#EF4444]/20 text-white"}`}>
              <AlertCircle className={`w-4.5 h-4.5 shrink-0 ${theme === "light" ? "text-[#EF4444]" : "text-white"}`} />
              <span>{localError || error}</span>
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit}>
            {/* INPUTS CONTAINER WITH EXACT 22PX SPACING */}
            <div className="flex flex-col space-y-[22px]">
              {!isLogin && (
                <div>
                  <label className={`block text-[13px] font-semibold uppercase tracking-wider mb-[10px] ${theme === "light" ? "text-[#64748B]" : "text-[#A1A1AA]"}`} style={{ letterSpacing: "1.5px" }}>
                    Full Name
                  </label>
                  <div className="relative w-full">
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={theme === "light"
                        ? "w-full bg-[#F8FAFC] border border-[#D8E2F0] text-[#0F172A] placeholder-[#94A3B8] placeholder:font-normal placeholder:text-[15px] rounded-[14px] outline-none transition-all duration-200 focus:bg-white focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12"
                        : "w-full bg-white/5 border border-white/5 rounded-[14px] text-white placeholder-[#94A3B8]/60 outline-none transition-all duration-200 focus:bg-zinc-900/40 focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/15"
                      }
                      style={{
                        paddingLeft: "18px",
                        paddingRight: "18px",
                        height: "56px",
                        borderRadius: "14px",
                        fontSize: "15px"
                      }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className={`block text-[13px] font-semibold uppercase tracking-wider mb-[10px] ${theme === "light" ? "text-[#64748B]" : "text-[#A1A1AA]"}`} style={{ letterSpacing: "1.5px" }}>
                  Email Address
                </label>
                <div className="relative w-full">
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={theme === "light"
                      ? "w-full bg-[#F8FAFC] border border-[#D8E2F0] text-[#0F172A] placeholder-[#94A3B8] placeholder:font-normal placeholder:text-[15px] rounded-[14px] outline-none transition-all duration-200 focus:bg-white focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12"
                      : "w-full bg-white/5 border border-white/5 rounded-[14px] text-white placeholder-[#94A3B8]/60 outline-none transition-all duration-200 focus:bg-zinc-900/40 focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/15"
                    }
                    style={{
                      paddingLeft: "18px",
                      paddingRight: "18px",
                      height: "56px",
                      borderRadius: "14px",
                      fontSize: "15px"
                    }}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[13px] font-semibold uppercase tracking-wider mb-[10px] ${theme === "light" ? "text-[#64748B]" : "text-[#A1A1AA]"}`} style={{ letterSpacing: "1.5px" }}>
                  Password
                </label>
                <div className="relative w-full">
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={theme === "light"
                      ? "w-full bg-[#F8FAFC] border border-[#D8E2F0] text-[#0F172A] placeholder-[#94A3B8] placeholder:font-normal placeholder:text-[15px] rounded-[14px] outline-none transition-all duration-200 focus:bg-white focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12"
                      : "w-full bg-white/5 border border-white/5 rounded-[14px] text-white placeholder-[#94A3B8]/60 outline-none transition-all duration-200 focus:bg-zinc-900/40 focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/15"
                    }
                    style={{
                      paddingLeft: "18px",
                      paddingRight: "18px",
                      height: "56px",
                      borderRadius: "14px",
                      fontSize: "15px"
                    }}
                  />
                </div>
              </div>

              {!isLogin && (
                <div>
                  <label className={`block text-[13px] font-semibold uppercase tracking-wider mb-[10px] ${theme === "light" ? "text-[#64748B]" : "text-[#A1A1AA]"}`} style={{ letterSpacing: "1.5px" }}>
                    Confirm Password
                  </label>
                  <div className="relative w-full">
                    <input
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={theme === "light"
                        ? "w-full bg-[#F8FAFC] border border-[#D8E2F0] text-[#0F172A] placeholder-[#94A3B8] placeholder:font-normal placeholder:text-[15px] rounded-[14px] outline-none transition-all duration-200 focus:bg-white focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12"
                        : "w-full bg-white/5 border border-white/5 rounded-[14px] text-white placeholder-[#94A3B8]/60 outline-none transition-all duration-200 focus:bg-zinc-900/40 focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/15"
                      }
                      style={{
                        paddingLeft: "18px",
                        paddingRight: "18px",
                        height: "56px",
                        borderRadius: "14px",
                        fontSize: "15px"
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={theme === "light"
                ? "w-full mt-[22px] h-[54px] px-6 bg-gradient-to-r from-[#5B4CF7] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white text-[17px] font-semibold rounded-[14px] shadow-[0_4px_12px_rgba(91,76,247,0.15)] hover:shadow-[0_8px_24px_rgba(91,76,247,0.25)] hover:-translate-y-[2px] transition-all duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                : "w-full mt-[22px] h-[54px] px-6 bg-gradient-to-r from-[#5B6CFF] to-[#8B5CF6] hover:from-[#4c5de6] hover:to-[#7c4ce6] text-white text-[17px] font-bold rounded-[14px] shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 transition-all duration-300 transform hover:-translate-y-[2px] active:translate-y-0 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
              }
            >
              {loading ? (
                <div className="w-5 h-5 border-2 rounded-full animate-spin border-white/30 border-t-white" />
              ) : (
                <>
                  {isLogin ? <LogIn className="w-[18px] h-[18px]" /> : <UserPlus className="w-[18px] h-[18px]" />}
                  <span>{isLogin ? "Sign In" : "Register Account"}</span>
                </>
              )}
            </button>
          </form>

          {/* ROLE ASSIGNMENT INFO */}
          {isLogin && (
            <p className={`text-center text-[13px] font-medium mt-[24px] ${theme === "light" ? "text-[#64748B]" : "text-[#A1A1AA]/60"}`}>
              Role is assigned automatically based on your credentials.
            </p>
          )}

          {/* TOGGLE LINK */}
          <p className={`text-center text-[14px] mt-[24px] ${theme === "light" ? "text-[#64748B]" : "text-[#A1A1AA]"}`}>
            {isLogin ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false);
                    setLocalError("");
                  }}
                  className={theme === "light"
                    ? "text-[#5B4CF7] hover:text-[#4F46E5] hover:underline font-bold bg-transparent border-none cursor-pointer transition-colors duration-200"
                    : "text-[#5B6CFF] hover:text-[#8B5CF6] hover:underline font-semibold bg-transparent border-none cursor-pointer transition-colors duration-200"
                  }
                >
                  Create Account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    setLocalError("");
                  }}
                  className={theme === "light"
                    ? "text-[#5B4CF7] hover:text-[#4F46E5] hover:underline font-bold bg-transparent border-none cursor-pointer transition-colors duration-200"
                    : "text-[#5B6CFF] hover:text-[#8B5CF6] hover:underline font-semibold bg-transparent border-none cursor-pointer transition-colors duration-200"
                  }
                >
                  Sign In
                </button>
              </>
            )}
          </p>

        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
