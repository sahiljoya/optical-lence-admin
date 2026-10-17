import { useState, useEffect } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { 
  ArrowLeft, Edit, ShieldCheck, MonitorSmartphone, 
  ShoppingCart, Package, Plus, Loader2, CreditCard,
  TrendingUp, MapPin, Phone, Mail, Building, Clock, X, Power, PowerOff, ArrowRightLeft,
  User, Eye, FileText, Image as ImageIcon, ShieldAlert, CheckCircle2,
  Tag, AlertTriangle, Trash2, Smartphone, Globe, MessageSquare, XCircle, History
} from "lucide-react";
import { customerService } from "@/services/customerService";
import { productApi } from "@/services/productApi";
import { userService } from "@/services/userService";
import { StatusPill } from "@/components/common/StatusPill";
import { notify } from "@/lib/notify";
import { hasPermission } from "@/lib/permissions";
import { useConfirm } from "@/hooks/useConfirm";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from "recharts";
import "@/styles/veriwide.css";

const ACCOUNT_STATUS_STYLES = {
  Hold: "bg-rose-50 text-rose-700 border-rose-200",
  Short: "bg-amber-50 text-amber-700 border-amber-200",
  Cash: "bg-blue-50 text-blue-700 border-blue-200",
  Credit: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Review: "bg-purple-50 text-purple-700 border-purple-200",
};

const REQUEST_STATUS_STYLES = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

