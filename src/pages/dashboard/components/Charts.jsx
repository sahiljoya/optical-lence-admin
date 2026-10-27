import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { LineChart as LineIc, PieChart as PieIc, BarChart3 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const KEYS = ["c-line", "c-bar-a", "c-bar-b", "c-grid", "c-d1", "c-d2", "c-d3", "c-d4", "c-d5", "muted", "card"];

function useTokens(ref) {
  const [t, setT] = useState(null);
  useEffect(() => {
    if (!ref.current) return;
    const cs = getComputedStyle(ref.current);
    const o = {};
    KEYS.forEach((k) => (o[k] = cs.getPropertyValue(`--${k}`).trim()));
    setT(o);
  }, [ref]);
  return t;
}

function Header({ icon, title, note, children }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap sm:flex-nowrap">
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        <span className="grid place-items-center rounded-lg shrink-0 w-6 h-6 sm:w-7 sm:h-7" style={{ background: "var(--primary-tint)", color: "var(--primary-pressed)" }}>
          {icon}
        </span>
        <span className="text-xs sm:text-sm md:text-[15px] font-semibold text-slate-800 truncate">{title}</span>
        {note && <span className="text-[10px] sm:text-xs text-slate-400 font-normal hidden sm:inline">{note}</span>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function MiniSelect({ value, onChange, options }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-[26px] sm:h-[30px] text-[10px] sm:text-xs w-auto min-w-[75px] sm:min-w-[85px] gap-1 rounded-[8px] px-1.5 sm:px-2">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, l]) => (
          <SelectItem key={v} value={v} className="text-xs">
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const Tip = ({ active, payload, label, fmt }) =>
  active && payload?.length ? (
    <div className="vw-tip text-[10px] sm:text-xs p-1.5 sm:p-2 rounded-lg shadow-md border border-slate-100 bg-white">
      <div className="text-slate-400 font-medium text-[9px] sm:text-[10px] md:text-[11px]">{label ?? payload[0].name}</div>
      <div className="font-semibold text-slate-800 text-[11px] sm:text-xs md:text-[13px]">{fmt(payload[0].value)}</div>
    </div>
  ) : null;

function ChartsRow({
  salesAmount,
  orderCounts,
  orderCountsAlt,
  lensMix,
  lensMixAlt,
  totalSalesLabel,
  currentMonthLabel,
  prevMonthLabel,
  barRangeLabel,
  barRangeLabelPrev,
  currentMonthShort
}) {
  const ref = useRef(null);
  const t = useTokens(ref);
  const [metric, setMetric] = useState("amount");
  const [mix, setMix] = useState("current");
  const [cnt, setCnt] = useState("6");
  const trend = metric === "amount" ? salesAmount : orderCounts;
  const fmtT = (v) => (metric === "amount" ? `₹${v.toFixed(1)}L` : v.toLocaleString("en-IN"));
  const mixData = mix === "current" ? lensMix : lensMixAlt;
  const bars = cnt === "6" ? orderCounts : orderCountsAlt;
  const dcol = t ? [t["c-d1"], t["c-d2"], t["c-d3"], t["c-d4"], t["c-d5"]] : [];
  const tick = { fontSize: 11, fill: t?.muted ?? "#94a3b8" };

  return (
    <div ref={ref} className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-[1.1fr_1fr_1fr]">
      {/* 1. Sales Trend */}
      <div className="vw-card p-3.5 sm:p-4 min-h-[260px] h-auto flex flex-col justify-between">
        <Header icon={<LineIc size={16} />} title="Sales Trend" note="(Last 6 months)">
          <MiniSelect value={metric} onChange={setMetric} options={[["amount", "Amount (₹)"], ["orders", "Orders"]]} />
        </Header>
        {t && (
          <div className="w-full h-[190px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 18, right: 10, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="vwArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={t["c-line"]} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={t["c-line"]} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="4 4" stroke={t["c-grid"]} />
                <XAxis dataKey="m" tick={tick} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ ...tick, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  {...(metric === "amount" ? { ticks: [0, 20, 40, 60] } : {})}
                  domain={metric === "amount" ? [0, 60] : [0, "auto"]}
                  tickFormatter={(v) => (metric === "amount" ? (v ? `${v}L` : "0") : String(v))}
                />
                <Tooltip content={<Tip fmt={fmtT} />} />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={t["c-line"]}
                  strokeWidth={2.5}
                  fill="url(#vwArea)"
                  dot={{ r: 3.5, fill: t.card, stroke: t["c-line"], strokeWidth: 2 }}
                >
                  <LabelList dataKey="v" position="top" formatter={(v) => fmtT(Number(v))} style={{ fontSize: 10, fill: t.muted }} />
                </Area>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 2. Sales by Lens Type */}
      <div className="vw-card p-3.5 sm:p-4 min-h-[260px] h-auto flex flex-col justify-between">
        <Header icon={<PieIc size={16} />} title="Sales by Lens Type">
          <MiniSelect value={mix} onChange={setMix} options={[["current", currentMonthLabel ?? "This month"], ["prev", prevMonthLabel ?? "Last month"]]} />
        </Header>
        {t && (
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 flex-1 justify-center mt-1">
            <div className="relative shrink-0 w-[150px] h-[150px] sm:w-[170px] sm:h-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={mixData} dataKey="v" nameKey="name" innerRadius={48} outerRadius={70} paddingAngle={2} stroke="none">
                    {mixData.map((_, i) => (
                      <Cell key={i} fill={dcol[i] ?? ""} />
                    ))}
                  </Pie>
                  <Tooltip content={<Tip fmt={(v) => `${v}%`} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center pointer-events-none text-center">
                <div>
                  <div className="text-xs sm:text-sm md:text-base font-bold text-slate-800 leading-tight">{totalSalesLabel ?? "₹0"}</div>
                  <div className="text-[9px] sm:text-[10px] md:text-[11px] text-slate-400 font-medium">Total Sales</div>
                </div>
              </div>
            </div>
            <ul className="w-full sm:flex-1 space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
              {mixData.map((d, i) => (
                <li key={d.name} className="flex items-center gap-2 text-[11px] sm:text-xs md:text-[13px]">
                  <span className="rounded-full shrink-0 w-2.5 h-2.5" style={{ background: dcol[i] }} />
                  <span className="text-slate-500 truncate font-medium flex-1" title={d.name}>{d.name}</span>
                  <span className="ml-auto font-semibold text-slate-800 shrink-0 font-mono">{d.v}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 3. Monthly Order Count */}
      <div className="vw-card p-3.5 sm:p-4 min-h-[260px] h-auto flex flex-col justify-between md:col-span-2 xl:col-span-1">
        <Header icon={<BarChart3 size={16} />} title="Monthly Order Count" note="(Last 6 months)">
          <MiniSelect value={cnt} onChange={setCnt} options={[["6", barRangeLabel ?? ""], ["prev", barRangeLabelPrev ?? ""]]} />
        </Header>
        {t && (
          <div className="w-full h-[190px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars} margin={{ top: 18, right: 6, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="vwBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={t["c-bar-a"]} />
                    <stop offset="100%" stopColor={t["c-bar-b"]} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="4 4" stroke={t["c-grid"]} />
                <XAxis dataKey="m" tick={tick} axisLine={false} tickLine={false} />
                <YAxis tick={{ ...tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: t["c-grid"], opacity: 0.4 }} content={<Tip fmt={(v) => `${v.toLocaleString("en-IN")} orders`} />} />
                <Bar dataKey="v" radius={[6, 6, 0, 0]} barSize={24}>
                  {bars.map((b, i) => (
                    <Cell key={i} fill={b.m === currentMonthShort ? t["c-bar-b"] : "url(#vwBar)"} />
                  ))}
                  <LabelList dataKey="v" position="top" formatter={(v) => Number(v).toLocaleString("en-IN")} style={{ fontSize: 10, fill: t.muted }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export { ChartsRow };
