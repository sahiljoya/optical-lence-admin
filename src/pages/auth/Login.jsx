import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import "@/styles/veriwide.css";

export function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("admin@vishaloptical.com");
  const [password, setPassword] = useState("admin123");

  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    localStorage.setItem("TEMP_DEV_AUTH_TOKEN", "valid_admin");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 sm:p-8 font-sans antialiased">
      <div className="w-full max-w-[1000px] min-h-[600px] bg-white rounded-3xl flex overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative">
        
        {/* Left Side: Branding & Visuals */}
        <div className="hidden md:flex flex-col flex-1 relative p-12 overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
          {/* Abstract glowing shapes */}
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-16">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-inner">
                <svg width="24" height="24" viewBox="0 0 36 20" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="1" y="3" width="13" height="13" rx="5" />
                  <rect x="22" y="3" width="13" height="13" rx="5" />
                  <path d="M14 8 q4 -3 8 0" />
                </svg>
              </div>
              <div className="text-2xl font-extrabold tracking-tight">VOC ERP</div>
            </div>
            
            <div className="mt-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-blue-100 text-sm font-medium mb-6 border border-white/10">
                <ShieldCheck size={16} />
                Secure Admin Portal
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">Streamline your<br />Optical Business.</h1>
              <p className="text-blue-100/90 text-lg max-w-sm leading-relaxed">
                Manage customers, track daily orders, and monitor your entire inventory in one unified intelligent platform.
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-indigo-700 bg-blue-500 flex items-center justify-center font-bold text-white text-xs shadow-md ring-2 ring-transparent">
                    A{i}
                  </div>
                ))}
              </div>
              <div className="text-sm font-medium text-blue-100/90">
                Join our admin team
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="flex-1 p-8 sm:p-14 flex flex-col justify-center relative bg-white">
          <div className="max-w-sm w-full mx-auto">
            
            {/* Mobile Logo */}
            <div className="flex md:hidden items-center gap-3 mb-10 text-blue-600">
              <svg width="32" height="20" viewBox="0 0 36 20" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="1" y="3" width="13" height="13" rx="5" />
                <rect x="22" y="3" width="13" height="13" rx="5" />
                <path d="M14 8 q4 -3 8 0" />
              </svg>
              <div className="text-xl font-extrabold tracking-tight text-slate-900">VOC ERP</div>
            </div>

            <div className="mb-10">
              <h2 className="text-3xl font-bold mb-2 text-slate-900 tracking-tight">Welcome back</h2>
              <p className="text-slate-500 text-sm">Enter your credentials to access the admin panel.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block mb-2 text-sm font-semibold text-slate-900">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <Mail size={18} />
                  </div>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium"
                    placeholder="admin@vishaloptical.com" 
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-slate-900">Password</label>
                  <a href="#" className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">Forgot password?</a>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <Lock size={18} />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium"
                    placeholder="••••••••" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors outline-none focus-visible:text-blue-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full mt-8 py-3.5 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 text-white bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 active:scale-[0.98] transition-all"
              >
                Sign in to Dashboard <ArrowRight size={18} />
              </button>
            </form>
            
            <div className="mt-10 text-center">
              <p className="text-xs font-medium text-slate-400">
                Secure enterprise login provided by VOC Systems.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
