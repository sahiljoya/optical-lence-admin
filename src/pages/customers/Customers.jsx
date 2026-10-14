import { useState, useEffect } from "react";
import { Search, Download, Filter, MoreHorizontal, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "@tanstack/react-router";
import { StatusPill } from "@/components/common/StatusPill";
import { CustomerActions } from "./components/CustomerActions";
import { customerService } from "@/services/customerService";
import "@/styles/veriwide.css";

export function Customers() {
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState("all");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await customerService.getCustomers({ approval_status: "APPROVED", limit: 500 });
      setCustomers(res.data.list.map(c => ({ ...c, id: c._id })));
    } catch (err) {
      console.error(err);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingCount = async () => {
    try {
      const res = await customerService.getPendingCustomers({});
      setPendingCount(res.data.total ?? res.data.list.length);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReviewCount = async () => {
    try {
      const res = await customerService.getReviewQueue();
      setReviewCount((res.data || []).length);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchPendingCount();
    fetchReviewCount();
  }, []);

  // Filter logic
  const filtered = customers.filter(c => {
    const tierMatch = filterTier === "all" || c.pricing_tier === filterTier;
    const s = search.toLowerCase();
    const searchMatch = (c.name || "").toLowerCase().includes(s) || 
                        (c.company_name || "").toLowerCase().includes(s) || 
                        (c.phone || "").toLowerCase().includes(s);
    return tierMatch && searchMatch;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentData = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 gap-3">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Customers</h1>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Manage B2B retailers, pricing tiers, and credit limits.</p>
        </div>
        <button className="flex items-center justify-center gap-2 vw-btn-secondary h-10 px-4 w-full sm:w-auto" style={{ fontSize: 14 }}>
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Filters and Table Card */}
      <div className="vw-card flex flex-col mt-2" style={{ padding: 0, overflow: "hidden" }}>
        
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4" style={{ borderBottom: "1px solid var(--divider)" }}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <label className="flex items-center gap-2 w-full sm:max-w-[320px] h-[36px] px-3 bg-[var(--soft-bg)] border border-[var(--card-border)] rounded-lg">
              <Search size={16} style={{ color: "var(--faint)" }} />
              <input 
                value={search} onChange={e => setSearch(e.target.value)}
                className="flex-1 w-full bg-transparent outline-none" style={{ fontSize: 13 }} placeholder="Search name, company, ID..." 
              />
            </label>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter size={16} style={{ color: "var(--muted)", display: "none" }} className="sm:block" />
              <Select value={filterTier} onValueChange={setFilterTier}>
                <SelectTrigger className="h-9 w-full sm:w-[140px] rounded-md text-[13px] border-card-border bg-soft-bg"><SelectValue placeholder="Pricing Tier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="stock_a">Stock A</SelectItem>
                  <SelectItem value="stock_a_plus">Stock A+</SelectItem>
                  <SelectItem value="stock_platinum">Platinum</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto justify-between sm:justify-end">
            {reviewCount > 0 && (
              <Link to="/review-queue" className="flex items-center justify-center flex-1 sm:flex-none gap-2 vw-btn-secondary h-9 px-4 text-[13px] border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors">
                <AlertCircle size={14} /> <span className="hidden sm:inline">Review ({reviewCount})</span><span className="sm:hidden">Review</span>
              </Link>
            )}
            <Link to="/pending-accounts" className="flex items-center justify-center flex-1 sm:flex-none gap-2 vw-btn-secondary h-9 px-4 text-[13px] border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">
              <Clock size={14} /> <span className="hidden sm:inline">Approvals ({pendingCount})</span><span className="sm:hidden">Pending</span>
            </Link>
            <Link to="/customer-onboard" className="vw-btn-primary h-9 px-4 text-[13px] flex-1 sm:flex-none flex items-center justify-center">
              + <span className="hidden sm:inline">Add Customer</span><span className="sm:hidden">New</span>
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ fontSize: 13, borderCollapse: "collapse" }}>
            <thead style={{ background: "var(--soft-bg)", borderBottom: "1px solid var(--divider)" }}>
              <tr>
                <th className="py-3 px-4 font-semibold text-muted-foreground">ID</th>
                <th className="py-3 px-4 font-semibold text-muted-foreground">Customer Info</th>
                <th className="py-3 px-4 font-semibold text-muted-foreground">Location</th>
                <th className="py-3 px-4 font-semibold text-muted-foreground">Pricing Tier</th>
                <th className="py-3 px-4 font-semibold text-muted-foreground text-right">Credit Limit</th>
                <th className="py-3 px-4 font-semibold text-muted-foreground text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-muted-foreground w-10"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">Loading customers...</td>
                </tr>
              ) : currentData.length > 0 ? currentData.map((c, i) => (
                <tr key={c.id || i} style={{ borderBottom: "1px solid var(--divider)", transition: "background 0.2s" }} className="hover:bg-accent/50">
                  <td className="py-3 px-4 font-medium">
                    <Link to={`/customer/${c.id || c.phone}`} className="text-primary hover:underline">{c.id || c.phone}</Link>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold">
                      <Link to={`/customer/${c.id || c.phone}`} className="hover:text-primary transition-colors">{c.company_name || c.name}</Link>
                    </div>
                    <div style={{ color: "var(--muted)", fontSize: 12 }}>{c.name}</div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{c.city || "-"}</td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2 py-1 rounded text-[11px] font-semibold bg-primary-tint text-primary-pressed uppercase tracking-wider">
                      {(c.pricing_tier || "stock_a").replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-right">₹{c.credit_limit || 0}</td>
                  <td className="py-3 px-4 text-center">
                    <StatusPill status={c.is_active === false ? "frozen" : "active"} />
                  </td>
                  <td className="py-3 px-4 text-right overflow-visible">
                    <CustomerActions customer={c} onActionComplete={fetchCustomers} />
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">No active customers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4" style={{ borderTop: "1px solid var(--divider)", background: "var(--soft-bg)" }}>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            Showing {filtered.length === 0 ? 0 : (page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, filtered.length)} of {filtered.length} entries
          </div>
          <div className="flex gap-1">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded border border-card-border bg-card text-[13px] font-medium disabled:opacity-50 hover:bg-accent transition-colors"
            >
              Previous
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="px-3 py-1.5 rounded border border-card-border bg-card text-[13px] font-medium disabled:opacity-50 hover:bg-accent transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
