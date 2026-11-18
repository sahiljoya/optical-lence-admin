import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Layers, Search } from "lucide-react";
import { listProductMasters } from "@/services/purchaseApi";
import { PurchasingShell, Loading, Empty, ErrorNote, Pill, CoverPill, useLoad, inputCls, thCls, tdCls, tableHead, fmtNum, btnPrimary, btnSecondary } from "./shared";

const FILTERS = [
  ["all", "All lines"],
  ["ready", "Ready"],
  ["to_create", "To create"],
  ["no_master", "No Super Master"],
  ["made_to_order", "Made to order"],
];

const STATUS = {
  ready: ["green", "Ready"],
  to_create: ["amber", "To create"],
  no_master: ["red", "No Super Master"],
  made_to_order: ["grey", "Made to order"],
};

export function ProductMasters() {
  const { data, loading, error } = useLoad(listProductMasters);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const lines = data || [];
  const q = query.trim().toLowerCase();
  const shown = lines
    .filter((l) => filter === "all" || l.status === filter)
    .filter((l) => !q || `${l.product} ${l.range_label} ${l.id} ${l.item_code}`.toLowerCase().includes(q));

  return (
    <PurchasingShell
      icon={Layers}
      title="Product Masters"
      subtitle="One per price line: its Super Master's ratios, kept only for the line's own powers. Only the total can change — every power follows its ratio."
    >
      {loading && !data && <Loading />}
      {error && <ErrorNote>{error}</ErrorNote>}
      {data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map(([id, label]) => (
                <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)} className={`h-8 px-3 rounded-lg border text-[12px] font-semibold cursor-pointer ${filter === id ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                  {label} <span className="tabular-nums">({id === "all" ? lines.length : lines.filter((l) => l.status === id).length})</span>
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input aria-label="Search price lines" className={`${inputCls} pl-8`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search product, range or RG number" />
            </div>
          </div>

          <div className="vw-card overflow-hidden">
            {shown.length === 0 ? <Empty>No price lines here.</Empty> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[920px]" style={{ borderCollapse: "collapse" }}>
                  <thead style={tableHead}>
                    <tr>
                      <th className={thCls}>Price line</th>
                      <th className={thCls}>Type · index · dia</th>
                      <th className={thCls}>Super Master</th>
                      <th className={`${thCls} text-right`}>Total pairs</th>
                      <th className={`${thCls} text-right`}>Sells / month</th>
                      <th className={thCls}>Stock left</th>
                      <th className={thCls}>Status</th>
                      <th className={`${thCls} text-right`}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((l) => {
                      const [tone, label] = STATUS[l.status];
                      return (
                        <tr key={l.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                          <td className={tdCls}>
                            <div className="font-bold text-slate-900">{l.product}</div>
                            <div className="text-[12px] text-slate-600">{l.range_label}</div>
                            <div className="text-[11px] text-slate-400">{l.id} · {l.item_code}</div>
                          </td>
                          <td className={tdCls}>{l.lens_type} · {l.index}{l.diameter ? ` · ${l.diameter} mm` : ""}</td>
                          <td className={tdCls}>
                            {l.pm ? (
                              <span>
                                <b className="text-slate-900">{l.pm.master_code}</b> v{l.pm.master_version}
                                {l.pm.latest_version > l.pm.master_version && <span className="block text-[11px] font-semibold text-amber-700">v{l.pm.latest_version} available</span>}
                              </span>
                            ) : l.suggested_master ? (
                              <span className="text-slate-600">{l.suggested_master.code} <span className="text-[11px] text-slate-400">(suggested)</span></span>
                            ) : <span className="text-slate-400">—</span>}
                          </td>
                          <td className={`${tdCls} text-right tabular-nums font-semibold text-slate-900`}>{l.pm ? fmtNum(l.pm.total) : "—"}</td>
                          <td className={`${tdCls} text-right tabular-nums`}>{fmtNum(l.monthly_sale)}</td>
                          <td className={tdCls}>{l.pm ? <CoverPill months={l.cover_months} /> : <span className="text-slate-400">—</span>}</td>
                          <td className={tdCls}><Pill tone={tone}>{label}</Pill></td>
                          <td className={`${tdCls} text-right`}>
                            {l.status === "ready" && <Link to="/purchasing/product-masters/$id" params={{ id: l.id }} className={`${btnSecondary} !h-8 !text-[12px]`}>Open</Link>}
                            {l.status === "to_create" && <Link to="/purchasing/product-masters/$id" params={{ id: l.id }} className={`${btnPrimary} !h-8 !text-[12px]`}>Create</Link>}
                            {l.status === "no_master" && <Link to="/purchasing/super-masters" className="text-[12px] font-semibold text-blue-700 hover:underline">Upload a Super Master</Link>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </PurchasingShell>
  );
}
