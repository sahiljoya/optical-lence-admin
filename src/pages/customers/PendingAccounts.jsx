import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { 
  ArrowLeft, CheckCircle, Clock, ShieldCheck, X, Loader2, AlertCircle,
  User, Eye, XCircle, FileText, MapPin, Phone, Mail, Building, Image as ImageIcon, AlertTriangle
} from "lucide-react";
import { customerService } from "@/services/customerService";
import { StatusPill } from "@/components/common/StatusPill";
import { notify } from "@/lib/notify";
import { hasPermission } from "@/lib/permissions";
import "@/styles/veriwide.css";

export function PendingAccounts() {
  const navigate = useNavigate();
  const [pendingCustomers, setPendingCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [formData, setFormData] = useState({
    pricing_tier: "stock_a",
    stock_grade: "Medium",
    account_status: "Credit",
    payment_term: "cash",
    credit_limit: 0
  });

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await customerService.getPendingCustomers({});
      setPendingCustomers(res.data.list.map(c => ({ ...c, id: c._id })));
    } catch (err) {
      console.error(err);
      setPendingCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const isOwnerStep = selectedCustomer?.approval_status === "PENDING_OWNER";

  const handleVerify = async (e) => {
    e.preventDefault();
    setIsPending(true);
    try {
      if (isOwnerStep) {
        await customerService.approveOwner(selectedCustomer.id);
      } else {
        await customerService.approveAccounts({ customerId: selectedCustomer.id, ...formData });
      }
      setSelectedCustomer(null);
      fetchPending();
    } catch(err) {
      notify.error(err.message || "Failed to approve");
    } finally {
      setIsPending(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (!rejectReason || !rejectReason.trim()) {
      notify.error("Rejection reason is mandatory.");
      return;
    }
    setIsRejecting(true);
    try {
      await customerService.rejectCustomer({
        customerId: selectedCustomer.id,
        reason: rejectReason
      });
      notify.success(`Customer ${selectedCustomer.company_name || selectedCustomer.name} has been rejected.`);
      setRejectModalOpen(false);
      setRejectReason("");
      setSelectedCustomer(null);
      fetchPending();
    } catch (err) {
      notify.error(err.message || "Failed to reject customer");
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-1 sm:mt-2 mb-3 sm:mb-5 gap-3 sm:gap-4">
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <Link 
            to="/customers" 
            className="p-2 sm:p-2.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 bg-white transition-colors shadow-xs shrink-0 flex items-center justify-center cursor-pointer"
            title="Back to Customers"
          >
            <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-slate-900 truncate">
              Pending Approvals
            </h1>
            <p className="text-[10px] sm:text-xs md:text-[13px] text-slate-500 mt-0.5 sm:mt-1 truncate sm:whitespace-normal">
              Review onboarding requests and assign pricing tiers before activation.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 sm:gap-6 text-xs sm:text-[13px] bg-white border border-slate-200/90 shadow-xs px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl w-full sm:w-auto shrink-0">
          <div className="flex flex-col">
            <span className="text-slate-500 text-[9px] sm:text-[10px] md:text-xs font-medium">Total Pending</span>
            <span className="font-bold text-slate-800 text-xs sm:text-sm md:text-[15px]">{pendingCustomers.length}</span>
          </div>
          <div className="hidden sm:block h-7 sm:h-8 w-px bg-slate-200"></div>
          <div className="flex flex-col border-l border-slate-200 sm:border-l-0 pl-3 sm:pl-0">
            <span className="text-slate-500 text-[9px] sm:text-[10px] md:text-xs font-medium">Needs Verification</span>
            <span className="font-bold text-amber-600 text-xs sm:text-sm md:text-[15px]">{pendingCustomers.length}</span>
          </div>
        </div>
      </div>

      <div className="vw-card flex flex-col mt-2.5 sm:mt-4 overflow-hidden" style={{ padding: 0 }}>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[680px] sm:min-w-[720px] text-[11px] sm:text-xs md:text-[13px]" style={{ borderCollapse: "collapse" }}>
            <thead style={{ background: "var(--soft-bg)", borderBottom: "1px solid var(--divider)" }}>
              <tr className="text-[9px] sm:text-[10px] md:text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="py-2.5 sm:py-3 px-3 sm:px-4">Customer Info</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4">Contact</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4">Location</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4">Submitted</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4">Status</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-right w-32">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 sm:py-10 text-center text-slate-400 text-[11px] sm:text-xs md:text-sm">Loading pending requests...</td>
                </tr>
              ) : pendingCustomers.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--divider)", transition: "background 0.2s" }} className="hover:bg-accent/50">
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4">
                    <div className="font-semibold text-slate-800 text-[11px] sm:text-xs md:text-[13px]">{c.company_name || c.company || "Unknown Company"}</div>
                    <div className="font-medium mt-0.5 text-[9px] sm:text-[10px] md:text-xs font-mono" style={{ color: "var(--primary)" }}>{c.id}</div>
                  </td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4">
                    <div className="font-semibold text-slate-800 text-[11px] sm:text-xs md:text-[13px]">{c.name}</div>
                    <div className="text-slate-500 mt-0.5 text-[9px] sm:text-[10px] md:text-xs font-mono">{c.phone}</div>
                  </td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-slate-600 text-[10px] sm:text-xs md:text-[13px]">{c.city || "-"}</td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4">
                    <div className="text-slate-700 text-[10px] sm:text-xs md:text-[13px] font-mono">{c.created_at || c.date}</div>
                    <div className="text-slate-400 mt-0.5 text-[9px] sm:text-[10px] md:text-xs">Just now</div>
                  </td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4">
                    <StatusPill status="pending_approval" />
                    <div className="text-slate-500 mt-1 text-[9px] sm:text-[10px] md:text-[11px]">
                      {c.approval_status === "PENDING_OWNER" ? "Awaiting Owner sign-off" : "Awaiting Accounts sign-off"}
                    </div>
                  </td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-right">
                    {hasPermission("APPROVE_CUSTOMER") ? (
                      <button
                        onClick={() => setSelectedCustomer(c)}
                        className="vw-btn-primary h-7 sm:h-8 px-2.5 sm:px-3 text-[10px] sm:text-[11px] md:text-[12px] font-semibold whitespace-nowrap cursor-pointer rounded-lg shadow-xs"
                      >
                        {c.approval_status === "PENDING_OWNER" ? "Owner Approve" : "Review & Verify"}
                      </button>
                    ) : (
                      <span className="text-[10px] sm:text-[11px] md:text-[12px] text-slate-400 italic">View only</span>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && pendingCustomers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 sm:py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 sm:mb-4">
                        <CheckCircle className="text-emerald-600" size={22} />
                      </div>
                      <h3 className="text-sm sm:text-base md:text-lg font-bold text-slate-900">No Pending Approvals</h3>
                      <p className="text-slate-500 text-[11px] sm:text-xs md:text-sm mt-1 max-w-sm mx-auto">All customer onboarding requests have been reviewed and processed.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[92vh] border border-slate-100">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <ShieldCheck className="text-blue-600 shrink-0 w-5 h-5 sm:w-6 sm:h-6" />
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 truncate">
                    {isOwnerStep ? "Owner Sign-Off" : "Customer Verification & Sign-Off"}
                  </h2>
                  <p className="text-[10px] sm:text-xs text-slate-500 truncate sm:whitespace-normal">
                    Review KYC documents, salesperson info, and assign pricing terms.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCustomer(null)} 
                className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors shrink-0 ml-2 cursor-pointer"
                title="Close"
              >
                <X size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="p-3.5 sm:p-5 lg:p-6 overflow-y-auto space-y-4 sm:space-y-5">
              {/* 1. Salesperson Info Banner */}
              <div className="p-3 sm:p-3.5 bg-indigo-50/80 border border-indigo-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                    <User size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[9px] sm:text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Onboarded By (Salesperson)</div>
                    <div className="font-semibold text-slate-900 text-xs sm:text-[13px] md:text-sm truncate">
                      {selectedCustomer.assigned_salesperson?.name || "Direct / Self-Registered"}
                    </div>
                  </div>
                </div>
                {selectedCustomer.assigned_salesperson ? (
                  <div className="text-left sm:text-right text-[10px] sm:text-[11px] text-slate-600 font-mono">
                    {selectedCustomer.assigned_salesperson.phone && <div>📞 {selectedCustomer.assigned_salesperson.phone}</div>}
                    {selectedCustomer.assigned_salesperson.email && <div className="text-slate-500 text-[10px]">{selectedCustomer.assigned_salesperson.email}</div>}
                  </div>
                ) : (
                  <span className="text-[10px] sm:text-xs text-slate-500 italic">No field salesperson assigned</span>
                )}
              </div>

              {/* 2. Customer Profile & Registration Details */}
              <div className="p-3.5 sm:p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl">
                <h3 className="text-[10px] sm:text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 sm:mb-3 flex items-center gap-1.5">
                  <Building size={14} className="text-blue-600"/> Customer Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3.5 text-xs sm:text-[13px]">
                  <div>
                    <span className="text-slate-500 text-[9px] sm:text-[10px] block uppercase font-medium">Company / Shop</span>
                    <span className="font-bold text-slate-900">{selectedCustomer.company_name || selectedCustomer.company || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[9px] sm:text-[10px] block uppercase font-medium">Contact Person</span>
                    <span className="font-semibold text-slate-800">{selectedCustomer.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[9px] sm:text-[10px] block uppercase font-medium">Phone</span>
                    <span className="font-medium text-slate-800 font-mono">{selectedCustomer.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[9px] sm:text-[10px] block uppercase font-medium">WhatsApp</span>
                    <span className="font-medium text-slate-800 font-mono">{selectedCustomer.whatsapp_number || selectedCustomer.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[9px] sm:text-[10px] block uppercase font-medium">Email</span>
                    <span className="font-medium text-slate-800">{selectedCustomer.email || "Not Provided"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[9px] sm:text-[10px] block uppercase font-medium">GST Number</span>
                    <span className="font-mono font-bold text-slate-800">{selectedCustomer.gst_no || selectedCustomer.gst || "Unregistered"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[9px] sm:text-[10px] block uppercase font-medium">PAN Number</span>
                    <span className="font-mono font-bold text-slate-800">{selectedCustomer.pan_number || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[9px] sm:text-[10px] block uppercase font-medium">Aadhar Number</span>
                    <span className="font-mono font-bold text-slate-800">{selectedCustomer.adhar_number || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[9px] sm:text-[10px] block uppercase font-medium">City / State</span>
                    <span className="font-medium text-slate-800">{selectedCustomer.city || "-"}{selectedCustomer.state ? `, ${selectedCustomer.state}` : ""}</span>
                  </div>
                  <div className="sm:col-span-2 md:col-span-3 pt-2 border-t border-slate-200/60">
                    <span className="text-slate-500 text-[9px] sm:text-[10px] block uppercase font-medium">Full Address</span>
                    <span className="font-medium text-slate-700">
                      {selectedCustomer.address || "Address not specified"} {selectedCustomer.pincode ? `(${selectedCustomer.pincode})` : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. KYC Documents & Uploaded Images Gallery */}
              <div>
                <h3 className="text-[10px] sm:text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 sm:mb-2.5 flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-emerald-600"/> KYC Documents & Images
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
                  {[
                    { label: "GST Certificate", img: selectedCustomer.gst_image },
                    { label: "PAN Card", img: selectedCustomer.pan_image },
                    { label: "Aadhar Card", img: selectedCustomer.adhar_image },
                    { label: "Visiting Card", img: selectedCustomer.visiting_card },
                    { label: "Profile / Shop", img: selectedCustomer.profilePic }
                  ].map((doc, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-xl p-2 bg-slate-50 flex flex-col items-center justify-between text-center min-h-[110px] sm:min-h-[120px] transition-all hover:border-slate-300">
                      <span className="text-[10px] sm:text-[11px] font-semibold text-slate-700 truncate w-full mb-1">{doc.label}</span>
                      {doc.img ? (
                        <div className="relative group w-full h-14 sm:h-16 rounded-lg overflow-hidden border border-slate-200 bg-white">
                          <img src={doc.img} alt={doc.label} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setPreviewImage({ url: doc.img, title: doc.label })}
                            className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1 text-[10px] sm:text-[11px] font-bold cursor-pointer"
                          >
                            <Eye size={13} /> View
                          </button>
                        </div>
                      ) : (
                        <div className="w-full h-14 sm:h-16 rounded-lg border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 bg-white">
                          <FileText size={16} className="mb-0.5 opacity-40" />
                          <span className="text-[9px] sm:text-[10px]">Not Uploaded</span>
                        </div>
                      )}
                      {doc.img && (
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ url: doc.img, title: doc.label })}
                          className="text-[10px] sm:text-[11px] text-blue-600 hover:text-blue-700 font-semibold mt-1 flex items-center gap-1 cursor-pointer"
                        >
                          <Eye size={12} /> View Full
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Business Settings Form (Pricing Tier / Terms) */}
              <form id="verifyForm" onSubmit={handleVerify} className="space-y-3.5 sm:space-y-4 pt-2.5 sm:pt-3 border-t border-slate-100">
                {isOwnerStep ? (
                  <div className="p-3 sm:p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs sm:text-[13px] text-emerald-800">
                    Accounts Team has already signed off with pricing tier <strong className="uppercase">{(selectedCustomer.pricing_tier || "").replace(/_/g, " ")}</strong> and credit limit ₹{selectedCustomer.credit_limit?.toLocaleString()}.
                    Confirm final Owner approval to activate this account.
                  </div>
                ) : (
                <>
                <h3 className="text-[10px] sm:text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Assign Pricing Tier & Terms</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1 sm:mb-1.5">Pricing Tier <span className="text-red-500 font-bold">*</span></label>
                    <select 
                      value={formData.pricing_tier} 
                      onChange={e => setFormData({...formData, pricing_tier: e.target.value})} 
                      className="w-full h-9 sm:h-10 px-3 py-1.5 sm:py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 shadow-xs transition-all cursor-pointer"
                    >
                      <option value="courier">Courier</option>
                      <option value="stock_a">Stock A</option>
                      <option value="stock_a_plus">Stock A+</option>
                      <option value="stock_platinum">Stock Platinum</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1 sm:mb-1.5">Stock Grade</label>
                    <select 
                      value={formData.stock_grade} 
                      onChange={e => setFormData({...formData, stock_grade: e.target.value})} 
                      className="w-full h-9 sm:h-10 px-3 py-1.5 sm:py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 shadow-xs transition-all cursor-pointer"
                    >
                      <option value="Very Big">Very Big</option>
                      <option value="Big">Big</option>
                      <option value="Medium">Medium</option>
                      <option value="Small">Small</option>
                      <option value="Very Small">Very Small</option>
                      <option value="Big Retailer">Big Retailer</option>
                      <option value="Small Retailer">Small Retailer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1 sm:mb-1.5">Initial Account Status</label>
                    <select
                      value={formData.account_status}
                      onChange={e => {
                        const status = e.target.value;
                        setFormData(prev => status === "Cash"
                          ? { ...prev, account_status: status, payment_term: "cash", credit_limit: 0 }
                          : { ...prev, account_status: status });
                      }}
                      className="w-full h-9 sm:h-10 px-3 py-1.5 sm:py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 shadow-xs transition-all cursor-pointer"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Credit">Credit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1 sm:mb-1.5">Payment Term</label>
                    <select
                      value={formData.payment_term}
                      disabled={formData.account_status === "Cash"}
                      onChange={e => setFormData({...formData, payment_term: e.target.value})}
                      className="w-full h-9 sm:h-10 px-3 py-1.5 sm:py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 shadow-xs transition-all disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <option value="cash">Cash</option>
                      <option value="1_week">1 Week</option>
                      <option value="1_month">1 Month</option>
                      <option value="credit_on_bills">Credit on Bills</option>
                      <option value="one_time">One Time</option>
                    </select>
                    {formData.account_status === "Cash" && (
                      <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1">Cash accounts get no credit, so payment term is locked to Cash.</p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1 sm:mb-1.5">Credit Limit (₹)</label>
                    <input
                      required
                      type="number"
                      value={formData.credit_limit}
                      disabled={formData.account_status === "Cash"}
                      onChange={e => setFormData({...formData, credit_limit: e.target.value})}
                      className="w-full h-9 sm:h-10 px-3 py-1.5 sm:py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm font-mono bg-white text-slate-900 shadow-xs transition-all disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                      placeholder="0"
                    />
                    {formData.account_status === "Cash" && (
                      <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1">No credit extended on Cash accounts.</p>
                    )}
                  </div>
                </div>
                </>
                )}
              </form>
            </div>

            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-slate-50/80 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setRejectModalOpen(true)}
                className="w-full sm:w-auto px-4 py-2 text-xs sm:text-[13px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <XCircle size={15} /> Reject Application
              </button>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="w-full sm:w-auto px-4 py-2 text-xs sm:text-[13px] font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors text-center cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={isPending}
                  type="submit"
                  form="verifyForm"
                  className="w-full sm:w-auto vw-btn-primary h-9 sm:h-10 px-5 text-xs sm:text-[13px] font-semibold flex items-center justify-center gap-2 rounded-xl cursor-pointer shadow-xs disabled:opacity-60"
                >
                  {isPending ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />} Sign-Off & Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Confirmation Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 border border-slate-100">
            <div className="p-3.5 sm:p-5 border-b border-rose-100 bg-rose-50/50 flex items-center gap-2.5 sm:gap-3 text-rose-800">
              <AlertTriangle size={20} className="text-rose-600 shrink-0 sm:w-[22px] sm:h-[22px]" />
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-[15px] truncate">Reject Customer Application</h3>
                <p className="text-[10px] sm:text-[12px] text-rose-600 truncate">Reject {selectedCustomer?.company_name || selectedCustomer?.name}'s account.</p>
              </div>
            </div>
            <form onSubmit={handleReject} className="p-3.5 sm:p-5 space-y-3.5 sm:space-y-4">
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Reason for Rejection <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Incomplete GST certificate, unverified shop location, fake details..."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="w-full p-2.5 sm:p-3 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15 shadow-xs transition-all"
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setRejectModalOpen(false); setRejectReason(""); }}
                  className="w-full sm:w-auto px-4 py-2 text-xs sm:text-[13px] font-semibold text-slate-600 hover:bg-slate-100 rounded-xl text-center cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={isRejecting}
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 text-xs sm:text-[13px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {isRejecting ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Confirm Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full-size Image Preview Modal / Lightbox */}
      {previewImage && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-3xl w-full max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2 sm:p-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
              <span className="font-bold text-xs sm:text-sm text-slate-800">{previewImage.title}</span>
              <button onClick={() => setPreviewImage(null)} className="p-1 sm:p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center max-h-[75vh] overflow-auto">
              <img src={previewImage.url} alt={previewImage.title} className="max-w-full max-h-[70vh] object-contain rounded-xl" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
