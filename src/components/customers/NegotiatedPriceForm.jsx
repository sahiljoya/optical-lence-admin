import { useEffect, useMemo, useState } from "react";
import { Plus, Loader2, AlertTriangle, Search } from "lucide-react";
import { notify } from "@/lib/notify";
import { hasPermission } from "@/lib/permissions";
import { getItem } from "@/services/storage";
import { customerService } from "@/services/customerService";
import { brandApi, productApi } from "@/services/productApi";

// Who can do what with a special (negotiated) price:
// - Owner, or staff with APPROVE_DISCOUNT / MANAGE_PRICING (not Sales / Accounts): set it directly.
// - Sales, Accounts, or anyone with REQUEST_DISCOUNT: send a request for approval.
export function getNegotiatedPriceMode() {
  const user = getItem("admin_user");
  const role = (user?.role?.name || user?.role || "").toString().toLowerCase();
  if (role === "admin") return "direct";
  if (role === "sales" || role === "accounts") return hasPermission("REQUEST_DISCOUNT") ? "request" : "none";
  if (hasPermission(["APPROVE_DISCOUNT", "MANAGE_PRICING"])) return "direct";
  if (hasPermission("REQUEST_DISCOUNT")) return "request";
  return "none";
}

const fmtPower = (n) => (n === null || n === undefined ? "" : `${n > 0 ? "+" : ""}${Number(n).toFixed(2)}`);
const rangeText = (a, b) => {
  if (a === null || a === undefined || b === null || b === undefined) return "—";
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return lo === hi ? fmtPower(lo) : `${fmtPower(lo)} to ${fmtPower(hi)}`;
};
const covers = (value, a, b) => {
  if (value === "" || value === null || value === undefined) return true;
  const v = Number(value);
  if (Number.isNaN(v)) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;
  return v >= Math.min(a, b) && v <= Math.max(a, b);
};
export const productLabel = (p) =>
  [p?.brand, p?.product_name, p?.index, p?.base, p?.coating].filter((v) => v !== null && v !== undefined && v !== "").join(" ") || "Product";

