import { useMemo, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ClipboardList, ArrowLeft, ArrowRight, PauseCircle, PlayCircle, PackageCheck, Loader2 } from "lucide-react";
import { getPurchaseOrder, advancePurchaseOrder, togglePurchaseOrderHold, receivePurchaseOrder, PO_STAGES, cellKey } from "@/services/purchaseApi";
import { hasPermission } from "@/lib/permissions";
import { notify } from "@/lib/notify";
import {
  PurchasingShell, Loading, ErrorNote, Card, Pill, StagePill, Modal, BigNumber, PowerMatrix, Segmented, StageSteps, useLoad,
  btnPrimary, btnSecondary, inputCls, labelCls, thCls, tdCls, fmtPower, fmtDate, fmtNum,
} from "./shared";

export function PurchaseOrderDetails() {
  const { id } = useParams({ strict: false });
  const { data: po, loading, error, setData } = useLoad(() => getPurchaseOrder(id), [id]);
  const [mode, setMode] = useState("ordered");
  const [dialog, setDialog] = useState(null); // "next" | "hold" | "receive"
  const [form, setForm] = useState({});
  const [receiving, setReceiving] = useState({});
  const [busy, setBusy] = useState(false);

  const canManage = hasPermission("MANAGE_PURCHASING");
  const canReceive = hasPermission("RECEIVE_PURCHASE");

  const byKey = useMemo(() => {
    const map = {};
    (po?.lines || []).forEach((r) => { map[r.key] = r; });
    return map;
  }, [po]);

  const run = async (action, message) => {
    setBusy(true);
    try {
      setData(await action());
      setDialog(null);
      setForm({});
      notify.success(message);
    } catch (e) {
      notify.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const crumbs = [{ label: "Orders", to: "/purchasing/orders" }, { label: po?.po_number || id }];
  if (loading && !po) return <PurchasingShell crumbs={crumbs} icon={ClipboardList} title="Purchase order"><Loading /></PurchasingShell>;
  if (error || !po) return <PurchasingShell crumbs={crumbs} icon={ClipboardList} title="Purchase order"><ErrorNote>{error || "Not found."}</ErrorNote></PurchasingShell>;

  const stage = PO_STAGES.find((s) => s.id === po.stage);
  const next = PO_STAGES[PO_STAGES.findIndex((s) => s.id === po.stage) + 1];
  const isReceiveStep = po.stage === "shipped";
  const canDoNext = isReceiveStep ? canReceive : canManage;
  const pending = po.lines.filter((r) => r.ordered > r.received);
  const receiveTotal = Object.values(receiving).reduce((s, v) => s + (Math.floor(Number(v)) || 0), 0);

  const fillRemaining = () => {
    const all = {};
    pending.forEach((r) => { all[r.key] = r.ordered - r.received; });
    setReceiving(all);
  };

  return (
    <PurchasingShell
      icon={ClipboardList}
      title={po.po_number}
      subtitle={`${po.line.product} ${po.line.range_label} · ${po.supplier_name} · made from Product Master ${po.master_code} v${po.master_version}`}
      actions={(
        <>
          <Link to="/purchasing/orders" className={btnSecondary}><ArrowLeft size={15} /> All orders</Link>
          {canManage && po.stage !== "received" && (
            <button type="button" className={btnSecondary} disabled={busy} onClick={() => (po.on_hold ? run(() => togglePurchaseOrderHold(po.id), "Released from hold.") : setDialog("hold"))}>
              {po.on_hold ? <><PlayCircle size={15} /> Release hold</> : <><PauseCircle size={15} /> Put on hold</>}
            </button>
          )}
          {stage.action && canDoNext && (
            <button
              type="button"
              className={btnPrimary}
              disabled={busy || po.on_hold}
              title={po.on_hold ? "Release the hold first" : undefined}
              onClick={() => { if (isReceiveStep) fillRemaining(); setDialog(isReceiveStep ? "receive" : "next"); }}
            >
              {isReceiveStep ? <PackageCheck size={15} /> : null} {stage.action} {!isReceiveStep && <ArrowRight size={15} />}
            </button>
          )}
        </>
      )}
    >
      {po.on_hold && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-800">
          <PauseCircle size={15} className="mt-0.5 shrink-0" />
          <span><b>On hold.</b> {po.hold_reason || "No reason given."} It cannot move on until it is released.</span>
        </div>
      )}

      <div className="mb-4"><StageSteps stage={po.stage} /></div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <BigNumber label="Pieces ordered" value={fmtNum(po.total_ordered)} hint={po.stage === "held" ? "Follows the Product Master until sent" : "Frozen when sent"} tone="orange" />
        <BigNumber label="Pieces received" value={fmtNum(po.total_received)} hint="Into Godown 1" />
        <BigNumber label="Product Master total" value={fmtNum(po.pm_total)} hint="When the order was made" />
        <BigNumber label="PI value / piece" value={po.pi_value_per_piece ? `₹${fmtNum(po.pi_value_per_piece)}` : "—"} hint={po.pi_number || "Not received yet"} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 items-start">
        <Card
          className="min-w-0"
          title="Pieces by power"
          actions={(
            <Segmented
              label="What the matrix shows"
              value={mode}
              onChange={setMode}
              options={[{ id: "ordered", label: "Ordered" }, { id: "received", label: "Received" }, { id: "keep", label: "Pieces to keep" }]}
            />
          )}
        >
          <PowerMatrix
            rows={po.grid.rows}
            cols={po.grid.cols}
            colAxis={po.grid.col_axis}
            tone={mode === "ordered" ? "orange" : "blue"}
            value={(r, c) => byKey[cellKey(r, c)]?.[mode] ?? 0}
            cellTitle={(r, c) => {
              const row = byKey[cellKey(r, c)];
              return row ? `${fmtPower(r)} / ${fmtPower(c)} · keep ${row.keep} · in stock ${row.free_stock} · being made ${row.being_made} · on the way ${row.on_the_way} → ordered ${row.ordered} · received ${row.received}` : `${fmtPower(r)} / ${fmtPower(c)} · not ordered`;
            }}
          />
        </Card>

        <aside className="space-y-4">
          <Card title="Details">
            <dl className="text-[13px] space-y-2">
              {[
                ["Stage", <span key="s" className="flex items-center gap-1.5"><StagePill stage={po.stage} />{po.on_hold && <Pill tone="red">On hold</Pill>}</span>],
                ["Price line", <Link key="l" to="/purchasing/product-masters/$id" params={{ id: po.line.id }} className="font-semibold text-blue-700 hover:underline">{po.line.id}</Link>],
                ["Supplier", po.supplier_name],
                ["Company", po.company],
                ["Packing list", po.packing_list_ref || "—"],
                ["Created", `${po.created_by}, ${fmtDate(po.created_at)}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className="font-semibold text-slate-800 text-right">{v}</dd></div>
              ))}
            </dl>
          </Card>
          <Card title="History">
            <ol className="space-y-2.5">
              {po.history.map((h, i) => (
                <li key={`${h.at}${i}`} className="text-[12px] border-l-2 border-slate-200 pl-3">
                  <div className="font-semibold text-slate-800">{h.action}</div>
                  {h.note && <div className="text-slate-600">{h.note}</div>}
                  <div className="text-slate-500">{h.by} · {fmtDate(h.at)}</div>
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>

      {dialog === "next" && next && (
        <Modal
          title={stage.action}
          subtitle={`${po.po_number} moves to “${next.label}”: ${next.hint}`}
          onClose={() => setDialog(null)}
          footer={(
            <>
              <button type="button" className={btnSecondary} onClick={() => setDialog(null)}>Cancel</button>
              <button type="button" className={btnPrimary} disabled={busy || (next.id === "pi_received" && !Number(form.pi_value_per_piece))} onClick={() => run(() => advancePurchaseOrder(po.id, form), `Moved to ${next.label}.`)}>
                {busy && <Loader2 size={14} className="animate-spin" />} Confirm
              </button>
            </>
          )}
        >
          {next.id === "sent" && (
            <p className="text-[13px] text-slate-600">Send the order to the supplier yourself, then confirm here. From now on the {fmtNum(po.total_ordered)} pieces are frozen and no longer follow the Product Master.</p>
          )}
          {next.id === "pi_received" && (
            <>
              <p className="text-[13px] text-slate-600">The supplier's proforma invoice has come: payment is made and manufacturing starts. These pieces now count as “being made”.</p>
              <div>
                <label className={labelCls} htmlFor="pi-number">PI number</label>
                <input id="pi-number" className={inputCls} value={form.pi_number || ""} onChange={(e) => setForm({ ...form, pi_number: e.target.value })} />
              </div>
              <div>
                <label className={labelCls} htmlFor="pi-value">Value per piece (₹) <span className="text-rose-500">*</span></label>
                <input id="pi-value" type="number" min="0" className={inputCls} value={form.pi_value_per_piece || ""} onChange={(e) => setForm({ ...form, pi_value_per_piece: e.target.value })} />
              </div>
            </>
          )}
          {next.id === "packing_list" && (
            <div>
              <label className={labelCls} htmlFor="pl-ref">Packing list reference</label>
              <input id="pl-ref" className={inputCls} value={form.packing_list_ref || ""} onChange={(e) => setForm({ ...form, packing_list_ref: e.target.value })} />
            </div>
          )}
          {next.id === "shipped" && <p className="text-[13px] text-slate-600">The goods have left the supplier. These pieces now count as “on the way”.</p>}
          <div>
            <label className={labelCls} htmlFor="stage-note">Note (optional)</label>
            <input id="stage-note" className={inputCls} value={form.note || ""} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
        </Modal>
      )}

      {dialog === "receive" && (
        <Modal
          wide
          title="Receive goods into Godown 1"
          subtitle="Enter what actually arrived for each power. Anything not received stays “on the way”."
          onClose={() => setDialog(null)}
          footer={(
            <>
              <button type="button" className={btnSecondary} onClick={() => setReceiving({})}>Clear all</button>
              <button type="button" className={btnSecondary} onClick={() => setDialog(null)}>Cancel</button>
              <button type="button" className={btnPrimary} disabled={busy || receiveTotal === 0} onClick={() => run(() => receivePurchaseOrder(po.id, receiving).then((r) => { setReceiving({}); return r; }), "Pieces received into Godown 1.")}>
                Receive {fmtNum(receiveTotal)} pieces
              </button>
            </>
          )}
        >
          <div className="overflow-auto custom-scrollbar border border-slate-200 rounded-xl" style={{ maxHeight: "52vh" }}>
            <table className="w-full text-left" style={{ borderCollapse: "collapse" }}>
              <thead className="sticky top-0 z-10" style={{ background: "var(--soft-bg)" }}>
                <tr>
                  <th className={thCls}>SPH</th>
                  <th className={thCls}>{po.grid.col_axis === "add" ? "ADD" : "CYL"}</th>
                  <th className={`${thCls} text-right`}>Ordered</th>
                  <th className={`${thCls} text-right`}>Received before</th>
                  <th className={`${thCls} text-right`}>Received now</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((r) => (
                  <tr key={r.key} className="border-b border-slate-100">
                    <td className={`${tdCls} !py-1.5 font-semibold tabular-nums`}>{fmtPower(r.row)}</td>
                    <td className={`${tdCls} !py-1.5 font-semibold tabular-nums`}>{fmtPower(r.col)}</td>
                    <td className={`${tdCls} !py-1.5 text-right tabular-nums`}>{r.ordered}</td>
                    <td className={`${tdCls} !py-1.5 text-right tabular-nums`}>{r.received}</td>
                    <td className={`${tdCls} !py-1.5 text-right`}>
                      <input
                        type="number" min="0" aria-label={`Received now for ${fmtPower(r.row)} / ${fmtPower(r.col)}`}
                        className={`${inputCls} !w-24 !h-8 text-right ml-auto`}
                        value={receiving[r.key] ?? ""}
                        onChange={(e) => setReceiving((prev) => ({ ...prev, [r.key]: e.target.value }))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-slate-500">Filled with what is still due. Change any number that arrived short.</p>
        </Modal>
      )}

      {dialog === "hold" && (
        <Modal
          title="Put on hold"
          subtitle="It cannot move to the next step until it is released."
          onClose={() => setDialog(null)}
          footer={(
            <>
              <button type="button" className={btnSecondary} onClick={() => setDialog(null)}>Cancel</button>
              <button type="button" className={btnPrimary} disabled={busy} onClick={() => run(() => togglePurchaseOrderHold(po.id, form.reason), "Put on hold.")}>Put on hold</button>
            </>
          )}
        >
          <div>
            <label className={labelCls} htmlFor="hold-reason">Reason</label>
            <input id="hold-reason" className={inputCls} value={form.reason || ""} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
        </Modal>
      )}
    </PurchasingShell>
  );
}
