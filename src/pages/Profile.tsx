import React, { useState, useEffect, useRef } from "react";
import { userAPI, uploadAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { 
  User, Mail, Phone, Calendar, Ticket, Lock, Camera, 
  Save, AlertCircle, CheckCircle, Upload, KeyRound, Info, Award
} from "lucide-react";

const Profile: React.FC = () => {
  const { user, refreshProfile } = useAuth(); // refreshProfile here acts as a function to refresh the token/session state if we need to update user context
  const { theme } = useTheme();
  const isLight = theme === "light";
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile fields state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [fallbackUrl, setFallbackUrl] = useState("");

  // Statistics state
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Status & loading indicators
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Success / Error messages
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchProfileDetails = async () => {
    setLoadingStats(true);
    try {
      const res = await userAPI.getProfile();
      // Update form fields with latest DB data
      const u = res.user;
      setName(u.name || "");
      setEmail(u.email || "");
      setUsername(u.username || "");
      setPhone(u.phone || "");
      setBio(u.bio || "");
      setProfilePicture(u.profilePicture || "");
      setStats(res.stats || {});
    } catch (err) {
      console.error("Failed to load profile stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchProfileDetails();
  }, []);

  // Update overall profile info
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage(null);
    try {
      const payload = { name, email, username, phone, bio };
      const response = await userAPI.updateProfile(payload);
      
      // Update our local Auth Context to reflect the name/email updates instantly
      await refreshProfile();

      setProfileMessage({ type: "success", text: "Your profile details have been updated successfully." });
    } catch (err: any) {
      console.error("Failed to update profile:", err);
      const errorText = err.response?.data?.error || "An error occurred while updating your profile details.";
      setProfileMessage({ type: "error", text: errorText });
    } finally {
      setProfileLoading(false);
    }
  };

  // Change password handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New password and confirmation do not match." });
      setPasswordLoading(false);
      return;
    }

    try {
      await userAPI.changePassword({ currentPassword, newPassword, confirmPassword });
      setPasswordMessage({ type: "success", text: "Password changed successfully." });
      // Reset password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Failed to change password:", err);
      const errorText = err.response?.data?.error || "Incorrect current password or invalid formatting.";
      setPasswordMessage({ type: "error", text: errorText });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Process file upload (Cloudinary)
  const processUpload = async (file: File) => {
    setUploadLoading(true);
    setProfileMessage(null);
    try {
      const response = await uploadAPI.uploadFile(file);
      const url = response.secure_url;
      
      // Save to database
      const dbResponse = await userAPI.updateProfilePicture(url);
      setProfilePicture(url);

      // Refresh Auth context
      await refreshProfile();

      setProfileMessage({ type: "success", text: "Avatar updated successfully." });
    } catch (err: any) {
      console.error("Upload failed:", err);
      const errorText = err.response?.data?.error || "Image format must be JPEG, PNG, or GIF, and under 10MB.";
      setProfileMessage({ type: "error", text: errorText });
    } finally {
      setUploadLoading(false);
    }
  };

  // File input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUpload(e.target.files[0]);
    }
  };

  // Profile pic fallback URL input
  const handleUrlFallbackSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fallbackUrl) return;

    setProfileLoading(true);
    setProfileMessage(null);
    try {
      const dbResponse = await userAPI.updateProfilePicture(fallbackUrl);
      setProfilePicture(fallbackUrl);

      // Refresh Auth context
      await refreshProfile();

      setFallbackUrl("");
      setProfileMessage({ type: "success", text: "Avatar URL saved successfully." });
    } catch (err: any) {
      console.error("URL fallback save failed:", err);
      const errorText = err.response?.data?.error || "Failed to update profile picture URL.";
      setProfileMessage({ type: "error", text: errorText });
    } finally {
      setProfileLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        processUpload(file);
      } else {
        setProfileMessage({ type: "error", text: "Dropped file is not an image." });
      }
    }
  };

  return (
    <div className={`transition-all duration-200 ${isLight ? "space-y-8" : "space-y-6"}`}>
      {/* TITLE HEADER */}
      <div className="space-y-1">
        <h2 className={`font-bold transition-colors duration-200 ${
          isLight ? "text-[22px] text-[#1E293B]" : "text-xl font-extrabold text-white"
        }`}>
          My Portal Profile
        </h2>
        <p className={`text-sm transition-colors duration-200 ${
          isLight ? "text-[#64748B]" : "text-[#A1A1AA]"
        }`}>
          Manage your personal details, configure security settings, update credentials, and inspect system-wide engagement metrics.
        </p>
      </div>

      {/* METRICS / STATS STRIP */}
      {loadingStats ? (
        <div className={`grid grid-cols-1 sm:grid-cols-3 ${isLight ? "gap-6" : "gap-4"}`}>
          {[1, 2, 3].map((n) => (
            <div 
              key={n} 
              className={`animate-pulse ${
                isLight 
                  ? "bg-slate-100 border border-slate-200 rounded-[18px] h-[100px]" 
                  : "bg-[#18181B]/40 border border-white/5 rounded-2xl h-24"
              }`} 
            />
          ))}
        </div>
      ) : stats && (
        <div className={`grid grid-cols-1 sm:grid-cols-3 ${isLight ? "gap-6" : "gap-4"}`}>
          
          {/* Account Type Card */}
          <div className={`transition-all duration-200 flex items-center justify-between ${
            isLight
              ? "bg-white border border-[#E7ECF3] rounded-[18px] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
              : "bg-[#18181B]/30 border border-white/5 rounded-2xl p-5 shadow-md"
          }`}>
            <div>
              <span className={`uppercase font-bold tracking-wider block ${
                isLight ? "text-[#64748B] text-[11px]" : "text-zinc-500 text-[10px]"
              }`}>
                Account Type
              </span>
              <span className={`font-extrabold capitalize mt-1 block ${
                isLight ? "text-xl text-[#0F172A]" : "text-lg text-white"
              }`}>
                {user?.role.toLowerCase()}
              </span>
            </div>
            <div className={`flex items-center justify-center transition-all duration-200 ${
              isLight
                ? "w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600"
                : "w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
            }`}>
              <Award className="w-5 h-5" />
            </div>
          </div>

          {user?.role === "CUSTOMER" && (
            <>
              {/* Open Tickets Card */}
              <div className={`transition-all duration-200 flex items-center justify-between ${
                isLight
                  ? "bg-white border border-[#E7ECF3] rounded-[18px] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
                  : "bg-[#18181B]/30 border border-white/5 rounded-2xl p-5 shadow-md"
              }`}>
                <div>
                  <span className={`uppercase font-bold tracking-wider block ${
                    isLight ? "text-[#64748B] text-[11px]" : "text-zinc-500 text-[10px]"
                  }`}>
                    Open Tickets
                  </span>
                  <span className={`font-extrabold font-mono mt-1 block ${
                    isLight ? "text-xl text-[#0F172A]" : "text-lg text-white"
                  }`}>
                    {stats.openTickets || 0}
                  </span>
                </div>
                <div className={`flex items-center justify-center transition-all duration-200 ${
                  isLight
                    ? "w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 text-amber-600"
                    : "w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400"
                }`}>
                  <Ticket className="w-5 h-5" />
                </div>
              </div>

              {/* Closed Tickets Card */}
              <div className={`transition-all duration-200 flex items-center justify-between ${
                isLight
                  ? "bg-white border border-[#E7ECF3] rounded-[18px] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
                  : "bg-[#18181B]/30 border border-white/5 rounded-2xl p-5 shadow-md"
              }`}>
                <div>
                  <span className={`uppercase font-bold tracking-wider block ${
                    isLight ? "text-[#64748B] text-[11px]" : "text-zinc-500 text-[10px]"
                  }`}>
                    Closed Tickets
                  </span>
                  <span className={`font-extrabold font-mono mt-1 block ${
                    isLight ? "text-xl text-[#0F172A]" : "text-lg text-white"
                  }`}>
                    {stats.closedTickets || 0}
                  </span>
                </div>
                <div className={`flex items-center justify-center transition-all duration-200 ${
                  isLight
                    ? "w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600"
                    : "w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                }`}>
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>
            </>
          )}

          {user?.role === "AGENT" && (
            <>
              {/* Assigned Tickets Card */}
              <div className={`transition-all duration-200 flex items-center justify-between ${
                isLight
                  ? "bg-white border border-[#E7ECF3] rounded-[18px] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
                  : "bg-[#18181B]/30 border border-white/5 rounded-2xl p-5 shadow-md"
              }`}>
                <div>
                  <span className={`uppercase font-bold tracking-wider block ${
                    isLight ? "text-[#64748B] text-[11px]" : "text-zinc-500 text-[10px]"
                  }`}>
                    My Assigned Tickets
                  </span>
                  <span className={`font-extrabold font-mono mt-1 block ${
                    isLight ? "text-xl text-[#0F172A]" : "text-lg text-white"
                  }`}>
                    {stats.assignedTickets || 0}
                  </span>
                </div>
                <div className={`flex items-center justify-center transition-all duration-200 ${
                  isLight
                    ? "w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600"
                    : "w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
                }`}>
                  <Ticket className="w-5 h-5" />
                </div>
              </div>

              {/* Success Rate Card */}
              <div className={`transition-all duration-200 flex items-center justify-between ${
                isLight
                  ? "bg-white border border-[#E7ECF3] rounded-[18px] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
                  : "bg-[#18181B]/30 border border-white/5 rounded-2xl p-5 shadow-md"
              }`}>
                <div>
                  <span className={`uppercase font-bold tracking-wider block ${
                    isLight ? "text-[#64748B] text-[11px]" : "text-zinc-500 text-[10px]"
                  }`}>
                    Success Rate
                  </span>
                  <span className={`font-extrabold font-mono mt-1 block ${
                    isLight ? "text-xl text-[#0F172A]" : "text-lg text-white"
                  }`}>
                    {stats.acceptanceRate || 0}%
                  </span>
                </div>
                <div className={`flex items-center justify-center transition-all duration-200 ${
                  isLight
                    ? "w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600"
                    : "w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                }`}>
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>
            </>
          )}

          {user?.role === "ADMIN" && (
            <>
              {/* System Open Tickets Card */}
              <div className={`transition-all duration-200 flex items-center justify-between ${
                isLight
                  ? "bg-white border border-[#E7ECF3] rounded-[18px] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
                  : "bg-[#18181B]/30 border border-white/5 rounded-2xl p-5 shadow-md"
              }`}>
                <div>
                  <span className={`uppercase font-bold tracking-wider block ${
                    isLight ? "text-[#64748B] text-[11px]" : "text-zinc-500 text-[10px]"
                  }`}>
                    System Open Tickets
                  </span>
                  <span className={`font-extrabold font-mono mt-1 block ${
                    isLight ? "text-xl text-[#0F172A]" : "text-lg text-white"
                  }`}>
                    {stats.openTickets || 0}
                  </span>
                </div>
                <div className={`flex items-center justify-center transition-all duration-200 ${
                  isLight
                    ? "w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 text-amber-600"
                    : "w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400"
                }`}>
                  <Ticket className="w-5 h-5" />
                </div>
              </div>

              {/* Total System Log Card */}
              <div className={`transition-all duration-200 flex items-center justify-between ${
                isLight
                  ? "bg-white border border-[#E7ECF3] rounded-[18px] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
                  : "bg-[#18181B]/30 border border-white/5 rounded-2xl p-5 shadow-md"
              }`}>
                <div>
                  <span className={`uppercase font-bold tracking-wider block ${
                    isLight ? "text-[#64748B] text-[11px]" : "text-zinc-500 text-[10px]"
                  }`}>
                    Total System Log
                  </span>
                  <span className={`font-extrabold font-mono mt-1 block ${
                    isLight ? "text-xl text-[#0F172A]" : "text-lg text-white"
                  }`}>
                    {stats.totalTickets || 0}
                  </span>
                </div>
                <div className={`flex items-center justify-center transition-all duration-200 ${
                  isLight
                    ? "w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600"
                    : "w-10 h-10 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 text-[#6366F1]"
                }`}>
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* THREE PANELS LAYOUT */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 ${isLight ? "gap-8" : "gap-6"}`}>
        
        {/* LEFT COLUMN: AVATAR MANAGE & INFO */}
        <div className={`transition-all duration-200 ${isLight ? "space-y-8" : "space-y-6"}`}>
          
          {/* AVATAR DRAG DROP BOX */}
          <div className={`transition-all duration-200 text-center flex flex-col items-center ${
            isLight
              ? "bg-white border border-[#E7ECF3] rounded-[18px] p-8 shadow-[0_8px_24px_rgba(15,23,42,0.06)] space-y-6"
              : "bg-[#18181B]/40 border border-white/5 rounded-[24px] p-6 shadow-xl space-y-5"
          }`}>
            <h3 className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-[#1E293B]" : "text-white"}`}>
              Avatar Management
            </h3>
            
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`relative flex items-center justify-center transition-all duration-200 group rounded-full ${
                isLight
                  ? `w-40 h-40 border ${dragActive ? "border-[#6D5DF6] bg-[#6D5DF6]/5 -translate-y-0.5" : "border-[#E7ECF3] bg-[#F8FAFC] hover:border-[#6D5DF6]/50"}`
                  : `w-36 h-36 border-2 ${dragActive ? "border-indigo-500 bg-indigo-500/10 scale-105" : "border-white/5 bg-white/[0.01] hover:border-white/10"}`
              }`}
            >
              {uploadLoading ? (
                <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              ) : profilePicture ? (
                <>
                  <img 
                    src={profilePicture} 
                    alt="Profile Avatar" 
                    className="w-full h-full rounded-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1.5 transition-opacity duration-200 cursor-pointer text-white text-[10px] font-bold" onClick={() => fileInputRef.current?.click()}>
                    <Camera className="w-5 h-5" />
                    <span>Upload New</span>
                  </div>
                </>
              ) : (
                <div 
                  className={`flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors duration-200 ${
                    isLight ? "text-[#94A3B8] hover:text-[#6D5DF6]" : "text-zinc-500 hover:text-white"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <User className="w-12 h-12" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">No Avatar</span>
                </div>
              )}
            </div>

            {/* DRAG DROP NOTICE */}
            <div className="space-y-1">
              <p className={`text-xs font-semibold ${isLight ? "text-[#0F172A]" : "text-white"}`}>
                Drag & drop profile picture
              </p>
              <p className={`text-[10px] ${isLight ? "text-[#64748B]" : "text-zinc-500"}`}>
                Supports JPG, PNG, GIF up to 10MB
              </p>
            </div>

            {/* MANUAL UPLOAD TRIGGER */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadLoading}
              className={`flex items-center space-x-1.5 px-5 py-2.5 text-xs font-bold transition-all duration-200 cursor-pointer disabled:opacity-50 ${
                isLight 
                  ? "bg-gradient-to-r from-[#7C3AED] to-[#6D5DF6] hover:from-[#8B5CF6] hover:to-[#7C3AED] text-white rounded-full shadow-[0_4px_12px_rgba(109,93,246,0.2)] hover:shadow-[0_6px_16px_rgba(109,93,246,0.3)] hover:-translate-y-0.5 hover:brightness-110" 
                  : "bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-white"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Choose Image File</span>
            </button>
          </div>

          {/* PICTURE FALLBACK URL INPUT */}
          <div className={`transition-all duration-200 ${
            isLight
              ? "bg-white border border-[#E7ECF3] rounded-[18px] p-8 shadow-[0_8px_24px_rgba(15,23,42,0.06)] space-y-5"
              : "bg-[#18181B]/40 border border-white/5 rounded-[24px] p-6 shadow-xl space-y-4"
          }`}>
            <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${
              isLight ? "text-[#1E293B]" : "text-white"
            }`}>
              <Camera className={`w-4 h-4 ${isLight ? "text-[#64748B]" : "text-zinc-400"}`} /> External Image URL
            </h3>
            <p className={`text-[11px] leading-relaxed ${
              isLight ? "text-[#64748B]" : "text-[#A1A1AA]"
            }`}>
              If you prefer not to upload directly, you can link an external hosted image URL to render as your support avatar:
            </p>
            
            <form onSubmit={handleUrlFallbackSave} className="space-y-4">
              <input 
                type="url"
                value={fallbackUrl}
                onChange={(e) => setFallbackUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className={`w-full text-xs font-mono outline-none transition-all duration-200 ${
                  isLight
                    ? "bg-[#F8FAFC] border border-[#DCE3EC] rounded-[12px] p-[14px] text-[#0F172A] placeholder-[#94A3B8] focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12"
                    : "bg-white/5 border border-white/5 focus:border-[#6366F1]/30 focus:bg-white/[0.08] rounded-xl px-3 py-2 text-white placeholder-zinc-500"
                }`}
              />
              <button
                type="submit"
                disabled={!fallbackUrl || profileLoading}
                className={`w-full font-bold transition-all duration-200 h-11 flex items-center justify-center text-xs ${
                  isLight
                    ? "bg-gradient-to-r from-[#7C3AED] to-[#6D5DF6] hover:from-[#8B5CF6] hover:to-[#7C3AED] text-white rounded-[14px] shadow-[0_4px_12px_rgba(109,93,246,0.15)] hover:shadow-[0_6px_16px_rgba(109,93,246,0.25)] hover:-translate-y-0.5 hover:brightness-110"
                    : "bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl py-2.5 text-white font-bold cursor-pointer"
                }`}
              >
                Apply Image Link
              </button>
            </form>
          </div>
        </div>

        {/* MIDDLE COLUMN: PROFILE FIELDS */}
        <div className={`lg:col-span-2 transition-all duration-200 ${isLight ? "space-y-8" : "space-y-6"}`}>
          
          {/* ACCOUNT INFORMATION CARD */}
          <div className={`transition-all duration-200 ${
            isLight
              ? "bg-white border border-[#E7ECF3] rounded-[18px] p-8 shadow-[0_8px_24px_rgba(15,23,42,0.06)] space-y-6"
              : "bg-[#18181B]/40 border border-white/5 rounded-[24px] p-6 shadow-xl space-y-6"
          }`}>
            <div className={`flex items-center justify-between border-b pb-4 ${
              isLight ? "border-[#E8ECF3]" : "border-white/5"
            }`}>
              <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${
                isLight ? "text-[#1E293B]" : "text-white"
              }`}>
                <Info className={`w-4.5 h-4.5 ${isLight ? "text-[#6D5DF6]" : "text-indigo-400"}`} /> Account Information
              </h3>
            </div>

            {/* PROFILE MESSAGE NOTIFICATION */}
            {profileMessage && (
              <div className={`text-xs flex items-start gap-2.5 border ${
                profileMessage.type === "success" 
                  ? isLight
                    ? "bg-[#ECFDF5] border-[#BBF7D0] text-[#065F46] rounded-[12px] p-4 shadow-sm"
                    : "bg-emerald-500/5 text-emerald-400 border-emerald-500/10 rounded-xl p-4"
                  : isLight
                    ? "bg-[#FEF2F2] border-[#FEE2E2] text-[#991B1B] rounded-[12px] p-4 shadow-sm"
                    : "bg-red-500/5 text-red-400 border-red-500/10 rounded-xl p-4"
              }`}>
                {profileMessage.type === "success" ? (
                  <CheckCircle className={`flex-shrink-0 ${isLight ? "text-[#10B981] w-3.5 h-3.5 mt-0.5" : "w-4 h-4"}`} />
                ) : (
                  <AlertCircle className={`flex-shrink-0 ${isLight ? "text-[#EF4444] w-3.5 h-3.5 mt-0.5" : "w-4 h-4"}`} />
                )}
                <p className={isLight ? "font-medium" : ""}>{profileMessage.text}</p>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                 {/* Full Display Name */}
                 <div className="space-y-1.5">
                   <label className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? "text-[#64748B]" : "text-zinc-500"}`}>
                     Full Display Name
                   </label>
                   <input 
                     type="text" 
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     required
                     placeholder="e.g. John Doe"
                     className={`w-full outline-none transition-all duration-200 ${
                       isLight
                         ? "bg-[#F8FAFC] border border-[#DCE3EC] rounded-[12px] p-[14px] text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12"
                         : "bg-white/5 border border-white/5 focus:border-[#6366F1]/30 focus:bg-white/[0.08] rounded-xl text-xs text-white"
                     }`}
                   />
                 </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? "text-[#64748B]" : "text-zinc-500"}`}>
                    Email Address
                  </label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="john@example.com"
                    className={`w-full outline-none transition-all duration-200 ${
                      isLight
                        ? "bg-[#F8FAFC] border border-[#DCE3EC] rounded-[12px] p-[14px] text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12"
                        : "bg-white/5 border border-white/5 focus:border-[#6366F1]/30 focus:bg-white/[0.08] rounded-xl text-xs text-white"
                    }`}
                  />
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? "text-[#64748B]" : "text-zinc-500"}`}>
                    Username
                  </label>
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="johndoe_99"
                    className={`w-full outline-none transition-all duration-200 font-mono ${
                      isLight
                        ? "bg-[#F8FAFC] border border-[#DCE3EC] rounded-[12px] p-[14px] text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12"
                        : "bg-white/5 border border-white/5 focus:border-[#6366F1]/30 focus:bg-white/[0.08] rounded-xl text-xs text-white"
                    }`}
                  />
                </div>

                {/* Contact Phone Number */}
                <div className="space-y-1.5">
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? "text-[#64748B]" : "text-zinc-500"}`}>
                    Contact Phone Number
                  </label>
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className={`w-full outline-none transition-all duration-200 font-mono ${
                      isLight
                        ? "bg-[#F8FAFC] border border-[#DCE3EC] rounded-[12px] p-[14px] text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12"
                        : "bg-white/5 border border-white/5 focus:border-[#6366F1]/30 focus:bg-white/[0.08] rounded-xl text-xs text-white"
                    }`}
                  />
                </div>
              </div>

              {/* Biography */}
              <div className="space-y-1.5">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? "text-[#64748B]" : "text-zinc-500"}`}>
                  Biography / User Profile Notes
                </label>
                <textarea 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  placeholder="Tell us a bit about yourself, your role, or any preferences..."
                  className={`w-full outline-none transition-all duration-200 resize-none leading-relaxed ${
                    isLight
                      ? "bg-[#F8FAFC] border border-[#DCE3EC] rounded-[12px] p-[14px] text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12"
                      : "bg-white/5 border border-white/5 focus:border-[#6366F1]/30 focus:bg-white/[0.08] rounded-xl px-4 py-3 text-xs text-white"
                  }`}
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className={`flex items-center justify-center space-x-2 font-bold transition-all duration-200 cursor-pointer disabled:opacity-50 ${
                    isLight
                      ? "h-12 px-6 bg-gradient-to-r from-[#7C3AED] to-[#6D5DF6] hover:from-[#8B5CF6] hover:to-[#7C3AED] text-white rounded-[14px] shadow-[0_4px_12px_rgba(109,93,246,0.2)] hover:shadow-[0_6px_16px_rgba(109,93,246,0.3)] hover:-translate-y-0.5 text-xs"
                      : "bg-indigo-600 hover:bg-indigo-500 px-5 py-3 rounded-xl text-xs text-white"
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>{profileLoading ? "Saving Changes..." : "Save Account Information"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* PASSWORD SECURITY FORM */}
          <div className={`transition-all duration-200 ${
            isLight
              ? "bg-white border border-[#E7ECF3] rounded-[18px] p-8 shadow-[0_8px_24px_rgba(15,23,42,0.06)] space-y-6"
              : "bg-[#18181B]/40 border border-white/5 rounded-[24px] p-6 shadow-xl space-y-6"
          }`}>
            <div className={`flex items-center justify-between border-b pb-4 ${
              isLight ? "border-[#E8ECF3]" : "border-white/5"
            }`}>
              <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${
                isLight ? "text-[#1E293B]" : "text-white"
              }`}>
                <KeyRound className={`w-4.5 h-4.5 ${isLight ? "text-[#D97706]" : "text-amber-400"}`} /> Login & Credentials Security
              </h3>
            </div>

            {/* PASSWORD MESSAGE NOTIFICATION */}
            {passwordMessage && (
              <div className={`text-xs flex items-start gap-2.5 border ${
                passwordMessage.type === "success" 
                  ? isLight
                    ? "bg-[#ECFDF5] border-[#BBF7D0] text-[#065F46] rounded-[12px] p-4 shadow-sm"
                    : "bg-emerald-500/5 text-emerald-400 border-emerald-500/10 rounded-xl p-4"
                  : isLight
                    ? "bg-[#FEF2F2] border-[#FEE2E2] text-[#991B1B] rounded-[12px] p-4 shadow-sm"
                    : "bg-red-500/5 text-red-400 border-red-500/10 rounded-xl p-4"
              }`}>
                {passwordMessage.type === "success" ? (
                  <CheckCircle className={`flex-shrink-0 ${isLight ? "text-[#10B981] w-3.5 h-3.5 mt-0.5" : "w-4 h-4"}`} />
                ) : (
                  <AlertCircle className={`flex-shrink-0 ${isLight ? "text-[#EF4444] w-3.5 h-3.5 mt-0.5" : "w-4 h-4"}`} />
                )}
                <p className={isLight ? "font-medium" : ""}>{passwordMessage.text}</p>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-6">
              
              {/* Current Password */}
              <div className="space-y-1.5">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? "text-[#64748B]" : "text-zinc-500"}`}>
                  Current Password
                </label>
                <div className="relative w-full">
                  {!isLight && (
                    <Lock 
                      className="absolute text-[#94A3B8] pointer-events-none z-10" 
                      style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px" }}
                    />
                  )}
                  <input 
                    type="password" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Enter current password..."
                    className={`w-full outline-none transition-all duration-200 ${
                      isLight
                        ? "bg-[#F8FAFC] border border-[#DCE3EC] rounded-[12px] p-[14px] text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12"
                        : "bg-white/5 border border-white/5 focus:border-[#6366F1]/30 focus:bg-white/[0.08] rounded-xl text-xs text-white"
                    }`}
                    style={isLight ? undefined : { paddingLeft: "44px" }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* New Password */}
                <div className="space-y-1.5">
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? "text-[#64748B]" : "text-zinc-500"}`}>
                    New Password
                  </label>
                  <div className="relative w-full">
                    {!isLight && (
                      <Lock 
                        className="absolute text-[#94A3B8] pointer-events-none z-10" 
                        style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px" }}
                      />
                    )}
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="Minimum 6 characters..."
                      className={`w-full outline-none transition-all duration-200 ${
                        isLight
                          ? "bg-[#F8FAFC] border border-[#DCE3EC] rounded-[12px] p-[14px] text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12"
                          : "bg-white/5 border border-white/5 focus:border-[#6366F1]/30 focus:bg-white/[0.08] rounded-xl text-xs text-white"
                      }`}
                      style={isLight ? undefined : { paddingLeft: "44px" }}
                    />
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1.5">
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? "text-[#64748B]" : "text-zinc-500"}`}>
                    Confirm New Password
                  </label>
                  <div className="relative w-full">
                    {!isLight && (
                      <Lock 
                        className="absolute text-[#94A3B8] pointer-events-none z-10" 
                        style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px" }}
                      />
                    )}
                    <input 
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Re-type new password..."
                      className={`w-full outline-none transition-all duration-200 ${
                        isLight
                          ? "bg-[#F8FAFC] border border-[#DCE3EC] rounded-[12px] p-[14px] text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#6D5DF6] focus:ring-4 focus:ring-[#6D5DF6]/12"
                          : "bg-white/5 border border-white/5 focus:border-[#6366F1]/30 focus:bg-white/[0.08] rounded-xl text-xs text-white"
                      }`}
                      style={isLight ? undefined : { paddingLeft: "44px" }}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className={`flex items-center justify-center space-x-2 font-bold transition-all duration-200 cursor-pointer disabled:opacity-50 ${
                    isLight
                      ? "h-12 px-6 bg-gradient-to-r from-[#7C3AED] to-[#6D5DF6] hover:from-[#8B5CF6] hover:to-[#7C3AED] text-white rounded-[14px] shadow-[0_4px_12px_rgba(109,93,246,0.2)] hover:shadow-[0_6px_16px_rgba(109,93,246,0.3)] hover:-translate-y-0.5 text-xs"
                      : "bg-[#D97706] hover:bg-[#B45309] px-5 py-3 rounded-xl text-xs text-white"
                  }`}
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{passwordLoading ? "Updating..." : "Change Account Password"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Profile;
