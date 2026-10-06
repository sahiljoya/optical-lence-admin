import { useState } from "react";
import { Search, Filter, Download, PackageOpen } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderActions } from "./components/OrderActions";
import "@/styles/veriwide.css";

const INITIAL_MOCK_ORDERS = [
  { id: "ORD-9021", customer: "Vision Plus", city: "Delhi", date: "2026-10-06T18:30:00Z", amount: 4500, status: "pending", items: 45, isUrgent: true, placedBy: "Ramesh (Staff)", trackingId: "" },
  { id: "ORD-9020", customer: "Clear Optics", city: "Pune", date: "2026-10-05T10:15:00Z", amount: 1200, status: "blocked", items: 12, isUrgent: false, placedBy: "Owner", blockReason: "Credit Limit Exceeded", trackingId: "" },
  { id: "ORD-9018", customer: "Sunshine Eyewear", city: "Mumbai", date: "2026-10-04T14:20:00Z", amount: 12400, status: "processing", items: 120, isUrgent: true, placedBy: "Owner", trackingId: "" },
  { id: "ORD-9015", customer: "City Optics", city: "Jaipur", date: "2026-10-03T09:00:00Z", amount: 8900, status: "shipped", items: 80, isUrgent: false, placedBy: "Suresh (Staff)", trackingId: "BLUEDART8921" },
  { id: "ORD-9010", customer: "Rajat Vision", city: "Delhi", date: "2026-10-02T16:45:00Z", amount: 3200, status: "delivered", items: 30, isUrgent: false, placedBy: "Owner", trackingId: "DELHIVERY445" },
  { id: "ORD-9005", customer: "Vision Plus", city: "Delhi", date: "2026-10-01T11:30:00Z", amount: 15600, status: "delivered", items: 150, isUrgent: false, placedBy: "Owner", trackingId: "BLUEDART8900" },
];

const STATUS_CONFIG = {
  pending: { label: "New Order", bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  blocked: { label: "On Hold", bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200" },
  processing: { label: "Picking", bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
  shipped: { label: "Dispatched", bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
  delivered: { label: "Delivered", bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
  cancelled: { label: "Cancelled", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
};

function StatusBadge({ status, reason, trackingId }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`inline-flex items-center px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider border ${config.bg} ${config.text} ${config.border}`}>
        {config.label}
      </span>
      {status === "blocked" && <span className="text-[10px] text-rose-500 font-semibold">{reason}</span>}
      {status === "shipped" && trackingId && <span className="text-[9px] text-slate-500 font-mono mt-0.5">{trackingId}</span>}
    </div>
  );
}

export function Orders() {
  const [orders, setOrders] = useState(INITIAL_MOCK_ORDERS);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [filterDate, setFilterDate] = useState("this_month");
  
  const tabs = [
    { id: "all", label: "All Orders" },
    { id: "pending", label: "New Orders" },
    { id: "blocked", label: "On Hold (Credit)" },
    { id: "processing", label: "Picking" },
    { id: "shipped", label: "Dispatched" },
    { id: "delivered", label: "Delivered" },
  ];

  const filteredOrders = orders.filter(o => {
    const matchesTab = activeTab === "all" || o.status === activeTab;
    const matchesSearch = o.id.toLowerCase().includes(search.toLowerCase()) || 
                          o.customer.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleUpdateOrder = (updatedOrder) => {
    setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
  };

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders & Dispatch</h1>
          <p className="text-[13px] text-slate-500 mt-1">Manage B2B orders, urgent deliveries, picking, and credit holds.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button className="flex items-center justify-center gap-2 vw-btn-secondary h-10 px-4 w-full sm:w-auto flex-1 sm:flex-none">
            <Download size={16} /> Export
          </button>
          <button className="flex items-center justify-center gap-2 vw-btn-primary h-10 px-4 w-full sm:w-auto flex-1 sm:flex-none">
            + New Order
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 mt-6 hide-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-1 py-3 mr-8 text-[14px] font-semibold transition-colors relative ${
              activeTab === tab.id ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-blue-600 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Filters and Table Card */}
      <div className="vw-card flex flex-col mt-4" style={{ padding: 0, overflow: "hidden" }}>
        
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <label className="flex items-center gap-2 w-full sm:max-w-[320px] h-[38px] px-3 bg-slate-50 border border-slate-200 rounded-lg focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-shadow">
              <Search size={16} className="text-slate-400" />
              <input 
                value={search} onChange={e => setSearch(e.target.value)}
                className="flex-1 w-full bg-transparent outline-none text-[13px] text-slate-800 placeholder:text-slate-400" placeholder="Search order ID, customer..." 
              />
            </label>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter size={16} className="text-slate-400 hidden sm:block" />
              <Select value={filterDate} onValueChange={setFilterDate}>
                <SelectTrigger className="h-[38px] w-full sm:w-[150px] rounded-lg text-[13px] border-slate-200 bg-slate-50"><SelectValue placeholder="Date Range" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ fontSize: 13, borderCollapse: "collapse" }}>
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-5 font-bold text-slate-500 tracking-wide uppercase text-[11px]">Order Details</th>
                <th className="py-3.5 px-5 font-bold text-slate-500 tracking-wide uppercase text-[11px]">Customer</th>
                <th className="py-3.5 px-5 font-bold text-slate-500 tracking-wide uppercase text-[11px]">Date & Time</th>
                <th className="py-3.5 px-5 font-bold text-slate-500 tracking-wide uppercase text-[11px] text-center">Status</th>
                <th className="py-3.5 px-5 font-bold text-slate-500 tracking-wide uppercase text-[11px] text-right">Amount (Incl. Tax)</th>
                <th className="py-3.5 px-5 font-bold text-slate-500 tracking-wide uppercase text-[11px] w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? filteredOrders.map((o) => (
                <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                  <td className="py-4 px-5">
                    <div className="font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-2">
                      <Link to={`/orders/${o.id}`} className="hover:underline">{o.id}</Link>
                      {o.isUrgent && <span className="bg-rose-100 text-rose-600 text-[9px] px-1.5 py-0.5 rounded-sm uppercase tracking-wide border border-rose-200">Urgent</span>}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex flex-col gap-0.5">
                      <span className="flex items-center gap-1"><PackageOpen size={12} /> {o.items} items</span>
                      <span className="text-slate-400">By: {o.placedBy}</span>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <div className="font-bold text-slate-800">{o.customer}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{o.city}</div>
                  </td>
                  <td className="py-4 px-5 font-medium text-slate-600">
                    <div className="text-[13px]">{new Date(o.date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    <div className="text-[11px] text-slate-400">{new Date(o.date).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="py-4 px-5 text-center">
                    <StatusBadge status={o.status} reason={o.blockReason} />
                  </td>
                  <td className="py-4 px-5 text-right">
                    <div className="font-bold text-slate-800 text-[14px]">₹{o.amount.toLocaleString('en-IN')}</div>
                    {o.isUrgent && <div className="text-[10px] text-slate-400 mt-0.5">+ Surcharge</div>}
                  </td>
                  <td className="py-4 px-5 text-center">
                    <div className="flex items-center justify-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <OrderActions order={o} onUpdate={handleUpdateOrder} />
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <PackageOpen size={32} className="mx-auto text-slate-300 mb-3" />
                    <p className="font-medium">No orders found.</p>
                    <p className="text-[12px] mt-1">Try adjusting your filters or search term.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
