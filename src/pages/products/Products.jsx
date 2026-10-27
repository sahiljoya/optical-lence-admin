import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Search, Plus, Filter, Package, Power, X, Loader2 } from "lucide-react";
import { productApi } from "../../services/productApi";
import { notify } from "@/lib/notify";
import { useConfirm } from "@/hooks/useConfirm";
import "@/styles/veriwide.css";

export function Products() {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const { confirm, confirmDialog } = useConfirm();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await productApi.getProducts({});
      if (res.error === false) {
        setProducts(res.data.list || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // Inactive products are excluded from the customer-facing catalog (getProductList /
  // getPopularLenses / getCustomerCatalog all query is_active: true), so this is the real
  // on/off switch for whether customers can see or order a product at all.
  const handleToggleActive = async (prod) => {
    const goingInactive = prod.is_active;
    if (goingInactive) {
      const ok = await confirm(
        `Deactivate ${prod.brand} ${prod.product_code}? It will disappear from the customer-facing catalog immediately.`,
        { title: "Deactivate Product", acceptLabel: "Deactivate", danger: true }
      );
      if (!ok) return;
    }
    setTogglingId(prod._id);
    try {
      const res = await productApi.updateProduct(prod._id, { is_active: !prod.is_active });
      if (res.error === false) {
        setProducts(prev => prev.map(p => p._id === prod._id ? { ...p, is_active: !p.is_active } : p));
        notify.success(goingInactive ? "Product deactivated — hidden from customers." : "Product activated — visible to customers again.");
      } else {
        notify.error(res.message || "Failed to update product status.");
      }
    } catch (e) {
      notify.error("Error updating product status.");
    }
    setTogglingId(null);
  };

  const filteredProducts = products.filter(p => 
    (p.brand || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.product_code || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-1 sm:mt-2 mb-3 sm:mb-5 gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2 flex-wrap">
            Inventory Catalog
            <span className="text-[9px] sm:text-[10px] md:text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              {products.length} Series
            </span>
          </h1>
          <p className="text-[10px] sm:text-xs md:text-[13px] text-slate-500 mt-0.5 sm:mt-1 truncate sm:whitespace-normal">
            Manage lens series, matrices, and stock variants.
          </p>
        </div>
        <Link 
          to="/products/new" 
          className="w-full sm:w-auto vw-btn-primary h-8 sm:h-9 md:h-10 px-3.5 sm:px-4 text-[11px] sm:text-xs md:text-[13px] font-semibold gap-1.5 sm:gap-2 flex items-center justify-center rounded-xl cursor-pointer shadow-xs whitespace-nowrap"
        >
          <Plus size={15} className="sm:w-4 sm:h-4" /> New Product Series
        </Link>
      </div>

      {/* Toolbar / Search Filter */}
      <div className="vw-card p-2.5 sm:p-3 mb-3.5 sm:mb-5 flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
          <input 
            type="text" 
            placeholder="Search products by brand or code..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 sm:h-10 pl-9 pr-8 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs transition-all" 
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm("")} 
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button className="vw-btn-secondary h-9 sm:h-10 px-3.5 sm:px-4 text-xs sm:text-[13px] font-medium gap-1.5 sm:gap-2 w-full sm:w-auto flex items-center justify-center rounded-xl cursor-pointer shadow-xs shrink-0">
          <Filter size={15} className="text-slate-500" /> Filters
        </button>
      </div>

      {/* Table Card */}
      <div className="vw-card flex flex-col overflow-hidden" style={{ padding: 0 }}>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[680px] sm:min-w-[760px] text-[11px] sm:text-xs md:text-[13px]" style={{ borderCollapse: "collapse" }}>
            <thead style={{ background: "var(--soft-bg)", borderBottom: "1px solid var(--divider)" }}>
              <tr className="text-[9px] sm:text-[10px] md:text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                <th className="py-2.5 sm:py-3 px-3 sm:px-4">Product Name</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4">Details</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-center">Base Price</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4">Status</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-10 sm:py-14 text-slate-400 font-medium text-[11px] sm:text-xs md:text-sm">
                    <Loader2 size={20} className="mx-auto mb-2 animate-spin text-slate-400" />
                    Loading products...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 sm:py-16 text-center text-slate-500">
                    <Package size={34} className="mx-auto text-slate-300 mb-2 sm:w-9 sm:h-9" />
                    <p className="font-semibold text-xs sm:text-sm text-slate-700">No products found.</p>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-1">Try adjusting your search terms or filters.</p>
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm("")}
                        className="mt-3 px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                      >
                        Clear search
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => (
                  <tr key={prod._id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 sm:py-3.5 px-3 sm:px-4">
                      <div className="font-semibold sm:font-bold text-slate-800 text-[11px] sm:text-xs md:text-[13px]">{prod.brand}</div>
                      <div className="text-[9px] sm:text-[10px] md:text-xs text-slate-400 font-mono mt-0.5">{prod.product_code || "NO CODE"}</div>
                    </td>
                    <td className="py-2.5 sm:py-3.5 px-3 sm:px-4">
                      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] md:text-[11px] font-semibold border border-blue-100">{prod.lens_type}</span>
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] md:text-[11px] font-semibold border border-slate-200 font-mono">Index: {prod.index}</span>
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] md:text-[11px] font-semibold border border-slate-200">{prod.coating}</span>
                      </div>
                    </td>
                    <td className="py-2.5 sm:py-3.5 px-3 sm:px-4 text-center">
                      <div className="inline-flex items-center gap-1 font-bold font-mono text-[11px] sm:text-xs md:text-sm text-emerald-700">
                        ₹{Number(prod.min_selling_price || 0).toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td className="py-2.5 sm:py-3.5 px-3 sm:px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] md:text-[11px] font-bold uppercase tracking-wider border ${
                        prod.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {prod.is_active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="py-2.5 sm:py-3.5 px-3 sm:px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 sm:gap-1.5">
                        <Link 
                          to={`/products/${prod._id}/edit`} 
                          className="p-1.5 sm:p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer" 
                          title="Edit Product"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                        </Link>
                        <Link 
                          to={`/products/${prod._id}`} 
                          className="vw-btn-secondary h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-[11px] md:text-xs font-semibold gap-1 inline-flex items-center rounded-lg cursor-pointer shadow-xs whitespace-nowrap"
                        >
                          <Package size={13} /> View Matrix
                        </Link>
                        <button
                          onClick={() => handleToggleActive(prod)}
                          disabled={togglingId === prod._id}
                          title={prod.is_active ? "Deactivate (hide from customers)" : "Activate (show to customers)"}
                          className={`h-7 sm:h-8 px-2 sm:px-2.5 text-[10px] sm:text-[11px] md:text-xs font-semibold gap-1 inline-flex items-center rounded-lg border transition-colors cursor-pointer shadow-xs whitespace-nowrap disabled:opacity-50 ${
                            prod.is_active
                              ? "border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100"
                              : "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                          }`}
                        >
                          {togglingId === prod._id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Power size={13} />
                          )}
                          {prod.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {confirmDialog}
    </>
  );
}
