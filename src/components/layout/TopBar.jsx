import { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Bell, ChevronDown, User, Lock, LogOut, X, Camera, Menu, CheckCheck, Loader2 } from "lucide-react";
import { useIst } from "@/hooks/useIst";
import { getItem } from "@/services/storage";
import { logout } from "@/config/authService";
import { notify } from "@/lib/notify";
import { notificationService } from "@/services/notificationService";

const NOTIF_POLL_MS = 45000;

const notifTargetPath = (n) => {
  switch (n.entity_type) {
    case "Customer":
      return n.entity_id ? `/customer/${n.entity_id}` : null;
    case "CreditLimitRequest":
      return "/billing";
    case "Order":
      return n.entity_id ? `/orders/${n.entity_id}` : "/orders";
    case "SupportTicket":
      return "/support";
    default:
      return null;
  }
};

const formatRelativeTime = (dateStr) => {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

export function TopBar({ onOpenMobileMenu }) {
  const { d, t } = useIst();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const dropdownRef = useRef(null);

  // Notifications
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const notifDropdownRef = useRef(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await notificationService.getUnreadCount();
      setUnreadCount(res.data?.unread_count || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotifications = async () => {
    setLoadingNotifs(true);
    try {
      const res = await notificationService.getNotifications({ size: 15 });
      setNotifications(res.data?.list || []);
      setUnreadCount(res.data?.unread_count ?? unreadCount);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, NOTIF_POLL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutsideNotif = (event) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideNotif);
    return () => document.removeEventListener("mousedown", handleClickOutsideNotif);
  }, []);

  const handleToggleNotifDropdown = () => {
    const opening = !showNotifDropdown;
    setShowNotifDropdown(opening);
    if (opening) fetchNotifications();
  };

  const handleNotificationClick = async (n) => {
    if (!n.is_read) {
      setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, is_read: true } : x));
      setUnreadCount(prev => Math.max(0, prev - 1));
      try {
        await notificationService.markAsRead(n._id);
      } catch (err) {
        console.error(err);
      }
    }
    const path = notifTargetPath(n);
    setShowNotifDropdown(false);
    if (path) navigate({ to: path });
  };

  const handleMarkAllRead = async () => {
    const hadUnread = notifications.some(n => !n.is_read);
    if (!hadUnread && unreadCount === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await notificationService.markAllAsRead();
    } catch (err) {
      notify.error("Failed to mark notifications as read.");
    }
  };

  const storedUser = getItem("admin_user");

  const [user, setUser] = useState({
    name: storedUser?.name || "Admin",
    role: storedUser?.role?.name || "Staff",
    email: storedUser?.email || "",
    phone: storedUser?.phone || ""
  });

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  const [profileForm, setProfileForm] = useState(user);
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    setUser(profileForm);
    notify.success("Profile updated successfully!");
    setShowProfileModal(false);
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      return notify.warning("New passwords do not match!");
    }
    notify.success("Password updated successfully!");
    setPasswordForm({ current: "", new: "", confirm: "" });
    setShowProfileModal(false);
  };

  return (
    <div className="flex items-center gap-2 sm:gap-4 h-14 sm:h-16 w-full">
      {/* Mobile Hamburger Menu Button */}
      <button 
        type="button"
        onClick={onOpenMobileMenu}
        className="lg:hidden p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors shrink-0 border border-slate-200 bg-white shadow-sm"
        aria-label="Open navigation menu"
      >
        <Menu size={20} />
      </button>

      <label className="flex items-center gap-2 flex-1 max-w-[640px] h-10 sm:h-11 bg-[var(--search-bg)] border border-[var(--card-border)] rounded-full px-3 sm:px-4 min-w-0 shadow-sm">
        <Search size={18} className="shrink-0 text-slate-400" />
        <input className="flex-1 bg-transparent outline-none text-[13px] sm:text-[14px] min-w-0" placeholder="Search customers, orders, products..." />
      </label>
      
      <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="relative" ref={notifDropdownRef}>
          <button
            aria-label="Notifications"
            onClick={handleToggleNotifDropdown}
            className="relative grid place-items-center rounded-full transition-colors hover:bg-slate-100 w-9 h-9 sm:w-10 sm:h-10 bg-white border border-[var(--card-border)] shrink-0 shadow-sm"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span
                className="absolute flex items-center justify-center rounded-full text-white font-bold"
                style={{
                  top: unreadCount > 9 ? 2 : 5,
                  right: unreadCount > 9 ? 0 : 5,
                  minWidth: 16,
                  height: 16,
                  fontSize: 10,
                  padding: "0 3px",
                  background: "var(--t-pink-ic, #e11d48)"
                }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute top-[110%] right-0 w-[340px] sm:w-[380px] max-h-[70vh] flex flex-col bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
              <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                <p className="font-bold text-[14px] text-slate-800">Notifications</p>
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={unreadCount === 0}
                >
                  <CheckCheck size={13} /> Mark all read
                </button>
              </div>

              <div className="overflow-y-auto flex-1">
                {loadingNotifs ? (
                  <div className="flex items-center justify-center py-10 text-slate-400">
                    <Loader2 size={18} className="animate-spin" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-10 text-center text-[13px] text-slate-500">No notifications yet.</div>
                ) : (
                  notifications.map(n => (
                    <button
                      key={n._id}
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-2.5 items-start ${!n.is_read ? "bg-blue-50/40" : ""}`}
                    >
                      <span
                        className="mt-1.5 w-2 h-2 rounded-full shrink-0"
                        style={{ background: n.is_read ? "transparent" : "#2563eb" }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className={`text-[13px] leading-snug ${!n.is_read ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                          {n.title}
                        </p>
                        <p className="text-[12px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                        <p className="text-[11px] text-slate-400 mt-1">{formatRelativeTime(n.created_at)}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown Container */}
        <div className="relative flex items-center gap-1.5 sm:gap-2 cursor-pointer p-1 rounded-full hover:bg-slate-50 transition-colors" ref={dropdownRef} onClick={() => setShowDropdown(!showDropdown)}>
          <span className="grid place-items-center rounded-full w-8 h-8 sm:w-9 sm:h-9 text-[12px] sm:text-[13px] font-semibold text-white bg-blue-600 shrink-0 shadow-sm">
            {user.name.charAt(0).toUpperCase()}
          </span>
          <button className="hidden sm:flex items-center gap-1 outline-none text-[13px] sm:text-[14px] font-medium text-slate-800">
            {user.role} <ChevronDown size={15} className={`transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute top-[110%] right-0 w-56 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                <p className="font-bold text-[14px] text-slate-800">{user.name}</p>
                <p className="text-[12px] text-slate-500 truncate">{user.email}</p>
              </div>
              <div className="p-2 flex flex-col gap-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowDropdown(false); setShowProfileModal(true); setProfileForm(user); }}
                  className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-slate-700 rounded-lg hover:bg-slate-100 hover:text-blue-600 transition-colors"
                >
                  <User size={16} /> My Profile
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                  className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Date and Time (hidden on mobile) */}
        <span className="hidden md:block w-px h-8 bg-slate-200" />
        <div className="text-right hidden md:block">
          <div className="text-[13px] sm:text-[14px] font-semibold text-slate-800">{d}</div>
          <div className="text-[11px] sm:text-[12px] text-slate-500">{t}</div>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" style={{ background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(8px)" }}>
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-[0.98] fade-in duration-200 flex flex-col max-h-[90vh] relative border border-slate-200/50">
            
            {/* Banner Background */}
            <div className="h-32 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 relative overflow-hidden shrink-0">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
              <button 
                onClick={() => setShowProfileModal(false)} 
                className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/10 hover:bg-black/20 p-2 rounded-full backdrop-blur-md transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-8 relative z-10">
              {/* Header Profile Section - Overlapping banner */}
              <div className="flex flex-col sm:flex-row gap-6 items-end -mt-12 mb-10">
                <div className="relative group cursor-pointer shrink-0">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-slate-800 to-slate-900 border-4 border-white flex items-center justify-center text-white text-4xl font-black shadow-xl overflow-hidden">
                    {profileForm.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border-4 border-white backdrop-blur-sm">
                    <Camera className="text-white drop-shadow-md" size={26} />
                  </div>
                  {/* Status Indicator */}
                  <div className="absolute bottom-1 right-1 w-6 h-6 bg-emerald-500 border-4 border-white rounded-full"></div>
                </div>
                
                <div className="flex-1 pb-2">
                  <h2 className="font-black text-[28px] text-slate-800 leading-none tracking-tight">{user.name}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[12px] font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-wide">
                      {user.role}
                    </span>
                    <span className="text-slate-400 text-[13px]">{user.email}</span>
                  </div>
                </div>
              </div>

              {/* Settings Forms */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                
                {/* Personal Info */}
                <div className="md:col-span-7 flex flex-col gap-5">
                  <h3 className="font-black text-[16px] text-slate-800 flex items-center gap-2">
                    <User size={18} className="text-blue-600" />
                    Personal Details
                  </h3>
                  
                  <form onSubmit={handleUpdateProfile} className="flex flex-col gap-5">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">Full Name</label>
                        <input 
                          type="text" 
                          required 
                          value={profileForm.name} 
                          onChange={e => setProfileForm({...profileForm, name: e.target.value})} 
                          className="w-full h-12 px-4 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-[14px] font-medium text-slate-700 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">Email Address</label>
                          <input 
                            type="email" 
                            required 
                            value={profileForm.email} 
                            onChange={e => setProfileForm({...profileForm, email: e.target.value})} 
                            className="w-full h-12 px-4 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-[14px] font-medium text-slate-700 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">Phone Number</label>
                          <input 
                            type="text" 
                            value={profileForm.phone} 
                            onChange={e => setProfileForm({...profileForm, phone: e.target.value})} 
                            className="w-full h-12 px-4 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-[14px] font-medium text-slate-700 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                          />
                        </div>
                      </div>
                    </div>
                    
                    <button type="submit" className="self-end bg-slate-900 hover:bg-blue-600 text-white font-bold text-[13px] px-6 py-2.5 rounded-xl transition-all shadow-md shadow-slate-900/10 hover:shadow-blue-600/20 hover:-translate-y-0.5">
                      Save Changes
                    </button>
                  </form>
                </div>

                {/* Vertical Divider */}
                <div className="hidden md:block col-span-1 border-r border-slate-100 w-1/2"></div>

                {/* Password Change */}
                <div className="md:col-span-4 flex flex-col gap-5">
                  <h3 className="font-black text-[16px] text-rose-600 flex items-center gap-2">
                    <Lock size={18} />
                    Security
                  </h3>
                  
                  <form onSubmit={handleUpdatePassword} className="flex flex-col gap-5 bg-rose-50/50 border border-rose-100/50 rounded-2xl p-5">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-rose-500 mb-1.5 uppercase tracking-wider ml-1">Current Password</label>
                        <input 
                          type="password" 
                          required 
                          value={passwordForm.current} 
                          onChange={e => setPasswordForm({...passwordForm, current: e.target.value})} 
                          className="w-full h-11 px-4 bg-white border border-rose-100 rounded-xl text-[14px] focus:border-rose-400 focus:outline-none focus:ring-4 focus:ring-rose-500/10 transition-all" 
                          placeholder="••••••••" 
                        />
                      </div>
                      <div className="h-px w-full bg-rose-100/50 my-2"></div>
                      <div>
                        <label className="block text-[11px] font-bold text-rose-500 mb-1.5 uppercase tracking-wider ml-1">New Password</label>
                        <input 
                          type="password" 
                          required 
                          value={passwordForm.new} 
                          onChange={e => setPasswordForm({...passwordForm, new: e.target.value})} 
                          className="w-full h-11 px-4 bg-white border border-rose-100 rounded-xl text-[14px] focus:border-rose-400 focus:outline-none focus:ring-4 focus:ring-rose-500/10 transition-all" 
                          placeholder="Min. 8 characters" 
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-rose-500 mb-1.5 uppercase tracking-wider ml-1">Confirm New Password</label>
                        <input 
                          type="password" 
                          required 
                          value={passwordForm.confirm} 
                          onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} 
                          className="w-full h-11 px-4 bg-white border border-rose-100 rounded-xl text-[14px] focus:border-rose-400 focus:outline-none focus:ring-4 focus:ring-rose-500/10 transition-all" 
                          placeholder="Repeat new password" 
                        />
                      </div>
                    </div>
                    
                    <button type="submit" className="w-full bg-white hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-500 font-bold text-[13px] px-5 py-2.5 rounded-xl transition-all mt-2">
                      Update Password
                    </button>
                  </form>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
