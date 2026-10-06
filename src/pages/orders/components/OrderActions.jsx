import { useState } from "react";
import { Eye, RefreshCw, X, Truck } from "lucide-react";
import "@/styles/veriwide.css";

import { Link } from "@tanstack/react-router";

export function OrderActions({ order, onUpdate, hideView = false, size = "sm" }) {
  const [modalOpen, setModalOpen] = useState(false);
  
  const [status, setStatus] = useState(order.status);
  const [trackingId, setTrackingId] = useState(order.trackingId || "");

  const handleSave = () => {
    onUpdate({ ...order, status, trackingId });
    setModalOpen(false);
  };

  const btnClass = size === "md" 
    ? "vw-btn-primary h-10 px-4 text-[13px] rounded-lg flex items-center gap-2 shadow-sm"
    : "vw-btn-primary px-3 py-1.5 h-auto text-[11px] rounded flex items-center gap-1";

  const iconSize = size === "md" ? 16 : 12;

  return (
    <div className="flex items-center justify-end gap-2">
      {!hideView && (
        <Link 
          to={`/orders/${order.id}`}
          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          title="View Order"
        >
          <Eye size={16} />
        </Link>
      )}

      {/* Dynamic 1-Click Quick Action Buttons */}
      {order.status === "pending" && (
        <button 
          onClick={() => onUpdate({ ...order, status: "processing" })}
          className={`${btnClass} bg-amber-500 hover:bg-amber-600 border-amber-600`}
        >
          <RefreshCw size={iconSize} /> Start Picking
        </button>
      )}

      {order.status === "processing" && (
        <button 
          onClick={() => {
            setStatus("shipped");
            setModalOpen(true);
          }}
          className={`${btnClass} bg-purple-600 hover:bg-purple-700 border-purple-700`}
        >
          <Truck size={iconSize} /> Dispatch
        </button>
      )}

      {order.status === "shipped" && (
        <button 
          onClick={() => onUpdate({ ...order, status: "delivered" })}
          className={`${btnClass} bg-emerald-600 hover:bg-emerald-700 border-emerald-700`}
        >
          Mark Delivered
        </button>
      )}

      {/* Dispatch Tracking Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-[15px]">Dispatch Order</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Order ID</label>
                <div className="text-slate-800 font-medium">{order.id}</div>
              </div>

              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Tracking ID (Courier)</label>
                <div className="relative">
                  <Truck size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    value={trackingId}
                    onChange={(e) => setTrackingId(e.target.value)}
                    placeholder="e.g. BLUEDART12345"
                    autoFocus
                    className="w-full h-10 pl-9 pr-3 bg-white border border-slate-200 rounded-lg text-[13px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Scan or type the courier tracking number.</p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button 
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="vw-btn-primary px-5 py-2 text-[13px] bg-purple-600 hover:bg-purple-700 border-purple-700"
              >
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
