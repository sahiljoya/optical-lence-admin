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
import { notify } from "@/lib/notify";
import "@/styles/veriwide.css";

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
    <div className="flex flex-col items-center gap-0.5 sm:gap-1">
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] md:text-[11px] font-bold uppercase tracking-wider border ${config.bg} ${config.text} ${config.border}`}>
        {config.label}
      </span>
      {isAwaiting && backorderReason && (
        <span className="text-[9px] sm:text-[10px] text-amber-700 font-medium max-w-[130px] sm:max-w-[150px] truncate text-center" title={backorderReason}>
          {backorderReason}
        </span>
      )}
      {(status === "blocked" || status === "HOLD") && reason && (
        <span className="text-[9px] sm:text-[10px] text-rose-500 font-semibold max-w-[120px] sm:max-w-[140px] truncate text-center" title={reason}>
          {reason}
        </span>
      )}
      {(status === "shipped" || status === "DISPATCHED") && trackingId && (
        <span className="text-[8px] sm:text-[9px] text-slate-500 font-mono mt-0.5">{trackingId}</span>
      )}
    </div>
  );
}

export function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [filterDate, setFilterDate] = useState("all_time");
  const [urgentOnly, setUrgentOnly] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await orderApi.getRecentOrders();
      const mapped = (res?.data || []).map(o => {
        const ownerId = o.customer_id?._id ? String(o.customer_id._id) : null;
        const placerId = o.placed_by?._id ? String(o.placed_by._id) : null;
        const placedBy = placerId && placerId !== ownerId ? o.placed_by.name : "Owner";
        return {
          id: o.order_number || o._id,
          dbId: o._id,
          customer: o.customer_id?.company_name || o.customer_id?.name || "Customer",
          city: o.customer_id?.city || "N/A",
          date: o.createdAt,
          amount: o.total_amount || 0,
          status: o.status,
          items: Array.isArray(o.items) ? o.items.length : 0,
          totalQty: Array.isArray(o.items) ? o.items.reduce((s, it) => s + (it.requested_quantity || 1), 0) : 0,
          isUrgent: !!o.is_urgent,
          isBackorder: !!o.is_stock_wait || (Array.isArray(o.items) && o.items.some(it => it.is_backorder)),
          placedBy,
          trackingId: o.tracking_number || "",
          deliveryPartner: o.delivery_partner || "DTDC"
        };
      });
      setOrders(mapped);
    } catch (err) {
      console.error("Could not load orders:", err);
      notify.error(err.message || "Could not load orders");
      setOrders([]);
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

  // Counts for tabs & KPI summary (cancelled orders are hidden from "All Orders")
  const counts = useMemo(() => {
    const total = orders.filter(o => o.status !== "CANCELLED").length;
    const awaiting = orders.filter(o => o.status === "AWAITING_STOCK" || o.status === "awaiting_stock").length;
    const newOrConfirmed = orders.filter(o => ["PLACED", "pending", "CONFIRMED", "confirmed"].includes(o.status)).length;
    const pickingPacking = orders.filter(o => ["PICKING", "processing", "PACKING", "packing"].includes(o.status)).length;
    const dispatched = orders.filter(o => ["DISPATCHED", "shipped"].includes(o.status)).length;
    const delivered = orders.filter(o => ["DELIVERED", "delivered"].includes(o.status)).length;
    const hold = orders.filter(o => ["HOLD", "blocked"].includes(o.status)).length;
    const urgent = orders.filter(o => o.isUrgent).length;
    const cancelled = orders.filter(o => o.status === "CANCELLED" || o.status === "cancelled").length;
    return { total, awaiting, newOrConfirmed, pickingPacking, dispatched, delivered, hold, urgent, cancelled };
  }, [orders]);

  const tabs = [
    { id: "all", label: "All Orders", count: counts.total },
    { id: "AWAITING_STOCK", label: "Awaiting Stock", count: counts.awaiting, isWarning: true },
    { id: "pending", label: "New & Confirmed", count: counts.newOrConfirmed },
    { id: "processing", label: "Picking / Packing", count: counts.pickingPacking },
    { id: "shipped", label: "Dispatched", count: counts.dispatched },
    { id: "blocked", label: "On Hold", count: counts.hold },
    { id: "delivered", label: "Delivered", count: counts.delivered },
    { id: "cancelled", label: "Cancelled", count: counts.cancelled },
  ];

  // Filtering Logic
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Tab matching
      let matchesTab = true;
      if (activeTab === "all") {
        matchesTab = o.status !== "CANCELLED";
      } else if (activeTab === "AWAITING_STOCK") {
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
      } else if (activeTab === "cancelled") {
        matchesTab = o.status === "CANCELLED" || o.status === "cancelled";
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
    }).sort((a, b) => (b.isUrgent ? 1 : 0) - (a.isUrgent ? 1 : 0));
  }, [orders, activeTab, search, filterDate, urgentOnly]);

  // Pagination Slice
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-1 sm:mt-2 mb-3 sm:mb-4 gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5 sm:gap-2 flex-wrap">
            Orders & Dispatch
            <span className="text-[9px] sm:text-[10px] md:text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              Warehouse Flow
            </span>
          </h1>
          <p className="text-[10px] sm:text-xs md:text-[13px] text-slate-500 mt-0.5 sm:mt-1 truncate sm:whitespace-normal">
            Track order status, allocate lens stock, manage urgent picks, and handle backorders.
          </p>
        </div>
        <div className="grid grid-cols-3 sm:flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button 
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center justify-center gap-1 sm:gap-1.5 vw-btn-secondary h-8 sm:h-9 px-2 sm:px-3 text-[11px] sm:text-xs md:text-[13px] rounded-xl font-medium cursor-pointer"
            title="Refresh order list"
          >
            <RefreshCw size={13} className={`sm:w-3.5 sm:h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button className="flex items-center justify-center gap-1 sm:gap-1.5 vw-btn-secondary h-8 sm:h-9 px-2 sm:px-3 text-[11px] sm:text-xs md:text-[13px] rounded-xl font-medium cursor-pointer">
            <Download size={13} className="sm:w-3.5 sm:h-3.5" /> Export
          </button>
          <Link 
            to="/orders/new" 
            className="flex items-center justify-center gap-1 sm:gap-1.5 vw-btn-primary h-8 sm:h-9 px-2.5 sm:px-4 text-[11px] sm:text-xs md:text-[13px] rounded-xl font-semibold cursor-pointer shadow-xs whitespace-nowrap"
          >
            + New Order
          </Link>
        </div>
      </div>

      {/* Warehouse Quick KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5 mt-3 sm:mt-5">
        {/* Total Active Orders */}
        <div 
          onClick={() => { setActiveTab("all"); setUrgentOnly(false); }}
          className={`p-3 sm:p-3.5 rounded-xl border cursor-pointer transition-all ${
            activeTab === "all" && !urgentOnly 
              ? "bg-blue-50/60 border-blue-400 shadow-xs" 
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] md:text-[12px] font-bold text-slate-500 uppercase tracking-wider">Total Orders</span>
            <span className="p-1 sm:p-1.5 bg-blue-100 text-blue-600 rounded-lg"><Layers size={13} className="sm:w-3.5 sm:h-3.5" /></span>
          </div>
          <div className="text-lg sm:text-xl md:text-2xl font-black text-slate-800 mt-1">{counts.total}</div>
          <div className="text-[9px] sm:text-[10px] md:text-[11px] text-slate-400 mt-0.5 truncate">All customer orders</div>
        </div>

        {/* Awaiting Stock / Backorder (Warehouse Critical Alert) */}
        <div 
          onClick={() => { setActiveTab("AWAITING_STOCK"); setUrgentOnly(false); }}
          className={`p-3 sm:p-3.5 rounded-xl border cursor-pointer transition-all ${
            activeTab === "AWAITING_STOCK" 
              ? "bg-amber-50 border-amber-500 shadow-xs ring-1 ring-amber-400" 
              : counts.awaiting > 0 
                ? "bg-amber-50/40 border-amber-300 hover:border-amber-400" 
                : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] md:text-[12px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle size={12} className="text-amber-600 sm:w-3 sm:h-3" /> Awaiting Stock
            </span>
            <span className="p-1 sm:p-1.5 bg-amber-200/70 text-amber-800 rounded-lg"><Boxes size={13} className="sm:w-3.5 sm:h-3.5" /></span>
          </div>
          <div className="text-lg sm:text-xl md:text-2xl font-black text-amber-900 mt-1">{counts.awaiting}</div>
          <div className="text-[9px] sm:text-[10px] md:text-[11px] text-amber-700/80 mt-0.5 truncate">Needs stock / BO split</div>
        </div>

        {/* Ready to Pick */}
        <div 
          onClick={() => { setActiveTab("pending"); setUrgentOnly(false); }}
          className={`p-3 sm:p-3.5 rounded-xl border cursor-pointer transition-all ${
            activeTab === "pending" && !urgentOnly
              ? "bg-indigo-50 border-indigo-400 shadow-xs" 
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] md:text-[12px] font-bold text-indigo-700 uppercase tracking-wider">Ready to Pick</span>
            <span className="p-1 sm:p-1.5 bg-indigo-100 text-indigo-600 rounded-lg"><Clock size={13} className="sm:w-3.5 sm:h-3.5" /></span>
          </div>
          <div className="text-lg sm:text-xl md:text-2xl font-black text-indigo-900 mt-1">{counts.newOrConfirmed}</div>
          <div className="text-[9px] sm:text-[10px] md:text-[11px] text-indigo-600/80 mt-0.5 truncate">New & confirmed orders</div>
        </div>

        {/* Urgent Deliveries */}
        <div 
          onClick={() => setUrgentOnly(!urgentOnly)}
          className={`p-3 sm:p-3.5 rounded-xl border cursor-pointer transition-all ${
            urgentOnly 
              ? "bg-rose-50 border-rose-500 shadow-xs ring-1 ring-rose-400" 
              : counts.urgent > 0 
                ? "bg-rose-50/30 border-rose-200 hover:border-rose-300" 
                : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] md:text-[12px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
              <Zap size={12} className="text-rose-500 fill-rose-500 sm:w-3 sm:h-3" /> Urgent Orders
            </span>
            <span className="p-1 sm:p-1.5 bg-rose-100 text-rose-600 rounded-lg"><Zap size={13} className="sm:w-3.5 sm:h-3.5" /></span>
          </div>
          <div className="text-lg sm:text-xl md:text-2xl font-black text-rose-900 mt-1">{counts.urgent}</div>
          <div className="text-[9px] sm:text-[10px] md:text-[11px] text-rose-600/80 mt-0.5 truncate">
            {urgentOnly ? "Active filter (urgent only)" : "Priority rush dispatch"}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 mt-4 sm:mt-6 hide-scrollbar gap-1 sm:gap-2">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
              }}
              className={`whitespace-nowrap px-2.5 sm:px-3.5 py-2 sm:py-2.5 text-[11px] sm:text-xs md:text-[13px] font-semibold transition-all relative flex items-center gap-1.5 rounded-t-xl cursor-pointer shrink-0 ${
                isActive 
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/40" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
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
      <div className="vw-card flex flex-col mt-3 sm:mt-4 overflow-hidden" style={{ padding: 0 }}>
        
        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between p-3 sm:p-3.5 gap-2.5 sm:gap-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 flex-1">
            {/* Search Input */}
            <label className="flex items-center gap-2 w-full sm:max-w-[280px] md:max-w-[320px] h-9 px-3 bg-white border border-slate-200 rounded-xl focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15 shadow-xs transition-all">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                className="flex-1 w-full bg-transparent outline-none text-xs sm:text-[13px] text-slate-800 placeholder:text-slate-400" 
                placeholder="Search order ID, customer, city..." 
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={14} />
                </button>
              )}
            </label>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Urgent Quick Toggle */}
              <button 
                onClick={() => setUrgentOnly(!urgentOnly)}
                className={`h-9 px-3 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border cursor-pointer shadow-xs shrink-0 flex-1 sm:flex-initial ${
                  urgentOnly 
                    ? "bg-rose-500 text-white border-rose-600" 
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <Zap size={13} className={urgentOnly ? "text-yellow-300 fill-yellow-300" : "text-rose-500"} />
                Urgent Only
              </button>

              {/* Date Range Selector */}
              <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                <Filter size={14} className="text-slate-400 hidden sm:block shrink-0" />
                <Select value={filterDate} onValueChange={setFilterDate}>
                  <SelectTrigger className="h-9 w-full sm:w-[130px] md:w-[140px] rounded-xl text-[11px] sm:text-xs border-slate-200 bg-white shadow-xs">
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
          </div>

          {/* Right info / Page Size */}
          <div className="flex items-center justify-between sm:justify-end gap-2.5 text-[11px] sm:text-xs text-slate-500 pt-2 lg:pt-0 border-t border-slate-200/60 lg:border-0">
            <span>Rows per page:</span>
            <Select value={String(pageSize)} onValueChange={(val) => setPageSize(Number(val))}>
              <SelectTrigger className="h-8 w-[65px] sm:w-[70px] rounded-lg text-xs border-slate-200 bg-white shadow-xs">
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
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[760px] sm:min-w-[840px] text-[11px] sm:text-xs md:text-[13px]" style={{ borderCollapse: "collapse" }}>
            <thead style={{ background: "var(--soft-bg)", borderBottom: "1px solid var(--divider)" }}>
              <tr className="text-[9px] sm:text-[10px] md:text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                <th className="py-2.5 sm:py-3 px-3 sm:px-4">Order & Type</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4">Customer & Destination</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4">Date & Time</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4">Stock / Items</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-center">Status</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-right">Amount</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-right">Action</th>
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
                    <td className="py-2.5 sm:py-3.5 px-3 sm:px-4">
                      <div className="font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-1.5 flex-wrap">
                        <Link to={`/orders/${o.dbId || o.id}`} className="hover:underline font-mono text-xs sm:text-[13px]">
                          {o.id}
                        </Link>
                        {o.isUrgent && (
                          <span className="inline-flex items-center gap-0.5 bg-rose-100 text-rose-700 text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-rose-200">
                            <Zap size={9} className="fill-rose-600 text-rose-600" /> Urgent
                          </span>
                        )}
                        {(o.isBackorder || o.id.includes("-BO") || isAwaiting) && (
                          <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-800 text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-amber-300" title="Split Backorder - Waiting for arrival">
                            <Boxes size={9} /> Backorder
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 flex items-center gap-2">
                        <span>By: {o.placedBy || "System"}</span>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-2.5 sm:py-3.5 px-3 sm:px-4">
                      <div className="font-semibold sm:font-bold text-slate-800 text-[11px] sm:text-xs md:text-[13px]">{o.customer}</div>
                      <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                        {o.city}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-2.5 sm:py-3.5 px-3 sm:px-4 font-medium text-slate-600">
                      <div className="text-[10px] sm:text-xs md:text-[13px] font-mono">{new Date(o.date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      <div className="text-[9px] sm:text-[10px] md:text-[11px] text-slate-400 mt-0.5">{new Date(o.date).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>

                    {/* Stock / Items */}
                    <td className="py-2.5 sm:py-3.5 px-3 sm:px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-slate-700 flex items-center gap-1 text-[10px] sm:text-xs md:text-[13px]">
                          <PackageOpen size={13} className="text-slate-400" />
                          {o.items} line{o.items > 1 ? "s" : ""}
                        </span>
                        <span className="text-[9px] sm:text-[10px] md:text-[11px] text-slate-500">
                          Total: <strong className="text-slate-700">{o.totalQty || o.items}</strong> pcs
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 sm:py-3.5 px-3 sm:px-4 text-center">
                      <StatusBadge 
                        status={o.status} 
                        reason={o.blockReason} 
                        trackingId={o.trackingId}
                        isBackorder={o.isBackorder}
                        backorderReason={o.backorderReason}
                      />
                    </td>

                    {/* Amount */}
                    <td className="py-2.5 sm:py-3.5 px-3 sm:px-4 text-right">
                      <div className="font-bold text-slate-800 text-[11px] sm:text-xs md:text-[14px] font-mono">
                        ₹{Number(o.amount || 0).toLocaleString('en-IN')}
                      </div>
                      {o.isUrgent && <div className="text-[9px] sm:text-[10px] text-rose-500 font-medium mt-0.5">+ Express Fee</div>}
                    </td>

                    {/* Action */}
                    <td className="py-2.5 sm:py-3.5 px-3 sm:px-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end opacity-100 sm:opacity-90 group-hover:opacity-100 transition-opacity">
                        <OrderActions order={o} onUpdate={fetchOrders} />
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={7} className="py-12 sm:py-16 text-center text-slate-500">
                    <PackageOpen size={34} className="mx-auto text-slate-300 mb-2 sm:w-9 sm:h-9" />
                    <p className="font-semibold text-xs sm:text-sm text-slate-700">No orders found.</p>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-1">Try adjusting your filters, search term, or status tab.</p>
                    {(search || activeTab !== "all" || urgentOnly || filterDate !== "all_time") && (
                      <button 
                        onClick={() => {
                          setSearch("");
                          setActiveTab("all");
                          setUrgentOnly(false);
                          setFilterDate("all_time");
                        }}
                        className="mt-3 px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
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
        <div className="flex flex-col sm:flex-row items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 border-t border-slate-200 bg-slate-50/70 gap-2.5 sm:gap-3">
          <div className="text-[11px] sm:text-xs text-slate-500 text-center sm:text-left">
            Showing <strong className="font-semibold text-slate-700">{filteredOrders.length === 0 ? 0 : startIndex + 1}</strong> to <strong className="font-semibold text-slate-700">{Math.min(endIndex, filteredOrders.length)}</strong> of <strong className="font-semibold text-slate-700">{filteredOrders.length}</strong> orders
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1 sm:gap-1.5">
              {/* Prev Button */}
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft size={15} />
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
                      className={`min-w-[28px] sm:min-w-[32px] h-7 sm:h-8 px-1.5 sm:px-2 rounded-lg text-[11px] sm:text-xs font-semibold transition-colors border cursor-pointer ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                }

                if (pageNum === 2 && currentPage > 3) {
                  return <span key="ellipsis-start" className="px-1 text-slate-400 text-[11px] sm:text-xs">...</span>;
                }
                if (pageNum === totalPages - 1 && currentPage < totalPages - 2) {
                  return <span key="ellipsis-end" className="px-1 text-slate-400 text-[11px] sm:text-xs">...</span>;
                }
                return null;
              })}

              {/* Next Button */}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs cursor-pointer"
                title="Next Page"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
