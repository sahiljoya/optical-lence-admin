import { useState, useEffect, useRef } from "react";
import { RefreshCw, AlertTriangle, Loader2, X, Lock } from "lucide-react";
import { inventoryApi } from "../../services/inventoryApi";
import { productApi, warehouseApi } from "../../services/productApi";
import { PowerInput } from "@/components/common/PowerInput";
import { notify } from "@/lib/notify";
import { hasPermission } from "@/lib/permissions";
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
  const [open, setOpen] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!query) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await productApi.getProducts({ search: query, size: 10 });
        if (res.error === false) setResults(res.data.list || []);
      } catch (e) { console.error(e); }
    }, 300);
    return () => clearTimeout(timer.current);
  }, [query]);

  return (
    <div className="relative">
      <input
        type="text"
        value={value ? `${value.brand} — ${value.product_code}` : query}
        onChange={e => { setQuery(e.target.value); onSelect(null); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search by brand or SKU..."
        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500"
      />
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {results.map(p => (
            <button key={p._id} type="button" onClick={() => { onSelect(p); setQuery(""); setResults([]); setOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-[13px] border-b border-slate-50 last:border-0">
              <div className="font-bold text-slate-800">{p.brand} <span className="text-slate-400 font-normal">{p.product_code}</span></div>
              <div className="text-[11px] text-slate-500">{p.lens_type} · SPH {p.min_sph} to {p.max_sph}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LowStockAlertsTab() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refillTarget, setRefillTarget] = useState(null);
  const [locations, setLocations] = useState([]);
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

  useEffect(() => {
    fetchAlerts();
    warehouseApi.getLocations({}).then(res => { if (res.error === false) setLocations(res.data); }).catch(e => console.error(e));
  }, []);

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
                      <span className={`font-bold ${a.reserve_quantity > 0 ? "text-emerald-600" : "text-slate-400"}`}>{a.reserve_quantity}</span>
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
                <select value={toLocationId} onChange={e => setToLocationId(e.target.value)} required className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500">
                  <option value="">-- Choose box --</option>
                  {locations.map(loc => (
                    <option key={loc._id} value={loc._id}>{loc.location_code} (Floor {loc.floor}, Rack {loc.rack})</option>
                  ))}
                </select>
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

function ReceiveStockTab() {
  const [product, setProduct] = useState(null);
  const [power, setPower] = useState({ sph: "0.00", cyl: "", axis: "", add: "" });
  const [qty, setQty] = useState("");
  const [locationId, setLocationId] = useState("");
  const [locations, setLocations] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const canManage = hasPermission("MANAGE_INVENTORY");

  useEffect(() => {
    warehouseApi.getLocations({}).then(res => { if (res.error === false) setLocations(res.data); }).catch(e => console.error(e));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!product) return notify.warning("Select a product.");
    if (!locationId || !qty) return notify.warning("Fill all fields.");
    setIsSaving(true);
    try {
      const res = await inventoryApi.receiveStock({
        productId: product._id,
        power: {
          sph: parseFloat(power.sph),
          cyl: power.cyl !== "" ? parseFloat(power.cyl) : null,
          axis: power.axis !== "" ? parseInt(power.axis) : null,
          add: power.add !== "" ? parseFloat(power.add) : null
        },
        quantity: parseInt(qty),
        location_id: locationId
      });
      if (res.error === false) {
        notify.success(`${qty} unit(s) received into Reserve.`);
        setQty("");
      } else {
        notify.error(res.message || "Failed to receive stock");
      }
    } catch (err) {
      notify.error("Error receiving stock");
    }
    setIsSaving(false);
  };

  if (!canManage) {
    return <div className="vw-card p-10 text-center text-slate-500 text-[13px] flex flex-col items-center gap-2"><Lock size={18} className="text-slate-300" /> You don't have permission to receive stock.</div>;
  }

  return (
    <div className="vw-card p-5 max-w-xl">
      <p className="text-[12px] text-slate-500 mb-5 leading-relaxed">
        Record goods arriving into Reserve (Section 10: purchased stock lands in Reserve first, then gets refilled into Running stock as needed). This is a direct manual entry, not tied to a purchase order.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Product</label>
          <ProductPicker value={product} onSelect={setProduct} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">SPH</label>
            <PowerInput value={power.sph} onChange={v => setPower({ ...power, sph: v })} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">CYL</label>
            <PowerInput value={power.cyl} onChange={v => setPower({ ...power, cyl: v })} placeholder="optional" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Axis</label>
            <PowerInput value={power.axis} onChange={v => setPower({ ...power, axis: v })} placeholder="optional" step={1} decimals={0} signed={false} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Add</label>
            <PowerInput value={power.add} onChange={v => setPower({ ...power, add: v })} placeholder="optional" />
          </div>
        </div>
        <div>
          <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Reserve Box Location</label>
          <select value={locationId} onChange={e => setLocationId(e.target.value)} required className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500">
            <option value="">-- Choose box --</option>
            {locations.map(loc => (
              <option key={loc._id} value={loc._id}>{loc.location_code} (Floor {loc.floor}, Rack {loc.rack})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Quantity</label>
          <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} required className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500" />
        </div>
        <button type="submit" disabled={isSaving} className="vw-btn-primary h-10 disabled:opacity-50">{isSaving ? "Saving..." : "Receive into Reserve"}</button>
      </form>
    </div>
  );
}

function StockCountTab() {
  const [product, setProduct] = useState(null);
  const [godownId, setGodownId] = useState("running_stock");
  const [power, setPower] = useState({ sph: "0.00", cyl: "", axis: "", add: "" });
  const [locationId, setLocationId] = useState("");
  const [locations, setLocations] = useState([]);
  const [isFrozen, setIsFrozen] = useState(false);
  const [countedQty, setCountedQty] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const canManage = hasPermission("MANAGE_INVENTORY");

  useEffect(() => {
    warehouseApi.getLocations({}).then(res => { if (res.error === false) setLocations(res.data); }).catch(e => console.error(e));
  }, []);

  const buildPower = () => ({
    sph: parseFloat(power.sph),
    cyl: power.cyl !== "" ? parseFloat(power.cyl) : null,
    axis: power.axis !== "" ? parseInt(power.axis) : null,
    add: power.add !== "" ? parseFloat(power.add) : null
  });

  const handleFreeze = async () => {
    if (!product) return notify.warning("Select a product.");
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">SPH</label>
            <PowerInput value={power.sph} onChange={v => { setPower({ ...power, sph: v }); setIsFrozen(false); }} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">CYL</label>
            <PowerInput value={power.cyl} onChange={v => { setPower({ ...power, cyl: v }); setIsFrozen(false); }} placeholder="optional" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Axis</label>
            <PowerInput value={power.axis} onChange={v => { setPower({ ...power, axis: v }); setIsFrozen(false); }} placeholder="optional" step={1} decimals={0} signed={false} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Add</label>
            <PowerInput value={power.add} onChange={v => { setPower({ ...power, add: v }); setIsFrozen(false); }} placeholder="optional" />
          </div>
        </div>
        <div>
          <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Box Location</label>
          <select value={locationId} onChange={e => setLocationId(e.target.value)} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500">
            <option value="">-- Choose box --</option>
            {locations.map(loc => (
              <option key={loc._id} value={loc._id}>{loc.location_code} (Floor {loc.floor}, Rack {loc.rack})</option>
            ))}
          </select>
        </div>

        {!isFrozen ? (
          <button onClick={handleFreeze} disabled={isSaving} className="vw-btn-secondary h-10 font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2">
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

  return (
    <>
      <div className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><RefreshCw className="text-blue-600" size={22} /> Replenishment</h1>
        <p className="text-[13px] text-slate-500 mt-1">Low stock alerts, receiving into Reserve, refilling Running stock, and physical stock counts.</p>
      </div>

      <div className="flex border-b border-slate-200 mb-6 gap-6">
        {[["alerts", "Low Stock Alerts"], ["receive", "Receive Stock"], ["count", "Stock Count"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`pb-3 text-[13px] font-bold border-b-2 -mb-px transition-colors ${tab === k ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === "alerts" && <LowStockAlertsTab />}
      {tab === "receive" && <ReceiveStockTab />}
      {tab === "count" && <StockCountTab />}
    </>
  );
}
