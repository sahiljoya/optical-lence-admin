import { useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ShoppingCart, Loader2, AlertTriangle } from "lucide-react";
import { getOrderCheck, listSuppliers, createPurchaseOrder, ignoreAlert, cellKey } from "@/services/purchaseApi";
import { hasPermission } from "@/lib/permissions";
import { notify } from "@/lib/notify";
import {
  PurchasingShell, Loading, ErrorNote, Card, StagePill, StageStrip, PowerMatrix, Segmented, useLoad,
  btnPrimary, btnSecondary, inputCls, labelCls, fmtNum, fmtPower, fmtDate,
} from "./shared";

function Box({ label, value, hint, tone = "plain" }) {
  const tones = { plain: "bg-white border-slate-200 text-slate-900", blue: "bg-blue-50 border-blue-200 text-blue-900", orange: "bg-orange-50 border-orange-300 text-orange-700" };
  return (
    <div className={`rounded-xl border px-4 py-3 min-w-[130px] flex-1 ${tones[tone]}`}>
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-slate-500">{hint}</div>}
    </div>
  );
}

const Sign = ({ children }) => <div className="text-2xl font-bold text-slate-400 px-1 self-center" aria-hidden="true">{children}</div>;

const VIEWS = [
  { id: "need", label: "Need" },
  { id: "keep", label: "Keep" },
  { id: "free", label: "In stock" },
  { id: "making", label: "Being made" },
  { id: "transit", label: "On the way" },
];

