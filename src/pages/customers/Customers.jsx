import { useState, useEffect } from "react";
import { Search, Download, Filter, CheckCircle2, Clock, AlertCircle, ShieldAlert, UserCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "@tanstack/react-router";
import { StatusPill } from "@/components/common/StatusPill";
import { CustomerActions } from "./components/CustomerActions";
import { customerService } from "@/services/customerService";
import { notify } from "@/lib/notify";
import "@/styles/veriwide.css";

export function Customers() {
  const [activeTab, setActiveTab] = useState("active"); // "active" | "frozen"
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState("all");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [frozenCount, setFrozenCount] = useState(0);
  const [exporting, setExporting] = useState(false);

  // Server-side search/pagination, scoped to the active tab (Active vs Frozen) —
  // avoids pulling the whole customer list into the browser just to filter it client-side.
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await customerService.getCustomers({
        approval_status: "APPROVED",
        is_active: activeTab === "active",
        search: search || undefined,
        page,
        limit: itemsPerPage
      });
      const list = (res.data?.list || []).map(c => ({ ...c, id: c._id }));
      setCustomers(list);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error(err);
      setCustomers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchTabCounts = async () => {
    try {
      const [activeRes, frozenRes] = await Promise.all([
        customerService.getCustomers({ approval_status: "APPROVED", is_active: true, limit: 1 }),
        customerService.getCustomers({ approval_status: "APPROVED", is_active: false, limit: 1 }),
      ]);
      setActiveCount(activeRes.data?.total || 0);
      setFrozenCount(frozenRes.data?.total || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAuxCounts = async () => {
    try {
      const [pndRes, revRes] = await Promise.all([
        customerService.getPendingCustomers({}),
        customerService.getReviewQueue()
      ]);
      setPendingCount(pndRes.data?.total ?? (pndRes.data?.list?.length || 0));
      setReviewCount((revRes.data || []).length);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTabCounts();
    fetchAuxCounts();
  }, []);

  useEffect(() => {
    // Debounce search so every keystroke doesn't fire a request.
    const t = setTimeout(fetchCustomers, search ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, search, page]);

  useEffect(() => { setPage(1); }, [activeTab, search]);

  const refreshAll = async () => {
    await Promise.all([fetchCustomers(), fetchTabCounts()]);
  };

  const handleUnfreeze = async (customerId) => {
    if (!window.confirm("Are you sure you want to unfreeze this account? The customer will regain full login and ordering access.")) return;
    try {
      const res = await customerService.toggleCustomerStatus(customerId, true);
      if (res.error === false) {
        notify.success("Account un-frozen successfully!");
        await refreshAll();
      } else {
        notify.error(res.message || "Failed to unfreeze account.");
      }
    } catch (err) {
      notify.error("Error unfreezing account.");
    }
  };

  // Pricing-tier filter has no backend query param, so it applies to the current page only.
  const filtered = customers.filter(c => filterTier === "all" || c.pricing_tier === filterTier);
  const totalPages = Math.ceil(total / itemsPerPage);

  const toCsvValue = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const res = await customerService.getCustomers({
        approval_status: "APPROVED",
        is_active: activeTab === "active",
        search: search || undefined,
        limit: 2000
      });
      const list = res.data?.list || [];
      const rows = [
        ["Company Name", "Contact Name", "Phone", "City", "Pricing Tier", "Credit Limit", "Status"],
        ...list.map(c => [
          c.company_name || "",
          c.name || "",
          c.phone || "",
          c.city || "",
          (c.pricing_tier || "").replace(/_/g, " "),
          c.credit_limit || 0,
          c.is_active === false ? "Frozen" : "Active"
        ])
      ];
      const csv = rows.map(r => r.map(toCsvValue).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customers-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      notify.success(`Exported ${list.length} customers.`);
    } catch (err) {
      notify.error(err.message || "Failed to export customers.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 gap-3">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Customers</h1>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Manage B2B retailers, pricing tiers, and credit limits.</p>
        </div>
        <button onClick={handleExportCsv} disabled={exporting} className="flex items-center justify-center gap-2 vw-btn-secondary h-10 px-4 w-full sm:w-auto disabled:opacity-60" style={{ fontSize: 14 }}>
          <Download size={16} /> {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mt-4 border-b border-border overflow-x-auto whitespace-nowrap pb-px">
        <button
          onClick={() => setActiveTab("active")}
          className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-all flex-shrink-0 ${
            activeTab === "active"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <UserCheck size={16} /> Active Customers ({activeCount})
        </button>
        <button
          onClick={() => setActiveTab("frozen")}
          className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-all flex-shrink-0 ${
            activeTab === "frozen"
              ? "border-red-500 text-red-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ShieldAlert size={16} /> Frozen / Inactive ({frozenCount})
        </button>
      </div>

      {/* Filters and Table Card */}
      <div className="vw-card flex flex-col mt-4" style={{ padding: 0, overflow: "hidden" }}>

        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between p-4 gap-4" style={{ borderBottom: "1px solid var(--divider)" }}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 w-full">
            <label className="flex items-center gap-2 w-full sm:max-w-[320px] h-[36px] px-3 bg-[var(--soft-bg)] border border-[var(--card-border)] rounded-lg">
              <Search size={16} style={{ color: "var(--faint)" }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                className="flex-1 w-full bg-transparent outline-none" style={{ fontSize: 13 }} placeholder="Search name, company, phone..."
              />
            </label>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter size={16} style={{ color: "var(--muted)", display: "none" }} className="sm:block" />
              <Select value={filterTier} onValueChange={setFilterTier}>
                <SelectTrigger className="h-9 w-full sm:w-[140px] rounded-md text-[13px] border-card-border bg-soft-bg"><SelectValue placeholder="Pricing Tier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="courier">Courier</SelectItem>
                  <SelectItem value="stock_a">Stock A</SelectItem>
                  <SelectItem value="stock_a_plus">Stock A+</SelectItem>
                  <SelectItem value="stock_platinum">Platinum</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start sm:justify-end">
            {reviewCount > 0 && (
              <Link to="/review-queue" className="flex items-center justify-center flex-1 sm:flex-none gap-2 vw-btn-secondary h-9 px-3.5 text-[13px] border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors">
                <AlertCircle size={14} /> <span>Review ({reviewCount})</span>
              </Link>
            )}
            <Link to="/pending-accounts" className="flex items-center justify-center flex-1 sm:flex-none gap-2 vw-btn-secondary h-9 px-3.5 text-[13px] border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">
              <Clock size={14} /> <span>Approvals ({pendingCount})</span>
            </Link>
            <Link to="/customer-onboard" className="vw-btn-primary h-9 px-4 text-[13px] flex-1 sm:flex-none flex items-center justify-center gap-1 shadow-sm">
              + <span>Add Customer</span>
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[760px]" style={{ fontSize: 13, borderCollapse: "collapse" }}>
            <thead style={{ background: "var(--soft-bg)", borderBottom: "1px solid var(--divider)" }}>
              <tr>
                <th className="py-3 px-4 font-semibold text-muted-foreground w-14 text-center">Photo</th>
                <th className="py-3 px-4 font-semibold text-muted-foreground">Customer Info</th>
                <th className="py-3 px-4 font-semibold text-muted-foreground">Location</th>
                <th className="py-3 px-4 font-semibold text-muted-foreground">Pricing Tier</th>
                <th className="py-3 px-4 font-semibold text-muted-foreground text-right">Credit Limit</th>
                <th className="py-3 px-4 font-semibold text-muted-foreground text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-muted-foreground w-12"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">Loading customers...</td>
                </tr>
              ) : filtered.length > 0 ? filtered.map((c, i) => (
                <tr key={c.id || i} style={{ borderBottom: "1px solid var(--divider)", transition: "background 0.2s" }} className="hover:bg-accent/50">
                  <td className="py-3 px-4 text-center">
                    <Link to={`/customer/${c.id || c.phone}`} className="inline-block">
                      {c.profilePic ? (
                        <img src={c.profilePic} alt={c.name} className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-sm" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                          {(c.company_name || c.name || "C")[0].toUpperCase()}
                        </div>
                      )}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold">
                      <Link to={`/customer/${c.id || c.phone}`} className="hover:text-primary transition-colors">{c.company_name || c.name}</Link>
                    </div>
                    <div style={{ color: "var(--muted)", fontSize: 12 }}>
                      {c.name} • 📞 {c.phone}
                    </div>
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
                    {activeTab === "frozen" ? (
                      <button
                        onClick={() => handleUnfreeze(c.id)}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                      >
                        Unfreeze
                      </button>
                    ) : (
                      <CustomerActions customer={c} onActionComplete={refreshAll} />
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    {activeTab === "frozen" ? "No frozen customer accounts." : "No active customers found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 gap-3" style={{ borderTop: "1px solid var(--divider)", background: "var(--soft-bg)" }}>
          <div style={{ fontSize: 13, color: "var(--muted)" }} className="text-center sm:text-left">
            Showing {total === 0 ? 0 : (page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, total)} of {total} entries
          </div>
          <div className="flex gap-1 w-full sm:w-auto justify-center sm:justify-end">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded border border-card-border bg-card text-[13px] font-medium disabled:opacity-50 hover:bg-accent transition-colors flex-1 sm:flex-none"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="px-3 py-1.5 rounded border border-card-border bg-card text-[13px] font-medium disabled:opacity-50 hover:bg-accent transition-colors flex-1 sm:flex-none"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
