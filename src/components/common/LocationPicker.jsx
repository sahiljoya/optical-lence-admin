import { useState, useEffect } from "react";
import { MapPin } from "lucide-react";
import { warehouseApi } from "@/services/productApi";

// Cascading Floor -> Rack -> Shelf -> Box picker. Never fetches the full WarehouseLocation
// list (tens of thousands of individual boxes after the real warehouse seed) — racks come
// from the lightweight rack summary (~50 rows), and shelf/box numbers are generated locally
// from each rack's own shelf_count/box_count, so every dropdown here stays small and fast.
export function LocationPicker({ racks, onChange }) {
  const [floor, setFloor] = useState("");
  const [rack, setRack] = useState("");
  const [shelf, setShelf] = useState("");
  const [box, setBox] = useState("");
  const [resolvedCode, setResolvedCode] = useState("");

  const racksForFloor = racks.filter(r => String(r.floor) === String(floor));
  const selectedRack = racksForFloor.find(r => r.rack === rack);
  const shelfOptions = selectedRack ? Array.from({ length: selectedRack.shelf_count }, (_, i) => i + 1) : [];
  const boxOptions = selectedRack ? Array.from({ length: selectedRack.box_count || 0 }, (_, i) => i + 1) : [];

  useEffect(() => {
    if (!floor || !rack || !shelf || !box) { setResolvedCode(""); return; }
    let cancelled = false;
    warehouseApi.getLocations({ floor: Number(floor), rack, shelf: String(shelf), box_no: String(box) })
      .then(res => {
        if (cancelled) return;
        if (res.error === false && res.data[0]) {
          setResolvedCode(res.data[0].location_code);
          onChange(res.data[0]._id, res.data[0]);
        } else {
          setResolvedCode("");
          onChange("", null);
        }
      })
      .catch(() => { if (!cancelled) { setResolvedCode(""); onChange("", null); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floor, rack, shelf, box]);

  const selectClass = "w-full h-10 px-2 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400";

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Floor</label>
          <select value={floor} onChange={e => { setFloor(e.target.value); setRack(""); setShelf(""); setBox(""); }} className={selectClass}>
            <option value="">-- Select --</option>
            {[1, 2, 3, 4].map(f => <option key={f} value={f}>Floor {f}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Rack</label>
          <select value={rack} onChange={e => { setRack(e.target.value); setShelf(""); setBox(""); }} disabled={!floor} className={selectClass}>
            <option value="">-- Select --</option>
            {racksForFloor.map(r => <option key={r.rack} value={r.rack}>Rack {r.rack}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Shelf</label>
          <select value={shelf} onChange={e => { setShelf(e.target.value); setBox(""); }} disabled={!rack} className={selectClass}>
            <option value="">-- Select --</option>
            {shelfOptions.map(s => <option key={s} value={s}>Shelf {s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Box</label>
          <select value={box} onChange={e => setBox(e.target.value)} disabled={!shelf} className={selectClass}>
            <option value="">-- Select --</option>
            {boxOptions.map(b => <option key={b} value={b}>Box {b}</option>)}
          </select>
        </div>
      </div>
      {resolvedCode && (
        <div className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          <MapPin size={13} /> {resolvedCode}
        </div>
      )}
    </div>
  );
}

// Shelf-level picker: Floor -> Rack -> Start Shelf to End Shelf (No individual Box selection needed).
// Perfect for warehouse workers stocking cartons & boxes across a shelf section.
export function ShelfLocationPicker({ racks = [], onChange, initialLocation = null }) {
  const [floor, setFloor] = useState(initialLocation?.floor || "");
  const [rack, setRack] = useState(initialLocation?.rack || "");
  const [startShelf, setStartShelf] = useState("");
  const [endShelf, setEndShelf] = useState("");
  const [resolvedCode, setResolvedCode] = useState("");
  const [loading, setLoading] = useState(false);

  const racksForFloor = racks.filter(r => String(r.floor) === String(floor));
  const selectedRack = racksForFloor.find(r => r.rack === rack);
  const shelfOptions = selectedRack ? Array.from({ length: selectedRack.shelf_count || 10 }, (_, i) => i + 1) : [1, 2, 3, 4, 5, 6, 7, 8];

  useEffect(() => {
    if (!floor || !rack || !startShelf) {
      setResolvedCode("");
      if (onChange) onChange("", null);
      return;
    }
    const end = endShelf || startShelf;
    const startStr = String(startShelf).startsWith("Shelf") ? String(startShelf) : `Shelf ${startShelf}`;
    const endStr = String(end).startsWith("Shelf") ? String(end) : `Shelf ${end}`;

    let cancelled = false;
    setLoading(true);

    warehouseApi.findOrCreateShelf({
      floor: Number(floor),
      rack,
      start_shelf: startStr,
      end_shelf: endStr
    })
      .then(res => {
        if (cancelled) return;
        if (res.error === false && res.data) {
          setResolvedCode(res.data.location_code || `${res.data.rack} · ${res.data.shelf}`);
          if (onChange) onChange(res.data._id, res.data);
        } else {
          setResolvedCode("");
          if (onChange) onChange("", null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedCode("");
          if (onChange) onChange("", null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floor, rack, startShelf, endShelf]);

  const selectClass = "w-full h-10 px-2.5 bg-white border border-slate-200 rounded-lg text-[13px] font-medium text-slate-700 focus:outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400";

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wide">Floor</label>
          <select value={floor} onChange={e => { setFloor(e.target.value); setRack(""); setStartShelf(""); setEndShelf(""); }} className={selectClass}>
            <option value="">-- Floor --</option>
            {[1, 2, 3, 4].map(f => <option key={f} value={f}>Floor {f}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wide">Rack</label>
          <select value={rack} onChange={e => { setRack(e.target.value); setStartShelf(""); setEndShelf(""); }} disabled={!floor} className={selectClass}>
            <option value="">-- Rack --</option>
            {racksForFloor.map(r => <option key={r.rack} value={r.rack}>Rack {r.rack}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wide">Start Shelf</label>
          <select value={startShelf} onChange={e => { setStartShelf(e.target.value); if (!endShelf || Number(endShelf) < Number(e.target.value)) setEndShelf(e.target.value); }} disabled={!rack} className={selectClass}>
            <option value="">-- Start Shelf --</option>
            {shelfOptions.map(s => <option key={s} value={s}>Shelf {s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wide">End Shelf</label>
          <select value={endShelf} onChange={e => setEndShelf(e.target.value)} disabled={!startShelf} className={selectClass}>
            <option value="">-- End Shelf --</option>
            {shelfOptions.filter(s => !startShelf || s >= Number(startShelf)).map(s => <option key={s} value={s}>Shelf {s}</option>)}
          </select>
        </div>
      </div>
      {loading ? (
        <div className="text-[12px] text-slate-400 italic">Connecting location...</div>
      ) : resolvedCode ? (
        <div className="flex items-center gap-2 text-[12px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          <MapPin size={14} className="text-emerald-600 shrink-0" />
          <span>Assigned Shelf: <span className="font-mono text-emerald-900">{resolvedCode}</span> (Floor {floor} · {rack} · {startShelf === endShelf || !endShelf ? `Shelf ${startShelf}` : `Shelf ${startShelf} to ${endShelf}`})</span>
        </div>
      ) : null}
    </div>
  );
}
