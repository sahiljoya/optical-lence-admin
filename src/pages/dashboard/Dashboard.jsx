import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, CreditCard, UserPlus, Receipt, TrendingUp, Send, Users, Clock, AlertCircle, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartsRow } from "./components/Charts";
import { ArrowUp, ArrowDown } from "lucide-react";
import { BarChart3, Package, Tag, Truck, Trophy, Wallet, CheckCircle2 } from "lucide-react";
import { StatusPill } from "@/components/common/StatusPill";
import { getItem } from "@/services/storage";
import { dashboardService } from "@/services/dashboardService";
import { orderApi } from "@/services/orderApi";
import { customerService } from "@/services/customerService";
import { billingService } from "@/services/billingService";

const ICONS = { BarChart3, Package, Tag, Truck, Trophy, Wallet, CheckCircle2 };

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const inr = (n) => "₹" + Math.round(n || 0).toLocaleString("en-IN");
const inrLakh = (n) => "₹" + ((n || 0) / 100000).toFixed(1) + " L";
const pctDelta = (curr, prev) => (prev ? ((curr - prev) / prev) * 100 : null);

function CardHead({ icon, title, right }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon && <span className="grid place-items-center rounded-lg" style={{ width: 28, height: 28, background: "var(--primary-tint)", color: "var(--primary-pressed)" }}>{icon}</span>}
      <span style={{ fontSize: 15, fontWeight: 600 }}>{title}</span>
      <div className="ml-auto">{right}</div>
    </div>
  );
}

function Spark({ data, color }) {
  const w = 90, h = 28, max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 2 - ((v - min) / (max - min || 1)) * (h - 6)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} className="absolute" style={{ right: 10, bottom: 10 }}>
      <path d={`${line} L${w},${h} L0,${h} Z`} style={{ fill: color, opacity: 0.2 }} />
      <path d={line} fill="none" strokeWidth={2} style={{ stroke: color, opacity: 0.7 }} />
    </svg>
  );
}

function Kpis({ kpis }) {
  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      {kpis.map((k) => {
        const I = ICONS[k.icon];
        const color = `var(--t-${k.theme}-ic)`;
        return (
          <div key={k.label} className="vw-tile" style={{ background: `var(--t-${k.theme}-bg)` }}>
            <div className="flex gap-3">
              <span className="grid place-items-center shrink-0" style={{ width: 44, height: 44, borderRadius: 12, background: color, color: "var(--on-primary)" }}><I size={22} /></span>
              <div className="min-w-0">
                <div className="truncate" style={{ fontSize: 12, color: "var(--muted)" }}>{k.label}</div>
                <div className="truncate" style={{ fontSize: k.value.length > 8 ? 18 : 24, fontWeight: 700, lineHeight: 1.25 }}>{k.value}</div>
              </div>
            </div>
            <div className="mt-2" style={{ fontSize: 12 }}>
              {"sub" in k ? <span style={{ color: "var(--muted)", fontWeight: 600 }}>{k.sub}</span> : (
                <span className="inline-flex items-center gap-0.5" style={{ fontWeight: 600, color: k.good ? "var(--up)" : "var(--down)" }}>
                  {k.dir === "up" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}{k.delta}
                </span>
              )}
              {!("sub" in k) && <div style={{ fontSize: 11, color: "var(--muted)" }}>vs last month</div>}
            </div>
            <Spark data={k.spark} color={color} />
          </div>
        );
      })}
    </div>
  );
}

