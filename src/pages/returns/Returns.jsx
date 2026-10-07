import { useState } from "react";
import { Search, Download, Undo2, CheckCircle, XCircle, AlertCircle, RefreshCcw } from "lucide-react";
import "@/styles/veriwide.css";

const INITIAL_MOCK_RETURNS = [
  { id: "RET-1001", orderId: "ORD-9021", customer: "Vision Plus", city: "Delhi", items: 5, status: "PENDING", reason: "Wrong power received", amount: 1500, date: "2026-10-06T10:30" },
  { id: "RET-1002", orderId: "ORD-9018", customer: "Sunshine Eyewear", city: "Mumbai", items: 2, status: "PENDING", reason: "Damaged in transit", amount: 800, date: "2026-10-05T14:20" },
  { id: "RET-1003", orderId: "ORD-9010", customer: "Rajat Vision", city: "Delhi", items: 10, status: "APPROVED", reason: "Quality issue", amount: 3200, date: "2026-10-03T09:15" },
  { id: "RET-1004", orderId: "ORD-9005", customer: "Vision Plus", city: "Delhi", items: 1, status: "REJECTED", reason: "Scratched by customer", amount: 400, date: "2026-10-01T16:45" },
];

export function Returns() {
  const [returns, setReturns] = useState(INITIAL_MOCK_RETURNS);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  
  // Modals state
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);

  // Form State
  const [action, setAction] = useState("approve");
  const [remarks, setRemarks] = useState("");

  const tabs = [
    { id: "pending", label: "Pending Inspection", badge: returns.filter(r => r.status === "PENDING").length },
    { id: "approved", label: "Approved / Refunded" },
    { id: "rejected", label: "Rejected" },
  ];

  const filteredReturns = returns.filter(r => {
    let matchesTab = true;
    if (activeTab === "pending") matchesTab = r.status === "PENDING";
    if (activeTab === "approved") matchesTab = r.status === "APPROVED";
    if (activeTab === "rejected") matchesTab = r.status === "REJECTED";
    
    const matchesSearch = r.id.toLowerCase().includes(search.toLowerCase()) || 
                          r.orderId.toLowerCase().includes(search.toLowerCase()) ||
                          r.customer.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleProcessClick = (ret) => {
    setSelectedReturn(ret);
    setAction("approve");
    setRemarks("");
    setShowProcessModal(true);
  };

  const submitProcess = (e) => {
    e.preventDefault();

    setReturns(prev => prev.map(r => 
      r.id === selectedReturn.id 
      ? { ...r, status: action === "approve" ? "APPROVED" : "REJECTED", remarks: remarks } 
      : r
    ));
    
    setShowProcessModal(false);
    alert(`Return ${selectedReturn.id} has been ${action === "approve" ? "Approved" : "Rejected"}.`);
  };

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Returns & Replacements</h1>
          <p className="text-[13px] text-slate-500 mt-1">Manage customer returns, inspect items, and approve refunds.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button onClick={() => alert("Exporting return logs...")} className="flex items-center justify-center gap-2 vw-btn-secondary h-10 px-4 w-full sm:w-auto flex-1 sm:flex-none">
            <Download size={16} /> Export Logs
          </button>
        </div>
      </div>

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
            {tab.badge !== undefined && tab.badge > 0 && (
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
            placeholder="Search Return ID, Order No or Customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="mt-6 vw-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[12px] uppercase tracking-wider text-slate-500">
                <th className="px-5 py-4 font-bold">Return Info</th>
                <th className="px-5 py-4 font-bold">Customer</th>
                <th className="px-5 py-4 font-bold">Reason</th>
                <th className="px-5 py-4 font-bold text-center">Status</th>
                <th className="px-5 py-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                        <Undo2 size={20} className="text-slate-400" />
                      </div>
                      <h3 className="text-[14px] font-bold text-slate-700">No returns found</h3>
                      <p className="text-[13px] text-slate-500 mt-1">No return requests match this filter.</p>
                    </div>
                  </td>
                </tr>
              ) : null}
              {filteredReturns.map(ret => (
                <tr key={ret.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-5 py-4">
                    <div className="font-bold text-[14px] text-slate-900">{ret.id}</div>
                    <div className="text-[12px] text-blue-600 font-medium mt-0.5 hover:underline cursor-pointer">Ref: {ret.orderId}</div>
                    <div className="text-[11px] text-slate-400 mt-1">{new Date(ret.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-[13px] text-slate-800">{ret.customer}</div>
                    <div className="text-[12px] text-slate-500 mt-0.5">{ret.city}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-[13px] text-slate-700 font-medium">{ret.items} Items Returned</div>
                    <div className="text-[12px] text-rose-600 font-medium mt-1 bg-rose-50 inline-block px-1.5 py-0.5 rounded border border-rose-100">
                      Refund Est: ₹{ret.amount.toLocaleString()}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-1 max-w-[200px]" title={ret.reason}>"{ret.reason}"</p>
                  </td>
                  <td className="px-5 py-4 text-center">
                    {ret.status === "PENDING" && <span className="inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase border bg-amber-100 text-amber-700 border-amber-200"><AlertCircle size={12} className="mr-1 inline" /> Pending Inspect</span>}
                    {ret.status === "APPROVED" && <span className="inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase border bg-emerald-100 text-emerald-700 border-emerald-200"><CheckCircle size={12} className="mr-1 inline" /> Approved</span>}
                    {ret.status === "REJECTED" && <span className="inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase border bg-slate-100 text-slate-500 border-slate-200"><XCircle size={12} className="mr-1 inline" /> Rejected</span>}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {ret.status === "PENDING" && (
                      <button onClick={() => handleProcessClick(ret)} className="mx-auto flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors rounded font-bold text-[12px] border border-blue-200">
                        <RefreshCcw size={14} /> Process
                      </button>
                    )}
                    {ret.status !== "PENDING" && (
                      <span className="text-[12px] text-slate-400 font-medium">{ret.status === "APPROVED" ? "Refunded" : "Closed"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Process Return Modal */}
      {showProcessModal && selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-[15px] text-slate-800">Process Return</h2>
              <button onClick={() => setShowProcessModal(false)} className="text-slate-400 hover:text-slate-700">
                <XCircle size={18} />
              </button>
            </div>
            <form onSubmit={submitProcess} className="p-5">
              <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-[13px] text-slate-900">{selectedReturn.id}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Order: {selectedReturn.orderId}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-slate-500">Refund Value</div>
                    <div className="font-bold text-[14px] text-rose-600">₹{selectedReturn.amount.toLocaleString()}</div>
                  </div>
                </div>
                <div className="mt-3 text-[12px] text-slate-700">
                  <span className="font-semibold">Customer Reason:</span> "{selectedReturn.reason}"
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Action</label>
                <select 
                  value={action}
                  onChange={e => setAction(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value="approve">Approve Return & Add Credit</option>
                  <option value="reject">Reject Return</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Remarks (Internal)</label>
                <input 
                  type="text" 
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="e.g. Scratched during transit, approved"
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowProcessModal(false)} className="flex-1 vw-btn-secondary h-10">Cancel</button>
                <button type="submit" className={`flex-1 text-white font-bold text-[13px] rounded-lg h-10 transition-colors flex items-center justify-center gap-2 ${action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
                  {action === 'approve' ? <CheckCircle size={14} /> : <XCircle size={14} />} 
                  {action === 'approve' ? 'Confirm Approval' : 'Reject Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
