import { useState, useEffect, useMemo } from "react";
import { Download, TrendingUp, Users, PackageOpen, IndianRupee, BarChart3, Search } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { Link } from '@tanstack/react-router';
import { reportService } from "@/services/reportService";
import { getItem } from "@/services/storage";
import "@/styles/veriwide.css";

const DATE_RANGE_LABELS = {
  today: "Today",
  this_week: "This Week",
  this_month: "This Month",
  last_6_months: "Last 6 Months",
  this_year: "This Year",
};

// Sales breakdown card views. metric = what the bar shows; qtyLabel = what "qty" means.
const BREAKDOWN_VIEWS = [
  { key: "powers", label: "Lens powers", metric: "qty", qtyLabel: "Units ordered", note: "Most ordered SPH / CYL combinations" },
  { key: "sph_ranges", label: "SPH ranges", metric: "qty", qtyLabel: "Pieces dispatched", note: "Dispatched pieces by SPH range (2.00 steps)" },
  { key: "top_revenue", label: "Top products by revenue", metric: "revenue", qtyLabel: "Pieces dispatched", note: "Dispatched sale, ex-GST" },
  { key: "top_volume", label: "Top products by volume", metric: "qty", qtyLabel: "Pieces dispatched", note: "Dispatched pieces" },
  { key: "attributes", label: "Index / base / coating", metric: "revenue", qtyLabel: "Pieces dispatched", note: "Which lens combinations sell, ex-GST" },
  { key: "customer_tier", label: "Customer tier", metric: "revenue", qtyLabel: "Orders", note: "Dispatched sale by pricing tier, ex-GST" },
  { key: "city", label: "City", metric: "revenue", qtyLabel: "Orders", note: "Dispatched sale by customer city, ex-GST" },
];

// Account card views (the pie stays the same; the table below it switches).
const KHATA_VIEWS = [
  { key: "status", label: "High risk accounts", note: "Customers with maximum pending khata" },
  { key: "ageing", label: "Invoice age", note: "Unpaid bills by age (oldest bills paid first)" },
  { key: "overdue", label: "Overdue payments", note: "Unpaid past the payment term" },
  { key: "credit", label: "Credit limit use", note: "Customers closest to their credit limit" },
  { key: "hold", label: "Short / Hold / Review", note: "How long each account has been in this status" },
];

const CUSTOMER_FILTERS = [
  { key: "all", label: "All customers" },
  { key: "dormant", label: "Dormant (60+ days quiet)" },
  { key: "near_limit", label: "Near credit limit (80%+)" },
  { key: "hold", label: "Short / Hold / Review" },
];

const TERM_LABELS = { cash: "Cash", "1_week": "1 Week", "1_month": "1 Month", credit_on_bills: "Credit on bills", adjustment: "Adjustment", one_time: "One time" };
const BUCKET_LABELS = { "0_30": "0–30 days", "31_60": "31–60 days", "61_90": "61–90 days", "90_plus": "90+ days" };
const BAND_LABELS = { below_50: "Below 50%", "50_to_80": "50–80%", "80_to_100": "80–100%", over_100: "Over limit" };

const inr = (n) => "₹" + Math.round(n || 0).toLocaleString("en-IN");
const daysText = (d) => (d === null || d === undefined ? "—" : `${d} day${d === 1 ? "" : "s"}`);

