import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Grid, Package, Plus, Trash2, RefreshCw, Save, X, MapPin } from "lucide-react";
import { productApi, warehouseApi } from "../../services/productApi";
import { notify } from "@/lib/notify";
import { PowerInput } from "@/components/common/PowerInput";
import { buildGridFromCells, cellKey, formatPower, getMatrixTypeInfo } from "./matrixHelpers";

// Shelf Range Location Picker Modal: Floor -> Rack -> Start Shelf -> End Shelf (NO box selection)
export function LocationOverrideModal({
  racks = [],
  initialLoc,
  allowedFloors = [1, 2, 3],
  title = "Set Shelf Range for Cell",
  onConfirm,
  onClear,
  onClose,
}) {
  const [floor, setFloor] = useState(
    initialLoc?.floor !== undefined && initialLoc?.floor !== null
      ? Number(initialLoc.floor)
      : allowedFloors.length > 0
        ? allowedFloors[0]
        : 1
  );
  const [rack, setRack] = useState(initialLoc?.rack || "");
  const [startShelf, setStartShelf] = useState(initialLoc?.startShelf || initialLoc?.shelf || "");
  const [endShelf, setEndShelf] = useState(initialLoc?.endShelf || initialLoc?.startShelf || initialLoc?.shelf || "");
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedLocation, setResolvedLocation] = useState(null);

  const racksForFloor = racks.filter((r) => String(r.floor) === String(floor));

  // Fallback racks if no racks are configured for this floor in DB yet
  const availableRacks = useMemo(() => {
    if (racksForFloor.length > 0) return racksForFloor;
    const fNum = Number(floor);
    if (fNum === 0) {
      return [
        { rack: "DOCK", shelf_count: 10 },
        { rack: "STAGING", shelf_count: 10 },
        { rack: "R1", shelf_count: 10 },
        { rack: "R2", shelf_count: 10 },
      ];
    }
    if (fNum === 4) {
      return [
        { rack: "MAIN", shelf_count: 10 },
        { rack: "RESERVE", shelf_count: 10 },
        { rack: "R1", shelf_count: 10 },
        { rack: "R2", shelf_count: 10 },
        { rack: "R3", shelf_count: 10 },
      ];
    }
    return [
      { rack: "R1", shelf_count: 10 },
      { rack: "R2", shelf_count: 10 },
      { rack: "R3", shelf_count: 10 },
    ];
  }, [racksForFloor, floor]);

  const selectedRack = availableRacks.find((r) => r.rack === rack);
  const shelfCount = selectedRack?.shelf_count || 10;
  const shelfOptions = Array.from({ length: shelfCount }, (_, i) => i + 1);

  const formatFloorPrefix = (f) => (Number(f) === 0 ? "GND" : `FL${f}`);
  const getFloorOptionLabel = (f) => {
    const fNum = Number(f);
    if (fNum === 0) return "Ground Floor (Dock / Staging)";
    if (fNum === 4) return "Floor 4 (Reserve Godown)";
    return `Floor ${f} (Running Stock)`;
  };

  const handleFloorChange = (f) => {
    setFloor(Number(f));
    setRack("");
    setStartShelf("");
    setEndShelf("");
    setResolvedLocation(null);
  };

  const handleRackChange = (r) => {
    setRack(r);
    setStartShelf("1");
    setEndShelf("1");
    setResolvedLocation(null);
  };

  const handleStartShelfChange = (s) => {
    setStartShelf(s);
    if (!endShelf || parseInt(endShelf) < parseInt(s)) {
      setEndShelf(s);
    }
    setResolvedLocation(null);
  };

  const handleEndShelfChange = (e) => {
    setEndShelf(e);
    setResolvedLocation(null);
  };

  useEffect(() => {
    if (floor === "" || floor === undefined || floor === null || !rack || !startShelf) {
      setResolvedLocation(null);
      return;
    }
    let cancelled = false;
    setIsResolving(true);
    warehouseApi
      .getLocations({ floor: Number(floor), rack, shelf: String(startShelf) })
      .then((res) => {
        if (cancelled) return;
        setIsResolving(false);
        const prefix = formatFloorPrefix(floor);
        const spanLabel = `${prefix}-${rack} (Sh ${startShelf}${endShelf && endShelf !== startShelf ? `..${endShelf}` : ""})`;
        if (res.error === false && res.data && res.data.length > 0) {
          const loc = res.data[0];
          setResolvedLocation({
            id: loc._id,
            code: loc.location_code,
            label: spanLabel,
            floor: Number(floor),
            rack,
            startShelf,
            endShelf: endShelf || startShelf,
          });
        } else {
          setResolvedLocation({
            id: null,
            label: spanLabel,
            floor: Number(floor),
            rack,
            startShelf,
            endShelf: endShelf || startShelf,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsResolving(false);
          const prefix = formatFloorPrefix(floor);
          const spanLabel = `${prefix}-${rack} (Sh ${startShelf}${endShelf && endShelf !== startShelf ? `..${endShelf}` : ""})`;
          setResolvedLocation({
            id: null,
            label: spanLabel,
            floor: Number(floor),
            rack,
            startShelf,
            endShelf: endShelf || startShelf,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [floor, rack, startShelf, endShelf]);

  const handleApply = async () => {
    if (!resolvedLocation) return;
    setIsResolving(true);
    let finalLoc = { ...resolvedLocation };
    if (!finalLoc.id) {
      try {
        const desc = `${getFloorOptionLabel(floor)} · ${rack} · Shelf ${startShelf}${endShelf && endShelf !== startShelf ? `..${endShelf}` : ""}`;
        const res = await warehouseApi.findOrCreateShelf({
          floor: Number(floor),
          rack,
          start_shelf: String(startShelf),
          end_shelf: String(endShelf || startShelf),
          description: desc,
        });
        if (res?.error === false && res?.data?._id) {
          finalLoc.id = res.data._id;
          finalLoc.code = res.data.location_code;
        }
      } catch (err) {
        console.warn("Could not auto-create warehouse shelf location:", err);
      }
    }
    setIsResolving(false);
    onConfirm(finalLoc.id || finalLoc.label, finalLoc);
  };

  const selectClass =
    "w-full h-9 sm:h-10 px-2.5 sm:px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs transition-all disabled:bg-slate-100 disabled:text-slate-400";

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
          <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
            <MapPin size={15} className="text-emerald-600" /> {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-3.5 sm:p-5 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <div>
              <label className="block text-[10px] sm:text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                Floor
              </label>
              <select
                value={floor}
                onChange={(e) => handleFloorChange(e.target.value)}
                className={selectClass}
              >
                <option value="">-- Select --</option>
                {allowedFloors.map((f) => (
                  <option key={f} value={f}>
                    {getFloorOptionLabel(f)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                Rack
              </label>
              <select
                value={rack}
                onChange={(e) => handleRackChange(e.target.value)}
                disabled={floor === "" || floor === undefined}
                className={selectClass}
              >
                <option value="">-- Select --</option>
                {availableRacks.map((r) => (
                  <option key={r.rack} value={r.rack}>
                    Rack {r.rack}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                Start Shelf
              </label>
              <select
                value={startShelf}
                onChange={(e) => handleStartShelfChange(e.target.value)}
                disabled={!rack}
                className={selectClass}
              >
                <option value="">-- Select --</option>
                {shelfOptions.map((s) => (
                  <option key={s} value={s}>
                    Shelf {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                End Shelf
              </label>
              <select
                value={endShelf}
                onChange={(e) => handleEndShelfChange(e.target.value)}
                disabled={!startShelf}
                className={selectClass}
              >
                <option value="">-- Select --</option>
                {shelfOptions
                  .filter((s) => !startShelf || s >= parseInt(startShelf))
                  .map((s) => (
                    <option key={s} value={s}>
                      Shelf {s}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {resolvedLocation && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mt-0.5">
              <MapPin size={13} className="shrink-0" /> {resolvedLocation.label}
            </div>
          )}
        </div>

        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/80 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleApply}
            disabled={floor === "" || floor === undefined || !rack || !startShelf || isResolving}
            className="vw-btn-primary h-9 sm:h-10 text-xs sm:text-[13px] font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isResolving ? "Resolving..." : "Apply Shelf Range"}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="h-8 sm:h-9 text-[11px] sm:text-xs font-bold text-slate-500 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
          >
            Clear Location
          </button>
        </div>
      </div>
    </div>
  );
}

// Memoized matrix cell with N/A support, Running Shelf Range location picker, and Reserve Stock inputs
export const MatrixCell = memo(function MatrixCell({
  cellKey: key,
  qty,
  isNA = false,
  hasOverride,
  locLabel,
  locEntry,
  racks,
  onQtyChange,
  onToggleNA,
  onLocChange,
  reserveQty,
  reserveLoc = "FL4",
  onReserveQtyChange,
  onReserveLocChange,
  showReserve = true,
  readOnly = false,
}) {
  const [showRunModal, setShowRunModal] = useState(false);
  const [showResModal, setShowResModal] = useState(false);

  if (isNA) {
    return (
      <td className="p-1 border-b border-r border-slate-200 bg-slate-100/90 text-center align-middle select-none min-w-[110px] w-[110px] sm:min-w-[125px] sm:w-[125px]">
        <div className="flex flex-col items-center justify-center gap-1.5 py-8">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded tracking-wider font-mono">
            N/A
          </span>
          {!readOnly && (
            <button
              type="button"
              onClick={() => onToggleNA(key)}
              className="text-[10px] text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer"
              title="Enable this power cell"
            >
              Enable
            </button>
          )}
        </div>
      </td>
    );
  }

  const effectiveLoc = locEntry || (typeof hasOverride === "object" ? hasOverride : null);
  const displayLocText = locLabel || effectiveLoc?.label || (hasOverride ? "✓ shelf set" : "+ shelf");
  const quantity = parseInt(qty) || 0;
  const reserveQuantity = parseInt(reserveQty) || 0;

  const effectiveResLoc = typeof reserveLoc === "object" ? reserveLoc : null;
  const displayResLocText =
    effectiveResLoc?.label ||
    (typeof reserveLoc === "string" && reserveLoc.length > 0 && reserveLoc !== "FL4" && reserveLoc !== "GROUND"
      ? reserveLoc
      : reserveLoc === "GROUND"
        ? "GND (Dock)"
        : reserveLoc === "FL4"
          ? "FL4 (Reserve)"
          : "+ res shelf");

  if (readOnly) {
    return (
      <td
        className={`p-1.5 border-b border-r border-slate-100 text-center align-top transition-colors min-w-[110px] w-[110px] sm:min-w-[125px] sm:w-[125px] ${
          quantity > 0 || reserveQuantity > 0 ? "bg-emerald-50/30" : "bg-white"
        }`}
      >
        <div className="flex flex-col items-center justify-center py-1 gap-1">
          {/* Running Qty & Loc */}
          <div className="bg-slate-50 border border-slate-200 rounded p-1 w-full flex flex-col items-center">
            <div className="flex items-center justify-between w-full font-mono text-[9px] text-slate-500 mb-0.5">
              <span className="font-bold text-emerald-700 bg-emerald-100 px-1 rounded">RUN</span>
              <span className="text-slate-400">Qty</span>
            </div>
            <span
              className={`font-mono text-xs sm:text-[13px] ${
                quantity > 0 ? "text-emerald-700 font-bold" : "text-slate-300"
              }`}
            >
              {quantity > 0 ? quantity : "—"}
            </span>
            {quantity > 0 && displayLocText && displayLocText !== "+ shelf" && displayLocText !== "✓ shelf set" && (
              <span
                className="text-[8px] sm:text-[9px] text-slate-600 font-mono mt-0.5 px-1 py-0.2 bg-white rounded border border-slate-200 truncate w-full"
                title={displayLocText}
              >
                {displayLocText}
              </span>
            )}
          </div>

          {/* Reserve Qty & Loc */}
          {showReserve && (
            <div className="bg-amber-50/60 border border-amber-200/80 rounded p-1 w-full flex flex-col items-center">
              <div className="flex items-center justify-between w-full font-mono text-[9px] text-slate-500 mb-0.5">
                <span className="font-bold text-amber-800 bg-amber-100 px-1 rounded">RES</span>
                <span className="text-slate-400 font-mono">
                  {effectiveResLoc?.floor === 0 || reserveLoc === "GROUND" ? "GND" : "FL4"}
                </span>
              </div>
              <span
                className={`font-mono text-xs sm:text-[13px] ${
                  reserveQuantity > 0 ? "text-amber-800 font-bold" : "text-slate-300"
                }`}
              >
                {reserveQuantity > 0 ? reserveQuantity : "—"}
              </span>
              {reserveQuantity > 0 && displayResLocText && displayResLocText !== "+ res shelf" && (
                <span
                  className="text-[8px] sm:text-[9px] text-amber-900 font-mono mt-0.5 px-1 py-0.2 bg-white rounded border border-amber-200 truncate w-full"
                  title={displayResLocText}
                >
                  {displayResLocText}
                </span>
              )}
            </div>
          )}
        </div>
      </td>
    );
  }

  return (
    <td className="p-1 border-b border-r border-slate-100 hover:bg-emerald-50/20 transition-colors align-top group min-w-[110px] w-[110px] sm:min-w-[125px] sm:w-[125px]">
      {/* 1. RUNNING STOCK SECTION (Floors 1-3) */}
      <div className="bg-slate-50/90 border border-slate-200 rounded-lg p-1.5 mb-1.5 shadow-2xs">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-mono">
            RUN
          </span>
          <button
            type="button"
            onClick={() => onToggleNA(key)}
            className="text-[9px] font-bold px-1.5 py-0.2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
            title="Mark cell as N/A (Not Available)"
          >
            N/A
          </button>
        </div>
        <input
          type="number"
          min="0"
          value={qty}
          onChange={(e) => onQtyChange(key, e.target.value)}
          placeholder="Qty"
          className="w-full text-center h-7 text-xs sm:text-[13px] font-bold font-mono focus:outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded bg-white border border-slate-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => setShowRunModal(true)}
          className={`w-full h-6 text-[9px] sm:text-[10px] mt-1 rounded px-1 truncate border transition-colors flex items-center justify-center cursor-pointer ${
            hasOverride || effectiveLoc
              ? "bg-emerald-50 border-emerald-300 text-emerald-700 font-semibold shadow-2xs"
              : "bg-white border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-600"
          }`}
          title="Set shelf range for Running stock (Floors 1-3)"
        >
          {displayLocText}
        </button>
      </div>

      {/* 2. RESERVE STOCK SECTION (Floor 4 / Ground Floor) */}
      {showReserve && (
        <div className="bg-amber-50/60 border border-amber-200/90 rounded-lg p-1.5 flex flex-col shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded font-mono">
              RES
            </span>
          </div>
          <input
            type="number"
            min="0"
            value={reserveQty ?? ""}
            onChange={(e) => onReserveQtyChange && onReserveQtyChange(key, e.target.value)}
            placeholder="Res Qty"
            className="w-full text-center h-7 text-xs sm:text-[13px] font-bold font-mono focus:outline-none focus:bg-white focus:ring-1 focus:ring-amber-500 rounded bg-white border border-amber-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={() => setShowResModal(true)}
            className={`w-full h-6 text-[9px] sm:text-[10px] mt-1 rounded px-1 truncate border transition-colors flex items-center justify-center cursor-pointer ${
              effectiveResLoc || (typeof reserveLoc === "string" && reserveLoc && reserveLoc !== "+ res shelf")
                ? "bg-amber-100 border-amber-300 text-amber-800 font-semibold shadow-2xs"
                : "bg-white border-amber-200 text-amber-600/70 hover:border-amber-400 hover:text-amber-800"
            }`}
            title="Set shelf range for Reserve stock (Floor 4 / Ground)"
          >
            {displayResLocText}
          </button>
        </div>
      )}

      {showRunModal && (
        <LocationOverrideModal
          racks={racks}
          initialLoc={effectiveLoc}
          allowedFloors={[1, 2, 3]}
          title="Set Running Shelf Range (Floors 1-3)"
          onConfirm={(id, locObj) => {
            onLocChange(key, id, locObj);
            setShowRunModal(false);
          }}
          onClear={() => {
            onLocChange(key, "", null);
            setShowRunModal(false);
          }}
          onClose={() => setShowRunModal(false)}
        />
      )}

      {showResModal && (
        <LocationOverrideModal
          racks={racks}
          initialLoc={effectiveResLoc}
          allowedFloors={[4, 0]}
          title="Set Reserve Shelf Range (Floor 4 / Ground)"
          onConfirm={(id, locObj) => {
            onReserveLocChange && onReserveLocChange(key, locObj || id);
            setShowResModal(false);
          }}
          onClear={() => {
            onReserveLocChange && onReserveLocChange(key, "");
            setShowResModal(false);
          }}
          onClose={() => setShowResModal(false)}
        />
      )}
    </td>
  );
});


// Generates the power-matrix STRUCTURE for a product via the backend's real spec-compliant
// generator (Power_Matrix_Reference_Guide Section 2: SPH/CYL/AXIS/ADD ranges, Progressive-family
// location per cell, and persists that via the separate stock-save endpoint.
export function MatrixEditor({
  productId,
  lensType,
  racks,
  godownId = "running_stock",
  rangeConfig,
  onRangeConfigChange,
  autoGenerateIfEmpty = false,
  readOnly = false,
}) {
  // RX is always structurally a Progressive lens (same SPH/CYL/AXIS/ADD fields) per the
  // client's spec, even though it's shown as its own distinct lens-type card to staff.
  const isProgressiveFamily = lensType === "Progressive" || lensType === "KT" || lensType === "RX";

  const [matrixDoc, setMatrixDoc] = useState(null);
  const [qtyMap, setQtyMap] = useState({});
  const [locOverrideMap, setLocOverrideMap] = useState({});
  const [naMap, setNaMap] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingStock, setIsSavingStock] = useState(false);
  const [hasCyl, setHasCyl] = useState((rangeConfig.cylBlocks || []).length > 0);

  useEffect(() => {
    if (!productId) return;
    (async () => {
      setIsLoading(true);
      try {
        const res = await productApi.updateMatrix({ productId, godownId });
        if (res.error === false) {
          const cells = res.data.power_cells || [];
          setMatrixDoc(res.data);
          primeMapsFromCells(cells);
          if (cells.length === 0 && autoGenerateIfEmpty) {
            await handleGenerate();
          }
        }
      } catch (e) {
        console.error("Failed to load matrix", e);
      }
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const handleQtyChange = useCallback((key, value) => {
    setQtyMap((prev) => ({ ...prev, [key]: value }));
  }, []);
  const handleLocChange = useCallback((key, value, locObj) => {
    setLocOverrideMap((prev) => ({ ...prev, [key]: locObj || value }));
  }, []);
  const handleToggleNA = useCallback((key) => {
    setNaMap((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
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
  }, []);

  const primeMapsFromCells = (cells) => {
    const qm = {},
      lm = {},
      nam = {};
    cells.forEach((c) => {
      const key = cellKey(c);
      if (c.status === "out_of_stock" && (!c.total_quantity || c.total_quantity === 0)) {
        nam[key] = true;
      }
      if (c.total_quantity) qm[key] = c.total_quantity;
      if (c.locations && c.locations.length > 0) {
        const locRef = c.locations[0].warehouse_location_id;
        lm[key] = locRef && typeof locRef === "object" ? locRef._id : locRef;
      }
    });
    setQtyMap(qm);
    setLocOverrideMap(lm);
    setNaMap(nam);
  };

  const updateSph = (field, value) => {
    onRangeConfigChange({ ...rangeConfig, sph: { ...rangeConfig.sph, [field]: value } });
  };
  const updateAdd = (field, value) => {
    onRangeConfigChange({ ...rangeConfig, add: { ...rangeConfig.add, [field]: value } });
  };
  const updateCylBlock = (idx, field, value) => {
    const blocks = rangeConfig.cylBlocks.map((b, i) => (i === idx ? { ...b, [field]: value } : b));
    onRangeConfigChange({ ...rangeConfig, cylBlocks: blocks });
  };
  const addCylBlock = () => {
    onRangeConfigChange({
      ...rangeConfig,
      cylBlocks: [...rangeConfig.cylBlocks, { min: "-2.00", max: "0.00", step: "0.25", axis: "" }],
    });
  };
  const removeCylBlock = (idx) => {
    onRangeConfigChange({
      ...rangeConfig,
      cylBlocks: rangeConfig.cylBlocks.filter((_, i) => i !== idx),
    });
  };
  const toggleHasCyl = (checked) => {
    setHasCyl(checked);
    if (!checked) onRangeConfigChange({ ...rangeConfig, cylBlocks: [] });
    else if (rangeConfig.cylBlocks.length === 0)
      onRangeConfigChange({
        ...rangeConfig,
        cylBlocks: [{ min: "-2.00", max: "0.00", step: "0.25", axis: "" }],
      });
  };

  const handleGenerate = async () => {
    if (!productId) return notify.warning("Save the product first.");

    if (isProgressiveFamily && hasCyl) {
      if (!rangeConfig.cylBlocks || rangeConfig.cylBlocks.length === 0) {
        notify.warning("Please configure at least one CYL block.");
        return;
      }
      for (let i = 0; i < rangeConfig.cylBlocks.length; i++) {
        const b = rangeConfig.cylBlocks[i];
        const axisNum = parseInt(b.axis);
        if (isNaN(axisNum) || axisNum < 1 || axisNum > 180) {
          notify.error(`Axis (1–180°) is required for CYL Block #${i + 1} in ${lensType}.`);
          return;
        }
      }
    }

    setIsGenerating(true);
    try {
      const generatorConfig = {
        sph: {
          min: parseFloat(rangeConfig.sph.min),
          max: parseFloat(rangeConfig.sph.max),
          step: parseFloat(rangeConfig.sph.step),
        },
        add: isProgressiveFamily
          ? {
              min: parseFloat(rangeConfig.add.min),
              max: parseFloat(rangeConfig.add.max),
              step: parseFloat(rangeConfig.add.step),
            }
          : null,
        cyl_blocks: hasCyl
          ? rangeConfig.cylBlocks.map((b) => ({
              min: parseFloat(b.min),
              max: parseFloat(b.max),
              step: parseFloat(b.step),
              axis: isProgressiveFamily ? parseInt(b.axis) : null,
            }))
          : null,
      };

      const res = await productApi.generateMatrix({ productId, godownId, generatorConfig });
      if (res.error !== false) {
        notify.error(res.message || "Failed to generate matrix");
        return;
      }
      setMatrixDoc(res.data.matrix);
      primeMapsFromCells(res.data.matrix.power_cells || []);
      notify.success(
        `Matrix structure generated: ${res.data.calculations.stats.total_cells} cells.`,
      );
    } catch (e) {
      console.error(e);
      notify.error(e.message || "Error generating matrix");
    }
    setIsGenerating(false);
  };

  const handleSaveStock = async () => {
    if (!matrixDoc) return;
    setIsSavingStock(true);
    try {
      const powerCells = (matrixDoc.power_cells || []).map((c) => {
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
      const res = await productApi.updateMatrix({ productId, godownId, powerCells });
      if (res.error !== false) {
        notify.error(res.message || "Failed to save stock");
        return;
      }
      setMatrixDoc(res.data);
      notify.success("Stock saved successfully.");
    } catch (e) {
      console.error(e);
      notify.error("Error saving stock");
    }
    setIsSavingStock(false);
  };

  const cells = matrixDoc?.power_cells || [];

  const matrixTypeInfo = useMemo(() => {
    return getMatrixTypeInfo({
      lensType,
      rangeConfig,
      hasCyl,
    });
  }, [lensType, rangeConfig, hasCyl]);

  return (
    <div className="vw-card p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 sm:mb-4 border-b border-slate-100 pb-2.5 sm:pb-3">
        <h3 className="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-2">
          <Grid size={16} className="text-purple-600" /> POWER MATRIX {readOnly ? "(VIEW ONLY)" : ""}
        </h3>
        {readOnly && (
          <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            Read-Only Matrix
          </span>
        )}
      </div>

      {readOnly ? (
        <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 sm:p-4 mb-4 sm:mb-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-mono">
                {matrixTypeInfo?.code || "Type B"}
              </span>
              <div>
                <h4 className="font-bold text-slate-800 text-xs sm:text-[13px]">
                  {matrixTypeInfo?.name || "Power Matrix"}
                </h4>
                <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono">
                  <span>SPH: {rangeConfig?.sph?.min} ~ {rangeConfig?.sph?.max}</span>
                  {hasCyl && rangeConfig?.cylBlocks?.length > 0 && (
                    <>
                      <span>•</span>
                      <span>CYL: {rangeConfig.cylBlocks[0]?.min} ~ {rangeConfig.cylBlocks[0]?.max}</span>
                    </>
                  )}
                  {isProgressiveFamily && rangeConfig?.add && (
                    <>
                      <span>•</span>
                      <span>ADD: {rangeConfig.add?.min} ~ {rangeConfig.add?.max}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                Total Cells: <b className="font-mono text-slate-900">{cells.length}</b>
              </span>
            </div>
          </div>
        </div>
      ) : (
        <>
          <p className="text-[11px] sm:text-xs text-slate-500 mb-3 sm:mb-4 leading-relaxed">
            {isProgressiveFamily
              ? "Progressive/KT family: ADD runs across the columns (+1.00 to +3.00). SPH/CYL compound power runs down the rows. Axis (1–180°) is required when CYL is added."
              : "Single Vision: SPH runs down the rows, CYL runs across the columns. Axis does not apply."}
          </p>

          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 sm:p-4 mb-4 sm:mb-5 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-3 sm:mb-4">
              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  SPH Min
                </label>
                <PowerInput
                  value={rangeConfig.sph.min}
                  onChange={(v) => updateSph("min", v)}
                  step={parseFloat(rangeConfig.sph.step) || 0.25}
                />
              </div>
              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  SPH Max
                </label>
                <PowerInput
                  value={rangeConfig.sph.max}
                  onChange={(v) => updateSph("max", v)}
                  step={parseFloat(rangeConfig.sph.step) || 0.25}
                />
              </div>
              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  SPH Step
                </label>
                <input
                  type="text"
                  value={rangeConfig.sph.step}
                  onChange={(e) => updateSph("step", e.target.value)}
                  className="w-full h-8 sm:h-9 px-2.5 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-xs sm:text-[13px] font-mono focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs transition-all"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs sm:text-[13px] font-bold text-slate-700 mb-2.5 sm:mb-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasCyl}
                onChange={(e) => toggleHasCyl(e.target.checked)}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              This range also has a CYL dimension
            </label>

            {hasCyl && (
              <div className="flex flex-col gap-2.5 sm:gap-3 mb-2">
                {rangeConfig.cylBlocks.map((b, idx) => (
                  <div key={idx} className="relative bg-white border border-slate-200/80 rounded-xl p-2.5 sm:p-3 shadow-xs">
                    {rangeConfig.cylBlocks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCylBlock(idx)}
                        className="absolute top-2 right-2 text-slate-400 hover:text-rose-500 p-1 cursor-pointer transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-2.5 pr-6">
                      <div>
                        <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                          CYL Min
                        </label>
                        <PowerInput
                          value={b.min}
                          onChange={(v) => updateCylBlock(idx, "min", v)}
                          step={parseFloat(b.step) || 0.25}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                          CYL Max
                        </label>
                        <PowerInput
                          value={b.max}
                          onChange={(v) => updateCylBlock(idx, "max", v)}
                          step={parseFloat(b.step) || 0.25}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                      <div>
                        <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                          Step
                        </label>
                        <input
                          type="text"
                          value={b.step}
                          onChange={(e) => updateCylBlock(idx, "step", e.target.value)}
                          className="w-full h-8 sm:h-9 px-2.5 bg-slate-50/70 border border-slate-200 rounded-lg sm:rounded-xl text-xs sm:text-[13px] font-mono focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs transition-all"
                        />
                      </div>
                      {isProgressiveFamily ? (
                        <div>
                          <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider flex items-center justify-between">
                            <span>Axis (1–180°)</span>
                            <span className="text-[9px] text-rose-500 font-bold">*Req</span>
                          </label>
                          <PowerInput
                            value={b.axis}
                            onChange={(v) => updateCylBlock(idx, "axis", v)}
                            placeholder="e.g. 90"
                            step={1}
                            decimals={0}
                            signed={false}
                          />
                          <p className="text-[9px] text-slate-400 mt-0.5">~90° for -CYL, ~180° for +CYL</p>
                        </div>
                      ) : (
                        <div className="flex flex-col justify-end pb-1">
                          <span className="text-[11px] text-slate-400 italic">
                            Single Vision has no Axis (CYL only).
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addCylBlock}
                  className="self-start text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus size={13} /> Add CYL/Axis Block
                </button>
              </div>
            )}

            {isProgressiveFamily && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-200">
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    ADD Min
                  </label>
                  <PowerInput
                    value={rangeConfig.add.min}
                    onChange={(v) => updateAdd("min", v)}
                    step={parseFloat(rangeConfig.add.step) || 0.25}
                  />
                </div>
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    ADD Max
                  </label>
                  <PowerInput
                    value={rangeConfig.add.max}
                    onChange={(v) => updateAdd("max", v)}
                    step={parseFloat(rangeConfig.add.step) || 0.25}
                  />
                </div>
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    ADD Step
                  </label>
                  <input
                    type="text"
                    value={rangeConfig.add.step}
                    onChange={(e) => updateAdd("step", e.target.value)}
                    className="w-full h-8 sm:h-9 px-2.5 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-xs sm:text-[13px] font-mono focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs transition-all"
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!productId || isGenerating}
              className="mt-3 sm:mt-4 vw-btn-secondary h-9 sm:h-10 w-full font-bold bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 flex items-center justify-center gap-2 rounded-xl text-xs sm:text-[13px] cursor-pointer shadow-xs transition-all"
            >
              <RefreshCw size={14} className={isGenerating ? "animate-spin" : ""} />{" "}
              {isGenerating
                ? "Generating..."
                : cells.length > 0
                  ? "Regenerate Matrix Structure"
                  : "Generate Matrix Structure"}
            </button>
            {!productId && (
              <p className="text-[11px] text-amber-600 mt-2">
                Save the product first to generate its matrix.
              </p>
            )}
          </div>
        </>
      )}

      {isLoading && <p className="text-xs sm:text-[13px] text-slate-500 font-medium">Loading matrix...</p>}

      {!isLoading && cells.length > 0 && (
        <div className="mt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
            <h4 className="font-bold text-slate-800 flex items-center gap-2 text-xs sm:text-sm">
              <Package size={15} className="text-emerald-600" />
              {readOnly ? `CURRENT STOCK MATRIX (${cells.length} cells)` : `STOCK ENTRY (${cells.length} cells)`}
            </h4>
            {!readOnly && (
              <button
                type="button"
                onClick={handleSaveStock}
                disabled={isSavingStock}
                className="w-full sm:w-auto vw-btn-primary h-8 sm:h-9 px-3.5 sm:px-4 gap-1.5 flex items-center justify-center disabled:opacity-50 text-xs sm:text-[13px] font-semibold rounded-xl cursor-pointer shadow-xs"
              >
                <Save size={14} /> {isSavingStock ? "Saving..." : "Save Stock"}
              </button>
            )}
          </div>

          <MatrixGridView
            cells={cells}
            qtyMap={qtyMap}
            naMap={naMap}
            locOverrideMap={locOverrideMap}
            onQtyChange={handleQtyChange}
            onToggleNA={handleToggleNA}
            onLocChange={handleLocChange}
            racks={racks}
            matrixTypeInfo={matrixTypeInfo}
            readOnly={readOnly}
            showReserve={false}
          />
        </div>
      )}
    </div>
  );
}

export function MatrixGridView({
  cells = [],
  qtyMap = {},
  naMap = {},
  locOverrideMap = {},
  reserveQtyMap = {},
  reserveLocMap = {},
  onQtyChange,
  onToggleNA,
  onLocChange,
  onReserveQtyChange,
  onReserveLocChange,
  showReserve = true,
  racks = [],
  matrixTypeInfo,
  maxHeight = "max-h-[560px]",
  readOnly = false,
}) {
  const grid = useMemo(() => buildGridFromCells(cells), [cells]);

  const { grandTotal, reserveGrandTotal, rowTotals, colTotals } = useMemo(() => {
    let grand = 0;
    let resGrand = 0;
    const rt = {};
    const ct = {};
    grid.rowKeys.forEach((rk) => {
      rt[rk] = 0;
    });
    grid.colKeys.forEach((ck) => {
      ct[ck] = 0;
    });
    grid.rowKeys.forEach((rk) => {
      const row = grid.rows.get(rk);
      grid.colKeys.forEach((ck) => {
        const cell = row.cellsByCol.get(ck);
        if (!cell) return;
        const key = cellKey(cell);
        if (naMap[key]) return; // Skip N/A cells from total calculation
        const qty = parseInt(qtyMap[key]) || 0;
        const rQty = parseInt(reserveQtyMap[key]) || 0;
        rt[rk] += qty;
        ct[ck] += qty;
        grand += qty;
        resGrand += rQty;
      });
    });
    return { grandTotal: grand, reserveGrandTotal: resGrand, rowTotals: rt, colTotals: ct };
  }, [grid, qtyMap, reserveQtyMap, naMap]);

  if (cells.length === 0) return null;

  return (
    <div>
      <div className={`overflow-x-auto border border-slate-200 rounded-xl ${maxHeight} overflow-y-auto shadow-xs`}>
        <table className="w-full text-center border-collapse text-[11px] sm:text-xs">
          <thead className="bg-slate-100 sticky top-0 z-10 shadow-xs">
            <tr>
              <th className="p-1.5 sm:p-2 border-b border-r border-slate-200 min-w-[76px] sm:min-w-[90px] font-bold text-slate-700 bg-slate-200 text-[10px] sm:text-xs">
                {grid.flags.hasAdd
                  ? "SPH/CYL/AX \\ ADD"
                  : grid.flags.hasCyl
                    ? "SPH \\ CYL"
                    : "SPH"}
              </th>
              {grid.colKeys.map((ck) => (
                <th
                  key={ck}
                  className="p-1.5 sm:p-2 border-b border-r border-slate-200 min-w-[110px] w-[110px] sm:min-w-[125px] sm:w-[125px] font-bold text-slate-700 text-[10px] sm:text-xs font-mono"
                >
                  {grid.cols.get(ck).label}
                </th>
              ))}
              <th className="p-1.5 sm:p-2 border-b border-slate-200 min-w-[80px] sm:min-w-[90px] font-bold text-slate-700 bg-slate-200 text-[10px] sm:text-xs">
                TOTAL
              </th>
            </tr>
          </thead>
          <tbody>
            {grid.rowKeys.map((rk) => (
              <tr key={rk}>
                <th className="p-1.5 sm:p-2 border-b border-r border-slate-200 bg-slate-50 font-bold text-slate-700 sticky left-0 z-10 text-[10px] sm:text-xs font-mono">
                  {grid.rows.get(rk).label}
                </th>
                {grid.colKeys.map((ck) => {
                  const cell = grid.rows.get(rk).cellsByCol.get(ck);
                  if (!cell) {
                    return (
                      <td
                        key={ck}
                        className="p-1 border-b border-r border-slate-200 bg-amber-50/70 text-center text-amber-500/70 text-[9px] sm:text-[10px] select-none font-mono min-w-[110px] w-[110px] sm:min-w-[125px] sm:w-[125px]"
                        title="Excluded by Cross rule (|SPH| ≥ |CYL|)"
                      >
                        ×
                      </td>
                    );
                  }
                  const key = cellKey(cell);
                  const locEntry = locOverrideMap[key];
                  return (
                    <MatrixCell
                      key={ck}
                      cellKey={key}
                      qty={qtyMap[key] || ""}
                      isNA={!!naMap[key]}
                      hasOverride={!!locEntry}
                      locLabel={typeof locEntry === "object" ? locEntry?.label : undefined}
                      locEntry={typeof locEntry === "object" ? locEntry : null}
                      racks={racks}
                      onQtyChange={onQtyChange}
                      onToggleNA={onToggleNA}
                      onLocChange={onLocChange}
                      reserveQty={reserveQtyMap[key] || ""}
                      reserveLoc={reserveLocMap[key] || "FL4"}
                      onReserveQtyChange={onReserveQtyChange}
                      onReserveLocChange={onReserveLocChange}
                      showReserve={showReserve}
                      readOnly={readOnly}
                    />
                  );
                })}
                <td className="p-1 border-b border-slate-100 bg-slate-50 font-bold text-slate-700 text-[11px] sm:text-xs font-mono min-w-[80px] sm:min-w-[90px]">
                  {rowTotals[rk] || 0}
                </td>
              </tr>
            ))}
            <tr>
              <th className="p-1.5 sm:p-2 border-r border-slate-200 bg-slate-200 font-bold text-slate-700 sticky left-0 text-[10px] sm:text-xs">
                TOTAL
              </th>
              {grid.colKeys.map((ck) => (
                <td
                  key={ck}
                  className="p-1 border-r border-slate-200 bg-slate-200 font-bold text-slate-700 text-[11px] sm:text-xs font-mono min-w-[110px] w-[110px] sm:min-w-[125px] sm:w-[125px]"
                >
                  {colTotals[ck] || 0}
                </td>
              ))}
              <td className="p-1 bg-slate-300 font-bold text-slate-900 text-[11px] sm:text-xs font-mono min-w-[80px] sm:min-w-[90px]">
                <div>Run: {grandTotal}</div>
                {reserveGrandTotal > 0 && (
                  <div className="text-[10px] text-amber-900 font-normal">Res: {reserveGrandTotal}</div>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Visual Legend */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2.5 sm:mt-3 text-[10px] sm:text-[11px] text-slate-500 px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-3 sm:w-3.5 h-3 sm:h-3.5 bg-white border border-slate-300 rounded-sm inline-block shadow-2xs" />
          Valid Stock Cell
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-3 sm:h-3.5 bg-slate-100 border border-slate-300 rounded-sm inline-flex items-center justify-center text-[8px] font-bold text-slate-400 font-mono">
            N/A
          </span>
          Not Available (No Stock / Location)
        </span>
        {matrixTypeInfo?.isCross && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 sm:w-3.5 h-3 sm:h-3.5 bg-amber-100 border border-amber-300 rounded-sm inline-block shadow-2xs" />
            Excluded (Cross rule: |SPH| ≥ |CYL|)
          </span>
        )}
      </div>
    </div>
  );
}

export function defaultRangeConfigFromProduct(product) {
  const minS = product?.min_sph ?? 0;
  const maxS = product?.max_sph ?? -4;
  const minC = product?.min_cyl ?? 0;
  const maxC = product?.max_cyl ?? -2;
  const stepS = product?.step_sph ? String(product.step_sph) : "0.25";
  const stepC = product?.step_cyl ? String(product.step_cyl) : "0.25";
  const axisVal = product?.axis !== undefined && product?.axis !== null ? String(product.axis) : (product?.axis_rule || "");
  const minAddVal = product?.min_add !== undefined && product?.min_add !== null ? formatPower(product.min_add) : "+1.00";
  const maxAddVal = product?.max_add !== undefined && product?.max_add !== null ? formatPower(product.max_add) : "+3.00";
  const stepAddVal = product?.step_add !== undefined && product?.step_add !== null ? String(product.step_add) : "0.25";

  return {
    sph: { min: formatPower(minS), max: formatPower(maxS), step: stepS },
    cylBlocks: [{ min: formatPower(minC), max: formatPower(maxC), step: stepC, axis: axisVal }],
    add: { min: minAddVal, max: maxAddVal, step: stepAddVal },
  };
}
