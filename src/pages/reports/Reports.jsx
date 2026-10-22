import { useState, useEffect, useMemo } from "react";
import { Download, TrendingUp, Users, PackageOpen, IndianRupee, BarChart3, Filter, Search } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { Link } from '@tanstack/react-router';
import { reportService } from "@/services/reportService";
import "@/styles/veriwide.css";

const DATE_RANGE_LABELS = {
  today: "Today",
  this_week: "This Week",
  this_month: "This Month",
  last_6_months: "Last 6 Months",
  this_year: "This Year",
};

const inr = (n) => "₹" + Math.round(n || 0).toLocaleString("en-IN");

export function Reports() {
  const [dateRange, setDateRange] = useState("this_month");
  const [customerSearch, setCustomerSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [kpis, setKpis] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [lensPowerData, setLensPowerData] = useState([]);
  const [khataStatus, setKhataStatus] = useState({ pieData: [], highRisk: [], totalAccounts: 0 });
  const [customers, setCustomers] = useState([]);
  const [customersTotal, setCustomersTotal] = useState(0);
  const [customersTotalPages, setCustomersTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // KPIs react to the date-range selector; the charts/tables below are their own
  // always-current / last-7-months views (same split as the Dashboard page).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await reportService.getKPIs(dateRange);
        if (!cancelled) setKpis(res.data);
      } catch (err) {
        console.error("Could not load report KPIs:", err);
        if (!cancelled) setKpis(null);
      }
    })();
    return () => { cancelled = true; };
  }, [dateRange]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [revRes, lensRes, khataRes] = await Promise.allSettled([
          reportService.getRevenueVsCollections(),
          reportService.getFastMovingLenses(),
          reportService.getKhataStatusBreakdown(),
        ]);
        if (cancelled) return;
        setRevenueData(revRes.status === "fulfilled" ? revRes.value.data || [] : []);
        setLensPowerData(lensRes.status === "fulfilled" ? lensRes.value.data || [] : []);
        setKhataStatus(khataRes.status === "fulfilled" ? khataRes.value.data || { pieData: [], highRisk: [], totalAccounts: 0 } : { pieData: [], highRisk: [], totalAccounts: 0 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingCustomers(true);
      try {
        const res = await reportService.getCustomerAnalytics({ search: customerSearch, page: currentPage, limit: itemsPerPage });
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
  }, [customerSearch, currentPage]);

  // Reset to page 1 whenever the search term changes
  useEffect(() => { setCurrentPage(1); }, [customerSearch]);

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
              <span>{DATE_RANGE_LABELS[dateRange]}</span>
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

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Revenue vs Collection Chart */}
        <div className="lg:col-span-2 vw-card p-5">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-[14px] font-bold text-slate-800 uppercase tracking-wider">Revenue vs Collections</h3>
              <p className="text-[12px] text-slate-500 mt-0.5">Monthly comparison of total sales vs actual payments received</p>
            </div>
            <div className="hidden sm:flex gap-4 text-[12px] font-bold">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-500"></div> Revenue</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-500"></div> Collections</div>
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
                <Area type="monotone" dataKey="revenue" name="Total Revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="collections" name="Total Collections" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCol)" />
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

        {/* Fast Moving SPH/CYL Powers */}
        <div className="vw-card p-5">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-[14px] font-bold text-slate-800 uppercase tracking-wider">Fast Moving Lens Powers</h3>
              <p className="text-[12px] text-slate-500 mt-0.5">Most ordered SPH / CYL combinations</p>
            </div>
            <button className="text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors"><Filter size={16} /></button>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lensPowerData} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis dataKey="power" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }} width={80} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <Bar dataKey="qty" name="Units Sold" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={24}>
                  {lensPowerData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : '#818cf8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Pending Dues (Ledger Risk) */}
        <div className="vw-card p-0 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="text-[14px] font-bold text-slate-800 uppercase tracking-wider">High Risk Accounts</h3>
              <p className="text-[12px] text-slate-500 mt-0.5">Customers with maximum pending khata</p>
            </div>
          </div>
          <div className="p-0 flex-1 overflow-x-auto">
            <table className="w-full text-left min-w-[400px]">
              <thead>
                <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="px-5 py-3 font-bold">Customer</th>
                  <th className="px-5 py-3 font-bold text-right">Pending Due</th>
                  <th className="px-5 py-3 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!loading && khataStatus.highRisk.length === 0 && (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400 text-[13px]">No high-risk accounts right now.</td></tr>
                )}
                {khataStatus.highRisk.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 text-[13px] font-bold text-slate-800">{c.name} <span className="block text-[11px] font-normal text-slate-500">{c.city}</span></td>
                    <td className="px-5 py-3 text-[14px] font-black text-rose-600 text-right">{inr(c.due)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${c.status === "Hold" ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"}`}>{c.status}</span>
                    </td>
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
          <div className="flex items-center gap-3 w-full sm:w-auto">
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
                  <td colSpan="7" className="px-5 py-8 text-center text-slate-500 text-[13px]">No customers match your search.</td>
                </tr>
              ) : null}
              {customers.map(customer => (
                <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <Link to={`/reports/${customer.id}`} className="font-bold text-[14px] text-blue-600 hover:underline">{customer.name}</Link>
                    <div className="text-[12px] text-slate-500 mt-0.5">{customer.city} • {customer.users} Sub-account{customer.users === 1 ? "" : "s"}</div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="font-semibold text-[14px] text-slate-800">{customer.orders}</div>
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
