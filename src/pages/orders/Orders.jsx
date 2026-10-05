import { useState } from "react";
import { Search, Filter, Download, Eye, Truck, MoreHorizontal, PackageOpen } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import "@/styles/veriwide.css";

const MOCK_ORDERS = [
  { id: "ORD-9021", customer: "Vision Plus", city: "Delhi", date: "2026-10-05", amount: 4500, status: "pending", items: 45 },
  { id: "ORD-9020", customer: "Clear Optics", city: "Pune", date: "2026-10-05", amount: 1200, status: "processing", items: 12 },
  { id: "ORD-9018", customer: "Sunshine Eyewear", city: "Mumbai", date: "2026-10-04", amount: 12400, status: "shipped", items: 120 },
  { id: "ORD-9015", customer: "City Optics", city: "Jaipur", date: "2026-10-03", amount: 8900, status: "delivered", items: 80 },
  { id: "ORD-9010", customer: "Rajat Vision", city: "Delhi", date: "2026-10-02", amount: 3200, status: "cancelled", items: 30 },
  { id: "ORD-9005", customer: "Vision Plus", city: "Delhi", date: "2026-10-01", amount: 15600, status: "delivered", items: 150 },
];

const STATUS_CONFIG = {
  pending: { label: "Pending", bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
  processing: { label: "Processing", bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  shipped: { label: "Shipped", bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
  delivered: { label: "Delivered", bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
  cancelled: { label: "Cancelled", bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200" },
};

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider border ${config.bg} ${config.text} ${config.border}`}>
      {config.label}
    </span>
  );
}

export function Orders() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [filterDate, setFilterDate] = useState("this_month");
  
  const tabs = [
    { id: "all", label: "All Orders" },
    { id: "pending", label: "Pending" },
    { id: "processing", label: "Processing" },
    { id: "shipped", label: "Shipped" },
    { id: "delivered", label: "Delivered" },
  ];

  const filteredOrders = MOCK_ORDERS.filter(o => {
    const matchesTab = activeTab === "all" || o.status === activeTab;
    const matchesSearch = o.id.toLowerCase().includes(search.toLowerCase()) || 
                          o.customer.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-[13px] text-slate-500 mt-1">Manage all B2B orders, track shipments, and process fulfillments.</p>
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
                <th className="py-3.5 px-5 font-bold text-slate-500 tracking-wide uppercase text-[11px]">Date</th>
                <th className="py-3.5 px-5 font-bold text-slate-500 tracking-wide uppercase text-[11px] text-center">Status</th>
                <th className="py-3.5 px-5 font-bold text-slate-500 tracking-wide uppercase text-[11px] text-right">Amount</th>
                <th className="py-3.5 px-5 font-bold text-slate-500 tracking-wide uppercase text-[11px] w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? filteredOrders.map((o) => (
                <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                  <td className="py-4 px-5">
                    <div className="font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-2">
                      {o.id}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                      <PackageOpen size={12} /> {o.items} items
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <div className="font-bold text-slate-800">{o.customer}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{o.city}</div>
                  </td>
                  <td className="py-4 px-5 font-medium text-slate-600">
                    {new Date(o.date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="py-4 px-5 text-center">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="py-4 px-5 text-right">
                    <div className="font-bold text-slate-800 text-[14px]">₹{o.amount.toLocaleString('en-IN')}</div>
                    {o.status === "pending" && <div className="text-[10px] text-rose-500 font-bold mt-0.5 uppercase">Unpaid</div>}
                    {["shipped", "delivered"].includes(o.status) && <div className="text-[10px] text-emerald-600 font-bold mt-0.5 uppercase">Paid</div>}
                  </td>
                  <td className="py-4 px-5 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="View Order">
                        <Eye size={16} />
                      </button>
                      <button className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Update Status">
                        <MoreHorizontal size={16} />
                      </button>
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
