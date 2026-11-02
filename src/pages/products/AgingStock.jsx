import { useState, useEffect } from "react";
import {
  AlertTriangle, Clock, ShieldAlert, Ban, Tag, RefreshCcw, Search,
  Package, CheckCircle, IndianRupee, Eye, ArrowRight, XCircle, Check
} from "lucide-react";
import { notify } from "@/lib/notify";
import { productApi } from "@/services/productApi";
import { hasPermission } from "@/lib/permissions";
import "@/styles/veriwide.css";

export function AgingStock() {
  const [activeTab, setActiveTab] = useState("dead");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [kpis, setKpis] = useState({
    deadStockCount: 0,
    slowMovingCount: 0,
    stoppedCount: 0,
    totalDeadUnits: 0,
    totalSlowUnits: 0,
    totalLockedValue: 0
  });

  // Modal State for Clearance / Stop Reorder
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showClearanceModal, setShowClearanceModal] = useState(false);
  const [discountPrice, setDiscountPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await productApi.getAgingStock({
        tab: activeTab,
        search: search.trim(),
        page: 1,
        limit: 50
      });

      if (res?.data) {
        setItems(res.data.items || []);
        setTotalCount(res.data.total || 0);
        if (res.data.kpis) {
          setKpis(res.data.kpis);
        }
      }
    } catch (err) {
      console.error("Failed to load aging stock:", err);
      notify.error(err.message || "Failed to load aging and dead stock data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleOpenClearance = (prod) => {
    setSelectedProduct(prod);
    setDiscountPrice(prod.min_selling_price ? String(Math.round(prod.min_selling_price * 0.75)) : "");
    setShowClearanceModal(true);
  };

  const handleSubmitClearance = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      setSubmitting(true);
      const isCurrentlyStopped = selectedProduct.purchase_status === "Stopped";
      const action = isCurrentlyStopped ? "REACTIVATE" : "STOP_REORDER";

      await productApi.setClearanceAction(selectedProduct._id, {
        action,
        discountPrice: isCurrentlyStopped ? undefined : Number(discountPrice) || undefined
      });

      notify.success(
        action === "STOP_REORDER"
          ? `Product marked as Dead Stock & Re-orders permanently locked to STOPPED.`
          : `Re-orders reactivated for product.`
      );
      setShowClearanceModal(false);
      loadData();
    } catch (err) {
      notify.error(err.message || "Failed to update product clearance status");
    } finally {
      setSubmitting(false);
    }
  };

  const tabs = [
    { id: "dead", label: "Dead Stock (>90 Days)", badge: kpis.deadStockCount, badgeColor: "bg-rose-100 text-rose-700" },
    { id: "slow", label: "Slow Moving (70–90 Days)", badge: kpis.slowMovingCount, badgeColor: "bg-amber-100 text-amber-800" },
    { id: "stopped", label: "Re-orders Stopped", badge: kpis.stoppedCount, badgeColor: "bg-slate-100 text-slate-700" },
  ];

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Slow & Dead Stock</h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Automated 70/90 Days Detection
            </span>
          </div>
          <p className="text-[13px] text-slate-500 mt-1">
            Section 10 & 17: Inactive inventory detection, yellowing degradation protection, and vendor re-order locks.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={loadData}
            className="flex items-center justify-center gap-2 vw-btn-secondary h-10 px-4"
            title="Refresh"
          >
            <RefreshCcw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs bg-rose-50/20">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[12px] font-semibold">Dead Stock (&gt;90 Days)</span>
            <ShieldAlert size={16} className="text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700 mt-1.5">{kpis.deadStockCount || 0} Products</div>
          <div className="text-[11px] text-rose-600 mt-0.5">{(kpis.totalDeadUnits || 0).toLocaleString()} physical pieces</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[12px] font-semibold">Slow Moving (70-90 Days)</span>
            <Clock size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1.5">{kpis.slowMovingCount || 0} Products</div>
          <div className="text-[11px] text-amber-600 mt-0.5">{(kpis.totalSlowUnits || 0).toLocaleString()} pieces in warning zone</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[12px] font-semibold">Blocked Capital Value</span>
            <IndianRupee size={16} className="text-slate-700" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1.5">₹{(kpis.totalLockedValue || 0).toLocaleString("en-IN")}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Estimated cost lying in dead inventory</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-xs bg-purple-50/20">
          <div className="flex items-center justify-between text-purple-700">
            <span className="text-[12px] font-semibold">Re-orders Stopped</span>
            <Ban size={16} className="text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700 mt-1.5">{kpis.stoppedCount || 0} Items</div>
          <div className="text-[11px] text-purple-600 mt-0.5">Protected from accidental supplier POs</div>
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
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${tab.badgeColor}`}>
                {tab.badge}
              </span>
            )}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-blue-600 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mt-6 justify-between items-center">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by lens name, brand, SKU code..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500"
          />
        </form>
        <div className="text-[12px] text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
          <Tag size={13} className="text-blue-600" />
          <span><b>Clearance Protection:</b> Clearance sales are separated from organic demand to prevent false "Fast Moving" flags.</span>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="px-5 py-3">Lens Product & SKU</th>
                <th className="px-5 py-3">Index / Coating</th>
                <th className="px-5 py-3 text-center">Godown Stock</th>
                <th className="px-5 py-3">Inactivity & Degradation</th>
                <th className="px-5 py-3">Re-order Status</th>
                <th className="px-5 py-3 text-center">Clearance Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <RefreshCcw size={20} className="animate-spin inline mr-2 text-blue-500" /> Scanning inventory activity...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <CheckCircle size={32} className="mx-auto text-emerald-400 mb-2" />
                    Great news! No items currently sitting in this category.
                  </td>
                </tr>
              ) : items.map((prod) => (
                <tr key={prod._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-slate-900">{prod.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Brand: <b className="text-slate-700">{prod.brand}</b> • SKU: <span className="font-mono">{prod.product_code || "N/A"}</span>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-800">{prod.lens_type} ({prod.index || "1.56"})</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Coating: {prod.coating || "Standard"}</div>
                  </td>

                  <td className="px-5 py-4 text-center">
                    <div className="font-black text-[15px] text-slate-900">{prod.current_stock.toLocaleString()} <span className="text-[11px] font-normal text-slate-500">pcs</span></div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Running: {prod.running_stock} | Reserve: {prod.reserve_stock}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        prod.days_inactive >= 90
                          ? "bg-rose-100 text-rose-800 border border-rose-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}>
                        {prod.days_inactive} days without sale
                      </span>
                      {prod.is_yellowing_risk && (
                        <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-900 font-bold text-[10px] border border-yellow-300" title=">1 Year in warehouse: high risk of optical yellowing">
                          ⚠️ Yellowing Risk
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Last Order: {new Date(prod.last_sold_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    {prod.purchase_status === "Stopped" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                        <Ban size={12} className="text-rose-500" /> STOPPED (No Reorders)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle size={12} /> {prod.purchase_status}
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-4 text-center">
                    {hasPermission("MANAGE_PRODUCTS") ? (
                      <button
                        onClick={() => handleOpenClearance(prod)}
                        className={`px-3 py-1.5 rounded font-bold text-[11px] transition-colors shadow-xs flex items-center justify-center gap-1.5 mx-auto ${
                          prod.purchase_status === "Stopped"
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                            : "bg-rose-600 hover:bg-rose-700 text-white"
                        }`}
                      >
                        {prod.purchase_status === "Stopped" ? (
                          <>Reactivate Re-orders</>
                        ) : (
                          <>
                            <Tag size={12} /> Put on Clearance
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">View Only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clearance & Re-order Lock Modal */}
      {showClearanceModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-rose-50/50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-rose-600" size={18} />
                <h2 className="font-bold text-[15px] text-slate-800">
                  {selectedProduct.purchase_status === "Stopped" ? "Reactivate Re-orders" : "Put on Clearance & Stop Re-orders"}
                </h2>
              </div>
              <button onClick={() => setShowClearanceModal(false)} className="text-slate-400 hover:text-slate-700">
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitClearance} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="font-bold text-[14px] text-slate-900">{selectedProduct.name}</div>
                <div className="text-[12px] text-slate-500 mt-0.5">
                  Brand: {selectedProduct.brand} • In-Stock: <b>{selectedProduct.current_stock} pcs</b>
                </div>
                <div className="text-[11px] text-rose-700 font-semibold mt-1">
                  Inactive: {selectedProduct.days_inactive} days without sale
                </div>
              </div>

              {selectedProduct.purchase_status !== "Stopped" ? (
                <>
                  <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-3 text-[12px] text-rose-950 leading-relaxed space-y-1">
                    <p className="font-bold">What this does:</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                      <li>Locks <b>`purchase_status = STOPPED`</b> (Vendor PO generator will NEVER re-order this item).</li>
                      <li>Auto-grades product as <b>Grade D (Dead Stock)</b>.</li>
                      <li>Clearance sales will <b>NOT</b> be counted towards Fast-Moving algorithm (prevents the clearance trap).</li>
                    </ul>
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-slate-700 mb-1">
                      Clearance Floor Price (₹) <span className="font-normal text-slate-400">(Optional markdown rate)</span>
                    </label>
                    <input
                      type="number"
                      value={discountPrice}
                      onChange={(e) => setDiscountPrice(e.target.value)}
                      placeholder="e.g. 75"
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] font-bold focus:outline-none focus:border-blue-500"
                    />
                    <div className="text-[10px] text-slate-400 mt-1">Normal Rate was ₹{selectedProduct.min_selling_price || 100}</div>
                  </div>
                </>
              ) : (
                <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 text-[12px] text-blue-900 leading-relaxed">
                  This product is currently <b>STOPPED</b>. Reactivating will restore its status to <b>Stable</b>, allowing the procurement team to re-order it from vendors.
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearanceModal(false)}
                  className="flex-1 vw-btn-secondary h-10 text-[13px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 font-bold text-[13px] text-white rounded-lg h-10 transition-colors flex items-center justify-center gap-1.5 ${
                    selectedProduct.purchase_status === "Stopped"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {submitting ? <RefreshCcw size={15} className="animate-spin" /> : <Check size={16} />}
                  {selectedProduct.purchase_status === "Stopped" ? "Confirm Reactivate" : "Confirm Clearance & Lock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
