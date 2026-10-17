import { useState, useEffect } from "react";
import { Search, MapPin, AlertCircle } from "lucide-react";
import { productApi, brandApi } from "../../services/productApi";
import { notify } from "@/lib/notify";
import { PowerInput } from "@/components/common/PowerInput";
import "@/styles/veriwide.css";

// Section 8's confirmed "Find My Lens" smart search: by SPH/CYL (+AXIS/ADD for Progressive/KT),
// across every brand, with price and exact rack location — pulls directly from each SKU's
// power matrix. Always searches Running Stock, since that's where staff pick orders from by
// default (Section 8) — Reserve/off-site stock isn't a day-to-day picking concern here.
export function FindMyLens() {
  const [brands, setBrands] = useState([]);
  const [query, setQuery] = useState({ lens_type: "", brand: "", sph: "", cyl: "", axis: "", add: "" });
  const [results, setResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // RX is always structurally a Progressive lens (same SPH/CYL/AXIS/ADD fields) per the
  // client's spec, even though it's its own distinct lens-type option.
  const isProgressiveFamily = query.lens_type === "Progressive" || query.lens_type === "KT" || query.lens_type === "RX";

  useEffect(() => {
    brandApi.getBrands().then(res => {
      if (res.error === false) setBrands(res.data);
    }).catch(e => console.error("Failed to fetch brands", e));
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (query.sph === "" && query.cyl === "") {
      return notify.warning("Enter at least SPH or CYL to search.");
    }
    setIsSearching(true);
    try {
      const payload = {
        godown_id: "running_stock",
        ...(query.lens_type ? { lens_type: query.lens_type } : {}),
        ...(query.brand ? { brand: query.brand } : {}),
        ...(query.sph !== "" ? { sph: query.sph } : {}),
        ...(query.cyl !== "" ? { cyl: query.cyl } : {}),
        ...(isProgressiveFamily && query.axis !== "" ? { axis: query.axis } : {}),
        ...(isProgressiveFamily && query.add !== "" ? { add: query.add } : {})
      };
      const res = await productApi.findMyLens(payload);
      if (res.error === false) {
        setResults(res.data.list || []);
      } else {
        notify.error(res.message || "Search failed");
        setResults([]);
      }
    } catch (err) {
      console.error(err);
      notify.error("Error searching for lens");
      setResults([]);
    }
    setIsSearching(false);
  };

  return (
    <>
      <div className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Search className="text-blue-600" size={22} /> Find My Lens</h1>
        <p className="text-[13px] text-slate-500 mt-1">Search any power across every brand — see what's in stock, its price, and exactly which box to pick it from.</p>
      </div>

      <form onSubmit={handleSearch} className="vw-card p-5 mb-6">
        <div className={`grid grid-cols-2 gap-3 ${isProgressiveFamily ? "sm:grid-cols-3 lg:grid-cols-6" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Lens Type</label>
            <select value={query.lens_type} onChange={e => setQuery({...query, lens_type: e.target.value, axis: "", add: ""})} className="w-full h-10 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500">
              <option value="">Any</option>
              <option value="Single Vision">Single Vision</option>
              <option value="Progressive">Progressive</option>
              <option value="KT">Bifocal (KT)</option>
              <option value="RX">RX</option>
              <option value="Cross">Cross</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Brand</label>
            <select value={query.brand} onChange={e => setQuery({...query, brand: e.target.value})} className="w-full h-10 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500">
              <option value="">Any Brand</option>
              {brands.map(b => (
                <option key={b._id} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">SPH</label>
            <PowerInput value={query.sph} onChange={v => setQuery({...query, sph: v})} placeholder="-2.00" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">CYL</label>
            <PowerInput value={query.cyl} onChange={v => setQuery({...query, cyl: v})} placeholder="-0.50" />
          </div>
          {isProgressiveFamily && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Axis</label>
                <PowerInput value={query.axis} onChange={v => setQuery({...query, axis: v})} placeholder="90" step={1} decimals={0} signed={false} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Add</label>
                <PowerInput value={query.add} onChange={v => setQuery({...query, add: v})} placeholder="+2.00" />
              </div>
            </>
          )}
        </div>
        <button type="submit" disabled={isSearching} className="vw-btn-primary h-10 px-5 mt-4 gap-2 flex items-center justify-center disabled:opacity-50">
          <Search size={16} /> {isSearching ? "Searching..." : "Search"}
        </button>
      </form>

      {results !== null && (
        <div className="vw-card overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-[14px]">{results.length} match{results.length !== 1 ? "es" : ""} found</h3>
          </div>
          {results.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-[13px] flex flex-col items-center gap-2">
              <AlertCircle size={20} className="text-slate-300" />
              No brand has this exact power in stock.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="p-3 border-b border-slate-100">Brand / SKU</th>
                    <th className="p-3 border-b border-slate-100">Specs</th>
                    <th className="p-3 border-b border-slate-100">Matched Power</th>
                    <th className="p-3 border-b border-slate-100">Qty</th>
                    <th className="p-3 border-b border-slate-100">Location</th>
                    <th className="p-3 border-b border-slate-100">Min Price</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-3 border-b border-slate-100">
                        <div className="font-bold text-slate-800">{r.brand}</div>
                        <div className="text-[11px] text-slate-500">{r.product_code}</div>
                      </td>
                      <td className="p-3 border-b border-slate-100 text-slate-600">
                        {r.lens_type} · {r.index} · {r.base} · {r.coating}
                      </td>
                      <td className="p-3 border-b border-slate-100 font-mono">
                        {r.matched_power ? (
                          <>SPH {r.matched_power.sph} {r.matched_power.cyl !== null ? `CYL ${r.matched_power.cyl}` : ""} {r.matched_power.axis ? `X${r.matched_power.axis}` : ""} {r.matched_power.add ? `ADD +${r.matched_power.add}` : ""}</>
                        ) : (
                          <span className="text-slate-400">No exact match</span>
                        )}
                      </td>
                      <td className="p-3 border-b border-slate-100">
                        {r.matched_power ? (
                          <span className={`font-bold ${r.matched_power.quantity > 0 ? "text-emerald-600" : "text-rose-500"}`}>{r.matched_power.quantity}</span>
                        ) : "—"}
                      </td>
                      <td className="p-3 border-b border-slate-100">
                        {r.location ? (
                          <span className="inline-flex items-center gap-1 text-[12px] font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                            <MapPin size={12} /> {r.location.location_code}
                          </span>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="p-3 border-b border-slate-100 font-bold text-slate-800">
                        {r.min_selling_price ? `₹${r.min_selling_price}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
