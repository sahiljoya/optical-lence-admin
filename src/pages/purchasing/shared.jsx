import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, X, FlaskConical, Check } from "lucide-react";
import { hasPermission } from "@/lib/permissions";
import { IS_MOCK, PO_STAGES } from "@/services/purchaseApi";

export const inputCls = "h-9 px-3 text-[13px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 w-full disabled:bg-slate-50 disabled:text-slate-500";
export const labelCls = "block text-[12px] font-bold text-slate-700 mb-1.5";
export const btnPrimary = "vw-btn-primary h-9 text-[13px] inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";
export const btnSecondary = "vw-btn-secondary h-9 text-[13px] inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";
export const thCls = "py-2.5 px-3 text-[10px] md:text-[11px] font-bold text-slate-500 tracking-wider uppercase whitespace-nowrap";
export const tdCls = "py-3 px-3 text-[13px] text-slate-700 align-middle";
export const tableHead = { background: "var(--soft-bg)", borderBottom: "1px solid var(--divider)" };

// Powers are shown the way the client writes them: +2.00, −0.25, 0.00.
export const fmtPower = (value) => {
  if (value === null || value === undefined) return "—";
  if (value === 0) return "0.00";
  return `${value > 0 ? "+" : "−"}${Math.abs(value).toFixed(2)}`;
};

export const fmtNum = (value) => (value === null || value === undefined ? "—" : Number(value).toLocaleString("en-IN"));

export const fmtDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const monthsLeft = (value) => (value === null || value === undefined ? "No sale" : `${value.toFixed(1)} months left`);

// Small data loader: { data, loading, error, reload, setData }.
export function useLoad(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    return loader()
      .then((data) => setState({ data, loading: false, error: "" }))
      .catch((e) => setState({ data: null, loading: false, error: e.message || "Could not load." }));
  }, deps);
  useEffect(() => { run(); }, [run]);
  const setData = (data) => setState({ data, loading: false, error: "" });
  return { ...state, reload: run, setData };
}

// The sections follow the flow: Super Master -> Product Master -> Purchase order.
const TABS = [
  ["Overview", "/purchasing", "VIEW_PURCHASING", true],
  ["1 · Super Masters", "/purchasing/super-masters", "VIEW_PURCHASING"],
  ["2 · Product Masters", "/purchasing/product-masters", "VIEW_PURCHASING"],
  ["3 · Purchase orders", "/purchasing/orders", ["VIEW_PURCHASE_ORDERS", "VIEW_PURCHASING"]],
  ["Suppliers & settings", "/purchasing/suppliers", "VIEW_PURCHASING"],
];

export function PurchasingShell({ icon: Icon, title, subtitle, actions, children }) {
  return (
    <>
      <div className="mb-4 mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            {Icon && <Icon className="text-blue-600 shrink-0" size={22} />} {title}
          </h1>
          {subtitle && <p className="text-[13px] text-slate-500 mt-1 max-w-3xl">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      <nav className="mb-5 flex gap-1 overflow-x-auto custom-scrollbar border-b border-slate-200" aria-label="Purchasing sections">
        {TABS.filter(([, , permission]) => hasPermission(permission)).map(([label, to, , exact]) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: !!exact }}
            className="px-3 py-2.5 text-[13px] font-semibold text-slate-500 hover:text-slate-900 whitespace-nowrap border-b-2 border-transparent -mb-px"
            activeProps={{ className: "px-3 py-2.5 text-[13px] font-semibold whitespace-nowrap border-b-2 -mb-px text-blue-700 border-blue-600" }}
          >
            {label}
          </Link>
        ))}
      </nav>

      {IS_MOCK && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[12px] text-amber-900">
          <FlaskConical size={13} className="shrink-0" />
          <span><b>Design preview.</b> Sample data only — not connected to the backend yet. Changes reset on reload.</span>
        </div>
      )}

      {children}
    </>
  );
}

export function Loading({ label = "Loading..." }) {
  return (
    <div className="p-10 text-center text-slate-500 text-[13px] flex items-center justify-center gap-2">
      <Loader2 size={16} className="animate-spin" /> {label}
    </div>
  );
}

