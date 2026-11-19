import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, ExternalLink, Loader2, Plus } from "lucide-react";
import { notify } from "@/lib/notify";
import { hasPermission } from "@/lib/permissions";
import { customerService } from "@/services/customerService";

// One customer's full history for sales, accounts and support: orders (every line with product,
// power and quantity), ledger transactions, returns, calls & visits, requests and support tickets.

const inr = (n) => "₹" + Math.round(n || 0).toLocaleString("en-IN");
const fmtDate = (d, withTime = false) => {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", withTime
    ? { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
    : { day: "2-digit", month: "short", year: "numeric" });
};
const sign = (n) => `${n > 0 ? "+" : ""}${Number(n).toFixed(2)}`;
const fmtPower = (item) => {
  const parts = [];
  if (item.sph !== null && item.sph !== undefined) parts.push(`SPH ${sign(item.sph)}`);
  if (item.cyl !== null && item.cyl !== undefined && item.cyl !== 0) parts.push(`CYL ${sign(item.cyl)}`);
  if (item.axis !== null && item.axis !== undefined) parts.push(`AXIS ${item.axis}°`);
  if (item.add !== null && item.add !== undefined) parts.push(`ADD ${sign(item.add)}`);
  return parts.join(" / ") || "—";
};
const productText = (p) =>
  p && typeof p === "object"
    ? [p.brand, p.product_name, p.index, p.base, p.coating].filter((v) => v !== null && v !== undefined && v !== "").join(" ")
    : "Product";

