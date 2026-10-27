import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
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
  RotateCcw,
} from "lucide-react";
import { brandApi, productApi, warehouseApi } from "../../services/productApi";
import { notify } from "@/lib/notify";
import {
  MatrixGridView,
  defaultRangeConfigFromProduct,
} from "./MatrixEditor";
import {
  generateProductCode,
  getMatrixTypeInfo,
  generateMatrixCellsClient,
  cellKey,
  validatePowerRange,
} from "./matrixHelpers";
import { PowerInput } from "@/components/common/PowerInput";
import { DeptBadge } from "@/components/common/DeptBadge";
import { AddBrandModal } from "@/components/products/AddBrandModal";
import "@/styles/veriwide.css";

export function CreateProduct() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1); // 1 = Details & Range, 2 = Full-Page Matrix Chart
  const [brands, setBrands] = useState([]);
  const [racks, setRacks] = useState([]);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [productData, setProductData] = useState({
    brand: "",
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
    return_status: "Can Take",
    low_stock_threshold: null,
  });

  const [rangeConfig, setRangeConfig] = useState(defaultRangeConfigFromProduct(null));
  const [hasCyl, setHasCyl] = useState(true);

  // Step 2 Matrix State
  const [generatedCells, setGeneratedCells] = useState([]);
  const [qtyMap, setQtyMap] = useState({});
  const [locOverrideMap, setLocOverrideMap] = useState({});
  const [naMap, setNaMap] = useState({});
  const [bulkQty, setBulkQty] = useState("");

  const isProgressiveFamily =
    productData.lens_type === "Progressive" ||
    productData.lens_type === "KT" ||
    productData.lens_type === "RX";

  const autoSku = useMemo(() => {
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
    productData.brand,
    productData.index,
    productData.base,
    productData.lens_type,
    productData.diameter,
    productData.range_label,
    rangeConfig,
    hasCyl,
  ]);

  const matrixTypeInfo = useMemo(() => {
    return getMatrixTypeInfo({
      lensType: productData.lens_type,
      rangeConfig,
      hasCyl,
    });
  }, [productData.lens_type, rangeConfig, hasCyl]);

  useEffect(() => {
    fetchBrands();
    fetchRacks();
  }, []);

  const fetchBrands = async () => {
    try {
      const res = await brandApi.getBrands();
      if (res.error === false) {
        setBrands(res.data);
        if (res.data.length > 0 && !productData.brand) {
          setProductData((prev) => ({ ...prev, brand: res.data[0].name }));
        }
      }
    } catch (e) {
      console.error("Failed to fetch brands", e);
    }
  };

  const fetchRacks = async () => {
    try {
      const res = await warehouseApi.getRackSummary();
      if (res.error === false) setRacks(res.data);
    } catch (e) {
      console.error("Failed to fetch racks", e);
    }
  };

  // Range handlers
  const updateSph = (field, val) => {
    setRangeConfig((prev) => ({
      ...prev,
      sph: { ...prev.sph, [field]: val },
    }));
  };

  const updateAdd = (field, val) => {
    setRangeConfig((prev) => ({
      ...prev,
      add: { ...prev.add, [field]: val },
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

  // Matrix cell edit handlers
  const handleQtyChange = useCallback((key, val) => {
    setQtyMap((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleLocChange = useCallback((key, locId, locObj) => {
    setLocOverrideMap((prev) => ({ ...prev, [key]: locObj || locId }));
  }, []);

  const handleToggleNA = useCallback((key) => {
    setNaMap((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = true;
      }
      return next;
    });
    // Clear quantity and location for cell marked as N/A
    setQtyMap((prev) => {
      if (prev[key] === undefined) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setLocOverrideMap((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // Step 1 -> Step 2: Validate and generate matrix in memory
  const handleProceedToMatrix = () => {
    if (!productData.brand) {
      notify.warning("Please select a Brand first.");
      return;
    }

    // Strict validation: SPH range (Rule C allows SPH to be omitted for Progressive CYL-only Type C)
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

    // Strict validation: CYL blocks
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

    // Strict validation: ADD range for Progressive
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

    try {
      const cells = generateMatrixCellsClient({
        lensType: productData.lens_type,
        rangeConfig,
        hasCyl,
      });

      if (!cells || cells.length === 0) {
        notify.error("No valid power cells could be generated with the current range.");
        return;
      }

      setGeneratedCells(cells);
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
      notify.success(`Generated ${cells.length} cells. Review chart and enter opening stock.`);
    } catch (err) {
      notify.error(err.message || "Failed to generate matrix");
    }
  };

  // Step 2: Bulk Fill
  const handleApplyBulkQty = () => {
    const val = parseInt(bulkQty);
    if (isNaN(val) || val < 0) {
      notify.warning("Please enter a valid positive quantity.");
      return;
    }
    const next = { ...qtyMap };
    generatedCells.forEach((c) => {
      const k = cellKey(c);
      if (!naMap[k]) {
        next[k] = val;
      }
    });
    setQtyMap(next);
    notify.success(`Set quantity = ${val} for active cells.`);
  };

  const handleClearAllQty = () => {
    setQtyMap({});
    setLocOverrideMap({});
    setNaMap({});
    notify.info("All cell quantities and statuses cleared.");
  };

  // Step 2: Save Product & Matrix together
  const handleSaveAll = async () => {
    if (!productData.brand) {
      notify.warning("Brand is required.");
      return;
    }
    const sku = autoSku || productData.product_code;
    if (!sku) {
      notify.warning("Unable to generate Product Code (SKU).");
      return;
    }
    if (generatedCells.length === 0) {
      notify.warning("No matrix cells to save. Please generate the matrix first.");
      return;
    }

    setIsSaving(true);
    try {
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
      const productPayload = {
        ...productData,
        product_code: sku,
        min_sph: hasSph ? parseFloat(rangeConfig.sph.min) : 0,
        max_sph: hasSph ? parseFloat(rangeConfig.sph.max) : 0,
        min_cyl: minCyl,
        max_cyl: maxCyl,
      };

      // 1. Create Product
      const prodRes = await productApi.createProduct(productPayload);
      if (prodRes.error !== false) {
        notify.error(prodRes.message || "Failed to create product");
        setIsSaving(false);
        return;
      }

      const newProductId = prodRes.data._id;

      // 2. Format & Save Matrix Cells with quantities & locations
      const powerCells = generatedCells.map((c) => {
        const key = cellKey(c);
        const isNA = !!naMap[key];
        const qty = isNA ? 0 : (parseInt(qtyMap[key]) || 0);
        const locOverride = locOverrideMap[key];
        const locId = locOverride?.id || (typeof locOverride === "string" ? locOverride : null);
        const isValidLocId = locId && /^[0-9a-fA-F]{24}$/.test(String(locId));
        return {
          sph: c.sph,
          cyl: c.cyl,
          axis: c.axis,
          add: c.add,
          locations: !isNA && qty > 0 && isValidLocId ? [{ warehouse_location_id: locId, quantity: qty }] : [],
          quantity: qty,
          total_quantity: qty,
          status: isNA ? "out_of_stock" : c.status,
        };
      });

      const matrixRes = await productApi.updateMatrix({
        productId: newProductId,
        godownId: "running_stock",
        powerCells,
      });

      if (matrixRes.error !== false) {
        notify.warning("Product created, but matrix save had an issue: " + matrixRes.message);
      } else {
        notify.success(`Product (${prodRes.data?.product_code || sku}) and Power Matrix saved successfully!`);
      }

      navigate({ to: "/products" });
    } catch (error) {
      console.error(error);
      notify.error(error.message || "An error occurred while saving product and matrix.");
    }
    setIsSaving(false);
  };

  return (
    <>
      {/* Wizard Header & Step Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-slate-200 mt-1 sm:mt-2">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Link
            to="/products"
            className="p-2 sm:p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-slate-600 shrink-0 cursor-pointer shadow-xs flex items-center justify-center"
            title="Back to Catalog"
          >
            <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-slate-900 truncate">Create New Lens Series</h1>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">
              {currentStep === 1
                ? "Step 1 of 2: Fill Product Attributes & Power Ranges"
                : "Step 2 of 2: Full-Page Power Matrix Chart & Opening Stock"}
            </p>
          </div>
        </div>

        {/* 2-Step Nav Tabs */}
        <div className="grid grid-cols-2 gap-1.5 w-full sm:flex sm:w-auto items-center sm:gap-2 shrink-0">
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
            onClick={() => {
              if (generatedCells.length > 0) setCurrentStep(2);
              else handleProceedToMatrix();
            }}
            className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
              currentStep === 2
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white/20 flex items-center justify-center text-[9px] sm:text-[10px]">
              2
            </span>
            <span className="truncate">Matrix Chart</span>
            {generatedCells.length > 0 && (
              <span className="text-[9px] sm:text-[10px] bg-white/30 px-1.5 py-0.2 rounded-full font-bold">
                {generatedCells.length}
              </span>
            )}
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
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5 flex items-center justify-between">
                    <span>Product Code (SKU)</span>
                    <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Auto Preview
                    </span>
                  </label>
                  <div className="w-full h-9 sm:h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-[13px] font-mono font-bold text-slate-800 flex items-center truncate select-all shadow-xs">
                    {autoSku || (
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
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5">Index</label>
                  <select
                    value={productData.index}
                    onChange={(e) =>
                      setProductData({ ...productData, index: parseFloat(e.target.value) })
                    }
                    className="w-full h-9 sm:h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs transition-all"
                  >
                    <option value="1.49">1.49</option>
                    <option value="1.56">1.56</option>
                    <option value="1.59">1.59</option>
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
                    onChange={(e) =>
                      setProductData({ ...productData, diameter: parseInt(e.target.value) })
                    }
                    className="w-full h-9 sm:h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs transition-all"
                  >
                    <option value="55">55 DIA</option>
                    <option value="65">65 DIA</option>
                    <option value="70">70 DIA</option>
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
                            courier: parseInt(e.target.value),
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
                            stock_a: parseInt(e.target.value),
                          },
                        })
                      }
                      className="w-full h-8 sm:h-9 px-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] font-mono font-semibold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 mb-1">
                      Stock A+
                    </label>
                    <input
                      type="number"
                      value={productData.tier_prices.stock_a_plus}
                      onChange={(e) =>
                        setProductData({
                          ...productData,
                          tier_prices: {
                            ...productData.tier_prices,
                            stock_a_plus: parseInt(e.target.value),
                          },
                        })
                      }
                      className="w-full h-8 sm:h-9 px-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] font-mono font-semibold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 mb-1">
                      Platinum
                    </label>
                    <input
                      type="number"
                      value={productData.tier_prices.stock_platinum}
                      onChange={(e) =>
                        setProductData({
                          ...productData,
                          tier_prices: {
                            ...productData.tier_prices,
                            stock_platinum: parseInt(e.target.value),
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
                        min_selling_price: parseFloat(e.target.value),
                      })
                    }
                    className="w-full h-9 sm:h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] font-mono text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5 flex items-center justify-between">
                    Return Status <DeptBadge dept="sales" />
                  </label>
                  <select
                    value={productData.return_status}
                    onChange={(e) =>
                      setProductData({ ...productData, return_status: e.target.value })
                    }
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
              </div>
            </div>
          </div>

          {/* Right Column: POWER RANGE CONFIGURATOR */}
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

            {/* CYL Blocks */}
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
                            <span className="text-[9px] text-rose-500 font-bold">*1-180°</span>
                          </label>
                          <PowerInput
                            value={b.axis}
                            onChange={(v) => updateCylBlock(idx, "axis", v)}
                            placeholder="e.g. 90"
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
                      onChange={(v) => updateAdd("min", v)}
                      step={parseFloat(rangeConfig.add.step) || 0.25}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] sm:text-[10px] font-bold text-slate-500 mb-0.5">MAX</label>
                    <PowerInput
                      value={rangeConfig.add.max}
                      onChange={(v) => updateAdd("max", v)}
                      step={parseFloat(rangeConfig.add.step) || 0.25}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] sm:text-[10px] font-bold text-slate-500 mb-0.5">STEP</label>
                    <input
                      type="text"
                      value={rangeConfig.add.step}
                      onChange={(e) => updateAdd("step", e.target.value)}
                      className="w-full h-8 sm:h-9 px-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Proceed to Step 2 Button */}
            <button
              type="button"
              onClick={handleProceedToMatrix}
              className="w-full h-10 sm:h-11 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all mt-3 sm:mt-4 text-xs sm:text-[13px] cursor-pointer"
            >
              <Grid size={15} /> Generate Matrix Chart &amp; Next →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: FULL-PAGE MATRIX CHART & STOCK QUANTITIES */}
      {currentStep === 2 && (
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Product Summary Header Card */}
          <div className="vw-card p-3 sm:p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-sm sm:text-base text-white">
                  {productData.brand || "Brand"}
                </span>
                <span className="text-slate-500">•</span>
                <span className="bg-slate-700/80 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold text-blue-200">
                  {productData.lens_type}
                </span>
                <span className="text-slate-500">•</span>
                <span className="bg-slate-700/80 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-mono text-emerald-200">
                  {productData.index} Index
                </span>
                <span className="text-slate-500">•</span>
                <span className="bg-slate-700/80 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] text-slate-200">
                  {productData.base}
                </span>
                <span className="text-slate-500">•</span>
                <span className="bg-slate-700/80 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] text-slate-200">
                  {productData.diameter} DIA
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] text-slate-300 font-mono bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                  SKU: <strong className="text-white">{autoSku || productData.product_code}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Tools & Actions Card */}
          <div className="vw-card p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
            {/* Quick Bulk Stock Fill */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <Package size={15} className="text-emerald-600 shrink-0" />
              <span className="text-[11px] sm:text-xs font-bold text-slate-700 shrink-0">
                Bulk Fill Stock:
              </span>
              <input
                type="number"
                min="0"
                value={bulkQty}
                onChange={(e) => setBulkQty(e.target.value)}
                placeholder="Qty per cell"
                className="w-20 sm:w-24 h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center font-mono focus:outline-none focus:border-blue-500 shadow-xs"
              />
              <button
                type="button"
                onClick={handleApplyBulkQty}
                className="h-8 px-2.5 sm:px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] sm:text-[11px] rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap"
              >
                Apply to All ({generatedCells.length})
              </button>
              <button
                type="button"
                onClick={handleClearAllQty}
                className="h-8 px-2 text-slate-400 hover:text-rose-600 text-[10px] sm:text-[11px] font-bold transition-colors ml-1 cursor-pointer"
                title="Clear all entered stock"
              >
                Clear
              </button>
            </div>

            {/* Step Controls */}
            <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="vw-btn-secondary h-8 sm:h-9 px-3 gap-1.5 flex items-center justify-center text-xs sm:text-[13px] rounded-xl font-medium cursor-pointer shadow-xs"
              >
                <ArrowLeft size={14} /> Back to Details
              </button>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={isSaving}
                className="vw-btn-primary h-8 sm:h-9 px-3.5 sm:px-4 gap-1.5 sm:gap-2 flex items-center justify-center text-xs sm:text-[13px] font-bold rounded-xl cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Save size={14} /> {isSaving ? "Saving..." : "Save Product & Matrix"}
              </button>
            </div>
          </div>

          {/* Full-Page Matrix Grid */}
          <div className="vw-card p-3 sm:p-4 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-2.5 sm:mb-3 pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-xs sm:text-[13px] flex items-center gap-1.5">
                <Grid size={14} className="text-purple-600 shrink-0" />
                POWER MATRIX STOCK GRID ({generatedCells.length} Total Cells)
              </h4>
              <span className="text-[10px] sm:text-[11px] text-slate-500 italic">
                Enter quantity directly, mark cell as N/A, or assign warehouse shelf range per cell
              </span>
            </div>

            <MatrixGridView
              cells={generatedCells}
              qtyMap={qtyMap}
              naMap={naMap}
              locOverrideMap={locOverrideMap}
              onQtyChange={handleQtyChange}
              onToggleNA={handleToggleNA}
              onLocChange={handleLocChange}
              racks={racks}
              matrixTypeInfo={matrixTypeInfo}
              maxHeight="max-h-[65vh]"
            />
          </div>

          {/* Bottom Fixed/Prominent Action Bar */}
          <div className="vw-card p-3 sm:p-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 mt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="w-full sm:w-auto vw-btn-secondary h-9 sm:h-10 px-4 gap-1.5 sm:gap-2 flex items-center justify-center text-xs sm:text-[13px] font-semibold rounded-xl cursor-pointer shadow-xs"
            >
              <ArrowLeft size={15} /> Back to Product Details
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="w-full sm:w-auto vw-btn-primary h-9 sm:h-10 px-5 sm:px-6 gap-1.5 sm:gap-2 flex items-center justify-center text-xs sm:text-[13px] font-bold rounded-xl cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Save size={15} /> {isSaving ? "Saving Product & Matrix..." : "Save Product & Power Matrix"}
            </button>
          </div>
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