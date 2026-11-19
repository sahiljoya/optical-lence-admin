import { useState, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, Search, BellRing, ChevronRight, Layers, ShoppingCart } from "lucide-react";
import { listProductMasters } from "@/services/purchaseApi";
import { hasPermission } from "@/lib/permissions";
import {
  PurchasingShell, Loading, Empty, ErrorNote, Pill, StagePill, useLoad,
  btnPrimary, btnSecondary, thCls, tdCls, tableHead, fmtNum, inputCls,
} from "./shared";

function Fact({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <div className="text-[11px] font-semibold text-slate-500">{label}</div>
      <div className="text-[14px] font-bold text-slate-900 tabular-nums">{value}</div>
    </div>
  );
}

export function ProductMasters() {
  const { data, loading, error } = useLoad(listProductMasters);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // 'all' | 'alert' | 'open_po'
  const [lensType, setLensType] = useState("all");
  const navigate = useNavigate();
  const canManage = hasPermission("MANAGE_PURCHASING");

  const pms = data || [];

  const filtered = useMemo(() => {
    return pms.filter((p) => {
      if (filter === "alert" && !p.alert_active) return false;
      if (filter === "open_po" && !p.open_po) return false;
      if (lensType !== "all" && p.lens_type !== lensType) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = p.product?.toLowerCase().includes(q);
        const matchCode = p.id?.toLowerCase().includes(q) || p.item_code?.toLowerCase().includes(q);
        const matchMaster = p.master_code?.toLowerCase().includes(q);
        const matchRange = p.range_label?.toLowerCase().includes(q) || p.taken_text?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchMaster && !matchRange) return false;
      }
      return true;
    });
  }, [pms, filter, lensType, search]);

  const totalKeep = useMemo(() => pms.reduce((sum, p) => sum + (p.total || 0), 0), [pms]);
  const totalHave = useMemo(() => pms.reduce((sum, p) => sum + (p.have || 0), 0), [pms]);
  const alertCount = useMemo(() => pms.filter((p) => p.alert_active).length, [pms]);
  const openPoCount = useMemo(() => pms.filter((p) => p.open_po).length, [pms]);

  const open = (id) => navigate({ to: "/purchasing/product-masters/$id", params: { id } });

  return (
    <PurchasingShell
      icon={Layers}
      title="Product Masters"
      subtitle="Each Product Master is for one product: the powers it takes from a Super Master and how many pieces to keep."
      actions={
        canManage && (
          <Link to="/purchasing/product-masters/new" className={btnPrimary}>
            <Plus size={15} /> Create Product Master
          </Link>
        )
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
        <Fact label="Product Masters" value={pms.length} />
        <Fact label="Total pieces to keep" value={fmtNum(totalKeep)} />
        <Fact label="We have now" value={fmtNum(totalHave)} />
        <Fact label="Active alerts" value={alertCount > 0 ? `${alertCount} alert${alertCount === 1 ? "" : "s"}` : "None"} />
        <Fact label="Open orders" value={openPoCount > 0 ? `${openPoCount} open` : "None"} />
      </div>

      {loading && !data && <Loading />}
      {error && <ErrorNote>{error}</ErrorNote>}

      {data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={filter === "all"}
                onClick={() => setFilter("all")}
                className={`h-8 px-3 rounded-lg border text-[12px] font-semibold cursor-pointer ${filter === "all" ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                All ({pms.length})
              </button>
              <button
                type="button"
                aria-pressed={filter === "alert"}
                onClick={() => setFilter("alert")}
                className={`h-8 px-3 rounded-lg border text-[12px] font-semibold cursor-pointer ${filter === "alert" ? "border-rose-500 bg-rose-50 text-rose-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                Alerts ({alertCount})
              </button>
              <button
                type="button"
                aria-pressed={filter === "open_po"}
                onClick={() => setFilter("open_po")}
                className={`h-8 px-3 rounded-lg border text-[12px] font-semibold cursor-pointer ${filter === "open_po" ? "border-amber-500 bg-amber-50 text-amber-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                Open orders ({openPoCount})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative min-w-[200px] flex-1 sm:w-64">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products, codes, masters..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`${inputCls} !pl-8 !h-8 !text-[12px]`}
                />
              </div>

              <select
                aria-label="Filter by lens type"
                className={`${inputCls} !h-8 !text-[12px] sm:!w-36`}
                value={lensType}
                onChange={(e) => setLensType(e.target.value)}
              >
                <option value="all">All lens types</option>
                <option value="Single Vision">Single Vision</option>
                <option value="KT">KT</option>
                <option value="Progressive">Progressive</option>
              </select>
            </div>
          </div>

          <div className="vw-card overflow-hidden">
            {filtered.length === 0 ? (
              <Empty>No Product Masters match the filters.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[840px]" style={{ borderCollapse: "collapse" }}>
                  <thead style={tableHead}>
                    <tr>
                      <th className={thCls}>Product</th>
                      <th className={thCls}>Super Master</th>
                      <th className={thCls}>Powers taken</th>
                      <th className={thCls}>Lens specs</th>
                      <th className={`${thCls} text-right`}>Total pieces</th>
                      <th className={`${thCls} text-right`}>We have now</th>
                      <th className={thCls}>Alert / PO</th>
                      <th className={thCls}><span className="sr-only">Open</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => open(p.id)}
                        className="border-b border-slate-100 last:border-0 hover:bg-blue-50/40 cursor-pointer"
                      >
                        <td className={tdCls}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); open(p.id); }}
                            className="font-bold text-blue-700 hover:underline text-left block"
                          >
                            {p.product}
                          </button>
                          <div className="text-[11px] text-slate-500">{p.range_label} · {p.id}</div>
                        </td>
                        <td className={tdCls}>
                          <Link
                            to="/purchasing/super-masters/$id"
                            params={{ id: p.master_id }}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 font-semibold text-slate-800 hover:text-blue-700 hover:underline text-[12px]"
                          >
                            {p.master_code}
                          </Link>
                          <div className="text-[11px] text-slate-400">v{p.version_used}</div>
                        </td>
                        <td className={`${tdCls} text-[12px] tabular-nums max-w-[220px] truncate`} title={p.taken_text}>
                          {p.taken_text}
                        </td>
                        <td className={`${tdCls} text-[12px] text-slate-600`}>
                          <div>{p.lens_type}</div>
                          <div className="text-[11px] text-slate-400">{p.index ? `Index ${p.index}` : ""}{p.diameter ? ` · ${p.diameter} mm` : ""}</div>
                        </td>
                        <td className={`${tdCls} text-right tabular-nums font-semibold text-slate-900`}>
                          {fmtNum(p.total)}
                        </td>
                        <td className={`${tdCls} text-right tabular-nums text-slate-700`}>
                          {fmtNum(p.have)}
                        </td>
                        <td className={tdCls}>
                          {p.alert_active ? (
                            <Pill tone="red"><BellRing size={11} className="mr-1" />Alert</Pill>
                          ) : (
                            <span className="text-[12px] text-slate-500">{p.alert_text}</span>
                          )}
                          {p.open_po && (
                            <div className="mt-1 flex items-center gap-1">
                              <StagePill stage={p.open_po.stage} />
                              <span className="text-[11px] text-slate-500">{p.open_po.po_number}</span>
                            </div>
                          )}
                        </td>
                        <td className={`${tdCls} text-right`}>
                          <Link
                            to="/purchasing/product-masters/$id"
                            params={{ id: p.id }}
                            onClick={(e) => e.stopPropagation()}
                            className={`${btnSecondary} !h-8 !text-[12px]`}
                          >
                            Open <ChevronRight size={13} />
                          </Link>
                        </td>
                      </tr>
                    ))}
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
