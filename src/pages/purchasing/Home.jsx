import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShoppingCart, Upload, Layers, PackageSearch, ClipboardList, ArrowRight, XCircle } from "lucide-react";
import { getPurchasingHome, dismissSuggestion, PO_STAGES } from "@/services/purchaseApi";
import { hasPermission } from "@/lib/permissions";
import { notify } from "@/lib/notify";
import {
  PurchasingShell, Loading, Empty, ErrorNote, Card, Pill, StagePill, CoverPill, Modal, useLoad,
  btnPrimary, btnSecondary, inputCls, labelCls, thCls, tdCls, tableHead, fmtNum,
} from "./shared";

function FlowCard({ to, icon: Icon, step, title, value, hint }) {
  return (
    <Link to={to} className="vw-card p-4 flex flex-col gap-2 hover:shadow-md transition-shadow group">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{step}</span>
        <Icon size={18} className="text-blue-600" />
      </div>
      <div className="text-[15px] font-bold text-slate-900">{title}</div>
      <div className="text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
      <div className="text-[12px] text-slate-500 flex items-center justify-between gap-2">
        <span>{hint}</span>
        <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-600 shrink-0" />
      </div>
    </Link>
  );
}

export function PurchasingHome() {
  const { data, loading, error, reload } = useLoad(getPurchasingHome);
  const [dismissing, setDismissing] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const canManage = hasPermission("MANAGE_PURCHASING");

  const submitDismiss = async () => {
    setBusy(true);
    try {
      await dismissSuggestion(dismissing.line.id, reason);
      notify.success("Removed from the list.");
      setDismissing(null);
      setReason("");
      reload();
    } catch (e) {
      notify.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PurchasingShell
      icon={ShoppingCart}
      title="Purchasing"
      subtitle="The system works out what to buy for every power. A person checks it and sends every order — nothing goes to a supplier by itself."
    >
      {loading && !data && <Loading />}
      {error && <ErrorNote>{error}</ErrorNote>}
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <FlowCard to="/purchasing/super-masters" icon={Upload} step="Step 1" title="Super Masters" value={data.counts.super_masters} hint="Fixed ratios, uploaded from Excel or PDF" />
            <FlowCard to="/purchasing/product-masters" icon={Layers} step="Step 2" title="Product Masters" value={`${data.counts.pm_ready} ready`} hint={`${data.counts.pm_to_create} to create · ${data.counts.no_master} without a Super Master`} />
            <FlowCard to="/purchasing/product-masters" icon={PackageSearch} step="Today" title="Running low" value={data.suggestions.length} hint={`Less than ${data.threshold_months} months of stock`} />
            <FlowCard to="/purchasing/orders" icon={ClipboardList} step="Step 3" title="Purchase orders" value={`${data.counts.orders_active} open`} hint="From draft to Godown 1" />
          </div>

          <Card
            title="Running low"
            subtitle={`Stock, plus what is being made and what is on the way, lasts less than ${data.lead_time_months} months lead time + ${data.safety_margin_months} month safety. Checked ${data.last_run.toLowerCase()}.`}
          >
            {data.suggestions.length === 0 ? (
              <Empty>Nothing is running low right now.</Empty>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-left min-w-[760px]" style={{ borderCollapse: "collapse" }}>
                  <thead style={tableHead}>
                    <tr>
                      <th className={thCls}>Price line</th>
                      <th className={`${thCls} text-right`}>Sells / month</th>
                      <th className={`${thCls} text-right`}>Have + coming</th>
                      <th className={thCls}>Stock left</th>
                      <th className={`${thCls} text-right`}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.suggestions.map((s) => (
                      <tr key={s.line.id} className="border-b border-slate-100 last:border-0">
                        <td className={tdCls}>
                          <div className="font-bold text-slate-900">{s.line.product} <span className="font-semibold text-slate-600">{s.line.range_label}</span></div>
                          <div className="text-[11px] text-slate-500">{s.line.id} · Product Master {s.line.pm.master_code}, total {fmtNum(s.line.pm.total)} pairs</div>
                        </td>
                        <td className={`${tdCls} text-right tabular-nums`}>{fmtNum(s.monthly_sale)}</td>
                        <td className={`${tdCls} text-right tabular-nums`}>
                          {fmtNum(s.have)}
                          <div className="text-[11px] text-slate-500">{fmtNum(s.free)} in stock · {fmtNum(s.making + s.transit)} coming</div>
                        </td>
                        <td className={tdCls}><CoverPill months={s.cover_months} leadTime={data.lead_time_months} /></td>
                        <td className={`${tdCls} text-right`}>
                          <div className="flex justify-end items-center gap-2">
                            {s.open_po ? (
                              <Link to="/purchasing/orders/$id" params={{ id: s.open_po.id }} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-blue-700 hover:underline">
                                {s.open_po.po_number} <StagePill stage={s.open_po.stage} />
                              </Link>
                            ) : (
                              <Link to="/purchasing/product-masters/$id" params={{ id: s.line.id }} search={{ view: "order" }} className={`${btnPrimary} !h-8 !text-[12px]`}>
                                Make order
                              </Link>
                            )}
                            {canManage && (
                              <button type="button" aria-label={`Remove ${s.line.product} from the list`} title="Not now" className={`${btnSecondary} !h-8 !px-2`} onClick={() => setDismissing(s)}>
                                <XCircle size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Orders in progress" subtitle="Each order shows the next thing to do." actions={<Link to="/purchasing/orders" className="text-[12px] font-semibold text-blue-700 hover:underline">All orders</Link>}>
            {data.orders.length === 0 ? (
              <Empty>No open orders.</Empty>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.orders.map((o) => {
                  const stage = PO_STAGES.find((s) => s.id === o.stage);
                  return (
                    <li key={o.id} className="py-3 flex flex-wrap items-center gap-3 justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link to="/purchasing/orders/$id" params={{ id: o.id }} className="font-bold text-[13px] text-blue-700 hover:underline">{o.po_number}</Link>
                          <StagePill stage={o.stage} />
                          {o.on_hold && <Pill tone="red">On hold</Pill>}
                        </div>
                        <div className="text-[12px] text-slate-600 mt-0.5">{o.line.product} {o.line.range_label} · {o.supplier_name} · {fmtNum(o.total_ordered)} pairs</div>
                      </div>
                      {stage.action && (
                        <Link to="/purchasing/orders/$id" params={{ id: o.id }} className={`${btnSecondary} !h-8 !text-[12px]`}>
                          {stage.action} <ArrowRight size={13} />
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}

      {dismissing && (
        <Modal
          title="Not now"
          subtitle={`${dismissing.line.product} ${dismissing.line.range_label} will leave the running-low list.`}
          onClose={() => setDismissing(null)}
          footer={(
            <>
              <button type="button" className={btnSecondary} onClick={() => setDismissing(null)}>Cancel</button>
              <button type="button" className={btnPrimary} disabled={busy || !reason.trim()} onClick={submitDismiss}>Remove</button>
            </>
          )}
        >
          <div>
            <label className={labelCls} htmlFor="dismiss-reason">Reason <span className="text-rose-500">*</span></label>
            <textarea id="dismiss-reason" className={`${inputCls} !h-24 py-2`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this line not being ordered now?" />
          </div>
        </Modal>
      )}
    </PurchasingShell>
  );
}
