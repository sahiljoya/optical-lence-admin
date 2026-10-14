import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Search as SearchIcon } from "lucide-react";
import { customerService } from "@/services/customerService";
import { StatusPill } from "@/components/common/StatusPill";
import "@/styles/veriwide.css";

export function ReviewQueue() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await customerService.getReviewQueue();
      setCustomers((res.data || []).map(c => ({ ...c, id: c._id })));
    } catch (err) {
      console.error(err);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  return (
    <>
      <div className="flex items-center gap-4 mt-2 mb-4">
        <Link to="/customers" className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Review Queue</h1>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
            Accounts flagged for manual, case-by-case decisions. No automatic ordering rule applies to them.
          </p>
        </div>
      </div>

      <div className="vw-card flex flex-col mt-2" style={{ padding: 0, overflow: "hidden" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ fontSize: 13, borderCollapse: "collapse" }}>
            <thead style={{ background: "var(--soft-bg)", borderBottom: "1px solid var(--divider)" }}>
              <tr>
                <th className="py-3 px-4 font-semibold text-muted-foreground">Customer Info</th>
                <th className="py-3 px-4 font-semibold text-muted-foreground">Contact</th>
                <th className="py-3 px-4 font-semibold text-muted-foreground">City</th>
                <th className="py-3 px-4 font-semibold text-muted-foreground text-right">Credit Limit</th>
                <th className="py-3 px-4 font-semibold text-muted-foreground text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-muted-foreground text-right w-24">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500">Loading review queue...</td></tr>
              ) : customers.length > 0 ? customers.map(c => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--divider)" }} className="hover:bg-accent/50">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-foreground">{c.company_name || "Unknown Company"}</div>
                    <div className="text-muted-foreground mt-0.5" style={{ fontSize: 12 }}>{c.name}</div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{c.phone}</td>
                  <td className="py-3 px-4 text-muted-foreground">{c.city || "-"}</td>
                  <td className="py-3 px-4 text-right font-semibold">₹{c.credit_limit?.toLocaleString() || 0}</td>
                  <td className="py-3 px-4 text-center"><StatusPill status="pending" /></td>
                  <td className="py-3 px-4 text-right">
                    <Link to={`/customer/${c.id}`} className="vw-btn-primary h-8 px-3 text-[12px] whitespace-nowrap inline-flex items-center">
                      Review
                    </Link>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <SearchIcon className="text-slate-300 mb-3" size={28} />
                      <h3 className="text-lg font-semibold text-slate-900">Nothing to Review</h3>
                      <p className="text-slate-500 text-sm mt-1 max-w-sm">No accounts are currently flagged for manual review.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
