import { useState, useEffect, useRef, useMemo } from "react";
import { RefreshCw, AlertTriangle, Loader2, X, Lock, Package, Search, ArrowLeft, ArrowRight, CheckCircle2, Calculator, Plus, Minus, Layers } from "lucide-react";
import { inventoryApi } from "../../services/inventoryApi";
import { productApi, warehouseApi, brandApi } from "../../services/productApi";
import { PowerInput } from "@/components/common/PowerInput";
import { LocationPicker, ShelfLocationPicker } from "@/components/common/LocationPicker";
import { notify } from "@/lib/notify";
import { hasPermission } from "@/lib/permissions";
import { formatCartonBreakdown, formatCartonFull, toPieces, PIECES_PER_CARTON, PIECES_PER_DIBBA } from "@/lib/utils";
import { buildGridFromCells, cellKey, formatPower } from "../products/matrixHelpers";
import "@/styles/veriwide.css";

const GODOWN_LABEL = { running_stock: "Running Stock", reserve_godown_1: "Reserve (Godown 1)", godown_2_offsite: "Godown 2 (Off-site)" };

function powerLabel(p) {
  const parts = [`SPH ${p.sph}`];
  if (p.cyl !== null && p.cyl !== undefined) parts.push(`CYL ${p.cyl}`);
  if (p.axis) parts.push(`X${p.axis}`);
  if (p.add) parts.push(`ADD +${p.add}`);
  return parts.join(" ");
}