export function Empty({ children }) {
  return <div className="p-10 text-center text-slate-500 text-[13px]">{children}</div>;
}

export function ErrorNote({ children }) {
  return <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-800">{children}</div>;
}

export function Card({ title, subtitle, actions, children, className = "", id }) {
  return (
    <section id={id} className={`vw-card p-4 sm:p-5 ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>}
            {subtitle && <p className="text-[12px] text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

const TONES = {
  green: { background: "var(--p-delivered-bg)", color: "var(--p-delivered)" },
  amber: { background: "var(--p-pending-bg)", color: "var(--p-pending)" },
  blue: { background: "var(--p-process-bg)", color: "var(--p-process)" },
  red: { background: "var(--p-overdue-bg)", color: "var(--p-overdue)" },
  grey: { background: "var(--p-packed-bg)", color: "var(--p-packed)" },
};

export function Pill({ tone = "grey", children }) {
  return <span className="vw-pill" style={TONES[tone]}>{children}</span>;
}

const STAGE_TONE = { held: "grey", sent: "blue", pi_received: "amber", packing_list: "amber", shipped: "blue", received: "green" };

export function StagePill({ stage }) {
  const label = PO_STAGES.find((s) => s.id === stage)?.label || stage;
  return <Pill tone={STAGE_TONE[stage]}>{label}</Pill>;
}

export function CoverPill({ months, leadTime = 4 }) {
  if (months === null || months === undefined) return <Pill tone="grey">No sale</Pill>;
  return <Pill tone={months < leadTime ? "red" : "amber"}>{monthsLeft(months)}</Pill>;
}

export function Modal({ title, subtitle, onClose, children, footer, wide = false }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div role="dialog" aria-modal="true" aria-label={title} className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? "max-w-5xl" : "max-w-md"} my-6 overflow-hidden flex flex-col border border-slate-100 animate-in zoom-in-95 duration-200`}>
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-start gap-3 bg-slate-50/80">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 text-[16px]">{title}</h3>
            {subtitle && <p className="text-[12px] text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 p-1.5 rounded-xl transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4 max-h-[72vh] overflow-y-auto custom-scrollbar">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

// Big number card: "Need 1,200 · 200 × 6".
export function BigNumber({ label, value, hint, tone = "plain" }) {
  const styles = {
    plain: "bg-white border-slate-200",
    blue: "bg-blue-50 border-blue-200",
    orange: "bg-orange-50 border-orange-200",
  };
  const valueColor = tone === "orange" ? "text-orange-700" : tone === "blue" ? "text-blue-800" : "text-slate-900";
  return (
    <div className={`rounded-xl border px-4 py-3 ${styles[tone]}`}>
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-2xl font-bold mt-0.5 tabular-nums ${valueColor}`}>{value}</div>
      {hint && <div className="text-[11px] text-slate-500 mt-0.5">{hint}</div>}
    </div>
  );
}

// One step of the flow strip shown at the top of a Product Master.
export function FlowStrip({ steps }) {
  return (
    <ol className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
      {steps.map((step, i) => {
        const body = (
          <>
            <div className="flex items-center gap-2">
              <span className={`grid place-items-center w-6 h-6 rounded-full text-[11px] font-bold shrink-0 ${step.done ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                {step.done ? <Check size={13} /> : i + 1}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">{step.label}</span>
            </div>
            <div className="text-[15px] font-bold text-slate-900 mt-1.5 truncate">{step.value}</div>
            {step.hint && <div className="text-[11px] text-slate-500 truncate">{step.hint}</div>}
          </>
        );
        const cls = `block w-full text-left h-full rounded-xl border px-3 py-2.5 ${step.active ? "border-blue-500 bg-blue-50/70" : "border-slate-200 bg-white"}`;
        let node = <div className={cls}>{body}</div>;
        if (step.to) node = <Link to={step.to} params={step.params} className={`${cls} hover:border-blue-300`}>{body}</Link>;
        if (step.onClick) node = <button type="button" onClick={step.onClick} className={`${cls} hover:border-blue-300 cursor-pointer`}>{body}</button>;
        return <li key={step.label}>{node}</li>;
      })}
    </ol>
  );
}

