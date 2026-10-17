import { useState, useEffect, useMemo } from "react";
import { 
  Search, Filter, Download, PackageOpen, ChevronLeft, ChevronRight, 
  AlertTriangle, Clock, RefreshCw, Zap, CheckCircle2, Truck, 
  Layers, Boxes, Eye, X
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderActions } from "./components/OrderActions";
import { orderApi } from "@/services/orderApi";
import "@/styles/veriwide.css";

const INITIAL_MOCK_ORDERS = [
  { id: "ORD-9025", customer: "Vision Plus", city: "Delhi", date: "2026-10-17T11:45:00Z", amount: 4500, status: "PLACED", items: 5, totalQty: 45, isUrgent: true, placedBy: "B2B Portal", trackingId: "" },
  { id: "ORD-9024-BO", customer: "Vision Plus", city: "Delhi", date: "2026-10-17T11:45:00Z", amount: 1850, status: "AWAITING_STOCK", items: 2, totalQty: 10, isUrgent: false, isBackorder: true, backorderReason: "Pending -3.50 Sph Stock Arrival", placedBy: "Auto-Split BO", trackingId: "" },
  { id: "ORD-9023", customer: "Clear Optics", city: "Pune", date: "2026-10-17T09:15:00Z", amount: 6200, status: "CONFIRMED", items: 4, totalQty: 28, isUrgent: false, placedBy: "Owner", trackingId: "" },
  { id: "ORD-9022", customer: "Sunshine Eyewear", city: "Mumbai", date: "2026-10-16T14:20:00Z", amount: 12400, status: "PICKING", items: 12, totalQty: 120, isUrgent: true, placedBy: "Ramesh (Staff)", trackingId: "" },
  { id: "ORD-9021", customer: "Metro Vision", city: "Bangalore", date: "2026-10-16T12:00:00Z", amount: 3900, status: "PACKING", items: 3, totalQty: 15, isUrgent: false, placedBy: "Owner", trackingId: "" },
  { id: "ORD-9020", customer: "Clear Optics", city: "Pune", date: "2026-10-15T10:15:00Z", amount: 1200, status: "HOLD", items: 2, totalQty: 12, isUrgent: false, placedBy: "Owner", blockReason: "Credit Limit Exceeded", trackingId: "" },
  { id: "ORD-9019-BO", customer: "Eye Trends", city: "Hyderabad", date: "2026-10-15T08:30:00Z", amount: 2400, status: "AWAITING_STOCK", items: 2, totalQty: 8, isUrgent: true, isBackorder: true, backorderReason: "Zero Stock in Running Warehouse", placedBy: "Auto-Split BO", trackingId: "" },
  { id: "ORD-9018", customer: "Sunshine Eyewear", city: "Mumbai", date: "2026-10-14T14:20:00Z", amount: 18900, status: "DISPATCHED", items: 15, totalQty: 140, isUrgent: true, placedBy: "Owner", trackingId: "BLUEDART8921" },
  { id: "ORD-9015", customer: "City Optics", city: "Jaipur", date: "2026-10-13T09:00:00Z", amount: 8900, status: "DISPATCHED", items: 8, totalQty: 80, isUrgent: false, placedBy: "Suresh (Staff)", trackingId: "DELHIVERY445" },
  { id: "ORD-9012", customer: "OptiCare Clinic", city: "Surat", date: "2026-10-12T17:10:00Z", amount: 5100, status: "CONFIRMED", items: 6, totalQty: 32, isUrgent: false, placedBy: "Staff", trackingId: "" },
  { id: "ORD-9010", customer: "Rajat Vision", city: "Delhi", date: "2026-10-11T16:45:00Z", amount: 3200, status: "DELIVERED", items: 3, totalQty: 30, isUrgent: false, placedBy: "Owner", trackingId: "DELHIVERY445" },
  { id: "ORD-9005", customer: "Vision Plus", city: "Delhi", date: "2026-10-10T11:30:00Z", amount: 15600, status: "DELIVERED", items: 14, totalQty: 150, isUrgent: false, placedBy: "Owner", trackingId: "BLUEDART8900" },
  { id: "ORD-9002", customer: "Prime Eyecare", city: "Ahmedabad", date: "2026-10-09T15:20:00Z", amount: 2800, status: "DELIVERED", items: 2, totalQty: 18, isUrgent: false, placedBy: "Owner", trackingId: "DTDC7712" },
  { id: "ORD-9001", customer: "Apex Lenses", city: "Chennai", date: "2026-10-08T10:00:00Z", amount: 950, status: "CANCELLED", items: 1, totalQty: 5, isUrgent: false, placedBy: "Owner", trackingId: "" }
];

