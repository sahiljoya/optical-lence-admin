import { jsx, jsxs } from "react/jsx-runtime";
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
import { salesAmount, orderCounts, orderCountsAlt, lensMix, lensMixAlt } from "./mockData";
const KEYS = ["c-line", "c-bar-a", "c-bar-b", "c-grid", "c-d1", "c-d2", "c-d3", "c-d4", "c-d5", "muted", "card"];
function useTokens(ref) {
  const [t, setT] = useState(null);
  useEffect(() => {
    if (!ref.current) return;
    const cs = getComputedStyle(ref.current);
    const o = {};
    KEYS.forEach((k) => o[k] = cs.getPropertyValue(`--${k}`).trim());
    setT(o);
  }, [ref]);
  return t;
}
function Header({ icon, title, note, children }) {
  return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-2", children: [
    /* @__PURE__ */ jsx("span", { className: "grid place-items-center rounded-lg", style: { width: 28, height: 28, background: "var(--primary-tint)", color: "var(--primary-pressed)" }, children: icon }),
    /* @__PURE__ */ jsx("span", { style: { fontSize: 15, fontWeight: 600 }, children: title }),
    note && /* @__PURE__ */ jsx("span", { style: { fontSize: 12, color: "var(--muted)" }, children: note }),
    /* @__PURE__ */ jsx("div", { className: "ml-auto", children })
  ] });
}
function MiniSelect({ value, onChange, options }) {
  return /* @__PURE__ */ jsxs(Select, { value, onValueChange: onChange, children: [
    /* @__PURE__ */ jsx(SelectTrigger, { className: "h-[30px] text-xs w-auto gap-1 rounded-[10px]", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
    /* @__PURE__ */ jsx(SelectContent, { children: options.map(([v, l]) => /* @__PURE__ */ jsx(SelectItem, { value: v, className: "text-xs", children: l }, v)) })
  ] });
}
const Tip = ({ active, payload, label, fmt }) => active && payload?.length ? /* @__PURE__ */ jsxs("div", { className: "vw-tip", children: [
  /* @__PURE__ */ jsx("div", { style: { color: "var(--muted)" }, children: label ?? payload[0].name }),
  /* @__PURE__ */ jsx("div", { style: { fontWeight: 600 }, children: fmt(payload[0].value) })
] }) : null;
function ChartsRow() {
  const ref = useRef(null);
  const t = useTokens(ref);
  const [metric, setMetric] = useState("amount");
  const [mix, setMix] = useState("oct");
  const [cnt, setCnt] = useState("6");
  const trend = metric === "amount" ? salesAmount : orderCounts;
  const fmtT = (v) => metric === "amount" ? `\u20B9${v.toFixed(1)}L` : v.toLocaleString("en-IN");
  const mixData = mix === "oct" ? lensMix : lensMixAlt;
  const bars = cnt === "6" ? orderCounts : orderCountsAlt;
  const dcol = t ? [t["c-d1"], t["c-d2"], t["c-d3"], t["c-d4"], t["c-d5"]] : [];
  const tick = { fontSize: 12, fill: t?.muted ?? "" };
  return /* @__PURE__ */ jsxs("div", { ref, className: "grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-[1.1fr_1fr_1fr]", children: [
    /* @__PURE__ */ jsxs("div", { className: "vw-card", style: { padding: "16px 18px", height: 260 }, children: [
      /* @__PURE__ */ jsx(Header, { icon: /* @__PURE__ */ jsx(LineIc, { size: 16 }), title: "Sales Trend", note: "(Last 6 months)", children: /* @__PURE__ */ jsx(MiniSelect, { value: metric, onChange: setMetric, options: [["amount", "Amount (\u20B9)"], ["orders", "Orders"]] }) }),
      t && /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 196, children: /* @__PURE__ */ jsxs(AreaChart, { data: trend, margin: { top: 18, right: 10, left: -10, bottom: 0 }, children: [
        /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", { id: "vwArea", x1: "0", y1: "0", x2: "0", y2: "1", children: [
          /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: t["c-line"], stopOpacity: 0.3 }),
          /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: t["c-line"], stopOpacity: 0.02 })
        ] }) }),
        /* @__PURE__ */ jsx(CartesianGrid, { vertical: false, strokeDasharray: "4 4", stroke: t["c-grid"] }),
        /* @__PURE__ */ jsx(XAxis, { dataKey: "m", tick, axisLine: false, tickLine: false }),
        /* @__PURE__ */ jsx(
          YAxis,
          {
            tick: { ...tick, fontSize: 11 },
            axisLine: false,
            tickLine: false,
            ...metric === "amount" ? { ticks: [0, 20, 40, 60] } : {},
            domain: metric === "amount" ? [0, 60] : [0, "auto"],
            tickFormatter: (v) => metric === "amount" ? v ? `${v}L` : "0" : String(v)
          }
        ),
        /* @__PURE__ */ jsx(Tooltip, { content: /* @__PURE__ */ jsx(Tip, { fmt: fmtT }) }),
        /* @__PURE__ */ jsx(
          Area,
          {
            type: "monotone",
            dataKey: "v",
            stroke: t["c-line"],
            strokeWidth: 2.5,
            fill: "url(#vwArea)",
            dot: { r: 4, fill: t.card, stroke: t["c-line"], strokeWidth: 2 },
            children: /* @__PURE__ */ jsx(LabelList, { dataKey: "v", position: "top", formatter: (v) => fmtT(Number(v)), style: { fontSize: 11, fill: t.muted } })
          }
        )
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "vw-card", style: { padding: "16px 18px", height: 260 }, children: [
      /* @__PURE__ */ jsx(Header, { icon: /* @__PURE__ */ jsx(PieIc, { size: 16 }), title: "Sales by Lens Type", children: /* @__PURE__ */ jsx(MiniSelect, { value: mix, onChange: setMix, options: [["oct", "Oct 2026"], ["sep", "Sep 2026"]] }) }),
      t && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "relative", style: { width: 190, height: 196 }, children: [
          /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxs(PieChart, { children: [
            /* @__PURE__ */ jsx(Pie, { data: mixData, dataKey: "v", nameKey: "name", innerRadius: 62, outerRadius: 90, paddingAngle: 2, stroke: "none", children: mixData.map((_, i) => /* @__PURE__ */ jsx(Cell, { fill: dcol[i] ?? "" }, i)) }),
            /* @__PURE__ */ jsx(Tooltip, { content: /* @__PURE__ */ jsx(Tip, { fmt: (v) => `${v}%` }) })
          ] }) }),
          /* @__PURE__ */ jsx("div", { className: "absolute inset-0 grid place-items-center pointer-events-none text-center", children: /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { style: { fontSize: 18, fontWeight: 700 }, children: "\u20B948.6 L" }),
            /* @__PURE__ */ jsx("div", { style: { fontSize: 11, color: "var(--muted)" }, children: "Total Sales" })
          ] }) })
        ] }),
        /* @__PURE__ */ jsx("ul", { className: "flex-1 space-y-2", children: mixData.map((d, i) => /* @__PURE__ */ jsxs("li", { className: "flex items-center gap-2", style: { fontSize: 13 }, children: [
          /* @__PURE__ */ jsx("span", { className: "rounded-full", style: { width: 10, height: 10, background: dcol[i] } }),
          /* @__PURE__ */ jsx("span", { style: { color: "var(--muted)" }, children: d.name }),
          /* @__PURE__ */ jsxs("span", { className: "ml-auto", style: { fontWeight: 600 }, children: [
            d.v,
            "%"
          ] })
        ] }, d.name)) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "vw-card", style: { padding: "16px 18px", height: 260 }, children: [
      /* @__PURE__ */ jsx(Header, { icon: /* @__PURE__ */ jsx(BarChart3, { size: 16 }), title: "Monthly Order Count", note: "(Last 6 months)", children: /* @__PURE__ */ jsx(MiniSelect, { value: cnt, onChange: setCnt, options: [["6", "May\u2013Oct"], ["prev", "Apr\u2013Sep"]] }) }),
      t && /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 196, children: /* @__PURE__ */ jsxs(BarChart, { data: bars, margin: { top: 18, right: 4, left: -16, bottom: 0 }, children: [
        /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", { id: "vwBar", x1: "0", y1: "0", x2: "0", y2: "1", children: [
          /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: t["c-bar-a"] }),
          /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: t["c-bar-b"] })
        ] }) }),
        /* @__PURE__ */ jsx(CartesianGrid, { vertical: false, strokeDasharray: "4 4", stroke: t["c-grid"] }),
        /* @__PURE__ */ jsx(XAxis, { dataKey: "m", tick, axisLine: false, tickLine: false }),
        /* @__PURE__ */ jsx(YAxis, { tick: { ...tick, fontSize: 11 }, axisLine: false, tickLine: false }),
        /* @__PURE__ */ jsx(Tooltip, { cursor: { fill: t["c-grid"], opacity: 0.4 }, content: /* @__PURE__ */ jsx(Tip, { fmt: (v) => `${v.toLocaleString("en-IN")} orders` }) }),
        /* @__PURE__ */ jsxs(Bar, { dataKey: "v", radius: [6, 6, 0, 0], barSize: 26, children: [
          bars.map((b, i) => /* @__PURE__ */ jsx(Cell, { fill: b.m === "Oct" ? t["c-bar-b"] : "url(#vwBar)" }, i)),
          /* @__PURE__ */ jsx(LabelList, { dataKey: "v", position: "top", formatter: (v) => Number(v).toLocaleString("en-IN"), style: { fontSize: 11, fill: t.muted } })
        ] })
      ] }) })
    ] })
  ] });
}
export {
  ChartsRow
};