export function CustomerDetails() {
  const { id } = useParams({ strict: false });
  const [data, setData] = useState(null);
  const [allCustomers, setAllCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Sub-Customer state (no password needed - OTP login)
  const [showSubModal, setShowSubModal] = useState(false);
  const [subForm, setSubForm] = useState({ 
    id: null, 
    name: "", 
    phone: "", 
    email: "", 
    allow_cart: true, 
    allow_order: false, 
    show_quantity: true, 
    parent_customer_id: "" 
  });
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferData, setTransferData] = useState({ subId: null, newParentId: "" });

  // Credit Limit Request & Account Status modals
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitForm, setLimitForm] = useState({ amount: "", reason: "" });
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("Credit");

  // Edit Profile Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    company_name: "",
    email: "",
    whatsapp_number: "",
    landline_number: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gst_no: "",
    pan_number: "",
    adhar_number: "",
    pricing_tier: "stock_a",
    credit_limit: 0,
    payment_term: "cash",
    stock_grade: "",
    assigned_salesperson: "",
    preferred_courier: "",
    account_status: "Credit"
  });
  const [salespeopleList, setSalespeopleList] = useState([]);

  // Negotiated Pricing Section state (Floor-protected)
  const [negotiatedPrices, setNegotiatedPrices] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [customPriceInput, setCustomPriceInput] = useState("");
  const [priceSaving, setPriceSaving] = useState(false);

  // Credit Limit Request History state
  const [limitRequests, setLimitRequests] = useState([]);
  const [showApproveLimitModal, setShowApproveLimitModal] = useState(false);
  const [selectedLimitRequest, setSelectedLimitRequest] = useState(null);
  const [approveLimitAmount, setApproveLimitAmount] = useState("");
  const [approveLimitRemarks, setApproveLimitRemarks] = useState("");

  // Discount Request History state
  const [discountRequests, setDiscountRequests] = useState([]);

  // Charts & orders
  const [orderVolume, setOrderVolume] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [cartItems, setCartItems] = useState([]);

  const { confirm, confirmDialog } = useConfirm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [res, subRes, negRes, prodsRes, usersRes, limitReqRes, discountReqRes] = await Promise.all([
        customerService.getCustomerById(id),
        customerService.getSubCustomers(id),
        customerService.getCustomerNegotiatedPrices(id).catch(() => ({ data: [] })),
        productApi.getProducts({ limit: 300 }).catch(() => ({ data: { list: [] } })),
        userService.getEmployees({ limit: 100 }).catch(() => ({ data: { list: [] } })),
        customerService.getCustomerLimitRequests(id).catch(() => ({ data: [] })),
        customerService.getCustomerDiscountRequests(id).catch(() => ({ data: [] }))
      ]);

      const custData = res.data;
      setData({
        ...custData,
        id: custData._id,
        sub_customers: (subRes.data || []).map(s => ({ ...s, id: s._id })),
      });

      setNegotiatedPrices(negRes.data || []);
      setProductsList(prodsRes.data?.list || prodsRes.data || []);
      setSalespeopleList(usersRes.data?.list || usersRes.data || []);
      setLimitRequests(limitReqRes.data || []);
      setDiscountRequests(discountReqRes.data || []);

      const allRes = await customerService.getCustomers({ approval_status: "APPROVED", limit: 500 });
      setAllCustomers(
        (allRes.data?.list || [])
          .map(c => ({ ...c, id: c._id }))
          .filter(c => c.id !== id && c.is_active)
      );

      const [volumeRes, ordersRes, cartRes] = await Promise.all([
        customerService.getOrderVolume(id).catch(() => ({ data: [] })),
        customerService.getRecentOrders(id).catch(() => ({ data: [] })),
        customerService.getCart(id).catch(() => ({ data: [] })),
      ]);
      setOrderVolume(volumeRes.data || []);
      setRecentOrders(ordersRes.data || []);
      setCartItems(cartRes.data || []);
    } catch (err) {
      console.error(err);
      notify.error("Customer not found or error loading data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  // Freeze / Unfreeze Handler
  const handleFreezeToggle = async () => {
    const willFreeze = data.is_active;
    const ok = await confirm(
      willFreeze
        ? `Are you sure you want to FREEZE ${data.company_name || data.name}? The customer will immediately be blocked from logging in or placing orders.`
        : `Are you sure you want to UNFREEZE ${data.company_name || data.name}? The customer will regain full login and ordering access.`,
      {
        title: willFreeze ? "Freeze Customer Account" : "Unfreeze Customer Account",
        acceptLabel: willFreeze ? "Freeze Account" : "Unfreeze Account",
        danger: willFreeze,
      }
    );
    if (!ok) return;

    setActionLoading("freeze");
    try {
      const res = await customerService.toggleCustomerStatus(data._id, !willFreeze);
      if (res.error === false) {
        notify.success(willFreeze ? "Customer account frozen successfully." : "Customer account unfrozen successfully.");
        await fetchData();
      } else {
        notify.error(res.message || "Failed to update customer status.");
      }
    } catch (err) {
      notify.error("Error toggling account status.");
    } finally {
      setActionLoading(null);
    }
  };

  // Reset App / Web Device Lock
  const handleResetDevice = async (platform) => {
    const label = platform === "web" ? "Web" : "App";
    const ok = await confirm(`Are you sure you want to reset the ${label} login device lock for this account?`, {
      title: "Reset Device Lock",
      acceptLabel: "Reset Device",
    });
    if (!ok) return;
    setActionLoading(`device-${platform}`);
    try {
      await customerService.resetDevice(id, platform);
      notify.success(`${label} device lock reset successfully. Customer can now log in from a new device.`);
      await fetchData();
    } catch (err) {
      notify.error(err.message || "Failed to reset device lock.");
    } finally {
      setActionLoading(null);
    }
  };

  // Open Edit Profile Modal
  const handleOpenEditModal = () => {
    setEditForm({
      name: data.name || "",
      company_name: data.company_name || "",
      email: data.email || "",
      whatsapp_number: data.whatsapp_number || "",
      landline_number: data.landline_number || "",
      address: data.address || "",
      city: data.city || "",
      state: data.state || "",
      pincode: data.pincode || "",
      gst_no: data.gst_no || "",
      pan_number: data.pan_number || "",
      adhar_number: data.adhar_number || "",
      pricing_tier: data.pricing_tier || "stock_a",
      credit_limit: data.credit_limit || 0,
      payment_term: data.payment_term || "cash",
      stock_grade: data.stock_grade || "",
      assigned_salesperson: data.assigned_salesperson?._id || data.assigned_salesperson || "",
      preferred_courier: data.preferred_courier || "",
      account_status: data.account_status || "Credit"
    });
    setShowEditModal(true);
  };

  // Save Edit Profile
  const handleSaveEditProfile = async (e) => {
    e.preventDefault();
    setActionLoading("edit-profile");
    try {
      const payload = {
        ...editForm,
        landline_number: editForm.landline_number ? Number(editForm.landline_number) : null,
        credit_limit: Number(editForm.credit_limit) || 0,
        assigned_salesperson: editForm.assigned_salesperson || null
      };
      const res = await customerService.updateCustomerProfile(data._id, payload);
      if (res.error === false) {
        notify.success("Customer profile updated successfully!");
        setShowEditModal(false);
        await fetchData();
      } else {
        notify.error(res.message || "Failed to update profile.");
      }
    } catch (err) {
      notify.error(err.message || "Server error updating profile.");
    } finally {
      setActionLoading(null);
    }
  };

  // Sub-Customer Management (OTP Only - No Password)
  const handleAddSub = async (e) => {
    e.preventDefault();
    setActionLoading("sub");
    try {
      const permissions = {
        allow_cart: subForm.allow_cart,
        allow_order: subForm.allow_order,
        show_quantity: subForm.show_quantity,
      };
      if (subForm.id) {
        // Edit mode
        await customerService.updateSubCustomer(subForm.id, {
          name: subForm.name,
          phone: subForm.phone,
        });
        await customerService.updateSubCustomerPermissions(subForm.id, permissions);
        notify.success("Staff account updated successfully!");
      } else {
        // Create mode (OTP-based, no password)
        await customerService.createSubCustomer(id, {
          name: subForm.name,
          phone: subForm.phone,
          ...permissions,
        });
        notify.success("Staff member added successfully!");
      }
      setShowSubModal(false);
      setSubForm({ id: null, name: "", phone: "", email: "", allow_cart: true, allow_order: false, show_quantity: true, parent_customer_id: "" });
      await fetchData();
    } catch (err) {
      console.error(err);
      notify.error(err.message || "Error saving staff account.");
    } finally {
      setActionLoading(null);
    }
  };

  const openEditSubModal = (sub) => {
    setSubForm({
      id: sub.id,
      name: sub.name,
      phone: sub.phone,
      email: sub.email || "",
      allow_cart: sub.subcustomer_permissions?.allow_cart ?? true,
      allow_order: sub.subcustomer_permissions?.allow_order ?? false,
      show_quantity: sub.subcustomer_permissions?.show_quantity ?? true,
      parent_customer_id: id
    });
    setShowSubModal(true);
  };

  const handleToggleSubStatus = async (sub) => {
    const ok = await confirm(`Are you sure you want to ${sub.is_active ? "deactivate" : "activate"} this staff account?`, {
      title: "Change Staff Status",
      acceptLabel: "Confirm",
    });
    if (!ok) return;
    try {
      await customerService.updateSubCustomer(sub.id, { is_active: !sub.is_active });
      await fetchData();
    } catch (err) {
      notify.error(err.message || "Failed to update staff status.");
    }
  };

  const handleTransferSub = async (e) => {
    e.preventDefault();
    if (!transferData.newParentId) return notify.error("Please select a target shop.");
    const ok = await confirm("Are you sure you want to transfer this staff member to the selected shop?", {
      title: "Confirm Staff Transfer",
      acceptLabel: "Transfer",
    });
    if (!ok) return;

    setActionLoading("transfer");
    try {
      await customerService.updateSubCustomer(transferData.subId, { parent_customer_id: transferData.newParentId });
      notify.success("Staff member transferred successfully!");
      setShowTransferModal(false);
      await fetchData();
    } catch (err) {
      notify.error(err.message || "Failed to transfer staff.");
    } finally {
      setActionLoading(null);
    }
  };

  // Limit & Status Handlers
  const handleOpenLimitModal = () => {
    setLimitForm({ amount: "", reason: "" });
    setShowLimitModal(true);
  };

  const handleRequestLimit = async (e) => {
    e.preventDefault();
    setActionLoading("limit");
    try {
      await customerService.requestLimitIncrease(id, Number(limitForm.amount), limitForm.reason);
      notify.success("Limit increase request sent to Accounts Team.");
      setShowLimitModal(false);
    } catch (err) {
      notify.error(err.message || "Failed to request limit increase.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenStatusModal = () => {
    setNewStatus(data.account_status || "Credit");
    setShowStatusModal(true);
  };

  const handleChangeStatus = async (e) => {
    e.preventDefault();
    setActionLoading("status");
    try {
      await customerService.updateAccountStatus(id, newStatus);
      notify.success(`Account status updated to ${newStatus}.`);
      setShowStatusModal(false);
      await fetchData();
    } catch (err) {
      notify.error(err.message || "Failed to update account status.");
    } finally {
      setActionLoading(null);
    }
  };

  // Negotiated Price Handlers (Floor Protected)
  const selectedProduct = productsList.find(p => p._id === selectedProductId);
  const selectedProdTierPrice = selectedProduct?.tier_prices?.[data?.pricing_tier || "stock_a"] ?? "-";
  const selectedFloorPrice = selectedProduct?.min_selling_price ?? null;
  const isBelowFloor = selectedFloorPrice != null && customPriceInput && Number(customPriceInput) < selectedFloorPrice;

  const handleSaveNegotiatedPrice = async (e) => {
    e.preventDefault();
    if (!selectedProductId) return notify.warning("Please select a product.");
    if (!customPriceInput || Number(customPriceInput) <= 0) return notify.warning("Please enter a valid price.");

    if (isBelowFloor) {
      return notify.error(`Cannot save: Price (₹${customPriceInput}) is below minimum floor price (₹${selectedFloorPrice}).`);
    }

    setPriceSaving(true);
    try {
      const res = await customerService.setNegotiatedPrice(id, selectedProductId, Number(customPriceInput));
      if (res.error === false) {
        notify.success("Special negotiated price set successfully!");
        setSelectedProductId("");
        setCustomPriceInput("");
        const negRes = await customerService.getCustomerNegotiatedPrices(id);
        setNegotiatedPrices(negRes.data || []);
      } else {
        notify.error(res.message || "Failed to set negotiated price.");
      }
    } catch (err) {
      notify.error(err.message || "Error saving negotiated price.");
    } finally {
      setPriceSaving(false);
    }
  };

  const handleDeleteNegotiatedPrice = async (productId) => {
    const ok = await confirm("Remove this special negotiated price? The customer will revert to their standard category tier price.", {
      title: "Remove Special Price",
      acceptLabel: "Remove",
      danger: true,
    });
    if (!ok) return;

    try {
      const res = await customerService.deleteNegotiatedPrice(id, productId);
      if (res.error === false) {
        notify.success("Special price removed. Customer reverted to standard tier price.");
        const negRes = await customerService.getCustomerNegotiatedPrices(id);
        setNegotiatedPrices(negRes.data || []);
      } else {
        notify.error(res.message || "Failed to remove price.");
      }
    } catch (err) {
      notify.error("Error removing special price.");
    }
  };

  // Credit Limit Request History Handlers
  const handleOpenApproveLimitModal = (req) => {
    setSelectedLimitRequest(req);
    setApproveLimitAmount(req.requested_amount.toString());
    setApproveLimitRemarks("");
    setShowApproveLimitModal(true);
  };

  const handleApproveLimitRequest = async (e) => {
    e.preventDefault();
    const amount = parseFloat(approveLimitAmount);
    if (!amount || amount <= 0) return notify.warning("Enter a valid amount");

    setActionLoading("approve-limit");
    try {
      await customerService.actionLimitIncrease({
        requestId: selectedLimitRequest._id,
        action: "APPROVED",
        approvedAmount: amount,
        remarks: approveLimitRemarks
      });
      notify.success("Credit limit request approved.");
      setShowApproveLimitModal(false);
      await fetchData();
    } catch (err) {
      notify.error(err.message || "Failed to approve limit request.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectLimitRequest = async (req) => {
    const ok = await confirm("Are you sure you want to reject this credit limit request?", {
      title: "Reject Limit Request",
      acceptLabel: "Reject",
      danger: true,
    });
    if (!ok) return;
    try {
      await customerService.actionLimitIncrease({ requestId: req._id, action: "REJECTED" });
      notify.success("Credit limit request rejected.");
      await fetchData();
    } catch (err) {
      notify.error(err.message || "Failed to reject limit request.");
    }
  };

  // Discount Request History Handlers
  const handleApproveDiscountRequest = async (req) => {
    const ok = await confirm(`Approve the special discount request of ₹${req.requested_price}?`, {
      title: "Approve Discount Request",
      acceptLabel: "Approve",
    });
    if (!ok) return;
    try {
      const res = await customerService.actionDiscountRequest({ requestId: req._id, action: "APPROVE" });
      if (res.error === false) {
        notify.success("Discount request approved. Special negotiated price is now active.");
        await fetchData();
      } else {
        notify.error(res.message || "Failed to approve discount request.");
      }
    } catch (err) {
      notify.error(err.message || "Failed to approve discount request.");
    }
  };

  const handleRejectDiscountRequest = async (req) => {
    const ok = await confirm("Are you sure you want to reject this discount request?", {
      title: "Reject Discount Request",
      acceptLabel: "Reject",
      danger: true,
    });
    if (!ok) return;
    try {
      await customerService.actionDiscountRequest({ requestId: req._id, action: "REJECT" });
      notify.success("Discount request rejected.");
      await fetchData();
    } catch (err) {
      notify.error(err.message || "Failed to reject discount request.");
    }
  };

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
        <Loader2 size={32} className="animate-spin mb-3 text-primary" />
        <p className="text-sm">Loading customer details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/customers" className="p-2 border border-border rounded-xl bg-white hover:bg-slate-50 transition-colors shadow-sm shrink-0">
            <ArrowLeft size={18} className="text-slate-600" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate">{data.company_name || data.name}</h1>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">Customer Profile & Account Governance</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {hasPermission("EDIT_CUSTOMER") && (
            <button 
              onClick={handleOpenEditModal} 
              className="vw-btn-secondary h-9 px-3.5 sm:px-4 text-[13px] flex-1 sm:flex-none justify-center flex items-center gap-2 bg-white shadow-sm border border-slate-200 hover:bg-slate-50"
            >
              <Edit size={14}/> Edit Profile
            </button>
          )}

          {/* Freeze / Unfreeze Action Button */}
          {hasPermission("DELETE_CUSTOMER") && (
            data.is_active ? (
              <button 
                onClick={handleFreezeToggle} 
                disabled={actionLoading === "freeze"}
                className="vw-btn-secondary h-9 px-3.5 sm:px-4 text-[13px] text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 flex-1 sm:flex-none justify-center flex items-center gap-2 shadow-sm transition-colors"
              >
                {actionLoading === "freeze" ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14}/>} Freeze Account
              </button>
            ) : (
              <button 
                onClick={handleFreezeToggle} 
                disabled={actionLoading === "freeze"}
                className="vw-btn-secondary h-9 px-3.5 sm:px-4 text-[13px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex-1 sm:flex-none justify-center flex items-center gap-2 shadow-sm transition-colors"
              >
                {actionLoading === "freeze" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14}/>} Unfreeze Account
              </button>
            )
          )}
        </div>
      </div>

      {/* 2. Hero Identity Banner */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-border shadow-sm relative overflow-hidden flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 sm:gap-6">
        {/* Left Side: Avatar & Core ID */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 z-10 w-full lg:w-auto">
          {data.profilePic ? (
            <img 
              src={data.profilePic} 
              alt={data.name} 
              className="w-16 h-16 rounded-2xl object-cover shadow-md border border-slate-200 shrink-0" 
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-blue-500/20 shrink-0">
              {(data.company_name || data.name || "C")[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight break-words">{data.company_name || data.name}</h2>
              <StatusPill status={data.approval_status === "APPROVED" ? (data.is_active ? "active" : "frozen") : "pending_approval"} />
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {data.entity}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] sm:text-[13px] font-medium text-slate-500">
              <span className="flex items-center gap-1.5"><Building size={14}/> {data.name} (Contact)</span>
              <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-slate-300"></span>
              <span className="flex items-center gap-1.5">
                <Clock size={14}/> Joined {data.createdAt ? new Date(data.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A"}
              </span>
            </div>
          </div>
        </div>
        
        {/* Right Side: Quick Contact & Limit */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 z-10 bg-slate-50 p-4 rounded-xl border border-slate-100 w-full lg:w-auto justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-[13px] text-slate-700">
              <Phone size={14} className="text-slate-400 shrink-0"/> {data.phone}
            </div>
            {data.whatsapp_number && (
              <a 
                href={`https://wa.me/${data.whatsapp_number.replace(/\D/g, "")}`} 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center gap-2 text-[12px] text-emerald-600 hover:underline font-medium break-all"
              >
                <MessageSquare size={13} className="shrink-0"/> WhatsApp: {data.whatsapp_number}
              </a>
            )}
            <div className="flex items-center gap-2 text-[13px] text-slate-600 break-all">
              <Mail size={14} className="text-slate-400 shrink-0"/> {data.email || "No Email Provided"}
            </div>
          </div>
          <div className="h-px sm:h-10 w-full sm:w-px bg-slate-200"></div>
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Credit Limit</span>
            <span className="text-lg font-bold text-slate-800">₹{data.credit_limit?.toLocaleString() || "0"}</span>
            <span className="text-[11px] text-slate-500 mt-0.5">Tier: <strong className="uppercase text-blue-600 font-semibold">{data.pricing_tier}</strong></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Deep Details (Span 4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Business & Location Card */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-5">
            <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <MapPin size={14}/> Location & KYC
            </h3>
            
            <div className="space-y-4 text-[13px]">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[11px] uppercase mb-0.5">Assigned Salesperson</span>
                  <span className="font-semibold text-slate-800">
                    {data.assigned_salesperson?.name || "Direct / Self-Registered"}
                  </span>
                </div>
                {data.assigned_salesperson?.phone && (
                  <span className="text-[12px] text-blue-600 font-medium">📞 {data.assigned_salesperson.phone}</span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] uppercase mb-1">Owner / Contact Name</span>
                <span className="font-semibold text-slate-800">{data.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] uppercase mb-1">Full Address</span>
                <span className="font-medium text-slate-700 leading-relaxed block">
                  {data.address || "Address not provided."}<br/>
                  {data.city ? `${data.city}, ` : ""}{data.state || "India"} - {data.pincode || ""}
                </span>
              </div>
              <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <span className="text-slate-500 block text-[11px] uppercase mb-1">GST Number</span>
                  <span className="font-semibold text-slate-800 break-all">{data.gst_no || "Unregistered"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] uppercase mb-1">PAN Number</span>
                  <span className="font-semibold text-slate-800 break-all">{data.pan_number || "N/A"}</span>
                </div>
              </div>
              {data.preferred_courier && (
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-slate-500 block text-[11px] uppercase mb-1">Preferred Courier</span>
                  <span className="font-semibold text-slate-800">{data.preferred_courier}</span>
                </div>
              )}
            </div>
          </div>

          {/* KYC Documents & Photos Card */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-4 sm:p-5">
            <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ImageIcon size={14}/> KYC Documents & Photos
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2.5 sm:gap-3">
              {[
                { label: "GST Certificate", img: data.gst_image },
                { label: "PAN Card", img: data.pan_image },
                { label: "Aadhar Card", img: data.adhar_image },
                { label: "Visiting Card", img: data.visiting_card },
                { label: "Shop / Profile Photo", img: data.profilePic }
              ].map((doc, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-2 bg-slate-50 flex flex-col items-center justify-between text-center min-h-[110px]">
                  <span className="text-[11px] font-semibold text-slate-700 truncate w-full mb-1">{doc.label}</span>
                  {doc.img ? (
                    <div className="relative group w-full h-16 rounded overflow-hidden border border-slate-200 bg-white">
                      <img src={doc.img} alt={doc.label} className="w-full h-full object-cover" />
                      <a
                        href={doc.img}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1 text-[11px] font-bold"
                      >
                        <Eye size={14} /> View
                      </a>
                    </div>
                  ) : (
                    <div className="w-full h-16 rounded border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 bg-white">
                      <FileText size={18} className="mb-0.5 opacity-40" />
                      <span className="text-[10px]">Not Uploaded</span>
                    </div>
                  )}
                  {doc.img && (
                    <a
                      href={doc.img}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-600 hover:underline font-medium mt-1"
                    >
                      View Full
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Account Preferences Card */}
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <CreditCard size={14}/> Account Settings
              </h3>
            </div>
            <div className="p-5 space-y-5 text-[13px]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[11px] uppercase mb-1">Account Status</span>
                  <span className={`font-bold px-2.5 py-1 border rounded-md uppercase text-[11px] tracking-wide ${ACCOUNT_STATUS_STYLES[data.account_status] || "bg-slate-50 text-slate-700 border-slate-200"}`}>
                    {data.account_status || "N/A"}
                  </span>
                </div>
                {hasPermission("APPROVE_CUSTOMER") && (
                  <button onClick={handleOpenStatusModal} className="text-[12px] font-semibold text-blue-600 hover:underline">Change</button>
                )}
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div>
                  <span className="text-slate-500 block text-[11px] uppercase mb-1">Pricing Tier</span>
                  <span className="font-bold text-blue-700 px-2.5 py-1 bg-blue-50 border border-blue-100 rounded-md uppercase text-[11px] tracking-wide">
                    {data.pricing_tier ? data.pricing_tier.replace(/_/g, " ") : "N/A"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[11px] uppercase mb-1">Payment Term</span>
                  <span className="font-semibold text-slate-800 capitalize">{data.payment_term}</span>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100">
                {hasPermission("REQUEST_CREDIT_LIMIT") && (
                  <button onClick={handleOpenLimitModal} className="w-full h-9 flex items-center justify-center gap-2 text-[13px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                    <TrendingUp size={14}/> Request Limit Increase
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Device Security Card */}
          <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-amber-100 bg-amber-50/30">
              <h3 className="text-[12px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-2">
                <MonitorSmartphone size={14}/> Bound Devices (Security Lock)
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  <Smartphone size={14} className="text-slate-400" /> App Device Lock
                </div>
                <p className="text-[13px] font-medium text-slate-800 mb-1">
                  {data.device_name || data.device_id || <span className="text-slate-400 font-normal italic">No mobile app bound</span>}
                </p>
                {data.device_id && (
                  <p className="text-[11px] text-slate-400 font-mono truncate mb-2">{data.device_id}</p>
                )}
                <button 
                  onClick={() => handleResetDevice("app")} 
                  disabled={!data.device_id || actionLoading === "device-app"} 
                  className="w-full h-8 flex items-center justify-center gap-2 text-[12px] font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                >
                  {actionLoading === "device-app" ? <Loader2 size={14} className="animate-spin" /> : "Reset Mobile Device Lock"}
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  <Globe size={14} className="text-slate-400" /> Web Browser Lock
                </div>
                <p className="text-[13px] font-medium text-slate-800 mb-1">
                  {data.web_device_name || data.web_device_id || <span className="text-slate-400 font-normal italic">No web browser bound</span>}
                </p>
                {data.web_device_id && (
                  <p className="text-[11px] text-slate-400 font-mono truncate mb-2">{data.web_device_id}</p>
                )}
                <button 
                  onClick={() => handleResetDevice("web")} 
                  disabled={!data.web_device_id || actionLoading === "device-web"} 
                  className="w-full h-8 flex items-center justify-center gap-2 text-[12px] font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                >
                  {actionLoading === "device-web" ? <Loader2 size={14} className="animate-spin" /> : "Reset Web Device Lock"}
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Interactive Data (Span 8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-border shadow-sm p-5 h-72 flex flex-col">
              <h3 className="text-[13px] font-bold text-slate-800 mb-4">Order Volume (6 Months)</h3>
              <div className="flex-1 min-h-0 -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={orderVolume} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: "#64748b"}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: "#64748b"}} dx={-10} />
                    <Tooltip contentStyle={{fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"}} />
                    <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-border shadow-sm p-5 h-72 flex flex-col">
              <h3 className="text-[13px] font-bold text-slate-800 mb-4">Credit Limit Usage</h3>
              <div className="flex-1 flex flex-col justify-center">
                {(() => {
                  const limit = data.credit_limit || 0;
                  const used = data.current_balance || 0;
                  const available = limit - used;
                  const percent = limit > 0 ? (used / limit) * 100 : 0;
                  
                  return (
                    <div className="space-y-6">
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Used Credit</p>
                          <p className="text-2xl font-bold text-slate-800">₹{used.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Limit</p>
                          <p className="text-lg font-bold text-slate-800">₹{limit.toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div className="relative h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${percent > 85 ? 'bg-rose-500' : percent > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                      
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-medium text-slate-600">Available: <span className="font-bold text-emerald-600">₹{available.toLocaleString()}</span></span>
                        <span className="font-bold text-slate-400">{percent.toFixed(1)}% Used</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Section: Special Negotiated Pricing (Floor-Protected Sub-List) */}
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border bg-slate-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-[14px] font-bold text-slate-800 flex items-center gap-2">
                    <Tag size={16} className="text-blue-600"/> Special Negotiated Pricing (Sub-List)
                  </h3>
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    Pinned custom lens rates for this retailer. Rates cannot be lower than the product floor price.
                  </p>
                </div>
              </div>
            </div>

            {/* Set New Negotiated Price Form */}
            <form onSubmit={handleSaveNegotiatedPrice} className="p-5 border-b border-slate-100 bg-blue-50/20">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-6">
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">Select Product</label>
                  <select 
                    value={selectedProductId} 
                    onChange={e => setSelectedProductId(e.target.value)}
                    className="w-full border border-slate-200 px-3 py-2 rounded-lg text-[13px] bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Choose a Lens Product --</option>
                    {productsList.map(p => (
                      <option key={p._id} value={p._id}>
                        {[p.brand, p.index, p.base, p.coating].filter(Boolean).join(" ")} ({p.product_code || "SKU"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">Special Rate (₹)</label>
                  <input 
                    type="number" 
                    min="1" 
                    placeholder="e.g. 85" 
                    value={customPriceInput} 
                    onChange={e => setCustomPriceInput(e.target.value)}
                    className={`w-full border px-3 py-2 rounded-lg text-[13px] bg-white focus:outline-none ${isBelowFloor ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}`}
                  />
                </div>

                <div className="sm:col-span-3">
                  <button 
                    type="submit" 
                    disabled={priceSaving || !selectedProductId || !customPriceInput || isBelowFloor}
                    className="w-full h-[38px] flex items-center justify-center gap-1.5 text-[12px] font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
                  >
                    {priceSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Set Special Rate
                  </button>
                </div>
              </div>

              {/* Selected Product Floor Price & Tier Price Info Box */}
              {selectedProduct && (
                <div className="mt-3 p-3 bg-white border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-[12px]">
                  <div className="flex items-center gap-4">
                    <span>
                      Standard Rate ({data.pricing_tier}): <strong className="text-slate-800 font-semibold">₹{selectedProdTierPrice}</strong>
                    </span>
                    <span>
                      Minimum Floor Price: <strong className="text-indigo-600 font-semibold">₹{selectedFloorPrice != null ? selectedFloorPrice : "None"}</strong>
                    </span>
                  </div>

                  {isBelowFloor && (
                    <div className="flex items-center gap-1.5 text-red-600 font-semibold">
                      <AlertTriangle size={14} /> Price is lower than floor price (₹{selectedFloorPrice})!
                    </div>
                  )}
                </div>
              )}
            </form>

            {/* List of Active Negotiated Prices */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-[13px] min-w-[560px]">
                <thead className="bg-slate-50 border-b border-border text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-2.5 px-4 sm:px-5 font-semibold">Product Description</th>
                    <th className="py-2.5 px-3 sm:px-4 font-semibold text-right">Standard Rate</th>
                    <th className="py-2.5 px-3 sm:px-4 font-semibold text-right">Floor Price</th>
                    <th className="py-2.5 px-3 sm:px-4 font-semibold text-right">Special Price</th>
                    <th className="py-2.5 px-3 sm:px-4 font-semibold text-right w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {negotiatedPrices.length > 0 ? negotiatedPrices.map(np => {
                    const prod = np.product_id || {};
                    const stdRate = prod.tier_prices?.[data.pricing_tier] ?? "-";
                    return (
                      <tr key={np._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 sm:px-5">
                          <div className="font-semibold text-slate-800">
                            {[prod.brand, prod.index, prod.base, prod.coating].filter(Boolean).join(" ") || "Product"}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{prod.product_code || "-"}</div>
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right text-slate-500">₹{stdRate}</td>
                        <td className="py-3 px-3 sm:px-4 text-right text-slate-500">₹{prod.min_selling_price ?? "-"}</td>
                        <td className="py-3 px-3 sm:px-4 text-right font-bold text-emerald-600 text-[14px]">
                          ₹{np.negotiated_price}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right">
                          <button 
                            onClick={() => handleDeleteNegotiatedPrice(prod._id || np.product_id)} 
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Revert to standard tier rate"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 text-[13px]">
                        No special negotiated prices pinned for this retailer. (Customer buys at standard <strong className="uppercase">{data.pricing_tier}</strong> tier rates).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Credit Limit Request History */}
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border bg-slate-50/50">
              <h3 className="text-[14px] font-bold text-slate-800 flex items-center gap-2">
                <History size={16} className="text-blue-600"/> Credit Limit Request History
              </h3>
              <p className="text-[12px] text-slate-500 mt-0.5">Requests raised by sales staff to increase this customer's credit limit.</p>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-[13px] min-w-[600px]">
                <thead className="bg-slate-50 border-b border-border text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-2.5 px-4 sm:px-5 font-semibold">Requested By</th>
                    <th className="py-2.5 px-3 sm:px-4 font-semibold text-right">Current → Requested</th>
                    <th className="py-2.5 px-3 sm:px-4 font-semibold">Reason</th>
                    <th className="py-2.5 px-3 sm:px-4 font-semibold text-center">Status</th>
                    <th className="py-2.5 px-3 sm:px-4 font-semibold text-right w-36">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {limitRequests.length > 0 ? limitRequests.map(req => (
                    <tr key={req._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 sm:px-5">
                        <div className="font-semibold text-slate-800">{req.requested_by?.name || "—"}</div>
                        <div className="text-[11px] text-slate-400">{new Date(req.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right">
                        <span className="text-slate-500">₹{req.current_limit?.toLocaleString()}</span>
                        <span className="mx-1 text-slate-300">→</span>
                        <span className="font-bold text-blue-600">₹{req.requested_amount?.toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-slate-600 max-w-xs">{req.reason || "—"}</td>
                      <td className="py-3 px-3 sm:px-4 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase border ${REQUEST_STATUS_STYLES[req.status] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right">
                        {req.status === "PENDING" && hasPermission("APPROVE_CREDIT_LIMIT") ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => handleOpenApproveLimitModal(req)} className="px-2.5 py-1 text-[11px] font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1">
                              <CheckCircle2 size={12}/> Approve
                            </button>
                            <button onClick={() => handleRejectLimitRequest(req)} className="px-2.5 py-1 text-[11px] font-semibold rounded bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors flex items-center gap-1">
                              <XCircle size={12}/> Reject
                            </button>
                          </div>
                        ) : req.status === "APPROVED" ? (
                          <span className="text-[11px] text-slate-400">by {req.approved_by?.name || "—"}</span>
                        ) : null}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 text-[13px]">No credit limit requests raised for this customer yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Discount Request History */}
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border bg-slate-50/50">
              <h3 className="text-[14px] font-bold text-slate-800 flex items-center gap-2">
                <History size={16} className="text-indigo-600"/> Special Discount Request History
              </h3>
              <p className="text-[12px] text-slate-500 mt-0.5">Discount requests raised by sales staff for specific products (floor-price protected).</p>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-[13px] min-w-[640px]">
                <thead className="bg-slate-50 border-b border-border text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-2.5 px-4 sm:px-5 font-semibold">Product</th>
                    <th className="py-2.5 px-3 sm:px-4 font-semibold">Salesperson</th>
                    <th className="py-2.5 px-3 sm:px-4 font-semibold text-right">Standard → Requested</th>
                    <th className="py-2.5 px-3 sm:px-4 font-semibold text-center">Status</th>
                    <th className="py-2.5 px-3 sm:px-4 font-semibold text-right w-36">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {discountRequests.length > 0 ? discountRequests.map(req => {
                    const prod = req.product_id || {};
                    return (
                      <tr key={req._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 sm:px-5">
                          <div className="font-semibold text-slate-800">{[prod.brand, prod.index, prod.base, prod.coating].filter(Boolean).join(" ") || "Product"}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{prod.product_code || "-"}</div>
                        </td>
                        <td className="py-3 px-3 sm:px-4">
                          <div className="text-slate-700">{req.salesperson_id?.name || "—"}</div>
                          <div className="text-[11px] text-slate-400">{new Date(req.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right">
                          <span className="text-slate-500">₹{req.standard_tier_price}</span>
                          <span className="mx-1 text-slate-300">→</span>
                          <span className="font-bold text-indigo-600">₹{req.requested_price}</span>
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-center">
                          <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase border ${REQUEST_STATUS_STYLES[req.status] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right">
                          {req.status === "PENDING" && hasPermission("APPROVE_DISCOUNT") ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => handleApproveDiscountRequest(req)} className="px-2.5 py-1 text-[11px] font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1">
                                <CheckCircle2 size={12}/> Approve
                              </button>
                              <button onClick={() => handleRejectDiscountRequest(req)} className="px-2.5 py-1 text-[11px] font-semibold rounded bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors flex items-center gap-1">
                                <XCircle size={12}/> Reject
                              </button>
                            </div>
                          ) : req.status === "APPROVED" ? (
                            <span className="text-[11px] text-slate-400">by {req.action_by?.name || "—"}</span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 text-[13px]">No discount requests raised for this customer yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sub Customers Table (Staff) */}
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-border bg-slate-50/50">
              <div>
                <h3 className="text-[14px] font-bold text-slate-800 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-indigo-600"/> Staff & Sub-Customers (OTP Login)
                </h3>
                <p className="text-[12px] text-slate-500 mt-0.5">Manage access and ordering permissions for shop employees.</p>
              </div>
              <button 
                onClick={() => {
                  setSubForm({ id: null, name: "", phone: "", email: "", allow_cart: true, allow_order: false, show_quantity: true, parent_customer_id: "" });
                  setShowSubModal(true);
                }} 
                className="vw-btn-primary h-9 px-4 text-[13px] flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto"
              >
                <Plus size={16}/> Add Staff
              </button>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-[13px] min-w-[620px]">
                <thead className="bg-white border-b border-border">
                  <tr>
                    <th className="py-3 px-5 font-semibold text-slate-500">Staff Name</th>
                    <th className="py-3 px-5 font-semibold text-slate-500">Contact</th>
                    <th className="py-3 px-5 font-semibold text-slate-500">Permissions</th>
                    <th className="py-3 px-5 font-semibold text-slate-500 w-24 text-center">Status</th>
                    <th className="py-3 px-5 font-semibold text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.sub_customers?.length > 0 ? data.sub_customers.map(sub => (
                    <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-5">
                        <div className="font-semibold text-slate-800">{sub.name}</div>
                      </td>
                      <td className="py-3 px-5 text-slate-600">{sub.phone}</td>
                      <td className="py-3 px-5">
                        <div className="flex flex-wrap gap-2">
                          {sub.subcustomer_permissions?.allow_cart ? <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-semibold border border-emerald-100">Cart: Yes</span> : <span className="px-2 py-1 bg-rose-50 text-rose-700 rounded-md text-[10px] font-semibold border border-rose-100">Cart: No</span>}
                          {sub.subcustomer_permissions?.allow_order ? <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-semibold border border-emerald-100">Order: Yes</span> : <span className="px-2 py-1 bg-rose-50 text-rose-700 rounded-md text-[10px] font-semibold border border-rose-100">Order: No</span>}
                          {sub.subcustomer_permissions?.show_quantity ? <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-semibold border border-emerald-100">Stock: Yes</span> : <span className="px-2 py-1 bg-rose-50 text-rose-700 rounded-md text-[10px] font-semibold border border-rose-100">Stock: No</span>}
                        </div>
                      </td>
                      <td className="py-3 px-5 text-center"><StatusPill status={sub.is_active ? "active" : "frozen"} /></td>
                      <td className="py-3 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => {
                            setTransferData({ subId: sub.id, newParentId: "" });
                            setShowTransferModal(true);
                          }} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Transfer to another Shop">
                            <ArrowRightLeft size={16} />
                          </button>
                          <button onClick={() => openEditSubModal(sub)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => handleToggleSubStatus(sub)} className={`p-1.5 rounded transition-colors ${sub.is_active ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}`} title={sub.is_active ? "Deactivate" : "Activate"}>
                            {sub.is_active ? <PowerOff size={16} /> : <Power size={16} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="py-8 text-center text-slate-500 text-[13px]">No staff accounts added yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Cart & Recent Orders Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Active Cart */}
            <div className="bg-white rounded-xl border border-border shadow-sm flex flex-col">
              <div className="p-5 border-b border-border bg-slate-50/50">
                <h3 className="text-[14px] font-bold text-slate-800 flex items-center gap-2"><ShoppingCart size={16} className="text-amber-500"/> Active Cart</h3>
              </div>
              <div className="p-5 space-y-3 flex-1">
                {cartItems.length > 0 ? cartItems.map(item => (
                  <div key={item._id} className="flex items-center justify-between p-3.5 bg-white border border-slate-200 shadow-sm rounded-lg hover:border-slate-300 transition-colors">
                    <div>
                      <div className="font-semibold text-[13px] text-slate-800">
                        {[item.product_id?.brand, item.product_id?.index, item.product_id?.base, item.product_id?.coating].filter(Boolean).join(" ") || "Product"}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">SPH {item.sph} / CYL {item.cyl}{item.axis != null ? ` / AXIS ${item.axis}` : ""}{item.add != null ? ` / ADD ${item.add}` : ""}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[14px] text-slate-900">₹{item.unit_price}</div>
                      <div className="text-[11px] font-medium text-slate-500">Qty: {item.quantity}</div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-slate-500 text-[13px]">Cart is empty.</div>
                )}
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl border border-border shadow-sm flex flex-col">
              <div className="p-5 border-b border-border bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-slate-800 flex items-center gap-2"><Package size={16} className="text-emerald-500"/> Recent Orders</h3>
                <Link to="/orders" className="text-[12px] text-blue-600 hover:underline font-semibold">View All</Link>
              </div>
              <div className="divide-y divide-slate-100 flex-1">
                {recentOrders.length > 0 ? recentOrders.slice(0,5).map(ord => (
                  <div key={ord._id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="font-bold text-[13px] text-blue-600 cursor-pointer hover:underline">{ord.order_number}</div>
                      <div className="text-[11px] text-slate-500 mt-1">{new Date(ord.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} • <span className="font-medium text-slate-700">{ord.items?.length || 0} items</span></div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[13px] text-slate-900">₹{ord.total_amount?.toLocaleString()}</div>
                      <div className="text-[11px] text-emerald-600 font-semibold mt-1 bg-emerald-50 px-1.5 py-0.5 rounded-sm inline-block">{ord.status}</div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-slate-500 text-[13px]">No recent orders.</div>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Edit Profile Modal (Accounts & Sales Teams) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4 sm:my-8 max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Edit Customer Profile</h2>
                <p className="text-[12px] text-slate-500 mt-0.5">Update contact, KYC, and commercial tier settings.</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-2 rounded-xl transition-colors">
                <X size={18}/>
              </button>
            </div>

            <form onSubmit={handleSaveEditProfile} className="p-4 sm:p-6 space-y-6 max-h-[calc(90vh-130px)] overflow-y-auto">
              {/* Contact Information */}
              <div>
                <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-3">1. Contact & Identity</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">Company / Shop Name *</label>
                    <input required value={editForm.company_name} onChange={e => setEditForm({...editForm, company_name: e.target.value})} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-[13px] bg-slate-50/50 focus:bg-white focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">Owner / Contact Name *</label>
                    <input required value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-[13px] bg-slate-50/50 focus:bg-white focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">Email Address</label>
                    <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-[13px] bg-slate-50/50 focus:bg-white focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">WhatsApp Number</label>
                    <input value={editForm.whatsapp_number} onChange={e => setEditForm({...editForm, whatsapp_number: e.target.value})} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-[13px] bg-slate-50/50 focus:bg-white focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-3">2. Address & Location</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">Street Address</label>
                    <input value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-[13px] bg-slate-50/50 focus:bg-white focus:outline-none focus:border-blue-500" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[12px] font-semibold text-slate-700 mb-1">City</label>
                      <input value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-[13px] bg-slate-50/50 focus:bg-white focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-slate-700 mb-1">State</label>
                      <input value={editForm.state} onChange={e => setEditForm({...editForm, state: e.target.value})} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-[13px] bg-slate-50/50 focus:bg-white focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-slate-700 mb-1">Pincode</label>
                      <input value={editForm.pincode} onChange={e => setEditForm({...editForm, pincode: e.target.value})} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-[13px] bg-slate-50/50 focus:bg-white focus:outline-none focus:border-blue-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tax / Identity */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-3">3. Tax & Government IDs</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">GST Number</label>
                    <input value={editForm.gst_no} onChange={e => setEditForm({...editForm, gst_no: e.target.value})} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-[13px] bg-slate-50/50 focus:bg-white focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">PAN Number</label>
                    <input value={editForm.pan_number} onChange={e => setEditForm({...editForm, pan_number: e.target.value})} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-[13px] bg-slate-50/50 focus:bg-white focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">Aadhar Number</label>
                    <input value={editForm.adhar_number} onChange={e => setEditForm({...editForm, adhar_number: e.target.value})} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-[13px] bg-slate-50/50 focus:bg-white focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
              </div>

              {/* Commercial / Sales Settings */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-3">4. Commercial & Sales Governance</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">Pricing Tier</label>
                    <select value={editForm.pricing_tier} onChange={e => setEditForm({...editForm, pricing_tier: e.target.value})} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-[13px] bg-white focus:outline-none focus:border-blue-500">
                      <option value="courier">Courier (Standard Retail)</option>
                      <option value="stock_a">Stock A (Tier 1)</option>
                      <option value="stock_a_plus">Stock A+ (Tier 2)</option>
                      <option value="stock_platinum">Platinum (VIP Discount)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">Payment Term</label>
                    <select value={editForm.payment_term} onChange={e => setEditForm({...editForm, payment_term: e.target.value})} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-[13px] bg-white focus:outline-none focus:border-blue-500">
                      <option value="cash">Cash (Pay First)</option>
                      <option value="1_week">1 Week Credit</option>
                      <option value="1_month">1 Month Credit</option>
                      <option value="credit_on_bills">Credit on Bills</option>
                      <option value="adjustment">Adjustment</option>
                      <option value="one_time">One Time</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">Credit Limit (₹)</label>
                    <input type="number" min="0" value={editForm.credit_limit} onChange={e => setEditForm({...editForm, credit_limit: e.target.value})} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-[13px] bg-slate-50/50 focus:bg-white focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">Assigned Salesperson</label>
                    <select value={editForm.assigned_salesperson} onChange={e => setEditForm({...editForm, assigned_salesperson: e.target.value})} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-[13px] bg-white focus:outline-none focus:border-blue-500">
                      <option value="">-- Direct / Unassigned --</option>
                      {salespeopleList.map(s => (
                        <option key={s._id} value={s._id}>{s.name} ({s.phone || s.email})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">Preferred Courier</label>
                    <input value={editForm.preferred_courier} onChange={e => setEditForm({...editForm, preferred_courier: e.target.value})} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-[13px] bg-slate-50/50 focus:bg-white focus:outline-none focus:border-blue-500" placeholder="e.g. DTDC, Blue Dart, Delivery" />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowEditModal(false)} className="w-full sm:w-auto h-10 px-5 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors">
                  Cancel
                </button>
                <button disabled={actionLoading === "edit-profile"} type="submit" className="w-full sm:w-auto h-10 px-6 flex items-center justify-center gap-2 text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm">
                  {actionLoading === "edit-profile" ? <Loader2 size={16} className="animate-spin" /> : "Save Profile Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Sub-Customer Modal (OTP Only - Password removed) */}
      {showSubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4 sm:my-8 max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  {subForm.id ? "Edit Staff Account" : "Add Staff / Sub-Customer"}
                </h2>
                <p className="text-[12px] text-slate-500 mt-1">
                  Staff logs in via Mobile Phone + OTP. No password required.
                </p>
              </div>
              <button onClick={() => setShowSubModal(false)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-2 rounded-xl transition-colors"><X size={18}/></button>
            </div>
            <form onSubmit={handleAddSub} className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-130px)]">
              {!subForm.id && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-[12px] text-blue-800">
                  Staff member will automatically inherit the pricing tier and credit limit of <strong className="font-bold">{data.company_name}</strong>.
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Staff Name <span className="text-red-500">*</span></label>
                  <input required value={subForm.name} onChange={e=>setSubForm({...subForm, name: e.target.value})} className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow bg-slate-50/50 focus:bg-white" placeholder="Rahul Sharma" />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Phone Number (For OTP Login) <span className="text-red-500">*</span></label>
                  <input required value={subForm.phone} onChange={e=>setSubForm({...subForm, phone: e.target.value})} className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow bg-slate-50/50 focus:bg-white" placeholder="9876543210" />
                </div>
              </div>

              <div className="pt-5 border-t border-slate-100">
                <h4 className="text-[13px] font-bold text-slate-800 mb-1 uppercase tracking-wider">Feature Restrictions</h4>
                <p className="text-[11px] text-slate-500 mb-4 font-medium">Pricing is hidden from staff by default.</p>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                    <input type="checkbox" checked={subForm.allow_cart} onChange={e=>setSubForm({...subForm, allow_cart: e.target.checked})} className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                    <div>
                      <div className="text-[13px] font-bold text-slate-800">Allow Adding to Cart</div>
                      <div className="text-[11px] text-slate-500 font-medium">Can add/remove items in the cart on behalf of the shop.</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                    <input type="checkbox" checked={subForm.allow_order} onChange={e=>setSubForm({...subForm, allow_order: e.target.checked})} className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                    <div>
                      <div className="text-[13px] font-bold text-slate-800">Allow Placing Orders</div>
                      <div className="text-[11px] text-slate-500 font-medium">Can finalise and place orders directly to the company.</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                    <input type="checkbox" checked={subForm.show_quantity} onChange={e=>setSubForm({...subForm, show_quantity: e.target.checked})} className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                    <div>
                      <div className="text-[13px] font-bold text-slate-800">Allow Checking Stock Quantity</div>
                      <div className="text-[11px] text-slate-500 font-medium">Can view the live available stock quantities for products.</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 mt-2">
                <button type="button" onClick={() => setShowSubModal(false)} className="w-full sm:w-auto h-10 px-5 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors">Cancel</button>
                <button disabled={actionLoading === "sub"} type="submit" className="w-full sm:w-auto h-10 px-6 flex items-center justify-center gap-2 text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/20 rounded-xl transition-all">
                  {actionLoading === "sub" ? <Loader2 size={16} className="animate-spin" /> : (subForm.id ? "Save Changes" : "Create Staff Account")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Sub-Customer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm my-4 sm:my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
              <h2 className="text-md font-bold text-slate-900 flex items-center gap-2">Transfer Staff Account</h2>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1.5 rounded-xl transition-colors"><X size={16}/></button>
            </div>
            <form onSubmit={handleTransferSub} className="p-5 space-y-4">
              <p className="text-[12px] text-slate-600">
                Move this staff member to a different shop. They will lose access to <strong>{data.company_name}</strong> and inherit the new shop's pricing.
              </p>
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Select New Target Shop <span className="text-red-500">*</span></label>
                <select required value={transferData.newParentId} onChange={e=>setTransferData({...transferData, newParentId: e.target.value})} className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-[13px] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow bg-white cursor-pointer">
                  <option value="" disabled>-- Select a Shop to Transfer to --</option>
                  {allCustomers.map(c => (
                    <option key={c.id} value={c.id}>{c.company_name || c.name} ({c.id})</option>
                  ))}
                </select>
              </div>
              <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-2 mt-2">
                <button type="button" onClick={() => setShowTransferModal(false)} className="w-full sm:w-auto h-9 px-4 text-[12px] font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
                <button disabled={actionLoading === "transfer"} type="submit" className="w-full sm:w-auto h-9 px-4 flex items-center justify-center gap-2 text-[12px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all">
                  {actionLoading === "transfer" ? <Loader2 size={14} className="animate-spin" /> : "Transfer Now"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Limit Increase Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm my-4 sm:my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
              <h2 className="text-md font-bold text-slate-900 flex items-center gap-2">Request Limit Increase</h2>
              <button onClick={() => setShowLimitModal(false)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1.5 rounded-xl transition-colors"><X size={16}/></button>
            </div>
            <form onSubmit={handleRequestLimit} className="p-5 space-y-4">
              <div className="text-[12px] text-slate-500">Current Limit: <span className="font-bold text-slate-800">₹{(data.credit_limit || 0).toLocaleString()}</span></div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Increase Amount (₹) <span className="text-red-500">*</span></label>
                <p className="text-[11px] text-slate-400 mb-1.5">Enter how much to add to the current limit, not the new total.</p>
                <input required type="number" min="1" value={limitForm.amount} onChange={e=>setLimitForm({...limitForm, amount: e.target.value})} className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow bg-slate-50/50 focus:bg-white" placeholder="e.g. 20000" />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Reason <span className="text-red-500">*</span></label>
                <textarea required value={limitForm.reason} onChange={e=>setLimitForm({...limitForm, reason: e.target.value})} rows={3} className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow bg-slate-50/50 focus:bg-white" placeholder="Why does this customer need a higher limit?" />
              </div>
              <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-2 mt-2">
                <button type="button" onClick={() => setShowLimitModal(false)} className="w-full sm:w-auto h-9 px-4 text-[12px] font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
                <button disabled={actionLoading === "limit"} type="submit" className="w-full sm:w-auto h-9 px-4 flex items-center justify-center gap-2 text-[12px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all">
                  {actionLoading === "limit" ? <Loader2 size={14} className="animate-spin" /> : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Account Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm my-4 sm:my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
              <h2 className="text-md font-bold text-slate-900 flex items-center gap-2">Change Account Status</h2>
              <button onClick={() => setShowStatusModal(false)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1.5 rounded-xl transition-colors"><X size={16}/></button>
            </div>
            <form onSubmit={handleChangeStatus} className="p-5 space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">New Status <span className="text-red-500">*</span></label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow bg-white">
                  <option value="Hold">Hold — do not take any orders</option>
                  <option value="Short">Short — only high-value items</option>
                  <option value="Cash">Cash — pay first, then goods</option>
                  <option value="Credit">Credit — normal, up to limit</option>
                  <option value="Review">Review — staff decides manually</option>
                </select>
                {newStatus === "Cash" && (
                  <p className="text-[11px] text-amber-600 mt-1.5">Switching to Cash will reset this customer's Payment Term to "Cash" and Credit Limit to ₹0.</p>
                )}
              </div>
              <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-2 mt-2">
                <button type="button" onClick={() => setShowStatusModal(false)} className="w-full sm:w-auto h-9 px-4 text-[12px] font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
                <button disabled={actionLoading === "status"} type="submit" className="w-full sm:w-auto h-9 px-4 flex items-center justify-center gap-2 text-[12px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all">
                  {actionLoading === "status" ? <Loader2 size={14} className="animate-spin" /> : "Update Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve Credit Limit Request Modal */}
      {showApproveLimitModal && selectedLimitRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm my-4 sm:my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
              <h2 className="text-md font-bold text-slate-900 flex items-center gap-2">Approve Credit Limit</h2>
              <button onClick={() => setShowApproveLimitModal(false)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1.5 rounded-xl transition-colors"><X size={16}/></button>
            </div>
            <form onSubmit={handleApproveLimitRequest} className="p-5 space-y-4">
              <div>
                <div className="text-[12px] text-slate-500">Current Limit: ₹{(data.credit_limit ?? selectedLimitRequest.current_limit)?.toLocaleString()}</div>
                <div className="text-[12px] text-blue-600 font-medium mt-0.5">Customer requested an increase of ₹{selectedLimitRequest.requested_amount?.toLocaleString()}</div>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Approve Increase Amount (₹) <span className="text-red-500">*</span></label>
                <input required type="number" min="1" value={approveLimitAmount} onChange={e=>setApproveLimitAmount(e.target.value)} className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-[13px] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-shadow bg-slate-50/50 focus:bg-white" />
                <p className="text-[11px] text-slate-500 mt-2">
                  New Credit Limit will be: <span className="font-bold text-emerald-700">₹{((data.credit_limit ?? selectedLimitRequest.current_limit ?? 0) + (parseFloat(approveLimitAmount) || 0)).toLocaleString()}</span>
                </p>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Remarks (Optional)</label>
                <input value={approveLimitRemarks} onChange={e=>setApproveLimitRemarks(e.target.value)} placeholder="E.g. Approved for festive season" className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-[13px] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-shadow bg-slate-50/50 focus:bg-white" />
              </div>
              <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-2 mt-2">
                <button type="button" onClick={() => setShowApproveLimitModal(false)} className="w-full sm:w-auto h-9 px-4 text-[12px] font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
                <button disabled={actionLoading === "approve-limit"} type="submit" className="w-full sm:w-auto h-9 px-4 flex items-center justify-center gap-2 text-[12px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all">
                  {actionLoading === "approve-limit" ? <Loader2 size={14} className="animate-spin" /> : "Confirm Approval"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDialog}
    </div>
  );
}