// Segmented control: [{ id, label }].
export function Segmented({ options, value, onChange, label }) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap rounded-lg bg-slate-100 p-1 gap-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={`h-8 px-3 rounded-md text-[12px] font-semibold cursor-pointer transition-colors ${value === o.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// The power matrix: sphere down the side, cylinder or ADD across, a Total for every row on the
// right, a Total for every column at the bottom, and the grand total in the corner.
// value(row, col) returns a number, or null for a power that is not part of this grid.
// isOut(row, col) marks powers that are shown but not counted (hatched grey, left out of totals) —
// used to show the part of a Super Master a line does not take.
export function PowerMatrix({ rows, cols, colAxis, value, tone = "blue", cellBg, cellTitle, maxHeight = "64vh", emptyZero = false, isOut }) {
  const grid = rows.map((r) => cols.map((c) => value(r, c)));
  const out = (i, j) => (isOut ? isOut(rows[i], cols[j]) : false);
  const counted = (i, j) => (out(i, j) ? 0 : grid[i][j] ?? 0);
  const rowTotals = rows.map((_, i) => cols.reduce((s, _c, j) => s + counted(i, j), 0));
  const colTotals = cols.map((_, j) => rows.reduce((s, _r, i) => s + counted(i, j), 0));
  const grand = rowTotals.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...rows.flatMap((_, i) => cols.map((_c, j) => counted(i, j))));
  const rgb = tone === "orange" ? "234,88,12" : "37,99,235";
  const shade = (v) => (v ? `rgba(${rgb},${(0.07 + 0.43 * (v / max)).toFixed(3)})` : undefined);
  const headCell = "px-1 py-1.5 text-[11px] font-bold text-slate-500 whitespace-nowrap text-center bg-white";
  const totalCell = "h-8 min-w-[56px] px-2 rounded-md grid place-items-center text-[12px] font-bold tabular-nums bg-slate-100 text-slate-900";

  return (
    <div className="overflow-auto custom-scrollbar rounded-xl border border-slate-200 bg-white" style={{ maxHeight }}>
      <table className="tabular-nums" style={{ borderCollapse: "separate", borderSpacing: 3 }}>
        <thead>
          <tr>
            <th className={`${headCell} sticky left-0 top-0 z-30 text-left pl-2`}>SPH ↓ {colAxis === "add" ? "ADD" : "CYL"} →</th>
            {cols.map((c) => <th key={c} className={`${headCell} sticky top-0 z-20`}>{fmtPower(c)}</th>)}
            <th className={`${headCell} sticky top-0 z-20 text-slate-800 pl-2`}>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r}>
              <th className="sticky left-0 z-10 bg-white px-2 text-[12px] font-bold text-slate-600 text-right whitespace-nowrap">{fmtPower(r)}</th>
              {cols.map((c, j) => {
                const v = grid[i][j];
                if (v === null || v === undefined) {
                  return <td key={c}><div className="h-8 min-w-[48px] rounded-md border border-dashed border-slate-200" title="Not part of this line" /></td>;
                }
                if (out(i, j)) {
                  return (
                    <td key={c}>
                      <div
                        className="h-8 min-w-[48px] px-1.5 rounded-md grid place-items-center text-[12px] text-slate-400 bg-slate-100"
                        style={{ backgroundImage: "repeating-linear-gradient(135deg, transparent 0 5px, rgba(148,163,184,0.25) 5px 6px)" }}
                        title={`${fmtPower(r)} / ${fmtPower(c)}: left out — not part of this line`}
                      >
                        {fmtNum(v)}
                      </div>
                    </td>
                  );
                }
                const bg = cellBg ? cellBg(r, c, v) : shade(v);
                return (
                  <td key={c}>
                    <div
                      className={`h-8 min-w-[48px] px-1.5 rounded-md grid place-items-center text-[12px] font-semibold ${v === 0 ? "text-slate-400 bg-slate-50" : "text-slate-900"}`}
                      style={v === 0 ? undefined : { background: bg }}
                      title={cellTitle ? cellTitle(r, c, v) : `${fmtPower(r)} / ${fmtPower(c)}: ${v}`}
                    >
                      {v === 0 && emptyZero ? "" : fmtNum(v)}
                    </div>
                  </td>
                );
              })}
              <td className="pl-2"><div className={totalCell}>{fmtNum(rowTotals[i])}</div></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th className="sticky left-0 bottom-0 z-30 bg-white px-2 text-[12px] font-bold text-slate-800 text-right">Total</th>
            {colTotals.map((t, j) => (
              <td key={cols[j]} className="sticky bottom-0 z-20 bg-white pt-1"><div className={totalCell}>{fmtNum(t)}</div></td>
            ))}
            <td className="sticky bottom-0 z-20 bg-white pt-1 pl-2">
              <div className="h-8 min-w-[64px] px-2 rounded-md grid place-items-center text-[13px] font-bold tabular-nums bg-slate-900 text-white" title="Grand total">{fmtNum(grand)}</div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// Which speed band a power falls in, by its net monthly sale. Bands are sorted high to low.
export function speedBand(bands, pairsPerMonth) {
  if (!pairsPerMonth) return null;
  const sorted = [...(bands || [])].sort((a, b) => b.min_pairs - a.min_pairs);
  return sorted.find((b) => pairsPerMonth >= b.min_pairs) || null;
}

export function SpeedLegend({ bands }) {
  const sorted = [...(bands || [])].sort((a, b) => b.min_pairs - a.min_pairs);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
      {sorted.map((b) => (
        <span key={b.label} className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded" style={{ background: b.colour }} />
          {b.label} ({b.min_pairs}+ pairs/month)
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded border border-slate-300 bg-white" /> Slower</span>
    </div>
  );
}

// One numbered step of the Product Master page.
export function StepCard({ n, id, title, subtitle, actions, children, muted = false }) {
  return (
    <section id={id} className={`vw-card p-4 sm:p-5 scroll-mt-4 ${muted ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="grid place-items-center w-8 h-8 rounded-full bg-blue-600 text-white text-[14px] font-bold shrink-0">{n}</span>
          <div className="min-w-0">
            <h2 className="text-[16px] font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-[12px] text-slate-500 mt-0.5 max-w-3xl">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

// The six purchase order stages in one line, with what each counts as.
export function StageStrip({ current }) {
  const index = PO_STAGES.findIndex((s) => s.id === current);
  const tint = { draft: "bg-white border-slate-200", making: "bg-orange-50 border-orange-200", transit: "bg-teal-50 border-teal-200", done: "bg-emerald-50 border-emerald-200" };
  return (
    <div>
      <ol className="flex flex-wrap items-center gap-1.5">
        {PO_STAGES.map((s, i) => (
          <li key={s.id} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-slate-300" aria-hidden="true">→</span>}
            <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold ${tint[s.group]} ${i === index ? "ring-2 ring-blue-400 text-blue-800" : "text-slate-700"}`}>
              <span className="text-slate-400">{i + 1}</span> {s.label}
            </span>
          </li>
        ))}
      </ol>
      <p className="text-[11px] text-slate-500 mt-1.5">Steps 3–4 count as “being made”, step 5 as “on the way”. Any step can be put on hold.</p>
    </div>
  );
}

// Purchase order steps, as cards: 1 Held … 6 Received.
export function StageSteps({ stage }) {
  const current = PO_STAGES.findIndex((s) => s.id === stage);
  const tint = { draft: "bg-white", making: "bg-orange-50", transit: "bg-teal-50", done: "bg-white" };
  return (
    <ol className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
      {PO_STAGES.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.id} aria-current={active ? "step" : undefined} className={`rounded-xl border px-3 py-2.5 ${tint[s.group]} ${active ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"} ${!done && !active ? "opacity-60" : ""}`}>
            <span className={`grid place-items-center w-6 h-6 rounded-full text-[11px] font-bold ${done ? "bg-emerald-600 text-white" : active ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>
              {done ? <Check size={13} /> : i + 1}
            </span>
            <div className="text-[13px] font-bold text-slate-900 mt-1.5">{s.label}</div>
            <div className="text-[11px] text-slate-500 leading-snug">{s.hint}</div>
          </li>
        );
      })}
    </ol>
  );
}
