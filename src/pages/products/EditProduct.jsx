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
  RotateCcw,
} from "lucide-react";
import { brandApi, productApi, warehouseApi } from "../../services/productApi";
import { notify } from "@/lib/notify";
import {
  MatrixGridView,
  defaultRangeConfigFromProduct,
  LocationOverrideModal,
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
import { ImageUploadInput } from "@/components/common/ImageUploadInput";
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

  // Step 1: Product Attributes State
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
    purchase_status: "Stable",
    return_status: "Can Take",
    part_number: "",
    product_image: "",
    low_stock_threshold: 15,
  });

  const [rangeConfig, setRangeConfig] = useState(defaultRangeConfigFromProduct(null));
  const [hasCyl, setHasCyl] = useState(true);

  // Step 2: Matrix & Shelf Inventory State
  const [generatedCells, setGeneratedCells] = useState([]);
  const [qtyMap, setQtyMap] = useState({});
  const [locOverrideMap, setLocOverrideMap] = useState({});
  const [reserveQtyMap, setReserveQtyMap] = useState({});
  const [reserveLocMap, setReserveLocMap] = useState({});
  const [naMap, setNaMap] = useState({});

  // Quick Bulk Fill State
  const [bulkQty, setBulkQty] = useState("");
  const [bulkReserveQty, setBulkReserveQty] = useState("");
  const [bulkReserveLoc, setBulkReserveLoc] = useState("FL4");
  const [bulkReserveLocObj, setBulkReserveLocObj] = useState(null);
  const [showBulkReserveModal, setShowBulkReserveModal] = useState(false);

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

  const matrixTypeInfo = useMemo(() => {
    return getMatrixTypeInfo({
      lensType: productData.lens_type,
      rangeConfig,
      hasCyl,
    });
  }, [productData.lens_type, rangeConfig, hasCyl]);

  const runningStockTotal = useMemo(() => {
    return Object.values(qtyMap).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
  }, [qtyMap]);

  const reserveStockTotal = useMemo(() => {
    return Object.values(reserveQtyMap).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
  }, [reserveQtyMap]);

  // Initial Load: Fetch Product, Racks, Brands, and Existing Matrix Stock
  useEffect(() => {
    if (!id) return;
    const init = async () => {
      setIsLoading(true);
      try {
        const [brandsRes, rackRes, prodRes, runningRes, reserveRes] = await Promise.all([
          brandApi.getBrands(),
          warehouseApi.getRackSummary(),
          productApi.getProductDetail(id),
          productApi.updateMatrix({ productId: id, godownId: "running_stock" }).catch(() => ({ error: true })),
          productApi.updateMatrix({ productId: id, godownId: "reserve_godown_1" }).catch(() => ({ error: true })),
        ]);

        const brandsList = brandsRes.error === false ? brandsRes.data : [];
        setBrands(brandsList);
        setRacks(rackRes.error === false ? rackRes.data : []);

        if (prodRes.error !== false) {
          notify.error(prodRes.message || "Failed to load product");
          setIsLoading(false);
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
          purchase_status: product.purchase_status || "Stable",
          return_status: product.return_status || "Can Take",
          part_number: product.part_number || "",
          product_image: product.product_image || "",
          low_stock_threshold: product.low_stock_threshold ?? 15,
        });

        const cfg = defaultRangeConfigFromProduct(product);
        setRangeConfig(cfg);
        const hasCylinderData = product.min_cyl !== 0 || product.max_cyl !== 0 || product.axis !== null;
        setHasCyl(hasCylinderData);

        // Prime Matrix and Quantities from existing database records
        const runningCells = runningRes.error === false ? (runningRes.data?.power_cells || []) : [];
        const reserveCells = reserveRes.error === false ? (reserveRes.data?.power_cells || []) : [];

        const initialQty = {};
        const initialLoc = {};
        const initialNa = {};
        const initialReserveQty = {};
        const initialReserveLoc = {};

        runningCells.forEach((c) => {
          const k = cellKey(c);
          if (c.status === "out_of_stock" || c.status === "na") {
            initialNa[k] = true;
          }
          const totalQ = c.total_quantity !== undefined ? c.total_quantity : (c.quantity || 0);
          if (totalQ > 0) {
            initialQty[k] = totalQ;
          }
          if (c.locations && c.locations.length > 0 && c.locations[0].warehouse_location_id) {
            initialLoc[k] = c.locations[0].warehouse_location_id;
          }
        });

        reserveCells.forEach((c) => {
          const k = cellKey(c);
          const totalQ = c.total_quantity !== undefined ? c.total_quantity : (c.quantity || 0);
          if (totalQ > 0) {
            initialReserveQty[k] = totalQ;
          }
          if (c.locations && c.locations.length > 0 && c.locations[0].warehouse_location_id) {
            initialReserveLoc[k] = c.locations[0].warehouse_location_id;
          }
        });

        setQtyMap(initialQty);
        setLocOverrideMap(initialLoc);
        setReserveQtyMap(initialReserveQty);
        setReserveLocMap(initialReserveLoc);
        setNaMap(initialNa);

        if (runningCells.length > 0) {
          setGeneratedCells(runningCells);
        } else {
          // Pre-generate matrix cells client-side from range config
          const clientCells = generateMatrixCellsClient({
            lensType: product.lens_type,
            rangeConfig: cfg,
            hasCyl: hasCylinderData,
          });
          setGeneratedCells(clientCells);
        }
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

  const updateAdd = (field, val) => {
    setRangeConfig((prev) => ({
      ...prev,
      add: { ...prev.add, [field]: val },
    }));
  };

  // Cell Updates
  const handleQtyChange = useCallback((key, val) => {
    setQtyMap((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleLocChange = useCallback((key, val) => {
    setLocOverrideMap((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleReserveQtyChange = useCallback((key, val) => {
    setReserveQtyMap((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleReserveLocChange = useCallback((key, val) => {
    setReserveLocMap((prev) => ({ ...prev, [key]: val }));
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
    setReserveQtyMap((prev) => {
      if (prev[key] === undefined) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setReserveLocMap((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // Step 1 -> Step 2: Validate ranges and refresh generated cells
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

    try {
      const cells = generateMatrixCellsClient({
        lensType: productData.lens_type,
        rangeConfig,
        hasCyl,
      });
      setGeneratedCells(cells);
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
      notify.success(`Reviewing power matrix chart (${cells.length} total cells).`);
    } catch (err) {
      notify.error(err.message || "Failed to generate matrix");
    }
  };

  // Quick Bulk Stock Fill
  const handleApplyBulkQty = () => {
    const val = parseInt(bulkQty);
    if (isNaN(val) || val < 0) {
      notify.warning("Please enter a valid positive quantity for Running Stock.");
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
    notify.success(`Set running quantity = ${val} for active cells.`);
  };

  const handleApplyBulkReserveQty = () => {
    const val = parseInt(bulkReserveQty);
    if (isNaN(val) || val < 0) {
      notify.warning("Please enter a valid positive quantity for Reserve Stock.");
      return;
    }
    const nextQ = { ...reserveQtyMap };
    const nextL = { ...reserveLocMap };
    generatedCells.forEach((c) => {
      const k = cellKey(c);
      if (!naMap[k]) {
        nextQ[k] = val;
        nextL[k] = bulkReserveLocObj || bulkReserveLoc || "FL4";
      }
    });
    setReserveQtyMap(nextQ);
    setReserveLocMap(nextL);
    const locLabelDesc =
      bulkReserveLocObj?.label || (bulkReserveLoc === "GROUND" ? "Ground Floor Dock" : "Floor 4 Main Reserve");
    notify.success(`Set reserve quantity = ${val} (${locLabelDesc}) for active cells.`);
  };

  const handleClearAllQty = () => {
    setQtyMap({});
    setLocOverrideMap({});
    setNaMap({});
    setReserveQtyMap({});
    setReserveLocMap({});
    setBulkReserveLocObj(null);
    notify.info("All cell quantities and statuses cleared.");
  };

  // Direct Save Product Details from Step 1
  const handleSaveProductDetailsDirectly = async () => {
    if (!productData.brand) return notify.warning("Brand is required.");
    const sku = autoSku || productData.product_code;
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
      };

      const pRes = await productApi.updateProduct(id, payload);
      if (pRes.error !== false) {
        notify.error(pRes.message || "Failed to update product details");
      } else {
        notify.success("Product details updated successfully.");
        const targetBrand = productData.brand || routeSearch?.brand;
        navigate({ to: "/products", search: targetBrand ? { brand: targetBrand } : {} });
      }
    } catch (error) {
      notify.error("An error occurred while saving.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // Unified Save: Save Product Attributes + Running Matrix + Reserve Matrix
  const handleSaveAll = async () => {
    if (!productData.brand) {
      notify.warning("Brand is required.");
      return;
    }
    const sku = autoSku || productData.product_code;
    if (!sku) {
      notify.warning("Unable to determine Product Code (SKU).");
      return;
    }
    if (generatedCells.length === 0) {
      notify.warning("No matrix cells to save. Please review the matrix ranges first.");
      return;
    }

    setIsSaving(true);
    try {
      const primaryCyl = hasCyl && rangeConfig?.cylBlocks?.length > 0 ? rangeConfig.cylBlocks[0] : null;
      const cylMins = hasCyl ? rangeConfig.cylBlocks.map((b) => parseFloat(b.min)).filter((v) => !isNaN(v)) : [0];
      const cylMaxs = hasCyl ? rangeConfig.cylBlocks.map((b) => parseFloat(b.max)).filter((v) => !isNaN(v)) : [0];
      const parsedAxis = primaryCyl?.axis ? parseInt(primaryCyl.axis, 10) : null;

      const productPayload = {
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
      };

      // 1. Update Product Details
      const pRes = await productApi.updateProduct(id, productPayload);
      if (pRes.error !== false) {
        notify.error(pRes.message || "Failed to update product details");
        setIsSaving(false);
        return;
      }

      // 2. Pre-resolve or find reserve locations (Floor 4 Main Reserve & Ground Floor Staging)
      let fl4LocId = null;
      let groundLocId = null;
      try {
        const [fl4Res, groundRes] = await Promise.all([
          warehouseApi.findOrCreateShelf({
            floor: 4,
            rack: "RESERVE",
            start_shelf: "MAIN",
            end_shelf: "MAIN",
            description: "Floor 4 · Main In-Warehouse Reserve",
          }),
          warehouseApi.findOrCreateShelf({
            floor: 0,
            rack: "DOCK",
            start_shelf: "STAGING",
            end_shelf: "STAGING",
            description: "Ground Floor · Dock Staging Area",
          }),
        ]);
        if (fl4Res?.error === false) fl4LocId = fl4Res.data?._id;
        if (groundRes?.error === false) groundLocId = groundRes.data?._id;
      } catch (locErr) {
        console.warn("Could not pre-resolve reserve locations:", locErr);
      }

      // 3. Format Running Matrix Cells (Floors 1-3)
      const powerCells = await Promise.all(
        generatedCells.map(async (c) => {
          const key = cellKey(c);
          const isNA = !!naMap[key];
          const qty = isNA ? 0 : (parseInt(qtyMap[key]) || 0);
          const locOverride = locOverrideMap[key];
          let locId = locOverride?.id || (typeof locOverride === "string" ? locOverride : null);
          if (!locId && locOverride && typeof locOverride === "object" && locOverride.floor) {
            try {
              const res = await warehouseApi.findOrCreateShelf({
                floor: Number(locOverride.floor),
                rack: locOverride.rack,
                start_shelf: String(locOverride.startShelf || "1"),
                end_shelf: String(locOverride.endShelf || locOverride.startShelf || "1"),
              });
              if (res?.error === false && res?.data?._id) locId = res.data._id;
            } catch (e) {
              console.warn("Could not find/create running location:", e);
            }
          }
          const isValidLocId = locId && /^[0-9a-fA-F]{24}$/.test(String(locId));
          return {
            sph: c.sph,
            cyl: c.cyl,
            axis: c.axis,
            add: c.add,
            locations: !isNA && qty > 0 && isValidLocId ? [{ warehouse_location_id: locId, quantity: qty }] : [],
            quantity: qty,
            total_quantity: qty,
            status: isNA ? "out_of_stock" : c.status || "available",
          };
        })
      );

      const matrixRes = await productApi.updateMatrix({
        productId: id,
        godownId: "running_stock",
        powerCells,
      });

      // 4. Format Reserve Matrix Cells (Floor 4 / Ground Floor)
      const reservePowerCells = await Promise.all(
        generatedCells.map(async (c) => {
          const key = cellKey(c);
          const isNA = !!naMap[key];
          const rQty = isNA ? 0 : (parseInt(reserveQtyMap[key]) || 0);
          const rLoc = reserveLocMap[key] || "FL4";
          let targetLocId = null;
          if (rLoc && typeof rLoc === "object" && rLoc.id) {
            targetLocId = rLoc.id;
          } else if (rLoc && typeof rLoc === "object" && rLoc.floor !== undefined) {
            try {
              const res = await warehouseApi.findOrCreateShelf({
                floor: Number(rLoc.floor),
                rack: rLoc.rack,
                start_shelf: String(rLoc.startShelf || "1"),
                end_shelf: String(rLoc.endShelf || rLoc.startShelf || "1"),
              });
              if (res?.error === false && res?.data?._id) targetLocId = res.data._id;
            } catch (e) {
              console.warn("Could not find/create reserve location:", e);
            }
          } else if (rLoc === "GROUND") {
            targetLocId = groundLocId;
          } else if (rLoc === "FL4" || (!rLoc && rQty > 0)) {
            targetLocId = fl4LocId;
          }
          const isValidTarget = targetLocId && /^[0-9a-fA-F]{24}$/.test(String(targetLocId));
          return {
            sph: c.sph,
            cyl: c.cyl,
            axis: c.axis,
            add: c.add,
            locations: !isNA && rQty > 0 && isValidTarget ? [{ warehouse_location_id: targetLocId, quantity: rQty }] : [],
            quantity: rQty,
            total_quantity: rQty,
            status: isNA ? "out_of_stock" : "available",
          };
        })
      );

      await productApi.updateMatrix({
        productId: id,
        godownId: "reserve_godown_1",
        powerCells: reservePowerCells,
      });

      if (matrixRes.error !== false) {
        notify.warning("Product updated, but some matrix cells may have warnings: " + matrixRes.message);
      } else {
        notify.success("Product details and power matrix updated successfully!");
      }

      const targetBrand = productData.brand || routeSearch?.brand;
      navigate({ to: "/products", search: targetBrand ? { brand: targetBrand } : {} });
    } catch (e) {
      console.error("Save error:", e);
      notify.error("Failed to save product and matrix changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const brandParam = routeSearch?.brand || productData?.brand;

  if (isLoading) {
    return (
      <div className="vw-card p-8 sm:p-12 text-center text-slate-500 rounded-2xl border border-slate-200/80 my-4">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs sm:text-[13px] font-semibold text-slate-600">Loading lens series &amp; matrix...</p>
      </div>
    );
  }

  return (
    <>
      {/* Wizard Header & Step Indicator (Matching CreateProduct.jsx design) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 mt-1 sm:mt-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
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
              {currentStep === 1 ? "Update Product & Power Matrix" : "Matrix Stock Chart"}
            </h1>
            <p className="text-[11px] sm:text-xs md:text-[13px] text-slate-500 mt-0.5 truncate font-mono">
              {currentStep === 1
                ? `Step 1 of 2: Edit Attributes & Power Ranges · ${productData.product_name || productData.product_code || id}`
                : `Step 2 of 2: Power Matrix Chart & Stock Inventory · ${productData.product_code || id}`}
            </p>
          </div>
        </div>

        {/* 2-Step Nav Tabs */}
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
            <span className="truncate">1. Details &amp; Ranges</span>
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
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white/20 flex items-center justify-center text-[9px] sm:text-[10px]">
              2
            </span>
            <span className="truncate">2. Power Matrix &amp; Stock</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="ml-1 sm:ml-2 vw-btn-primary h-8 sm:h-9 px-3 sm:px-4 gap-1.5 flex items-center justify-center text-xs font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Save size={14} /> {isSaving ? "Saving..." : "Save Changes"}
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
                    <option value="Single Vision">Single Vision</option>
                    <option value="Bifocal">Bifocal</option>
                    <option value="Progressive">Progressive</option>
                    <option value="KT">KT (Kryptok Bifocal)</option>
                    <option value="RX">RX</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5">
                    Product (as printed)
                  </label>
                  <input
                    type="text"
                    value={productData.product_name}
                    onChange={(e) => setProductData({ ...productData, product_name: e.target.value })}
                    placeholder="e.g. AIR SMART BLUE CUT GREEN 1.60"
                    className="w-full h-9 sm:h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-5">
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5">
                    Index
                  </label>
                  <select
                    value={productData.index}
                    onChange={(e) => setProductData({ ...productData, index: parseFloat(e.target.value) })}
                    className="w-full h-9 sm:h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 font-mono focus:outline-none focus:border-blue-500 shadow-xs"
                  >
                    <option value="1.56">1.56</option>
                    <option value="1.6">1.60</option>
                    <option value="1.67">1.67</option>
                    <option value="1.74">1.74</option>
                    <option value="1.5">1.50</option>
                    <option value="1.59">1.59 (Poly)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5">
                    Base Material
                  </label>
                  <select
                    value={productData.base}
                    onChange={(e) => setProductData({ ...productData, base: e.target.value })}
                    className="w-full h-9 sm:h-10 px-2.5 sm:px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
                  >
                    <option value="Hard Coat (HC)">Hard Coat (HC)</option>
                    <option value="Blue Filter">Blue Filter</option>
                    <option value="Photochromic">Photochromic</option>
                    <option value="Clear">Clear</option>
                    <option value="Polarized">Polarized</option>
                    <option value="Tinted">Tinted</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5">
                    Coating
                  </label>
                  <select
                    value={productData.coating}
                    onChange={(e) => setProductData({ ...productData, coating: e.target.value })}
                    className="w-full h-9 sm:h-10 px-2.5 sm:px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
                  >
                    <option value="GREEN">GREEN</option>
                    <option value="BLUE">BLUE</option>
                    <option value="Standard">Standard</option>
                    <option value="Anti-Reflective">Anti-Reflective</option>
                    <option value="Super Hydrophobic">Super Hydrophobic</option>
                    <option value="SHMC">SHMC</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5">
                    Diameter (mm)
                  </label>
                  <select
                    value={productData.diameter}
                    onChange={(e) => setProductData({ ...productData, diameter: parseInt(e.target.value) })}
                    className="w-full h-9 sm:h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 font-mono focus:outline-none focus:border-blue-500 shadow-xs"
                  >
                    <option value="65">65 mm</option>
                    <option value="70">70 mm</option>
                    <option value="72">72 mm</option>
                    <option value="75">75 mm</option>
                  </select>
                </div>
              </div>

              {/* Low Stock Threshold */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                  Low Stock Threshold (Pairs)
                </label>
                <p className="text-[10px] text-slate-500 mb-1.5">Cells at or below this show "Low Stock" badge to customers.</p>
                <input
                  type="number"
                  min="1"
                  value={productData.low_stock_threshold}
                  onChange={(e) => setProductData({ ...productData, low_stock_threshold: Math.max(1, parseInt(e.target.value) || 15) })}
                  className="w-full sm:w-1/2 h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Product Envelope Photo */}
              <div className="mt-3.5 sm:mt-4 pt-3.5 sm:pt-4 border-t border-slate-100">
                <ImageUploadInput
                  label="Product Envelope Photo"
                  value={productData.product_image || ""}
                  onChange={(url) => setProductData({ ...productData, product_image: url })}
                  id="edit-product-image"
                />
              </div>
            </div>

            {/* Commercial & Tier Pricing */}
            <div className="vw-card p-3.5 sm:p-5 md:p-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3 sm:mb-4 border-b border-slate-100 pb-2.5 sm:pb-3 text-xs sm:text-sm md:text-[15px]">
                <Tag size={16} className="text-emerald-600 shrink-0" /> Commercial &amp; Tier Pricing
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-5">
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5">
                    Purchase Status
                  </label>
                  <select
                    value={productData.purchase_status}
                    onChange={(e) => setProductData({ ...productData, purchase_status: e.target.value })}
                    className="w-full h-9 sm:h-10 px-2.5 sm:px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
                  >
                    <option value="Stable">Stable</option>
                    <option value="Slow Moving">Slow Moving</option>
                    <option value="Dead Stock">Dead Stock</option>
                    <option value="Stopped">Stopped</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5">
                    Return Status
                  </label>
                  <select
                    value={productData.return_status}
                    onChange={(e) => setProductData({ ...productData, return_status: e.target.value })}
                    className="w-full h-9 sm:h-10 px-2.5 sm:px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
                  >
                    <option value="Can Take">Can Take</option>
                    <option value="Cannot Take">Cannot Take</option>
                    <option value="Conditional">Conditional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5">
                    Value Tier
                  </label>
                  <select
                    value={productData.value_tier}
                    onChange={(e) => setProductData({ ...productData, value_tier: e.target.value })}
                    className="w-full h-9 sm:h-10 px-2.5 sm:px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
                  >
                    <option value="commodity">Commodity</option>
                    <option value="premium">Premium</option>
                    <option value="high_value">High Value</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5">
                    Min Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={productData.min_selling_price}
                    onChange={(e) =>
                      setProductData({ ...productData, min_selling_price: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full h-9 sm:h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] font-mono text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
                  />
                </div>
              </div>

              {/* Mandatory Tiers Grid */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 mb-4 sm:mb-5">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Customer Tier Prices (Per Pair ₹)
                  </span>
                  <span className="text-[10px] text-slate-500 italic">Compulsory pricing</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Courier Price</label>
                    <input
                      type="number"
                      min="0"
                      value={productData.tier_prices.courier}
                      onChange={(e) =>
                        setProductData({
                          ...productData,
                          tier_prices: { ...productData.tier_prices, courier: parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="w-full h-8 sm:h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Stock A Price</label>
                    <input
                      type="number"
                      min="0"
                      value={productData.tier_prices.stock_a}
                      onChange={(e) =>
                        setProductData({
                          ...productData,
                          tier_prices: { ...productData.tier_prices, stock_a: parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="w-full h-8 sm:h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Stock A+ Price</label>
                    <input
                      type="number"
                      min="0"
                      value={productData.tier_prices.stock_a_plus}
                      onChange={(e) =>
                        setProductData({
                          ...productData,
                          tier_prices: { ...productData.tier_prices, stock_a_plus: parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="w-full h-8 sm:h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Stock Platinum Price</label>
                    <input
                      type="number"
                      min="0"
                      value={productData.tier_prices.stock_platinum}
                      onChange={(e) =>
                        setProductData({
                          ...productData,
                          tier_prices: {
                            ...productData.tier_prices,
                            stock_platinum: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full h-8 sm:h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Power Range Generator Setup */}
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="vw-card p-3.5 sm:p-5 md:p-6 bg-slate-50/70 border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-200 mb-3.5 sm:mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-xs sm:text-sm md:text-[15px]">
                  <Grid size={16} className="text-purple-600 shrink-0" /> Power Range Generator
                </h3>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                  Step 1 Config
                </span>
              </div>

              {/* SPH Range Block */}
              <div className="mb-4 bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> SPH Power Span
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">0.25 steps</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] sm:text-[10px] font-bold text-slate-500 mb-0.5">MIN (FROM)</label>
                    <PowerInput
                      value={rangeConfig.sph.min}
                      onChange={(val) => updateSph("min", val)}
                      placeholder="-8.00"
                      className="w-full h-8 sm:h-9 px-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
                      step={parseFloat(rangeConfig.sph.step) || 0.25}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] sm:text-[10px] font-bold text-slate-500 mb-0.5">MAX (TO)</label>
                    <PowerInput
                      value={rangeConfig.sph.max}
                      onChange={(val) => updateSph("max", val)}
                      placeholder="0.00"
                      className="w-full h-8 sm:h-9 px-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
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

              {/* Cylinder Toggle */}
              <div className="mb-4 bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasCyl}
                      onChange={(e) => toggleHasCyl(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800">Has Cylinder (Astigmatism)</span>
                  </label>
                  {hasCyl && (
                    <button
                      type="button"
                      onClick={addCylBlock}
                      className="text-[10px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={11} /> Add Block
                    </button>
                  )}
                </div>

                {hasCyl && (
                  <div className="flex flex-col gap-2.5 mt-2.5">
                    {rangeConfig.cylBlocks.map((b, idx) => (
                      <div
                        key={idx}
                        className="p-2 sm:p-2.5 bg-slate-50 border border-slate-200/90 rounded-lg relative"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-slate-600 font-mono">
                            CYL Block #{idx + 1}
                          </span>
                          {rangeConfig.cylBlocks.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeCylBlock(idx)}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <div>
                            <label className="block text-[8px] sm:text-[9px] font-bold text-slate-500 mb-0.5">MIN (FROM)</label>
                            <PowerInput
                              value={b.min}
                              onChange={(val) => updateCylBlock(idx, "min", val)}
                              placeholder="0.00"
                              className="w-full h-8 px-1.5 bg-white border border-slate-200 rounded text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-purple-500"
                              step={parseFloat(b.step) || 0.25}
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] sm:text-[9px] font-bold text-slate-500 mb-0.5">MAX (TO)</label>
                            <PowerInput
                              value={b.max}
                              onChange={(val) => updateCylBlock(idx, "max", val)}
                              placeholder="-2.00"
                              className="w-full h-8 px-1.5 bg-white border border-slate-200 rounded text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-purple-500"
                              step={parseFloat(b.step) || 0.25}
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] sm:text-[9px] font-bold text-slate-500 mb-0.5">STEP</label>
                            <input
                              type="text"
                              value={b.step}
                              onChange={(e) => updateCylBlock(idx, "step", e.target.value)}
                              className="w-full h-8 px-1 bg-white border border-slate-200 rounded text-xs font-mono text-center focus:outline-none focus:border-purple-500"
                            />
                          </div>
                        </div>

                        {/* Axis input for Progressive / KT */}
                        {isProgressiveFamily && (
                          <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                            <label className="text-[10px] font-bold text-slate-600">Fixed Axis (°):</label>
                            <input
                              type="number"
                              min="1"
                              max="180"
                              value={b.axis || ""}
                              onChange={(e) => updateCylBlock(idx, "axis", e.target.value)}
                              placeholder="e.g. 90, 180"
                              className="w-24 h-7 px-2 bg-white border border-slate-200 rounded text-xs font-mono font-bold text-slate-800 text-center focus:outline-none focus:border-purple-500"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cross Cyl Rule Toggle */}
              {hasCyl && (
                <div className="mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rangeConfig.sphere_smaller_than_cylinder || false}
                      onChange={(e) =>
                        setRangeConfig((prev) => ({
                          ...prev,
                          sphere_smaller_than_cylinder: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer"
                    />
                    <span className="text-[11px] sm:text-xs font-bold text-slate-700">
                      Cross Rule: Sphere must be smaller than Cylinder (|SPH| &lt; |CYL|)
                    </span>
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1 pl-6">
                    Used for special bifocal/KT cross cylinder lens lines.
                  </p>
                </div>
              )}

              {/* ADD Range (For Progressive / KT / RX) */}
              {isProgressiveFamily && (
                <div className="mb-4 bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Reading Addition (ADD)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">0.25 steps</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] sm:text-[10px] font-bold text-slate-500 mb-0.5">MIN (FROM)</label>
                      <PowerInput
                        value={rangeConfig.add.min}
                        onChange={(val) => updateAdd("min", val)}
                        placeholder="1.00"
                        className="w-full h-8 sm:h-9 px-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
                        step={parseFloat(rangeConfig.add.step) || 0.25}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] sm:text-[10px] font-bold text-slate-500 mb-0.5">MAX (TO)</label>
                      <PowerInput
                        value={rangeConfig.add.max}
                        onChange={(val) => updateAdd("max", val)}
                        placeholder="3.50"
                        className="w-full h-8 sm:h-9 px-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
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

              {/* Proceed to Step 2 & Direct Save Buttons */}
              <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleProceedToMatrix}
                  className="w-full h-10 sm:h-11 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all text-xs sm:text-[13px] cursor-pointer"
                >
                  <Grid size={15} /> Review Matrix Chart &amp; Next (Step 2 of 2) →
                </button>
                <button
                  type="button"
                  onClick={handleSaveProductDetailsDirectly}
                  disabled={isSaving}
                  className="w-full h-9 px-4 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save size={13} /> {isSaving ? "Saving..." : "Update Details Directly"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: FULL-PAGE MATRIX CHART & STOCK QUANTITIES (Matching CreateProduct.jsx) */}
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

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] sm:text-[11px] text-emerald-300 font-mono bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-800">
                  Running: <strong>{runningStockTotal}</strong>
                </span>
                <span className="text-[10px] sm:text-[11px] text-amber-300 font-mono bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-800">
                  Reserve: <strong>{reserveStockTotal}</strong>
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-300 font-mono bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                  SKU: <strong className="text-white">{autoSku || productData.product_code}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Tools & Actions Card */}
          <div className="vw-card p-3 sm:p-4 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 sm:gap-4">
            {/* Quick Bulk Stock Fill */}
            <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
              {/* Running Bulk Fill */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl">
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded font-mono">
                  Running:
                </span>
                <input
                  type="number"
                  min="0"
                  value={bulkQty}
                  onChange={(e) => setBulkQty(e.target.value)}
                  placeholder="Qty"
                  className="w-16 h-7 px-1.5 bg-white border border-slate-200 rounded text-xs text-center font-mono focus:outline-none focus:border-emerald-500 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={handleApplyBulkQty}
                  className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
                >
                  Apply
                </button>
              </div>

              {/* Reserve Bulk Fill */}
              <div className="flex items-center gap-1.5 bg-amber-50/70 border border-amber-200 p-1 rounded-xl">
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded font-mono">
                  Reserve:
                </span>
                <input
                  type="number"
                  min="0"
                  value={bulkReserveQty}
                  onChange={(e) => setBulkReserveQty(e.target.value)}
                  placeholder="Qty"
                  className="w-16 h-7 px-1.5 bg-white border border-amber-200 rounded text-xs text-center font-mono focus:outline-none focus:border-amber-500 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowBulkReserveModal(true)}
                  className="h-7 px-2 bg-white hover:bg-amber-100/70 border border-amber-300 text-amber-800 font-semibold text-[10px] rounded transition-colors cursor-pointer shadow-2xs max-w-[130px] truncate"
                  title="Select bulk Floor, Rack & Shelf for Reserve Stock"
                >
                  {bulkReserveLocObj?.label || (bulkReserveLoc === "GROUND" ? "GND (Dock)" : "FL4 (Reserve)")}
                </button>
                <button
                  type="button"
                  onClick={handleApplyBulkReserveQty}
                  className="h-7 px-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
                >
                  Apply
                </button>
              </div>

              <button
                type="button"
                onClick={handleClearAllQty}
                className="h-7 px-2 text-slate-400 hover:text-rose-600 text-[10px] sm:text-[11px] font-bold transition-colors cursor-pointer ml-1"
                title="Clear all entered stock"
              >
                Clear All
              </button>
            </div>

            {/* Step Controls */}
            <div className="flex items-center gap-2 sm:gap-3 w-full xl:w-auto justify-end">
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
                Enter Running stock (Floors 1-3) &amp; Reserve stock (Floor 4 or Ground) per power cell
              </span>
            </div>

            <MatrixGridView
              cells={generatedCells}
              qtyMap={qtyMap}
              naMap={naMap}
              locOverrideMap={locOverrideMap}
              reserveQtyMap={reserveQtyMap}
              reserveLocMap={reserveLocMap}
              onQtyChange={handleQtyChange}
              onToggleNA={handleToggleNA}
              onLocChange={handleLocChange}
              onReserveQtyChange={handleReserveQtyChange}
              onReserveLocChange={handleReserveLocChange}
              showReserve={true}
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

      {showBulkReserveModal && (
        <LocationOverrideModal
          racks={racks}
          initialLoc={bulkReserveLocObj}
          allowedFloors={[4, 0]}
          title="Set Bulk Reserve Shelf Range (Floor 4 / Ground)"
          onConfirm={(id, locObj) => {
            setBulkReserveLocObj(locObj);
            setBulkReserveLoc(locObj?.floor === 0 ? "GROUND" : "FL4");
            setShowBulkReserveModal(false);
          }}
          onClear={() => {
            setBulkReserveLocObj(null);
            setBulkReserveLoc("FL4");
            setShowBulkReserveModal(false);
          }}
          onClose={() => setShowBulkReserveModal(false)}
        />
      )}
    </>
  );
}