export function Reports() {
  const user = getItem("admin_user");
  const isShared = user?.entity === "Shared";

  const [dateRange, setDateRange] = useState("this_month");
  const [entity, setEntity] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [kpis, setKpis] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [months, setMonths] = useState(7);
  const [chartView, setChartView] = useState("revenue");
  const [breakdownView, setBreakdownView] = useState("powers");
  const [breakdownData, setBreakdownData] = useState([]);
  const [khataStatus, setKhataStatus] = useState({ pieData: [], highRisk: [], totalAccounts: 0 });
  const [khataView, setKhataView] = useState("status");
  const [khataViewData, setKhataViewData] = useState(null);
  const [loadingKhataView, setLoadingKhataView] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customersTotal, setCustomersTotal] = useState(0);
  const [customersTotalPages, setCustomersTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  const breakdown = BREAKDOWN_VIEWS.find((v) => v.key === breakdownView);
  const khata = KHATA_VIEWS.find((v) => v.key === khataView);

  // KPIs and the sales breakdown follow the date-range selector; the trend chart has its own
  // month count; account figures are live balances.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await reportService.getKPIs(dateRange, entity);
        if (!cancelled) setKpis(res.data);
      } catch (err) {
        console.error("Could not load report KPIs:", err);
        if (!cancelled) setKpis(null);
      }
    })();
    return () => { cancelled = true; };
  }, [dateRange, entity]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await reportService.getRevenueVsCollections(months, entity);
        if (!cancelled) setRevenueData(res.data || []);
      } catch (err) {
        console.error("Could not load revenue chart:", err);
        if (!cancelled) setRevenueData([]);
      }
    })();
    return () => { cancelled = true; };
  }, [months, entity]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await reportService.getFastMovingLenses(breakdownView, dateRange, entity);
        if (!cancelled) setBreakdownData(res.data || []);
      } catch (err) {
        console.error("Could not load sales breakdown:", err);
        if (!cancelled) setBreakdownData([]);
      }
    })();
    return () => { cancelled = true; };
  }, [breakdownView, dateRange, entity]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await reportService.getKhataStatusBreakdown("status", entity);
        if (!cancelled) setKhataStatus(res.data || { pieData: [], highRisk: [], totalAccounts: 0 });
      } catch (err) {
        console.error("Could not load khata status:", err);
        if (!cancelled) setKhataStatus({ pieData: [], highRisk: [], totalAccounts: 0 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [entity]);

  useEffect(() => {
    if (khataView === "status") return undefined;
    let cancelled = false;
    (async () => {
      setLoadingKhataView(true);
      setKhataViewData(null);
      try {
        const res = await reportService.getKhataStatusBreakdown(khataView, entity);
        if (!cancelled) setKhataViewData(res.data || null);
      } catch (err) {
        console.error("Could not load account view:", err);
        if (!cancelled) setKhataViewData(null);
      } finally {
        if (!cancelled) setLoadingKhataView(false);
      }
    })();
    return () => { cancelled = true; };
  }, [khataView, entity]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingCustomers(true);
      try {
        const res = await reportService.getCustomerAnalytics({ search: customerSearch, page: currentPage, limit: itemsPerPage, filter: customerFilter, ...(entity ? { entity } : {}) });
        if (cancelled) return;
        setCustomers(res.data?.customers || []);
        setCustomersTotal(res.data?.total || 0);
        setCustomersTotalPages(res.data?.totalPages || 1);
      } catch (err) {
        console.error("Could not load customer analytics:", err);
        if (!cancelled) { setCustomers([]); setCustomersTotal(0); setCustomersTotalPages(1); }
      } finally {
        if (!cancelled) setLoadingCustomers(false);
      }
    })();
    return () => { cancelled = true; };
  }, [customerSearch, currentPage, customerFilter, entity]);

  // Reset to page 1 whenever the search term, filter or business changes
  useEffect(() => { setCurrentPage(1); }, [customerSearch, customerFilter, entity]);

  const salesStats = useMemo(() => {
    const s = kpis?.sales;
    if (!s) return [];
    return [
      { label: "Orders Booked", value: (s.ordersBooked || 0).toLocaleString("en-IN"), hint: "Not cancelled" },
      { label: "Dispatched Sale", value: inr(s.dispatchedRevenueExGst), hint: `${s.ordersDispatched || 0} orders • ex-GST • GST ${inr(s.gst)}` },
      { label: "Avg Order Value", value: inr(s.avgOrderValue), hint: "Dispatched, ex-GST" },
      { label: "Returns Credited", value: inr(s.returnsCredited), hint: `${s.returnsCount || 0} credit note${s.returnsCount === 1 ? "" : "s"}` },
      { label: "New / Repeat Customers", value: `${s.newCustomers || 0} / ${s.repeatCustomers || 0}`, hint: "Ordered in this period" },
    ];
  }, [kpis]);

  // Table + summary chips for the selected account view.
  const khataTable = useMemo(() => {
    if (khataView === "status") {
      return {
        headers: ["Pending Due", "Status"],
        summary: [],
        rows: khataStatus.highRisk.map((c) => ({
          id: c.id, name: c.name, city: c.city,
          cells: [
            { text: inr(c.due), className: "text-[14px] font-black text-rose-600 text-right" },
            { badge: c.status, tone: c.status === "Hold" ? "rose" : "emerald" },
          ],
        })),
        empty: "No high-risk accounts right now.",
      };
    }
    const d = khataViewData || {};
    const list = d.list || [];
    const base = (r) => ({ id: r.customer_id, name: r.name, city: r.city });
    if (khataView === "ageing") {
      return {
        headers: ["Unpaid", "Oldest Bill"],
        summary: Object.keys(BUCKET_LABELS).map((k) => ({ label: BUCKET_LABELS[k], value: inr(d.totals?.[k]) })),
        rows: list.map((r) => ({ ...base(r), cells: [
          { text: inr(r.unpaid), className: "text-[14px] font-black text-slate-800 text-right" },
          { text: daysText(r.oldest_unpaid_days), className: `text-[13px] font-bold text-center ${r.oldest_unpaid_days > 90 ? "text-rose-600" : "text-slate-600"}` },
        ] })),
        empty: "No unpaid bills.",
      };
    }
    if (khataView === "overdue") {
      return {
        headers: ["Overdue", "Term"],
        summary: [{ label: "Total overdue", value: inr(d.totals?.overdue) }, { label: "Customers", value: d.total || 0 }],
        rows: list.map((r) => ({ ...base(r), cells: [
          { text: inr(r.overdue), className: "text-[14px] font-black text-rose-600 text-right" },
          { text: TERM_LABELS[r.payment_term] || r.payment_term || "—", className: "text-[12px] font-semibold text-slate-600 text-center" },
        ] })),
        empty: "No overdue payments.",
      };
    }
    if (khataView === "credit") {
      return {
        headers: ["Used / Limit", "Used"],
        summary: (d.bands || []).map((b) => ({ label: BAND_LABELS[b.band] || b.band, value: `${b.customers} cust.` })),
        rows: list.map((r) => ({ ...base(r), cells: [
          { text: `${inr(r.used_balance)} / ${inr(r.credit_limit)}`, className: "text-[13px] font-bold text-slate-700 text-right" },
          { text: `${Math.round(r.utilisation_percent || 0)}%`, className: `text-[13px] font-black text-center ${r.utilisation_percent >= 80 ? "text-rose-600" : "text-slate-600"}` },
        ] })),
        empty: "No customers with a credit limit.",
      };
    }
    return {
      headers: ["Status", "Since"],
      summary: (d.summary || []).map((s) => ({ label: s.status, value: `${s.customers} • avg ${daysText(s.average_days)}` })),
      rows: list.map((r) => ({ ...base(r), cells: [
        { badge: r.account_status, tone: r.account_status === "Review" ? "amber" : "rose" },
        { text: daysText(r.days_in_status), className: "text-[13px] font-bold text-slate-600 text-center" },
      ] })),
      empty: "No accounts on Short, Hold or Review.",
    };
  }, [khataView, khataViewData, khataStatus]);

  const pageButtons = useMemo(() => {
    const pages = [];
    for (let p = 1; p <= customersTotalPages; p++) {
      if (p === 1 || p === customersTotalPages || Math.abs(p - currentPage) <= 1) pages.push(p);
      else if (pages[pages.length - 1] !== "...") pages.push("...");
    }
    return pages;
  }, [customersTotalPages, currentPage]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 text-white text-[12px] p-3 rounded-lg shadow-xl border border-slate-700 backdrop-blur-sm">
          <p className="font-bold text-[14px] mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <span className="text-slate-300 capitalize">{entry.name}:</span>
              <span className="font-bold">₹{entry.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const BreakdownTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const row = payload[0].payload;
    return (
      <div className="bg-slate-900/95 text-white text-[12px] p-3 rounded-lg shadow-xl border border-slate-700">
        <p className="font-bold text-[13px] mb-1">{row.label}</p>
        {row.qty !== undefined && row.qty !== null && <p className="text-slate-300">{breakdown.qtyLabel}: <span className="font-bold text-white">{Number(row.qty).toLocaleString("en-IN")}</span></p>}
        {row.customers !== undefined && <p className="text-slate-300">Customers: <span className="font-bold text-white">{row.customers}</span></p>}
        {row.revenue !== undefined && <p className="text-slate-300">Sale: <span className="font-bold text-white">{inr(row.revenue)}</span></p>}
      </div>
    );
  };

  const BADGE_TONES = {
    rose: "bg-rose-100 text-rose-700 border-rose-200",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
  };

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="text-blue-600" /> Analytics & Reports
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">Comprehensive overview of sales, matrix inventory, and khata (ledger) performance.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {isShared && (
            <select
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              className="h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] font-medium text-slate-700 focus:outline-none focus:border-blue-500 w-full sm:w-auto flex-1 sm:flex-none"
            >
              <option value="">Both Businesses</option>
              <option value="Arsh Optical">Arsh Optical</option>
              <option value="Sunshine Optical">Sunshine Optical</option>
            </select>
          )}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] font-medium text-slate-700 focus:outline-none focus:border-blue-500 w-full sm:w-auto flex-1 sm:flex-none"
          >
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="last_6_months">Last 6 Months</option>
            <option value="this_year">This Year</option>
          </select>
          <button className="flex items-center justify-center gap-2 vw-btn-primary h-10 px-4 w-full sm:w-auto flex-1 sm:flex-none">
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
        <div className="vw-card p-5 border-l-4 border-l-blue-500 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Total Sales</p>
              <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center"><TrendingUp size={16} /></div>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mt-3">{inr(kpis?.totalSales)}</h2>
            <div className="flex items-center gap-1 mt-2 text-[12px] font-medium text-slate-500">
              <span>Booked, incl. GST • {DATE_RANGE_LABELS[dateRange]}</span>
            </div>
          </div>
        </div>

        <div className="vw-card p-5 border-l-4 border-l-emerald-500 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Payments Collected</p>
              <div className="w-8 h-8 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center"><IndianRupee size={16} /></div>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mt-3">{inr(kpis?.totalCollected)}</h2>
            <div className="flex items-center gap-1 mt-2 text-[12px] font-medium text-slate-500">
              <span>{DATE_RANGE_LABELS[dateRange]}</span>
            </div>
          </div>
        </div>

        <div className="vw-card p-5 border-l-4 border-l-rose-500 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-rose-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Outstanding Khata</p>
              <div className="w-8 h-8 rounded bg-rose-50 text-rose-600 flex items-center justify-center"><Users size={16} /></div>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mt-3">{inr(kpis?.outstandingKhata)}</h2>
            <div className="flex items-center gap-1 mt-2 text-[12px] font-medium text-slate-500">
              <span>Current balance across active accounts</span>
            </div>
          </div>
        </div>

        <div className="vw-card p-5 border-l-4 border-l-amber-500 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Lenses Dispatched</p>
              <div className="w-8 h-8 rounded bg-amber-50 text-amber-600 flex items-center justify-center"><PackageOpen size={16} /></div>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mt-3">{(kpis?.dispatchedUnits || 0).toLocaleString("en-IN")} Units</h2>
            <div className="flex items-center gap-1 mt-2 text-[12px] font-medium text-slate-500">
              <span>{DATE_RANGE_LABELS[dateRange]}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sales details for the same period */}
      {salesStats.length > 0 && (
        <div className="vw-card mt-5 p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {salesStats.map((s) => (
            <div key={s.label} className="min-w-0">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{s.label}</p>
              <p className="text-[18px] font-black text-slate-900 mt-1 truncate">{s.value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{s.hint}</p>
            </div>
          ))}
        </div>
      )}

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Revenue vs Collection Chart */}
        <div className="lg:col-span-2 vw-card p-5">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
            <div>
              <h3 className="text-[14px] font-bold text-slate-800 uppercase tracking-wider">{chartView === "aov" ? "Average Order Value" : "Revenue vs Collections"}</h3>
              <p className="text-[12px] text-slate-500 mt-0.5">{chartView === "aov" ? "Booked order value ÷ number of orders, per month (incl. GST)" : "Monthly comparison of total sales vs actual payments received"}</p>
            </div>
            <div className="flex items-center gap-2">
              <select value={chartView} onChange={(e) => setChartView(e.target.value)} className="h-8 px-2 bg-white border border-slate-200 rounded text-[12px] font-semibold text-slate-700 focus:outline-none focus:border-blue-500">
                <option value="revenue">Revenue vs Collections</option>
                <option value="aov">Avg Order Value</option>
              </select>
              <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className="h-8 px-2 bg-white border border-slate-200 rounded text-[12px] font-semibold text-slate-700 focus:outline-none focus:border-blue-500">
                <option value={7}>7 months</option>
                <option value={12}>12 months</option>
                <option value={24}>24 months</option>
              </select>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                {chartView === "aov" ? (
                  <Area type="monotone" dataKey="aov" name="Avg Order Value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                ) : (
                  <>
                    <Area type="monotone" dataKey="revenue" name="Total Revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                    <Area type="monotone" dataKey="collections" name="Total Collections" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCol)" />
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Khata Status Pie Chart */}
        <div className="vw-card p-5 flex flex-col">
          <div className="mb-4">
            <h3 className="text-[14px] font-bold text-slate-800 uppercase tracking-wider">Account Status Breakdown</h3>
            <p className="text-[12px] text-slate-500 mt-0.5">Based on credit limits & dues</p>
          </div>
          <div className="flex-1 min-h-[200px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={khataStatus.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {khataStatus.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '13px', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[24px] font-black text-slate-800">{khataStatus.totalAccounts}</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Accounts</span>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {khataStatus.pieData.map((entry, index) => (
              <div key={index} className="flex justify-between items-center text-[13px]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                  <span className="font-medium text-slate-700">{entry.name}</span>
                </div>
                <span className="font-bold text-slate-900">{entry.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Matrix Analytics & Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

        {/* Sales breakdown (lens powers by default) */}
        <div className="vw-card p-5">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
            <div>
              <h3 className="text-[14px] font-bold text-slate-800 uppercase tracking-wider">{breakdownView === "powers" ? "Fast Moving Lens Powers" : breakdown.label}</h3>
              <p className="text-[12px] text-slate-500 mt-0.5">{breakdown.note} • {DATE_RANGE_LABELS[dateRange]}</p>
            </div>
            <select value={breakdownView} onChange={(e) => setBreakdownView(e.target.value)} className="h-8 px-2 bg-white border border-slate-200 rounded text-[12px] font-semibold text-slate-700 focus:outline-none focus:border-blue-500">
              {BREAKDOWN_VIEWS.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
            </select>
          </div>
          <div className="h-[250px] w-full">
            {breakdownData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[13px] text-slate-400">No sales in this period.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakdownData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => (breakdown.metric === "revenue" ? `₹${Math.round(val / 1000)}k` : val)} />
                  <YAxis dataKey="label" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} width={breakdownView === "powers" || breakdownView === "sph_ranges" ? 110 : 140} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} content={<BreakdownTooltip />} />
                  <Bar dataKey={breakdown.metric} name={breakdown.metric === "revenue" ? "Sale" : breakdown.qtyLabel} fill="#6366f1" radius={[0, 4, 4, 0]} barSize={18}>
                    {breakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : '#818cf8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Accounts: high risk by default, or invoice age / overdue / credit use / Short-Hold */}
        <div className="vw-card p-0 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-[14px] font-bold text-slate-800 uppercase tracking-wider">{khata.label}</h3>
              <p className="text-[12px] text-slate-500 mt-0.5">{khata.note}</p>
            </div>
            <select value={khataView} onChange={(e) => setKhataView(e.target.value)} className="h-8 px-2 bg-white border border-slate-200 rounded text-[12px] font-semibold text-slate-700 focus:outline-none focus:border-blue-500">
              {KHATA_VIEWS.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
            </select>
          </div>
          {khataTable.summary.length > 0 && (
            <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap gap-2">
              {khataTable.summary.map((s) => (
                <div key={s.label} className="px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-[11px]">
                  <span className="text-slate-500 font-semibold">{s.label}: </span>
                  <span className="font-black text-slate-800">{s.value}</span>
                </div>
              ))}
            </div>
          )}
          <div className="p-0 flex-1 overflow-x-auto">
            <table className="w-full text-left min-w-[400px]">
              <thead>
                <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="px-5 py-3 font-bold">Customer</th>
                  <th className="px-5 py-3 font-bold text-right">{khataTable.headers[0]}</th>
                  <th className="px-5 py-3 font-bold text-center">{khataTable.headers[1]}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(khataView === "status" ? loading : loadingKhataView) && (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400 text-[13px]">Loading…</td></tr>
                )}
                {!(khataView === "status" ? loading : loadingKhataView) && khataTable.rows.length === 0 && (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400 text-[13px]">{khataTable.empty}</td></tr>
                )}
                {khataTable.rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 text-[13px] font-bold text-slate-800">
                      <Link to={`/reports/${r.id}`} className="hover:text-blue-600 hover:underline">{r.name}</Link>
                      <span className="block text-[11px] font-normal text-slate-500">{r.city}</span>
                    </td>
                    {r.cells.map((cell, i) => (
                      cell.badge ? (
                        <td key={i} className="px-5 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${BADGE_TONES[cell.tone]}`}>{cell.badge}</span>
                        </td>
                      ) : (
                        <td key={i} className={`px-5 py-3 ${cell.className}`}>{cell.text}</td>
                      )
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-slate-100 bg-slate-50 text-center">
            <Link to="/billing" className="text-[12px] font-bold text-blue-600 hover:underline">View All Outstanding Dues</Link>
          </div>
        </div>
      </div>

      {/* Customer Wise Reporting Section */}
      <div className="mt-6 vw-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gradient-to-r from-slate-50 to-white gap-4">
          <div>
            <h3 className="text-[15px] font-bold text-slate-800 uppercase tracking-wider">Customer-wise Analytics</h3>
            <p className="text-[12px] text-slate-500 mt-1">Search or click a customer to view their detailed performance report.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-[13px] font-medium text-slate-700 focus:outline-none focus:border-blue-500"
            >
              {CUSTOMER_FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search customers..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-4 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 transition-shadow"
              />
            </div>
            <button className="flex items-center justify-center gap-2 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-[12px] font-bold text-slate-700 rounded transition-colors whitespace-nowrap">
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[12px] uppercase tracking-wider text-slate-500">
                <th className="px-5 py-4 font-bold">Customer Info</th>
                <th className="px-5 py-4 font-bold text-center">Total Orders</th>
                <th className="px-5 py-4 font-bold text-center">Last Order</th>
                <th className="px-5 py-4 font-bold text-right">Total Revenue</th>
                <th className="px-5 py-4 font-bold text-right">Payments Collected</th>
                <th className="px-5 py-4 font-bold text-right">Pending Dues</th>
                <th className="px-5 py-4 font-bold text-center">Health</th>
                <th className="px-5 py-4 font-bold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loadingCustomers && customers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-5 py-8 text-center text-slate-500 text-[13px]">No customers match your search.</td>
                </tr>
              ) : null}
              {customers.map(customer => (
                <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <Link to={`/reports/${customer.id}`} className="font-bold text-[14px] text-blue-600 hover:underline">{customer.name}</Link>
                    <div className="text-[12px] text-slate-500 mt-0.5">{customer.city} • {customer.users} Sub-account{customer.users === 1 ? "" : "s"}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {[customer.accountStatus, customer.stockGrade, customer.paymentGrade && customer.paymentGrade !== "Normal" ? `Payment: ${customer.paymentGrade}` : null].filter(Boolean).join(" • ")}
                      {customer.creditUsedPercent !== null && customer.creditUsedPercent !== undefined && (
                        <span className={customer.creditUsedPercent >= 80 ? "text-rose-600 font-bold" : ""}> • Credit used {customer.creditUsedPercent}%</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="font-semibold text-[14px] text-slate-800">{customer.orders}</div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className={`text-[13px] font-semibold ${customer.daysSinceLastOrder >= 60 ? "text-rose-600" : "text-slate-700"}`}>
                      {customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </div>
                    {customer.daysSinceLastOrder !== null && customer.daysSinceLastOrder !== undefined && (
                      <div className="text-[11px] text-slate-400">{daysText(customer.daysSinceLastOrder)} ago</div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="font-bold text-[14px] text-slate-700">{inr(customer.revenue)}</div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="font-bold text-[14px] text-emerald-600">{inr(customer.collected)}</div>
                    <div className="text-[11px] text-slate-400">{customer.percent}% Collected</div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className={`font-bold text-[14px] ${customer.due > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{inr(customer.due)}</div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${customer.healthColor}`}>{customer.health}</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <Link to={`/reports/${customer.id}`} className="text-[12px] font-bold text-blue-600 hover:underline flex items-center justify-center gap-1">
                      View Report
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-800">{customersTotal === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-slate-800">{Math.min(currentPage * itemsPerPage, customersTotal)}</span> of <span className="font-bold text-slate-800">{customersTotal}</span> entries
          </div>
          <div className="flex gap-1 flex-wrap">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded disabled:opacity-50 disabled:cursor-not-allowed font-medium text-slate-600"
            >
              Prev
            </button>
            {pageButtons.map((p, i) => p === "..." ? (
              <span key={`e${i}`} className="px-2 py-1.5 text-slate-400">…</span>
            ) : (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`px-3 py-1.5 rounded font-bold border ${currentPage === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={currentPage === customersTotalPages || customersTotalPages === 0}
              onClick={() => setCurrentPage(prev => Math.min(customersTotalPages, prev + 1))}
              className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded disabled:opacity-50 disabled:cursor-not-allowed font-medium text-slate-600"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