const STATUS_CONFIG = {
  pending: { label: "New Order", bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  PLACED: { label: "New Order", bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  awaiting_stock: { label: "Awaiting Stock", bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300" },
  AWAITING_STOCK: { label: "Awaiting Stock", bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300" },
  confirmed: { label: "Confirmed", bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-200" },
  CONFIRMED: { label: "Confirmed", bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-200" },
  blocked: { label: "On Hold", bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200" },
  HOLD: { label: "On Hold", bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200" },
  processing: { label: "Picking", bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
  PICKING: { label: "Picking", bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
  packing: { label: "Packing", bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-200" },
  PACKING: { label: "Packing", bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-200" },
  shipped: { label: "Dispatched", bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
  DISPATCHED: { label: "Dispatched", bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
  delivered: { label: "Delivered", bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
  DELIVERED: { label: "Delivered", bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
  cancelled: { label: "Cancelled", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
  CANCELLED: { label: "Cancelled", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
};

function StatusBadge({ status, reason, trackingId, isBackorder, backorderReason }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const isAwaiting = status === "AWAITING_STOCK" || status === "awaiting_stock";

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${config.bg} ${config.text} ${config.border}`}>
        {config.label}
      </span>
      {isAwaiting && backorderReason && (
        <span className="text-[10px] text-amber-700 font-medium max-w-[150px] truncate text-center" title={backorderReason}>
          {backorderReason}
        </span>
      )}
      {(status === "blocked" || status === "HOLD") && reason && (
        <span className="text-[10px] text-rose-500 font-semibold max-w-[140px] truncate text-center" title={reason}>
          {reason}
        </span>
      )}
      {(status === "shipped" || status === "DISPATCHED") && trackingId && (
        <span className="text-[9px] text-slate-500 font-mono mt-0.5">{trackingId}</span>
      )}
    </div>
  );
}

export function Orders() {
  const [orders, setOrders] = useState(INITIAL_MOCK_ORDERS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [filterDate, setFilterDate] = useState("all_time");
  const [urgentOnly, setUrgentOnly] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch real orders from API with graceful fallback to mock data
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await orderApi.getRecentOrders();
      if (res && res.error === false && Array.isArray(res.data) && res.data.length > 0) {
        const mapped = res.data.map(o => ({
          id: o.order_number || o._id,
          dbId: o._id,
          customer: o.customer_id?.company_name || o.customer_id?.name || "Customer",
          city: o.customer_id?.city || "Delhi",
          date: o.createdAt,
          amount: o.total_amount || 0,
          status: o.status,
          items: Array.isArray(o.items) ? o.items.length : 0,
          totalQty: Array.isArray(o.items) ? o.items.reduce((s, it) => s + (it.quantity || 1), 0) : 0,
          isUrgent: !!o.is_urgent,
          isBackorder: !!o.is_backorder || (o.order_number && o.order_number.endsWith("-BO")),
          placedBy: o.order_type === "stock" ? "Stock Order" : "B2B Portal",
          trackingId: o.tracking_number || ""
        }));
        setOrders(mapped);
      }
    } catch (err) {
      console.warn("Could not load real orders from API, using mock orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeTab, filterDate, urgentOnly, pageSize]);

  // Counts for tabs & KPI summary
  const counts = useMemo(() => {
    const total = orders.length;
    const awaiting = orders.filter(o => o.status === "AWAITING_STOCK" || o.status === "awaiting_stock").length;
    const newOrConfirmed = orders.filter(o => ["PLACED", "pending", "CONFIRMED", "confirmed"].includes(o.status)).length;
    const pickingPacking = orders.filter(o => ["PICKING", "processing", "PACKING", "packing"].includes(o.status)).length;
    const dispatched = orders.filter(o => ["DISPATCHED", "shipped"].includes(o.status)).length;
    const delivered = orders.filter(o => ["DELIVERED", "delivered"].includes(o.status)).length;
    const hold = orders.filter(o => ["HOLD", "blocked"].includes(o.status)).length;
    const urgent = orders.filter(o => o.isUrgent).length;
    return { total, awaiting, newOrConfirmed, pickingPacking, dispatched, delivered, hold, urgent };
  }, [orders]);

  const tabs = [
    { id: "all", label: "All Orders", count: counts.total },
    { id: "AWAITING_STOCK", label: "Awaiting Stock", count: counts.awaiting, isWarning: true },
    { id: "pending", label: "New & Confirmed", count: counts.newOrConfirmed },
    { id: "processing", label: "Picking / Packing", count: counts.pickingPacking },
    { id: "shipped", label: "Dispatched", count: counts.dispatched },
    { id: "blocked", label: "On Hold", count: counts.hold },
    { id: "delivered", label: "Delivered", count: counts.delivered },
  ];

  // Filtering Logic
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Tab matching
      let matchesTab = true;
      if (activeTab === "AWAITING_STOCK") {
        matchesTab = o.status === "AWAITING_STOCK" || o.status === "awaiting_stock";
      } else if (activeTab === "pending") {
        matchesTab = ["PLACED", "pending", "CONFIRMED", "confirmed"].includes(o.status);
      } else if (activeTab === "processing") {
        matchesTab = ["PICKING", "processing", "PACKING", "packing"].includes(o.status);
      } else if (activeTab === "shipped") {
        matchesTab = ["DISPATCHED", "shipped"].includes(o.status);
      } else if (activeTab === "blocked") {
        matchesTab = ["HOLD", "blocked"].includes(o.status);
      } else if (activeTab === "delivered") {
        matchesTab = ["DELIVERED", "delivered"].includes(o.status);
      }

      // Urgent toggle
      if (urgentOnly && !o.isUrgent) {
        return false;
      }

      // Search matching
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || 
        o.id.toLowerCase().includes(q) || 
        o.customer.toLowerCase().includes(q) ||
        o.city.toLowerCase().includes(q) ||
        (o.trackingId && o.trackingId.toLowerCase().includes(q));

      // Date matching
      let matchesDate = true;
      if (filterDate !== "all_time") {
        const orderDate = new Date(o.date);
        const now = new Date();
        if (filterDate === "today") {
          matchesDate = orderDate.toDateString() === now.toDateString();
        } else if (filterDate === "this_week") {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = orderDate >= sevenDaysAgo;
        } else if (filterDate === "this_month") {
          matchesDate = orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
        }
      }

      return matchesTab && matchesSearch && matchesDate;
    });
  }, [orders, activeTab, search, filterDate, urgentOnly]);

  // Pagination Slice
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  const handleUpdateOrder = (updatedOrder) => {
    setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
  };

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Orders & Dispatch
            <span className="text-[12px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              Warehouse Flow
            </span>
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Track order status, allocate lens stock, manage urgent picks, and handle backorders.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 vw-btn-secondary h-9 px-3 text-[13px]"
            title="Refresh order list"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button className="flex items-center justify-center gap-1.5 vw-btn-secondary h-9 px-3 text-[13px]">
            <Download size={14} /> Export
          </button>
          <Link 
            to="/orders/new" 
            className="flex items-center justify-center gap-1.5 vw-btn-primary h-9 px-4 text-[13px]"
          >
            + New Order
          </Link>
        </div>
      </div>

      {/* Warehouse Quick KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
        {/* Total Active Orders */}
        <div 
          onClick={() => { setActiveTab("all"); setUrgentOnly(false); }}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            activeTab === "all" && !urgentOnly 
              ? "bg-blue-50/60 border-blue-400 shadow-sm" 
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Total Orders</span>
            <span className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><Layers size={14} /></span>
          </div>
          <div className="text-2xl font-black text-slate-800 mt-1">{counts.total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">All customer orders</div>
        </div>

        {/* Awaiting Stock / Backorder (Warehouse Critical Alert) */}
        <div 
          onClick={() => { setActiveTab("AWAITING_STOCK"); setUrgentOnly(false); }}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            activeTab === "AWAITING_STOCK" 
              ? "bg-amber-50 border-amber-500 shadow-sm ring-1 ring-amber-400" 
              : counts.awaiting > 0 
                ? "bg-amber-50/40 border-amber-300 hover:border-amber-400" 
                : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle size={13} className="text-amber-600" /> Awaiting Stock
            </span>
            <span className="p-1.5 bg-amber-200/70 text-amber-800 rounded-lg"><Boxes size={14} /></span>
          </div>
          <div className="text-2xl font-black text-amber-900 mt-1">{counts.awaiting}</div>
          <div className="text-[11px] text-amber-700/80 mt-0.5">Needs stock / BO split</div>
        </div>

        {/* Ready to Pick */}
        <div 
          onClick={() => { setActiveTab("pending"); setUrgentOnly(false); }}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            activeTab === "pending" && !urgentOnly
              ? "bg-indigo-50 border-indigo-400 shadow-sm" 
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-indigo-700 uppercase tracking-wider">Ready to Pick</span>
            <span className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg"><Clock size={14} /></span>
          </div>
          <div className="text-2xl font-black text-indigo-900 mt-1">{counts.newOrConfirmed}</div>
          <div className="text-[11px] text-indigo-600/80 mt-0.5">New & confirmed orders</div>
        </div>

        {/* Urgent Deliveries */}
        <div 
          onClick={() => setUrgentOnly(!urgentOnly)}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            urgentOnly 
              ? "bg-rose-50 border-rose-500 shadow-sm ring-1 ring-rose-400" 
              : counts.urgent > 0 
                ? "bg-rose-50/30 border-rose-200 hover:border-rose-300" 
                : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
              <Zap size={13} className="text-rose-500 fill-rose-500" /> Urgent Orders
            </span>
            <span className="p-1.5 bg-rose-100 text-rose-600 rounded-lg"><Zap size={14} /></span>
          </div>
          <div className="text-2xl font-black text-rose-900 mt-1">{counts.urgent}</div>
          <div className="text-[11px] text-rose-600/80 mt-0.5">
            {urgentOnly ? "Active filter (showing urgent only)" : "Priority rush dispatch"}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 mt-6 hide-scrollbar gap-1 sm:gap-2">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
              }}
              className={`whitespace-nowrap px-3 py-2.5 text-[13px] font-semibold transition-all relative flex items-center gap-1.5 rounded-t-lg ${
                isActive 
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/40" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                tab.isWarning && tab.count > 0
                  ? "bg-amber-200 text-amber-900 border border-amber-300"
                  : isActive 
                    ? "bg-blue-100 text-blue-700" 
                    : "bg-slate-100 text-slate-500"
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters and Table Card */}
      <div className="vw-card flex flex-col mt-4" style={{ padding: 0, overflow: "hidden" }}>
        
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between p-3.5 gap-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
            {/* Search Input */}
            <label className="flex items-center gap-2 w-full sm:max-w-[300px] h-[36px] px-3 bg-white border border-slate-200 rounded-lg focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-shadow">
              <Search size={15} className="text-slate-400" />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                className="flex-1 w-full bg-transparent outline-none text-[13px] text-slate-800 placeholder:text-slate-400" 
                placeholder="Search order ID, customer, city..." 
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </label>
            
            {/* Urgent Quick Toggle */}
            <button 
              onClick={() => setUrgentOnly(!urgentOnly)}
              className={`h-[36px] px-3 rounded-lg text-[12px] font-bold flex items-center gap-1.5 transition-colors border ${
                urgentOnly 
                  ? "bg-rose-500 text-white border-rose-600 shadow-sm" 
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              <Zap size={14} className={urgentOnly ? "text-yellow-300 fill-yellow-300" : "text-rose-500"} />
              Urgent Only
            </button>

            {/* Date Range Selector */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter size={15} className="text-slate-400 hidden sm:block" />
              <Select value={filterDate} onValueChange={setFilterDate}>
                <SelectTrigger className="h-[36px] w-full sm:w-[140px] rounded-lg text-[12px] border-slate-200 bg-white">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_time">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Right info / Page Size */}
          <div className="flex items-center gap-3 self-end sm:self-auto text-[12px] text-slate-500">
            <span>Rows per page:</span>
            <Select value={String(pageSize)} onValueChange={(val) => setPageSize(Number(val))}>
              <SelectTrigger className="h-[32px] w-[70px] rounded text-[12px] border-slate-200 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ fontSize: 13, borderCollapse: "collapse" }}>
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-bold text-slate-500 tracking-wide uppercase text-[11px]">Order & Type</th>
                <th className="py-3 px-4 font-bold text-slate-500 tracking-wide uppercase text-[11px]">Customer & Destination</th>
                <th className="py-3 px-4 font-bold text-slate-500 tracking-wide uppercase text-[11px]">Date & Time</th>
                <th className="py-3 px-4 font-bold text-slate-500 tracking-wide uppercase text-[11px]">Stock / Items</th>
                <th className="py-3 px-4 font-bold text-slate-500 tracking-wide uppercase text-[11px] text-center">Status</th>
                <th className="py-3 px-4 font-bold text-slate-500 tracking-wide uppercase text-[11px] text-right">Amount</th>
                <th className="py-3 px-4 font-bold text-slate-500 tracking-wide uppercase text-[11px] w-14 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.length > 0 ? paginatedOrders.map((o) => {
                const isAwaiting = o.status === "AWAITING_STOCK" || o.status === "awaiting_stock";
                return (
                  <tr 
                    key={o.id} 
                    className={`border-b border-slate-100 transition-colors group ${
                      o.isUrgent 
                        ? "bg-rose-50/20 hover:bg-rose-50/40 border-l-4 border-l-rose-500" 
                        : isAwaiting 
                          ? "bg-amber-50/15 hover:bg-amber-50/30 border-l-4 border-l-amber-400"
                          : "hover:bg-slate-50/50"
                    }`}
                  >
                    {/* Order & Type */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-1.5 flex-wrap">
                        <Link to={`/orders/${o.id}`} className="hover:underline font-mono text-[13px]">
                          {o.id}
                        </Link>
                        {o.isUrgent && (
                          <span className="inline-flex items-center gap-0.5 bg-rose-100 text-rose-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-rose-200">
                            <Zap size={10} className="fill-rose-600 text-rose-600" /> Urgent
                          </span>
                        )}
                        {(o.isBackorder || o.id.includes("-BO") || isAwaiting) && (
                          <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-amber-300" title="Split Backorder - Waiting for arrival">
                            <Boxes size={10} /> Backorder
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                        <span>By: {o.placedBy || "System"}</span>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{o.customer}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                        {o.city}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 font-medium text-slate-600">
                      <div className="text-[13px]">{new Date(o.date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      <div className="text-[11px] text-slate-400">{new Date(o.date).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>

                    {/* Stock / Items */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                          <PackageOpen size={13} className="text-slate-400" />
                          {o.items} line{o.items > 1 ? "s" : ""}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Total: <strong className="text-slate-700">{o.totalQty || o.items}</strong> pcs
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge 
                        status={o.status} 
                        reason={o.blockReason} 
                        trackingId={o.trackingId}
                        isBackorder={o.isBackorder}
                        backorderReason={o.backorderReason}
                      />
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-bold text-slate-800 text-[14px]">
                        ₹{Number(o.amount || 0).toLocaleString('en-IN')}
                      </div>
                      {o.isUrgent && <div className="text-[10px] text-rose-500 font-medium mt-0.5">+ Express Fee</div>}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center opacity-100 sm:opacity-90 group-hover:opacity-100 transition-opacity">
                        <OrderActions order={o} onUpdate={handleUpdateOrder} />
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-500">
                    <PackageOpen size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-[14px] text-slate-700">No orders found.</p>
                    <p className="text-[12px] text-slate-400 mt-1">Try adjusting your filters, search term, or status tab.</p>
                    {(search || activeTab !== "all" || urgentOnly || filterDate !== "all_time") && (
                      <button 
                        onClick={() => {
                          setSearch("");
                          setActiveTab("all");
                          setUrgentOnly(false);
                          setFilterDate("all_time");
                        }}
                        className="mt-3 px-3 py-1.5 text-[12px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                      >
                        Reset all filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Smart Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/70 gap-3">
          <div className="text-[12px] text-slate-500">
            Showing <strong className="font-semibold text-slate-700">{filteredOrders.length === 0 ? 0 : startIndex + 1}</strong> to <strong className="font-semibold text-slate-700">{Math.min(endIndex, filteredOrders.length)}</strong> of <strong className="font-semibold text-slate-700">{filteredOrders.length}</strong> orders
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              {/* Prev Button */}
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Page Number Buttons */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                // Show pages close to current page
                if (
                  pageNum === 1 || 
                  pageNum === totalPages || 
                  Math.abs(pageNum - currentPage) <= 1
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[32px] h-[32px] px-2 rounded-lg text-[12px] font-semibold transition-colors border ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                }

                if (pageNum === 2 && currentPage > 3) {
                  return <span key="ellipsis-start" className="px-1 text-slate-400 text-[12px]">...</span>;
                }
                if (pageNum === totalPages - 1 && currentPage < totalPages - 2) {
                  return <span key="ellipsis-end" className="px-1 text-slate-400 text-[12px]">...</span>;
                }
                return null;
              })}

              {/* Next Button */}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Next Page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