// Brand → (optional power filter) → product → special rate. Calls onSaved() after a save/request.
export function NegotiatedPriceForm({ customerId, pricingTier = "stock_a", onSaved }) {
  const mode = getNegotiatedPriceMode();
  const isRole = (name) => ((getItem("admin_user")?.role?.name || "").toLowerCase() === name);

  const [brands, setBrands] = useState([]);
  const [brand, setBrand] = useState("");
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [search, setSearch] = useState("");
  const [sph, setSph] = useState("");
  const [cyl, setCyl] = useState("");
  const [productId, setProductId] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode === "none") return;
    brandApi.getBrands()
      .then((res) => setBrands((res.data || []).filter((b) => b.product_count > 0)))
      .catch(() => setBrands([]));
  }, [mode]);

  // Products are loaded per brand from the server (no 200-product cut-off across all brands).
  useEffect(() => {
    setProductId("");
    setProducts([]);
    if (!brand) return undefined;
    let cancelled = false;
    setLoadingProducts(true);
    productApi.getProducts({ brand, limit: 200 })
      .then((res) => { if (!cancelled) setProducts(res.data?.list || res.data || []); })
      .catch(() => { if (!cancelled) setProducts([]); })
      .finally(() => { if (!cancelled) setLoadingProducts(false); });
    return () => { cancelled = true; };
  }, [brand]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !`${productLabel(p)} ${p.product_code || ""} ${p.lens_type || ""}`.toLowerCase().includes(q)) return false;
      if (!covers(sph, p.min_sph, p.max_sph)) return false;
      if (cyl !== "" && Number(cyl) !== 0 && !covers(cyl, p.min_cyl, p.max_cyl)) return false;
      return true;
    });
  }, [products, search, sph, cyl]);

  const selected = products.find((p) => p._id === productId);
  const tierPrice = selected?.tier_prices?.[pricingTier];
  const floor = selected?.min_selling_price ?? null;
  const belowFloor = floor != null && price !== "" && Number(price) < floor;

  if (mode === "none") {
    return <p className="p-5 text-[12px] text-slate-500 border-b border-slate-100">You don't have permission to set or request special prices.</p>;
  }

  const reset = () => { setProductId(""); setPrice(""); setNote(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productId) return notify.warning("Please select a product.");
    if (!price || Number(price) <= 0) return notify.warning("Please enter a valid price.");
    if (belowFloor) return notify.error(`Price (₹${price}) is below the minimum floor price (₹${floor}).`);
    if (mode === "request" && !note.trim()) return notify.warning("Please add a reason / commitment note for the approver.");

    setSaving(true);
    try {
      if (mode === "request") {
        const res = await customerService.createDiscountRequest({
          customerId,
          productId,
          requestedPrice: Number(price),
          reason: note.trim(),
        });
        if (res.error === false) {
          notify.success(isRole("accounts") ? "Special price sent for Owner approval." : "Special price request sent for approval.");
          reset();
          onSaved && onSaved();
        } else {
          notify.error(res.message || "Could not send the request.");
        }
      } else {
        const res = await customerService.setNegotiatedPrice(customerId, productId, Number(price));
        if (res.error === false) {
          notify.success("Special price set.");
          reset();
          onSaved && onSaved();
        } else {
          notify.error(res.message || "Could not set the special price.");
        }
      }
    } catch (err) {
      notify.error(err.message || "Could not save the special price.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full border border-slate-200 px-3 py-2 rounded-lg text-[13px] bg-white focus:outline-none focus:border-blue-500";

  return (
    <form onSubmit={handleSubmit} className="p-5 border-b border-slate-100 bg-blue-50/20 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
        <div className="sm:col-span-3">
          <label className="block text-[12px] font-semibold text-slate-700 mb-1">Brand</label>
          <select value={brand} onChange={(e) => setBrand(e.target.value)} className={inputCls}>
            <option value="">-- Choose brand --</option>
            {brands.map((b) => <option key={b._id} value={b.name}>{b.name} ({b.product_count})</option>)}
          </select>
        </div>
        <div className="sm:col-span-3">
          <label className="block text-[12px] font-semibold text-slate-700 mb-1">Search product</label>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} disabled={!brand} placeholder="Index, coating, code…" className={`${inputCls} pl-8 disabled:bg-slate-50`} />
          </div>
        </div>
        <div className="sm:col-span-3">
          <label className="block text-[12px] font-semibold text-slate-700 mb-1">Power needed <span className="text-slate-400 font-normal">(optional)</span></label>
          <div className="flex gap-2">
            <input type="number" step="0.25" value={sph} onChange={(e) => setSph(e.target.value)} disabled={!brand} placeholder="SPH" className={`${inputCls} disabled:bg-slate-50`} />
            <input type="number" step="0.25" value={cyl} onChange={(e) => setCyl(e.target.value)} disabled={!brand} placeholder="CYL" className={`${inputCls} disabled:bg-slate-50`} />
          </div>
        </div>
        <div className="sm:col-span-3">
          <label className="block text-[12px] font-semibold text-slate-700 mb-1">
            Product {brand && <span className="text-slate-400 font-normal">({loadingProducts ? "loading…" : filtered.length})</span>}
          </label>
          <select value={productId} onChange={(e) => setProductId(e.target.value)} disabled={!brand || loadingProducts} className={`${inputCls} disabled:bg-slate-50`}>
            <option value="">{brand ? "-- Choose product --" : "Choose a brand first"}</option>
            {filtered.map((p) => (
              <option key={p._id} value={p._id}>{productLabel(p)} ({p.product_code || "SKU"})</option>
            ))}
          </select>
        </div>
      </div>

      {selected && (
        <div className="p-3 bg-white border border-slate-200 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-[12px]">
          <div><span className="text-slate-500 block text-[11px]">Lens type</span><strong className="text-slate-800">{selected.lens_type || "—"}</strong></div>
          <div><span className="text-slate-500 block text-[11px]">Index / Base / Coating</span><strong className="text-slate-800">{[selected.index, selected.base, selected.coating].filter(Boolean).join(" / ")}</strong></div>
          <div><span className="text-slate-500 block text-[11px]">SPH range</span><strong className="text-slate-800">{rangeText(selected.min_sph, selected.max_sph)}</strong></div>
          <div><span className="text-slate-500 block text-[11px]">CYL range</span><strong className="text-slate-800">{rangeText(selected.min_cyl, selected.max_cyl)}</strong></div>
          {selected.min_add != null && selected.max_add != null && (
            <div><span className="text-slate-500 block text-[11px]">ADD range</span><strong className="text-slate-800">{rangeText(selected.min_add, selected.max_add)}</strong></div>
          )}
          <div><span className="text-slate-500 block text-[11px]">Standard rate ({pricingTier})</span><strong className="text-slate-800">₹{tierPrice ?? "—"}</strong></div>
          <div><span className="text-slate-500 block text-[11px]">Minimum floor price</span><strong className="text-indigo-600">₹{floor ?? "None"}</strong></div>
          <div className="col-span-2 sm:col-span-4 text-[11px] text-slate-400">The special price applies to every power of this product for this customer.</div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
        <div className="sm:col-span-2">
          <label className="block text-[12px] font-semibold text-slate-700 mb-1">Special rate (₹)</label>
          <input type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 85" className={`${inputCls} ${belowFloor ? "border-red-500 focus:border-red-500" : ""}`} />
        </div>
        <div className="sm:col-span-7">
          <label className="block text-[12px] font-semibold text-slate-700 mb-1">
            Reason / commitment note {mode === "direct" ? <span className="text-slate-400 font-normal">(optional)</span> : <span className="text-amber-600 font-medium">(required for approval)</span>}
          </label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={mode === "direct" ? "Optional internal note" : "e.g. Committed to 100 pairs/month, competitor price match"} className={inputCls} />
        </div>
        <div className="sm:col-span-3">
          <button
            type="submit"
            disabled={saving || !productId || !price || belowFloor}
            className={`w-full h-[38px] flex items-center justify-center gap-1.5 text-[12px] font-semibold text-white rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${mode === "direct" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700"}`}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {mode === "direct" ? "Set Special Rate" : isRole("accounts") ? "Submit for Owner Approval" : "Request Special Rate"}
          </button>
        </div>
      </div>
      {belowFloor && (
        <div className="flex items-center gap-1.5 text-red-600 font-semibold text-[12px]">
          <AlertTriangle size={14} /> Price is lower than the floor price (₹{floor}).
        </div>
      )}
    </form>
  );
}