const STATUS_TONE = {
  DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DISPATCHED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Open: "bg-amber-50 text-amber-700 border-amber-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  PENDING_OWNER: "bg-blue-50 text-blue-700 border-blue-200",
};
const Badge = ({ value }) => (
  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${STATUS_TONE[value] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
    {String(value || "—").replace(/_/g, " ")}
  </span>
);

const Empty = ({ text }) => <div className="py-10 text-center text-[13px] text-slate-400">{text}</div>;
const Loading = () => <div className="py-10 flex justify-center text-slate-400"><Loader2 size={18} className="animate-spin" /></div>;

const th = "px-4 py-2.5 font-bold";
const td = "px-4 py-3";

// ---------- Orders ----------
const ORDER_PAGE = 20;
function OrdersTab({ customerId }) {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await customerService.getRecentOrders(customerId, { page, limit: ORDER_PAGE });
        const list = res.data || [];
        if (cancelled) return;
        setOrders((prev) => (page === 1 ? list : [...prev, ...list]));
        setHasMore(list.length === ORDER_PAGE);
      } catch (err) {
        if (!cancelled) notify.error(err.message || "Could not load orders.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [customerId, page]);

  if (loading && orders.length === 0) return <Loading />;
  if (orders.length === 0) return <Empty text="No orders yet." />;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px] min-w-[720px]">
          <thead>
            <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <th className={`${th} w-8`}></th>
              <th className={th}>Order</th>
              <th className={th}>Date</th>
              <th className={`${th} text-center`}>Lines</th>
              <th className={`${th} text-center`}>Pieces</th>
              <th className={`${th} text-right`}>Amount</th>
              <th className={`${th} text-center`}>Status</th>
              <th className={`${th} text-right`}>View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((o) => {
              const items = o.items || [];
              const pieces = items.reduce((s, i) => s + (i.requested_quantity || 0), 0);
              const isOpen = !!open[o._id];
              return [
                <tr key={o._id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => setOpen((p) => ({ ...p, [o._id]: !p[o._id] }))}>
                  <td className={`${td} text-slate-400`}>{isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</td>
                  <td className={`${td} font-bold text-blue-600`}>{o.order_number}</td>
                  <td className={`${td} text-slate-600`}>{fmtDate(o.createdAt)}</td>
                  <td className={`${td} text-center`}>{items.length}</td>
                  <td className={`${td} text-center font-semibold`}>{pieces}</td>
                  <td className={`${td} text-right font-bold text-slate-800`}>{inr(o.total_amount)}</td>
                  <td className={`${td} text-center`}><Badge value={o.status} /></td>
                  <td className={`${td} text-right`} onClick={(e) => e.stopPropagation()}>
                    <Link to={`/orders/${o._id}`} className="inline-flex items-center gap-1 text-[12px] font-bold text-blue-600 hover:underline">
                      Open <ExternalLink size={12} />
                    </Link>
                  </td>
                </tr>,
                isOpen && (
                  <tr key={`${o._id}-items`} className="bg-slate-50/60">
                    <td></td>
                    <td colSpan={7} className="px-4 pb-4 pt-1">
                      <table className="w-full text-[12px] bg-white border border-slate-200 rounded-lg overflow-hidden">
                        <thead>
                          <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                            <th className="px-3 py-2 text-left font-bold">Product</th>
                            <th className="px-3 py-2 text-left font-bold">Power</th>
                            <th className="px-3 py-2 text-center font-bold">Ordered</th>
                            <th className="px-3 py-2 text-center font-bold">Allocated</th>
                            <th className="px-3 py-2 text-center font-bold">Short</th>
                            <th className="px-3 py-2 text-right font-bold">Rate</th>
                            <th className="px-3 py-2 text-right font-bold">Line Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {items.map((i, idx) => (
                            <tr key={i._id || idx}>
                              <td className="px-3 py-2">
                                <div className="font-semibold text-slate-800">{productText(i.product_id)}</div>
                                <div className="text-[11px] text-slate-400 font-mono">{i.product_id?.product_code || ""}{i.product_id?.lens_type ? ` • ${i.product_id.lens_type}` : ""}{i.is_backorder ? " • Back-order" : ""}</div>
                              </td>
                              <td className="px-3 py-2 font-mono text-slate-700">{fmtPower(i)}</td>
                              <td className="px-3 py-2 text-center font-semibold">
                                {i.unit === "pair" && i.unit_quantity ? `${i.unit_quantity} pair${i.unit_quantity === 1 ? "" : "s"} (${i.requested_quantity} pcs)` : `${i.requested_quantity} pcs`}
                              </td>
                              <td className="px-3 py-2 text-center">{i.allocated_quantity || 0}</td>
                              <td className={`px-3 py-2 text-center ${i.short_quantity > 0 ? "text-rose-600 font-bold" : "text-slate-400"}`}>{i.short_quantity || 0}</td>
                              <td className="px-3 py-2 text-right">{inr(i.unit_price)}</td>
                              <td className="px-3 py-2 text-right font-semibold">{inr((i.unit_price || 0) * (i.requested_quantity || 0))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="flex justify-end gap-4 mt-2 text-[12px] text-slate-500">
                        <span>Subtotal: <strong className="text-slate-800">{inr(o.subtotal)}</strong></span>
                        <span>GST: <strong className="text-slate-800">{inr(o.gst_amount)}</strong></span>
                        <span>Total: <strong className="text-slate-900">{inr(o.total_amount)}</strong></span>
                      </div>
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <div className="p-3 text-center border-t border-slate-100">
          <button disabled={loading} onClick={() => setPage((p) => p + 1)} className="text-[12px] font-bold text-blue-600 hover:underline disabled:opacity-50">
            {loading ? "Loading…" : "Load more orders"}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- Transactions (ledger) ----------
const LEDGER_PAGE = 20;
function TransactionsTab({ customerId }) {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await customerService.getCustomerLedger(customerId, { page, limit: LEDGER_PAGE });
        if (!cancelled) setData(res.data || null);
      } catch (err) {
        if (!cancelled) { setData(null); notify.error(err.message || "Could not load transactions."); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [customerId, page]);

  if (loading && !data) return <Loading />;
  const rows = data?.passbook || [];
  if (rows.length === 0) return <Empty text="No transactions yet." />;

  return (
    <div>
      <div className="px-4 py-3 flex flex-wrap gap-2 border-b border-slate-100 text-[11px]">
        <span className="px-2.5 py-1 rounded bg-slate-50 border border-slate-200"><span className="text-slate-500">Outstanding: </span><strong className="text-rose-600">{inr(data.customer?.used_balance)}</strong></span>
        <span className="px-2.5 py-1 rounded bg-slate-50 border border-slate-200"><span className="text-slate-500">Credit limit: </span><strong>{inr(data.customer?.credit_limit)}</strong></span>
        <span className="px-2.5 py-1 rounded bg-slate-50 border border-slate-200"><span className="text-slate-500">Available: </span><strong className="text-emerald-600">{inr(data.customer?.current_balance)}</strong></span>
        <span className="px-2.5 py-1 rounded bg-slate-50 border border-slate-200"><span className="text-slate-500">Entries: </span><strong>{data.total}</strong></span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px] min-w-[760px]">
          <thead>
            <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <th className={th}>Date</th>
              <th className={th}>Entry</th>
              <th className={th}>Mode / Reference</th>
              <th className={`${th} text-right`}>Bill (+)</th>
              <th className={`${th} text-right`}>Payment (−)</th>
              <th className={`${th} text-right`}>Outstanding</th>
              <th className={th}>By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((e) => (
              <tr key={e._id} className="hover:bg-slate-50/50">
                <td className={`${td} text-slate-600 whitespace-nowrap`}>{fmtDate(e.payment_date || e.created_at, true)}</td>
                <td className={td}>
                  <div className="font-semibold text-slate-800">{e.title || (e.type === "CREDIT" ? "Bill added" : "Payment received")}</div>
                  {e.remarks && <div className="text-[11px] text-slate-400 max-w-xs truncate">{e.remarks}</div>}
                </td>
                <td className={`${td} text-slate-600`}>
                  <div>{(e.payment_mode || "").replace(/_/g, " ")}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{e.reference_number || ""}</div>
                </td>
                <td className={`${td} text-right font-bold text-rose-600`}>{e.type === "CREDIT" ? inr(e.amount) : ""}</td>
                <td className={`${td} text-right font-bold text-emerald-600`}>{e.type === "DEBIT" ? inr(e.amount) : ""}</td>
                <td className={`${td} text-right text-slate-700`}>{e.outstanding !== null && e.outstanding !== undefined ? inr(e.outstanding) : "—"}</td>
                <td className={`${td} text-slate-500 text-[12px]`}>{e.staff_id?.name || "System"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(data.totalPages || 1) > 1 && (
        <div className="p-3 border-t border-slate-100 flex items-center justify-between text-[12px] text-slate-500">
          <span>Page {data.page} of {data.totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 border border-slate-200 rounded bg-white disabled:opacity-50">Prev</button>
            <button disabled={page >= data.totalPages || loading} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 border border-slate-200 rounded bg-white disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Returns ----------
function ReturnsTab({ list }) {
  if (!list || list.length === 0) return <Empty text="No returns from this customer." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px] min-w-[640px]">
        <thead>
          <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
            <th className={th}>Return</th>
            <th className={th}>Date</th>
            <th className={th}>Reason</th>
            <th className={`${th} text-center`}>Pieces</th>
            <th className={`${th} text-right`}>Credit Note</th>
            <th className={`${th} text-center`}>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {list.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50/50">
              <td className={td}>
                <div className="font-bold text-slate-800">{r.returnNumber}</div>
                {r.orderNumber && <div className="text-[11px] text-slate-400">Order {r.orderNumber}</div>}
              </td>
              <td className={`${td} text-slate-600`}>{fmtDate(r.createdAt)}</td>
              <td className={`${td} text-slate-600`}>{r.reason}</td>
              <td className={`${td} text-center font-semibold`}>{r.pieces}</td>
              <td className={`${td} text-right font-bold text-emerald-600`}>{r.creditAmount ? inr(r.creditAmount) : "—"}</td>
              <td className={`${td} text-center`}><Badge value={r.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Calls & visits ----------
function NotesTab({ customerId }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ type: "Call", note: "", next_call_date: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await customerService.getCustomerNotes(customerId);
      setNotes(res.data || []);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [customerId]);

  const save = async (e) => {
    e.preventDefault();
    if (!form.note.trim()) return notify.warning("Please write a note.");
    setSaving(true);
    try {
      await customerService.createCustomerNote(customerId, { type: form.type, note: form.note.trim(), next_call_date: form.next_call_date || null });
      notify.success("Note added.");
      setForm({ type: "Call", note: "", next_call_date: "" });
      await load();
    } catch (err) {
      notify.error(err.message || "Could not add the note.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {hasPermission("VIEW_CUSTOMERS") && (
        <form onSubmit={save} className="p-4 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-12 gap-2 items-end bg-slate-50/40">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="sm:col-span-2 h-9 px-2 border border-slate-200 rounded-lg text-[13px] bg-white">
            <option value="Call">Call</option>
            <option value="Visit">Visit</option>
            <option value="Other">Other</option>
          </select>
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="What was discussed / promised?" className="sm:col-span-6 h-9 px-3 border border-slate-200 rounded-lg text-[13px] bg-white" />
          <input type="date" value={form.next_call_date} onChange={(e) => setForm({ ...form, next_call_date: e.target.value })} title="Next follow-up" className="sm:col-span-2 h-9 px-2 border border-slate-200 rounded-lg text-[13px] bg-white" />
          <button disabled={saving} className="sm:col-span-2 h-9 flex items-center justify-center gap-1 text-[12px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add Note
          </button>
        </form>
      )}
      {loading ? <Loading /> : notes.length === 0 ? <Empty text="No calls or visits logged yet." /> : (
        <div className="divide-y divide-slate-100">
          {notes.map((n) => (
            <div key={n._id} className="p-4 flex gap-3">
              <span className={`shrink-0 h-6 px-2 rounded text-[10px] font-bold uppercase flex items-center border ${n.type === "Visit" ? "bg-violet-50 text-violet-700 border-violet-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>{n.type}</span>
              <div className="min-w-0">
                <p className="text-[13px] text-slate-800 whitespace-pre-wrap">{n.note}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {n.staff_id?.name || "Staff"} • {fmtDate(n.createdAt, true)}
                  {n.next_call_date && <span className="text-amber-600 font-semibold"> • Follow up {fmtDate(n.next_call_date)}</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Requests (credit limit + special price) ----------
function RequestsTab({ customerId }) {
  const [limitReqs, setLimitReqs] = useState([]);
  const [discountReqs, setDiscountReqs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [l, d] = await Promise.allSettled([
        customerService.getCustomerLimitRequests(customerId),
        customerService.getCustomerDiscountRequests(customerId),
      ]);
      if (cancelled) return;
      setLimitReqs(l.status === "fulfilled" ? l.value.data || [] : []);
      setDiscountReqs(d.status === "fulfilled" ? d.value.data || [] : []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [customerId]);

  if (loading) return <Loading />;

  return (
    <div className="divide-y divide-slate-100">
      <div>
        <h4 className="px-4 pt-4 pb-2 text-[12px] font-bold text-slate-600 uppercase tracking-wider">Credit limit requests</h4>
        {limitReqs.length === 0 ? <Empty text="No credit limit requests." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-y border-slate-100">
                  <th className={th}>Requested By</th>
                  <th className={`${th} text-right`}>Current → Change</th>
                  <th className={th}>Reason</th>
                  <th className={`${th} text-center`}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {limitReqs.map((r) => (
                  <tr key={r._id}>
                    <td className={td}>
                      <div className="font-semibold text-slate-800">{r.requested_by?.name || "Customer"}</div>
                      <div className="text-[11px] text-slate-400">{fmtDate(r.createdAt)}</div>
                    </td>
                    <td className={`${td} text-right`}>
                      <span className="text-slate-500">{inr(r.current_limit)}</span>
                      <span className="mx-1 text-slate-300">→</span>
                      <span className={`font-bold ${r.change_type === "DECREASE" ? "text-rose-600" : "text-blue-600"}`}>{r.change_type === "DECREASE" ? "−" : "+"}{inr(r.requested_amount)}</span>
                    </td>
                    <td className={`${td} text-slate-600 max-w-xs`}>{r.reason || "—"}</td>
                    <td className={`${td} text-center`}>
                      <Badge value={r.status} />
                      {r.approved_by?.name && <div className="text-[10px] text-slate-400 mt-1">by {r.approved_by.name}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div>
        <h4 className="px-4 pt-4 pb-2 text-[12px] font-bold text-slate-600 uppercase tracking-wider">Special price requests</h4>
        {discountReqs.length === 0 ? <Empty text="No special price requests." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-y border-slate-100">
                  <th className={th}>Product</th>
                  <th className={`${th} text-right`}>Standard → Requested</th>
                  <th className={th}>Requested By / Reason</th>
                  <th className={`${th} text-center`}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {discountReqs.map((r) => (
                  <tr key={r._id}>
                    <td className={td}>
                      <div className="font-semibold text-slate-800">{productText(r.product_id)}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{r.product_id?.product_code || ""}</div>
                    </td>
                    <td className={`${td} text-right`}>
                      <span className="text-slate-500">{inr(r.standard_tier_price)}</span>
                      <span className="mx-1 text-slate-300">→</span>
                      <span className="font-bold text-indigo-600">{inr(r.requested_price)}</span>
                    </td>
                    <td className={`${td} text-slate-600 max-w-xs`}>
                      <div className="font-semibold text-slate-700">{r.requested_by?.name || r.salesperson_id?.name || "—"} <span className="text-[11px] text-slate-400 font-normal">{fmtDate(r.createdAt)}</span></div>
                      <div className="text-[12px] truncate">{r.reason || "—"}</div>
                    </td>
                    <td className={`${td} text-center`}>
                      <Badge value={r.status} />
                      {r.action_by?.name && <div className="text-[10px] text-slate-400 mt-1">by {r.action_by.name}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="p-3 text-center">
        <Link to={`/customer/${customerId}`} className="text-[12px] font-bold text-blue-600 hover:underline">Approve / reject requests on the customer's page</Link>
      </div>
    </div>
  );
}

// ---------- Support tickets ----------
function SupportTab({ list }) {
  if (!list || list.length === 0) return <Empty text="No support tickets from this customer." />;
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px] min-w-[600px]">
          <thead>
            <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <th className={th}>Subject</th>
              <th className={th}>Category</th>
              <th className={`${th} text-center`}>Priority</th>
              <th className={`${th} text-center`}>Messages</th>
              <th className={th}>Raised</th>
              <th className={`${th} text-center`}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50/50">
                <td className={`${td} font-semibold text-slate-800`}>{t.subject}</td>
                <td className={`${td} text-slate-600`}>{t.category}</td>
                <td className={`${td} text-center ${t.priority === "High" ? "text-rose-600 font-bold" : "text-slate-600"}`}>{t.priority}</td>
                <td className={`${td} text-center`}>{t.messages}</td>
                <td className={`${td} text-slate-600`}>{fmtDate(t.createdAt)}</td>
                <td className={`${td} text-center`}><Badge value={t.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasPermission("MANAGE_SUPPORT") && (
        <div className="p-3 text-center border-t border-slate-100">
          <Link to="/support" className="text-[12px] font-bold text-blue-600 hover:underline">Open Support</Link>
        </div>
      )}
    </div>
  );
}

const TABS = [
  { key: "orders", label: "Orders" },
  { key: "transactions", label: "Transactions" },
  { key: "returns", label: "Returns" },
  { key: "notes", label: "Calls & Visits" },
  { key: "requests", label: "Requests" },
  { key: "support", label: "Support" },
];

export function CustomerHistoryTabs({ customerId, report }) {
  const [tab, setTab] = useState("orders");
  const canSeeLedger = hasPermission(["VIEW_BILLING", "VIEW_CUSTOMERS"]);
  const tabs = TABS.filter((t) => t.key !== "transactions" || canSeeLedger);
  const counts = { returns: report?.returnsList?.length, support: report?.tickets?.length };

  return (
    <div className="vw-card overflow-hidden mt-6">
      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
        <h3 className="text-[14px] font-bold text-slate-800 uppercase tracking-wider">Customer History</h3>
        <p className="text-[12px] text-slate-500 mt-0.5">Everything about this customer in one place, for sales, accounts and support.</p>
      </div>
      <div className="flex gap-1 px-3 border-b border-slate-100 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2.5 text-[13px] font-semibold border-b-2 whitespace-nowrap transition-colors ${tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {t.label}{counts[t.key] ? ` (${counts[t.key]})` : ""}
          </button>
        ))}
      </div>
      {tab === "orders" && <OrdersTab customerId={customerId} />}
      {tab === "transactions" && <TransactionsTab customerId={customerId} />}
      {tab === "returns" && <ReturnsTab list={report?.returnsList} />}
      {tab === "notes" && <NotesTab customerId={customerId} />}
      {tab === "requests" && <RequestsTab customerId={customerId} />}
      {tab === "support" && <SupportTab list={report?.tickets} />}
    </div>
  );
}
