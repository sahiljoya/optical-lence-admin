import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  Search,
  Download,
  Truck,
  PackageCheck,
  Send,
  Navigation,
  Clock,
  CheckCircle,
  Package,
  FileSpreadsheet,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  X,
  Trash2,
  Loader2,
  Lock,
  AlertCircle
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { DispatchOrderModal } from "@/components/orders/DispatchOrderModal";
import { orderApi } from "@/services/orderApi";
import { courierService } from "@/services/courierService";
import { hasPermission } from "@/lib/permissions";
import { notify } from "@/lib/notify";
import "@/styles/veriwide.css";

export function Dispatch() {
  const canManageDispatch = hasPermission("MANAGE_DISPATCH");

  // Live Data State
  const [loading, setLoading] = useState(true);
  const [dispatchData, setDispatchData] = useState({
    ready: [],
    dispatched: [],
    delivered: [],
    trend: [],
    counts: { pending: 0, transit: 0, delivered: 0 }
  });
  const [courierList, setCourierList] = useState([]);

  // UI Filters
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("packing"); // "packing" | "dispatched" | "delivered"

  // Dispatch Action Modal State
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Fetch initial data
  useEffect(() => {
    fetchDispatchQueue();
    fetchCouriers();
  }, []);

  const fetchDispatchQueue = async () => {
    setLoading(true);
    try {
      const res = await orderApi.getDispatchQueue();
      if (res && res.data) {
        setDispatchData(res.data);
      }
    } catch (err) {
      console.error("Failed to load dispatch queue:", err);
      notify.error("Failed to load live dispatch orders.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCouriers = async () => {
    try {
      const res = await courierService.getCouriers();
      const list = Array.isArray(res) ? res : res?.data;
      if (list && Array.isArray(list) && list.length > 0) {
        setCourierList(list);
      } else {
        setCourierList([
          { _id: "1", name: "DTDC" },
          { _id: "2", name: "Blue Dart" },
          { _id: "3", name: "S R Courier" },
        ]);
      }
    } catch (err) {
      console.error("Error fetching couriers:", err);
      setCourierList([
        { _id: "1", name: "DTDC" },
        { _id: "2", name: "Blue Dart" },
        { _id: "3", name: "S R Courier" },
      ]);
    }
  };

  const pendingCount = dispatchData.counts?.pending || dispatchData.ready?.length || 0;
  const transitCount = dispatchData.counts?.transit || dispatchData.dispatched?.length || 0;
  const deliveredCount = dispatchData.counts?.delivered || dispatchData.delivered?.length || 0;

  const total7DayVolume = useMemo(() => {
    return (dispatchData.trend || []).reduce((acc, t) => acc + (t.packages || 0), 0);
  }, [dispatchData.trend]);

  const tabs = [
    { id: "packing", label: "Ready to Dispatch", badge: pendingCount },
    { id: "dispatched", label: "In Transit (Dispatched)", badge: transitCount },
    { id: "delivered", label: "Delivered", badge: deliveredCount },
  ];

  // Active list according to selected tab
  const activeOrders = useMemo(() => {
    if (activeTab === "packing") return dispatchData.ready || [];
    if (activeTab === "dispatched") return dispatchData.dispatched || [];
    if (activeTab === "delivered") return dispatchData.delivered || [];
    return [];
  }, [activeTab, dispatchData]);

  // Filtered orders by search query
  const filteredOrders = useMemo(() => {
    if (!search.trim()) return activeOrders;
    const q = search.toLowerCase();
    return activeOrders.filter((o) => {
      const orderNum = (o.order_number || o._id || "").toLowerCase();
      const customerName = (o.customer_id?.company_name || o.customer_id?.name || "").toLowerCase();
      const city = (o.customer_id?.city || "").toLowerCase();
      const tracking = (o.tracking_number || "").toLowerCase();
      const partner = (o.delivery_partner || "").toLowerCase();
      return (
        orderNum.includes(q) ||
        customerName.includes(q) ||
        city.includes(q) ||
        tracking.includes(q) ||
        partner.includes(q)
      );
    });
  }, [activeOrders, search]);

  // Open Dispatch Modal
  const handleDispatchClick = (order) => {
    if (!canManageDispatch) {
      notify.warning("You don't have permission to dispatch orders.");
      return;
    }
    setSelectedOrder(order);
    setShowDispatchModal(true);
  };

  // Mark Order as Delivered in Backend API
  const handleMarkDelivered = async (order) => {
    if (!canManageDispatch) return notify.warning("Permission denied");

    const orderNum = order.order_number || order._id;
    if (!window.confirm(`Mark order ${orderNum} as Delivered?`)) return;

    try {
      const res = await orderApi.advanceStatus(order._id, "DELIVERED");
      if (res.error === false || res.data) {
        notify.success(`Order ${orderNum} marked as Delivered!`);
        fetchDispatchQueue();
      } else {
        notify.error(res.message || "Failed to update order status.");
      }
    } catch (err) {
      console.error("Error marking delivered:", err);
      notify.error(err.message || "Failed to mark order as delivered.");
    }
  };

  // Export Manifest CSV (Section 12)
  const handleExportManifest = () => {
    const list = filteredOrders.length > 0 ? filteredOrders : dispatchData.dispatched || [];
    if (!list.length) {
      notify.warning("No shipment records to export.");
      return;
    }

    const headers = [
      "Order Number",
      "Customer Name",
      "City",
      "Delivery Partner",
      "Tracking / AWB #",
      "Boxes",
      "Weight (Kg)",
      "Status",
      "Dispatched Date"
    ];

    const rows = list.map((o) => [
      `"${o.order_number || o._id || ""}"`,
      `"${o.customer_id?.company_name || o.customer_id?.name || ""}"`,
      `"${o.customer_id?.city || ""}"`,
      `"${o.delivery_partner || "DTDC"}"`,
      `"${o.tracking_number || "-"}"`,
      o.cartons_count || 1,
      o.shipped_weight_kg || 1,
      `"${o.status || ""}"`,
      `"${o.updatedAt ? new Date(o.updatedAt).toLocaleDateString("en-IN") : ""}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `dispatch-manifest-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify.success("Dispatch manifest CSV exported successfully!");
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white text-[12px] p-2 rounded shadow-xl border border-slate-700">
          <p className="font-bold">{label}</p>
          <p>{payload[0].value} Packages Dispatched</p>
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Dispatch & Shipping</h1>
            <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
              Live Orders
            </span>
          </div>
          <p className="text-[13px] text-slate-500 mt-1">
            Manage packing, tracking IDs, delivery partners, and proof of dispatch.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <button
            onClick={fetchDispatchQueue}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 vw-btn-secondary h-10 px-3 text-[13px] font-semibold"
            title="Refresh Orders"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <Link
            to="/courier-reconciliation"
            className="flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[13px] border border-indigo-200 rounded-lg h-10 px-4 w-full sm:w-auto"
          >
            <FileSpreadsheet size={16} /> Courier Billing Audit
          </Link>
          <button
            onClick={handleExportManifest}
            className="flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[13px] border border-emerald-200 rounded-lg h-10 px-4 w-full sm:w-auto"
          >
            <Download size={16} /> Export Manifest
          </button>
        </div>
      </div>

      {/* Stats Summary with Real 7-Day Trend Chart */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
        <div className="flex flex-col gap-4">
          <div className="vw-card p-4 flex items-center justify-between border-l-4 border-l-amber-500">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ready to Dispatch</p>
              <h2 className="text-2xl font-black text-slate-900 mt-1">
                {pendingCount} <span className="text-[13px] text-slate-400 font-medium">Orders</span>
              </h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
              <Package size={20} />
            </div>
          </div>
          <div className="vw-card p-4 flex items-center justify-between border-l-4 border-l-blue-500">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">In Transit</p>
              <h2 className="text-2xl font-black text-slate-900 mt-1">
                {transitCount} <span className="text-[13px] text-slate-400 font-medium">Orders</span>
              </h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
              <Truck size={20} />
            </div>
          </div>
        </div>

        <div className="md:col-span-2 vw-card p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-[13px] font-bold text-slate-700 uppercase tracking-wider">Dispatch Volume</h3>
              <p className="text-[11px] text-slate-500">Live packages dispatched in the last 7 days</p>
            </div>
            <span className="text-[18px] font-black text-indigo-600">{total7DayVolume} Total</span>
          </div>
          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dispatchData.trend || []} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPackages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="packages" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorPackages)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 mt-6 hide-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-1 py-3 mr-8 text-[14px] font-semibold transition-colors relative flex items-center gap-2 ${
              activeTab === tab.id ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === tab.id ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                }`}
              >
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
            placeholder="Search Order No, Customer, City, or Tracking ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="mt-6 vw-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-[13px] flex items-center justify-center gap-2">
            <Loader2 size={18} className="animate-spin text-blue-600" /> Loading live dispatch orders...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[12px] uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-4 font-bold">Order Details</th>
                  <th className="px-5 py-4 font-bold">Destination</th>
                  <th className="px-5 py-4 font-bold">Shipping Info</th>
                  <th className="px-5 py-4 font-bold text-center">Status</th>
                  <th className="px-5 py-4 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-5 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                          <PackageCheck size={20} className="text-slate-400" />
                        </div>
                        <h3 className="text-[14px] font-bold text-slate-700">No orders found</h3>
                        <p className="text-[13px] text-slate-500 mt-1">No orders in this stage matching your filter.</p>
                      </div>
                    </td>
                  </tr>
                ) : null}
                {filteredOrders.map((order) => {
                  const customerName = order.customer_id?.company_name || order.customer_id?.name || "Direct Customer";
                  const city = order.customer_id?.city || "—";
                  const itemsCount = order.items?.length || 0;
                  const isReady = order.status === "CONFIRMED" || order.status === "PICKING" || order.status === "PACKING";

                  return (
                    <tr key={order._id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[14px] text-slate-900 font-mono">
                            {order.order_number || order._id}
                          </span>
                          {order.is_urgent && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-100 text-rose-700">
                              Urgent
                            </span>
                          )}
                        </div>
                        <div className="text-[12px] text-slate-500 mt-0.5">
                          {itemsCount} Line Items • {order.order_type || "Parcel"}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-[13px] text-slate-800">{customerName}</div>
                        <div className="text-[12px] text-slate-500 mt-0.5">{city}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700">
                          <Truck size={14} className="text-slate-400" /> {order.delivery_partner || "DTDC"}
                        </div>
                        {order.receipt_image_url ? (
                          <div className="flex items-center gap-2 mt-1">
                            <a
                              href={order.receipt_image_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded hover:bg-blue-100"
                              title="View Courier Receipt Picture"
                            >
                              <ImageIcon size={12} /> View Slip
                            </a>
                            {order.tracking_number && (
                              <span className="text-[11px] font-mono text-slate-500">
                                {order.tracking_number}
                              </span>
                            )}
                          </div>
                        ) : order.tracking_number ? (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold">
                              {order.tracking_number}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-amber-600 font-medium mt-1">Pending Slip Photo</div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {isReady && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase border bg-amber-100 text-amber-700 border-amber-200">
                            <Clock size={12} className="mr-1 inline" /> {order.status}
                          </span>
                        )}
                        {order.status === "DISPATCHED" && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase border bg-blue-100 text-blue-700 border-blue-200">
                            <Navigation size={12} className="mr-1 inline" /> Dispatched
                          </span>
                        )}
                        {order.status === "DELIVERED" && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase border bg-emerald-100 text-emerald-700 border-emerald-200">
                            <CheckCircle size={12} className="mr-1 inline" /> Delivered
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {isReady && (
                          <button
                            onClick={() => handleDispatchClick(order)}
                            disabled={!canManageDispatch}
                            className="mx-auto flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors rounded-lg font-bold text-[12px] border border-blue-200 disabled:opacity-50"
                            title={!canManageDispatch ? "Requires MANAGE_DISPATCH permission" : "Dispatch Order"}
                          >
                            {!canManageDispatch ? <Lock size={12} /> : <Send size={13} />} Dispatch
                          </button>
                        )}
                        {order.status === "DISPATCHED" && (
                          <button
                            onClick={() => handleMarkDelivered(order)}
                            disabled={!canManageDispatch}
                            className="mx-auto flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors rounded-lg font-bold text-[12px] border border-emerald-200 disabled:opacity-50"
                          >
                            <CheckCircle size={13} /> Mark Delivered
                          </button>
                        )}
                        {order.status === "DELIVERED" && (
                          <span className="text-[12px] text-slate-400 font-medium">Completed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Unified Dispatch Modal */}
      <DispatchOrderModal
        isOpen={showDispatchModal}
        onClose={() => {
          setShowDispatchModal(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        onSuccess={() => {
          fetchDispatchQueue();
        }}
      />
    </>
  );
}
