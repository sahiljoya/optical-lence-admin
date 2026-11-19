import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ShoppingCart, RefreshCw, AlertTriangle, BellRing, Save, Loader2, Lock } from "lucide-react";
import { getProductMaster, setProductMasterTotal, saveProductMasterAlert, switchToLatestMasterVersion, cellKey } from "@/services/purchaseApi";
import { spreadTotal, sumValues } from "@/services/purchaseMath";
import { hasPermission } from "@/lib/permissions";
import { notify } from "@/lib/notify";
import { useConfirm } from "@/hooks/useConfirm";
import {
  PurchasingShell, Loading, ErrorNote, Card, StagePill, PowerMatrix, Segmented, SalesHelper, useLoad,
  btnPrimary, btnSecondary, inputCls, labelCls, fmtNum, fmtPower, fmtDate,
} from "./shared";

function Fact({ label, value, to, params }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 min-w-0">
      <div className="text-[11px] font-semibold text-slate-500">{label}</div>
      {to ? <Link to={to} params={params} className="text-[14px] font-bold text-blue-700 hover:underline">{value}</Link> : <div className="text-[13px] font-bold text-slate-900 tabular-nums leading-snug break-words">{value}</div>}
    </div>
  );
}

function AlertCard({ data, onSaved, canManage }) {
  const a = data.pm.alert;
  const [qtyOn, setQtyOn] = useState(a.qty !== null);
  const [qty, setQty] = useState(a.qty ?? Math.round(data.pm.total * 0.4));
  const [timeOn, setTimeOn] = useState(a.every_months !== null);
  const [everyMonths, setEveryMonths] = useState(a.every_months ?? 2);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      onSaved(await saveProductMasterAlert(data.line.id, { qty: qtyOn ? qty : null, every_months: timeOn ? everyMonths : null }));
      notify.success("Alert saved.");
    } catch (e) {
      notify.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card id="alert" title="Alert" subtitle="Whichever comes first.">
      <fieldset disabled={!canManage} className="space-y-3">
        <label className="flex flex-wrap items-center gap-2 text-[13px] text-slate-800 cursor-pointer">
          <input type="checkbox" checked={qtyOn} onChange={(e) => setQtyOn(e.target.checked)} />
          When we have
          <input type="number" min="0" aria-label="Pieces" className={`${inputCls} !w-24 !h-8`} value={qty} disabled={!qtyOn} onChange={(e) => setQty(e.target.value)} />
          pieces or less
        </label>
        <label className="flex flex-wrap items-center gap-2 text-[13px] text-slate-800 cursor-pointer">
          <input type="checkbox" checked={timeOn} onChange={(e) => setTimeOn(e.target.checked)} />
          Every
          <input type="number" min="1" aria-label="Months" className={`${inputCls} !w-16 !h-8`} value={everyMonths} disabled={!timeOn} onChange={(e) => setEveryMonths(e.target.value)} />
          months
        </label>
        <p className="text-[11px] text-slate-500">
          We have now: <b className="text-slate-700">{fmtNum(data.alert_state.have)} pieces</b>. Last order: {data.pm.last_order_at ? fmtDate(data.pm.last_order_at) : "none yet"}.
        </p>
        {canManage && <button type="button" className={`${btnSecondary} w-full`} disabled={busy} onClick={save}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save alert</button>}
      </fieldset>
    </Card>
  );
}

