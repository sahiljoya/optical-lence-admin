import { useState, useRef, useEffect } from "react";
import { Search, Bell, ChevronDown, User, Lock, LogOut, X, Camera } from "lucide-react";
import { useIst } from "@/hooks/useIst";

export function TopBar() {
  const { d, t } = useIst();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const dropdownRef = useRef(null);

  // Mock logged-in user state
  const [user, setUser] = useState({
    name: "Sahil",
    role: "Owner",
    email: "sahil@opticalerp.com",
    phone: "+91 9876543210"
  });

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
    alert("Profile updated successfully!");
    setShowProfileModal(false);
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      return alert("New passwords do not match!");
    }
    alert("Password updated successfully!");
    setPasswordForm({ current: "", new: "", confirm: "" });
    setShowProfileModal(false);
  };

  return (
    <div className="flex items-center gap-4" style={{ height: 64 }}>
      <label className="flex items-center gap-2 flex-1" style={{ maxWidth: 640, height: 44, background: "var(--search-bg)", border: "1px solid var(--card-border)", borderRadius: 999, padding: "0 16px" }}>
        <Search size={18} style={{ color: "var(--faint)" }} />
        <input className="flex-1 bg-transparent outline-none" style={{ fontSize: 14 }} placeholder="Search customers, orders, products, invoices..." />
      </label>
      
      <div className="ml-auto flex items-center gap-3">
        <button aria-label="Notifications" className="relative grid place-items-center rounded-full transition-colors hover:bg-slate-100" style={{ width: 40, height: 40, background: "var(--card)", border: "1px solid var(--card-border)" }}>
          <Bell size={18} /><span className="absolute rounded-full" style={{ top: 8, right: 9, width: 8, height: 8, background: "var(--t-pink-ic)" }} />
        </button>
        
        {/* Profile Dropdown Container */}
        <div className="relative flex items-center gap-2 cursor-pointer p-1 rounded-full hover:bg-slate-50 transition-colors" ref={dropdownRef} onClick={() => setShowDropdown(!showDropdown)}>
          <span className="grid place-items-center rounded-full" style={{ width: 36, height: 36, background: "var(--primary-gradient)", color: "var(--on-primary)", fontSize: 13, fontWeight: 600 }}>
            {user.name.charAt(0).toUpperCase()}
          </span>
          <button className="flex items-center gap-1 outline-none" style={{ fontSize: 14, fontWeight: 500 }}>
            {user.role} <ChevronDown size={16} className={`transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
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
                <button className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-rose-600 rounded-lg hover:bg-rose-50 transition-colors">
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </div>
          )}
        </div>
        
        <span style={{ width: 1, height: 32, background: "var(--card-border)" }} />
        <div className="text-right"><div style={{ fontSize: 14, fontWeight: 600 }}>{d}</div><div style={{ fontSize: 12, color: "var(--muted)" }}>{t}</div></div>
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
