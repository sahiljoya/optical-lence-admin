import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Link as LinkIcon, UserPlus, FileText, Loader2 } from "lucide-react";
import { customerService } from "@/services/customerService";
import "@/styles/veriwide.css";

export function CustomerOnboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("direct"); // "direct" | "invite"
  const [inviteLink, setInviteLink] = useState("");
  const [isPending, setIsPending] = useState(false);

  const [formData, setFormData] = useState({
    company_name: "", name: "", phone: "", email: "", address: "", city: "", state: "", pincode: "", gst_no: "", adhar_number: "", pan_number: ""
  });
  
  const [inviteData, setInviteData] = useState({ name: "", phone: "", email: "" });

  const handleGenerateLink = async (e) => {
    e.preventDefault();
    setIsPending(true);
    try {
      const res = await customerService.generateInvite(inviteData);
      setInviteLink(res.data.link);
    } finally {
      setIsPending(false);
    }
  };

  const handleDirectSubmit = async (e) => {
    e.preventDefault();
    setIsPending(true);
    try {
      await customerService.createCustomer(formData);
      alert("Customer Onboarding submitted! Sent to Accounts Team for Verification.");
      navigate({ to: "/customers" });
    } catch (err) {
      alert("Failed to submit.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-2">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-5">
        <Link to="/customers" className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Onboard New Customer</h1>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Register a new B2B client or generate an invite link.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4 border-b border-border">
        <button 
          onClick={() => setActiveTab("direct")}
          className={`flex items-center gap-2 px-5 py-2.5 text-[14px] font-medium transition-colors border-b-2 -mb-[1px] ${activeTab === "direct" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <UserPlus size={16} /> Direct Registration
        </button>
        <button 
          onClick={() => setActiveTab("invite")}
          className={`flex items-center gap-2 px-5 py-2.5 text-[14px] font-medium transition-colors border-b-2 -mb-[1px] ${activeTab === "invite" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <LinkIcon size={16} /> Generate Invite Link
        </button>
      </div>

      <div className="vw-card flex flex-col" style={{ padding: 0 }}>

        
        {activeTab === "direct" && (
          <div className="p-5 sm:p-6">
            <div className="mb-5 pb-5 border-b border-border">
              <h2 className="text-[16px] font-bold text-foreground mb-1">Mode A: Staff On-Field Registration</h2>
              <p className="text-[13px] text-muted-foreground">Fill out all customer details. After submission, it will go to the Accounts Team for verification.</p>
            </div>

            <form onSubmit={handleDirectSubmit} className="space-y-6">
              {/* Section 1: Basic Details */}
              <div>
                <h3 className="text-[12px] font-bold text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-2"><UserPlus size={14}/> Basic Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <label className="block text-[13px] font-medium text-foreground mb-1.5">Company / Shop Name <span className="text-destructive">*</span></label>
                    <input required value={formData.company_name} onChange={e=>setFormData({...formData, company_name: e.target.value})} type="text" className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-[13px] bg-background" placeholder="Vision Plus" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-foreground mb-1.5">Owner Name <span className="text-destructive">*</span></label>
                    <input required value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} type="text" className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-[13px] bg-background" placeholder="Rahul Sharma" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-foreground mb-1.5">Phone Number <span className="text-destructive">*</span></label>
                    <input required value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} type="tel" className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-[13px] bg-background" placeholder="9876543210" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-foreground mb-1.5">Email Address</label>
                    <input value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} type="email" className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-[13px] bg-background" placeholder="rahul@example.com" />
                  </div>
                </div>
              </div>

              {/* Section 2: KYC & Location */}
              <div className="pt-4 border-t border-border">
                <h3 className="text-[12px] font-bold text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-2"><FileText size={14}/> KYC & Location</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                  <div className="md:col-span-3">
                    <label className="block text-[13px] font-medium text-foreground mb-1.5">Full Address</label>
                    <input value={formData.address} onChange={e=>setFormData({...formData, address: e.target.value})} type="text" className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-[13px] bg-background" placeholder="Shop No. 5, Main Market" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-foreground mb-1.5">City</label>
                    <input value={formData.city} onChange={e=>setFormData({...formData, city: e.target.value})} type="text" className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-[13px] bg-background" placeholder="Mumbai" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-foreground mb-1.5">State</label>
                    <input value={formData.state} onChange={e=>setFormData({...formData, state: e.target.value})} type="text" className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-[13px] bg-background" placeholder="Maharashtra" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-foreground mb-1.5">Pincode</label>
                    <input value={formData.pincode} onChange={e=>setFormData({...formData, pincode: e.target.value})} type="text" className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-[13px] bg-background" placeholder="400001" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-foreground mb-1.5">GST Number</label>
                    <input value={formData.gst_no} onChange={e=>setFormData({...formData, gst_no: e.target.value})} type="text" className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-[13px] bg-background" placeholder="27XXXXX1234X1ZX" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-foreground mb-1.5">Aadhaar Number</label>
                    <input value={formData.adhar_number} onChange={e=>setFormData({...formData, adhar_number: e.target.value})} type="text" className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-[13px] bg-background" placeholder="1234 5678 9012" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-foreground mb-1.5">PAN Number</label>
                    <input value={formData.pan_number} onChange={e=>setFormData({...formData, pan_number: e.target.value})} type="text" className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-[13px] bg-background" placeholder="ABCDE1234F" />
                  </div>
                </div>
              </div>
              
              <div className="pt-5 flex items-center justify-end gap-3 border-t border-border mt-6">
                <Link to="/customers" className="vw-btn-secondary h-9 px-5 border-transparent bg-transparent hover:bg-accent hover:border-border transition-colors text-[13px]">Cancel</Link>
                <button disabled={isPending} type="submit" className="vw-btn-primary h-9 px-6 flex items-center gap-2 text-[13px]">
                  {isPending ? <Loader2 size={16} className="animate-spin" /> : null} Submit to Verification
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "invite" && (
          <div className="p-5 sm:p-6">
            <div className="mb-5 pb-5 border-b border-border">
              <h2 className="text-[16px] font-bold text-foreground mb-1">Mode B: Invitation Link</h2>
              <p className="text-[13px] text-muted-foreground">Generate a unique, 1-time use link valid for 44 hours. Send this to the customer so they can fill their own KYC details.</p>
            </div>

            <form onSubmit={handleGenerateLink} className="max-w-md space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-foreground mb-1.5">Customer Name <span className="text-destructive">*</span></label>
                <input required value={inviteData.name} onChange={e=>setInviteData({...inviteData, name: e.target.value})} type="text" className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-[13px] bg-background" placeholder="Customer Name" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-foreground mb-1.5">Customer Phone <span className="text-destructive">*</span></label>
                <input required value={inviteData.phone} onChange={e=>setInviteData({...inviteData, phone: e.target.value})} type="tel" className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-[13px] bg-background" placeholder="9876543210" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-foreground mb-1.5">Customer Email <span className="text-muted-foreground font-normal">(Optional)</span></label>
                <input value={inviteData.email} onChange={e=>setInviteData({...inviteData, email: e.target.value})} type="email" className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-[13px] bg-background" placeholder="customer@example.com" />
              </div>
              
              <div className="pt-3">
                <button disabled={isPending} type="submit" className="w-full vw-btn-primary h-10 flex items-center justify-center gap-2 text-[13px]">
                  {isPending ? <Loader2 size={16} className="animate-spin" /> : <LinkIcon size={16} />} Generate Invite Link
                </button>
              </div>
            </form>

            {inviteLink && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="text-[13px] font-bold text-green-800 mb-2">Invite Link Generated Successfully!</h4>
                <div className="flex items-center gap-2">
                  <input readOnly value={inviteLink} className="flex-1 px-3 py-2 bg-white border border-green-200 rounded-md text-[13px] text-green-900 outline-none focus:outline-none" />
                  <button onClick={() => navigator.clipboard.writeText(inviteLink)} className="px-4 py-2 bg-green-600 text-white rounded-md text-[13px] font-medium hover:bg-green-700 transition-colors">Copy</button>
                </div>
                <p className="text-[11px] text-green-700 mt-2 font-medium">Expires in 44 hours. Single use only.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
