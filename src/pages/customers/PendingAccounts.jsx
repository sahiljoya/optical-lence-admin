import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle, Clock, ShieldCheck, X, Loader2, AlertCircle } from "lucide-react";
import { customerService } from "@/services/customerService";
import { StatusPill } from "@/components/common/StatusPill";
import "@/styles/veriwide.css";

export function PendingAccounts() {
  const navigate = useNavigate();
  const [pendingCustomers, setPendingCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formData, setFormData] = useState({
    pricing_tier: "stock_a",
    stock_grade: "Medium",
    account_status: "Hold",
    payment_term: "cash",
    credit_limit: 50000
  });

  const fetchPending = async () => {
    setLoading(true);
    const res = await customerService.getCustomers();
    setPendingCustomers(res.data.list.filter(c => c.approval_status === "PENDING_ACCOUNTS"));
    setLoading(false);
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleVerify = async (e) => {
    e.preventDefault();
    setIsPending(true);
    try {
      await customerService.approveCustomer(selectedCustomer.id, formData);
      setSelectedCustomer(null);
      fetchPending();
    } catch(err) {
      alert("Failed to approve");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mt-2 mb-4">
        <div className="flex items-center gap-4">
          <Link to="/customers" className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>Pending Approvals</h1>
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Review onboarding requests and assign pricing tiers before activation.</p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-[13px] bg-accent/50 px-4 py-2 rounded-lg border border-border">
          <div className="flex flex-col">
            <span className="text-muted-foreground">Total Pending</span>
            <span className="font-bold text-foreground text-[15px]">{pendingCustomers.length}</span>
          </div>
          <div className="h-8 w-px bg-border"></div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Needs Verification</span>
            <span className="font-bold text-amber-600 text-[15px]">{pendingCustomers.length}</span>
          </div>
        </div>
      </div>

      <div className="vw-card flex flex-col mt-2" style={{ padding: 0, overflow: "hidden" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ fontSize: 13, borderCollapse: "collapse" }}>
            <thead style={{ background: "var(--soft-bg)", borderBottom: "1px solid var(--divider)" }}>
              <tr>
                <th className="py-3 px-4 font-semibold text-muted-foreground">Customer Info</th>
                <th className="py-3 px-4 font-semibold text-muted-foreground">Contact</th>
                <th className="py-3 px-4 font-semibold text-muted-foreground">Location</th>
                <th className="py-3 px-4 font-semibold text-muted-foreground">Submitted</th>
                <th className="py-3 px-4 font-semibold text-muted-foreground">Status</th>
                <th className="py-3 px-4 font-semibold text-muted-foreground text-right w-32">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">Loading pending requests...</td>
                </tr>
              ) : pendingCustomers.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--divider)", transition: "background 0.2s" }} className="hover:bg-accent/50">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-foreground">{c.company_name || c.company || "Unknown Company"}</div>
                    <div className="font-medium mt-0.5" style={{ color: "var(--primary)", fontSize: 12 }}>{c.id}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-foreground">{c.name}</div>
                    <div className="text-muted-foreground mt-0.5" style={{ fontSize: 12 }}>{c.phone}</div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{c.city || "-"}</td>
                  <td className="py-3 px-4">
                    <div className="text-foreground">{c.created_at || c.date}</div>
                    <div className="text-muted-foreground mt-0.5" style={{ fontSize: 12 }}>Just now</div>
                  </td>
                  <td className="py-3 px-4">
                    <StatusPill status="pending_approval" />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button 
                      onClick={() => setSelectedCustomer(c)}
                      className="vw-btn-primary h-8 px-3 text-[12px] whitespace-nowrap"
                    >
                      Review & Verify
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && pendingCustomers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-4">
                        <CheckCircle className="text-green-600" size={24} />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900">No Pending Approvals</h3>
                      <p className="text-slate-500 text-sm mt-1 max-w-sm">All customer onboarding requests have been reviewed and processed.</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-blue-600" size={24} />
                <h2 className="text-lg font-bold text-slate-900">Verify & Approve Account</h2>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <h3 className="text-sm font-bold text-blue-900 mb-2">Customer Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-blue-700">Company:</span> <span className="font-semibold">{selectedCustomer.company_name || selectedCustomer.company}</span></div>
                  <div><span className="text-blue-700">Name:</span> <span className="font-semibold">{selectedCustomer.name}</span></div>
                  <div><span className="text-blue-700">Phone:</span> <span className="font-semibold">{selectedCustomer.phone}</span></div>
                  <div><span className="text-blue-700">City:</span> <span className="font-semibold">{selectedCustomer.city}</span></div>
                  <div className="col-span-2"><span className="text-blue-700">GST:</span> <span className="font-semibold">{selectedCustomer.gst_no || selectedCustomer.gst}</span></div>
                </div>
              </div>

              <form id="verifyForm" onSubmit={handleVerify} className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Assign Business Settings</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Pricing Tier *</label>
                    <select value={formData.pricing_tier} onChange={e => setFormData({...formData, pricing_tier: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                      <option value="courier">Courier</option>
                      <option value="stock_a">Stock A</option>
                      <option value="stock_a_plus">Stock A+</option>
                      <option value="stock_platinum">Stock Platinum</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Stock Grade</label>
                    <select value={formData.stock_grade} onChange={e => setFormData({...formData, stock_grade: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">Initial Account Status</label>
                    <select value={formData.account_status} onChange={e => setFormData({...formData, account_status: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                      <option value="Hold">Hold</option>
                      <option value="Cash">Cash</option>
                      <option value="Credit">Credit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Payment Term</label>
                    <select value={formData.payment_term} onChange={e => setFormData({...formData, payment_term: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                      <option value="cash">Cash</option>
                      <option value="1_week">1 Week</option>
                      <option value="1_month">1 Month</option>
                      <option value="credit_on_bills">Credit on Bills</option>
                      <option value="one_time">One Time</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Credit Limit (₹)</label>
                    <input required type="number" value={formData.credit_limit} onChange={e => setFormData({...formData, credit_limit: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-border bg-soft-bg flex items-center justify-end gap-3">
              <button onClick={() => setSelectedCustomer(null)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent rounded-lg transition-colors">Cancel</button>
              <button disabled={isPending} type="submit" form="verifyForm" className="vw-btn-primary h-9 px-5 flex items-center gap-2">
                {isPending ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Sign-Off & Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
