import { useState, useEffect, useRef, useMemo } from "react";
import {
  Truck,
  Package,
  Scale,
  Upload,
  Image as ImageIcon,
  X,
  Trash2,
  Send,
  Loader2,
  Calculator,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { orderApi } from "@/services/orderApi";
import { courierService } from "@/services/courierService";
import { settingsService } from "@/services/settingsService";
import { notify } from "@/lib/notify";
import { hasPermission } from "@/lib/permissions";
import "@/styles/veriwide.css";

export function DispatchOrderModal({ isOpen, onClose, order, onSuccess }) {
  if (!isOpen || !order) return null;

  const canManageDispatch = hasPermission("MANAGE_DISPATCH");

  // State
  const [couriers, setCouriers] = useState([]);
  const [deliveryPartner, setDeliveryPartner] = useState(
    order.delivery_partner || "DTDC"
  );
  const [isChangingCourier, setIsChangingCourier] = useState(false);

  // Cartons and Weight
  const defaultBoxes =
    order.cartons_count ||
    (order.items ? Math.max(1, Math.ceil(order.items.length / 50)) : 1);
  const [cartonsCount, setCartonsCount] = useState(defaultBoxes);
  const [shippedWeight, setShippedWeight] = useState(
    order.shipped_weight_kg || defaultBoxes * 1.0
  );

  // Billing Mode: "cartage" (Per Box) or "weight" (Per Kg) — (No free option per user rule)
  const [shippingChargeMode, setShippingChargeMode] = useState("cartage");
  const [ratePerCarton, setRatePerCarton] = useState(50);
  const [ratePerKg, setRatePerKg] = useState(40);

  // Tracking & Slip Photo
  const [trackingId, setTrackingId] = useState(order.tracking_number || "");
  const [receiptImageUrl, setReceiptImageUrl] = useState(
    order.receipt_image_url || ""
  );
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef(null);

  // Fetch Couriers & Platform Settings
  useEffect(() => {
    let isMounted = true;

    // Load Couriers
    courierService
      .getCouriers()
      .then((res) => {
        if (!isMounted) return;
        const list = Array.isArray(res) ? res : res?.data;
        if (Array.isArray(list) && list.length > 0) {
          setCouriers(list);
          if (!order.delivery_partner) {
            setDeliveryPartner(list[0].name);
          }
        } else {
          setCouriers([
            { name: "DTDC" },
            { name: "Blue Dart" },
            { name: "S R Courier" }
          ]);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCouriers([
            { name: "DTDC" },
            { name: "Blue Dart" },
            { name: "S R Courier" }
          ]);
        }
      });

    // Load Platform Settings for Default Rates
    settingsService
      .getPlatformSettings()
      .then((res) => {
        if (!isMounted) return;
        if (res && res.error === false && res.data) {
          if (res.data.bulk_cartage_charge !== undefined) {
            setRatePerCarton(res.data.bulk_cartage_charge);
          }
          if (res.data.customer_rate_per_kg !== undefined) {
            setRatePerKg(res.data.customer_rate_per_kg);
          }
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [order]);

  // Live Calculated Customer Charge
  const calculatedCharge = useMemo(() => {
    if (shippingChargeMode === "weight") {
      const w = parseFloat(shippedWeight) || 0;
      const r = parseFloat(ratePerKg) || 0;
      return Math.round(w * r * 100) / 100;
    } else {
      const c = parseInt(cartonsCount) || 1;
      const r = parseFloat(ratePerCarton) || 0;
      return Math.round(c * r * 100) / 100;
    }
  }, [shippingChargeMode, shippedWeight, ratePerKg, cartonsCount, ratePerCarton]);

  // Handle Receipt Upload
  const handleReceiptFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      notify.warning("Please upload a valid image file (JPG, PNG, WEBP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify.warning("Image size must be less than 5MB.");
      return;
    }

    setIsUploadingReceipt(true);
    try {
      const res = await courierService.uploadImage(file);
      const url = res?.data?.imageUrl || res?.imageUrl;
      if (url) {
        setReceiptImageUrl(url);
        notify.success("Courier slip photo attached!");
      } else {
        notify.error("Upload succeeded but image URL was missing.");
      }
    } catch (err) {
      console.error("Receipt upload error:", err);
      notify.error(err.message || "Failed to upload courier slip image.");
    } finally {
      setIsUploadingReceipt(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Submit Dispatch
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManageDispatch) return notify.error("Permission denied");

    // Compulsory Courier Slip Photo check per Section 12 rule
    if (!receiptImageUrl.trim()) {
      return notify.warning(
        "Please photograph or upload the Courier Receipt / Slip picture."
      );
    }

    setIsSubmitting(true);
    try {
      const weightNum = parseFloat(shippedWeight) || 1.0;
      const boxesNum = parseInt(cartonsCount) || 1;

      const payload = {
        cartons_count: boxesNum,
        shipped_weight_kg: weightNum,
        shipping_charge_mode: shippingChargeMode,
        cartage_charge: calculatedCharge,
        cartage_rate_per_carton: Number(ratePerCarton) || 0,
        customer_rate_per_kg: Number(ratePerKg) || 0,
        receipt_image_url: receiptImageUrl.trim()
      };

      const actualOrderId = order._id || order.dbId || order.id;
      const res = await orderApi.advanceStatus(
        actualOrderId,
        "DISPATCHED",
        trackingId.trim(),
        deliveryPartner,
        payload
      );

      if (res.error === false || res.data) {
        notify.success(
          `Order ${order.order_number || order.id || order._id} dispatched via ${deliveryPartner}!`
        );
        if (onSuccess) onSuccess(res.data);
        onClose();
      } else {
        notify.error(res.message || "Failed to dispatch order.");
      }
    } catch (err) {
      console.error("Dispatch submit error:", err);
      notify.error(err.message || "Server error while dispatching order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const customerName =
    order.customer_id?.company_name || order.customer_id?.name || order.customer || "Direct Customer";
  const city = order.customer_id?.city || order.city || "—";
  const itemsCount = order.items?.length || order.itemCount || 0;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Truck size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-[15px] sm:text-[16px]">
                Confirm Dispatch • {order.order_number || order._id}
              </h3>
              <p className="text-[11px] text-slate-500">
                Log weight, packaging charge & proof of shipping
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Order Details Banner */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70 flex justify-between items-center text-[12px]">
            <div>
              <span className="font-bold text-slate-900 block text-[13px]">{customerName}</span>
              <span className="text-slate-500">{city}</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-slate-700 block">{itemsCount} Line Items</span>
              <span className="text-[11px] text-slate-400 font-mono">
                {order.order_type ? order.order_type.toUpperCase() : "PARCEL"}
              </span>
            </div>
          </div>

          {/* Delivery Partner Selection */}
          <div>
            <label className="block text-[12px] font-bold text-slate-700 mb-1">
              Delivery Partner (Courier)
            </label>
            {!isChangingCourier ? (
              <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2 min-w-0">
                  <Truck size={16} className="text-slate-500 shrink-0" />
                  <span className="font-semibold text-slate-800 text-[13px] truncate">
                    {deliveryPartner}
                  </span>
                  <span className="text-[10px] bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-full border border-blue-200 shrink-0">
                    Active Courier
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsChangingCourier(true)}
                  className="text-[12px] font-semibold text-blue-600 hover:text-blue-700 hover:underline shrink-0 ml-2"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500">Select courier company:</span>
                  <button
                    type="button"
                    onClick={() => setIsChangingCourier(false)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
                <select
                  value={deliveryPartner}
                  onChange={(e) => {
                    setDeliveryPartner(e.target.value);
                    setIsChangingCourier(false);
                  }}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-[13px] font-medium focus:outline-none focus:border-blue-500"
                  autoFocus
                >
                  {couriers.map((c) => (
                    <option key={c._id || c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Cartons Count & Shipped Weight (Kg) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Package size={14} className="text-slate-500" /> Cartons / Boxes
              </label>
              <input
                type="number"
                min="1"
                value={cartonsCount}
                onChange={(e) => {
                  const val = Math.max(1, parseInt(e.target.value) || 1);
                  setCartonsCount(val);
                  // Update default weight: 1 box = 1.0 kg standard
                  setShippedWeight(val * 1.0);
                }}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-[13px] font-bold focus:outline-none focus:border-blue-500"
                required
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Standard units</span>
            </div>

            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Scale size={14} className="text-slate-500" /> Shipped Weight (Kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={shippedWeight}
                onChange={(e) => setShippedWeight(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-[13px] font-bold focus:outline-none focus:border-blue-500"
                required
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">For Courier Audit</span>
            </div>
          </div>

          {/* CUSTOMER BILLING MODE (Cartaz Based vs Weight Based) */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Calculator size={14} className="text-indigo-600" /> Customer Shipping Charge Mode
              </label>
              <span className="text-[11px] text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                Added to Bill
              </span>
            </div>

            {/* Mode Selector Toggle Pills */}
            <div className="grid grid-cols-2 gap-2 bg-slate-200/70 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setShippingChargeMode("cartage")}
                className={`py-2 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  shippingChargeMode === "cartage"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Package size={14} /> Cartaz Based
              </button>
              <button
                type="button"
                onClick={() => setShippingChargeMode("weight")}
                className={`py-2 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  shippingChargeMode === "weight"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Scale size={14} /> Kg (Weight) Based
              </button>
            </div>

            {/* Rate & Breakdown */}
            {shippingChargeMode === "cartage" ? (
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Rate per Box / Carton (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={ratePerCarton}
                    onChange={(e) => setRatePerCarton(e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-[13px] font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-right">
                  <span className="text-[11px] text-blue-600 block">Customer Cartaz Charge</span>
                  <span className="text-[14px] font-black font-mono">
                    ₹{calculatedCharge.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-blue-500 block">
                    ({cartonsCount} Box × ₹{ratePerCarton})
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Rate per Kg (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={ratePerKg}
                    onChange={(e) => setRatePerKg(e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-[13px] font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-right">
                  <span className="text-[11px] text-indigo-600 block">Customer Weight Charge</span>
                  <span className="text-[14px] font-black font-mono">
                    ₹{calculatedCharge.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-indigo-500 block">
                    ({shippedWeight} Kg × ₹{ratePerKg}/Kg)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Physical Courier Slip Picture Upload (MANDATORY) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[12px] font-bold text-slate-700">
                Courier Receipt / Slip Photo <span className="text-rose-500">* Required</span>
              </label>
              <span className="text-[10px] text-slate-400">Customer reads tracking from photo</span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleReceiptFileChange}
              accept="image/*"
              className="hidden"
            />

            {!receiptImageUrl ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingReceipt}
                className="w-full border-2 border-dashed border-blue-200 hover:border-blue-400 rounded-xl p-3 text-center transition-colors flex items-center justify-center gap-2 text-slate-600 bg-blue-50/20 hover:bg-blue-50/50"
              >
                {isUploadingReceipt ? (
                  <span className="text-[12px] font-semibold text-blue-600 flex items-center gap-1.5">
                    <Loader2 size={14} className="animate-spin" /> Uploading slip photo...
                  </span>
                ) : (
                  <span className="text-[12px] font-semibold text-blue-700 flex items-center gap-1.5">
                    <Upload size={14} className="text-blue-500" /> Click to photograph or upload receipt slip (Mandatory)
                  </span>
                )}
              </button>
            ) : (
              <div className="relative border border-slate-200 rounded-xl p-2.5 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={receiptImageUrl}
                    alt="Receipt"
                    className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                  />
                  <div>
                    <span className="text-[12px] font-bold text-slate-800 block truncate">
                      Courier Slip Attached ✅
                    </span>
                    <a
                      href={receiptImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <ImageIcon size={11} /> View full photo
                    </a>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReceiptImageUrl("")}
                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                  title="Remove photo"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Optional Tracking ID / AWB Number */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[12px] font-bold text-slate-700">
                Tracking ID / AWB Number <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
              </label>
              <span className="text-[10px] text-slate-400">Customer sees slip photo</span>
            </div>
            <input
              type="text"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              placeholder="Optional — customer can view full slip picture"
              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-[13px] font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 vw-btn-secondary h-11 rounded-xl text-[13px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-xl h-11 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-blue-600/20"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
              <span>Confirm Dispatch (+₹{calculatedCharge})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