// "Check & make order": what the Product Master says to keep, what we already have, and so what
// we need. Then create the order, or ignore it.
export function NewOrder() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const lineId = search?.pm;
  const { data, loading, error } = useLoad(() => Promise.all([getOrderCheck(lineId), listSuppliers()]), [lineId]);
  const [view, setView] = useState("need");
  const [supplierId, setSupplierId] = useState("");
  const [busy, setBusy] = useState("");
  const canManage = hasPermission("MANAGE_PURCHASING");

  const check = data?.[0];
  const suppliers = (data?.[1] || []).filter((s) => s.is_active);
  const chosenSupplier = supplierId || suppliers[0]?.id || "";
  const crumbs = [
    { label: "Super Masters", to: "/purchasing" },
    ...(check ? [
      { label: check.pm.master_code, to: "/purchasing/super-masters/$id", params: { id: check.pm.master_id } },
      { label: `${check.line.product} ${check.line.range_label}`, to: "/purchasing/product-masters/$id", params: { id: check.line.id } },
    ] : []),
    { label: "Check & make order" },
  ];

  const create = async () => {
    setBusy("create");
    try {
      const po = await createPurchaseOrder({ lineId, supplierId: chosenSupplier });
      notify.success(`${po.po_number} created. Next step: send it to the supplier.`);
      navigate({ to: "/purchasing/orders/$id", params: { id: po.id } });
    } catch (e) {
      notify.error(e.message);
      setBusy("");
    }
  };

  const ignore = async () => {
    setBusy("ignore");
    try {
      await ignoreAlert(lineId);
      notify.success("Ignored. No order made.");
      navigate({ to: "/purchasing/product-masters/$id", params: { id: lineId } });
    } catch (e) {
      notify.error(e.message);
      setBusy("");
    }
  };

  return (
    <PurchasingShell crumbs={crumbs} icon={ShoppingCart} title="Check & make order" subtitle={check ? `${check.line.product} ${check.line.range_label} · Product Master from ${check.pm.master_code} · ${check.pm.taken_text}` : undefined}>
      {loading && !data && <Loading />}
      {error && <ErrorNote>{error}</ErrorNote>}
      {check && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-stretch gap-2">
            <Box label="Keep" value={fmtNum(check.totals.keep)} hint="Product Master" tone="blue" />
            <Sign>−</Sign>
            <Box label="In stock" value={fmtNum(check.totals.free)} hint="In the godowns" />
            <Sign>−</Sign>
            <Box label="Being made" value={fmtNum(check.totals.making)} hint="Supplier is making" />
            <Sign>−</Sign>
            <Box label="On the way" value={fmtNum(check.totals.transit)} hint="Shipped to us" />
            <Sign>=</Sign>
            <Box label="Need" value={fmtNum(check.totals.need)} hint="Pieces to order" tone="orange" />
          </div>
          <p className="text-[12px] text-slate-500">
            Worked out for each power on its own. Extra stock of one power does not cover a shortage of another, so “Need” can be a little more than Keep minus the rest.
            {!check.line.last_counted && <span className="text-amber-700 font-semibold"> Stock for this product has not been counted yet.</span>}
            {check.line.last_counted && ` Stock last counted ${fmtDate(check.line.last_counted)}.`}
          </p>

          <Card className="mb-4" title={check.totals.need > 0 ? `Order ${fmtNum(check.totals.need)} pieces?` : "Nothing to order"}>
            {check.open_po ? (
              <div className="space-y-2">
                <Link to="/purchasing/orders/$id" params={{ id: check.open_po.id }} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2.5 hover:border-blue-300 max-w-md">
                  <span className="text-[13px] font-bold text-blue-700">{check.open_po.po_number} is already open</span>
                  <StagePill stage={check.open_po.stage} />
                </Link>
                <p className="text-[12px] text-slate-500">Finish that order first. Only one open order per product.</p>
              </div>
            ) : check.totals.need === 0 ? (
              <p className="text-[13px] text-slate-600">What we have already covers the Product Master.</p>
            ) : canManage ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                <div className="space-y-3">
                  <div>
                    <label className={labelCls} htmlFor="po-supplier">Supplier</label>
                    {suppliers.length === 0 ? (
                      <div className="flex items-start gap-2 text-[12px] text-amber-800"><AlertTriangle size={14} className="mt-0.5" /> No supplier yet. <Link to="/purchasing/suppliers" className="underline">Add one</Link>.</div>
                    ) : (
                      <select id="po-supplier" className={inputCls} value={chosenSupplier} onChange={(e) => setSupplierId(e.target.value)}>
                        {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.lead_time_months} months</option>)}
                      </select>
                    )}
                  </div>
                  <div className="text-[12px] text-slate-600">Company: <b className="text-slate-900">{check.company}</b></div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button type="button" className={`${btnPrimary} flex-1 !h-11 !text-[14px]`} disabled={!!busy || !chosenSupplier} onClick={create}>
                      {busy === "create" ? <Loader2 size={15} className="animate-spin" /> : <ShoppingCart size={15} />} Create order · {fmtNum(check.totals.need)} pieces
                    </button>
                    <button type="button" className={btnSecondary} disabled={!!busy} onClick={ignore}>
                      {busy === "ignore" && <Loader2 size={14} className="animate-spin" />} Ignore, don't order now
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">Nothing goes to the supplier yet. The order starts as “Held”; you send it yourself.</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="text-[12px] font-bold text-slate-700 mb-2.5">An order goes through 6 steps</div>
                  <StageStrip current={check.open_po?.stage} />
                </div>
              </div>
            ) : null}
          </Card>

          <Card className="min-w-0 w-full" title="For each power" actions={<Segmented label="What the grid shows" value={view} onChange={setView} options={VIEWS} />}>
            <PowerMatrix
              fullWidth
              rows={check.rows}
              cols={check.cols}
              colAxis={check.col_axis}
              tone={view === "need" ? "orange" : "blue"}
              value={(r, c) => check.cells[cellKey(r, c)]?.[view] ?? null}
              cellTitle={(r, c) => {
                const x = check.cells[cellKey(r, c)];
                return `${fmtPower(r)} / ${fmtPower(c)} · keep ${x.keep} − in stock ${x.free} − being made ${x.making} − on the way ${x.transit} = need ${x.need}`;
              }}
            />
          </Card>
        </div>
      )}
    </PurchasingShell>
  );
}
