import { useState } from "react";
import { Search, Download, Truck, PackageCheck, Send, Navigation, Clock, CheckCircle, Package } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import "@/styles/veriwide.css";

const INITIAL_MOCK_DISPATCH = [
  { id: "ORD-9051", customer: "Vision Plus", city: "Delhi", items: 45, status: "PACKING", delivery_partner: "DTDC", tracking_id: "", date: "2026-10-06T14:30", type: "parcel", urgent: true },
  { id: "ORD-9052", customer: "Clear Optics", city: "Pune", items: 120, status: "PACKING", delivery_partner: "Delhivery", tracking_id: "", date: "2026-10-06T15:00", type: "stock", urgent: false },
  { id: "ORD-9048", customer: "Sunshine Eyewear", city: "Mumbai", items: 30, status: "DISPATCHED", delivery_partner: "Blue Dart", tracking_id: "BLD-9988221", date: "2026-10-05T11:20", type: "priority", urgent: true },
  { id: "ORD-9045", customer: "City Optics", city: "Jaipur", items: 80, status: "DELIVERED", delivery_partner: "DTDC", tracking_id: "DTD-1122334", date: "2026-10-04T09:15", type: "parcel", urgent: false },
];

const MOCK_DISPATCH_TREND = [
  { name: "Mon", packages: 12 },
  { name: "Tue", packages: 18 },
  { name: "Wed", packages: 14 },
  { name: "Thu", packages: 22 },
  { name: "Fri", packages: 30 },
  { name: "Sat", packages: 15 },
  { name: "Sun", packages: 5 },
];

