import { useState } from "react";
import { Search, Download, FileText, IndianRupee, History, Send, X, ArrowUpRight, ArrowDownLeft, ShieldAlert, CheckCircle, XCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import "@/styles/veriwide.css";

const INITIAL_MOCK_LEDGERS = [
  { id: "CUST-001", customer: "Vision Plus", phone: "+91 9876543210", city: "Delhi", current_balance: 45000, credit_limit: 50000, account_status: "Active", last_payment: "2026-10-01" },
  { id: "CUST-002", customer: "Clear Optics", phone: "+91 8765432109", city: "Pune", current_balance: 12500, credit_limit: 20000, account_status: "Active", last_payment: "2026-10-04" },
  { id: "CUST-003", customer: "Sunshine Eyewear", phone: "+91 7654321098", city: "Mumbai", current_balance: 62000, credit_limit: 50000, account_status: "Hold", last_payment: "2026-09-15" }, 
  { id: "CUST-004", customer: "City Optics", phone: "+91 6543210987", city: "Jaipur", current_balance: 8900, credit_limit: 15000, account_status: "Active", last_payment: "2026-10-05" },
  { id: "CUST-005", customer: "Rajat Vision", phone: "+91 5432109876", city: "Delhi", current_balance: 0, credit_limit: 30000, account_status: "Active", last_payment: "2026-10-06" }, 
];

const MOCK_LEDGER_ENTRIES = [
  { id: "TXN-101", date: "2026-10-01T10:00", type: "CREDIT", amount: 15000, mode: "Order_Bill", ref: "ORD-9005" },
  { id: "TXN-102", date: "2026-10-02T14:30", type: "DEBIT", amount: 5000, mode: "UPI", ref: "UPI123456" },
  { id: "TXN-103", date: "2026-10-04T09:15", type: "CREDIT", amount: 2500, mode: "Order_Bill", ref: "ORD-9021" },
];

const INITIAL_MOCK_LIMIT_REQUESTS = [
  { id: "REQ-001", customer: "Sunshine Eyewear", city: "Mumbai", current_limit: 50000, requested_amount: 100000, reason: "Festival season bulk orders required", status: "PENDING", date: "2026-10-05T14:30" },
  { id: "REQ-002", customer: "Clear Optics", city: "Pune", current_limit: 20000, requested_amount: 35000, reason: "Expanding new shop, need more credit", status: "PENDING", date: "2026-10-06T09:15" },
];

const MOCK_CHART_DATA = [
  { name: "Mon", amount: 12000 },
  { name: "Tue", amount: 18500 },
  { name: "Wed", amount: 9400 },
  { name: "Thu", amount: 22000 },
  { name: "Fri", amount: 35000 },
  { name: "Sat", amount: 14000 },
  { name: "Sun", amount: 8000 },
];

export function Billing() {
  const [ledgers, setLedgers] = useState(INITIAL_MOCK_LEDGERS);
  const [limitRequests, setLimitRequests] = useState(INITIAL_MOCK_LIMIT_REQUESTS);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("dues");
  
  // Modals state
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Forms State
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [approveAmount, setApproveAmount] = useState("");
  const [approveRemarks, setApproveRemarks] = useState("");

  const tabs = [
    { id: "dues", label: "Outstanding Dues" },
    { id: "all", label: "All Accounts" },
    { id: "hold", label: "Hold / Limit Exceeded" },
    { id: "limit_requests", label: "Limit Requests", badge: limitRequests.filter(r => r.status === "PENDING").length },
  ];

  const filteredLedgers = ledgers.filter(ledger => {
    let matchesTab = true;
    if (activeTab === "dues") matchesTab = ledger.current_balance > 0;
    if (activeTab === "hold") matchesTab = ledger.account_status === "Hold" || ledger.current_balance > ledger.credit_limit;
    
    const matchesSearch = ledger.id.toLowerCase().includes(search.toLowerCase()) || 
                          ledger.customer.toLowerCase().includes(search.toLowerCase()) ||
                          ledger.city.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const totalOutstanding = ledgers.reduce((sum, item) => sum + item.current_balance, 0);
  const totalHoldDue = ledgers.filter(l => l.account_status === "Hold" || l.current_balance > l.credit_limit).reduce((sum, item) => sum + item.current_balance, 0);
  const totalActiveDue = totalOutstanding - totalHoldDue;

  const handleReceiveClick = (customer) => {
    setSelectedCustomer(customer);
    setPaymentAmount(customer.current_balance.toString());
    setShowReceiveModal(true);
  };

  const handleLedgerClick = (customer) => {
    setSelectedCustomer(customer);
    setShowLedgerModal(true);
  };

  const handleApproveClick = (req) => {
    setSelectedRequest(req);
    setApproveAmount(req.requested_amount.toString());
    setApproveRemarks("");
    setShowApproveModal(true);
  };

  const submitPayment = (e) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) return alert("Enter a valid amount");

    setLedgers(prev => prev.map(c => 
      c.id === selectedCustomer.id 
      ? { ...c, current_balance: Math.max(0, c.current_balance - amount), last_payment: new Date().toISOString().split('T')[0] } 
      : c
    ));
    
    setShowReceiveModal(false);
    alert(`₹${amount} received from ${selectedCustomer.customer} via ${paymentMode}`);
  };

  const submitApproveLimit = (e) => {
    e.preventDefault();
    const amount = parseFloat(approveAmount);
    if (!amount || amount <= 0) return alert("Enter a valid amount");

    // Update Request status
    setLimitRequests(prev => prev.map(r => 
      r.id === selectedRequest.id 
      ? { ...r, status: "APPROVED", approved_amount: amount } 
      : r
    ));

    // Also update Customer credit limit
    setLedgers(prev => prev.map(c => 
      c.customer === selectedRequest.customer 
      ? { ...c, credit_limit: amount, account_status: "Active" } // Set active if they were on hold
      : c
    ));

    setShowApproveModal(false);
    alert(`Credit limit for ${selectedRequest.customer} approved at ₹${amount}`);
  };

  const handleRejectLimit = (req) => {
    if (window.confirm(`Are you sure you want to reject the credit limit request from ${req.customer}?`)) {
      setLimitRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: "REJECTED" } : r));
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white text-[12px] p-2 rounded shadow-xl border border-slate-700">
          <p className="font-bold">{label}</p>
          <p>₹{payload[0].value.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ledger & Outstanding Dues</h1>
          <p className="text-[13px] text-slate-500 mt-1">Manage customer khata, limits, and view statements.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button onClick={() => alert("Exporting dues list to CSV...")} className="flex items-center justify-center gap-2 vw-btn-secondary h-10 px-4 w-full sm:w-auto flex-1 sm:flex-none">
            <Download size={16} /> Export Dues
          </button>
          <button onClick={() => alert("Reminders sent to all pending accounts!")} className="flex items-center justify-center gap-2 vw-btn-primary h-10 px-4 w-full sm:w-auto flex-1 sm:flex-none">
            <Send size={16} /> Send Reminders
          </button>
        </div>
      </div>

      {/* Stats Summary with Charts */}
      {activeTab !== "limit_requests" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
          <div className="vw-card p-5 border-l-4 border-l-rose-500 flex flex-col justify-center bg-gradient-to-br from-white to-rose-50/30">
            <p className="text-[13px] font-bold text-slate-500 uppercase tracking-wider">Total Outstanding Due</p>
            <h2 className="text-3xl font-black text-slate-900 mt-2">₹{totalOutstanding.toLocaleString()}</h2>
            
            <div className="mt-4 pt-4 border-t border-slate-100 flex gap-4">
              <div className="flex-1">
                <p className="text-[11px] text-slate-400 font-bold uppercase">Active Dues</p>
                <p className="text-[14px] font-bold text-emerald-600 mt-0.5">₹{totalActiveDue.toLocaleString()}</p>
              </div>
              <div className="flex-1">
                <p className="text-[11px] text-slate-400 font-bold uppercase">Hold Dues</p>
                <p className="text-[14px] font-bold text-rose-600 mt-0.5">₹{totalHoldDue.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 vw-card p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[13px] font-bold text-slate-700 uppercase tracking-wider">Payments Collected (Last 7 Days)</h3>
              <span className="text-[18px] font-black text-emerald-600">₹1,18,900</span>
            </div>
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MOCK_CHART_DATA} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 mt-6 hide-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-1 py-3 mr-8 text-[14px] font-semibold transition-colors relative flex items-center gap-2 ${
              activeTab === tab.id ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
            {tab.badge > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                {tab.badge}
              </span>
            )}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-blue-600 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mt-6 justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search customer, ID or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="mt-6 vw-card overflow-hidden">
        
        {/* Limit Requests View */}
        {activeTab === "limit_requests" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[12px] uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-4 font-bold">Request Details</th>
                  <th className="px-5 py-4 font-bold text-right">Current Limit</th>
                  <th className="px-5 py-4 font-bold text-right">Requested</th>
                  <th className="px-5 py-4 font-bold">Reason</th>
                  <th className="px-5 py-4 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-5 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                          <ShieldAlert size={20} className="text-slate-400" />
                        </div>
                        <h3 className="text-[14px] font-bold text-slate-700">No pending requests</h3>
                        <p className="text-[13px] text-slate-500 mt-1">All credit limit requests have been processed.</p>
                      </div>
                    </td>
                  </tr>
                ) : null}
                {filteredRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="font-bold text-[14px] text-slate-900">{req.customer}</div>
                      <div className="text-[12px] text-slate-500 mt-0.5">{req.city} • {new Date(req.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="font-semibold text-[13px] text-slate-700">₹{req.current_limit.toLocaleString()}</div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="font-bold text-[15px] text-blue-600">₹{req.requested_amount.toLocaleString()}</div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-[12px] text-slate-600 max-w-xs">{req.reason}</p>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleApproveClick(req)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors rounded font-bold text-[12px] border border-emerald-200">
                          <CheckCircle size={14} /> Approve
                        </button>
                        <button onClick={() => handleRejectLimit(req)} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors rounded font-bold text-[12px] border border-rose-200">
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Ledgers View */
          <>
            {/* Mobile View */}
            <div className="block md:hidden">
              {filteredLedgers.length === 0 ? (
                <div className="px-5 py-12 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                    <FileText size={20} className="text-slate-400" />
                  </div>
                  <h3 className="text-[14px] font-bold text-slate-700">No dues found</h3>
                  <p className="text-[13px] text-slate-500 mt-1">All clear for this filter.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredLedgers.map(ledger => (
                    <div key={ledger.id} className="p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-[14px] text-slate-900">{ledger.customer}</div>
                          <div className="text-[12px] text-slate-500 mt-0.5">{ledger.city} • {ledger.phone}</div>
                        </div>
                        {ledger.account_status === "Hold" ? (
                          <span className="px-2 py-1 rounded text-[10px] font-bold uppercase border bg-rose-100 text-rose-700 border-rose-200">Hold</span>
                        ) : (
                          <span className="px-2 py-1 rounded text-[10px] font-bold uppercase border bg-emerald-100 text-emerald-700 border-emerald-200">Active</span>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-end">
                        <div>
                          <div className="text-[11px] text-slate-500">Credit Limit: ₹{ledger.credit_limit.toLocaleString()}</div>
                          {ledger.current_balance > ledger.credit_limit && <div className="text-[11px] font-bold text-rose-600">Limit Exceeded</div>}
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] text-slate-500">Pending Due</div>
                          <div className="font-bold text-[16px] text-rose-600">₹{ledger.current_balance.toLocaleString()}</div>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-2">
                        <button onClick={() => handleReceiveClick(ledger)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors rounded font-bold text-[12px] border border-blue-200">
                          <IndianRupee size={14} /> Receive
                        </button>
                        <button onClick={() => handleLedgerClick(ledger)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 text-slate-700 hover:bg-slate-200 transition-colors rounded font-bold text-[12px] border border-slate-200">
                          <History size={14} /> Statement
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[12px] uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-4 font-bold">Customer Info</th>
                    <th className="px-5 py-4 font-bold">Account Status</th>
                    <th className="px-5 py-4 font-bold">Credit Limit</th>
                    <th className="px-5 py-4 font-bold text-right">Pending Due</th>
                    <th className="px-5 py-4 font-bold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLedgers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-5 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                            <FileText size={20} className="text-slate-400" />
                          </div>
                          <h3 className="text-[14px] font-bold text-slate-700">No dues found</h3>
                          <p className="text-[13px] text-slate-500 mt-1">All clear for this filter.</p>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                  {filteredLedgers.map(ledger => (
                    <tr key={ledger.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="font-bold text-[14px] text-slate-900">{ledger.customer}</div>
                        <div className="text-[12px] text-slate-500 mt-0.5">{ledger.city} • {ledger.phone}</div>
                      </td>
                      <td className="px-5 py-4">
                        {ledger.account_status === "Hold" ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider border bg-rose-100 text-rose-700 border-rose-200">
                            Hold
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider border bg-emerald-100 text-emerald-700 border-emerald-200">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-[13px] text-slate-700">₹{ledger.credit_limit.toLocaleString()}</div>
                        {ledger.current_balance > ledger.credit_limit && (
                          <div className="text-[11px] font-bold text-rose-600 mt-1">Limit Exceeded</div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="font-bold text-[16px] text-rose-600">₹{ledger.current_balance.toLocaleString()}</div>
                        <div className="text-[11px] text-slate-500 font-medium">Last Pay: {new Date(ledger.last_payment).toLocaleDateString()}</div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleReceiveClick(ledger)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors rounded font-bold text-[12px] border border-blue-200 hover:border-blue-600">
                            <IndianRupee size={14} /> Receive
                          </button>
                          <button onClick={() => handleLedgerClick(ledger)} title="View Ledger Statement" className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                            <History size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Receive Payment Modal */}
      {showReceiveModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-[15px] text-slate-800">Receive Payment</h2>
              <button onClick={() => setShowReceiveModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitPayment} className="p-5">
              <div className="mb-4">
                <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-1">Customer</label>
                <div className="font-semibold text-slate-900">{selectedCustomer.customer}</div>
                <div className="text-[12px] text-rose-600 font-bold mt-1">Pending Due: ₹{selectedCustomer.current_balance.toLocaleString()}</div>
              </div>

              <div className="mb-4">
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Amount Received (₹)</label>
                <input 
                  type="number" 
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[14px] focus:outline-none focus:border-blue-500 font-semibold"
                  autoFocus
                />
              </div>

              <div className="mb-6">
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Payment Mode</label>
                <select 
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / PhonePe / GPay</option>
                  <option value="NEFT">NEFT / RTGS</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowReceiveModal(false)} className="flex-1 vw-btn-secondary h-10">Cancel</button>
                <button type="submit" className="flex-1 vw-btn-primary h-10">Submit Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve Limit Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-[15px] text-slate-800">Approve Credit Limit</h2>
              <button onClick={() => setShowApproveModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitApproveLimit} className="p-5">
              <div className="mb-4">
                <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-1">Customer</label>
                <div className="font-semibold text-slate-900">{selectedRequest.customer}</div>
                <div className="text-[12px] text-slate-500 mt-1">Current Limit: ₹{selectedRequest.current_limit.toLocaleString()}</div>
              </div>

              <div className="mb-4">
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Approve Amount (₹)</label>
                <p className="text-[11px] text-blue-600 mb-2 font-medium">Customer requested ₹{selectedRequest.requested_amount.toLocaleString()}</p>
                <input 
                  type="number" 
                  value={approveAmount}
                  onChange={e => setApproveAmount(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[14px] focus:outline-none focus:border-emerald-500 font-semibold"
                  autoFocus
                />
              </div>

              <div className="mb-6">
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Remarks (Optional)</label>
                <input 
                  type="text" 
                  value={approveRemarks}
                  onChange={e => setApproveRemarks(e.target.value)}
                  placeholder="E.g. Approved for festive season"
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowApproveModal(false)} className="flex-1 vw-btn-secondary h-10">Cancel</button>
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] rounded-lg h-10 transition-colors">Confirm Approval</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ledger Statement Modal */}
      {showLedgerModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-[18px] text-slate-900">Ledger Statement</h2>
                <div className="text-[13px] text-slate-500 mt-0.5">{selectedCustomer.customer} • {selectedCustomer.city}</div>
              </div>
              <button onClick={() => setShowLedgerModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-5 bg-slate-50 border-b border-slate-100 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase">Current Balance</p>
                <div className="text-[18px] font-bold text-rose-600">₹{selectedCustomer.current_balance.toLocaleString()}</div>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase">Credit Limit</p>
                <div className="text-[15px] font-bold text-slate-700">₹{selectedCustomer.credit_limit.toLocaleString()}</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-4">Recent Transactions</h3>
              <div className="space-y-4">
                {MOCK_LEDGER_ENTRIES.map(txn => (
                  <div key={txn.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${txn.type === 'DEBIT' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {txn.type === 'DEBIT' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div className="font-bold text-[14px] text-slate-800">{txn.type === 'DEBIT' ? 'Payment Received' : 'Order Bill Generated'}</div>
                        <div className={`font-bold text-[14px] ${txn.type === 'DEBIT' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {txn.type === 'DEBIT' ? '-' : '+'}₹{txn.amount.toLocaleString()}
                        </div>
                      </div>
                      <div className="flex justify-between items-end mt-1">
                        <div className="text-[12px] text-slate-500">Ref: {txn.ref} • {txn.mode}</div>
                        <div className="text-[11px] text-slate-400 font-medium">{new Date(txn.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-white">
              <button className="w-full vw-btn-secondary h-10 flex items-center justify-center gap-2">
                <Download size={16} /> Download PDF Statement
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
