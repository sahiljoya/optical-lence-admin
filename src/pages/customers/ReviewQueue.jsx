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
      <div className="flex items-center gap-2.5 sm:gap-4 mt-1 sm:mt-2 mb-3 sm:mb-4">
        <Link to="/customers" className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors shrink-0">
          <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
        </Link>
        <div>
          <h1 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-slate-900">Review Queue</h1>
          <p className="text-[10px] sm:text-xs md:text-[13px] text-slate-500 mt-0.5 sm:mt-1">
            Accounts flagged for manual, case-by-case decisions. No automatic ordering rule applies to them.
          </p>
        </div>
      </div>

      <div className="vw-card flex flex-col mt-2 overflow-hidden" style={{ padding: 0 }}>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[650px] text-[11px] sm:text-xs md:text-[13px]" style={{ borderCollapse: "collapse" }}>
            <thead style={{ background: "var(--soft-bg)", borderBottom: "1px solid var(--divider)" }}>
              <tr className="text-[9px] sm:text-[10px] md:text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                <th className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold">Customer Info</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold">Contact</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold">City</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-right">Credit Limit</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-center">Status</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-right w-24">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500 text-[11px] sm:text-xs md:text-sm">Loading review queue...</td></tr>
              ) : customers.length > 0 ? customers.map(c => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--divider)", transition: "background 0.2s" }} className="hover:bg-accent/50">
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4">
                    <div className="font-semibold text-foreground text-[11px] sm:text-xs md:text-[13px]">{c.company_name || "Unknown Company"}</div>
                    <div className="text-muted-foreground mt-0.5 text-[9px] sm:text-[10px] md:text-xs">{c.name}</div>
                  </td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-muted-foreground text-[10px] sm:text-xs md:text-[13px]">{c.phone}</td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-muted-foreground text-[10px] sm:text-xs md:text-[13px]">{c.city || "-"}</td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-right font-semibold font-mono text-[10px] sm:text-xs md:text-[13px]">₹{c.credit_limit?.toLocaleString() || 0}</td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-center"><StatusPill status="pending" /></td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-right">
                    <Link to={`/customer/${c.id}`} className="vw-btn-primary h-7 sm:h-8 px-2.5 sm:px-3 text-[10px] sm:text-[11px] md:text-[12px] whitespace-nowrap inline-flex items-center">
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
