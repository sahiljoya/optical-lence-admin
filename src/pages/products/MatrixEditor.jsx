import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Grid, Package, Plus, Trash2, RefreshCw, Save, X, MapPin } from "lucide-react";
import { productApi, warehouseApi } from "../../services/productApi";
import { notify } from "@/lib/notify";
import { PowerInput } from "@/components/common/PowerInput";
import { buildGridFromCells, cellKey, formatPower, getMatrixTypeInfo } from "./matrixHelpers";

// Shelf Range Location Picker Modal: Floor -> Rack -> Start Shelf -> End Shelf (NO box selection)
function LocationOverrideModal({ racks = [], initialLoc, onConfirm, onClear, onClose }) {
  const [floor, setFloor] = useState(initialLoc?.floor || "");
  const [rack, setRack] = useState(initialLoc?.rack || "");
  const [startShelf, setStartShelf] = useState(initialLoc?.startShelf || "");
  const [endShelf, setEndShelf] = useState(initialLoc?.endShelf || "");
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedLocation, setResolvedLocation] = useState(null);

  const racksForFloor = racks.filter((r) => String(r.floor) === String(floor));
  const selectedRack = racksForFloor.find((r) => r.rack === rack);
  const shelfCount = selectedRack?.shelf_count || 10;
  const shelfOptions = Array.from({ length: shelfCount }, (_, i) => i + 1);

  const handleFloorChange = (f) => {
    setFloor(f);
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
    if (!floor || !rack || !startShelf) {
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
        const spanLabel = `FL${floor}-${rack} (Sh ${startShelf}${endShelf && endShelf !== startShelf ? `..${endShelf}` : ""})`;
        if (res.error === false && res.data && res.data.length > 0) {
          const loc = res.data[0];
          setResolvedLocation({
            id: loc._id,
            code: loc.location_code,
            label: spanLabel,
            floor,
            rack,
            startShelf,
            endShelf: endShelf || startShelf,
          });
        } else {
          setResolvedLocation({
            id: null,
            label: spanLabel,
            floor,
            rack,
            startShelf,
            endShelf: endShelf || startShelf,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsResolving(false);
          const spanLabel = `FL${floor}-${rack} (Sh ${startShelf}${endShelf && endShelf !== startShelf ? `..${endShelf}` : ""})`;
          setResolvedLocation({
            id: null,
            label: spanLabel,
            floor,
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

  const selectClass =
    "w-full h-10 px-2 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400";

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-[14px] flex items-center gap-1.5">
            <MapPin size={14} className="text-emerald-600" /> Set Shelf Range for Cell
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Floor</label>
              <select
                value={floor}
                onChange={(e) => handleFloorChange(e.target.value)}
                className={selectClass}
              >
                <option value="">-- Select --</option>
                {[1, 2, 3, 4].map((f) => (
                  <option key={f} value={f}>
                    Floor {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Rack</label>
              <select
                value={rack}
                onChange={(e) => handleRackChange(e.target.value)}
                disabled={!floor}
                className={selectClass}
              >
                <option value="">-- Select --</option>
                {racksForFloor.map((r) => (
                  <option key={r.rack} value={r.rack}>
                    Rack {r.rack}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">
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
              <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">
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
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mt-1">
              <MapPin size={13} /> {resolvedLocation.label}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => resolvedLocation && onConfirm(resolvedLocation.id || resolvedLocation.label, resolvedLocation)}
            disabled={!floor || !rack || !startShelf || isResolving}
            className="vw-btn-primary h-9 text-[13px] disabled:opacity-50"
          >
            {isResolving ? "Resolving..." : "Apply Shelf Range"}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="h-9 text-[12px] font-bold text-slate-500 hover:text-rose-600"
          >
            Clear Location
          </button>
        </div>
      </div>
    </div>
  );
}

// Memoized matrix cell with N/A support and Shelf Range location picker
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
}) {
  const [showModal, setShowModal] = useState(false);

  if (isNA) {
    return (
      <td className="p-1 border-b border-r border-slate-200 bg-slate-100 text-center align-middle select-none">
        <div className="flex flex-col items-center justify-center gap-0.5 py-0.5">
          <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded tracking-wide">
            N/A
          </span>
          <button
            type="button"
            onClick={() => onToggleNA(key)}
            className="text-[9px] text-blue-600 hover:text-blue-800 underline font-medium"
            title="Enable this power cell"
          >
            Enable
          </button>
        </div>
      </td>
    );
  }

  const effectiveLoc = locEntry || (typeof hasOverride === "object" ? hasOverride : null);
  const displayLocText = locLabel || effectiveLoc?.label || (hasOverride ? "✓ shelf set" : "+ shelf");

  return (
    <td className="p-1 border-b border-r border-slate-100 hover:bg-emerald-50/50 transition-colors align-top group">
      <div className="flex items-center gap-1">
        <input
          type="number"
          min="0"
          value={qty}
          onChange={(e) => onQtyChange(key, e.target.value)}
          placeholder="Qty"
          className="w-full text-center h-7 text-[12px] focus:outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded bg-transparent font-medium"
        />
        <button
          type="button"
          onClick={() => onToggleNA(key)}
          className="text-[9px] font-bold px-1 py-0.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded border border-transparent hover:border-rose-200 transition-colors shrink-0"
          title="Mark cell as N/A (No stock / location)"
        >
          N/A
        </button>
      </div>

      {parseInt(qty) > 0 && (
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className={`w-full text-[9px] mt-0.5 rounded px-1 py-0.5 truncate border transition-colors ${
            hasOverride || effectiveLoc
              ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-medium"
              : "bg-white border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-600"
          }`}
          title="Set shelf range for this power"
        >
          {displayLocText}
        </button>
      )}

      {showModal && (
        <LocationOverrideModal
          racks={racks}
          initialLoc={effectiveLoc}
          onConfirm={(id, locObj) => {
            onLocChange(key, id, locObj);
            setShowModal(false);
          }}
          onClear={() => {
            onLocChange(key, "", null);
            setShowModal(false);
          }}
          onClose={() => setShowModal(false)}
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
    <div className="vw-card p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-slate-100 pb-3">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Grid size={16} className="text-purple-600" /> POWER MATRIX
        </h3>
      </div>

      <p className="text-[12px] text-slate-500 mb-3 leading-relaxed">
        {isProgressiveFamily
          ? "Progressive/KT family: ADD runs across the columns (+1.00 to +3.00). SPH/CYL compound power runs down the rows. Axis (1–180°) is required when CYL is added."
          : "Single Vision: SPH runs down the rows, CYL runs across the columns. Axis does not apply."}
      </p>

      <div className="bg-slate-50/50 border border-slate-200 rounded-lg p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">
              SPH Min
            </label>
            <PowerInput
              value={rangeConfig.sph.min}
              onChange={(v) => updateSph("min", v)}
              step={parseFloat(rangeConfig.sph.step) || 0.25}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">
              SPH Max
            </label>
            <PowerInput
              value={rangeConfig.sph.max}
              onChange={(v) => updateSph("max", v)}
              step={parseFloat(rangeConfig.sph.step) || 0.25}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">
              SPH Step
            </label>
            <input
              type="text"
              value={rangeConfig.sph.step}
              onChange={(e) => updateSph("step", e.target.value)}
              className="w-full h-9 px-2 bg-white border border-slate-200 rounded text-[13px] font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-[12px] font-bold text-slate-700 mb-3">
          <input
            type="checkbox"
            checked={hasCyl}
            onChange={(e) => toggleHasCyl(e.target.checked)}
          />
          This range also has a CYL dimension
        </label>

        {hasCyl && (
          <div className="flex flex-col gap-3 mb-2">
            {rangeConfig.cylBlocks.map((b, idx) => (
              <div key={idx} className="relative bg-white border border-slate-100 rounded p-3">
                {rangeConfig.cylBlocks.length > 1 && (
                  <button
                    onClick={() => removeCylBlock(idx)}
                    className="absolute top-2 right-2 text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <div className="grid grid-cols-2 gap-3 mb-3 pr-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                      CYL Min
                    </label>
                    <PowerInput
                      value={b.min}
                      onChange={(v) => updateCylBlock(idx, "min", v)}
                      step={parseFloat(b.step) || 0.25}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                      CYL Max
                    </label>
                    <PowerInput
                      value={b.max}
                      onChange={(v) => updateCylBlock(idx, "max", v)}
                      step={parseFloat(b.step) || 0.25}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                      Step
                    </label>
                    <input
                      type="text"
                      value={b.step}
                      onChange={(e) => updateCylBlock(idx, "step", e.target.value)}
                      className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded text-[13px] font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  {isProgressiveFamily ? (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-1 uppercase flex items-center justify-between">
                        <span>Axis (1–180°)</span>
                        <span className="text-[9px] text-rose-500 font-bold">*Required</span>
                      </label>
                      <PowerInput
                        value={b.axis}
                        onChange={(v) => updateCylBlock(idx, "axis", v)}
                        placeholder="e.g. 90"
                        step={1}
                        decimals={0}
                        signed={false}
                      />
                      <p className="text-[9px] text-slate-400 mt-0.5">Convention: ~90° for -CYL, ~180° for +CYL</p>
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
              onClick={addCylBlock}
              className="self-start text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
            >
              <Plus size={12} /> Add CYL/Axis Block
            </button>
          </div>
        )}

        {isProgressiveFamily && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">
                ADD Min
              </label>
              <PowerInput
                value={rangeConfig.add.min}
                onChange={(v) => updateAdd("min", v)}
                step={parseFloat(rangeConfig.add.step) || 0.25}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">
                ADD Max
              </label>
              <PowerInput
                value={rangeConfig.add.max}
                onChange={(v) => updateAdd("max", v)}
                step={parseFloat(rangeConfig.add.step) || 0.25}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">
                ADD Step
              </label>
              <input
                type="text"
                value={rangeConfig.add.step}
                onChange={(e) => updateAdd("step", e.target.value)}
                className="w-full h-9 px-2 bg-white border border-slate-200 rounded text-[13px] font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={!productId || isGenerating}
          className="mt-4 vw-btn-secondary h-10 w-full font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <RefreshCw size={14} />{" "}
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

      {isLoading && <p className="text-[12px] text-slate-500">Loading matrix...</p>}

      {!isLoading && cells.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-slate-800 flex items-center gap-2 text-[13px]">
              <Package size={15} className="text-emerald-600" /> STOCK ENTRY ({cells.length} cells)
            </h4>
            <button
              onClick={handleSaveStock}
              disabled={isSavingStock}
              className="vw-btn-primary h-9 px-3 gap-2 flex items-center justify-center disabled:opacity-50 text-[12px]"
            >
              <Save size={14} /> {isSavingStock ? "Saving..." : "Save Stock"}
            </button>
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
  onQtyChange,
  onToggleNA,
  onLocChange,
  racks = [],
  matrixTypeInfo,
  maxHeight = "max-h-[560px]",
}) {
  const grid = useMemo(() => buildGridFromCells(cells), [cells]);

  const { grandTotal, rowTotals, colTotals } = useMemo(() => {
    let grand = 0;
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
        rt[rk] += qty;
        ct[ck] += qty;
        grand += qty;
      });
    });
    return { grandTotal: grand, rowTotals: rt, colTotals: ct };
  }, [grid, qtyMap, naMap]);

  if (cells.length === 0) return null;

  return (
    <div>
      <div className={`overflow-x-auto border border-slate-200 rounded-lg ${maxHeight} overflow-y-auto`}>
        <table className="w-full text-center border-collapse text-[12px]">
          <thead className="bg-slate-100 sticky top-0 z-10">
            <tr>
              <th className="p-2 border-b border-r border-slate-200 min-w-[90px] font-bold text-slate-700 bg-slate-200">
                {grid.flags.hasAdd
                  ? "SPH/CYL/AX \\ ADD"
                  : grid.flags.hasCyl
                    ? "SPH \\ CYL"
                    : "SPH"}
              </th>
              {grid.colKeys.map((ck) => (
                <th
                  key={ck}
                  className="p-2 border-b border-r border-slate-200 min-w-[64px] font-bold text-slate-700"
                >
                  {grid.cols.get(ck).label}
                </th>
              ))}
              <th className="p-2 border-b border-slate-200 min-w-[64px] font-bold text-slate-700 bg-slate-200">
                TOTAL
              </th>
            </tr>
          </thead>
          <tbody>
            {grid.rowKeys.map((rk) => (
              <tr key={rk}>
                <th className="p-2 border-b border-r border-slate-200 bg-slate-50 font-bold text-slate-700 sticky left-0 z-10">
                  {grid.rows.get(rk).label}
                </th>
                {grid.colKeys.map((ck) => {
                  const cell = grid.rows.get(rk).cellsByCol.get(ck);
                  if (!cell) {
                    return (
                      <td
                        key={ck}
                        className="p-1 border-b border-r border-slate-200 bg-amber-50/70 text-center text-amber-500/70 text-[10px] select-none font-mono"
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
                    />
                  );
                })}
                <td className="p-1 border-b border-slate-100 bg-slate-50 font-bold text-slate-700">
                  {rowTotals[rk] || 0}
                </td>
              </tr>
            ))}
            <tr>
              <th className="p-2 border-r border-slate-200 bg-slate-200 font-bold text-slate-700 sticky left-0">
                TOTAL
              </th>
              {grid.colKeys.map((ck) => (
                <td
                  key={ck}
                  className="p-1 border-r border-slate-200 bg-slate-200 font-bold text-slate-700"
                >
                  {colTotals[ck] || 0}
                </td>
              ))}
              <td className="p-1 bg-slate-300 font-bold text-slate-900">{grandTotal}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Visual Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-3 text-[11px] text-slate-500 px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 bg-white border border-slate-300 rounded-sm inline-block" />
          Valid Stock Cell
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-3.5 bg-slate-100 border border-slate-300 rounded-sm inline-flex items-center justify-center text-[8px] font-bold text-slate-400">
            N/A
          </span>
          Not Available (No Stock / Location)
        </span>
        {matrixTypeInfo?.isCross && (
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-amber-100 border border-amber-300 rounded-sm inline-block" />
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
  return {
    sph: { min: formatPower(minS), max: formatPower(maxS), step: "0.25" },
    cylBlocks: [{ min: formatPower(minC), max: formatPower(maxC), step: "0.25", axis: "" }],
    add: { min: "+1.00", max: "+3.00", step: "0.25" },
  };
}
