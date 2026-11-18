import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ClipboardList, ArrowRight, Factory } from "lucide-react";
import { listPurchaseOrders, listSuppliers, PO_STAGES } from "@/services/purchaseApi";
import { PurchasingShell, Loading, Empty, ErrorNote, Pill, StagePill, useLoad, inputCls, thCls, tdCls, tableHead, fmtDate, fmtNum, btnSecondary } from "./shared";

const FILTERS = [
  ["open", "Open", (o) => o.stage !== "received"],
  ["draft", "Held / sent", (o) => o.stage === "held" || o.stage === "sent"],
  ["making", "Being made", (o) => o.stage === "pi_received" || o.stage === "packing_list"],
  ["transit", "On the way", (o) => o.stage === "shipped"],
  ["hold", "On hold", (o) => o.on_hold],
  ["received", "Received", (o) => o.stage === "received"],
  ["all", "All", () => true],
];

export function PurchaseOrders() {
  const { data, loading, error } = useLoad(() => Promise.all([listPurchaseOrders(), listSuppliers()]));
  const [filter, setFilter] = useState("open");
  const [supplier, setSupplier] = useState("");
  const [orders, suppliers] = data || [[], []];
  const test = FILTERS.find((f) => f[0] === filter)[2];
  const shown = orders.filter(test).filter((o) => !supplier || o.supplier_id === supplier);

  return (
    <PurchasingShell
      icon={ClipboardList}
      title="Purchase orders"
      subtitle="Each order shows its next step. To make a new order, open a Product Master and press “Check & make order”."
      actions={<Link to="/purchasing/suppliers" className={btnSecondary}><Factory size={15} /> Suppliers</Link>}
    >
      {loading && !data && <Loading />}
      {error && <ErrorNote>{error}</ErrorNote>}
      {data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map(([id, label, fn]) => (
                <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)} className={`h-8 px-3 rounded-lg border text-[12px] font-semibold cursor-pointer ${filter === id ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                  {label} <span className="tabular-nums">({orders.filter(fn).length})</span>
                </button>
              ))}
            </div>
            <select aria-label="Filter by supplier" className={`${inputCls} sm:!w-56`} value={supplier} onChange={(e) => setSupplier(e.target.value)}>
              <option value="">All suppliers</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="vw-card overflow-hidden">
            {shown.length === 0 ? <Empty>No orders here.</Empty> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[860px]" style={{ borderCollapse: "collapse" }}>
                  <thead style={tableHead}>
                    <tr>
                      <th className={thCls}>Order</th>
                      <th className={thCls}>Product</th>
                      <th className={thCls}>Supplier</th>
                      <th className={`${thCls} text-right`}>Pieces</th>
                      <th className={thCls}>Stage</th>
                      <th className={thCls}>Created</th>
                      <th className={`${thCls} text-right`}>Next step</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((o) => {
                      const stage = PO_STAGES.find((s) => s.id === o.stage);
                      return (
                        <tr key={o.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                          <td className={tdCls}><Link to="/purchasing/orders/$id" params={{ id: o.id }} className="font-bold text-blue-700 hover:underline">{o.po_number}</Link></td>
                          <td className={tdCls}>
                            <div className="font-semibold text-slate-900">{o.line.product}</div>
                            <div className="text-[11px] text-slate-500">{o.line.range_label} · {o.line.id}</div>
                          </td>
                          <td className={tdCls}>{o.supplier_name}</td>
                          <td className={`${tdCls} text-right tabular-nums`}>
                            {o.stage === "shipped" || o.stage === "received" ? `${fmtNum(o.total_received)} / ${fmtNum(o.total_ordered)}` : fmtNum(o.total_ordered)}
                          </td>
                          <td className={tdCls}>
                            <div className="flex items-center gap-1.5 flex-wrap"><StagePill stage={o.stage} />{o.on_hold && <Pill tone="red">On hold</Pill>}</div>
                          </td>
                          <td className={tdCls}>{fmtDate(o.created_at)}</td>
                          <td className={`${tdCls} text-right`}>
                            {stage.action ? (
                              <Link to="/purchasing/orders/$id" params={{ id: o.id }} className={`${btnSecondary} !h-8 !text-[12px]`}>{stage.action} <ArrowRight size={13} /></Link>
                            ) : <span className="text-[12px] text-slate-400">Done</span>}
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
