import { useState, useEffect } from "react";
import { ArrowLeft, Edit, TrendingUp, IndianRupee, ShoppingBag, Settings, Download, Tag, Trash2, Pencil, Check, X, Loader2 } from "lucide-react";
import { Link, useParams } from "@tanstack/react-router";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { notify } from "@/lib/notify";
import { hasPermission } from "@/lib/permissions";
import { getItem } from "@/services/storage";
import { useConfirm } from "@/hooks/useConfirm";
import { reportService } from "@/services/reportService";
import { customerService } from "@/services/customerService";
import { NegotiatedPriceForm, getNegotiatedPriceMode, productLabel } from "@/components/customers/NegotiatedPriceForm";
import { CustomerHistoryTabs } from "@/components/customers/CustomerHistoryTabs";
import "@/styles/veriwide.css";

const inr = (n) => "₹" + Math.round(n || 0).toLocaleString("en-IN");

export function CustomerReport() {
  const { customerId } = useParams({ from: '/_admin/reports/$customerId' });
  const adminUser = getItem("admin_user");
  const isOwner = (adminUser?.role?.name || adminUser?.role || "").toString().toLowerCase() === "admin";
  const canRequestLimit = hasPermission("REQUEST_CREDIT_LIMIT");
  const priceMode = getNegotiatedPriceMode();
  const canRemovePrice = hasPermission("APPROVE_DISCOUNT");
  const { confirm, confirmDialog } = useConfirm();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [negotiatedPrices, setNegotiatedPrices] = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [pendingLimitRequests, setPendingLimitRequests] = useState(0);

  // Credit limit: the owner sets it directly; other staff (REQUEST_CREDIT_LIMIT) send a request.
  const [limitModal, setLimitModal] = useState(false);
  const [newLimit, setNewLimit] = useState(0);
  const [limitRequest, setLimitRequest] = useState({ type: "INCREASE", amount: "", reason: "" });
  const [savingLimit, setSavingLimit] = useState(false);

  // Inline edit of an existing special price
  const [editing, setEditing] = useState(null); // { productId, price, note }
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchCustomer = async () => {
    setLoading(true);
    try {
      const res = await reportService.getCustomerReportDetail(customerId);
      setCustomer(res.data);
      setNewLimit(res.data?.creditLimit || 0);
    } catch (err) {
      notify.error(err.message || "Could not load customer report");
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchNegotiatedPrices = async () => {
    setLoadingPrices(true);
    try {
      const res = await customerService.getCustomerNegotiatedPrices(customerId);
      setNegotiatedPrices(res.data || []);
    } catch (err) {
      console.error("Could not load negotiated prices:", err);
      setNegotiatedPrices([]);
    } finally {
      setLoadingPrices(false);
    }
  };

  const fetchLimitRequests = async () => {
    try {
      const res = await customerService.getCustomerLimitRequests(customerId);
      setPendingLimitRequests((res.data || []).filter((r) => r.status === "PENDING").length);
    } catch {
      setPendingLimitRequests(0);
    }
  };

  useEffect(() => {
    if (!customerId) return;
    fetchCustomer();
    fetchNegotiatedPrices();
    fetchLimitRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const openLimitModal = () => {
    setNewLimit(customer?.creditLimit || 0);
    setLimitRequest({ type: "INCREASE", amount: "", reason: "" });
    setLimitModal(true);
  };

  const handleUpdateLimit = async (e) => {
    e.preventDefault();
    setSavingLimit(true);
    try {
      if (isOwner) {
        await customerService.updateCustomerProfile(customerId, { credit_limit: Number(newLimit) });
        notify.success(`Credit limit for ${customer.name} set to ${inr(newLimit)}`);
      } else {
        const amount = Number(limitRequest.amount);
        if (!amount || amount <= 0) { setSavingLimit(false); return notify.warning("Enter a valid amount."); }
        if (!limitRequest.reason.trim()) { setSavingLimit(false); return notify.warning("Please give a reason."); }
        await customerService.requestLimitIncrease(customerId, amount, limitRequest.reason.trim(), limitRequest.type);
        notify.success(`Limit ${limitRequest.type === "DECREASE" ? "decrease" : "increase"} request sent for approval.`);
      }
      setLimitModal(false);
      fetchCustomer();
      fetchLimitRequests();
    } catch (err) {
      notify.error(err.message || "Could not update credit limit");
    } finally {
      setSavingLimit(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    const price = Number(editing.price);
    const row = negotiatedPrices.find((p) => (p.product_id?._id || p.product_id) === editing.productId);
    const floor = row?.product_id?.min_selling_price;
    if (!price || price <= 0) return notify.warning("Enter a valid price.");
    if (floor != null && price < floor) return notify.error(`Price is below the floor price (${inr(floor)}).`);
    if (priceMode === "request" && !editing.note.trim()) return notify.warning("Please add a reason for the approver.");
    setSavingEdit(true);
    try {
      const res = priceMode === "direct"
        ? await customerService.setNegotiatedPrice(customerId, editing.productId, price)
        : await customerService.createDiscountRequest({ customerId, productId: editing.productId, requestedPrice: price, reason: editing.note.trim() });
      if (res.error === false) {
        notify.success(priceMode === "direct" ? "Special price updated." : "Price change sent for approval.");
        setEditing(null);
        fetchNegotiatedPrices();
      } else {
        notify.error(res.message || "Could not save the price.");
      }
    } catch (err) {
      notify.error(err.message || "Could not save the price.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleRemovePrice = async (productId) => {
    const ok = await confirm("Remove this special price? The customer goes back to the standard tier rate.", {
      title: "Remove Special Price",
      acceptLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await customerService.deleteNegotiatedPrice(customerId, productId);
      if (res.error === false) {
        notify.success("Special price removed.");
        fetchNegotiatedPrices();
      } else {
        notify.error(res.message || "Could not remove the price.");
      }
    } catch (err) {
      notify.error(err.message || "Could not remove the price.");
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white text-[12px] p-2 rounded shadow-xl border border-slate-700">
          <p className="font-bold">{label}</p>
          <p>₹{payload[0].value.toLocaleString()} Revenue</p>
          <p>{payload[0].payload.orders} Units Ordered</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <div className="py-24 text-center text-slate-400 text-[14px]">Loading customer report…</div>;
  }

  if (!customer) {
    return (
      <div className="py-24 text-center">
        <p className="text-slate-500 text-[14px] mb-2">Customer not found.</p>
        <Link to="/reports" className="text-blue-600 hover:underline text-[13px] font-semibold">Back to Reports</Link>
      </div>
    );
  }

  const canEditLimit = isOwner || canRequestLimit;
  const newLimitPreview = Math.max(0, (customer.creditLimit || 0) + (limitRequest.type === "DECREASE" ? -1 : 1) * (Number(limitRequest.amount) || 0));

  return (
    <>
      <div className="mb-4">
        <Link to="/reports" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-slate-500 hover:text-blue-600 transition-colors">
          <ArrowLeft size={16} /> Back to Reports
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900">{customer.name}</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">{customer.city} • Customer ID: {customerId}</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <a href="#special-pricing" className="flex-1 sm:flex-none vw-btn-secondary h-10 px-4 flex items-center justify-center gap-2">
            <Settings size={16} /> Set Custom Pricing
          </a>
          <button className="flex-1 sm:flex-none vw-btn-primary h-10 px-4 flex items-center justify-center gap-2">
            <Download size={16} /> Download Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
        <div className="vw-card p-5 border-l-4 border-l-blue-500">
          <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Total Orders</p>
          <h2 className="text-2xl font-black text-slate-900 mt-2 flex items-center gap-2">
            {customer.totalOrders} <ShoppingBag size={18} className="text-blue-500" />
          </h2>
        </div>
        <div className="vw-card p-5 border-l-4 border-l-emerald-500">
          <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Total Revenue</p>
          <h2 className="text-2xl font-black text-slate-900 mt-2 flex items-center gap-2">
            {inr(customer.revenue)} <IndianRupee size={18} className="text-emerald-500" />
          </h2>
        </div>
        <div className="vw-card p-5 border-l-4 border-l-purple-500">
          <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Net Profit / Margin</p>
          <h2 className="text-2xl font-black text-slate-900 mt-2 flex items-center gap-2">
            — <TrendingUp size={18} className="text-purple-500" />
          </h2>
          <p className="text-[11px] text-slate-400 font-medium mt-1">No cost-basis data available yet</p>
        </div>
        <div className="vw-card p-5 border-l-4 border-l-rose-500">
          <div className="flex justify-between items-start">
            <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Credit Limit / Due</p>
            {canEditLimit && (
              <button onClick={openLimitModal} className="text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors" title={isOwner ? "Change Credit Limit" : "Request Limit Change"}>
                <Edit size={14} />
              </button>
            )}
          </div>
          <h2 className={`text-xl font-black mt-2 ${customer.due > customer.creditLimit ? 'text-rose-600' : 'text-slate-900'}`}>
            {inr(customer.due)} <span className="text-[14px] text-slate-400 font-medium">/ {inr(customer.creditLimit)}</span>
          </h2>
          {customer.due > customer.creditLimit && (
            <p className="text-[11px] text-rose-600 font-bold mt-1">Limit Exceeded by {inr(customer.due - customer.creditLimit)}</p>
          )}
          {pendingLimitRequests > 0 && (
            <p className="text-[11px] text-amber-600 font-bold mt-1">{pendingLimitRequests} limit request{pendingLimitRequests === 1 ? "" : "s"} waiting for approval</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 mt-6">
        {/* Product wise data chart */}
        <div className="vw-card p-5">
          <h3 className="text-[14px] font-bold text-slate-800 uppercase tracking-wider mb-6">Product-wise Revenue for this Customer</h3>
          <div className="h-[250px] w-full">
            {customer.productWise.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[13px] text-slate-400">No orders yet for this customer.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={customer.productWise} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={val => `₹${val/1000}k`} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }} width={100} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                  <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24}>
                    {customer.productWise.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#2563eb' : '#60a5fa'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Monthly orders, last 12 months */}
        <div className="vw-card p-5">
          <h3 className="text-[14px] font-bold text-slate-800 uppercase tracking-wider">Monthly Orders</h3>
          <p className="text-[12px] text-slate-500 mt-0.5 mb-6">Order value per month, last 12 months (ex-GST)</p>
          <div className="h-[250px] w-full">
            {(customer.monthly || []).length === 0 ? (
              <div className="h-full flex items-center justify-center text-[13px] text-slate-400">No orders in the last 12 months.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={customer.monthly} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={val => `₹${Math.round(val / 1000)}k`} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val, name, item) => [`${inr(val)} • ${item.payload.orders} order${item.payload.orders === 1 ? "" : "s"}`, "Value"]} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Payments and buying pattern */}
        <div className="vw-card p-5">
          <h3 className="text-[14px] font-bold text-slate-800 uppercase tracking-wider">Payments & Buying Pattern</h3>
          <p className="text-[12px] text-slate-500 mt-0.5 mb-4">Unpaid bills by age (oldest bills paid first), status and preferences</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[["0_30", "0–30 days"], ["31_60", "31–60 days"], ["61_90", "61–90 days"], ["90_plus", "90+ days"]].map(([k, label]) => (
              <div key={k} className={`rounded-lg border p-2.5 ${k === "90_plus" && customer.ageing?.buckets?.[k] > 0 ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50"}`}>
                <p className="text-[10px] font-bold text-slate-500 uppercase">{label}</p>
                <p className="text-[14px] font-black text-slate-800 mt-0.5">{inr(customer.ageing?.buckets?.[k])}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 divide-y divide-slate-100 text-[13px]">
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Overdue (past payment term)</span>
              <span className={`font-bold ${customer.ageing?.overdue > 0 ? "text-rose-600" : "text-slate-800"}`}>
                {customer.ageing?.overdue === null || customer.ageing?.overdue === undefined ? "No fixed term" : inr(customer.ageing.overdue)}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Oldest unpaid bill</span>
              <span className="font-bold text-slate-800">{customer.ageing?.oldest_unpaid_days === null || customer.ageing?.oldest_unpaid_days === undefined ? "—" : `${customer.ageing.oldest_unpaid_days} days`}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Last order</span>
              <span className={`font-bold ${customer.daysSinceLastOrder >= 60 ? "text-rose-600" : "text-slate-800"}`}>
                {customer.lastOrderAt ? `${new Date(customer.lastOrderAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} (${customer.daysSinceLastOrder} days ago)` : "—"}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Status / Term</span>
              <span className="font-bold text-slate-800">{customer.accountStatus || "—"} • {(customer.paymentTerm || "—").replace(/_/g, " ")}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Stock grade / Payment grade</span>
              <span className={`font-bold ${customer.paymentGrade && customer.paymentGrade !== "Normal" ? "text-rose-600" : "text-slate-800"}`}>{customer.stockGrade || "Not set"} • {customer.paymentGrade || "Normal"}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Returns (last 12 months)</span>
              <span className="font-bold text-slate-800">{customer.returns?.count || 0} returns • {customer.returns?.pieces || 0} pcs</span>
            </div>
          </div>

          {(customer.coatingPreference || []).length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Preferred coatings (pieces)</p>
              <div className="flex flex-wrap gap-1.5">
                {customer.coatingPreference.slice(0, 6).map((c) => (
                  <span key={c.coating} className="px-2 py-1 rounded bg-blue-50 border border-blue-100 text-[11px] font-bold text-blue-700">{c.coating} • {c.pieces}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Special negotiated pricing: add (brand → power → product) and manage, role based */}
      <div id="special-pricing" className="vw-card overflow-hidden mt-6 scroll-mt-4">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-[14px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2"><Tag size={16} className="text-blue-600" /> Negotiated Pricing Items</h3>
          <p className="text-[12px] text-slate-500 mt-0.5">
            {priceMode === "direct"
              ? `Set special rates for ${customer.name}. Rates cannot be lower than the product floor price.`
              : priceMode === "request"
              ? "Request special rates with a reason; Accounts / Owner approve them."
              : `Special rates set for ${customer.name}.`}
          </p>
        </div>

        {priceMode !== "none" && (
          <NegotiatedPriceForm customerId={customerId} pricingTier={customer.pricingTier || "stock_a"} onSaved={fetchNegotiatedPrices} />
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <th className="px-5 py-3 font-bold">Product</th>
                <th className="px-5 py-3 font-bold text-right">Standard Rate</th>
                <th className="px-5 py-3 font-bold text-right">Floor Price</th>
                <th className="px-5 py-3 font-bold text-right">Special Rate</th>
                <th className="px-5 py-3 font-bold text-right w-40">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loadingPrices && negotiatedPrices.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-6 text-center text-slate-400 text-[13px]">No negotiated pricing set for this customer (standard <strong className="uppercase">{customer.pricingTier}</strong> tier rates apply).</td></tr>
              )}
              {negotiatedPrices.map((p) => {
                const prod = p.product_id || {};
                const productId = prod._id || p.product_id;
                const isEditing = editing?.productId === productId;
                return (
                  <tr key={p._id} className="hover:bg-slate-50/50 transition-colors align-top">
                    <td className="px-5 py-3">
                      <div className="text-[13px] font-bold text-slate-800">{productLabel(prod)}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{prod.product_code || "—"}</div>
                    </td>
                    <td className="px-5 py-3 text-[13px] text-slate-500 text-right">{prod.tier_prices?.[customer.pricingTier] != null ? inr(prod.tier_prices[customer.pricingTier]) : "—"}</td>
                    <td className="px-5 py-3 text-[13px] text-slate-500 text-right">{prod.min_selling_price != null ? inr(prod.min_selling_price) : "—"}</td>
                    <td className="px-5 py-3 text-right">
                      {isEditing ? (
                        <div className="flex flex-col items-end gap-1.5">
                          <input type="number" min="1" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} className="w-24 h-8 px-2 border border-slate-200 rounded text-[13px] font-bold text-right focus:border-blue-500 focus:outline-none" autoFocus />
                          {priceMode === "request" && (
                            <input value={editing.note} onChange={(e) => setEditing({ ...editing, note: e.target.value })} placeholder="Reason for approver" className="w-48 h-8 px-2 border border-slate-200 rounded text-[12px] focus:border-blue-500 focus:outline-none" />
                          )}
                        </div>
                      ) : (
                        <span className="text-[14px] font-black text-emerald-600">{inr(p.negotiated_price)}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-1">
                          <button disabled={savingEdit} onClick={handleSaveEdit} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded" title={priceMode === "direct" ? "Save" : "Send for approval"}>
                            {savingEdit ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                          </button>
                          <button onClick={() => setEditing(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded" title="Cancel"><X size={15} /></button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          {priceMode !== "none" && (
                            <button onClick={() => setEditing({ productId, price: String(p.negotiated_price), note: "" })} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title={priceMode === "direct" ? "Change rate" : "Request rate change"}>
                              <Pencil size={15} />
                            </button>
                          )}
                          {canRemovePrice && (
                            <button onClick={() => handleRemovePrice(productId)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Remove special rate">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Orders, transactions, returns, calls & visits, requests, support */}
      <CustomerHistoryTabs customerId={customerId} report={customer} />

      {/* Credit Limit Modal: owner sets directly, others request an increase / decrease */}
      {limitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-[15px] text-slate-800">{isOwner ? "Adjust Credit Limit" : "Request Limit Change"}</h2>
              <p className="text-[12px] text-slate-500 mt-0.5">Current limit: <strong className="text-slate-800">{inr(customer.creditLimit)}</strong></p>
            </div>
            <form onSubmit={handleUpdateLimit} className="p-5 space-y-4">
              {isOwner ? (
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5">New Limit Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={newLimit}
                    onChange={e => setNewLimit(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[14px] font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {[["INCREASE", "Increase"], ["DECREASE", "Decrease"]].map(([key, label]) => (
                      <button key={key} type="button" onClick={() => setLimitRequest({ ...limitRequest, type: key })} className={`h-9 rounded-lg text-[12px] font-semibold border transition-colors ${limitRequest.type === key ? (key === "DECREASE" ? "bg-rose-600 text-white border-rose-600" : "bg-blue-600 text-white border-blue-600") : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>{label}</button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-slate-700 mb-1.5">{limitRequest.type === "DECREASE" ? "Decrease" : "Increase"} by (₹)</label>
                    <input
                      type="number"
                      min="1"
                      max={limitRequest.type === "DECREASE" ? (customer.creditLimit || 0) : undefined}
                      value={limitRequest.amount}
                      onChange={e => setLimitRequest({ ...limitRequest, amount: e.target.value })}
                      placeholder="e.g. 20000"
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[14px] font-bold focus:outline-none focus:border-blue-500"
                    />
                    {limitRequest.amount && <p className="text-[11px] text-slate-500 mt-1">New limit after approval: <strong className="text-slate-800">{inr(newLimitPreview)}</strong></p>}
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Reason</label>
                    <textarea rows={3} value={limitRequest.reason} onChange={e => setLimitRequest({ ...limitRequest, reason: e.target.value })} placeholder={limitRequest.type === "DECREASE" ? "Why should the limit be reduced?" : "Why does this customer need a higher limit?"} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500" />
                  </div>
                  <p className="text-[11px] text-amber-600">Only the owner can change the limit directly. This request goes for approval.</p>
                </>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setLimitModal(false)} className="flex-1 vw-btn-secondary h-10">Cancel</button>
                <button type="submit" disabled={savingLimit} className="flex-1 vw-btn-primary h-10 disabled:opacity-60">{savingLimit ? "Saving…" : isOwner ? "Save Limit" : "Send Request"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDialog}
    </>
  );
}
