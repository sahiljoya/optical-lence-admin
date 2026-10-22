import { useState, useEffect } from "react";
import { Eye, RefreshCw, X, Truck, PackageX, ZapOff, XCircle, Package } from "lucide-react";
import "@/styles/veriwide.css";

import { Link } from "@tanstack/react-router";
import { orderApi } from "@/services/orderApi";
import { courierService } from "@/services/courierService";
import { settingsService } from "@/services/settingsService";
import { notify } from "@/lib/notify";

export function OrderActions({ order, onUpdate, hideView = false, size = "sm" }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [shortage, setShortage] = useState(null); // { confirmedCount, totalCount, shortItems } or null
  const [trackingId, setTrackingId] = useState(order.trackingId || "");
  const [courier, setCourier] = useState(order.deliveryPartner || "DTDC");
  const [isChangingCourier, setIsChangingCourier] = useState(false);
  const [couriers, setCouriers] = useState([]);
  const [cartonsCount, setCartonsCount] = useState(1);
  const [isCartageFree, setIsCartageFree] = useState(false);
  const [ratePerCarton, setRatePerCarton] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!modalOpen) return;
    setIsChangingCourier(false);
    setCourier(order.deliveryPartner && order.deliveryPartner !== "—" ? order.deliveryPartner : "DTDC");
    courierService.getCouriers()
      .then(res => setCouriers(res?.data || []))
      .catch(() => setCouriers([]));

    settingsService.getPlatformSettings()
      .then(res => {
        const rate = Number(res?.data?.bulk_cartage_charge) || 0;
        setRatePerCarton(rate);
      })
      .catch(() => setRatePerCarton(0));
  }, [modalOpen, order.deliveryPartner]);

  const orderId = order.dbId || order.id;

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

  const calculatedCartage = isCartageFree ? 0 : (Number(cartonsCount) || 0) * (Number(ratePerCarton) || 0);

  // Single round trip — the backend advances PICKING/CONFIRMED through PACKING to DISPATCHED.
  const handleDispatch = () => run(async () => {
    const dispatchMeta = {
      cartons_count: Number(cartonsCount) || 0,
      cartage_charge: calculatedCartage,
      is_cartage_free: isCartageFree,
      cartage_rate_per_carton: Number(ratePerCarton) || 0
    };
    await orderApi.advanceStatus(orderId, "DISPATCHED", trackingId, courier, dispatchMeta);
  }, `Order ${order.id} dispatched via ${courier}`);

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

  const handleSaveDispatch = () => {
    setModalOpen(false);
    handleDispatch();
  };

  const btnClass = size === "md"
    ? "vw-btn-primary h-10 px-4 text-[13px] rounded-lg flex items-center gap-2 shadow-sm shrink-0 whitespace-nowrap"
    : "vw-btn-primary px-3 py-1.5 h-auto text-[11px] rounded flex items-center gap-1 shrink-0 whitespace-nowrap";

  const iconBtnClass = "p-1.5 shrink-0 rounded-md transition-colors disabled:opacity-60";

  const iconSize = size === "md" ? 16 : 12;

  return (
    <div className="flex items-center justify-end gap-1 flex-nowrap">
      {!hideView && (
        <Link
          to={`/orders/${orderId}`}
          className={`${iconBtnClass} text-slate-400 hover:text-blue-600 hover:bg-blue-50`}
          title="View Order"
        >
          <Eye size={16} />
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
          <ZapOff size={16} />
        </button>
      )}

      {canCancel && (
        <button
          onClick={handleCancel}
          disabled={busy}
          title="Cancel order"
          className={`${iconBtnClass} text-slate-400 hover:text-rose-600 hover:bg-rose-50`}
        >
          <XCircle size={16} />
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

              <div>
                <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Courier Company</label>
                {!isChangingCourier ? (
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <Truck size={16} className="text-slate-500 shrink-0" />
                      <span className="font-semibold text-slate-800 text-[13px] truncate">{courier}</span>
                      <span className="text-[10px] bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-full border border-blue-200 shrink-0">
                        Customer Selected
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsChangingCourier(true)}
                      className="text-[12px] font-semibold text-blue-600 hover:text-blue-700 hover:underline shrink-0 ml-2"
                    >
                      Change Company
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-500">Select alternative courier:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCourier(order.deliveryPartner && order.deliveryPartner !== "—" ? order.deliveryPartner : "DTDC");
                          setIsChangingCourier(false);
                        }}
                        className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                    <select
                      value={courier}
                      onChange={(e) => setCourier(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    >
                      {!couriers.some(c => c.name === courier) && courier && (
                        <option value={courier}>{courier}</option>
                      )}
                      {couriers.map(c => (
                        <option key={c._id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <p className="text-[11px] text-slate-500 mt-1">
                  {!isChangingCourier
                    ? "Customer ne checkout ke waqt ye courier company choose ki thi."
                    : "Dusra courier chunne par dispatch usi company ke naam se save hoga."}
                </p>
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

              {/* Packaging / Cartez Section */}
              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <Package size={14} className="text-purple-600" /> Packaging (Cartez)
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[12px] font-bold text-slate-600 hover:text-emerald-700 select-none">
                    <input
                      type="checkbox"
                      checked={isCartageFree}
                      onChange={(e) => setIsCartageFree(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Free Cartez</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Total Cartons</label>
                    <input
                      type="number"
                      min="1"
                      value={cartonsCount}
                      onChange={(e) => setCartonsCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-[13px] font-bold text-slate-800 outline-none focus:border-purple-500"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Rate / Carton</label>
                    <div className="w-full h-9 px-3 bg-slate-100 border border-slate-200 rounded-lg text-[13px] font-semibold text-slate-700 flex items-center justify-between select-none">
                      <span>{isCartageFree ? "₹0 (Waived)" : `₹${ratePerCarton}`}</span>
                      <span className="text-[10px] text-slate-400 font-normal">Fixed Rate</span>
                    </div>
                  </div>
                </div>

                <div className={`p-2.5 rounded-lg border text-[12px] flex items-center justify-between transition-colors ${isCartageFree ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                  <span>{isCartageFree ? "Cartage waived:" : `Total Packaging (${cartonsCount} × ₹${ratePerCarton}):`}</span>
                  <span className="font-bold text-[13px]">{isCartageFree ? "FREE (₹0)" : `+ ₹${calculatedCartage.toLocaleString()}`}</span>
                </div>
                {!isCartageFree && calculatedCartage > 0 && (
                  <p className="text-[10px] text-slate-400">Added to customer invoice & deducted from balance.</p>
                )}
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
                onClick={handleSaveDispatch}
                className="vw-btn-primary px-5 py-2 text-[13px] bg-purple-600 hover:bg-purple-700 border-purple-700"
              >
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Shortage Modal — partial fulfillment needs the customer's explicit approval */}
      {shortage && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between p-4 border-b border-amber-100 bg-amber-50">
              <h3 className="font-bold text-amber-900 text-[15px] flex items-center gap-2">
                <PackageX size={18} className="text-amber-600" /> Stock Shortage
              </h3>
              <button onClick={() => setShortage(null)} className="text-amber-500 hover:text-amber-700">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-3">
              <p className="text-[13px] text-slate-700">
                Only <strong>{shortage.confirmedCount} of {shortage.totalCount}</strong> item line(s) are currently in stock for order <strong>{order.id}</strong>.
              </p>
              <p className="text-[12px] text-slate-500">
                Partial fulfillment can only proceed once the customer has been informed and has approved receiving the available quantity now. Confirm that approval, or hold the full order until restock arrives.
              </p>

              <div className="flex flex-col gap-2 mt-2">
                <button
                  onClick={handlePartialFulfill}
                  disabled={busy}
                  className="vw-btn-primary h-10 text-[13px] disabled:opacity-60"
                >
                  Customer Approved — Dispatch Available Stock
                </button>
                <button
                  onClick={handleHold}
                  disabled={busy}
                  className="vw-btn-secondary h-10 text-[13px] disabled:opacity-60"
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
