import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useParams, useNavigate, useSearch } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Settings2,
  Plus,
  Tag,
  Grid,
  Package,
  Trash2,
  Check,
  Sparkles,
} from "lucide-react";
import { brandApi, productApi, warehouseApi } from "../../services/productApi";
import { notify } from "@/lib/notify";
import { MatrixEditor, defaultRangeConfigFromProduct } from "./MatrixEditor";
import { generateProductCode, validatePowerRange } from "./matrixHelpers";
import { PowerInput } from "@/components/common/PowerInput";
import { DeptBadge } from "@/components/common/DeptBadge";
import { AddBrandModal } from "@/components/products/AddBrandModal";
import "@/styles/veriwide.css";

export function EditProduct() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const routeSearch = useSearch({ strict: false });

  const [currentStep, setCurrentStep] = useState(1); // 1 = Details & Ranges, 2 = Matrix Stock Grid
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [brands, setBrands] = useState([]);
  const [racks, setRacks] = useState([]);
  const [showBrandModal, setShowBrandModal] = useState(false);

  const [productData, setProductData] = useState({
    brand: "",
    product_name: "",
    index: 1.56,
    base: "Hard Coat (HC)",
    coating: "Standard",
    lens_type: "Single Vision",
    diameter: 65,
    product_code: "",
    min_selling_price: 100,
    value_tier: "commodity",
    tier_prices: { courier: 120, stock_a: 110, stock_a_plus: 105, stock_platinum: 100 },
    range_label: "",
    lens_nature: "Finished",
    grade_quantity: "",
    grade_rate: "",
    purchase_status: "Stable",
    return_status: "Can Take",
    part_number: "",
    product_image: "",
    low_stock_threshold: 15,
    n_a_flag: false,
  });

  const [rangeConfig, setRangeConfig] = useState(defaultRangeConfigFromProduct(null));
  const [hasCyl, setHasCyl] = useState(true);

  const isProgressiveFamily =
    productData.lens_type === "Progressive" ||
    productData.lens_type === "KT" ||
    productData.lens_type === "RX";

  const autoSku = useMemo(() => {
    if (productData.product_code) return productData.product_code;
    const primaryCyl = hasCyl && rangeConfig?.cylBlocks?.length > 0 ? rangeConfig.cylBlocks[0] : null;
    const minCyl = primaryCyl && primaryCyl.min !== undefined && primaryCyl.min !== null && !isNaN(parseFloat(primaryCyl.min)) ? parseFloat(primaryCyl.min) : 0;
    const maxCyl = primaryCyl && primaryCyl.max !== undefined && primaryCyl.max !== null && !isNaN(parseFloat(primaryCyl.max)) ? parseFloat(primaryCyl.max) : 0;
    const hasSph =
      rangeConfig?.sph?.min !== undefined &&
      rangeConfig?.sph?.min !== null &&
      String(rangeConfig.sph.min).trim() !== "" &&
      rangeConfig?.sph?.max !== undefined &&
      rangeConfig?.sph?.max !== null &&
      String(rangeConfig.sph.max).trim() !== "";
    return generateProductCode({
      brand: productData.brand,
      index: productData.index,
      base: productData.base,
      lens_type: productData.lens_type,
      diameter: productData.diameter,
      min_sph: hasSph ? parseFloat(rangeConfig.sph.min) : undefined,
      max_sph: hasSph ? parseFloat(rangeConfig.sph.max) : undefined,
      min_cyl: minCyl,
      max_cyl: maxCyl,
      range_label: productData.range_label,
    });
  }, [
    productData.product_code,
    productData.brand,
    productData.index,
    productData.base,
    productData.lens_type,
    productData.diameter,
    productData.range_label,
    rangeConfig,
    hasCyl,
  ]);

  useEffect(() => {
    if (!id) return;
    const init = async () => {
      setIsLoading(true);
      try {
        const [brandsRes, rackRes, prodRes] = await Promise.all([
          brandApi.getBrands(),
          warehouseApi.getRackSummary(),
          productApi.getProductDetail(id),
        ]);

        const brandsList = brandsRes.error === false ? brandsRes.data : [];
        setBrands(brandsList);
        setRacks(rackRes.error === false ? rackRes.data : []);

        if (prodRes.error !== false) {
          notify.error(prodRes.message || "Failed to load product");
          return;
        }

        const product = prodRes.data;
        setProductData({
          brand: product.brand || "",
          product_name: product.product_name || "",
          index: product.index || 1.56,
          base: product.base || "Hard Coat (HC)",
          coating: product.coating || "Standard",
          lens_type: product.lens_type || "Single Vision",
          diameter: product.diameter || 65,
          product_code: product.product_code || "",
          min_selling_price: product.min_selling_price || 0,
          value_tier: product.value_tier || "commodity",
          tier_prices: product.tier_prices || {
            courier: 0,
            stock_a: 0,
            stock_a_plus: 0,
            stock_platinum: 0,
          },
          range_label: product.range_label || "",
          lens_nature: product.lens_nature || "Finished",
          grade_quantity: product.grade_quantity || "",
          grade_rate: product.grade_rate || "",
          purchase_status: product.purchase_status || "Stable",
          return_status: product.return_status || "Can Take",
          part_number: product.part_number || "",
          product_image: product.product_image || "",
          low_stock_threshold: product.low_stock_threshold ?? 15,
          n_a_flag: product.n_a_flag || false,
        });

        const cfg = defaultRangeConfigFromProduct(product);
        setRangeConfig(cfg);
        const hasCylinderData = product.min_cyl !== 0 || product.max_cyl !== 0 || product.axis !== null;
        setHasCyl(hasCylinderData);
      } catch (e) {
        console.error("Failed to load product", e);
        notify.error("Failed to load product");
      }
      setIsLoading(false);
    };
    init();
  }, [id]);

  const fetchBrands = async () => {
    try {
      const res = await brandApi.getBrands();
      if (res.error === false) setBrands(res.data);
    } catch (e) {
      console.error("Failed to fetch brands", e);
    }
  };

  // Range Configuration Handlers
  const updateSph = (field, val) => {
    setRangeConfig((prev) => ({
      ...prev,
      sph: { ...prev.sph, [field]: val },
    }));
  };

  const updateCylBlock = (idx, field, val) => {
    setRangeConfig((prev) => {
      const blocks = [...prev.cylBlocks];
      blocks[idx] = { ...blocks[idx], [field]: val };
      return { ...prev, cylBlocks: blocks };
    });
  };

  const addCylBlock = () => {
    setRangeConfig((prev) => ({
      ...prev,
      cylBlocks: [
        ...prev.cylBlocks,
        { min: "-2.00", max: "0.00", step: "0.25", axis: isProgressiveFamily ? "90" : "" },
      ],
    }));
  };

  const removeCylBlock = (idx) => {
    setRangeConfig((prev) => {
      if (prev.cylBlocks.length <= 1) return prev;
      return {
        ...prev,
        cylBlocks: prev.cylBlocks.filter((_, i) => i !== idx),
      };
    });
  };

  const toggleHasCyl = (checked) => {
    setHasCyl(checked);
    if (checked && (!rangeConfig.cylBlocks || rangeConfig.cylBlocks.length === 0)) {
      setRangeConfig((prev) => ({
        ...prev,
        cylBlocks: [{ min: "0.00", max: "-2.00", step: "0.25", axis: isProgressiveFamily ? "90" : "" }],
      }));
    }
  };

  // Step 1 -> Step 2 validation
  const handleProceedToMatrix = () => {
    if (!productData.brand) {
      notify.warning("Please select a Brand first.");
      return;
    }

    const hasSph =
      rangeConfig?.sph?.min !== undefined &&
      rangeConfig?.sph?.min !== null &&
      String(rangeConfig.sph.min).trim() !== "" &&
      rangeConfig?.sph?.max !== undefined &&
      rangeConfig?.sph?.max !== null &&
      String(rangeConfig.sph.max).trim() !== "";

    if (hasSph) {
      const vSph = validatePowerRange(rangeConfig.sph.min, rangeConfig.sph.max, rangeConfig.sph.step, "SPH");
      if (!vSph.valid) {
        notify.warning(vSph.error);
        return;
      }
    } else if (!isProgressiveFamily || !hasCyl) {
      notify.warning("SPH range is required.");
      return;
    }

    if (hasCyl && rangeConfig?.cylBlocks?.length > 0) {
      for (let i = 0; i < rangeConfig.cylBlocks.length; i++) {
        const b = rangeConfig.cylBlocks[i];
        const vCyl = validatePowerRange(b.min, b.max, b.step, `CYL Block ${i + 1}`);
        if (!vCyl.valid) {
          notify.warning(vCyl.error);
          return;
        }
        if (isProgressiveFamily) {
          const ax = parseInt(b.axis);
          if (isNaN(ax) || ax < 1 || ax > 180) {
            notify.warning(
              `Axis (1–180°) is required for Block ${i + 1} when Cylinder is present in Progressive/KT/RX lens.`
            );
            return;
          }
        }
      }
    }

    if (isProgressiveFamily) {
      const vAdd = validatePowerRange(
        Math.abs(parseFloat(rangeConfig.add.min)),
        Math.abs(parseFloat(rangeConfig.add.max)),
        rangeConfig.add.step,
        "ADD"
      );
      if (!vAdd.valid) {
        notify.warning(vAdd.error);
        return;
      }
    }

    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Save product details to backend
  const handleSaveProduct = async () => {
    if (!productData.brand) return notify.warning("Brand is required.");
    const sku = productData.product_code || autoSku;
    if (!sku) return notify.warning("Unable to determine Product Code (SKU).");
    setIsSaving(true);
    try {
      const primaryCyl = hasCyl && rangeConfig?.cylBlocks?.length > 0 ? rangeConfig.cylBlocks[0] : null;
      const cylMins = hasCyl ? rangeConfig.cylBlocks.map((b) => parseFloat(b.min)).filter((v) => !isNaN(v)) : [0];
      const cylMaxs = hasCyl ? rangeConfig.cylBlocks.map((b) => parseFloat(b.max)).filter((v) => !isNaN(v)) : [0];
      const parsedAxis = primaryCyl?.axis ? parseInt(primaryCyl.axis, 10) : null;

      const payload = {
        ...productData,
        product_code: sku,
        product_name: productData.product_name,
        min_sph: parseFloat(rangeConfig?.sph?.min) || 0,
        max_sph: parseFloat(rangeConfig?.sph?.max) || 0,
        step_sph: parseFloat(rangeConfig?.sph?.step) || 0.25,
        min_cyl: cylMins.length > 0 ? Math.min(...cylMins) : 0,
        max_cyl: cylMaxs.length > 0 ? Math.max(...cylMaxs) : 0,
        step_cyl: primaryCyl?.step ? parseFloat(primaryCyl.step) : 0.25,
        axis: parsedAxis,
        axis_rule: parsedAxis ? "Fixed" : "",
        min_add: isProgressiveFamily && rangeConfig?.add?.min ? Math.abs(parseFloat(rangeConfig.add.min)) : null,
        max_add: isProgressiveFamily && rangeConfig?.add?.max ? Math.abs(parseFloat(rangeConfig.add.max)) : null,
        step_add: isProgressiveFamily && rangeConfig?.add?.step ? parseFloat(rangeConfig.add.step) : null,
        grade_quantity: productData.grade_quantity || undefined,
        grade_rate: productData.grade_rate || undefined,
      };

      const pRes = await productApi.updateProduct(id, payload);
      if (pRes.error !== false) {
        notify.error(pRes.message || "Failed to update product");
      } else {
        notify.success("Product details updated successfully.");
        const targetBrand = productData.brand || routeSearch?.brand;
        navigate({ to: "/products", search: targetBrand ? { brand: targetBrand } : {} });
      }
    } catch (error) {
      notify.error("An error occurred while saving.");
      console.error(error);
    }
    setIsSaving(false);
  };

  const brandParam = routeSearch?.brand || productData?.brand;

  if (isLoading) {
    return (
      <div className="vw-card p-8 sm:p-12 text-center text-slate-500 rounded-2xl border border-slate-200/80 my-4">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs sm:text-[13px] font-semibold text-slate-600">Loading lens series...</p>
      </div>
    );
  }

  return (
    <>
      {/* Top Header & Step Navigation (Same design as CreateProduct.jsx) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4 mt-1 sm:mt-2">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            to="/products"
            search={brandParam ? { brand: brandParam } : {}}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-xs cursor-pointer shrink-0"
            title={brandParam ? `Back to ${brandParam}` : "Back to Products"}
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 tracking-tight truncate">
              Update Lens Series
            </h1>
            <p className="text-[11px] sm:text-xs md:text-[13px] text-slate-500 mt-0.5 truncate font-mono">
              Editing: <span className="text-slate-800 font-semibold">{productData.product_name || productData.product_code || id}</span>
            </p>
          </div>
        </div>

        {/* Step Indicator Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 self-start sm:self-auto bg-white p-1 rounded-2xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
              currentStep === 1
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white/20 flex items-center justify-center text-[9px] sm:text-[10px]">
              1
            </span>
            <span className="truncate">Product &amp; Ranges</span>
          </button>
          <span className="hidden sm:inline text-slate-300 font-bold">→</span>
          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
              currentStep === 2
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white/20 flex items-center justify-center text-[9px] sm:text-[10px]">
              2
            </span>
            <span className="truncate">Matrix Stock Grid</span>
          </button>

          <button
            type="button"
            onClick={handleSaveProduct}
            disabled={isSaving}
            className="ml-1 sm:ml-2 vw-btn-primary h-8 sm:h-9 px-3 sm:px-4 gap-1.5 flex items-center justify-center text-xs font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Save size={14} /> {isSaving ? "Saving..." : "Save Product"}
          </button>
        </div>
      </div>

      {/* STEP 1: PRODUCT DETAILS & RANGE SETUP */}
      {currentStep === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-4 sm:gap-6 items-start">
          <div className="flex flex-col gap-4 sm:gap-6">
            {/* Basic Details */}
            <div className="vw-card p-3.5 sm:p-5 md:p-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3 sm:mb-4 border-b border-slate-100 pb-2.5 sm:pb-3 text-xs sm:text-sm md:text-[15px]">
                <Settings2 size={16} className="text-blue-600 shrink-0" /> Basic Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 mb-4 sm:mb-5">
                <div>
                  <div className="flex justify-between items-center mb-1 sm:mb-1.5">
                    <label className="block text-[11px] sm:text-xs font-bold text-slate-700">Brand</label>
                    <button
                      type="button"
                      onClick={() => setShowBrandModal(true)}
                      className="text-[10px] sm:text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={12} /> New Brand
                    </button>
                  </div>
                  <select
                    value={productData.brand}
                    onChange={(e) => setProductData({ ...productData, brand: e.target.value })}
                    className="w-full h-9 sm:h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs transition-all"
                  >
                    <option value="">-- Select a Brand --</option>
                    {brands.map((b) => (
                      <option key={b._id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5">
                    Product Name (As Printed)
                  </label>
                  <input
                    type="text"
                    value={productData.product_name}
                    onChange={(e) => setProductData({ ...productData, product_name: e.target.value })}
                    placeholder="e.g. AIR SMART BLUE CUT GREEN CYL PROGRESSIVE 1.56"
                    className="w-full h-9 sm:h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5 flex items-center justify-between">
                    <span>Product Code (SKU)</span>
                    <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      SKU Code
                    </span>
                  </label>
                  <div className="w-full h-9 sm:h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-[13px] font-mono font-bold text-slate-800 flex items-center truncate select-all shadow-xs">
                    {productData.product_code || autoSku || (
                      <span className="text-slate-400 italic font-sans text-xs">
                        Select brand to preview SKU...
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5">
                    Power Type
                  </label>
                  <select
                    value={productData.lens_type}
                    onChange={(e) => setProductData({ ...productData, lens_type: e.target.value })}
                    className="w-full h-9 sm:h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs transition-all"
                  >
                    <option value="Single Vision">Single Vision (SV)</option>
                    <option value="Progressive">Progressive (PG)</option>
                    <option value="KT">Bifocal (KT)</option>
                    <option value="RX">RX (Made-to-order)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5">
                    Lens Nature
                  </label>
                  <select
                    value={productData.lens_nature}
                    onChange={(e) => setProductData({ ...productData, lens_nature: e.target.value })}
                    className="w-full h-9 sm:h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs transition-all"
                  >
                    <option value="Finished">Finished</option>
                    <option value="Raw / Semi-Finished">Raw / Semi-Finished</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5">
                    Base Material
                  </label>
                  <select
                    value={productData.base}
                    onChange={(e) => setProductData({ ...productData, base: e.target.value })}
                    className="w-full h-9 sm:h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs transition-all"
                  >
                    <option value="Hard Coat (HC)">Hard Coat (HC)</option>
                    <option value="Blue Cut (B.CUT)">Blue Cut (B.CUT)</option>
                    <option value="Photo Grey">Photo Grey</option>
                    <option value="Polycarbonate (POLY)">Polycarbonate (POLY)</option>
                    <option value="Blue Cut + Photo Grey">Blue Cut + Photo Grey</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5">Coating</label>
                  <select
                    value={productData.coating}
                    onChange={(e) => setProductData({ ...productData, coating: e.target.value })}
                    className="w-full h-9 sm:h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs transition-all"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Anti-Reflective">Anti-Reflective</option>
                    <option value="Blue Cut">Blue Cut</option>
                    <option value="Photochromic">Photochromic</option>
                    <option value="Opal Blue">Opal Blue</option>
                    <option value="Evergreen">Evergreen</option>
                    <option value="Volt Blue">Volt Blue</option>
                    <option value="Solara Gold">Solara Gold</option>
                    <option value="Hard Coat">Hard Coat</option>
                    <option value="GREEN">GREEN</option>
                    <option value="OPAL">OPAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5">Index</label>
                  <select
                    value={productData.index}
                    onChange={(e) => setProductData({ ...productData, index: parseFloat(e.target.value) })}
                    className="w-full h-9 sm:h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs transition-all"
                  >
                    <option value="1.49">1.49</option>
                    <option value="1.50">1.50</option>
                    <option value="1.56">1.56</option>
                    <option value="1.59">1.59</option>
                    <option value="1.60">1.60</option>
                    <option value="1.61">1.61</option>
                    <option value="1.67">1.67</option>
                    <option value="1.74">1.74</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5">
                    Diameter
                  </label>
                  <select
                    value={productData.diameter}
                    onChange={(e) => setProductData({ ...productData, diameter: parseInt(e.target.value) })}
                    className="w-full h-9 sm:h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs transition-all"
                  >
                    <option value="55">55 DIA</option>
                    <option value="60">60 DIA</option>
                    <option value="65">65 DIA</option>
                    <option value="70">70 DIA</option>
                    <option value="72">72 DIA</option>
                    <option value="75">75 DIA</option>
                    <option value="80">80 DIA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5">
                    Value Tier
                  </label>
                  <select
                    value={productData.value_tier}
                    onChange={(e) => setProductData({ ...productData, value_tier: e.target.value })}
                    className="w-full h-9 sm:h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs transition-all"
                  >
                    <option value="commodity">Commodity</option>
                    <option value="high_value">High Value</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5">
                    Product Envelope Photo (Image URL)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="https://... (lens packet photo URL)"
                      value={productData.product_image || ""}
                      onChange={(e) => setProductData({ ...productData, product_image: e.target.value })}
                      className="w-full h-9 sm:h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs transition-all"
                    />
                    {productData.product_image && (
                      <img
                        src={productData.product_image}
                        alt="Preview"
                        className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0 bg-white"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Tier Pricing */}
              <div className="border-t border-slate-100 pt-3.5 sm:pt-4 mt-2">
                <h4 className="text-[11px] sm:text-xs font-bold text-slate-600 mb-2.5 sm:mb-3 uppercase flex items-center gap-2 flex-wrap">
                  Tier Pricing{" "}
                  <span className="text-slate-400 normal-case font-medium">
                    (applies to this product's power range)
                  </span>{" "}
                  <DeptBadge dept="sales" />
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 mb-1">Courier</label>
                    <input
                      type="number"
                      value={productData.tier_prices.courier}
                      onChange={(e) =>
                        setProductData({
                          ...productData,
                          tier_prices: {
                            ...productData.tier_prices,
                            courier: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full h-8 sm:h-9 px-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] font-mono font-semibold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 mb-1">Stock A</label>
                    <input
                      type="number"
                      value={productData.tier_prices.stock_a}
                      onChange={(e) =>
                        setProductData({
                          ...productData,
                          tier_prices: {
                            ...productData.tier_prices,
                            stock_a: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full h-8 sm:h-9 px-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] font-mono font-semibold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 mb-1">Stock A+</label>
                    <input
                      type="number"
                      value={productData.tier_prices.stock_a_plus}
                      onChange={(e) =>
                        setProductData({
                          ...productData,
                          tier_prices: {
                            ...productData.tier_prices,
                            stock_a_plus: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full h-8 sm:h-9 px-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] font-mono font-semibold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 mb-1">Stock Platinum</label>
                    <input
                      type="number"
                      value={productData.tier_prices.stock_platinum}
                      onChange={(e) =>
                        setProductData({
                          ...productData,
                          tier_prices: {
                            ...productData.tier_prices,
                            stock_platinum: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full h-8 sm:h-9 px-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] font-mono font-semibold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="vw-card p-3.5 sm:p-5 md:p-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3 sm:mb-4 border-b border-slate-100 pb-2.5 sm:pb-3 text-xs sm:text-sm md:text-[15px]">
                <Tag size={16} className="text-emerald-600 shrink-0" /> Additional Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5 flex items-center justify-between">
                    Minimum Selling Price <DeptBadge dept="sales" />
                  </label>
                  <input
                    type="number"
                    value={productData.min_selling_price}
                    onChange={(e) =>
                      setProductData({
                        ...productData,
                        min_selling_price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full h-9 sm:h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] font-mono text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5 flex items-center justify-between">
                    Part Number <DeptBadge dept="purchase" />
                  </label>
                  <input
                    type="text"
                    value={productData.part_number}
                    onChange={(e) => setProductData({ ...productData, part_number: e.target.value })}
                    className="w-full h-9 sm:h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs transition-all"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5 flex items-center justify-between">
                    Return Status <DeptBadge dept="sales" />
                  </label>
                  <select
                    value={productData.return_status}
                    onChange={(e) => setProductData({ ...productData, return_status: e.target.value })}
                    className="w-full h-9 sm:h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs transition-all"
                  >
                    <option value="Can Take">Can Take</option>
                    <option value="Do Not Take">Do Not Take</option>
                    <option value="Review">Review</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5 flex items-center justify-between">
                    Low Stock Alert Threshold <DeptBadge dept="purchase" />
                  </label>
                  <input
                    type="number"
                    value={productData.low_stock_threshold ?? ""}
                    onChange={(e) =>
                      setProductData({
                        ...productData,
                        low_stock_threshold: e.target.value === "" ? null : parseInt(e.target.value),
                      })
                    }
                    className="w-full h-9 sm:h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] font-mono text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs transition-all"
                    placeholder="Default (10)"
                  />
                </div>
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5 flex items-center justify-between">
                    Stock Availability <DeptBadge dept="stock" />
                  </label>
                  <label className="flex items-center gap-2 h-9 sm:h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-700 cursor-pointer shadow-xs select-none">
                    <input
                      type="checkbox"
                      checked={productData.n_a_flag}
                      onChange={(e) => setProductData({ ...productData, n_a_flag: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    Mark as N/A (Not Kept In Stock)
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: POWER RANGE CONFIGURATOR (Identical to CreateProduct.jsx with pre-filled AXIS & ADD) */}
          <div className="vw-card p-3.5 sm:p-5 lg:sticky lg:top-4">
            <div className="flex items-center justify-between gap-2 mb-2.5 sm:mb-3 border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-xs sm:text-sm md:text-[14px]">
                <Grid size={15} className="text-purple-600 shrink-0" /> POWER RANGES
              </h3>
            </div>

            <p className="text-[10px] sm:text-[11px] text-slate-500 mb-2.5 sm:mb-3 leading-relaxed">
              {isProgressiveFamily
                ? "Progressive/KT family: ADD runs across columns (+1.00 to +3.00). Axis is required for CYL."
                : "Single Vision: SPH rows × CYL columns. Axis & ADD do not apply."}
            </p>

            {/* SPH Box */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-2.5 sm:p-3 mb-2.5 sm:mb-3">
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-700 mb-1.5 sm:mb-2 uppercase">SPH Range</div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-bold text-slate-500 mb-0.5">MIN</label>
                  <PowerInput
                    value={rangeConfig.sph.min}
                    onChange={(v) => updateSph("min", v)}
                    step={parseFloat(rangeConfig.sph.step) || 0.25}
                  />
                </div>
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-bold text-slate-500 mb-0.5">MAX</label>
                  <PowerInput
                    value={rangeConfig.sph.max}
                    onChange={(v) => updateSph("max", v)}
                    step={parseFloat(rangeConfig.sph.step) || 0.25}
                  />
                </div>
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-bold text-slate-500 mb-0.5">STEP</label>
                  <input
                    type="text"
                    value={rangeConfig.sph.step}
                    onChange={(e) => updateSph("step", e.target.value)}
                    className="w-full h-8 sm:h-9 px-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* CYL Checkbox */}
            <label className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-slate-700 mb-2 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={hasCyl}
                onChange={(e) => toggleHasCyl(e.target.checked)}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
              />
              Has Cylinder (CYL) Dimension
            </label>

            {/* CYL Blocks with Pre-filled AXIS */}
            {hasCyl && (
              <div className="flex flex-col gap-2 mb-2.5 sm:mb-3">
                {rangeConfig.cylBlocks.map((b, idx) => (
                  <div key={idx} className="relative bg-slate-50/80 border border-slate-200 rounded-xl p-2.5 sm:p-3">
                    {rangeConfig.cylBlocks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCylBlock(idx)}
                        className="absolute top-2 right-2 text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer"
                        title="Remove CYL Block"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                    <div className="grid grid-cols-2 gap-2 mb-2 pr-5">
                      <div>
                        <label className="block text-[9px] sm:text-[10px] font-bold text-slate-500 mb-0.5">CYL MIN</label>
                        <PowerInput
                          value={b.min}
                          onChange={(v) => updateCylBlock(idx, "min", v)}
                          step={parseFloat(b.step) || 0.25}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] sm:text-[10px] font-bold text-slate-500 mb-0.5">CYL MAX</label>
                        <PowerInput
                          value={b.max}
                          onChange={(v) => updateCylBlock(idx, "max", v)}
                          step={parseFloat(b.step) || 0.25}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] sm:text-[10px] font-bold text-slate-500 mb-0.5">STEP</label>
                        <input
                          type="text"
                          value={b.step}
                          onChange={(e) => updateCylBlock(idx, "step", e.target.value)}
                          className="w-full h-8 sm:h-9 px-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      {isProgressiveFamily ? (
                        <div>
                          <label className="block text-[9px] sm:text-[10px] font-bold text-slate-700 mb-0.5 flex items-center justify-between">
                            <span>AXIS</span>
                            <span className="text-[9px] text-purple-600 font-bold">*1-180°</span>
                          </label>
                          <PowerInput
                            value={b.axis}
                            onChange={(v) => updateCylBlock(idx, "axis", v)}
                            placeholder="e.g. 180"
                            step={1}
                            decimals={0}
                            signed={false}
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col justify-end pb-1">
                          <span className="text-[10px] text-slate-400 italic">No Axis in SV</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isProgressiveFamily && (
                  <button
                    type="button"
                    onClick={addCylBlock}
                    className="self-start text-purple-600 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus size={12} /> Add CYL/Axis Block
                  </button>
                )}
              </div>
            )}

            {/* ADD Range for Progressive */}
            {isProgressiveFamily && (
              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-2.5 sm:p-3 mb-2.5 sm:mb-3">
                <div className="text-[10px] sm:text-[11px] font-bold text-slate-700 mb-1.5 sm:mb-2 uppercase">ADD Range</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] sm:text-[10px] font-bold text-slate-500 mb-0.5">MIN</label>
                    <PowerInput
                      value={rangeConfig.add.min}
                      onChange={(v) =>
                        setRangeConfig((prev) => ({
                          ...prev,
                          add: { ...prev.add, min: v },
                        }))
                      }
                      step={parseFloat(rangeConfig.add.step) || 0.25}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] sm:text-[10px] font-bold text-slate-500 mb-0.5">MAX</label>
                    <PowerInput
                      value={rangeConfig.add.max}
                      onChange={(v) =>
                        setRangeConfig((prev) => ({
                          ...prev,
                          add: { ...prev.add, max: v },
                        }))
                      }
                      step={parseFloat(rangeConfig.add.step) || 0.25}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] sm:text-[10px] font-bold text-slate-500 mb-0.5">STEP</label>
                    <input
                      type="text"
                      value={rangeConfig.add.step}
                      onChange={(e) =>
                        setRangeConfig((prev) => ({
                          ...prev,
                          add: { ...prev.add, step: e.target.value },
                        }))
                      }
                      className="w-full h-8 sm:h-9 px-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Proceed & Save Buttons */}
            <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleProceedToMatrix}
                className="w-full h-10 px-4 rounded-xl text-xs sm:text-[13px] font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Proceed to Matrix Stock Grid</span>
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                onClick={handleSaveProduct}
                disabled={isSaving}
                className="w-full h-9 px-4 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Save size={13} /> {isSaving ? "Saving..." : "Update Details Directly"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: FULL-WIDTH INTERACTIVE MATRIX STOCK GRID */}
      {currentStep === 2 && (
        <div className="vw-card p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                <Grid size={18} className="text-purple-600" /> Interactive Power Matrix &amp; Shelf Inventory
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Manage live shelf stock quantities, floor locations, and power cell availability for{" "}
                <span className="font-mono font-bold text-slate-700">{productData.product_code}</span>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg inline-flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <ArrowLeft size={13} /> Back to Details
            </button>
          </div>

          <MatrixEditor
            productId={id}
            lensType={productData.lens_type}
            racks={racks}
            rangeConfig={rangeConfig}
            onRangeConfigChange={setRangeConfig}
            autoGenerateIfEmpty={false}
          />
        </div>
      )}

      <AddBrandModal
        isOpen={showBrandModal}
        onClose={() => setShowBrandModal(false)}
        onBrandCreated={(createdBrand) => {
          fetchBrands();
          if (createdBrand?.name) {
            setProductData((prev) => ({ ...prev, brand: createdBrand.name }));
          }
        }}
      />
    </>
  );
}
