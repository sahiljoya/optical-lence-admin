import { useState, Fragment } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { ArrowLeft, Printer, Download, MapPin, Phone, Mail, Package, Truck, User, Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { OrderActions } from "./components/OrderActions";
import "@/styles/veriwide.css";

const MOCK_ORDER = {
  id: "ORD-9021",
  date: "2026-10-06T18:30:00Z",
  status: "processing", // pending, blocked, processing, shipped, delivered
  isUrgent: true,
  trackingId: "",
  customer: {
    name: "Vishal Optical Co.",
    phone: "+91 9876543210",
    email: "contact@vishaloptical.com",
    gst: "27AABCU9603R1ZX",
    tier: "Stock A+",
  },
  placedBy: {
    name: "Ramesh Kumar",
    role: "Staff (Sub-customer)",
    phone: "+91 8888888888",
  },
  shipping: {
    address: "Shop No. 12, Main Market, MG Road",
    city: "Delhi",
    state: "Delhi",
    pincode: "110001",
    transport: "VRL Logistics (Default)"
  },
  items: [
    {
      id: 1,
      brand: "VisionPlus",
      lens_type: "Progressive",
      coating: "Blue Cut + ARC",
      index: "1.56",
      patientName: "Amit Sharma (Customer)",
      location: { floor: "Ground Floor", rack: "A-12", box: "Bin 42" },
      powers: {
        right: { sph: "-1.50", cyl: "-0.50", axis: "90", add: "+2.00" },
        left: { sph: "-1.75", cyl: "-0.75", axis: "180", add: "+2.00" }
      },
      qty: 1,
      unitPrice: 850,
      total: 850
    },
    {
      id: 2,
      brand: "ClearLens",
      lens_type: "Single Vision",
      coating: "ARC",
      index: "1.61",
      patientName: "Stock / Regular",
      location: { floor: "1st Floor", rack: "C-05", box: "Shelf 2" },
      powers: {
        right: { sph: "-3.00", cyl: "0", axis: "0", add: "" },
        left: { sph: "-3.00", cyl: "0", axis: "0", add: "" }
      },
      qty: 5, // 5 pairs
      unitPrice: 400,
      total: 2000
    }
  ],
  summary: {
    subtotal: 2850,
    urgentSurcharge: 100,
    cartez: { count: 3, unitPrice: 50, total: 150 },
    gstAmount: 147.5, // 5%
    total: 3247.5
  }
};

const TIMELINE_STAGES = [
  { id: "pending", label: "Order Placed", icon: Package },
  { id: "processing", label: "Picking & Packing", icon: Clock },
  { id: "shipped", label: "Dispatched", icon: Truck },
  { id: "delivered", label: "Delivered", icon: CheckCircle2 }
];

export function OrderDetails() {
  const { id } = useParams({ strict: false });
  const [order, setOrder] = useState(MOCK_ORDER);
  const [expandedItem, setExpandedItem] = useState(null);

  const currentStageIndex = TIMELINE_STAGES.findIndex(s => s.id === order.status);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link to="/orders" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-slate-600">
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">{order.id}</h1>
            {order.isUrgent && <span className="bg-rose-100 text-rose-600 text-[10px] px-2 py-0.5 rounded-sm uppercase tracking-wide font-bold border border-rose-200">Urgent</span>}
          </div>
          <p className="text-[13px] text-slate-500 mt-1 sm:ml-[52px]">
            Placed on {new Date(order.date).toLocaleString("en-IN", { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <OrderActions order={order} onUpdate={setOrder} hideView={true} size="md" />
          <button className="flex items-center justify-center gap-2 vw-btn-secondary h-10 px-4 flex-1 sm:flex-none">
            <Printer size={16} /> Print Invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_350px] gap-6 mt-6 items-start">

        {/* Left Column: Items & Details */}
        <div className="flex flex-col gap-6 min-w-0">

          {/* Timeline Status */}
          <div className="vw-card overflow-hidden">
            <div className="overflow-x-auto hide-scrollbar pb-2">
              <div className="flex justify-between items-center relative min-w-[500px] p-3">
                <div className="absolute top-5 left-8 right-8 h-[2px] bg-slate-100 z-0"></div>
                {TIMELINE_STAGES.map((stage, index) => {
                  const Icon = stage.icon;
                  const isCompleted = currentStageIndex >= index;
                  const isActive = currentStageIndex === index;

                  return (
                    <div key={stage.id} className="relative z-10 flex flex-col items-center gap-2 bg-white px-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${isActive ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200" :
                        isCompleted ? "bg-emerald-500 border-emerald-500 text-white" :
                          "bg-white border-slate-200 text-slate-400"
                        }`}>
                        <Icon size={18} />
                      </div>
                      <div className={`text-[12px] font-bold whitespace-nowrap ${isActive ? "text-blue-700" : isCompleted ? "text-emerald-600" : "text-slate-400"}`}>
                        {stage.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Ordered Items */}
          <div className="vw-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-[15px]">Order Items</h3>
              <span className="text-[12px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-md">{order.items.length} Products</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[750px]" style={{ fontSize: 13 }}>
                <thead className="bg-white border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4 font-bold text-slate-500 text-[11px] uppercase">Product Details</th>
                    <th className="py-3 px-4 font-bold text-slate-500 text-[11px] uppercase">Right Eye (RE)</th>
                    <th className="py-3 px-4 font-bold text-slate-500 text-[11px] uppercase">Left Eye (LE)</th>
                    <th className="py-3 px-4 font-bold text-slate-500 text-[11px] uppercase text-center">Qty</th>
                    <th className="py-3 px-4 font-bold text-slate-500 text-[11px] uppercase text-right">Unit Price</th>
                    <th className="py-3 px-4 font-bold text-slate-500 text-[11px] uppercase text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item, i) => (
                    <Fragment key={i}>
                      <tr 
                        className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${expandedItem === item.id ? "bg-slate-50/80" : ""}`}
                        onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                        title="Click to view location"
                      >
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-800">{item.brand}</div>
                          <div className="text-[12px] text-slate-500">{item.lens_type} • {item.coating}</div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">Index: {item.index}</div>
                          
                          {item.patientName && (
                            <div className="mt-2 text-[10px] text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-sm inline-flex items-center gap-1 font-semibold uppercase tracking-wide">
                              <User size={10} /> For: {item.patientName}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
                            <div><span className="text-slate-400">SPH:</span> <span className="font-mono font-semibold">{item.powers.right.sph || "-"}</span></div>
                            <div><span className="text-slate-400">CYL:</span> <span className="font-mono font-semibold">{item.powers.right.cyl || "-"}</span></div>
                            <div><span className="text-slate-400">AXIS:</span> <span className="font-mono font-semibold">{item.powers.right.axis || "-"}</span></div>
                            <div><span className="text-slate-400">ADD:</span> <span className="font-mono font-semibold">{item.powers.right.add || "-"}</span></div>
                          </div>
                        </td>
                        <td className="py-4 px-4 border-l border-slate-50">
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
                            <div><span className="text-slate-400">SPH:</span> <span className="font-mono font-semibold">{item.powers.left.sph || "-"}</span></div>
                            <div><span className="text-slate-400">CYL:</span> <span className="font-mono font-semibold">{item.powers.left.cyl || "-"}</span></div>
                            <div><span className="text-slate-400">AXIS:</span> <span className="font-mono font-semibold">{item.powers.left.axis || "-"}</span></div>
                            <div><span className="text-slate-400">ADD:</span> <span className="font-mono font-semibold">{item.powers.left.add || "-"}</span></div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-slate-700">{item.qty}</td>
                        <td className="py-4 px-4 text-right text-slate-600 font-mono">₹{item.unitPrice}</td>
                        <td className="py-4 px-4 text-right font-bold text-slate-800 text-[14px]">₹{item.total.toLocaleString()}</td>
                      </tr>
                      {expandedItem === item.id && (
                        <tr>
                          <td colSpan={6} className="bg-amber-50/50 border-t-0 border-b border-slate-100 py-3 px-4">
                            <div className="flex items-center gap-4 text-[12px]">
                              <div className="flex items-center gap-2 text-amber-800 font-bold">
                                <MapPin size={14} className="text-amber-600" />
                                Warehouse Location:
                              </div>
                              {item.location ? (
                                <div className="flex items-center gap-2">
                                  <span className="bg-white border border-amber-200 text-amber-900 px-3 py-1 rounded shadow-sm flex flex-col leading-tight">
                                    <span className="text-[9px] text-amber-600 font-bold uppercase tracking-wide">Floor</span>
                                    <span className="font-mono font-bold text-[13px]">{item.location.floor}</span>
                                  </span>
                                  <span className="bg-white border border-amber-200 text-amber-900 px-3 py-1 rounded shadow-sm flex flex-col leading-tight">
                                    <span className="text-[9px] text-amber-600 font-bold uppercase tracking-wide">Rack</span>
                                    <span className="font-mono font-bold text-[13px]">{item.location.rack}</span>
                                  </span>
                                  <span className="bg-white border border-amber-200 text-amber-900 px-3 py-1 rounded shadow-sm flex flex-col leading-tight">
                                    <span className="text-[9px] text-amber-600 font-bold uppercase tracking-wide">Box / Bin</span>
                                    <span className="font-mono font-bold text-[13px]">{item.location.box}</span>
                                  </span>
                                </div>
                              ) : (
                                <span className="text-amber-700 italic">Location Not Assigned</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Customer & Summary */}
        <div className="flex flex-col gap-4">

          {/* Order Summary */}
          <div className="vw-card bg-slate-50/50 p-3">
            <h3 className="font-bold text-slate-800 text-[15px] mb-4 flex items-center gap-2"><Receipt size={16} /> Bill Summary</h3>
            <div className="flex flex-col gap-3 text-[13px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-bold text-slate-700">₹{order.summary.subtotal.toLocaleString()}</span>
              </div>
              {order.isUrgent && (
                <div className="flex justify-between">
                  <span className="text-rose-500 flex items-center gap-1"><AlertCircle size={12} /> Urgent Surcharge</span>
                  <span className="font-bold text-rose-600">+ ₹{order.summary.urgentSurcharge}</span>
                </div>
              )}
              {order.summary.cartez && (
                <div className="flex justify-between">
                  <span className="text-slate-500 flex items-center gap-1"><Package size={12} /> Packaging (Cartez x{order.summary.cartez.count})</span>
                  <span className="font-bold text-slate-700">+ ₹{order.summary.cartez.total}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">GST (5%)</span>
                <span className="font-bold text-slate-700">₹{order.summary.gstAmount}</span>
              </div>

              <div className="border-t border-slate-200 my-1"></div>

              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800">Total Amount</span>
                <span className="font-bold text-blue-700 text-[18px]">₹{order.summary.total.toLocaleString()}</span>
              </div>
              <p className="text-[10px] text-slate-400 text-right mt-[-4px]">Deducted from Credit Limit</p>
            </div>
          </div>

          {/* Placed By Info */}
          <div className="vw-card p-3">
            <h3 className="font-bold text-slate-800 text-[13px] uppercase tracking-wide text-slate-400 mb-4 flex items-center gap-2">
              <User size={14} /> Placed By
            </h3>
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold shrink-0">
                {order.placedBy.name.charAt(0)}
              </div>
              <div>
                <div className="font-bold text-blue-900 text-[14px]">{order.placedBy.name}</div>
                <div className="text-[12px] text-blue-700/80 font-medium">{order.placedBy.role}</div>
                <div className="text-[11px] text-blue-600/70 mt-1 flex items-center gap-1"><Phone size={10} /> {order.placedBy.phone}</div>
              </div>
            </div>
          </div>

          {/* Customer / Shop Details */}
          <div className="vw-card p-3">
            <h3 className="font-bold text-slate-800 text-[13px] uppercase tracking-wide text-slate-400 mb-4">Shop Details</h3>
            <div className="flex flex-col gap-3">
              <div>
                <div className="font-bold text-slate-800">{order.customer.name}</div>
                <div className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded inline-block mt-1 font-semibold">{order.customer.tier}</div>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-slate-600"><Phone size={14} className="text-slate-400" /> {order.customer.phone}</div>
              <div className="flex items-start gap-2 text-[12px] text-slate-600"><MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" /> {order.shipping.address}, {order.shipping.city}, {order.shipping.pincode}</div>
              <div className="flex items-center gap-2 text-[12px] text-purple-700 bg-purple-50 px-2 py-1.5 rounded-md border border-purple-100 font-medium mt-1">
                <Truck size={14} className="text-purple-500" /> 
                Transport: {order.shipping.transport}
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-1">GSTIN: {order.customer.gst}</div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

// Added Receipt icon since it wasn't imported from lucide-react initially.
function Receipt(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 17.5v-11" />
    </svg>
  );
}
