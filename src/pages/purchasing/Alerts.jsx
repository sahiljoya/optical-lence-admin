import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BellRing, ShoppingCart, CheckCircle2 } from "lucide-react";
import { getAlerts, ignoreAlert } from "@/services/purchaseApi";
import { hasPermission } from "@/lib/permissions";
import { notify } from "@/lib/notify";
import { PurchasingShell, Loading, ErrorNote, Card, Pill, StagePill, useLoad, btnPrimary, btnSecondary, thCls, tdCls, tableHead, fmtNum } from "./shared";

// Alerts: products whose alert has gone off (by pieces left, or by months), and every alert setting.
export function Alerts() {
  const { data, loading, error, reload } = useLoad(getAlerts);
  const [busy, setBusy] = useState("");
  const canManage = hasPermission("MANAGE_PURCHASING");

  const ignore = async (id) => {
    setBusy(id);
    try {
      await ignoreAlert(id);
      notify.success("Alert ignored.");
      reload();
    } catch (e) {
      notify.error(e.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <PurchasingShell icon={BellRing} title="Alerts" subtitle="An alert goes off when pieces we have fall to the number you set, or when the months you set have passed. Whichever comes first.">
      {loading && !data && <Loading />}
      {error && <ErrorNote>{error}</ErrorNote>}
      {data && (
        <div className="space-y-4">
          <Card title={`Needs attention (${data.active.length})`}>
            {data.active.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-[13px] text-emerald-900">
                <CheckCircle2 size={16} /> All good. No alert right now.
              </div>
            ) : (
              <ul className="space-y-2">
                {data.active.map((a) => (
                  <li key={a.id} className="rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link to="/purchasing/product-masters/$id" params={{ id: a.id }} className="font-bold text-[14px] text-slate-900 hover:underline">{a.product} {a.range_label}</Link>
                      <div className="text-[12px] text-slate-500">{a.master_code} · we have {fmtNum(a.have)} pieces · Product Master {fmtNum(a.total)}</div>
                      <ul className="mt-1 space-y-0.5">
                        {a.reasons.map((r) => <li key={r.kind} className="text-[13px] text-rose-800 flex items-start gap-1.5"><BellRing size={13} className="mt-0.5 shrink-0" />{r.text}</li>)}
                      </ul>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {a.open_po ? (
                        <Link to="/purchasing/orders/$id" params={{ id: a.open_po.id }} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-blue-700 hover:underline">{a.open_po.po_number} <StagePill stage={a.open_po.stage} /></Link>
                      ) : (
                        <Link to="/purchasing/orders/new" search={{ pm: a.id }} className={btnPrimary}><ShoppingCart size={14} /> Check & make order</Link>
                      )}
                      {canManage && <button type="button" className={btnSecondary} disabled={busy === a.id} onClick={() => ignore(a.id)}>Ignore</button>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="All alert settings" subtitle="Change an alert on its Product Master.">
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-left min-w-[720px]" style={{ borderCollapse: "collapse" }}>
                <thead style={tableHead}>
                  <tr>
                    <th className={thCls}>Product</th>
                    <th className={thCls}>Super Master</th>
                    <th className={thCls}>Alert</th>
                    <th className={`${thCls} text-right`}>We have</th>
                    <th className={thCls}>Status</th>
                    <th className={thCls}><span className="sr-only">Change</span></th>
                  </tr>
                </thead>
                <tbody>
                  {data.all.map((a) => {
                    const notSet = a.alert.qty === null && a.alert.every_months === null;
                    return (
                      <tr key={a.id} className="border-b border-slate-100 last:border-0">
                        <td className={tdCls}><div className="font-semibold text-slate-900">{a.product}</div><div className="text-[11px] text-slate-500">{a.range_label}</div></td>
                        <td className={tdCls}>{a.master_code}</td>
                        <td className={tdCls}>{a.alert_text}</td>
                        <td className={`${tdCls} text-right tabular-nums`}>{fmtNum(a.have)}</td>
                        <td className={tdCls}>
                          {a.alert_active ? <Pill tone="red">Alert</Pill> : a.ignored ? <Pill tone="amber">Ignored</Pill> : notSet ? <Pill tone="grey">Not set</Pill> : <Pill tone="green">OK</Pill>}
                        </td>
                        <td className={`${tdCls} text-right`}>
                          <Link to="/purchasing/product-masters/$id" params={{ id: a.id }} hash="alert" className="text-[12px] font-semibold text-blue-700 hover:underline">Change</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </PurchasingShell>
  );
}
