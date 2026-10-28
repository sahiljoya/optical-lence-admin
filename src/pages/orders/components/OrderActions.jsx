import { useState } from "react";
import { Eye, RefreshCw, X, Truck, PackageX, ZapOff, XCircle, Package } from "lucide-react";
import "@/styles/veriwide.css";

import { Link } from "@tanstack/react-router";
import { orderApi } from "@/services/orderApi";
import { DispatchOrderModal } from "@/components/orders/DispatchOrderModal";
import { notify } from "@/lib/notify";

export function OrderActions({ order, onUpdate, hideView = false, size = "sm" }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [shortage, setShortage] = useState(null); // { confirmedCount, totalCount, shortItems } or null
  const [busy, setBusy] = useState(false);

  const orderId = order.dbId || order.id || order._id;

  const run = async (fn, successMsg) => {
    setBusy(true);
    try {
      await fn();
      notify.success(successMsg);
      onUpdate && onUpdate();
    } catch (err) {
      notify.error(err.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  // The backend now collapses "confirm (if needed) + advance" into this single call, so a
  // PLACED/AWAITING_STOCK order reaches PICKING in one round trip, not two.
  // If stock is short, it stops short and opens the shortage modal instead of erroring out.
  const handleStartPicking = async () => {
    setBusy(true);
    try {
      await orderApi.advanceStatus(orderId, "PICKING");
      notify.success(`Order ${order.id} moved to Picking`);
      onUpdate && onUpdate();
    } catch (err) {
      if (err.data?.partial_stock) {
        setShortage(err.data);
      } else {
        notify.error(err.message || "Action failed");
      }
    } finally {
      setBusy(false);
    }
  };

  // Per documented policy: partial fulfillment proceeds only once the customer has approved it.
  // This button records that approval and splits the order (available items confirmed now,
  // the rest auto-move to a "-BO" backorder in AWAITING_STOCK).
  const handlePartialFulfill = () => run(async () => {
    await orderApi.confirmOrder(orderId, true);
    await orderApi.advanceStatus(orderId, "PICKING");
    setShortage(null);
  }, `Order ${order.id}: available stock confirmed, remainder moved to backorder`);

  const handleHold = () => run(async () => {
    await orderApi.holdOrder(orderId);
    setShortage(null);
  }, `Order ${order.id} held — waiting for full restock`);

  const handleMarkDelivered = () => run(async () => {
    await orderApi.advanceStatus(orderId, "DELIVERED");
  }, `Order ${order.id} marked delivered`);

  const handleRemoveUrgent = () => {
    if (!window.confirm(`Remove urgent status and refund the urgent surcharge for order ${order.id}?`)) return;
    run(async () => {
      await orderApi.removeUrgent(orderId);
    }, `Order ${order.id} downgraded to normal — urgent charge refunded`);
  };

  const handleCancel = () => {
    if (!window.confirm(`Cancel order ${order.id}? Any reserved stock and credit will be released.`)) return;
    run(async () => {
      await orderApi.cancelOrder(orderId);
    }, `Order ${order.id} cancelled`);
  };

  const canCancel = !["DISPATCHED", "DELIVERED", "CANCELLED"].includes(order.status);

  const btnClass = size === "md"
    ? "vw-btn-primary h-9 sm:h-10 px-3.5 sm:px-4 text-xs sm:text-[13px] rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 shadow-xs shrink-0 whitespace-nowrap cursor-pointer"
    : "vw-btn-primary h-7 sm:h-8 px-2 sm:px-2.5 text-[10px] sm:text-[11px] rounded-lg flex items-center justify-center gap-1 shrink-0 whitespace-nowrap cursor-pointer shadow-xs font-semibold";

  const iconBtnClass = "p-1.5 sm:p-2 shrink-0 rounded-lg transition-colors disabled:opacity-60 cursor-pointer";

  const iconSize = size === "md" ? 15 : 12;

  return (
    <div className="flex items-center justify-end gap-1 flex-nowrap">
      {!hideView && (
        <Link
          to={`/orders/${orderId}`}
          className={`${iconBtnClass} text-slate-400 hover:text-blue-600 hover:bg-blue-50`}
          title="View Order"
        >
          <Eye size={15} />
        </Link>
      )}

      {/* Dynamic 1-Click Quick Action Buttons */}
      {(order.status === "PLACED" || order.status === "CONFIRMED" || order.status === "AWAITING_STOCK") && (
        <button
          onClick={handleStartPicking}
          disabled={busy}
          className={`${btnClass} bg-amber-500 hover:bg-amber-600 border-amber-600 disabled:opacity-60`}
        >
          <RefreshCw size={iconSize} className={busy ? "animate-spin" : ""} /> {order.status === "AWAITING_STOCK" ? "Re-check & Pick" : "Start Picking"}
        </button>
      )}

      {(order.status === "PICKING" || order.status === "PACKING") && (
        <button
          onClick={() => setModalOpen(true)}
          disabled={busy}
          className={`${btnClass} bg-purple-600 hover:bg-purple-700 border-purple-700 disabled:opacity-60`}
        >
          <Truck size={iconSize} /> Dispatch
        </button>
      )}

      {order.status === "DISPATCHED" && (
        <button
          onClick={handleMarkDelivered}
          disabled={busy}
          className={`${btnClass} bg-emerald-600 hover:bg-emerald-700 border-emerald-700 disabled:opacity-60`}
        >
          Mark Delivered
        </button>
      )}

      {canCancel && <div className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />}

      {order.isUrgent && canCancel && (
        <button
          onClick={handleRemoveUrgent}
          disabled={busy}
          title="We can't expedite this — remove urgent status and refund its surcharge"
          className={`${iconBtnClass} text-rose-400 hover:text-rose-600 hover:bg-rose-50`}
        >
          <ZapOff size={15} />
        </button>
      )}

      {canCancel && (
        <button
          onClick={handleCancel}
          disabled={busy}
          title="Cancel order"
          className={`${iconBtnClass} text-slate-400 hover:text-rose-600 hover:bg-rose-50`}
        >
          <XCircle size={15} />
        </button>
      )}

      {/* Unified Dispatch Modal */}
      <DispatchOrderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        order={order}
        onSuccess={() => {
          onUpdate && onUpdate();
        }}
      />

      {/* Stock Shortage Modal — partial fulfillment needs the customer's explicit approval */}
      {shortage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 border-b border-amber-100 bg-amber-50">
              <h3 className="font-bold text-amber-900 text-sm sm:text-[15px] flex items-center gap-2">
                <PackageX size={18} className="text-amber-600" /> Stock Shortage
              </h3>
              <button onClick={() => setShortage(null)} className="text-amber-500 hover:text-amber-700 p-1 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 sm:p-5 flex flex-col gap-2.5 sm:gap-3">
              <p className="text-xs sm:text-[13px] text-slate-700">
                Only <strong>{shortage.confirmedCount} of {shortage.totalCount}</strong> item line(s) are currently in stock for order <strong className="font-mono">{order.id}</strong>.
              </p>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Partial fulfillment can only proceed once the customer has been informed and has approved receiving the available quantity now. Confirm that approval, or hold the full order until restock arrives.
              </p>

              <div className="flex flex-col gap-2 mt-2">
                <button
                  onClick={handlePartialFulfill}
                  disabled={busy}
                  className="w-full vw-btn-primary h-9 sm:h-10 text-xs sm:text-[13px] font-semibold rounded-xl flex items-center justify-center cursor-pointer shadow-xs disabled:opacity-60"
                >
                  Customer Approved — Dispatch Available Stock
                </button>
                <button
                  onClick={handleHold}
                  disabled={busy}
                  className="w-full vw-btn-secondary h-9 sm:h-10 text-xs sm:text-[13px] font-semibold rounded-xl flex items-center justify-center cursor-pointer disabled:opacity-60"
                >
                  Hold Order (Wait for Full Restock)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