export function Dispatch() {
  const [orders, setOrders] = useState(INITIAL_MOCK_DISPATCH);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("packing");
  
  // Modals state
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Form State
  const [trackingId, setTrackingId] = useState("");
  const [deliveryPartner, setDeliveryPartner] = useState("DTDC");

  const pendingCount = orders.filter(o => o.status === "PACKING" || o.status === "PICKING").length;
  const transitCount = orders.filter(o => o.status === "DISPATCHED").length;
  const deliveredCount = orders.filter(o => o.status === "DELIVERED").length;

  const tabs = [
    { id: "packing", label: "Ready to Dispatch", badge: pendingCount },
    { id: "dispatched", label: "In Transit (Dispatched)", badge: transitCount },
    { id: "delivered", label: "Delivered" },
  ];

  const filteredOrders = orders.filter(o => {
    let matchesTab = true;
    if (activeTab === "packing") matchesTab = o.status === "PACKING" || o.status === "PICKING";
    if (activeTab === "dispatched") matchesTab = o.status === "DISPATCHED";
    if (activeTab === "delivered") matchesTab = o.status === "DELIVERED";
    
    const matchesSearch = o.id.toLowerCase().includes(search.toLowerCase()) || 
                          o.customer.toLowerCase().includes(search.toLowerCase()) ||
                          o.city.toLowerCase().includes(search.toLowerCase()) ||
                          (o.tracking_id && o.tracking_id.toLowerCase().includes(search.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  const handleDispatchClick = (order) => {
    setSelectedOrder(order);
    setDeliveryPartner(order.delivery_partner || "DTDC");
    setTrackingId("");
    setShowDispatchModal(true);
  };

  const handleMarkDelivered = (order) => {
    if(window.confirm(`Mark order ${order.id} as Delivered?`)) {
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "DELIVERED" } : o));
    }
  }

  const submitDispatch = (e) => {
    e.preventDefault();
    if (!trackingId) return alert("Tracking ID is required to dispatch");

    setOrders(prev => prev.map(o => 
      o.id === selectedOrder.id 
      ? { ...o, status: "DISPATCHED", tracking_id: trackingId, delivery_partner: deliveryPartner } 
      : o
    ));
    
    setShowDispatchModal(false);
    alert(`Order ${selectedOrder.id} dispatched via ${deliveryPartner}!`);
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
          <h1 className="text-2xl font-bold text-slate-900">Dispatch & Shipping</h1>
          <p className="text-[13px] text-slate-500 mt-1">Manage packing, tracking IDs, and delivery partners.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button onClick={() => alert("Exporting manifest...")} className="flex items-center justify-center gap-2 vw-btn-secondary h-10 px-4 w-full sm:w-auto flex-1 sm:flex-none">
            <Download size={16} /> Export Manifest
          </button>
        </div>
      </div>

      {/* Stats Summary with Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
        <div className="flex flex-col gap-4">
          <div className="vw-card p-4 flex items-center justify-between border-l-4 border-l-amber-500">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Dispatch</p>
              <h2 className="text-2xl font-black text-slate-900 mt-1">{pendingCount} <span className="text-[13px] text-slate-400 font-medium">Orders</span></h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
              <Package size={20} />
            </div>
          </div>
          <div className="vw-card p-4 flex items-center justify-between border-l-4 border-l-blue-500">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">In Transit</p>
              <h2 className="text-2xl font-black text-slate-900 mt-1">{transitCount} <span className="text-[13px] text-slate-400 font-medium">Orders</span></h2>
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
              <p className="text-[11px] text-slate-500">Number of packages sent in the last 7 days</p>
            </div>
            <span className="text-[18px] font-black text-indigo-600">116 Total</span>
          </div>
          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_DISPATCH_TREND} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPackages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="packages" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorPackages)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
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
            placeholder="Search Order No, Customer or Tracking ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="mt-6 vw-card overflow-hidden">
        {/* Desktop & Mobile View Combined via responsive classes */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
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
                      <p className="text-[13px] text-slate-500 mt-1">No shipments match this filter.</p>
                    </div>
                  </td>
                </tr>
              ) : null}
              {filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-[14px] text-slate-900">{order.id}</div>
                      {order.urgent && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-100 text-rose-700">Urgent</span>}
                    </div>
                    <div className="text-[12px] text-slate-500 mt-0.5">{order.items} Items • {order.type}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-[13px] text-slate-800">{order.customer}</div>
                    <div className="text-[12px] text-slate-500 mt-0.5">{order.city}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700">
                      <Truck size={14} className="text-slate-400" /> {order.delivery_partner}
                    </div>
                    {order.tracking_id ? (
                      <div className="text-[11px] font-mono bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-1 text-slate-600">
                        {order.tracking_id}
                      </div>
                    ) : (
                      <div className="text-[11px] text-amber-600 font-medium mt-1">Pending AWB</div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {order.status === "PACKING" && <span className="inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase border bg-amber-100 text-amber-700 border-amber-200"><Clock size={12} className="mr-1 inline" /> Packing</span>}
                    {order.status === "DISPATCHED" && <span className="inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase border bg-blue-100 text-blue-700 border-blue-200"><Navigation size={12} className="mr-1 inline" /> Dispatched</span>}
                    {order.status === "DELIVERED" && <span className="inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase border bg-emerald-100 text-emerald-700 border-emerald-200"><CheckCircle size={12} className="mr-1 inline" /> Delivered</span>}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {order.status === "PACKING" && (
                      <button onClick={() => handleDispatchClick(order)} className="mx-auto flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors rounded font-bold text-[12px] border border-blue-200">
                        <Send size={14} /> Dispatch
                      </button>
                    )}
                    {order.status === "DISPATCHED" && (
                      <button onClick={() => handleMarkDelivered(order)} className="mx-auto flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors rounded font-bold text-[12px] border border-emerald-200">
                        <CheckCircle size={14} /> Mark Delivered
                      </button>
                    )}
                    {order.status === "DELIVERED" && (
                      <span className="text-[12px] text-slate-400 font-medium">Completed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispatch Modal */}
      {showDispatchModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-[15px] text-slate-800">Dispatch Order</h2>
              <button onClick={() => setShowDispatchModal(false)} className="text-slate-400 hover:text-slate-700">
                <CheckCircle size={18} />
              </button>
            </div>
            <form onSubmit={submitDispatch} className="p-5">
              <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Order Details</label>
                <div className="font-bold text-[14px] text-slate-900">{selectedOrder.id} • {selectedOrder.customer}</div>
                <div className="text-[12px] text-slate-500 mt-0.5">{selectedOrder.items} Items • Going to {selectedOrder.city}</div>
              </div>

              <div className="mb-4">
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Delivery Partner</label>
                <select 
                  value={deliveryPartner}
                  onChange={e => setDeliveryPartner(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value="DTDC">DTDC</option>
                  <option value="Blue Dart">Blue Dart</option>
                  <option value="Delhivery">Delhivery</option>
                  <option value="Trackon">Trackon</option>
                  <option value="Self Pickup">Self Pickup</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Tracking ID / AWB Number</label>
                <input 
                  type="text" 
                  value={trackingId}
                  onChange={e => setTrackingId(e.target.value)}
                  placeholder="e.g. DTD123456789"
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[14px] font-mono focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowDispatchModal(false)} className="flex-1 vw-btn-secondary h-10">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-lg h-10 transition-colors flex items-center justify-center gap-2">
                  <Send size={14} /> Confirm Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
