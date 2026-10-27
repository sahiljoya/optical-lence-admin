import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Link as LinkIcon, UserPlus, FileText, Loader2 } from "lucide-react";
import { customerService } from "@/services/customerService";
import { notify } from "@/lib/notify";
import "@/styles/veriwide.css";

export function CustomerOnboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("direct"); // "direct" | "invite"
  const [inviteLink, setInviteLink] = useState("");
  const [isPending, setIsPending] = useState(false);

  const [formData, setFormData] = useState({
    company_name: "",
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gst_no: "",
    adhar_number: "",
    pan_number: ""
  });

  const [inviteData, setInviteData] = useState({ name: "", phone: "", email: "" });

  const handleGenerateLink = async (e) => {
    e.preventDefault();
    setIsPending(true);
    try {
      const res = await customerService.generateInvite(inviteData);
      setInviteLink(res.data.inviteLink);
    } catch (err) {
      notify.error(err.message || "Failed to generate invite link.");
    } finally {
      setIsPending(false);
    }
  };

  const handleDirectSubmit = async (e) => {
    e.preventDefault();
    setIsPending(true);
    try {
      await customerService.createCustomer(formData);
      notify.success("Customer Onboarding submitted! Sent to Accounts Team for Verification.");
      navigate({ to: "/customers" });
    } catch (err) {
      notify.error(err.message || "Failed to submit.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-1 sm:py-3 px-1 sm:px-0">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-6">
        <Link
          to="/customers"
          className="p-2 sm:p-2.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 bg-white transition-colors shadow-xs shrink-0 flex items-center justify-center cursor-pointer"
          title="Back to Customers"
        >
          <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-slate-900 truncate">
            Onboard New Customer
          </h1>
          <p className="text-[10px] sm:text-xs md:text-[13px] text-slate-500 mt-0.5 sm:mt-1 truncate sm:whitespace-normal">
            Register a new B2B client or generate an invite link.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-3.5 sm:mb-6 border-b border-border overflow-x-auto whitespace-nowrap pb-px scrollbar-none">
        <button
          onClick={() => setActiveTab("direct")}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-3 text-[11px] sm:text-xs md:text-sm font-semibold transition-all border-b-2 -mb-[1px] cursor-pointer shrink-0 ${
            activeTab === "direct"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <UserPlus size={15} className="sm:w-4 sm:h-4" /> Direct Registration
        </button>
        <button
          onClick={() => setActiveTab("invite")}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-3 text-[11px] sm:text-xs md:text-sm font-semibold transition-all border-b-2 -mb-[1px] cursor-pointer shrink-0 ${
            activeTab === "invite"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <LinkIcon size={15} className="sm:w-4 sm:h-4" /> Generate Invite Link
        </button>
      </div>

      {/* Main Form Card */}
      <div className="vw-card overflow-hidden" style={{ padding: 0 }}>
        {activeTab === "direct" && (
          <div className="p-3.5 sm:p-6 lg:p-8">
            <div className="mb-5 sm:mb-7 pb-3.5 sm:pb-5 border-b border-border">
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 mb-1">
                Mode A: Staff On-Field Registration
              </h2>
              <p className="text-[10px] sm:text-xs md:text-[13px] text-slate-500 leading-relaxed">
                Fill out all customer details. After submission, it will go to the Accounts Team for verification.
              </p>
            </div>

            <form onSubmit={handleDirectSubmit} className="space-y-6 sm:space-y-8">
              {/* Section 1: Basic Details */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 mb-3 sm:mb-4 uppercase tracking-wider flex items-center gap-2">
                  <UserPlus size={14} className="text-slate-400" /> Basic Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5 sm:mb-2">
                      Company / Shop Name <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <input
                      required
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      type="text"
                      className="w-full h-10 sm:h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 transition-all shadow-xs"
                      placeholder="Vision Plus"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5 sm:mb-2">
                      Owner Name <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      type="text"
                      className="w-full h-10 sm:h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 transition-all shadow-xs"
                      placeholder="Rahul Sharma"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5 sm:mb-2">
                      Phone Number <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <input
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      type="tel"
                      className="w-full h-10 sm:h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 font-mono transition-all shadow-xs"
                      placeholder="9876543210"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5 sm:mb-2">
                      Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      type="email"
                      className="w-full h-10 sm:h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 transition-all shadow-xs"
                      placeholder="rahul@example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: KYC & Location */}
              <div className="pt-5 sm:pt-6 border-t border-border">
                <h3 className="text-xs font-bold text-slate-400 mb-3 sm:mb-4 uppercase tracking-wider flex items-center gap-2">
                  <FileText size={14} className="text-slate-400" /> KYC & Location
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5 sm:mb-2">
                      Full Address
                    </label>
                    <input
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      type="text"
                      className="w-full h-10 sm:h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 transition-all shadow-xs"
                      placeholder="Shop No. 5, Main Market, MG Road"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5 sm:mb-2">
                      City
                    </label>
                    <input
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      type="text"
                      className="w-full h-10 sm:h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 transition-all shadow-xs"
                      placeholder="Mumbai"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5 sm:mb-2">
                      State
                    </label>
                    <input
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      type="text"
                      className="w-full h-10 sm:h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 transition-all shadow-xs"
                      placeholder="Maharashtra"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5 sm:mb-2">
                      Pincode
                    </label>
                    <input
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      type="text"
                      className="w-full h-10 sm:h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 font-mono transition-all shadow-xs"
                      placeholder="400001"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5 sm:mb-2">
                      GST Number
                    </label>
                    <input
                      value={formData.gst_no}
                      onChange={(e) => setFormData({ ...formData, gst_no: e.target.value.toUpperCase() })}
                      type="text"
                      className="w-full h-10 sm:h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 font-mono uppercase transition-all shadow-xs"
                      placeholder="27ABCDE1234F1Z5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5 sm:mb-2">
                      Aadhaar Number
                    </label>
                    <input
                      value={formData.adhar_number}
                      onChange={(e) => setFormData({ ...formData, adhar_number: e.target.value })}
                      type="text"
                      className="w-full h-10 sm:h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 font-mono transition-all shadow-xs"
                      placeholder="1234 5678 9012"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5 sm:mb-2">
                      PAN Number
                    </label>
                    <input
                      value={formData.pan_number}
                      onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                      type="text"
                      className="w-full h-10 sm:h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 font-mono uppercase transition-all shadow-xs"
                      placeholder="ABCDE1234F"
                    />
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-5 sm:pt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 border-t border-border mt-6 sm:mt-8">
                <Link
                  to="/customers"
                  className="vw-btn-secondary h-10 sm:h-11 px-5 text-xs sm:text-[13px] font-semibold border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center justify-center rounded-xl cursor-pointer shadow-xs"
                >
                  Cancel
                </Link>
                <button
                  disabled={isPending}
                  type="submit"
                  className="vw-btn-primary h-10 sm:h-11 px-6 flex items-center justify-center gap-2 text-xs sm:text-[13px] font-semibold rounded-xl shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {isPending ? <Loader2 size={16} className="animate-spin" /> : null} Submit to Verification
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "invite" && (
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-6 sm:mb-7 pb-4 sm:pb-5 border-b border-border">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
                Mode B: Invitation Link
              </h2>
              <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed">
                Generate a unique, 1-time use link valid for 44 hours. Send this to the customer so they can fill their own KYC details.
              </p>
            </div>

            <form onSubmit={handleGenerateLink} className="w-full max-w-lg space-y-4 sm:space-y-5">
              <div>
                <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5 sm:mb-2">
                  Customer Name <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  required
                  value={inviteData.name}
                  onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                  type="text"
                  className="w-full h-10 sm:h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 transition-all shadow-xs"
                  placeholder="Rahul Sharma"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5 sm:mb-2">
                  Customer Phone <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  required
                  value={inviteData.phone}
                  onChange={(e) => setInviteData({ ...inviteData, phone: e.target.value })}
                  type="tel"
                  className="w-full h-10 sm:h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 font-mono transition-all shadow-xs"
                  placeholder="9876543210"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5 sm:mb-2">
                  Customer Email <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  type="email"
                  className="w-full h-10 sm:h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 transition-all shadow-xs"
                  placeholder="customer@example.com"
                />
              </div>

              <div className="pt-2 sm:pt-3">
                <button
                  disabled={isPending}
                  type="submit"
                  className="w-full vw-btn-primary h-10 sm:h-11 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold rounded-xl shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {isPending ? <Loader2 size={16} className="animate-spin" /> : <LinkIcon size={16} />} Generate Invite Link
                </button>
              </div>
            </form>

            {inviteLink && (
              <div className="mt-6 sm:mt-8 p-4 sm:p-5 bg-emerald-50 border border-emerald-200 rounded-xl max-w-lg">
                <h4 className="text-xs sm:text-[13px] font-bold text-emerald-800 mb-2.5">
                  Invite Link Generated Successfully!
                </h4>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    readOnly
                    value={inviteLink}
                    className="flex-1 h-10 px-3.5 bg-white border border-emerald-200 rounded-lg text-xs sm:text-[13px] font-mono text-emerald-900 outline-none select-all"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      notify.success("Invite link copied to clipboard!");
                    }}
                    className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-xs sm:text-[13px] font-semibold hover:bg-emerald-700 transition-colors shrink-0 cursor-pointer"
                  >
                    Copy Link
                  </button>
                </div>
                <p className="text-[11px] text-emerald-700 mt-2 font-medium">
                  Expires in 44 hours • Single use only.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
