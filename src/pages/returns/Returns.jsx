import { useState, useEffect, useMemo } from "react";
import {
  Search, Download, Undo2, CheckCircle, XCircle, AlertCircle, RefreshCcw,
  Plus, PhoneCall, ShieldCheck, FileText, Check, AlertTriangle, ArrowRight,
  PackageCheck, IndianRupee, Layers, Clock, UserCheck, Eye
} from "lucide-react";
import { notify } from "@/lib/notify";
import { returnService } from "@/services/returnService";
import { customerService } from "@/services/customerService";
import { productApi } from "@/services/productApi";
import { hasPermission } from "@/lib/permissions";
import "@/styles/veriwide.css";

const STATUS_CONFIG = {
  PENDING_OWNER_APPROVAL: {
    label: "Awaiting Owner Call",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
    icon: PhoneCall
  },
  APPROVED: {
    label: "Approved / Awaiting Inspection",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    icon: Clock
  },
  INSPECTED: {
    label: "Inspected / Ready for Credit Note",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-200",
    icon: PackageCheck
  },
  COMPLETED: {
    label: "Credited & Closed",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: CheckCircle
  },
  REJECTED: {
    label: "Rejected",
    badgeClass: "bg-rose-100 text-rose-700 border-rose-200",
    icon: XCircle
  }
};

