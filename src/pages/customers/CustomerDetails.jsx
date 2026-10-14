import { useState, useEffect } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { 
  ArrowLeft, Edit, Trash2, ShieldCheck, MonitorSmartphone, 
  ShoppingCart, Package, Plus, Loader2, CreditCard,
  TrendingUp, MapPin, Phone, Mail, Building, Clock, X, Power, PowerOff, ArrowRightLeft
} from "lucide-react";
import { customerService } from "@/services/customerService";
import { StatusPill } from "@/components/common/StatusPill";
import { notify } from "@/lib/notify";
import { hasPermission } from "@/lib/permissions";
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

export function CustomerDetails() {
  const { id } = useParams({ strict: false });
  const [data, setData] = useState(null);
  const [allCustomers, setAllCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [showSubModal, setShowSubModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferData, setTransferData] = useState({ subId: null, newParentId: "" });

  const [subForm, setSubForm] = useState({ id: null, name: "", phone: "", email: "", password: "", allow_cart: true, allow_order: false, show_quantity: true, parent_customer_id: "" });

  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitForm, setLimitForm] = useState({ amount: "", reason: "" });

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("Credit");

  const [orderVolume, setOrderVolume] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [cartItems, setCartItems] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await customerService.getCustomerById(id);
      const subRes = await customerService.getSubCustomers(id);
      setData({
        ...res.data,
        id: res.data._id,
        sub_customers: (subRes.data || []).map(s => ({ ...s, id: s._id })),
      });
      const allRes = await customerService.getCustomers({ approval_status: "APPROVED", limit: 500 });
      setAllCustomers(allRes.data.list
        .map(c => ({ ...c, id: c._id }))
        .filter(c => c.id !== id && c.is_active));

      const [volumeRes, ordersRes, cartRes] = await Promise.all([
        customerService.getOrderVolume(id),
        customerService.getRecentOrders(id),
        customerService.getCart(id),
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

  const handleResetDevice = async (platform) => {
    const label = platform === "web" ? "web" : "app";
    if (!confirm(`Are you sure you want to reset the ${label} login device for this account?`)) return;
    setActionLoading(`device-${platform}`);
    try {
      await customerService.resetDevice(id, platform);
      notify.success(`${label === "web" ? "Web" : "App"} device reset successfully. Customer can now log in from a new device.`);
      await fetchData();
    } catch (err) {
      notify.error(err.message || "Failed to reset device.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenLimitModal = () => {
    setLimitForm({ amount: "", reason: "" });
    setShowLimitModal(true);
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
        // Edit mode: name/phone/password via one endpoint, permissions via another
        await customerService.updateSubCustomer(subForm.id, {
          name: subForm.name,
          phone: subForm.phone,
          ...(subForm.password ? { password: subForm.password } : {}),
        });
        await customerService.updateSubCustomerPermissions(subForm.id, permissions);
        notify.success("Sub-customer updated successfully!");
      } else {
        // Create mode
        await customerService.createSubCustomer(id, {
          name: subForm.name,
          phone: subForm.phone,
          password: subForm.password,
          ...permissions,
        });
        notify.success("Sub-customer added successfully!");
      }
      setShowSubModal(false);
      setSubForm({ id: null, name: "", phone: "", email: "", password: "", allow_cart: true, allow_order: false, show_quantity: true, parent_customer_id: "" });
      await fetchData();
    } catch (err) {
      console.error(err);
      notify.error(err.message || "Error adding/updating sub-customer");
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
      password: "",
      allow_cart: sub.subcustomer_permissions?.allow_cart ?? true,
      allow_order: sub.subcustomer_permissions?.allow_order ?? false,
      show_quantity: sub.subcustomer_permissions?.show_quantity ?? true,
      parent_customer_id: id // current customer id
    });
    setShowSubModal(true);
  };

  const handleToggleSubStatus = async (sub) => {
    if (!confirm("Are you sure you want to change the status of this sub-customer?")) return;
    try {
      await customerService.updateSubCustomer(sub.id, { is_active: !sub.is_active });
      await fetchData();
    } catch (err) {
      notify.error(err.message || "Failed to change status.");
    }
  };

  const handleTransferSub = async (e) => {
    e.preventDefault();
    if (!transferData.newParentId) return notify.warning("Please select a target shop/customer.");
    
    const targetCustomer = allCustomers.find(c => c.id === transferData.newParentId);
    if (!confirm(`Are you sure you want to permanently transfer this staff member to "${targetCustomer?.company_name || 'the selected shop'}"?`)) {
      return;
    }
    
    setActionLoading("transfer");
    try {
      await customerService.updateSubCustomer(transferData.subId, { parent_customer_id: transferData.newParentId });
      notify.success("Staff member successfully transferred to new shop!");
      setShowTransferModal(false);
      await fetchData();
    } catch (err) {
      notify.error(err.message || "Failed to transfer staff.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this customer? This action cannot be undone.")) {
      notify.success("Customer deleted.");
    }
  };

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p>Loading customer profile...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-12 animate-in fade-in duration-300">
      
      {/* 1. Header & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/customers" className="p-2 rounded-xl bg-white border border-border hover:bg-accent text-muted-foreground transition-all shadow-sm">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Customer Profile</h1>
            <p className="text-[13px] text-muted-foreground">Manage details, staff, and account limits.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasPermission("EDIT_CUSTOMER") && (
            <button className="vw-btn-secondary h-9 px-4 text-[13px] flex items-center gap-2 bg-white shadow-sm"><Edit size={14}/> Edit Profile</button>
          )}
          {hasPermission("DELETE_CUSTOMER") && (
            <button onClick={handleDelete} className="vw-btn-secondary h-9 px-4 text-[13px] text-destructive hover:bg-destructive/10 hover:border-destructive/30 flex items-center gap-2 bg-white shadow-sm transition-colors"><Trash2 size={14}/> Delete</button>
          )}
        </div>
      </div>

      {/* 2. Hero Identity Banner */}
      <div className="bg-white rounded-2xl p-6 border border-border shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        {/* Left Side: Avatar & Core ID */}
        <div className="flex items-center gap-5 z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-blue-500/20">
            {(data.company_name || data.company || data.name || "U")[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{data.company_name || data.company || "Unknown Company"}</h2>
              <StatusPill status={data.approval_status === "APPROVED" ? (data.is_active ? "active" : "frozen") : "pending_approval"} />
            </div>
            <div className="flex items-center gap-4 text-[13px] font-medium text-slate-500">
              <span className="flex items-center gap-1.5"><Building size={14}/> {data.id}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span className="flex items-center gap-1.5"><Clock size={14}/> Joined {data.created_at}</span>
            </div>
          </div>
        </div>
        
        {/* Right Side: Quick Contact & Limit */}
        <div className="flex items-center gap-6 z-10 bg-slate-50 p-4 rounded-xl border border-slate-100 w-full md:w-auto">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[13px] text-slate-600"><Phone size={14} className="text-slate-400"/> {data.phone}</div>
            <div className="flex items-center gap-2 text-[13px] text-slate-600"><Mail size={14} className="text-slate-400"/> {data.email || "No Email Provided"}</div>
          </div>
          <div className="h-10 w-px bg-slate-200 hidden sm:block"></div>
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Credit Limit</span>
            <span className="text-lg font-bold text-slate-800">₹{data.credit_limit?.toLocaleString() || "0"}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Deep Details (Span 4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Business & Location Card */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-5">
            <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><MapPin size={14}/> Location & KYC</h3>
            
            <div className="space-y-4 text-[13px]">
              <div>
                <span className="text-slate-500 block text-[11px] uppercase mb-1">Owner Name</span>
                <span className="font-semibold text-slate-800">{data.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] uppercase mb-1">Full Address</span>
                <span className="font-medium text-slate-700 leading-relaxed block">{data.address || "Address not provided."}<br/>{data.city}, {data.state || "India"} - {data.pincode}</span>
              </div>
              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 block text-[11px] uppercase mb-1">GST Number</span>
                  <span className="font-semibold text-slate-800">{data.gst_no || "Unregistered"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] uppercase mb-1">PAN Number</span>
                  <span className="font-semibold text-slate-800">{data.pan_number || "N/A"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Account Preferences Card */}
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><CreditCard size={14}/> Account Settings</h3>
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

          {/* Device Management Card */}
          <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-amber-100 bg-amber-50/30">
              <h3 className="text-[12px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-2"><MonitorSmartphone size={14}/> Device Security</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">App Device</p>
                <p className="text-[13px] font-medium text-slate-800 mb-2">{data.device_id || "Not logged in yet"}</p>
                <button onClick={() => handleResetDevice("app")} disabled={!data.device_id || actionLoading === "device-app"} className="w-full h-8 flex items-center justify-center gap-2 text-[12px] font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors">
                  {actionLoading === "device-app" ? <Loader2 size={14} className="animate-spin" /> : "Reset App Device"}
                </button>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Web Device</p>
                <p className="text-[13px] font-medium text-slate-800 mb-2">{data.web_device_id || "Not logged in yet"}</p>
                <button onClick={() => handleResetDevice("web")} disabled={!data.web_device_id || actionLoading === "device-web"} className="w-full h-8 flex items-center justify-center gap-2 text-[12px] font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors">
                  {actionLoading === "device-web" ? <Loader2 size={14} className="animate-spin" /> : "Reset Web Device"}
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

          {/* Sub Customers Table */}
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border bg-slate-50/50">
              <div>
                <h3 className="text-[14px] font-bold text-slate-800 flex items-center gap-2"><ShieldCheck size={16} className="text-indigo-600"/> Staff & Sub-Customers</h3>
                <p className="text-[12px] text-slate-500 mt-0.5">Manage permissions for shop employees.</p>
              </div>
              <button onClick={() => {
                setSubForm({ id: null, name: "", phone: "", email: "", password: "", permissions: { allow_cart: true, allow_order: false, allow_stock: true }, parent_customer_id: "" });
                setShowSubModal(true);
              }} className="vw-btn-primary h-9 px-4 text-[13px] flex items-center gap-2 shadow-sm"><Plus size={16}/> Add Staff</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
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
                        <div className="text-[11px] text-slate-400 mt-0.5">{sub.id}</div>
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

      {/* Add Sub-Customer Modal */}
      {showSubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">{subForm.id ? "Edit Staff Account" : "Add Staff / Sub-Customer"}</h2>
                <p className="text-[12px] text-slate-500 mt-1">{subForm.id ? "Update details, permissions, or transfer account." : "Create a new login for the shop's employee."}</p>
              </div>
              <button onClick={() => setShowSubModal(false)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-2 rounded-xl transition-colors"><X size={18}/></button>
            </div>
            <form onSubmit={handleAddSub} className="p-6 space-y-5">
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                    <input required value={subForm.phone} onChange={e=>setSubForm({...subForm, phone: e.target.value})} className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow bg-slate-50/50 focus:bg-white" placeholder="9876543210" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Email Address</label>
                    <input value={subForm.email} onChange={e=>setSubForm({...subForm, email: e.target.value})} className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow bg-slate-50/50 focus:bg-white" placeholder="Optional" />
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Login Password {subForm.id ? "" : <span className="text-red-500">*</span>}</label>
                  <input required={!subForm.id} type="password" value={subForm.password} onChange={e=>setSubForm({...subForm, password: e.target.value})} className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow bg-slate-50/50 focus:bg-white" placeholder={subForm.id ? "Leave empty to keep unchanged" : "Create a secure password"} />
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

              <div className="pt-4 flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setShowSubModal(false)} className="h-10 px-5 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors">Cancel</button>
                <button disabled={actionLoading === "sub"} type="submit" className="h-10 px-6 flex items-center gap-2 text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/20 rounded-xl transition-all">
                  {actionLoading === "sub" ? <Loader2 size={16} className="animate-spin" /> : (subForm.id ? "Save Changes" : "Create Staff Account")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Transfer Sub-Customer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
              <div className="pt-2 flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setShowTransferModal(false)} className="h-9 px-4 text-[12px] font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
                <button disabled={actionLoading === "transfer"} type="submit" className="h-9 px-4 flex items-center gap-2 text-[12px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all">
                  {actionLoading === "transfer" ? <Loader2 size={14} className="animate-spin" /> : "Transfer Now"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Request Limit Increase Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
              <h2 className="text-md font-bold text-slate-900 flex items-center gap-2">Request Limit Increase</h2>
              <button onClick={() => setShowLimitModal(false)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1.5 rounded-xl transition-colors"><X size={16}/></button>
            </div>
            <form onSubmit={handleRequestLimit} className="p-5 space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Requested Amount (₹) <span className="text-red-500">*</span></label>
                <input required type="number" min="1" value={limitForm.amount} onChange={e=>setLimitForm({...limitForm, amount: e.target.value})} className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow bg-slate-50/50 focus:bg-white" placeholder="e.g. 100000" />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Reason <span className="text-red-500">*</span></label>
                <textarea required value={limitForm.reason} onChange={e=>setLimitForm({...limitForm, reason: e.target.value})} rows={3} className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow bg-slate-50/50 focus:bg-white" placeholder="Why does this customer need a higher limit?" />
              </div>
              <div className="pt-2 flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setShowLimitModal(false)} className="h-9 px-4 text-[12px] font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
                <button disabled={actionLoading === "limit"} type="submit" className="h-9 px-4 flex items-center gap-2 text-[12px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all">
                  {actionLoading === "limit" ? <Loader2 size={14} className="animate-spin" /> : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Change Account Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
              <div className="pt-2 flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setShowStatusModal(false)} className="h-9 px-4 text-[12px] font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
                <button disabled={actionLoading === "status"} type="submit" className="h-9 px-4 flex items-center gap-2 text-[12px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all">
                  {actionLoading === "status" ? <Loader2 size={14} className="animate-spin" /> : "Update Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
