import { useState, useEffect, useMemo } from "react";
import { Link, useSearch, useNavigate } from "@tanstack/react-router";
import { 
  Search, Plus, Filter, Package, Power, X, Loader2, AlertTriangle, 
  ArrowLeft, ArrowRight, LayoutGrid, List, Sparkles, Layers
} from "lucide-react";
import { productApi, brandApi } from "../../services/productApi";
import { formatPower } from "./matrixHelpers";
import { notify } from "@/lib/notify";
import { useConfirm } from "@/hooks/useConfirm";
import "@/styles/veriwide.css";

const displayPower = (val) => {
  if (val === null || val === undefined || isNaN(val)) return "0.00";
  const num = Number(val);
  return num > 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
};

const isProgressiveFamily = (lensType) => {
  return lensType === "Progressive" || lensType === "KT" || lensType === "RX";
};

export function Products() {
  const routeSearch = useSearch({ strict: false });
  const navigate = useNavigate();

  const selectedBrand = routeSearch?.brand || null;
  const isAllView = routeSearch?.view === "all";

  const [searchTerm, setSearchTerm] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [lensCategory, setLensCategory] = useState("ALL"); // "ALL" | "SINGLE_VISION" | "PROGRESSIVE"
  const [togglingId, setTogglingId] = useState(null);
  const { confirm, confirmDialog } = useConfirm();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setLoadingBrands(true);
    try {
      const [prodRes, brandRes] = await Promise.all([
        productApi.getProducts({}),
        brandApi.getBrands().catch(() => ({ error: true, data: [] }))
      ]);

      if (prodRes && prodRes.error === false) {
        setProducts(prodRes.data.list || []);
      }

      if (brandRes && brandRes.error === false) {
        setBrands(brandRes.data || []);
      }
    } catch (e) {
      console.error("Error loading products/brands:", e);
    }
    setLoading(false);
    setLoadingBrands(false);
  };

  // Derive all unique brands from the brand list and product records
  const allBrandsList = useMemo(() => {
    const brandMap = new Map();

    // Populate from registered brands
    brands.forEach((b) => {
      if (b.name) {
        brandMap.set(b.name.trim().toLowerCase(), {
          _id: b._id,
          name: b.name.trim(),
          image: b.image,
          description: b.description || "Lens Brand",
        });
      }
    });

    // Also include any brands found in existing products
    products.forEach((p) => {
      if (p.brand && !brandMap.has(p.brand.trim().toLowerCase())) {
        brandMap.set(p.brand.trim().toLowerCase(), {
          _id: p.brand.trim(),
          name: p.brand.trim(),
          image: null,
          description: "Lens Brand",
        });
      }
    });

    return Array.from(brandMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [brands, products]);

  // Count products per brand
  const brandStatsMap = useMemo(() => {
    const counts = {};
    products.forEach((p) => {
      const b = (p.brand || "Unbranded").trim();
      counts[b.toLowerCase()] = (counts[b.toLowerCase()] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Toggle product active / inactive
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

  // Filter brands for Level 1
  const filteredBrands = useMemo(() => {
    if (!brandSearch) return allBrandsList;
    return allBrandsList.filter(b => 
      b.name.toLowerCase().includes(brandSearch.toLowerCase())
    );
  }, [allBrandsList, brandSearch]);

  // Filter products by brand first
  const brandScopedProducts = useMemo(() => {
    if (!selectedBrand) return products;
    return products.filter((p) => p.brand?.trim().toLowerCase() === selectedBrand.toLowerCase());
  }, [products, selectedBrand]);

  // Counts for tabs (Single Vision vs Progressive)
  const tabCounts = useMemo(() => {
    let sv = 0;
    let prog = 0;
    brandScopedProducts.forEach((p) => {
      if (isProgressiveFamily(p.lens_type)) {
        prog += 1;
      } else {
        sv += 1;
      }
    });
    return { all: brandScopedProducts.length, sv, prog };
  }, [brandScopedProducts]);

  // Filter products for Level 2 (Brand + Tab + Search)
  const displayedProducts = useMemo(() => {
    return brandScopedProducts.filter((p) => {
      // Lens category filter (Single Vision vs Progressive)
      if (lensCategory === "SINGLE_VISION" && isProgressiveFamily(p.lens_type)) {
        return false;
      }
      if (lensCategory === "PROGRESSIVE" && !isProgressiveFamily(p.lens_type)) {
        return false;
      }

      // Search term filter
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const brandMatch = (p.brand || "").toLowerCase().includes(query);
        const codeMatch = (p.product_code || "").toLowerCase().includes(query);
        const lensTypeMatch = (p.lens_type || "").toLowerCase().includes(query);
        const labelMatch = (p.range_label || "").toLowerCase().includes(query);
        if (!brandMatch && !codeMatch && !lensTypeMatch && !labelMatch) return false;
      }
      return true;
    });
  }, [brandScopedProducts, lensCategory, searchTerm]);

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-1 sm:mt-2 mb-4 sm:mb-5 gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2 flex-wrap">
            Inventory Catalog
            <span className="text-[9px] sm:text-[10px] md:text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              {allBrandsList.length} Brands • {products.length} Series
            </span>
          </h1>
          <p className="text-[10px] sm:text-xs md:text-[13px] text-slate-500 mt-0.5 sm:mt-1 truncate sm:whitespace-normal">
            Manage lens series, power matrix ranges, and stock variants.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* View mode toggle (Brand View vs Flat List) */}
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => {
                navigate({ to: "/products", search: {} });
                setLensCategory("ALL");
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                !isAllView && !selectedBrand
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid size={13} />
              <span className="hidden sm:inline">By Brand</span>
            </button>
            <button
              type="button"
              onClick={() => {
                navigate({ to: "/products", search: { view: "all" } });
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                isAllView
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <List size={13} />
              <span className="hidden sm:inline">All Series</span>
            </button>
          </div>

          <Link
            to="/aging-stock"
            className="w-full sm:w-auto bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 h-8 sm:h-9 md:h-10 px-3 sm:px-3.5 text-[11px] sm:text-xs md:text-[13px] font-semibold gap-1.5 flex items-center justify-center rounded-xl cursor-pointer shadow-xs whitespace-nowrap transition-colors"
          >
            <AlertTriangle size={15} className="text-amber-600 shrink-0" />
            <span>Slow & Dead Stock</span>
          </Link>

          <Link 
            to="/products/new"
            search={selectedBrand ? { brand: selectedBrand } : {}}
            className="w-full sm:w-auto vw-btn-primary h-8 sm:h-9 md:h-10 px-3 sm:px-4 text-[11px] sm:text-xs md:text-[13px] font-semibold gap-1.5 flex items-center justify-center rounded-xl cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Plus size={15} className="shrink-0" />
            <span>New Series</span>
          </Link>
        </div>
      </div>

      {/* =====================================================================
          LEVEL 1: BRAND SELECTION CARDS
          ===================================================================== */}
      {!selectedBrand && !isAllView ? (
        <div className="space-y-4">
          {/* Brand Search Bar */}
          <div className="vw-card p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                <Package size={17} className="text-blue-600" />
                Select Brand to View Products
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Brand click karein uske Single Vision aur Progressive series inspect karne ke liye.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search brand name..."
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                className="w-full h-9 sm:h-10 pl-9 pr-8 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs transition-all"
              />
              {brandSearch && (
                <button
                  onClick={() => setBrandSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Brands Grid */}
          {loadingBrands || loading ? (
            <div className="vw-card p-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <Loader2 size={24} className="animate-spin text-blue-600" />
              <span className="text-xs sm:text-sm font-medium">Loading brands...</span>
            </div>
          ) : filteredBrands.length === 0 ? (
            <div className="vw-card p-12 text-center text-slate-500">
              <Package size={34} className="mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-xs sm:text-sm text-slate-700">No brands found matching "{brandSearch}".</p>
              {brandSearch && (
                <button
                  onClick={() => setBrandSearch("")}
                  className="mt-3 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {filteredBrands.map((b) => {
                const count = brandStatsMap[b.name.toLowerCase()] || 0;
                const initials = (b.name || "B").slice(0, 2).toUpperCase();
                return (
                  <div
                    key={b._id || b.name}
                    onClick={() => {
                      navigate({ to: "/products", search: { brand: b.name } });
                      setSearchTerm("");
                      setLensCategory("ALL");
                    }}
                    role="button"
                    tabIndex={0}
                    className="vw-card p-4 sm:p-5 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3 group bg-white border border-slate-200 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      {b.image ? (
                        <img
                          src={b.image}
                          alt={b.name}
                          className="w-11 h-11 sm:w-12 sm:h-12 object-contain rounded-xl bg-slate-50 border border-slate-100 p-1 shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-sm sm:text-base flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-blue-600 transition-colors truncate">
                          {b.name}
                        </h4>
                        <span className="inline-block mt-0.5 text-[10px] sm:text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.2 rounded-full">
                          {count} Series
                        </span>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs font-bold text-blue-600 group-hover:text-blue-700">
                      <span>Browse Series</span>
                      <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* =====================================================================
            LEVEL 2: PRODUCT SERIES TABLE (FOR SELECTED BRAND OR ALL)
            ===================================================================== */
        <div className="space-y-3.5">
          {/* Breadcrumb / Back Navigation if Brand Selected */}
          {selectedBrand && (
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 shadow-xs">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    navigate({ to: "/products", search: {} });
                    setSearchTerm("");
                    setLensCategory("ALL");
                  }}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  <span>All Brands</span>
                </button>
                <div className="h-4 w-[1px] bg-slate-200 mx-1 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-slate-900">
                    {selectedBrand}
                  </span>
                  <span className="text-[10px] sm:text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    {tabCounts.all} Series
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  navigate({ to: "/products", search: {} });
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                Change Brand
              </button>
            </div>
          )}

          {/* Lens Family Tabs (Single Vision vs Progressive/KT Management) */}
          <div className="flex items-center gap-1.5 sm:gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setLensCategory("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                lensCategory === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Layers size={13} />
              <span>All Products</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                lensCategory === "ALL" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {tabCounts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setLensCategory("SINGLE_VISION")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                lensCategory === "SINGLE_VISION"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700"
              }`}
            >
              <Sparkles size={13} className={lensCategory === "SINGLE_VISION" ? "text-blue-200" : "text-blue-500"} />
              <span>Single Vision</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                lensCategory === "SINGLE_VISION" ? "bg-blue-700 text-white" : "bg-blue-50 text-blue-700 border border-blue-100"
              }`}>
                {tabCounts.sv}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setLensCategory("PROGRESSIVE")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                lensCategory === "PROGRESSIVE"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-purple-50 hover:text-purple-700"
              }`}
            >
              <Package size={13} className={lensCategory === "PROGRESSIVE" ? "text-purple-200" : "text-purple-500"} />
              <span>Progressive & Bifocal (KT)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                lensCategory === "PROGRESSIVE" ? "bg-purple-700 text-white" : "bg-purple-50 text-purple-700 border border-purple-100"
              }`}>
                {tabCounts.prog}
              </span>
            </button>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="vw-card p-2.5 sm:p-3 flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <div className="relative flex-1 w-full">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
              <input 
                type="text" 
                placeholder={selectedBrand ? `Search within ${selectedBrand} products...` : "Search products by code, lens type, or power..."}
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

          {/* Table Card (With Excel-matching SPH/CYL yellow-highlighted power headers) */}
          <div className="vw-card flex flex-col overflow-hidden" style={{ padding: 0 }}>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left min-w-[840px] text-[11px] sm:text-xs md:text-[13px]" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr className="text-[9px] sm:text-[10px] md:text-[11px] font-bold text-slate-600 tracking-wider uppercase border-b border-slate-200">
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4 bg-slate-50">Product Name / Code</th>
                    <th className="py-2.5 sm:py-3 px-2 sm:px-3 bg-slate-50">Details</th>

                    {/* Standardized Power Range Columns (matching Excel screenshot) */}
                    <th className="py-2.5 sm:py-3 px-2 sm:px-3 text-center bg-amber-100/80 text-amber-950 border-x border-amber-200 font-mono tracking-tight font-extrabold">
                      SPH (Start ~ End)
                    </th>
                    <th className="py-2.5 sm:py-3 px-2 text-center bg-amber-100/80 text-amber-950 border-r border-amber-200 font-mono tracking-tight font-extrabold">
                      SPH Step
                    </th>
                    <th className="py-2.5 sm:py-3 px-2 text-center bg-amber-100/80 text-amber-950 border-r border-amber-200 font-mono tracking-tight font-extrabold">
                      CYL Start
                    </th>
                    <th className="py-2.5 sm:py-3 px-2 text-center bg-amber-100/80 text-amber-950 border-r border-amber-200 font-mono tracking-tight font-extrabold">
                      CYL End
                    </th>

                    {/* Progressive / Bifocal specific columns */}
                    {(lensCategory === "PROGRESSIVE" || lensCategory === "ALL") && (
                      <>
                        <th className="py-2.5 sm:py-3 px-2 text-center bg-purple-100/80 text-purple-950 border-r border-purple-200 font-mono tracking-tight font-extrabold">
                          ADD Range
                        </th>
                        <th className="py-2.5 sm:py-3 px-2 text-center bg-purple-100/80 text-purple-950 border-r border-purple-200 font-mono tracking-tight font-extrabold">
                          Axis
                        </th>
                      </>
                    )}

                    <th className="py-2.5 sm:py-3 px-3 text-center bg-slate-50">Base Price</th>
                    <th className="py-2.5 sm:py-3 px-3 bg-slate-50">Status</th>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-right bg-slate-50">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="11" className="text-center py-10 sm:py-14 text-slate-400 font-medium text-[11px] sm:text-xs md:text-sm">
                        <Loader2 size={20} className="mx-auto mb-2 animate-spin text-slate-400" />
                        Loading products...
                      </td>
                    </tr>
                  ) : displayedProducts.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="py-12 sm:py-16 text-center text-slate-500">
                        <Package size={34} className="mx-auto text-slate-300 mb-2 sm:w-9 sm:h-9" />
                        <p className="font-semibold text-xs sm:text-sm text-slate-700">No products found.</p>
                        <p className="text-[10px] sm:text-xs text-slate-400 mt-1">
                          {selectedBrand 
                            ? `No ${lensCategory === "ALL" ? "" : lensCategory.replace("_", " ")} products under ${selectedBrand}.`
                            : "Try adjusting your search terms or filters."}
                        </p>
                        {(searchTerm || lensCategory !== "ALL") && (
                          <button 
                            onClick={() => {
                              setSearchTerm("");
                              setLensCategory("ALL");
                            }}
                            className="mt-3 px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                          >
                            Reset filters
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    displayedProducts.map((prod) => {
                      const isProg = isProgressiveFamily(prod.lens_type);
                      const sphStart = displayPower(prod.min_sph);
                      const sphEnd = displayPower(prod.max_sph);
                      const cylStart = displayPower(prod.max_cyl ?? 0);
                      const cylEnd = displayPower(prod.min_cyl ?? 0);

                      return (
                        <tr key={prod._id} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
                          {/* Product Name & SKU */}
                          <td className="py-2.5 sm:py-3 px-3 sm:px-4">
                            <div className="font-bold text-slate-900 text-[11px] sm:text-xs md:text-[13px]">{prod.brand}</div>
                            <div className="text-[9px] sm:text-[10px] md:text-xs text-slate-400 font-mono mt-0.5">{prod.product_code || "NO CODE"}</div>
                            {prod.range_label && (
                              <div className="text-[9px] text-slate-500 italic mt-0.5">{prod.range_label}</div>
                            )}
                          </td>

                          {/* Details Badges */}
                          <td className="py-2.5 sm:py-3 px-2 sm:px-3">
                            <div className="flex flex-col gap-1">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold border ${
                                isProg 
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}>
                                {prod.lens_type}
                              </span>
                              <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-slate-500 font-mono">
                                <span>{prod.index}</span>
                                <span>•</span>
                                <span className="truncate max-w-[80px]">{prod.coating}</span>
                              </div>
                            </div>
                          </td>

                          {/* SPH Range */}
                          <td className="py-2.5 sm:py-3 px-2 sm:px-3 text-center bg-amber-50/20 border-x border-amber-100/60">
                            <span className="font-mono font-bold text-slate-900 text-xs sm:text-[13px] bg-white border border-amber-200/80 px-2 py-0.5 rounded-md shadow-2xs whitespace-nowrap">
                              {sphStart} ~ {sphEnd}
                            </span>
                          </td>

                          {/* SPH Step */}
                          <td className="py-2.5 sm:py-3 px-2 text-center bg-amber-50/20 border-r border-amber-100/60">
                            <span className="font-mono text-xs font-semibold text-slate-700 bg-amber-50/80 border border-amber-200/60 px-1.5 py-0.5 rounded">
                              0.25
                            </span>
                          </td>

                          {/* CYL Start */}
                          <td className="py-2.5 sm:py-3 px-2 text-center bg-amber-50/20 border-r border-amber-100/60">
                            <span className="font-mono text-xs font-semibold text-slate-800">
                              {cylStart}
                            </span>
                          </td>

                          {/* CYL End */}
                          <td className="py-2.5 sm:py-3 px-2 text-center bg-amber-50/20 border-r border-amber-100/60">
                            <span className="font-mono text-xs font-semibold text-slate-800">
                              {cylEnd}
                            </span>
                          </td>

                          {/* Progressive Columns */}
                          {(lensCategory === "PROGRESSIVE" || lensCategory === "ALL") && (
                            <>
                              <td className="py-2.5 sm:py-3 px-2 text-center bg-purple-50/20 border-r border-purple-100/60">
                                {isProg ? (
                                  <span className="font-mono text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200/70 px-1.5 py-0.5 rounded whitespace-nowrap">
                                    +1.00 ~ +3.00
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-mono">—</span>
                                )}
                              </td>
                              <td className="py-2.5 sm:py-3 px-2 text-center bg-purple-50/20 border-r border-purple-100/60">
                                {isProg ? (
                                  <span className="font-mono text-[11px] text-purple-700">
                                    90° / 180°
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-mono">—</span>
                                )}
                              </td>
                            </>
                          )}

                          {/* Base Price */}
                          <td className="py-2.5 sm:py-3 px-3 text-center">
                            <div className="inline-flex items-center gap-1 font-bold font-mono text-[11px] sm:text-xs md:text-sm text-emerald-700">
                              ₹{Number(prod.min_selling_price || 0).toLocaleString('en-IN')}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-2.5 sm:py-3 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] md:text-[11px] font-bold uppercase tracking-wider border ${
                              prod.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              {prod.is_active ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1 sm:gap-1.5">
                              <Link 
                                to={`/products/${prod._id}/edit`}
                                search={{ brand: prod.brand }}
                                className="p-1.5 sm:p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer" 
                                title="Edit Product"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                              </Link>
                              <Link 
                                to={`/products/${prod._id}`}
                                search={{ brand: prod.brand }}
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
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {confirmDialog}
    </>
  );
}