function ProductPicker({ value, onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const wrapperRef = useRef(null);

  // No query yet -> browse the active product list directly (nobody remembers SKUs).
  // Once the user types, it narrows down via the same search the rest of the app uses.
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await productApi.getProducts(query ? { search: query, size: 20 } : { size: 20 });
        if (res.error === false) setResults(res.data.list || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    }, query ? 300 : 0);
    return () => clearTimeout(timer.current);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        value={value ? `${value.brand} — ${value.product_code}` : query}
        onChange={e => { setQuery(e.target.value); onSelect(null); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Click to browse active products, or search by brand / SKU..."
        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500"
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-4 text-center text-[12px] text-slate-400">Loading...</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-4 text-center text-[12px] text-slate-400">No active products found.</div>
          ) : results.map(p => (
            <button key={p._id} type="button" onClick={() => { onSelect(p); setQuery(""); setOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-[13px] border-b border-slate-50 last:border-0">
              <div className="font-bold text-slate-800">{p.brand} <span className="text-slate-400 font-normal">{p.product_code}</span></div>
              <div className="text-[11px] text-slate-500">{p.lens_type} · SPH {p.min_sph} to {p.max_sph}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LowStockAlertsTab({ racks }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refillTarget, setRefillTarget] = useState(null);
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [qty, setQty] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const canManage = hasPermission("MANAGE_INVENTORY");

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getLowStockAlerts();
      setAlerts(res.error === false ? res.data : []);
    } catch (e) { console.error(e); setAlerts([]); }
    setLoading(false);
  };

  useEffect(() => { fetchAlerts(); }, []);

  const openRefill = (alert) => {
    setRefillTarget(alert);
    const firstReserveLoc = alert.reserve_locations[0]?.warehouse_location_id;
    setFromLocationId(firstReserveLoc?._id || firstReserveLoc || "");
    setToLocationId("");
    setQty("");
  };

  const handleRefillSubmit = async (e) => {
    e.preventDefault();
    if (!fromLocationId || !toLocationId || !qty) return notify.warning("Fill all fields.");
    setIsSaving(true);
    try {
      const res = await inventoryApi.refillStock({
        productId: refillTarget.product_id,
        power: { sph: refillTarget.sph, cyl: refillTarget.cyl, axis: refillTarget.axis, add: refillTarget.add },
        quantity: parseInt(qty),
        from_location_id: fromLocationId,
        to_location_id: toLocationId
      });
      if (res.error === false) {
        notify.success("Running stock refilled from Reserve.");
        setRefillTarget(null);
        fetchAlerts();
      } else {
        notify.error(res.message || "Refill failed");
      }
    } catch (err) {
      notify.error("Error refilling stock");
    }
    setIsSaving(false);
  };

  if (loading) return <div className="vw-card p-10 text-center text-slate-500 text-[13px] flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading alerts...</div>;

  return (
    <>
      <div className="vw-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-[14px] flex items-center gap-2"><AlertTriangle size={16} className="text-amber-500" /> {alerts.length} power{alerts.length !== 1 ? "s" : ""} at or below threshold</h3>
          <button onClick={fetchAlerts} className="text-[12px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"><RefreshCw size={13} /> Refresh</button>
        </div>
        {alerts.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-[13px]">Nothing low right now.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-3 border-b border-slate-100">Brand / SKU</th>
                  <th className="p-3 border-b border-slate-100">Power</th>
                  <th className="p-3 border-b border-slate-100">Running</th>
                  <th className="p-3 border-b border-slate-100">Threshold</th>
                  <th className="p-3 border-b border-slate-100">Reserve Available</th>
                  <th className="p-3 border-b border-slate-100"></th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-3 border-b border-slate-100">
                      <div className="font-bold text-slate-800">{a.brand}</div>
                      <div className="text-[11px] text-slate-500">{a.product_code}</div>
                    </td>
                    <td className="p-3 border-b border-slate-100 font-mono">{powerLabel(a)}</td>
                    <td className="p-3 border-b border-slate-100">
                      <span className={`font-bold ${a.running_quantity === 0 ? "text-rose-500" : "text-amber-600"}`}>{a.running_quantity}</span>
                    </td>
                    <td className="p-3 border-b border-slate-100 text-slate-500">{a.threshold}</td>
                    <td className="p-3 border-b border-slate-100">
                      {a.reserve_quantity > 0 ? (
                        <div>
                          <span className="font-bold text-emerald-700">{a.reserve_quantity} pcs</span>
                          <div className="text-[11px] font-semibold text-emerald-600">{formatCartonBreakdown(a.reserve_quantity)}</div>
                        </div>
                      ) : (
                        <span className="font-bold text-slate-400">0</span>
                      )}
                    </td>
                    <td className="p-3 border-b border-slate-100 text-right">
                      {canManage && (
                        <button
                          onClick={() => openRefill(a)}
                          disabled={a.reserve_quantity === 0}
                          className="vw-btn-primary h-8 px-3 text-[12px] disabled:opacity-40 disabled:cursor-not-allowed"
                          title={a.reserve_quantity === 0 ? "No reserve stock to pull from" : "Refill running stock"}
                        >
                          Refill
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {refillTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-[15px]">Refill — {refillTarget.brand} {refillTarget.product_code}</h3>
              <button onClick={() => setRefillTarget(null)} className="text-slate-400 hover:text-slate-600 p-1"><X size={16} /></button>
            </div>
            <form onSubmit={handleRefillSubmit} className="p-6 space-y-4">
              <p className="text-[12px] text-slate-500 font-mono">{powerLabel(refillTarget)}</p>
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">From (Reserve box)</label>
                <select value={fromLocationId} onChange={e => setFromLocationId(e.target.value)} required className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500">
                  <option value="">-- Choose box --</option>
                  {refillTarget.reserve_locations.map(l => {
                    const loc = l.warehouse_location_id;
                    const id = loc?._id || loc;
                    return <option key={id} value={id}>{loc?.location_code || id} ({l.quantity} available)</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">To (Running stock box)</label>
                <LocationPicker racks={racks} onChange={(id) => setToLocationId(id)} />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Quantity</label>
                <input type="number" min="1" max={refillTarget.reserve_quantity} value={qty} onChange={e => setQty(e.target.value)} required className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setRefillTarget(null)} className="flex-1 vw-btn-secondary h-10">Cancel</button>
                <button type="submit" disabled={isSaving} className="flex-1 vw-btn-primary h-10 disabled:opacity-50">{isSaving ? "Refilling..." : "Confirm Refill"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// -----------------------------------------------------------------------------
// CARTON & DIBBA COUNTER MODAL (For non-technical staff & students)
// 1 Carton = 20 Dibbe = 300 Pcs | 1 Dibba = 15 Pcs
// -----------------------------------------------------------------------------
function CartonCounterModal({ cell, initialValue = 0, onApply, onClose }) {
  const initialCartons = Math.floor((initialValue || 0) / PIECES_PER_CARTON);
  const rem = (initialValue || 0) % PIECES_PER_CARTON;
  const initialDibbe = Math.floor(rem / PIECES_PER_DIBBA);
  const initialLoose = rem % PIECES_PER_DIBBA;

  const [cartons, setCartons] = useState(initialCartons);
  const [dibbe, setDibbe] = useState(initialDibbe);
  const [loose, setLoose] = useState(initialLoose);

  const totalPieces = toPieces({ cartons, dibbe, loose });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200">
        <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
          <div>
            <h3 className="font-bold text-[15px] flex items-center gap-2">
              <Calculator size={17} /> Carton & Dibba Calculator
            </h3>
            <p className="text-[11px] text-blue-100 font-mono mt-0.5">
              Power: SPH {formatPower(cell.sph)} {cell.cyl !== null && cell.cyl !== undefined ? `CYL ${formatPower(cell.cyl)}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2.5">
            {/* Cartons (Cartaz) */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <div className="font-bold text-[13px] text-slate-800">Carton (Cartaz)</div>
                <div className="text-[11px] text-slate-500 font-medium">1 Carton = 20 Dibbe = 300 pcs</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCartons(c => Math.max(0, c - 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center active:scale-95"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  min="0"
                  value={cartons}
                  onChange={e => setCartons(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-12 h-8 text-center font-bold text-[14px] bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setCartons(c => c + 1)}
                  className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 flex items-center justify-center active:scale-95"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Dibbe */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <div className="font-bold text-[13px] text-slate-800">Dibba (Box)</div>
                <div className="text-[11px] text-slate-500 font-medium">1 Dibba = 15 pcs</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDibbe(d => Math.max(0, d - 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center active:scale-95"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  min="0"
                  value={dibbe}
                  onChange={e => setDibbe(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-12 h-8 text-center font-bold text-[14px] bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setDibbe(d => d + 1)}
                  className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 flex items-center justify-center active:scale-95"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Loose Pieces */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <div className="font-bold text-[13px] text-slate-800">Loose Pieces</div>
                <div className="text-[11px] text-slate-500 font-medium">Individual pieces (1 pc)</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setLoose(l => Math.max(0, l - 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center active:scale-95"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  min="0"
                  value={loose}
                  onChange={e => setLoose(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-12 h-8 text-center font-bold text-[14px] bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setLoose(l => l + 1)}
                  className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 flex items-center justify-center active:scale-95"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setDibbe(d => d + 1)}
              className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium"
            >
              +1 Dibba (15)
            </button>
            <button
              type="button"
              onClick={() => setDibbe(d => d + 2)}
              className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium"
            >
              +2 Dibbe (30)
            </button>
            <button
              type="button"
              onClick={() => setCartons(c => c + 1)}
              className="text-[11px] px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md font-medium"
            >
              +1 Carton (300)
            </button>
            <button
              type="button"
              onClick={() => { setCartons(0); setDibbe(0); setLoose(0); }}
              className="text-[11px] px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md font-medium ml-auto"
            >
              Clear
            </button>
          </div>

          {/* Real-time Calculation */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
            <div className="text-[11px] uppercase tracking-wider font-bold text-emerald-700">Total Calculated Stock</div>
            <div className="text-2xl font-black text-emerald-900 mt-0.5">{totalPieces} Pieces</div>
            <div className="text-[12px] font-semibold text-emerald-700 mt-0.5">{formatCartonFull(totalPieces)}</div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 vw-btn-secondary h-10">Cancel</button>
            <button
              type="button"
              onClick={() => { onApply(totalPieces); onClose(); }}
              className="flex-1 vw-btn-primary h-10"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// RECEIVE PRODUCT MATRIX MODAL
// Opens the power matrix grid with Floor/Rack/Shelf assignment and Carton/Piece modes
// -----------------------------------------------------------------------------
function ReceiveProductMatrixModal({ product, racks, onClose }) {
  const [cells, setCells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationId, setLocationId] = useState("");
  const [mode, setMode] = useState("carton"); // "carton" | "piece"
  const [inputs, setInputs] = useState({}); // { [cellKey]: pieces }
  const [cartonModalCell, setCartonModalCell] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchMatrix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product._id]);

  const fetchMatrix = async () => {
    setLoading(true);
    try {
      const res = await productApi.updateMatrix({ productId: product._id, godownId: "reserve_godown_1" });
      if (res.error === false && res.data) {
        let cList = res.data.power_cells || [];
        if (cList.length === 0) {
          // If reserve matrix has no cells yet, get power structure from running stock or generate
          const runningRes = await productApi.updateMatrix({ productId: product._id, godownId: "running_stock" });
          if (runningRes.error === false && runningRes.data?.power_cells?.length > 0) {
            cList = runningRes.data.power_cells.map(c => ({
              ...c,
              total_quantity: 0,
              locations: []
            }));
          } else {
            const genRes = await productApi.generateMatrix({ productId: product._id, godownId: "reserve_godown_1" });
            if (genRes.error === false && genRes.data?.power_cells) {
              cList = genRes.data.power_cells;
            }
          }
        }
        setCells(cList);
      }
    } catch (e) {
      console.error("Failed to load reserve matrix", e);
      notify.error("Failed to load product power matrix");
    }
    setLoading(false);
  };

  const grid = useMemo(() => buildGridFromCells(cells), [cells]);

  const totalFilledCells = useMemo(() => {
    return Object.values(inputs).filter(v => Number(v) > 0).length;
  }, [inputs]);

  const totalPiecesToReceive = useMemo(() => {
    return Object.values(inputs).reduce((sum, v) => sum + (Number(v) || 0), 0);
  }, [inputs]);

  const handlePieceChange = (key, val) => {
    const num = Math.max(0, parseInt(val) || 0);
    setInputs(prev => ({ ...prev, [key]: num }));
  };

  const handleCartonApply = (key, qty) => {
    setInputs(prev => ({ ...prev, [key]: qty }));
  };

  const handleSave = async () => {
    if (!locationId) {
      return notify.warning("Pehle Floor, Rack aur Shelf Location select karein.");
    }
    if (totalPiecesToReceive === 0) {
      return notify.warning("Kam se kam ek power cell me quantity enter karein.");
    }

    const items = [];
    cells.forEach(cell => {
      const key = cellKey(cell);
      const qty = Number(inputs[key]) || 0;
      if (qty > 0) {
        items.push({
          power: {
            sph: cell.sph,
            cyl: cell.cyl ?? null,
            axis: cell.axis ?? null,
            add: cell.add ?? null
          },
          quantity: qty
        });
      }
    });

    if (items.length === 0) {
      return notify.warning("No quantities to receive.");
    }

    setIsSaving(true);
    try {
      const res = await inventoryApi.bulkReceiveStock({
        productId: product._id,
        location_id: locationId,
        items
      });
      if (res.error === false) {
        notify.success(`${totalPiecesToReceive} pieces (${formatCartonBreakdown(totalPiecesToReceive)}) Reserve Godown me receive ho gaye!`);
        setInputs({});
        fetchMatrix();
      } else {
        notify.error(res.message || "Failed to receive stock into Reserve");
      }
    } catch (err) {
      console.error(err);
      notify.error("Server error receiving stock");
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 bg-white hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-600 transition-colors"
              title="Back to products"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 text-lg">{product.brand}</span>
                <span className="text-slate-400 font-mono text-sm">{product.product_code}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 uppercase">
                  {product.lens_type}
                </span>
              </div>
              <p className="text-[12px] text-slate-500 mt-0.5">
                Range: SPH {product.min_sph} to {product.max_sph} · CYL {product.min_cyl} to {product.max_cyl} · Index {product.index}
              </p>
            </div>
          </div>

          {/* Quick packaging reminder badge */}
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3.5 py-2 text-[12px] font-semibold text-indigo-900">
            <Package size={16} className="text-indigo-600 shrink-0" />
            <span>1 Carton = 20 Dibbe = 300 Pcs | 1 Dibba = 15 Pcs</span>
          </div>
        </div>

        {/* Location Picker & Mode Selector Bar */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-white grid grid-cols-1 lg:grid-cols-12 gap-4 items-center shrink-0">
          <div className="lg:col-span-8">
            <div className="text-[11px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1.5">
              <Layers size={13} className="text-blue-600" />
              <span>Select Storage Shelf (Floor ➔ Rack ➔ Start-End Shelf)</span>
            </div>
            <ShelfLocationPicker racks={racks} onChange={(id) => setLocationId(id)} />
          </div>

          <div className="lg:col-span-4 flex flex-col items-start lg:items-end justify-center">
            <div className="text-[11px] uppercase font-bold text-slate-500 mb-1">
              Select Fill Mode
            </div>
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setMode("carton")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                  mode === "carton" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Package size={14} /> Carton / Dibba Mode
              </button>
              <button
                type="button"
                onClick={() => setMode("piece")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                  mode === "piece" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Calculator size={14} /> Piece Mode (Pcs)
              </button>
            </div>
          </div>
        </div>

        {/* Matrix Grid Area */}
        <div className="p-6 overflow-auto flex-1 bg-slate-50/50">
          {loading ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center gap-2">
              <Loader2 size={24} className="animate-spin text-blue-600" />
              <span>Loading power matrix grid...</span>
            </div>
          ) : cells.length === 0 ? (
            <div className="p-16 text-center text-slate-400">
              No power cells available for this product.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
              <table className="w-full text-center border-collapse text-[12px]">
                <thead className="bg-slate-100 sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 border-r border-slate-200 min-w-[84px] font-bold text-slate-700 bg-slate-200">
                      SPH \ CYL
                    </th>
                    {grid.colKeys.map(ck => (
                      <th key={ck} className="p-2.5 border-r border-slate-200 min-w-[110px] font-bold text-slate-700">
                        {grid.cols.get(ck).label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.rowKeys.map(rk => (
                    <tr key={rk} className="hover:bg-slate-50/50">
                      <th className="p-2.5 border-b border-r border-slate-200 bg-slate-100 font-bold text-slate-800 sticky left-0 z-10">
                        {grid.rows.get(rk).label}
                      </th>
                      {grid.colKeys.map(ck => {
                        const cell = grid.rows.get(rk).cellsByCol.get(ck);
                        if (!cell) {
                          return (
                            <td key={ck} className="p-1 border-b border-r border-slate-200 bg-slate-50/50 text-slate-300">
                              —
                            </td>
                          );
                        }
                        const key = cellKey(cell);
                        const currentStock = cell.total_quantity || 0;
                        const enteredQty = inputs[key] || 0;

                        return (
                          <td
                            key={ck}
                            className={`p-2 border-b border-r border-slate-200 align-top transition-colors ${
                              enteredQty > 0 ? "bg-blue-50/70" : ""
                            }`}
                          >
                            {/* Current Reserve Stock (Piece-wise & Carton-wise) */}
                            <div className="text-[11px] text-slate-500 font-medium leading-tight mb-1.5">
                              <span className="text-slate-400 text-[10px]">Reserve:</span>{" "}
                              <span className="font-bold text-slate-700">{currentStock} pcs</span>
                              {currentStock > 0 && (
                                <div className="text-[10px] text-emerald-600 font-bold">
                                  {formatCartonBreakdown(currentStock)}
                                </div>
                              )}
                            </div>

                            {/* Mode input */}
                            {mode === "piece" ? (
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={inputs[key] ?? ""}
                                onChange={e => handlePieceChange(key, e.target.value)}
                                className={`w-full h-8 px-2 text-center font-bold text-[13px] border rounded-lg focus:outline-none focus:border-blue-500 ${
                                  enteredQty > 0
                                    ? "border-blue-500 bg-white text-blue-700"
                                    : "border-slate-200 bg-white"
                                }`}
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => setCartonModalCell({ ...cell, key })}
                                className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                                  enteredQty > 0
                                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                    : "bg-white hover:bg-slate-100 text-slate-600 border-slate-200 border-dashed"
                                }`}
                              >
                                {enteredQty > 0 ? (
                                  <>
                                    <span className="text-[12px]">+{enteredQty} pcs</span>
                                    <span className="text-[9px] font-medium opacity-90">{formatCartonBreakdown(enteredQty)}</span>
                                  </>
                                ) : (
                                  <span>+ Fill Cartons</span>
                                )}
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sticky Bottom Action Bar */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-lg">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[11px] text-slate-500 uppercase font-bold">Filled Powers</div>
              <div className="text-base font-bold text-slate-800">{totalFilledCells} cells</div>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <div className="text-[11px] text-slate-500 uppercase font-bold">Total Stock to Receive</div>
              <div className="text-lg font-black text-emerald-700">
                {totalPiecesToReceive} Pieces
                {totalPiecesToReceive > 0 && (
                  <span className="text-[12px] font-semibold text-emerald-600 ml-2">
                    ({formatCartonBreakdown(totalPiecesToReceive)})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="vw-btn-secondary h-10 px-4 text-[13px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !locationId || totalPiecesToReceive === 0}
              className="vw-btn-primary h-10 px-5 text-[13px] flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving into Reserve...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} /> Receive Stock into Reserve
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Carton Counter Modal Popup */}
      {cartonModalCell && (
        <CartonCounterModal
          cell={cartonModalCell}
          initialValue={inputs[cartonModalCell.key] || 0}
          onApply={(qty) => handleCartonApply(cartonModalCell.key, qty)}
          onClose={() => setCartonModalCell(null)}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// RECEIVE STOCK TAB (3-Level Drill-Down: Brands ➔ Products ➔ Matrix)
// -----------------------------------------------------------------------------
function ReceiveStockTab({ racks }) {
  const [brands, setBrands] = useState([]);
  const [brandSearch, setBrandSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const canManage = hasPermission("MANAGE_INVENTORY");

  // Load brands on mount
  useEffect(() => {
    (async () => {
      setLoadingBrands(true);
      try {
        const res = await brandApi.getBrands();
        if (res.error === false && Array.isArray(res.data)) {
          setBrands(res.data);
        }
      } catch (err) {
        console.error("Failed to load brands", err);
      }
      setLoadingBrands(false);
    })();
  }, []);

  // Load products when a specific brand is selected or productSearch changes
  useEffect(() => {
    if (!selectedBrand) {
      setProducts([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingProducts(true);
      try {
        const payload = { brand: selectedBrand, size: 100 };
        if (productSearch) payload.search = productSearch;
        const res = await productApi.getProducts(payload);
        if (res.error === false && res.data?.list) {
          setProducts(res.data.list);
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.error("Failed to load products for brand", err);
        setProducts([]);
      }
      setLoadingProducts(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [selectedBrand, productSearch]);

  if (!canManage) {
    return (
      <div className="vw-card p-10 text-center text-slate-500 text-[13px] flex flex-col items-center gap-2">
        <Lock size={18} className="text-slate-300" /> You don't have permission to receive stock.
      </div>
    );
  }

  // Filtered brands for Level 1
  const filteredBrands = brands.filter(b =>
    !brandSearch || b.name.toLowerCase().includes(brandSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* =====================================================================
          LEVEL 1: SHOW ONLY BRANDS
          ===================================================================== */}
      {!selectedBrand ? (
        <div className="space-y-5">
          {/* Header & Brand Search */}
          <div className="vw-card p-5">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <Package size={20} className="text-blue-600" /> Select Brand to Receive Stock
                </h3>
                <p className="text-[13px] text-slate-500 mt-0.5">
                  Step 1: Pehle Brand choose karein. Brand open karne par uske saare products aur matrix show honge.
                </p>
              </div>

              {/* Search Brand */}
              <div className="relative w-full sm:w-72">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={brandSearch}
                  onChange={e => setBrandSearch(e.target.value)}
                  placeholder="Search brand name..."
                  className="w-full h-10 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500"
                />
                {brandSearch && (
                  <button
                    onClick={() => setBrandSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Brands Grid (Visual Cards) */}
          {loadingBrands ? (
            <div className="vw-card p-16 text-center text-slate-400 flex flex-col items-center gap-2">
              <Loader2 size={24} className="animate-spin text-blue-600" />
              <span>Loading brands...</span>
            </div>
          ) : filteredBrands.length === 0 ? (
            <div className="vw-card p-16 text-center text-slate-400">
              No brands found matching "{brandSearch}".
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredBrands.map(b => {
                const initials = (b.name || "B").slice(0, 2).toUpperCase();
                return (
                  <div
                    key={b._id || b.name}
                    onClick={() => {
                      setSelectedBrand(b.name);
                      setProductSearch("");
                    }}
                    role="button"
                    tabIndex={0}
                    className="vw-card p-5 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between gap-4 group bg-white border border-slate-200 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      {b.image ? (
                        <img
                          src={b.image}
                          alt={b.name}
                          className="w-12 h-12 object-contain rounded-xl bg-slate-50 border border-slate-100 p-1 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors truncate">
                          {b.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {b.description || "Lens Brand"}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[12px] font-bold text-blue-600 group-hover:text-blue-700">
                      <span>Browse Products</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* =====================================================================
           LEVEL 2: SHOW PRODUCTS OF SELECTED BRAND
           ===================================================================== */
        <div className="space-y-5">
          {/* Brand Header & Back Button */}
          <div className="vw-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBrand("");
                    setProductSearch("");
                  }}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors flex items-center gap-1.5 text-[12px] font-bold shrink-0"
                >
                  <ArrowLeft size={16} /> All Brands
                </button>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                    <span className="text-blue-600 font-black">{selectedBrand}</span> — Products
                  </h3>
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    Step 2: Kisi bhi product par click karke uski Power Matrix open karein.
                  </p>
                </div>
              </div>

              {/* Product Search inside Brand */}
              <div className="relative w-full sm:w-72">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder={`Search ${selectedBrand} products...`}
                  className="w-full h-10 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500"
                />
                {productSearch && (
                  <button
                    onClick={() => setProductSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {loadingProducts ? (
            <div className="vw-card p-16 text-center text-slate-400 flex flex-col items-center gap-2">
              <Loader2 size={24} className="animate-spin text-blue-600" />
              <span>Loading products for {selectedBrand}...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="vw-card p-16 text-center text-slate-400">
              No products found for {selectedBrand} {productSearch ? `matching "${productSearch}"` : ""}.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(p => (
                <div
                  key={p._id}
                  className="vw-card p-5 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between gap-4 group bg-white border border-slate-200 rounded-xl"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-black text-slate-900 text-[13px] px-2 py-0.5 bg-slate-100 rounded-md">
                        {p.brand}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 uppercase">
                        {p.lens_type}
                      </span>
                    </div>

                    <div className="font-bold text-slate-800 text-[15px] group-hover:text-blue-600 transition-colors">
                      {p.product_code}
                    </div>

                    <div className="text-[12px] text-slate-500 mt-1 flex flex-wrap gap-2">
                      <span>Index: <b>{p.index}</b></span>
                      <span>·</span>
                      <span>Base: <b>{p.base}</b></span>
                      <span>·</span>
                      <span>Coating: <b>{p.coating}</b></span>
                    </div>

                    <div className="mt-3 inline-block bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-600">
                      SPH: {p.min_sph} to {p.max_sph} · CYL: {p.min_cyl} to {p.max_cyl}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedProduct(p)}
                    className="w-full h-10 vw-btn-primary flex items-center justify-center gap-2 text-[13px]"
                  >
                    <Package size={16} /> Open Matrix & Receive Stock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          LEVEL 3: PRODUCT POWER MATRIX MODAL
          ===================================================================== */}
      {selectedProduct && (
        <ReceiveProductMatrixModal
          product={selectedProduct}
          racks={racks}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}

function StockCountTab({ racks }) {
  const [product, setProduct] = useState(null);
  const [godownId, setGodownId] = useState("running_stock");
  const [cells, setCells] = useState([]);
  const [loadingCells, setLoadingCells] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [locationId, setLocationId] = useState("");
  const [pickerKey, setPickerKey] = useState(0);
  const [isFrozen, setIsFrozen] = useState(false);
  const [countedQty, setCountedQty] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const canManage = hasPermission("MANAGE_INVENTORY");

  // Only let the user pick from power cells that actually exist for this product/godown —
  // freezing or counting a power that was never stocked here throws "Power cell not found."
  useEffect(() => {
    setSelectedCell(null);
    setIsFrozen(false);
    if (!product) { setCells([]); return; }
    setLoadingCells(true);
    productApi.updateMatrix({ productId: product._id, godownId })
      .then(res => setCells(res.error === false ? (res.data?.power_cells || []) : []))
      .catch(() => setCells([]))
      .finally(() => setLoadingCells(false));
  }, [product, godownId]);

  const buildPower = () => ({
    sph: selectedCell.sph,
    cyl: selectedCell.cyl ?? null,
    axis: selectedCell.axis ?? null,
    add: selectedCell.add ?? null
  });

  const handleFreeze = async () => {
    if (!product) return notify.warning("Select a product.");
    if (!selectedCell) return notify.warning("Select a power to count.");
    setIsSaving(true);
    try {
      const res = await inventoryApi.freezeForCount({ productId: product._id, godownId, power: buildPower() });
      if (res.error === false) {
        notify.success("Cell frozen — it can't be picked for orders until this count is submitted.");
        setIsFrozen(true);
      } else {
        notify.error(res.message || "Failed to freeze cell");
      }
    } catch (err) {
      notify.error("Error freezing cell");
    }
    setIsSaving(false);
  };

  const submitCount = async (force = false) => {
    if (!locationId || countedQty === "") return notify.warning("Fill all fields.");
    setIsSaving(true);
    try {
      const res = await inventoryApi.submitCount({
        productId: product._id,
        godownId,
        power: buildPower(),
        location_id: locationId,
        counted_quantity: parseInt(countedQty),
        force
      });
      if (res.error === false) {
        if (res.data.requiresConfirmation) {
          setPendingConfirm(res.data);
        } else {
          notify.success(`Count applied: ${res.data.previousQuantity} → ${res.data.countedQuantity}.`);
          setPendingConfirm(null);
          setIsFrozen(false);
          setCountedQty("");
          setLocationId("");
          setPickerKey(k => k + 1);
        }
      } else {
        notify.error(res.message || "Failed to submit count");
      }
    } catch (err) {
      notify.error("Error submitting count");
    }
    setIsSaving(false);
  };

  if (!canManage) {
    return <div className="vw-card p-10 text-center text-slate-500 text-[13px] flex flex-col items-center gap-2"><Lock size={18} className="text-slate-300" /> You don't have permission to run stock counts.</div>;
  }

  return (
    <div className="vw-card p-5 max-w-xl">
      <p className="text-[12px] text-slate-500 mb-5 leading-relaxed">
        Freeze a box before physically counting it — frozen stock can't be picked for orders. Submit the real counted quantity; if it's higher than expected, that's flagged as an anomaly and needs confirmation.
      </p>
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Product</label>
          <ProductPicker value={product} onSelect={(p) => { setProduct(p); setIsFrozen(false); }} />
        </div>
        <div>
          <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Godown</label>
          <select value={godownId} onChange={e => { setGodownId(e.target.value); setIsFrozen(false); }} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500">
            {Object.entries(GODOWN_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        {product && (
          <div>
            <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Power (pick what's actually stocked here)</label>
            {loadingCells ? (
              <div className="text-[12px] text-slate-400 py-2">Loading powers...</div>
            ) : cells.length === 0 ? (
              <div className="text-[12px] text-rose-500 py-2">Nothing stocked for this product in {GODOWN_LABEL[godownId]} yet.</div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto border border-slate-200 rounded-lg p-2">
                {cells.map((c, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => { setSelectedCell(c); setIsFrozen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-[13px] border transition-colors flex items-center justify-between ${selectedCell === c ? "bg-blue-50 border-blue-400" : "border-transparent hover:bg-slate-50"}`}
                  >
                    <span className="font-mono font-semibold text-slate-800">{powerLabel(c)}</span>
                    <span className="text-[11px] text-slate-500">Current: <span className="font-bold text-slate-700">{c.total_quantity}</span></span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div>
          <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Box Location</label>
          <LocationPicker key={pickerKey} racks={racks} onChange={(id) => setLocationId(id)} />
        </div>

        {!isFrozen ? (
          <button onClick={handleFreeze} disabled={isSaving || !selectedCell} className="vw-btn-secondary h-10 font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2">
            <Lock size={14} /> {isSaving ? "Freezing..." : "Freeze for Count"}
          </button>
        ) : (
          <div className="border-t border-slate-200 pt-4 flex flex-col gap-3">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[12px] p-2.5 rounded flex items-center gap-2">
              <Lock size={14} /> Frozen — not pickable for orders until submitted.
            </div>
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Counted Quantity</label>
              <input type="number" min="0" value={countedQty} onChange={e => setCountedQty(e.target.value)} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500" />
            </div>
            <button onClick={() => submitCount(false)} disabled={isSaving} className="vw-btn-primary h-10 disabled:opacity-50">{isSaving ? "Submitting..." : "Submit Count"}</button>
          </div>
        )}
      </div>

      {pendingConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-rose-50 flex items-center gap-2">
              <AlertTriangle size={18} className="text-rose-500" />
              <h3 className="font-bold text-rose-800 text-[15px]">Anomaly: More stock than expected</h3>
            </div>
            <div className="p-6 text-[13px] text-slate-700 space-y-2">
              <p>Expected <span className="font-bold">{pendingConfirm.previousQuantity}</span>, but <span className="font-bold">{pendingConfirm.countedQuantity}</span> was counted (<span className="font-bold text-rose-600">+{pendingConfirm.delta}</span>).</p>
              <p className="text-slate-500">This is flagged for investigation per policy — confirm only if the extra stock is genuinely verified.</p>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setPendingConfirm(null)} className="px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
              <button onClick={() => submitCount(true)} disabled={isSaving} className="px-4 py-2 text-[13px] font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-50">
                {isSaving ? "Confirming..." : "Confirm Anyway"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Replenishment() {
  const [tab, setTab] = useState("alerts");
  const [racks, setRacks] = useState([]);

  useEffect(() => {
    // Lightweight rack summary (~50 rows), never the full box-level location list —
    // every box picker on this page resolves its exact location from floor/rack/shelf/box.
    warehouseApi.getRackSummary().then(res => { if (res.error === false) setRacks(res.data); }).catch(e => console.error(e));
  }, []);

  return (
    <>
      <div className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><RefreshCw className="text-blue-600" size={22} /> Reserve Stock (Replenishment)</h1>
        <p className="text-[13px] text-slate-500 mt-1">Low stock alerts, receiving into Reserve, refilling Running stock, and physical stock counts.</p>
      </div>

      <div className="flex border-b border-slate-200 mb-6 gap-6">
        {[["alerts", "Low Stock Alerts"], ["receive", "Receive Stock"], ["count", "Stock Count"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`pb-3 text-[13px] font-bold border-b-2 -mb-px transition-colors ${tab === k ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === "alerts" && <LowStockAlertsTab racks={racks} />}
      {tab === "receive" && <ReceiveStockTab racks={racks} />}
      {tab === "count" && <StockCountTab racks={racks} />}
    </>
  );
}
