import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Plus, Loader2, AlertTriangle, Check } from "lucide-react";
import { getProductMasterSetup, createProductMaster, cellKey } from "@/services/purchaseApi";
import { ownRatios, spreadTotal, inside, sumValues } from "@/services/purchaseMath";
import { hasPermission } from "@/lib/permissions";
import { notify } from "@/lib/notify";
import {
  PurchasingShell, Loading, ErrorNote, Empty, StepCard, PowerMatrix, SalesHelper, useLoad,
  btnPrimary, btnSecondary, inputCls, labelCls, fmtNum, fmtPower,
} from "./shared";

const TAKEN = { background: "rgba(37,99,235,0.35)" };
const LEFT_OUT = { background: "#f1f5f9", backgroundImage: "repeating-linear-gradient(135deg, transparent 0 3px, rgba(148,163,184,0.5) 3px 4px)" };

function PowerSelect({ id, label, value, options, onChange }) {
  return (
    <div>
      <label className={labelCls} htmlFor={id}>{label}</label>
      <select id={id} className={inputCls} value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {options.map((v) => <option key={v} value={v}>{fmtPower(v)}</option>)}
      </select>
    </div>
  );
}

function Builder({ setup }) {
  const navigate = useNavigate();
  const { master, products } = setup;
  const colWord = master.col_axis === "add" ? "ADD" : "CYL";
  const firstFree = products.find((p) => !p.has_pm);
  const [productId, setProductId] = useState(firstFree?.id || "");
  const product = products.find((p) => p.id === productId) || null;
  const [range, setRange] = useState(null);
  const [total, setTotal] = useState("");
  const [basis, setBasis] = useState(3);
  const [months, setMonths] = useState(6);
  const [qtyOn, setQtyOn] = useState(true);
  const [qty, setQty] = useState("");
  const [qtyTouched, setQtyTouched] = useState(false);
  const [timeOn, setTimeOn] = useState(false);
  const [everyMonths, setEveryMonths] = useState(2);
  const [busy, setBusy] = useState(false);

  const productRange = (p) => ({ rows: [...p.row_range], cols: [...p.col_range] });
  const wholeRange = { rows: [master.rows[0], master.rows.at(-1)], cols: [master.cols[0], master.cols.at(-1)] };

  // Picking a product selects its own range and suggests a total from its sales.
  useEffect(() => {
    if (!product) return;
    setRange(productRange(product));
    setTotal(String((product.figures.find((f) => f.id === 3)?.monthly || 0) * 6));
    setQtyTouched(false);
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalNum = Math.max(0, Math.floor(Number(total) || 0));
  // The quantity alert follows the total (40%) until someone types their own number.
  useEffect(() => { if (!qtyTouched) setQty(String(Math.round(totalNum * 0.4))); }, [totalNum, qtyTouched]);

  const own = useMemo(() => (range ? ownRatios(master, range.rows, range.cols) : null), [master, range]);
  const pieces = useMemo(() => (own ? spreadTotal(own.ratios, totalNum) : {}), [own, totalNum]);
  const keepSum = sumValues(pieces);
  const taken = own ? own.rows.length * own.cols.length : 0;
  const allPowers = master.rows.length * master.cols.length;
  const isTaken = (r, c) => range && inside(r, range.rows) && inside(c, range.cols);
  const sameAs = (a, b) => a && b && a.rows.join() === b.rows.join() && a.cols.join() === b.cols.join();
  const outsideProduct = product && range && !(range.rows.every((v) => inside(v, product.row_range)) && range.cols.every((v) => inside(v, product.col_range)));

  const create = async () => {
    setBusy(true);
    try {
      const res = await createProductMaster(productId, {
        masterId: master.id, range, total: totalNum, basis, months,
        alert: { qty: qtyOn ? Math.floor(Number(qty) || 0) : null, every_months: timeOn ? Number(everyMonths) || null : null },
      });
      notify.success("Product Master created.");
      navigate({ to: "/purchasing/product-masters/$id", params: { id: res.id } });
    } catch (e) {
      notify.error(e.message);
      setBusy(false);
    }
  };

  if (products.length === 0) {
    return <div className="vw-card"><Empty>No product fits {master.code} (lens type, index, diameter and range must match).</Empty></div>;
  }

  return (
    <div className="space-y-4">
      {/* 1 — which product */}
      <StepCard n={1} title="Choose the product" subtitle={`Products that fit ${master.code}: same lens type, index and diameter, and a range inside it.`}>
        <fieldset className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          <legend className="sr-only">Product</legend>
          {products.map((p) => (
            <label key={p.id} className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${p.has_pm ? "opacity-60 cursor-not-allowed bg-slate-50 border-slate-200" : productId === p.id ? "border-blue-500 bg-blue-50/60 cursor-pointer" : "border-slate-200 hover:bg-slate-50 cursor-pointer"}`}>
              <input type="radio" name="product" className="mt-1" disabled={p.has_pm} checked={productId === p.id} onChange={() => setProductId(p.id)} />
              <span className="min-w-0">
                <span className="block text-[13px] font-bold text-slate-900">{p.product}</span>
                <span className="block text-[12px] text-slate-600">{p.range_label} · {p.lens_type} · {p.index}{p.diameter ? ` · ${p.diameter} mm` : ""}</span>
                <span className="block text-[11px] text-slate-500">{p.has_pm ? `Already has a Product Master (from ${p.pm_master_code})` : `Sells ${fmtNum(p.monthly_sale)} pieces a month`}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </StepCard>

      {/* 2 — which powers */}
      <StepCard n={2} muted={!product} title="Choose the powers" subtitle={`Take this product's own range, a smaller or bigger part, or the whole ${master.code}.`}>
        {!product || !range ? <p className="text-[13px] text-slate-500">Choose a product first.</p> : (
          <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-4">
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2">
                <button type="button" aria-pressed={sameAs(range, productRange(product))} onClick={() => setRange(productRange(product))} className={`h-10 rounded-xl border text-[13px] font-semibold cursor-pointer ${sameAs(range, productRange(product)) ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                  {sameAs(range, productRange(product)) && <Check size={14} className="inline mr-1" />}This product's range ({product.range_label})
                </button>
                <button type="button" aria-pressed={sameAs(range, wholeRange)} onClick={() => setRange(wholeRange)} className={`h-10 rounded-xl border text-[13px] font-semibold cursor-pointer ${sameAs(range, wholeRange) ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                  {sameAs(range, wholeRange) && <Check size={14} className="inline mr-1" />}Whole Super Master ({master.title})
                </button>
              </div>
              <div className="text-[12px] font-bold text-slate-700 pt-1">Or choose your own</div>
              <div className="grid grid-cols-2 gap-2">
                <PowerSelect id="sph-from" label="SPH from" value={range.rows[0]} options={master.rows} onChange={(v) => setRange({ ...range, rows: [v, range.rows[1]] })} />
                <PowerSelect id="sph-to" label="SPH to" value={range.rows[1]} options={master.rows} onChange={(v) => setRange({ ...range, rows: [range.rows[0], v] })} />
                <PowerSelect id="col-from" label={`${colWord} from`} value={range.cols[0]} options={master.cols} onChange={(v) => setRange({ ...range, cols: [v, range.cols[1]] })} />
                <PowerSelect id="col-to" label={`${colWord} to`} value={range.cols[1]} options={master.cols} onChange={(v) => setRange({ ...range, cols: [range.cols[0], v] })} />
              </div>
              <div className="rounded-xl bg-blue-50 border border-blue-200 px-3 py-2 text-[13px] text-blue-900">
                <b>{taken}</b> of {allPowers} powers selected
              </div>
              {outsideProduct && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" /> Some selected powers are outside this product's range in the price file ({product.range_label}).
                </div>
              )}
            </div>
            <div className="min-w-0">
              <PowerMatrix rows={master.rows} cols={master.cols} colAxis={master.col_axis} value={(r, c) => master.cells[cellKey(r, c)] ?? 0} isOut={(r, c) => !isTaken(r, c)} maxHeight="56vh" />
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[12px] text-slate-600">
                <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3.5 h-3.5 rounded" style={TAKEN} /> Selected — {taken} powers (totals count only these)</span>
                <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3.5 h-3.5 rounded" style={LEFT_OUT} /> Not selected</span>
              </div>
            </div>
          </div>
        )}
      </StepCard>

      {/* 3 — how many pieces */}
      <StepCard n={3} muted={!product} title="How many pieces in total?" subtitle="The total is shared out over the selected powers by their mix. Later you can change only this total.">
        {!product || !own ? <p className="text-[13px] text-slate-500">Choose a product first.</p> : (
          <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-4">
            <div className="space-y-3">
              <div>
                <label className={labelCls} htmlFor="pm-total">Total pieces</label>
                <input id="pm-total" type="number" min="1" className={`${inputCls} !h-11 !text-[18px] font-bold tabular-nums`} value={total} onChange={(e) => setTotal(e.target.value)} />
              </div>
              <SalesHelper figures={product.figures} basis={basis} months={months} onBasis={setBasis} onMonths={setMonths} onUse={(v) => setTotal(String(v))} />
            </div>
            <div className="min-w-0">
              <PowerMatrix rows={own.rows} cols={own.cols} colAxis={master.col_axis} value={(r, c) => pieces[cellKey(r, c)] ?? null} maxHeight="52vh" />
              <p className="text-[12px] text-slate-500 mt-2">
                Pieces to keep for each power. Each power is rounded down, so the grid adds up to <b className="text-slate-700">{fmtNum(keepSum)}</b>
                {totalNum - keepSum > 0 ? ` (${fmtNum(totalNum - keepSum)} lost to rounding).` : "."}
              </p>
            </div>
          </div>
        )}
      </StepCard>

      {/* 4 — alert */}
      <StepCard n={4} muted={!product} title="Alert (you can change it later)" subtitle="Tell me when to look at this product again. Whichever comes first.">
        <div className="space-y-3 max-w-xl">
          <label className="flex flex-wrap items-center gap-2 text-[14px] text-slate-800 cursor-pointer">
            <input type="checkbox" checked={qtyOn} onChange={(e) => setQtyOn(e.target.checked)} disabled={!product} />
            Alert when we have
            <input type="number" min="0" aria-label="Pieces" className={`${inputCls} !w-28 !h-9`} value={qty} disabled={!qtyOn || !product} onChange={(e) => { setQty(e.target.value); setQtyTouched(true); }} />
            pieces or less
          </label>
          <label className="flex flex-wrap items-center gap-2 text-[14px] text-slate-800 cursor-pointer">
            <input type="checkbox" checked={timeOn} onChange={(e) => setTimeOn(e.target.checked)} disabled={!product} />
            Also remind me every
            <input type="number" min="1" aria-label="Months" className={`${inputCls} !w-20 !h-9`} value={everyMonths} disabled={!timeOn || !product} onChange={(e) => setEveryMonths(e.target.value)} />
            months
          </label>
          <p className="text-[12px] text-slate-500">“We have” = in stock + being made + on the way. The month reminder starts again every time an order is made.</p>
        </div>
      </StepCard>

      <div className="flex flex-wrap items-center justify-end gap-2 pb-4">
        <Link to="/purchasing/super-masters/$id" params={{ id: master.id }} className={btnSecondary}>Cancel</Link>
        <button type="button" className={btnPrimary} disabled={busy || !product || !range || totalNum <= 0} onClick={create}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />} Create Product Master
        </button>
      </div>
    </div>
  );
}

export function CreateProductMaster() {
  const search = useSearch({ strict: false });
  const smId = search?.sm;
  const { data, loading, error } = useLoad(() => getProductMasterSetup(smId), [smId]);
  const crumbs = [{ label: "Super Masters", to: "/purchasing" }, { label: smId || "—", to: "/purchasing/super-masters/$id", params: { id: smId } }, { label: "New Product Master" }];

  if (!hasPermission("MANAGE_PURCHASING")) {
    return <PurchasingShell crumbs={crumbs} title="New Product Master"><ErrorNote>You do not have permission to create Product Masters.</ErrorNote></PurchasingShell>;
  }

  return (
    <PurchasingShell crumbs={crumbs} title={data ? `New Product Master from ${data.master.code}` : "New Product Master"} subtitle={data ? `${data.master.title} · ${data.master.range_text}` : undefined}>
      {loading && !data && <Loading />}
      {error && <ErrorNote>{error}</ErrorNote>}
      {data && <Builder setup={data} />}
    </PurchasingShell>
  );
}