function Detail({ data, onChange }) {
  const canManage = hasPermission("MANAGE_PURCHASING");
  const { confirm, confirmDialog } = useConfirm();
  const [mode, setMode] = useState("keep");
  const [draft, setDraft] = useState(String(data.pm.total));
  const [basis, setBasis] = useState(data.pm.basis);
  const [months, setMonths] = useState(data.pm.months);
  const [busy, setBusy] = useState("");

  useEffect(() => { setDraft(String(data.pm.total)); }, [data.pm.total]);

  const total = Math.max(0, Math.floor(Number(draft) || 0));
  const changed = total !== data.pm.total;
  const ratios = useMemo(() => Object.fromEntries(Object.entries(data.cells).map(([k, c]) => [k, c.ratio])), [data.cells]);
  const pieces = useMemo(() => spreadTotal(ratios, total), [ratios, total]);
  const keepSum = sumValues(pieces);

  const saveTotal = async () => {
    setBusy("total");
    try {
      onChange(await setProductMasterTotal(data.line.id, { total, basis, months }));
      notify.success("Total saved. Every power changed by its mix.");
    } catch (e) {
      notify.error(e.message);
    } finally {
      setBusy("");
    }
  };

  const updateVersion = async () => {
    const ok = await confirm(`Use the mix from ${data.master.code} v${data.master.latest_version}? The total stays ${fmtNum(data.pm.total)} pieces.`, { title: "Use the new Super Master", acceptLabel: "Use it" });
    if (!ok) return;
    setBusy("version");
    try {
      onChange(await switchToLatestMasterVersion(data.line.id));
      notify.success(`Now using ${data.master.code} v${data.master.latest_version}.`);
    } catch (e) {
      notify.error(e.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      {data.alert_state.active && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-900">
          <div className="flex items-start gap-2">
            <BellRing size={16} className="mt-0.5 shrink-0" />
            <div>{data.alert_state.reasons.map((r) => <div key={r.kind}>{r.text}</div>)}</div>
          </div>
          <Link to="/purchasing/orders/new" search={{ pm: data.line.id }} className={btnPrimary}><ShoppingCart size={15} /> Check & make order</Link>
        </div>
      )}

      {data.master.latest_version > data.master.version_used && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900">
          <span className="flex items-start gap-2"><AlertTriangle size={15} className="mt-0.5 shrink-0" /> {data.master.code} has a newer upload (v{data.master.latest_version}). This Product Master still uses v{data.master.version_used}.</span>
          {canManage && <button type="button" className={`${btnSecondary} !h-8 !text-[12px]`} disabled={busy === "version"} onClick={updateVersion}><RefreshCw size={13} /> Use v{data.master.latest_version}</button>}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
        <Fact label="Super Master" value={`${data.master.code} v${data.master.version_used}`} to="/purchasing/super-masters/$id" params={{ id: data.master.id }} />
        <Fact label="Powers taken" value={data.taken_text} />
        <Fact label="Total pieces" value={fmtNum(data.pm.total)} />
        <Fact label="We have now" value={`${fmtNum(data.alert_state.have)} pieces`} />
        <Fact label="Alert" value={data.alert_text} />
      </div>
      {data.outside_product_range && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> Some powers taken are outside this product's range in the price file ({data.line.range_label}).
        </div>
      )}

      <Card
        className="min-w-0 w-full mb-4"
        title={mode === "keep" ? "Pieces to keep, for each power" : "Mix (ratio) from the Super Master"}
        subtitle={mode === "keep"
          ? `${changed ? `Preview, not saved: ${fmtNum(data.pm.total)} → ${fmtNum(total)} pieces. ` : ""}Each power is rounded down, so the grid adds up to ${fmtNum(keepSum)}.`
          : "These come from the Super Master and cannot be changed here."}
        actions={<Segmented label="What the grid shows" value={mode} onChange={setMode} options={[{ id: "keep", label: "Pieces" }, { id: "ratio", label: "Mix" }]} />}
      >
        <PowerMatrix
          fullWidth
          rows={data.rows}
          cols={data.cols}
          colAxis={data.master.col_axis}
          value={(r, c) => (mode === "keep" ? pieces[cellKey(r, c)] : data.cells[cellKey(r, c)]?.ratio) ?? null}
          cellTitle={(r, c) => `${fmtPower(r)} / ${fmtPower(c)} · mix ${data.cells[cellKey(r, c)]?.ratio} → keep ${pieces[cellKey(r, c)]} pieces`}
        />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
        <Card title="Total pieces" subtitle="The only number you can change. Each power follows its mix.">
          <div className="space-y-3">
            <div>
              <label className={labelCls} htmlFor="pm-total">Total pieces</label>
              <input id="pm-total" type="number" min="1" disabled={!canManage} className={`${inputCls} !h-11 !text-[18px] font-bold tabular-nums`} value={draft} onChange={(e) => setDraft(e.target.value)} />
            </div>
            {canManage && <SalesHelper figures={data.figures} basis={basis} months={months} onBasis={setBasis} onMonths={setMonths} onUse={(v) => setDraft(String(v))} />}
            {canManage && (
              <div className="flex gap-2">
                <button type="button" className={`${btnPrimary} flex-1`} disabled={!changed || total <= 0 || busy === "total"} onClick={saveTotal}>
                  {busy === "total" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save total
                </button>
                {changed && <button type="button" className={btnSecondary} onClick={() => setDraft(String(data.pm.total))}>Undo</button>}
              </div>
            )}
            <div className="flex items-start gap-1.5 text-[11px] text-slate-500"><Lock size={12} className="mt-0.5 shrink-0" /> The mix comes from the Super Master.</div>
          </div>
        </Card>

        <AlertCard key={`${data.pm.alert.set_at}`} data={data} onSaved={onChange} canManage={canManage} />

        <div className="space-y-4">
          <Card title="Make an order" subtitle="See what we have and what we need. Then order it, or not.">
            {data.open_po ? (
              <Link to="/purchasing/orders/$id" params={{ id: data.open_po.id }} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2.5 hover:border-blue-300">
                <span className="text-[13px] font-bold text-blue-700">{data.open_po.po_number} is open</span>
                <StagePill stage={data.open_po.stage} />
              </Link>
            ) : (
              <Link to="/purchasing/orders/new" search={{ pm: data.line.id }} className={`${btnPrimary} w-full !h-11 !text-[14px]`}><ShoppingCart size={16} /> Check & make order</Link>
            )}
          </Card>

          <Card title="History">
            <ol className="space-y-2">
              {data.pm.history.slice(0, 5).map((h, i) => (
                <li key={`${h.at}${i}`} className="text-[12px] border-l-2 border-slate-200 pl-2.5">
                  <div className="font-semibold text-slate-800">{h.action}</div>
                  <div className="text-slate-500">{h.by} · {fmtDate(h.at)}</div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
      {confirmDialog}
    </>
  );
}

export function ProductMasterView() {
  const { id } = useParams({ strict: false });
  const { data, loading, error, setData } = useLoad(() => getProductMaster(id), [id]);
  const crumbs = [
    { label: "Product Masters", to: "/purchasing/product-masters" },
    ...(data ? [{ label: data.master.code, to: "/purchasing/super-masters/$id", params: { id: data.master.id } }] : []),
    { label: data ? `${data.line.product} ${data.line.range_label}` : id },
  ];

  return (
    <PurchasingShell
      crumbs={crumbs}
      title={data ? `${data.line.product} ${data.line.range_label}` : "Product Master"}
      subtitle={data ? `Product Master · ${data.line.lens_type} · index ${data.line.index}${data.line.diameter ? ` · ${data.line.diameter} mm` : ""} · sells ${fmtNum(data.line.monthly_sale)} pieces a month` : undefined}
      actions={data && (
        data.open_po ? (
          <Link to="/purchasing/orders/$id" params={{ id: data.open_po.id }} className={btnSecondary}>
            <span className="font-bold text-blue-700">{data.open_po.po_number} is open</span>
            <StagePill stage={data.open_po.stage} />
          </Link>
        ) : (
          <Link to="/purchasing/orders/new" search={{ pm: data.line.id }} className={btnPrimary}><ShoppingCart size={15} /> Check & make order</Link>
        )
      )}
    >
      {loading && !data && <Loading />}
      {error && <ErrorNote>{error}</ErrorNote>}
      {data && <Detail data={data} onChange={setData} />}
    </PurchasingShell>
  );
}
