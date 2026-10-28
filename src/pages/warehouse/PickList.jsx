import { useState, useEffect } from "react";
import {
  ClipboardList,
  MapPin,
  Zap,
  Loader2,
  ArrowRight,
  Send,
  AlertCircle
} from "lucide-react";
import { orderApi } from "../../services/orderApi";
import { DispatchOrderModal } from "@/components/orders/DispatchOrderModal";
import { notify } from "@/lib/notify";
import { hasPermission } from "@/lib/permissions";
import "@/styles/veriwide.css";

const STATUS_COLOR = {
  CONFIRMED: "bg-blue-100 text-blue-700 border-blue-200",
  PICKING: "bg-amber-100 text-amber-700 border-amber-200",
  PACKING: "bg-purple-100 text-purple-700 border-purple-200"
};

export function PickList() {
  const [queue, setQueue] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);

  // Unified Dispatch Modal State
  const [showDispatchModal, setShowDispatchModal] = useState(false);

  const canManage = hasPermission("MANAGE_DISPATCH");

  useEffect(() => {
    fetchQueue();
  }, []);

  useEffect(() => {
    if (selectedId) fetchDetail(selectedId);
  }, [selectedId]);

  const fetchQueue = async () => {
    setLoadingQueue(true);
    try {
      const res = await orderApi.getPickQueue();
      const list = res.error === false ? res.data : [];
      setQueue(list);
      if (!selectedId && list.length > 0) setSelectedId(list[0]._id);
    } catch (e) {
      console.error(e);
      setQueue([]);
    }
    setLoadingQueue(false);
  };

  const fetchDetail = async (id) => {
    setLoadingDetail(true);
    try {
      const res = await orderApi.getPickList(id);
      setDetail(res.error === false ? res.data : null);
    } catch (e) {
      console.error(e);
      setDetail(null);
    }
    setLoadingDetail(false);
  };

  // Normal advance for CONFIRMED -> PICKING and PICKING -> PACKING
  const handleAdvance = async () => {
    if (!detail) return;
    if (detail.status === "PACKING") {
      setShowDispatchModal(true);
      return;
    }

    const next = detail.status === "CONFIRMED" ? "PICKING" : detail.status === "PICKING" ? "PACKING" : null;
    if (!next) return;

    setIsAdvancing(true);
    try {
      const res = await orderApi.advanceStatus(detail._id, next);
      if (res.error === false) {
        notify.success(`Order ${detail.order_number} moved to ${next}.`);
        fetchQueue();
        fetchDetail(detail._id);
      } else {
        notify.error(res.message || "Failed to update status");
      }
    } catch (e) {
      console.error(e);
      notify.error("Error updating order status");
    }
    setIsAdvancing(false);
  };

  return (
    <>
      <div className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ClipboardList className="text-blue-600" size={22} /> Pick List
        </h1>
        <p className="text-[13px] text-slate-500 mt-1">
          Confirmed orders waiting to be picked, packed, and dispatched — exact box location per line.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
        {/* Left Queue */}
        <div className="vw-card overflow-hidden">
          <div className="p-3 border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase flex items-center justify-between">
            <span>Queue ({queue.length})</span>
            <span className="text-[10px] text-slate-400 font-normal">Auto-sorted by priority</span>
          </div>
          {loadingQueue ? (
            <div className="p-8 text-center text-slate-500 text-[13px] flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading...
            </div>
          ) : queue.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-[13px]">Nothing to pick right now.</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
              {queue.map((o) => (
                <button
                  key={o._id}
                  onClick={() => setSelectedId(o._id)}
                  className={`w-full text-left p-3 transition-colors ${
                    selectedId === o._id ? "bg-blue-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[13px] text-slate-800">{o.order_number}</span>
                    {o.is_urgent && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-rose-100 text-rose-700 text-[9px] font-bold rounded">
                        <Zap size={11} className="text-rose-600" /> URGENT
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-slate-500 truncate">
                    {o.customer_id?.company_name || o.customer_id?.name || "—"}
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                        STATUS_COLOR[o.status] || "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {o.status}
                    </span>
                    <span className="text-[11px] text-slate-400">{o.items?.length || 0} line(s)</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Detail */}
        <div className="vw-card p-5 min-h-[300px]">
          {loadingDetail ? (
            <div className="p-10 text-center text-slate-500 text-[13px] flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading order...
            </div>
          ) : !detail ? (
            <div className="p-10 text-center text-slate-500 text-[13px]">
              Select an order from the queue to see its pick list.
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800 text-[16px]">{detail.order_number}</h3>
                    {detail.is_urgent && (
                      <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded">
                        Urgent Order
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    {detail.customer_id?.company_name || detail.customer_id?.name} · {detail.customer_id?.city}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[11px] font-bold uppercase px-2 py-1 rounded border ${
                      STATUS_COLOR[detail.status] || "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {detail.status}
                  </span>

                  {canManage && (
                    detail.status === "CONFIRMED" ? (
                      <button
                        onClick={handleAdvance}
                        disabled={isAdvancing}
                        className="vw-btn-primary h-9 px-3 gap-1.5 flex items-center justify-center disabled:opacity-50 text-[12px] font-bold"
                      >
                        {isAdvancing ? "Updating..." : "Mark as Picked"} <ArrowRight size={14} />
                      </button>
                    ) : detail.status === "PICKING" ? (
                      <button
                        onClick={handleAdvance}
                        disabled={isAdvancing}
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg h-9 px-3 gap-1.5 flex items-center justify-center disabled:opacity-50 text-[12px] font-bold transition-colors"
                      >
                        {isAdvancing ? "Updating..." : "Mark as Packed"} <ArrowRight size={14} />
                      </button>
                    ) : detail.status === "PACKING" ? (
                      <button
                        onClick={() => setShowDispatchModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 px-3.5 gap-2 flex items-center justify-center text-[12px] font-bold transition-colors shadow-sm"
                      >
                        <Send size={13} /> Dispatch Order
                      </button>
                    ) : null
                  )}
                </div>
              </div>

              {/* Items List with Exact Godown Box Locations */}
              <div className="flex flex-col gap-4">
                {(detail.items || []).map((item, idx) => (
                  <div key={item._id || idx} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-bold text-slate-800 text-[14px]">
                          {item.product_id?.brand}{" "}
                          <span className="text-slate-400 font-normal">{item.product_id?.product_code}</span>
                        </div>
                        <div className="text-[12px] text-slate-500 mt-0.5 font-mono">
                          SPH {item.sph} {item.cyl !== null && item.cyl !== undefined ? `CYL ${item.cyl}` : ""}{" "}
                          {item.axis ? `X${item.axis}` : ""} {item.add ? `ADD +${item.add}` : ""}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-slate-400 uppercase font-bold">Qty</div>
                        <div className="font-bold text-slate-800">
                          {item.allocated_quantity} / {item.requested_quantity}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(item.box_locations || []).length === 0 ? (
                        <span className="text-[12px] text-rose-500 font-medium flex items-center gap-1">
                          <AlertCircle size={13} /> No box allocated — stock not reserved.
                        </span>
                      ) : (
                        item.box_locations.map((bl, bidx) => (
                          <span
                            key={bidx}
                            className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1.5 text-[12px] font-bold text-slate-700 shadow-sm"
                          >
                            <MapPin size={12} className="text-emerald-600" />
                            {bl.warehouse_location_id?.location_code || "—"}
                            <span className="text-slate-400 font-normal">×{bl.quantity}</span>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Unified Dispatch Modal */}
      <DispatchOrderModal
        isOpen={showDispatchModal}
        onClose={() => setShowDispatchModal(false)}
        order={detail}
        onSuccess={() => {
          setSelectedId(null);
          setDetail(null);
          fetchQueue();
        }}
      />
    </>
  );
}