export function Returns() {
  const [returns, setReturns] = useState([]);
  const [kpis, setKpis] = useState({
    totalQuarterReturns: 0,
    pendingOwnerApproval: 0,
    pendingInspection: 0,
    readyForCreditNote: 0,
    totalCreditedAmount: 0
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [showInitiateModal, setShowInitiateModal] = useState(false);
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [selectedReturn, setSelectedReturn] = useState(null);

  // Form states for modals
  const [submitting, setSubmitting] = useState(false);

  // 1. Initiate Modal Form
  const [customersList, setCustomersList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [initForm, setInitForm] = useState({
    customerId: "",
    orderNumber: "",
    productId: "",
    sph: 0,
    cyl: 0,
    axis: "",
    add: "",
    quantity: 1,
    originalUnitPrice: 0,
    returnReason: "Wrong power received",
    reasonDetails: ""
  });

  // 2. Owner Modal Form
  const [ownerDecision, setOwnerDecision] = useState("approve");
  const [ownerRemarks, setOwnerRemarks] = useState("");

  // 3. Inspect Modal Form
  const [inspectCondition, setInspectCondition] = useState("GOOD");
  const [inspectRemarks, setInspectRemarks] = useState("");

  // 4. Credit Note Modal Form
  const [creditedUnitPrice, setCreditedUnitPrice] = useState(0);
  const [creditRemarks, setCreditRemarks] = useState("");

  // Fetch KPI statistics and list
  const loadData = async () => {
    try {
      setLoading(true);
      const [kpiRes, listRes] = await Promise.all([
        returnService.getKPIs(),
        returnService.getReturns({
          status: activeTab,
          search: search.trim(),
          page: 1,
          limit: 50
        })
      ]);

      if (kpiRes?.data) setKpis(kpiRes.data);
      if (listRes?.data) {
        setReturns(listRes.data.returns || []);
        setTotalCount(listRes.data.total || 0);
      }
    } catch (err) {
      console.error("Error loading returns data:", err);
      notify.error(err.message || "Failed to load returns list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  // Open Initiate Modal and load customers/products if not loaded
  const handleOpenInitiate = async () => {
    setShowInitiateModal(true);
    try {
      if (customersList.length === 0) {
        const custRes = await customerService.getCustomers({ limit: 100 });
        if (custRes?.data?.customers) setCustomersList(custRes.data.customers);
      }
      if (productsList.length === 0) {
        const prodRes = await productApi.getProducts({});
        if (prodRes?.data?.products) setProductsList(prodRes.data.products);
      }
    } catch (err) {
      console.error("Failed to load options for initiate modal:", err);
    }
  };

  const selectedProduct = useMemo(() => {
    return productsList.find(p => p._id === initForm.productId);
  }, [initForm.productId, productsList]);

  // Submit Initiate Return
  const handleSubmitInitiate = async (e) => {
    e.preventDefault();
    if (!initForm.customerId) return notify.error("Please select a customer");
    if (!initForm.productId) return notify.error("Please select a product");
    if (!initForm.quantity || initForm.quantity <= 0) return notify.error("Quantity must be at least 1");

    if (selectedProduct?.return_status === "Do Not Take") {
      return notify.error(`Cannot initiate return: "${selectedProduct.name}" has return status "Do Not Take".`);
    }

    try {
      setSubmitting(true);
      await returnService.createReturn({
        customerId: initForm.customerId,
        items: [{
          product_id: initForm.productId,
          sph: Number(initForm.sph),
          cyl: initForm.cyl ? Number(initForm.cyl) : null,
          axis: initForm.axis ? Number(initForm.axis) : null,
          add: initForm.add ? Number(initForm.add) : null,
          quantity: Number(initForm.quantity),
          original_unit_price: Number(initForm.originalUnitPrice) || 0
        }],
        returnReason: initForm.returnReason,
        reasonDetails: initForm.reasonDetails
      });

      notify.success("Return request logged! Sent to owner for direct customer discussion.");
      setShowInitiateModal(false);
      setInitForm({
        customerId: "",
        orderNumber: "",
        productId: "",
        sph: 0,
        cyl: 0,
        axis: "",
        add: "",
        quantity: 1,
        originalUnitPrice: 0,
        returnReason: "Wrong power received",
        reasonDetails: ""
      });
      loadData();
    } catch (err) {
      notify.error(err.message || "Failed to initiate return");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Owner Approval
  const handleSubmitOwnerApproval = async (e) => {
    e.preventDefault();
    if (!selectedReturn) return;

    try {
      setSubmitting(true);
      const isApproved = ownerDecision === "approve";
      await returnService.approveReturn(selectedReturn._id, {
        approved: isApproved,
        remarks: ownerRemarks
      });

      notify.success(isApproved ? "Return approved by owner! Awaiting lens arrival at warehouse." : "Return rejected.");
      setShowOwnerModal(false);
      loadData();
    } catch (err) {
      notify.error(err.message || "Failed to process owner approval");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Physical Inspection
  const handleSubmitInspection = async (e) => {
    e.preventDefault();
    if (!selectedReturn) return;

    try {
      setSubmitting(true);
      await returnService.inspectReturn(selectedReturn._id, {
        overallCondition: inspectCondition,
        remarks: inspectRemarks
      });

      notify.success(
        inspectCondition === "GOOD"
          ? "Inspection completed! Good lens restocked directly into Running Inventory."
          : "Inspection completed! Lens marked damaged/scrap (not added to stock)."
      );
      setShowInspectModal(false);
      loadData();
    } catch (err) {
      notify.error(err.message || "Failed to process physical inspection");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Credit Note (Reduced Rate)
  const handleSubmitCreditNote = async (e) => {
    e.preventDefault();
    if (!selectedReturn) return;
    if (creditedUnitPrice < 0) return notify.error("Credited rate cannot be negative");

    const totalQty = selectedReturn.items?.reduce((sum, item) => sum + item.quantity, 0) || 1;
    const totalCredit = creditedUnitPrice * totalQty;

    if (totalCredit <= 0) return notify.error("Credit note amount must be greater than 0");

    try {
      setSubmitting(true);
      const res = await returnService.issueCreditNote(selectedReturn._id, {
        totalCreditAmount: totalCredit,
        creditedItems: selectedReturn.items.map(it => ({
          product_id: it.product_id,
          sph: it.sph,
          credited_unit_price: creditedUnitPrice
        })),
        remarks: creditRemarks
      });

      notify.success(`Credit Note ${res.data.creditNoteNumber} issued! ₹${totalCredit} adjusted against customer ledger balance.`);
      setShowCreditNoteModal(false);
      loadData();
    } catch (err) {
      notify.error(err.message || "Failed to issue credit note");
    } finally {
      setSubmitting(false);
    }
  };

  // Tabs definition matching Section 18
  const tabs = [
    { id: "ALL", label: "All Returns" },
    { id: "PENDING_OWNER_APPROVAL", label: "Pending Owner Call", badge: kpis.pendingOwnerApproval },
    { id: "APPROVED", label: "Pending Inspection", badge: kpis.pendingInspection },
    { id: "INSPECTED", label: "Ready for Credit Note", badge: kpis.readyForCreditNote },
    { id: "COMPLETED", label: "Credited / Closed" },
    { id: "REJECTED", label: "Rejected" },
  ];

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Returns & Credit Notes</h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Section 18 Strict Workflow
            </span>
          </div>
          <p className="text-[13px] text-slate-500 mt-1">
            Rare customer returns (1-2 per quarter), owner verification, running inventory restock, and reduced-rate credit notes.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={loadData}
            className="flex items-center justify-center gap-2 vw-btn-secondary h-10 px-4"
            title="Refresh"
          >
            <RefreshCcw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          {(hasPermission("INITIATE_RETURN") || hasPermission("VIEW_ORDERS")) && (
            <button
              onClick={handleOpenInitiate}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg h-10 px-4 transition-colors text-[13px] shadow-sm"
            >
              <Plus size={16} /> Log Return Request
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[12px] font-semibold">Quarterly Returns</span>
            <Undo2 size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1.5">{kpis.totalQuarterReturns || 0}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Rare events across full client base</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[12px] font-semibold">Owner Call Pending</span>
            <PhoneCall size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1.5">{kpis.pendingOwnerApproval || 0}</div>
          <div className="text-[11px] text-amber-600 mt-0.5">Awaiting Rahul/Rajat direct call</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs bg-blue-50/20">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-[12px] font-semibold">Pending Inspection</span>
            <PackageCheck size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700 mt-1.5">{kpis.pendingInspection || 0}</div>
          <div className="text-[11px] text-blue-600 mt-0.5">Physical check for running restock</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[12px] font-semibold">Total Credited (QTR)</span>
            <IndianRupee size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1.5">₹{(kpis.totalCreditedAmount || 0).toLocaleString("en-IN")}</div>
          <div className="text-[11px] text-emerald-600 mt-0.5">Credited at reduced rate to ledger</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 mt-6 hide-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-1 py-3 mr-8 text-[14px] font-semibold transition-colors relative flex items-center gap-2 ${
              activeTab === tab.id ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                {tab.badge}
              </span>
            )}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-blue-600 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mt-6 justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search return #, customer name, phone, order #..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500"
          />
        </form>
        <div className="text-[13px] text-slate-500 self-center">
          Showing <b>{returns.length}</b> of <b>{totalCount}</b> returns
        </div>
      </div>

      {/* Returns Table */}
      <div className="mt-4 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="px-5 py-3">Return & Date</th>
                <th className="px-5 py-3">Customer & Entity</th>
                <th className="px-5 py-3">Lens & Power</th>
                <th className="px-5 py-3">Reason</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <RefreshCcw size={20} className="animate-spin inline mr-2 text-blue-500" /> Loading returns...
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <Undo2 size={32} className="mx-auto text-slate-300 mb-2" />
                    No returns found for the selected tab.
                  </td>
                </tr>
              ) : returns.map((ret) => {
                const cfg = STATUS_CONFIG[ret.status] || STATUS_CONFIG.PENDING_OWNER_APPROVAL;
                const StatusIcon = cfg.icon;
                const totalItemQty = ret.items?.reduce((s, i) => s + (i.quantity || 1), 0) || 1;
                const firstItem = ret.items?.[0] || {};

                return (
                  <tr key={ret._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{ret.return_number}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(ret.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                      {ret.order_number && (
                        <div className="text-[10px] text-blue-600 font-semibold mt-0.5">Order: {ret.order_number}</div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{ret.customer_id?.name || "Unknown Customer"}</div>
                      <div className="text-[11px] text-slate-500">
                        {ret.customer_id?.company_name ? `${ret.customer_id.company_name} • ` : ""}{ret.customer_id?.city || ""}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {ret.entity}
                        </span>
                        {ret.isExcessReturn && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1" title="Customer returns unusually often">
                            <AlertTriangle size={11} /> High Return Freq ({ret.customerQuarterlyReturns})
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">{firstItem.product_name || "Lens"}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        SPH: {firstItem.sph > 0 ? `+${firstItem.sph}` : firstItem.sph}
                        {firstItem.cyl !== null && firstItem.cyl !== undefined ? ` / CYL: ${firstItem.cyl}` : ""}
                        {" • Qty: "}<b className="text-slate-800">{totalItemQty}</b>
                      </div>
                      {ret.items?.length > 1 && (
                        <div className="text-[10px] text-blue-600 font-semibold mt-0.5">+{ret.items.length - 1} more items</div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-700">{ret.return_reason}</div>
                      {ret.reason_details && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5" title={ret.reason_details}>
                          "{ret.reason_details}"
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold uppercase border ${cfg.badgeClass}`}>
                        <StatusIcon size={12} /> {cfg.label}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Step 1 Action: Owner Approval */}
                        {ret.status === "PENDING_OWNER_APPROVAL" && (
                          hasPermission("APPROVE_RETURN") || hasPermission("MANAGE_USERS") ? (
                            <button
                              onClick={() => {
                                setSelectedReturn(ret);
                                setOwnerDecision("approve");
                                setOwnerRemarks("");
                                setShowOwnerModal(true);
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded font-bold text-[11px] shadow-xs"
                            >
                              <PhoneCall size={12} /> Owner Decision
                            </button>
                          ) : (
                            <span className="text-[11px] text-amber-700 font-medium">Awaiting Owner Call</span>
                          )
                        )}

                        {/* Step 2 Action: Warehouse Inspection */}
                        {ret.status === "APPROVED" && (
                          hasPermission("INSPECT_RETURN") || hasPermission("VIEW_INVENTORY") ? (
                            <button
                              onClick={() => {
                                setSelectedReturn(ret);
                                setInspectCondition("GOOD");
                                setInspectRemarks("");
                                setShowInspectModal(true);
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[11px] shadow-xs"
                            >
                              <PackageCheck size={12} /> Physical Inspect
                            </button>
                          ) : (
                            <span className="text-[11px] text-blue-700 font-medium">Awaiting Inspection</span>
                          )
                        )}

                        {/* Step 3 Action: Accounts Credit Note */}
                        {ret.status === "INSPECTED" && (
                          hasPermission("MANAGE_CREDIT_NOTE") || hasPermission("VIEW_CUSTOMERS") ? (
                            <button
                              onClick={() => {
                                setSelectedReturn(ret);
                                const origPrice = ret.items?.[0]?.original_unit_price || 0;
                                // Suggest default reduced rate (e.g., 85% of original, or same)
                                setCreditedUnitPrice(origPrice);
                                setCreditRemarks("");
                                setShowCreditNoteModal(true);
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold text-[11px] shadow-xs"
                            >
                              <IndianRupee size={12} /> Issue Credit Note
                            </button>
                          ) : (
                            <span className="text-[11px] text-purple-700 font-medium">Ready for Credit</span>
                          )
                        )}

                        {/* Completed / Detail View */}
                        <button
                          onClick={() => {
                            setSelectedReturn(ret);
                            setShowDetailModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. Modal: Initiate Return (Staff) */}
      {/* ========================================================= */}
      {showInitiateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Undo2 className="text-blue-600" size={18} />
                <h2 className="font-bold text-[15px] text-slate-800">Log Customer Return Request</h2>
              </div>
              <button onClick={() => setShowInitiateModal(false)} className="text-slate-400 hover:text-slate-700">
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitInitiate} className="p-5 space-y-4">
              <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 text-[12px] text-blue-900 leading-relaxed">
                <b>Section 18 Rule:</b> Returns are staff-initiated and require owner-level approval (Rahul/Rajat) after a direct phone call with the customer.
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">Customer *</label>
                <select
                  value={initForm.customerId}
                  onChange={(e) => setInitForm({ ...initForm, customerId: e.target.value })}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 font-medium"
                  required
                >
                  <option value="">Select Customer...</option>
                  {customersList.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.name} {c.company_name ? `(${c.company_name})` : ""} - {c.city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1">Product *</label>
                  <select
                    value={initForm.productId}
                    onChange={(e) => setInitForm({ ...initForm, productId: e.target.value })}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 font-medium"
                    required
                  >
                    <option value="">Select Lens Product...</option>
                    {productsList.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.name} [{p.return_status || "Can Take"}]
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1">Original Order # (Optional)</label>
                  <input
                    type="text"
                    value={initForm.orderNumber}
                    onChange={(e) => setInitForm({ ...initForm, orderNumber: e.target.value })}
                    placeholder="e.g. ORD-2026-0091"
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Product Return Status Warning */}
              {selectedProduct && (
                <div className={`p-2.5 rounded-lg text-[12px] flex items-center gap-2 ${
                  selectedProduct.return_status === "Do Not Take"
                    ? "bg-rose-50 text-rose-800 border border-rose-200"
                    : selectedProduct.return_status === "Review"
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                }`}>
                  <AlertCircle size={15} />
                  <span>
                    Product Return Eligibility: <b>{selectedProduct.return_status || "Can Take"}</b>
                    {selectedProduct.return_status === "Do Not Take" && " (Returns blocked!)"}
                  </span>
                </div>
              )}

              {/* Lens Power Specifications */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Lens Power & Quantity</label>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-semibold">SPH *</label>
                    <input
                      type="number"
                      step="0.25"
                      value={initForm.sph}
                      onChange={(e) => setInitForm({ ...initForm, sph: e.target.value })}
                      className="w-full h-9 px-2 bg-white border border-slate-200 rounded text-[12px] text-center font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-semibold">CYL</label>
                    <input
                      type="number"
                      step="0.25"
                      value={initForm.cyl}
                      onChange={(e) => setInitForm({ ...initForm, cyl: e.target.value })}
                      className="w-full h-9 px-2 bg-white border border-slate-200 rounded text-[12px] text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-semibold">Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      value={initForm.quantity}
                      onChange={(e) => setInitForm({ ...initForm, quantity: e.target.value })}
                      className="w-full h-9 px-2 bg-white border border-slate-200 rounded text-[12px] text-center font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-semibold">Orig. Rate (₹)</label>
                    <input
                      type="number"
                      value={initForm.originalUnitPrice}
                      onChange={(e) => setInitForm({ ...initForm, originalUnitPrice: e.target.value })}
                      className="w-full h-9 px-2 bg-white border border-slate-200 rounded text-[12px] text-center"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">Return Reason *</label>
                <select
                  value={initForm.returnReason}
                  onChange={(e) => setInitForm({ ...initForm, returnReason: e.target.value })}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value="Wrong power received">Wrong power received</option>
                  <option value="Damaged in transit">Damaged in transit</option>
                  <option value="Quality/coating issue">Quality / coating issue</option>
                  <option value="Customer ordering mistake">Customer ordering mistake</option>
                  <option value="Delayed delivery">Delayed delivery</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">Customer Conversation Remarks</label>
                <textarea
                  rows="2"
                  value={initForm.reasonDetails}
                  onChange={(e) => setInitForm({ ...initForm, reasonDetails: e.target.value })}
                  placeholder="Notes from customer discussion..."
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInitiateModal(false)}
                  className="flex-1 vw-btn-secondary h-10 text-[13px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || selectedProduct?.return_status === "Do Not Take"}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-[13px] rounded-lg h-10 transition-colors flex items-center justify-center gap-1.5"
                >
                  {submitting ? <RefreshCcw size={15} className="animate-spin" /> : <Check size={16} />}
                  Submit to Owner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. Modal: Owner-Level Approval (Rahul / Rajat) */}
      {/* ========================================================= */}
      {showOwnerModal && selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-amber-50/50">
              <div className="flex items-center gap-2">
                <PhoneCall className="text-amber-600" size={18} />
                <h2 className="font-bold text-[15px] text-slate-800">Owner Verification & Decision</h2>
              </div>
              <button onClick={() => setShowOwnerModal(false)} className="text-slate-400 hover:text-slate-700">
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitOwnerApproval} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-[14px] text-slate-900">{selectedReturn.return_number}</div>
                    <div className="text-[12px] text-slate-600 font-medium mt-0.5">{selectedReturn.customer_id?.name} ({selectedReturn.customer_id?.city})</div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {selectedReturn.entity}
                  </span>
                </div>
                <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 text-[12px] text-slate-700">
                  <span className="font-bold">Reason:</span> "{selectedReturn.return_reason}"
                  {selectedReturn.reason_details && <p className="text-[11px] text-slate-500 mt-0.5">{selectedReturn.reason_details}</p>}
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Owner Call Decision</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOwnerDecision("approve")}
                    className={`py-2.5 px-3 rounded-lg text-[13px] font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      ownerDecision === "approve"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <CheckCircle size={15} /> Approve Return
                  </button>
                  <button
                    type="button"
                    onClick={() => setOwnerDecision("reject")}
                    className={`py-2.5 px-3 rounded-lg text-[13px] font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      ownerDecision === "reject"
                        ? "bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <XCircle size={15} /> Reject Return
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">Owner Remarks</label>
                <input
                  type="text"
                  value={ownerRemarks}
                  onChange={(e) => setOwnerRemarks(e.target.value)}
                  placeholder="e.g. Spoke with owner, allowed one-time exchange"
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOwnerModal(false)}
                  className="flex-1 vw-btn-secondary h-10 text-[13px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 font-bold text-[13px] text-white rounded-lg h-10 transition-colors flex items-center justify-center gap-1.5 ${
                    ownerDecision === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {submitting ? <RefreshCcw size={15} className="animate-spin" /> : <Check size={16} />}
                  Confirm {ownerDecision === "approve" ? "Approval" : "Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. Modal: Physical Inspection & Running Stock Reintegration */}
      {/* ========================================================= */}
      {showInspectModal && selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-blue-50/50">
              <div className="flex items-center gap-2">
                <PackageCheck className="text-blue-600" size={18} />
                <h2 className="font-bold text-[15px] text-slate-800">Warehouse Physical Inspection</h2>
              </div>
              <button onClick={() => setShowInspectModal(false)} className="text-slate-400 hover:text-slate-700">
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitInspection} className="p-5 space-y-4">
              <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-3 text-[12px] text-blue-900 leading-relaxed">
                <b>55-Page Doc Stock Rule:</b> Good-condition returned lenses go straight back into <b>Running Inventory</b> for immediate resale (not routed through Reserve stock).
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                <div className="font-bold text-[13px] text-slate-900">{selectedReturn.return_number}</div>
                <div className="text-[12px] text-slate-600">
                  {selectedReturn.items?.map((it, idx) => (
                    <div key={idx} className="font-mono text-[11px]">
                      • {it.product_name} (SPH: {it.sph}{it.cyl ? `, CYL: ${it.cyl}` : ""}) x {it.quantity}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Inspected Physical Condition</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setInspectCondition("GOOD")}
                    className={`py-3 px-3 rounded-lg text-[13px] font-bold border flex flex-col items-center justify-center gap-1 transition-all ${
                      inspectCondition === "GOOD"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <CheckCircle size={16} className="text-emerald-600" />
                    <span>Good Condition</span>
                    <span className="text-[10px] font-normal text-emerald-700">Restock to Running Stock</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectCondition("DAMAGED")}
                    className={`py-3 px-3 rounded-lg text-[13px] font-bold border flex flex-col items-center justify-center gap-1 transition-all ${
                      inspectCondition === "DAMAGED"
                        ? "bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <AlertTriangle size={16} className="text-rose-600" />
                    <span>Scratched / Damaged</span>
                    <span className="text-[10px] font-normal text-rose-700">Scrap (Do not restock)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">Inspector Remarks</label>
                <input
                  type="text"
                  value={inspectRemarks}
                  onChange={(e) => setInspectRemarks(e.target.value)}
                  placeholder="e.g. Verified envelope unopened, lens intact"
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInspectModal(false)}
                  className="flex-1 vw-btn-secondary h-10 text-[13px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-lg h-10 transition-colors flex items-center justify-center gap-1.5"
                >
                  {submitting ? <RefreshCcw size={15} className="animate-spin" /> : <Check size={16} />}
                  Complete Inspection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. Modal: Issue Credit Note (Reduced Rate & Direct Ledger) */}
      {/* ========================================================= */}
      {showCreditNoteModal && selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-purple-50/50">
              <div className="flex items-center gap-2">
                <IndianRupee className="text-purple-600" size={18} />
                <h2 className="font-bold text-[15px] text-slate-800">Issue Credit Note & Adjust Ledger</h2>
              </div>
              <button onClick={() => setShowCreditNoteModal(false)} className="text-slate-400 hover:text-slate-700">
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitCreditNote} className="p-5 space-y-4">
              <div className="bg-purple-50/70 border border-purple-200 rounded-lg p-3 text-[12px] text-purple-950 leading-relaxed">
                <b>55-Page Doc Accounts Rule:</b> An accepted return is credited at a <b>reduced rate</b> (not full price), and automatically adjusted directly against the customer's line of credit / outstanding balance.
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-800">{selectedReturn.customer_id?.name}</span>
                </div>
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-slate-500">Current Outstanding Debt:</span>
                  <span className="font-bold text-rose-600">₹{(selectedReturn.customer_id?.used_balance || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-slate-500">Original Unit Rate:</span>
                  <span className="font-mono text-slate-700">₹{selectedReturn.items?.[0]?.original_unit_price || 0}</span>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Credited Unit Rate (₹) * <span className="text-purple-600 font-normal">(Reduced Rate)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={creditedUnitPrice}
                  onChange={(e) => setCreditedUnitPrice(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[14px] font-bold text-purple-700 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              {/* Total Calculation Display */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="font-semibold text-emerald-900">Total Credit Note Value:</span>
                  <span className="font-black text-[16px] text-emerald-700">
                    ₹{(creditedUnitPrice * (selectedReturn.items?.reduce((s, i) => s + (i.quantity || 1), 0) || 1)).toLocaleString()}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-800 mt-1">
                  Will reduce customer debt by this amount and release available credit headroom immediately.
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">Accounts Remarks</label>
                <input
                  type="text"
                  value={creditRemarks}
                  onChange={(e) => setCreditRemarks(e.target.value)}
                  placeholder="e.g. Credited at ₹X cut-rate as agreed"
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreditNoteModal(false)}
                  className="flex-1 vw-btn-secondary h-10 text-[13px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[13px] rounded-lg h-10 transition-colors flex items-center justify-center gap-1.5"
                >
                  {submitting ? <RefreshCcw size={15} className="animate-spin" /> : <FileText size={16} />}
                  Issue CN & Adjust Khata
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. Modal: Return & Credit Note Full Audit Details */}
      {/* ========================================================= */}
      {showDetailModal && selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="text-slate-600" size={18} />
                <h2 className="font-bold text-[15px] text-slate-800">Return Lifecycle Audit: {selectedReturn.return_number}</h2>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-700">
                <XCircle size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-[13px]">
              {/* Customer Info */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="font-bold text-slate-900">{selectedReturn.customer_id?.name}</div>
                <div className="text-slate-500 text-[12px]">{selectedReturn.customer_id?.company_name} • {selectedReturn.customer_id?.city}</div>
                <div className="text-slate-400 text-[11px] mt-1">Entity: {selectedReturn.entity}</div>
              </div>

              {/* Items Breakdown */}
              <div>
                <div className="font-bold text-slate-700 text-[12px] mb-1.5 uppercase tracking-wider">Returned Lenses</div>
                <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                  {selectedReturn.items?.map((it, idx) => (
                    <div key={idx} className="p-2.5 flex justify-between items-center text-[12px]">
                      <div>
                        <div className="font-bold text-slate-800">{it.product_name}</div>
                        <div className="font-mono text-slate-500 text-[11px]">SPH: {it.sph} {it.cyl ? `| CYL: ${it.cyl}` : ""} • Qty: {it.quantity}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-semibold text-slate-600">Orig: ₹{it.original_unit_price}</div>
                        {it.credited_unit_price > 0 && (
                          <div className="text-[11px] font-bold text-purple-700">Credited: ₹{it.credited_unit_price}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lifecycle Steps */}
              <div className="space-y-3 pt-2">
                <div className="font-bold text-slate-700 text-[12px] uppercase tracking-wider">Lifecycle Milestones</div>

                {/* Step 1: Initiated */}
                <div className="flex items-start gap-2.5 text-[12px]">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] mt-0.5">1</div>
                  <div>
                    <div className="font-bold text-slate-800">Return Initiated by Staff</div>
                    <div className="text-slate-500 text-[11px]">Reason: {selectedReturn.return_reason}</div>
                  </div>
                </div>

                {/* Step 2: Owner Approval */}
                <div className="flex items-start gap-2.5 text-[12px]">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] mt-0.5 ${
                    selectedReturn.owner_approval?.status ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                  }`}>2</div>
                  <div>
                    <div className="font-bold text-slate-800">Owner Direct Call & Approval</div>
                    <div className="text-slate-500 text-[11px]">
                      {selectedReturn.owner_approval?.status
                        ? `Approved by ${selectedReturn.owner_approval?.approved_by?.name || "Owner"}`
                        : "Pending owner review"}
                    </div>
                  </div>
                </div>

                {/* Step 3: Warehouse Physical Inspection */}
                <div className="flex items-start gap-2.5 text-[12px]">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] mt-0.5 ${
                    selectedReturn.inspection?.overall_condition ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                  }`}>3</div>
                  <div>
                    <div className="font-bold text-slate-800">Physical Inspection & Restock</div>
                    <div className="text-slate-500 text-[11px]">
                      {selectedReturn.inspection?.overall_condition
                        ? `Condition: ${selectedReturn.inspection.overall_condition} (Restocked to Running Stock)`
                        : "Awaiting physical arrival"}
                    </div>
                  </div>
                </div>

                {/* Step 4: Credit Note & Khata Adjustment */}
                <div className="flex items-start gap-2.5 text-[12px]">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] mt-0.5 ${
                    selectedReturn.credit_note?.credit_note_number ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-400"
                  }`}>4</div>
                  <div>
                    <div className="font-bold text-slate-800">Credit Note Issued & Khata Adjusted</div>
                    <div className="text-slate-500 text-[11px]">
                      {selectedReturn.credit_note?.credit_note_number
                        ? `${selectedReturn.credit_note.credit_note_number} (Amount: ₹${selectedReturn.credit_note.credit_amount})`
                        : "Awaiting credit note generation"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="vw-btn-secondary h-9 px-4 text-[12px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
