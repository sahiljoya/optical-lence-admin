import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Grid, Package, Plus, Trash2, RefreshCw, Save, X, MapPin } from "lucide-react";
import { productApi } from "../../services/productApi";
import { notify } from "@/lib/notify";
import { PowerInput } from "@/components/common/PowerInput";
import { LocationPicker } from "@/components/common/LocationPicker";
import { buildGridFromCells, cellKey, formatPower } from "./matrixHelpers";

// A full-size picker in a popup is much easier to use than four tiny dropdowns squeezed into
// a table cell — this opens on demand instead of living inline in the grid.
function LocationOverrideModal({ racks, onConfirm, onClear, onClose }) {
  const [pendingId, setPendingId] = useState("");

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
            <MapPin size={14} className="text-emerald-600" /> Set Box for This Cell
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">
          <LocationPicker racks={racks} onChange={(id) => setPendingId(id)} />
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col gap-2">
          <button
            onClick={() => pendingId && onConfirm(pendingId)}
            disabled={!pendingId}
            className="vw-btn-primary h-9 text-[13px] disabled:opacity-50"
          >
            Use This Box
          </button>
          <button
            onClick={onClear}
            className="h-9 text-[12px] font-bold text-slate-500 hover:text-rose-600"
          >
            Clear Override (use default)
          </button>
        </div>
      </div>
    </div>
  );
}

// Memoized so typing in one cell doesn't re-render every other cell in a 200+ cell grid —
// only the cell whose own qty/location prop actually changed re-renders.
const MatrixCell = memo(function MatrixCell({
  cellKey: key,
  qty,
  hasOverride,
  racks,
  onQtyChange,
  onLocChange,
}) {
  const [showModal, setShowModal] = useState(false);
  return (
    <td className="p-1 border-b border-r border-slate-100 hover:bg-emerald-50 transition-colors align-top">
      <input
        type="number"
        min="0"
        value={qty}
        onChange={(e) => onQtyChange(key, e.target.value)}
        placeholder="Qty"
        className="w-full text-center h-7 focus:outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded bg-transparent"
      />
      {parseInt(qty) > 0 && (
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className={`w-full text-[9px] mt-0.5 rounded px-0.5 py-0.5 truncate border transition-colors ${
            hasOverride
              ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
              : "bg-white border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-600"
          }`}
          title="Assign warehouse box for this power"
        >
          {hasOverride ? "✓ box set" : "set box"}
        </button>
      )}
      {showModal && (
        <LocationOverrideModal
          racks={racks}
          onConfirm={(id) => {
            onLocChange(key, id);
            setShowModal(false);
          }}
          onClear={() => {
            onLocChange(key, "");
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
  const handleLocChange = useCallback((key, value) => {
    setLocOverrideMap((prev) => ({ ...prev, [key]: value }));
  }, []);

  const primeMapsFromCells = (cells) => {
    const qm = {},
      lm = {};
    cells.forEach((c) => {
      const key = cellKey(c);
      if (c.total_quantity) qm[key] = c.total_quantity;
      if (c.locations && c.locations.length > 0) {
        const locRef = c.locations[0].warehouse_location_id;
        lm[key] = locRef && typeof locRef === "object" ? locRef._id : locRef;
      }
    });
    setQtyMap(qm);
    setLocOverrideMap(lm);
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
              axis:
                b.axis !== "" && b.axis !== null && b.axis !== undefined ? parseInt(b.axis) : null,
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
      notify.error("Error generating matrix");
    }
    setIsGenerating(false);
  };

  const handleSaveStock = async () => {
    if (!matrixDoc) return;
    setIsSavingStock(true);
    try {
      const powerCells = (matrixDoc.power_cells || []).map((c) => {
        const key = cellKey(c);
        const qty = parseInt(qtyMap[key]) || 0;
        const locId = locOverrideMap[key];
        return {
          sph: c.sph,
          cyl: c.cyl,
          axis: c.axis,
          add: c.add,
          locations: qty > 0 && locId ? [{ warehouse_location_id: locId, quantity: qty }] : [],
          status: c.status,
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
  // Rebuilding the row/col grouping + sorting is the expensive part — only redo it when the
  // underlying cell structure changes (generate/regenerate), not on every keystroke.
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
        const qty = parseInt(qtyMap[cellKey(cell)]) || 0;
        rt[rk] += qty;
        ct[ck] += qty;
        grand += qty;
      });
    });
    return { grandTotal: grand, rowTotals: rt, colTotals: ct };
  }, [grid, qtyMap]);

  return (
    <div className="vw-card p-5">
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Grid size={16} className="text-purple-600" /> POWER MATRIX
        </h3>
      </div>

      <p className="text-[12px] text-slate-500 mb-5 leading-relaxed">
        Define the SPH/CYL/AXIS{isProgressiveFamily ? "/ADD" : ""} range, generate the real matrix
        structure, then enter stock quantities and a warehouse location per cell.
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
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                      Axis (optional)
                    </label>
                    <PowerInput
                      value={b.axis}
                      onChange={(v) => updateCylBlock(idx, "axis", v)}
                      placeholder="auto"
                      step={1}
                      decimals={0}
                      signed={false}
                    />
                  </div>
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

          <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[560px] overflow-y-auto">
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
                            className="p-1 border-b border-r border-slate-100 bg-slate-100/60 text-slate-300 text-[10px]"
                          >
                            —
                          </td>
                        );
                      }
                      const key = cellKey(cell);
                      return (
                        <MatrixCell
                          key={ck}
                          cellKey={key}
                          qty={qtyMap[key] || ""}
                          hasOverride={!!locOverrideMap[key]}
                          racks={racks}
                          onQtyChange={handleQtyChange}
                          onLocChange={handleLocChange}
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
        </div>
      )}
    </div>
  );
}

export function defaultRangeConfigFromProduct(product) {
  const minS = product?.min_sph ?? -6;
  const maxS = product?.max_sph ?? 4;
  const minC = product?.min_cyl ?? -2;
  const maxC = product?.max_cyl ?? 0;
  return {
    sph: { min: formatPower(minS), max: formatPower(maxS), step: "0.25" },
    cylBlocks: [{ min: formatPower(minC), max: formatPower(maxC), step: "0.25", axis: "" }],
    add: { min: "+1.00", max: "+3.00", step: "0.25" },
  };
}
