import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { Layers, ArrowLeft, Lock, RefreshCw, AlertTriangle, Calculator, Save, Loader2, Check } from "lucide-react";
import {
  getProductMaster, listSuppliers, createProductMaster, setProductMasterTotal, switchToLatestMasterVersion, createPurchaseOrder, cellKey,
} from "@/services/purchaseApi";
import { ownRatios, spreadTotal, shortage, inside, sumValues } from "@/services/purchaseMath";
import { hasPermission } from "@/lib/permissions";
import { notify } from "@/lib/notify";
import { useConfirm } from "@/hooks/useConfirm";
import {
  PurchasingShell, Loading, ErrorNote, Card, StagePill, BigNumber, FlowStrip, PowerMatrix, Segmented, StepCard, StageStrip, useLoad,
  btnPrimary, btnSecondary, inputCls, labelCls, fmtNum, fmtPower, fmtDate,
} from "./shared";

// The four things that decide which Super Master a line can use. They come from the price line
// itself (the catalog product), so nothing is typed here.
function LineFacts({ line }) {
  const facts = [
    ["Lens type", line.lens_type],
    ["Range", line.range_text],
    ["Index", line.index ?? "—"],
    ["Diameter", line.diameter ? `${line.diameter} mm` : "Not set"],
  ];
  return (
    <div className="mb-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">This price line (from the price file)</div>
      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {facts.map(([k, v]) => (
          <div key={k} className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
            <dt className="text-[11px] font-semibold text-slate-500">{k}</dt>
            <dd className="text-[13px] font-bold text-slate-900 tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function FitRow({ label, value }) {
  return (
    <li className="flex items-start gap-1.5 text-[11px] text-slate-600">
      <Check size={12} className="mt-0.5 shrink-0 text-emerald-600" aria-label="Matches" />
      <span><span className="font-semibold text-slate-700">{label}:</span> {value}</span>
    </li>
  );
}

function Legend({ items }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[12px] text-slate-600">
      {items.map(([swatch, text]) => (
        <span key={text} className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3.5 h-3.5 rounded" style={swatch} /> {text}
        </span>
      ))}
    </div>
  );
}

const TAKEN_SWATCH = { background: "rgba(37,99,235,0.35)" };
const LEFT_OUT_SWATCH = { background: "#f1f5f9", backgroundImage: "repeating-linear-gradient(135deg, transparent 0 3px, rgba(148,163,184,0.5) 3px 4px)" };

// Total from sales: net monthly sale (chosen basis) × months.
function SalesHelper({ figures, basis, months, onBasis, onMonths, onUse, disabled }) {
  const monthly = figures.find((f) => f.id === basis)?.monthly ?? 0;
  const result = monthly * (Number(months) || 0);
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
      <div className="text-[12px] font-bold text-slate-700 flex items-center gap-1.5"><Calculator size={13} /> Work it out from sales</div>
      <div className="grid grid-cols-2 gap-1.5">
        {figures.map((f) => (
          <button
            key={f.id}
            type="button"
            disabled={disabled}
            aria-pressed={basis === f.id}
            onClick={() => onBasis(f.id)}
            className={`rounded-lg border px-2 py-1.5 text-left cursor-pointer disabled:cursor-not-allowed ${basis === f.id ? "border-blue-500 bg-white" : "border-transparent bg-white/60 hover:bg-white"}`}
          >
            <div className="text-[10px] font-semibold text-slate-500">{f.label}</div>
            <div className="text-[13px] font-bold text-slate-900 tabular-nums">{fmtNum(f.monthly)} / mo</div>
          </button>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <div className="w-20">
          <label className="block text-[11px] font-bold text-slate-600 mb-1" htmlFor="helper-months">Months</label>
          <input id="helper-months" type="number" min="1" disabled={disabled} className={`${inputCls} !h-8`} value={months} onChange={(e) => onMonths(e.target.value)} />
        </div>
        <div className="flex-1 text-[12px] text-slate-600 pb-1.5 tabular-nums">
          {fmtNum(monthly)} × {months || 0} = <b className="text-slate-900">{fmtNum(result)}</b>
        </div>
        <button type="button" className={`${btnSecondary} !h-8 !text-[12px]`} disabled={disabled || result <= 0} onClick={() => onUse(result)}>Use</button>
      </div>
    </div>
  );
}

const STOCK_VIEWS = [
  { id: "all", label: "All we have" },
  { id: "free", label: "In stock" },
  { id: "making", label: "Being made" },
  { id: "transit", label: "On the way" },
];

function ProductMasterBuilder({ data, suppliers, onChange, scrollToOrder }) {
  const isNew = !data.pm;
  const { line, inventory: inv } = data;
  const canManage = hasPermission("MANAGE_PURCHASING");
  const navigate = useNavigate();
  const { confirm, confirmDialog } = useConfirm();
  const [masterId, setMasterId] = useState(isNew ? data.candidates[0]?.id || "" : data.pm.master_id);
  const [draft, setDraft] = useState(() => String(isNew ? (data.figures.find((f) => f.id === 3)?.monthly || 0) * 6 : data.pm.total));
  const [basis, setBasis] = useState(isNew ? 3 : data.pm.basis);
  const [months, setMonths] = useState(isNew ? 6 : data.pm.months);
  const [note, setNote] = useState("");
  const [stockView, setStockView] = useState("all");
  const [supplierId, setSupplierId] = useState(suppliers.find((s) => s.is_active)?.id || "");
  const [busy, setBusy] = useState("");

  useEffect(() => { if (!isNew) setDraft(String(data.pm.total)); }, [isNew, data.pm?.total]);
  useEffect(() => {
    if (scrollToOrder) document.getElementById("step-4")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [scrollToOrder]);

  const grid = isNew ? data.candidates.find((c) => c.id === masterId) || null : data.master;
  const total = Math.max(0, Math.floor(Number(draft) || 0));
  const changed = !isNew && total !== data.pm.total;

  // Steps 1, 3 and 4 worked out here with the same maths the order uses, so they move as you type.
  const own = useMemo(() => (grid ? ownRatios(grid, line.row_range, line.col_range) : null), [grid, line]);
  const pairs = useMemo(() => (own ? spreadTotal(own.ratios, total) : {}), [own, total]);
  const short = useMemo(() => {
    const out = {};
    Object.keys(pairs).forEach((k) => { out[k] = shortage(pairs[k], inv.cells[k]); });
    return out;
  }, [pairs, inv]);
  const keepSum = sumValues(pairs);
  const shortSum = sumValues(short);
  const taken = own ? Object.keys(own.ratios).length : 0;
  const allPowers = grid ? grid.rows.length * grid.cols.length : 0;
  const isTaken = (r, c) => inside(r, line.row_range) && inside(c, line.col_range);
  const goTo = (n) => () => document.getElementById(`step-${n}`)?.scrollIntoView?.({ behavior: "smooth", block: "start" });

  const run = async (key, action, message) => {
    setBusy(key);
    try {
      const next = await action();
      notify.success(message);
      return next;
    } catch (e) {
      notify.error(e.message);
      return null;
    } finally {
      setBusy("");
    }
  };

  const createPm = async () => {
    const next = await run("pm", () => createProductMaster(line.id, { masterId, total, basis, months }), "Product Master created. Step 4 now shows what to order.");
    if (next) onChange(next);
  };

  const saveTotal = async () => {
    const next = await run("pm", () => setProductMasterTotal(line.id, { total, basis, months, note }), "Total saved. Every power was updated by its ratio.");
    if (next) { setNote(""); onChange(next); }
  };

  const updateVersion = async () => {
    const ok = await confirm(`Use the ratios of ${data.master.code} v${data.master.latest_version}? The total stays ${fmtNum(data.pm.total)} pairs; each power is worked out again from the new ratios.`, { title: "Update ratios", acceptLabel: "Update" });
    if (!ok) return;
    const next = await run("version", () => switchToLatestMasterVersion(line.id), `Now using ${data.master.code} v${data.master.latest_version}.`);
    if (next) onChange(next);
  };

  const createPo = async () => {
    const po = await run("po", () => createPurchaseOrder({ lineId: line.id, supplierId }), "Purchase order created as Held.");
    if (po) navigate({ to: "/purchasing/orders/$id", params: { id: po.id } });
  };

  const stockValue = (r, c) => {
    const cell = inv.cells[cellKey(r, c)];
    if (!cell) return null;
    return stockView === "all" ? cell.free + cell.making + cell.transit : cell[stockView];
  };

  const orderBlocked = isNew ? "Create the Product Master in step 3 first." : changed ? "Save or undo the new total in step 3 first." : shortSum === 0 ? "Nothing is short: what we have covers the Product Master." : !supplierId ? "Add a supplier first." : "";

  return (
    <>
      <FlowStrip steps={[
        { label: "Super Master", value: grid ? `${grid.code} v${isNew ? grid.version : grid.version_used}` : "None fits", hint: grid ? `${taken} of ${allPowers} powers taken` : "Upload one first", done: !isNew, onClick: goTo(1) },
        { label: "Stock now", value: `${fmtNum(inv.have)} pairs`, hint: `${fmtNum(inv.totals.free)} in stock · ${fmtNum(inv.totals.making + inv.totals.transit)} coming`, done: true, onClick: goTo(2) },
        { label: "Product Master", value: isNew ? "Not created" : `${fmtNum(data.pm.total)} pairs`, hint: "Pairs to keep", done: !isNew, active: isNew || changed, onClick: goTo(3) },
        { label: "Order", value: `${fmtNum(shortSum)} short`, hint: data.open_po ? `${data.open_po.po_number} is open` : "Make the purchase order", done: !!data.open_po, active: !isNew && !changed && !data.open_po && shortSum > 0, onClick: goTo(4) },
      ]} />

      <div className="space-y-4">
        {/* STEP 1 — which part of the Super Master this line takes */}
        <StepCard
          n={1}
          id="step-1"
          title={isNew ? "Choose the Super Master — see the part this line takes" : `Super Master ${data.master.code} — the part this line takes`}
          subtitle="A Super Master covers a whole range. This line keeps only its own powers (blue). The rest is left out and is 0 for this line."
        >
          <LineFacts line={line} />

          {!isNew && data.master.latest_version > data.master.version_used && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900">
              <span className="flex items-start gap-2"><AlertTriangle size={15} className="mt-0.5 shrink-0" /> {data.master.code} has a newer upload (v{data.master.latest_version}, {fmtDate(data.master.latest_uploaded_at)} by {data.master.latest_uploaded_by}). This Product Master still uses v{data.master.version_used}.</span>
              {canManage && <button type="button" className={`${btnSecondary} !h-8 !text-[12px]`} disabled={busy === "version"} onClick={updateVersion}><RefreshCw size={13} /> Use v{data.master.latest_version}</button>}
            </div>
          )}

          {isNew && data.candidates.length === 0 ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-900">
              <b>No Super Master covers this line yet.</b> Upload one whose lens type, range, index and diameter cover the four values above.
              <div className="mt-2"><Link to="/purchasing/super-masters" className={btnPrimary}>Go to Super Masters</Link></div>
            </div>
          ) : (
            <div className={`grid grid-cols-1 ${isNew ? "xl:grid-cols-[300px_1fr]" : ""} gap-4`}>
              {isNew && (
                <fieldset className="space-y-2" disabled={!canManage}>
                  <legend className="text-[12px] font-bold text-slate-700 mb-1.5">Masters that match all four (best first)</legend>
                  {data.candidates.map((c, i) => (
                    <label key={c.id} className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer ${masterId === c.id ? "border-blue-500 bg-blue-50/60" : "border-slate-200 hover:bg-slate-50"}`}>
                      <input type="radio" name="master" className="mt-1" checked={masterId === c.id} onChange={() => setMasterId(c.id)} />
                      <span className="min-w-0 flex-1">
                        <span className="text-[13px] font-bold text-slate-900">{c.code} · {c.title}</span>
                        {i === 0 && <span className="ml-2 text-[11px] font-semibold text-emerald-700">Best match</span>}
                        <span className="block text-[11px] text-slate-500 mb-1">{c.why} · v{c.version}</span>
                        <ul className="space-y-0.5">
                          <FitRow label="Lens type" value={c.lens_types.join(", ")} />
                          <FitRow label="Range" value={c.range_text} />
                          <FitRow label="Index" value={c.index ?? "any"} />
                          <FitRow label="Diameter" value={c.diameter ? `${c.diameter} mm` : "any"} />
                        </ul>
                      </span>
                    </label>
                  ))}
                </fieldset>
              )}
              {grid && (
                <div className="min-w-0">
                  <div className="text-[13px] text-slate-700 mb-2">
                    <b className="text-slate-900">{grid.code}</b> covers {grid.range_text}. This line takes <b className="text-slate-900">{taken}</b> of its {allPowers} powers.
                  </div>
                  <PowerMatrix
                    rows={grid.rows}
                    cols={grid.cols}
                    colAxis={grid.col_axis}
                    value={(r, c) => grid.cells[cellKey(r, c)] ?? 0}
                    isOut={(r, c) => !isTaken(r, c)}
                    maxHeight="52vh"
                    cellTitle={(r, c) => `${fmtPower(r)} / ${fmtPower(c)} · ratio ${grid.cells[cellKey(r, c)] ?? 0} · taken for this line`}
                  />
                  <Legend items={[[TAKEN_SWATCH, `Taken for this line — ${taken} powers (the totals count only these)`], [LEFT_OUT_SWATCH, `Left out — ${allPowers - taken} powers, 0 for this line`]]} />
                  <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1"><Lock size={11} /> These are ratios from the uploaded file. They cannot be edited.</p>
                </div>
              )}
            </div>
          )}
        </StepCard>

        {/* STEP 2 — what we already have */}
        <StepCard
          n={2}
          id="step-2"
          title="Stock now — what we already have"
          subtitle="For every power of this line: pairs in stock, pairs the supplier is making, and pairs on the way."
          actions={<Segmented label="What the matrix shows" options={STOCK_VIEWS} value={stockView} onChange={setStockView} />}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
            <BigNumber label="In stock" value={fmtNum(inv.totals.free)} hint="All godowns, minus confirmed orders" />
            <BigNumber label="Being made" value={fmtNum(inv.totals.making)} hint="Orders at PI received / Packing list" />
            <BigNumber label="On the way" value={fmtNum(inv.totals.transit)} hint="Shipped, not received yet" />
            <BigNumber label="All we have" value={fmtNum(inv.have)} tone="blue" hint="Counted against the Product Master" />
          </div>
          {!line.last_counted && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" /> This line has not been stock-counted yet, so “in stock” may not be exact.
            </div>
          )}
          <PowerMatrix rows={inv.rows} cols={inv.cols} colAxis={inv.col_axis} value={stockValue} maxHeight="48vh"
            cellTitle={(r, c) => { const s = inv.cells[cellKey(r, c)]; return `${fmtPower(r)} / ${fmtPower(c)} · in stock ${s.free} · being made ${s.making} · on the way ${s.transit}`; }} />
          {line.last_counted && <p className="text-[11px] text-slate-500 mt-2">Stock last counted {fmtDate(line.last_counted)}.</p>}
        </StepCard>

        {/* STEP 3 — the Product Master */}
        <StepCard
          n={3}
          id="step-3"
          muted={!grid}
          title={isNew ? "Product Master — set how many pairs to keep" : "Product Master — how many pairs to keep"}
          subtitle="The total is spread over the taken powers by their ratios. Only the total can change; every power follows its ratio."
        >
          {!grid ? (
            <p className="text-[13px] text-slate-500">Needs a Super Master first (step 1).</p>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-4">
              <div className="space-y-3">
                <div>
                  <label className={labelCls} htmlFor="pm-total">Total pairs</label>
                  <input id="pm-total" type="number" min="1" disabled={!canManage} className={`${inputCls} !h-11 !text-[18px] font-bold tabular-nums`} value={draft} onChange={(e) => setDraft(e.target.value)} />
                  {!isNew && <div className="text-[11px] text-slate-500 mt-1">Saved: {fmtNum(data.pm.total)} pairs</div>}
                </div>
                {canManage && <SalesHelper figures={data.figures} basis={basis} months={months} onBasis={setBasis} onMonths={setMonths} onUse={(v) => setDraft(String(v))} />}
                {canManage && changed && (
                  <div>
                    <label className={labelCls} htmlFor="pm-note">Note (optional)</label>
                    <input id="pm-note" className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why is the total changing?" />
                  </div>
                )}
                {canManage && isNew && (
                  <button type="button" className={`${btnPrimary} w-full`} disabled={busy === "pm" || !masterId || total <= 0} onClick={createPm}>
                    {busy === "pm" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Create Product Master
                  </button>
                )}
                {canManage && !isNew && (
                  <div className="flex gap-2">
                    <button type="button" className={`${btnPrimary} flex-1`} disabled={!changed || total <= 0 || busy === "pm"} onClick={saveTotal}>
                      {busy === "pm" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save total
                    </button>
                    {changed && <button type="button" className={btnSecondary} onClick={() => setDraft(String(data.pm.total))}>Undo</button>}
                  </div>
                )}
                {!isNew && (
                  <div className="pt-1">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">History</div>
                    <ol className="space-y-2">
                      {data.pm.history.slice(0, 3).map((h, i) => (
                        <li key={`${h.at}${i}`} className="text-[12px] border-l-2 border-slate-200 pl-2.5">
                          <div className="font-semibold text-slate-800">{h.action}</div>
                          {h.note && <div className="text-slate-600">{h.note}</div>}
                          <div className="text-slate-500">{h.by} · {fmtDate(h.at)}</div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
              <div className="min-w-0">
                {(isNew || changed) && (
                  <div className="mb-2 inline-flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-[12px] font-semibold text-blue-800">
                    {isNew ? "Preview — not saved until you create it." : `Preview: ${fmtNum(data.pm.total)} → ${fmtNum(total)} pairs. Not saved yet.`}
                  </div>
                )}
                <PowerMatrix rows={own.rows} cols={own.cols} colAxis={grid.col_axis} value={(r, c) => pairs[cellKey(r, c)] ?? null} maxHeight="52vh"
                  cellTitle={(r, c) => `${fmtPower(r)} / ${fmtPower(c)} · ratio ${own.ratios[cellKey(r, c)]} → keep ${pairs[cellKey(r, c)]} pairs`} />
                <p className="text-[12px] text-slate-500 mt-2">
                  {fmtNum(total)} pairs spread by the ratios. Each power is rounded down, so the grid adds up to <b className="text-slate-700">{fmtNum(keepSum)}</b>
                  {total - keepSum > 0 ? ` (${fmtNum(total - keepSum)} lost to rounding).` : "."}
                </p>
              </div>
            </div>
          )}
        </StepCard>

        {/* STEP 4 — what is short becomes the purchase order */}
        <StepCard
          n={4}
          id="step-4"
          muted={!grid}
          title="What is short → purchase order"
          subtitle="For every power: keep (step 3) − what we have (step 2). Never below 0 — extra stock of one power never cancels a shortage of another."
        >
          {!grid ? (
            <p className="text-[13px] text-slate-500">Needs a Super Master first (step 1).</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <BigNumber label="Keep" value={fmtNum(keepSum)} hint="Step 3" />
                <BigNumber label="Have" value={fmtNum(inv.have)} hint="Step 2" />
                <BigNumber label="Short = order" value={fmtNum(shortSum)} tone="orange" hint="Power by power" />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
                <div className="min-w-0">
                  <PowerMatrix rows={own.rows} cols={own.cols} colAxis={grid.col_axis} tone="orange" value={(r, c) => short[cellKey(r, c)] ?? null} maxHeight="52vh"
                    cellTitle={(r, c) => {
                      const k = cellKey(r, c);
                      const h = inv.cells[k] || { free: 0, making: 0, transit: 0 };
                      return `${fmtPower(r)} / ${fmtPower(c)} · keep ${pairs[k]} − in stock ${h.free} − being made ${h.making} − on the way ${h.transit} = order ${short[k]}`;
                    }} />
                </div>
                <div className="space-y-3">
                  {data.open_po ? (
                    <>
                      <Link to="/purchasing/orders/$id" params={{ id: data.open_po.id }} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2.5 hover:border-blue-300">
                        <span className="text-[13px] font-bold text-blue-700">{data.open_po.po_number} is open</span>
                        <StagePill stage={data.open_po.stage} />
                      </Link>
                      <p className="text-[12px] text-slate-500">A held or sent order already exists for this line. Open it to move it on.</p>
                    </>
                  ) : canManage ? (
                    <>
                      <div>
                        <label className={labelCls} htmlFor="po-supplier">Supplier</label>
                        <select id="po-supplier" className={inputCls} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                          {suppliers.filter((s) => s.is_active).map((s) => <option key={s.id} value={s.id}>{s.name} · {s.lead_time_months} months</option>)}
                        </select>
                      </div>
                      <div className="text-[12px] text-slate-600">Company: <b className="text-slate-900">{data.company}</b></div>
                      <button type="button" className={`${btnPrimary} w-full`} disabled={!!orderBlocked || busy === "po"} onClick={createPo}>
                        {busy === "po" && <Loader2 size={14} className="animate-spin" />} Create purchase order · {fmtNum(shortSum)} pairs
                      </button>
                      {orderBlocked && <p className="text-[12px] text-amber-700">{orderBlocked}</p>}
                    </>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="text-[12px] font-bold text-slate-700 mb-2">{data.open_po ? `Where ${data.open_po.po_number} is now` : "After you create it, the order moves through 6 steps"}</div>
                <StageStrip current={data.open_po?.stage} />
              </div>
            </>
          )}
        </StepCard>
      </div>
      {confirmDialog}
    </>
  );
}

export function ProductMasterView() {
  const { id } = useParams({ strict: false });
  const search = useSearch({ strict: false });
  const { data, loading, error, setData } = useLoad(() => Promise.all([getProductMaster(id), listSuppliers()]), [id]);

  const pm = data?.[0];
  const line = pm?.line;

  return (
    <PurchasingShell
      icon={Layers}
      title={line ? `${line.product} ${line.range_label}` : "Product Master"}
      subtitle={line ? `${line.id} · ${line.item_code} · sells ${fmtNum(line.monthly_sale)} pairs a month (3-month average, net of returns)` : undefined}
      actions={<Link to="/purchasing/product-masters" className={btnSecondary}><ArrowLeft size={15} /> All Product Masters</Link>}
    >
      {loading && !data && <Loading />}
      {error && <ErrorNote>{error}</ErrorNote>}
      {pm && line.made_to_order && (
        <Card title="Made to order">
          <p className="text-[13px] text-slate-600">This line is made to order for each prescription. It is not bought for stock, so it has no Product Master.</p>
        </Card>
      )}
      {pm && !line.made_to_order && (
        <ProductMasterBuilder
          key={`${id}-${pm.pm ? "pm" : "new"}`}
          data={pm}
          suppliers={data[1]}
          scrollToOrder={search?.view === "order"}
          onChange={(next) => setData([next, data[1]])}
        />
      )}
    </PurchasingShell>
  );
}