export function Dashboard() {
  const user = getItem("admin_user");
  const [range, setRange] = useState("this-month");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [pickQueueCount, setPickQueueCount] = useState(0);
  const [ordersTodayCount, setOrdersTodayCount] = useState(0);
  const [billingAccounts, setBillingAccounts] = useState([]);
  const [limitQueueCount, setLimitQueueCount] = useState(0);
  const [monthsWindow, setMonthsWindow] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const now = new Date();
      const months = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ monthNum: d.getMonth() + 1, year: d.getFullYear(), label: MONTH_SHORT[d.getMonth()] });
      }

      const results = await Promise.allSettled([
        dashboardService.getStats(),
        orderApi.getPickQueue(),
        orderApi.getRecentOrders(),
        billingService.getAccounts(),
        customerService.getLimitIncreaseQueue(),
        ...months.map((m) => dashboardService.getRevenueOrdersByDay(m.monthNum, m.year)),
      ]);
      if (cancelled) return;

      const [statsRes, pickRes, recentRes, billingRes, limitRes, ...monthRes] = results;

      setStats(statsRes.status === "fulfilled" ? statsRes.value.data : null);
      setPickQueueCount(pickRes.status === "fulfilled" ? (pickRes.value.data || []).length : 0);
      setBillingAccounts(billingRes.status === "fulfilled" ? billingRes.value.data || [] : []);
      setLimitQueueCount(limitRes.status === "fulfilled" ? (limitRes.value.data || []).length : 0);

      if (recentRes.status === "fulfilled") {
        const todayStr = new Date().toDateString();
        const count = (recentRes.value.data || []).filter(
          (o) => new Date(Number(o.createdAt)).toDateString() === todayStr
        ).length;
        setOrdersTodayCount(count);
      }

      const monthlyData = months.map((m, idx) => {
        const r = monthRes[idx];
        const days = r && r.status === "fulfilled" ? r.value.data || [] : [];
        const revenue = days.reduce((s, d) => s + (d.dailyTotalRevenue || 0), 0);
        const orderCount = days.reduce((s, d) => s + (d.dailyOrderCount || 0), 0);
        const lensTotals = {};
        days.forEach((d) => (d.breakdown || []).forEach((b) => {
          const key = b.lens_type || "Others";
          lensTotals[key] = (lensTotals[key] || 0) + (b.totalRevenue || 0);
        }));
        return { ...m, revenue, orderCount, lensTotals };
      });

      setMonthsWindow(monthlyData);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const curr = monthsWindow[6];
  const prev = monthsWindow[5];

  const salesAmount = useMemo(() => monthsWindow.map((m) => ({ m: m.label, v: +((m.revenue || 0) / 100000).toFixed(1) })), [monthsWindow]);
  const orderCounts = useMemo(() => monthsWindow.slice(1).map((m) => ({ m: m.label, v: m.orderCount || 0 })), [monthsWindow]);
  const orderCountsAlt = useMemo(() => monthsWindow.slice(0, 6).map((m) => ({ m: m.label, v: m.orderCount || 0 })), [monthsWindow]);

  const lensMixFor = (month) => {
    if (!month) return [];
    const total = Object.values(month.lensTotals || {}).reduce((s, v) => s + v, 0);
    if (!total) return [];
    return Object.entries(month.lensTotals).map(([name, v]) => ({ name, v: Math.round((v / total) * 100) }));
  };
  const lensMix = useMemo(() => lensMixFor(curr), [curr]);
  const lensMixAlt = useMemo(() => lensMixFor(prev), [prev]);

  const accountsWithBalance = billingAccounts.filter((a) => (a.current_balance || 0) > 0);
  const totalOutstanding = accountsWithBalance.reduce((s, a) => s + (a.current_balance || 0), 0);
  const now = Date.now();
  const SIXTY_DAYS = 60 * 24 * 60 * 60 * 1000;
  const overdueAccounts = accountsWithBalance.filter((a) => !a.last_payment || now - new Date(a.last_payment).getTime() >= SIXTY_DAYS);
  const overdueAmount = overdueAccounts.reduce((s, a) => s + (a.current_balance || 0), 0);
  const paidAccounts = billingAccounts.filter((a) => a.last_payment);
  const avgPaymentDays = paidAccounts.length
    ? Math.round(paidAccounts.reduce((s, a) => s + (now - new Date(a.last_payment).getTime()) / (24 * 60 * 60 * 1000), 0) / paidAccounts.length)
    : null;

  const kpis = useMemo(() => {
    if (!curr) return [];
    const salesSpark = salesAmount.map((d) => d.v);
    const ordersSpark = monthsWindow.map((m) => m.orderCount || 0);
    const avgOrderValueSpark = monthsWindow.map((m) => (m.orderCount ? Math.round(m.revenue / m.orderCount) : 0));

    const salesDelta = pctDelta(curr.revenue, prev?.revenue);
    const ordersDelta = pctDelta(curr.orderCount, prev?.orderCount);
    const currAov = curr.orderCount ? curr.revenue / curr.orderCount : 0;
    const prevAov = prev?.orderCount ? prev.revenue / prev.orderCount : 0;
    const aovDelta = pctDelta(currAov, prevAov);

    const totalLensRevenue = Object.values(curr.lensTotals || {}).reduce((s, v) => s + v, 0);
    const topLens = Object.entries(curr.lensTotals || {}).sort((a, b) => b[1] - a[1])[0];

    return [
      { theme: "blue", icon: "BarChart3", label: "Total Sales (MTD)", value: inrLakh(curr.revenue), delta: salesDelta !== null ? `${Math.abs(salesDelta).toFixed(1)}%` : "—", dir: (salesDelta ?? 0) >= 0 ? "up" : "down", good: (salesDelta ?? 0) >= 0, spark: salesSpark },
      { theme: "green", icon: "Package", label: "Total Orders", value: (stats?.kpis?.totalOrders ?? 0).toLocaleString("en-IN"), delta: ordersDelta !== null ? `${Math.abs(ordersDelta).toFixed(1)}%` : "—", dir: (ordersDelta ?? 0) >= 0 ? "up" : "down", good: (ordersDelta ?? 0) >= 0, spark: ordersSpark },
      { theme: "purple", icon: "Tag", label: "Avg Order Value", value: inr(currAov), delta: aovDelta !== null ? `${Math.abs(aovDelta).toFixed(1)}%` : "—", dir: (aovDelta ?? 0) >= 0 ? "up" : "down", good: (aovDelta ?? 0) >= 0, spark: avgOrderValueSpark },
      { theme: "orange", icon: "Truck", label: "Pending Dispatch", value: String(pickQueueCount), sub: "Needs dispatch", spark: ordersSpark },
      { theme: "teal", icon: "Trophy", label: "Top Selling Lens", value: topLens ? topLens[0] : "—", sub: topLens && totalLensRevenue ? `(${Math.round((topLens[1] / totalLensRevenue) * 100)}% of sales)` : "No sales yet", spark: salesSpark },
      { theme: "pink", icon: "Wallet", label: "Outstanding", value: inrLakh(totalOutstanding), sub: `${accountsWithBalance.length} active accounts`, spark: salesSpark },
    ];
  }, [curr, prev, stats, pickQueueCount, accountsWithBalance.length, totalOutstanding, monthsWindow, salesAmount]);

  const meta = useMemo(() => {
    if (!curr) return { period: "—", today: "—", active: "—", text: "" };
    const activeCustomers = stats?.kpis?.activeCustomers ?? 0;
    const daysInMonth = (year, monthNum) => new Date(year, monthNum, 0).getDate();

    if (range === "last-month") {
      return {
        period: `${MONTH_SHORT[prev ? MONTH_SHORT.indexOf(prev.label) : 0]} ${prev?.year ?? ""}`,
        today: "—",
        active: activeCustomers.toLocaleString("en-IN"),
        text: prev ? `1 ${MONTH_LONG[MONTH_SHORT.indexOf(prev.label)]} ${prev.year} to ${daysInMonth(prev.year, MONTH_SHORT.indexOf(prev.label) + 1)} ${MONTH_LONG[MONTH_SHORT.indexOf(prev.label)]} ${prev.year}` : "",
      };
    }
    if (range === "last-3") {
      const span = monthsWindow.slice(4, 7);
      const first = span[0], last = span[span.length - 1];
      return {
        period: first && last ? `${first.label}–${last.label} ${last.year}` : "—",
        today: String(ordersTodayCount),
        active: activeCustomers.toLocaleString("en-IN"),
        text: first && last ? `1 ${MONTH_LONG[MONTH_SHORT.indexOf(first.label)]} ${first.year} to ${daysInMonth(last.year, MONTH_SHORT.indexOf(last.label) + 1)} ${MONTH_LONG[MONTH_SHORT.indexOf(last.label)]} ${last.year}` : "",
      };
    }
    return {
      period: `${curr.label} ${curr.year}`,
      today: String(ordersTodayCount),
      active: activeCustomers.toLocaleString("en-IN"),
      text: `1 ${MONTH_LONG[MONTH_SHORT.indexOf(curr.label)]} ${curr.year} to ${daysInMonth(curr.year, MONTH_SHORT.indexOf(curr.label) + 1)} ${MONTH_LONG[MONTH_SHORT.indexOf(curr.label)]} ${curr.year}`,
    };
  }, [range, curr, prev, monthsWindow, stats, ordersTodayCount]);

  const muted = { fontSize: 12, color: "var(--muted)" };
  const entityName = user?.entity || "Optical Business";
  const roleLabel = user?.role?.name ? user.role.name.charAt(0).toUpperCase() + user.role.name.slice(1) : "Owner";
  const avatarInitials = entityName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "OA";

  const financials = stats?.financials;
  const recentPendingOrders = stats?.recentPendingOrders || [];
  const pendingApprovals = stats?.pendingApprovals || [];

  return (
    <>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr_340px]">
        <div className="vw-card flex flex-col md:flex-row items-start md:items-center gap-5" style={{ padding: "20px 24px" }}>
          <div className="min-w-0">
            <div style={muted}>Home&nbsp;&nbsp;&gt;&nbsp;&nbsp;Dashboard</div>
            <div className="flex items-center gap-4 mt-3">
              <span className="grid place-items-center rounded-full shrink-0" style={{ width: 64, height: 64, background: "var(--primary-gradient)", color: "var(--on-primary)", fontSize: 22, fontWeight: 700, boxShadow: "var(--glow)" }}>{avatarInitials}</span>
              <div>
                <div className="flex items-center gap-2"><span style={{ fontSize: 22, fontWeight: 700 }}>{entityName}</span><StatusPill status="active" /></div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>{roleLabel} dashboard&nbsp;&nbsp;-&nbsp;&nbsp;Activity from {meta.text} (IST)</div>
              </div>
            </div>
          </div>
          <div className="mt-4 md:mt-0 w-full md:w-auto md:ml-auto md:pl-5 flex flex-col gap-3 md:border-l border-divider">
            <div className="flex flex-wrap gap-4 md:gap-6">
              {[["Period", meta.period], ["Orders today", meta.today], ["Active customers", meta.active], ["Last synced", loading ? "Syncing…" : "Just now"]].map(([l, v]) => (
                <div key={l} className="whitespace-nowrap"><div style={muted}>{l}</div><div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div></div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger className="h-10 w-[150px] rounded-[10px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="this-month">This month</SelectItem>
                  <SelectItem value="last-month">Last month</SelectItem>
                  <SelectItem value="last-3">Last 3 months</SelectItem>
                </SelectContent>
              </Select>
              <Link to="/orders/new" className="vw-btn-primary h-10 inline-flex items-center" style={{ fontSize: 14 }}>+ New Order</Link>
            </div>
          </div>
        </div>

        <div className="vw-card" style={{ padding: "16px 20px" }}>
          <CardHead icon={<CreditCard size={16} />} title="Credit & Receivables" right={<ChevronRight size={18} style={{ color: "var(--muted)" }} />} />
          {[
            ["Total outstanding", inr(totalOutstanding)],
            ["Overdue (60+ days)", inr(overdueAmount), "var(--p-overdue)"],
            ["Avg payment days", avgPaymentDays !== null ? `${avgPaymentDays} Days` : "—"],
            ["Credit approvals pending", String(limitQueueCount)],
          ].map(([l, v, c], i) => (
            <div key={l} className="flex justify-between py-2" style={{ borderTop: i ? "1px solid var(--divider)" : undefined }}>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>{l}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: c }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="flex flex-wrap items-center gap-3 py-2">
        <h3 className="w-full md:w-auto" style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, marginRight: 8 }}>Quick Actions</h3>

        <Link to="/customer-onboard" className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 hover:border-blue-200 px-4 py-2 rounded-xl text-[13px] font-semibold text-slate-700 transition-all shadow-sm group">
          <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors"><UserPlus size={16} /></span>
          Create Customer
        </Link>

        <Link to="/billing" search={{ tab: "dues" }} className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 hover:border-emerald-200 px-4 py-2 rounded-xl text-[13px] font-semibold text-slate-700 transition-all shadow-sm group">
          <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors"><Receipt size={16} /></span>
          Add Payment
        </Link>

        <Link to="/billing" search={{ tab: "limit_requests" }} className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 hover:border-amber-200 px-4 py-2 rounded-xl text-[13px] font-semibold text-slate-700 transition-all shadow-sm group">
          <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors"><TrendingUp size={16} /></span>
          Credit Request
        </Link>

        <Link to="/billing" search={{ tab: "dues" }} className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 hover:border-indigo-200 px-4 py-2 rounded-xl text-[13px] font-semibold text-slate-700 transition-all shadow-sm group">
          <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Send size={16} /></span>
          Send Reminder
        </Link>
      </div>

      <Kpis kpis={kpis} />
      <ChartsRow
        salesAmount={salesAmount}
        orderCounts={orderCounts}
        orderCountsAlt={orderCountsAlt}
        lensMix={lensMix}
        lensMixAlt={lensMixAlt}
        totalSalesLabel={curr ? inrLakh(curr.revenue) : undefined}
        currentMonthLabel={curr ? `${curr.label} ${curr.year}` : undefined}
        prevMonthLabel={prev ? `${prev.label} ${prev.year}` : undefined}
        barRangeLabel={orderCounts.length ? `${orderCounts[0].m}–${orderCounts[orderCounts.length - 1].m}` : undefined}
        barRangeLabelPrev={orderCountsAlt.length ? `${orderCountsAlt[0].m}–${orderCountsAlt[orderCountsAlt.length - 1].m}` : undefined}
        currentMonthShort={curr?.label}
      />

      <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">

        {/* 1. Pending Orders */}
        <div className="vw-card" style={{ padding: "16px 18px" }}>
          <CardHead icon={<Clock size={16} />} title="Recent Pending Orders" note="Needs dispatch" />
          <div className="space-y-3 mt-4">
            {!loading && recentPendingOrders.length === 0 && (
              <div className="text-[12px] text-slate-400 text-center py-4">No pending orders</div>
            )}
            {recentPendingOrders.map(ord => (
              <div key={ord.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                <div>
                  <div className="font-semibold text-[13px] text-blue-600">{ord.id}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{ord.shop} • {ord.date}</div>
                </div>
                <div className="font-bold text-[13px] text-slate-800">{ord.amount}</div>
              </div>
            ))}
          </div>
          <Link to="/dispatch" className="w-full mt-4 text-[12px] font-semibold text-blue-600 hover:bg-blue-50 py-2 rounded-lg transition-colors block text-center">View All Pending Orders</Link>
        </div>

        {/* 2. Pending Customers */}
        <div className="vw-card" style={{ padding: "16px 18px" }}>
          <CardHead icon={<Users size={16} />} title="Pending Approvals" note="Needs KYC" />
          <div className="space-y-3 mt-4">
            {!loading && pendingApprovals.length === 0 && (
              <div className="text-[12px] text-slate-400 text-center py-4">No pending approvals</div>
            )}
            {pendingApprovals.map(cust => (
              <div key={cust.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                <div>
                  <div className="font-semibold text-[13px] text-slate-800">{cust.shop}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{cust.id} • {cust.city}</div>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 bg-amber-100 text-amber-700 rounded border border-amber-200">Pending</div>
              </div>
            ))}
          </div>
          <Link to="/pending-accounts" className="w-full mt-4 text-[12px] font-semibold text-blue-600 hover:bg-blue-50 py-2 rounded-lg transition-colors block text-center">Review Pending Accounts</Link>
        </div>

        {/* 3. Pending & Overdue (Monthly Data) */}
        <div className="vw-card" style={{ padding: "16px 18px" }}>
          <CardHead icon={<AlertCircle size={16} />} title="Pending & Overdue" note="Monthly Snapshot" />

          <div className="mt-4 space-y-4">
            {/* This Month */}
            <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/30">
              <div className="flex items-center gap-2 mb-2 text-[12px] font-bold text-slate-600 uppercase tracking-wider">
                <Calendar size={14} className="text-blue-500" /> This Month ({curr?.label ?? ""})
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] text-slate-500 mb-0.5">Total Ordered</div>
                  <div className="text-[14px] font-bold text-slate-800">{inr(financials?.thisMonth?.ordered)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 mb-0.5">Payment Received</div>
                  <div className="text-[14px] font-bold text-emerald-600">{inr(financials?.thisMonth?.received)}</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-100/50 flex justify-between items-center">
                <span className="text-[11px] font-semibold text-slate-500">Unpaid / Pending</span>
                <span className="text-[13px] font-bold text-rose-600">{inr(financials?.thisMonth?.pending)}</span>
              </div>
            </div>

            {/* Last Month */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2 text-[12px] font-bold text-slate-600 uppercase tracking-wider">
                <Calendar size={14} className="text-slate-400" /> Last Month ({prev?.label ?? ""})
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] text-slate-500 mb-0.5">Total Ordered</div>
                  <div className="text-[14px] font-bold text-slate-800">{inr(financials?.lastMonth?.ordered)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 mb-0.5">Payment Received</div>
                  <div className="text-[14px] font-bold text-emerald-600">{inr(financials?.lastMonth?.received)}</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                <span className="text-[11px] font-semibold text-slate-500">Overdue (Unpaid)</span>
                <span className="text-[13px] font-bold text-rose-600">{inr(financials?.lastMonth?.overdue)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
