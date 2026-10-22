import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Search, ShoppingCart, User, AlertTriangle, CheckCircle2, Trash2, Zap } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { customerService } from "@/services/customerService";
import { productApi } from "@/services/productApi";
import { courierService } from "@/services/courierService";
import { settingsService } from "@/services/settingsService";
import { orderApi } from "@/services/orderApi";
import { notify } from "@/lib/notify";
import "@/styles/veriwide.css";

export function CreateOrder() {
  const navigate = useNavigate();

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerOptions, setCustomerOptions] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [rx, setRx] = useState({ sph: "", cyl: "", axis: "", add: "" });
  const [lensResults, setLensResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [qtyByProduct, setQtyByProduct] = useState({});

  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState("parcel");
  const [isUrgent, setIsUrgent] = useState(false);
  const [deliveryPartner, setDeliveryPartner] = useState("DTDC");
  const [couriers, setCouriers] = useState([]);
  const [paymentMode, setPaymentMode] = useState("Credit");
  const [platformSettings, setPlatformSettings] = useState(null);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    courierService.getCouriers().then(res => setCouriers(res?.data || [])).catch(() => setCouriers([]));
    settingsService.getPlatformSettings().then(res => setPlatformSettings(res?.data || null)).catch(() => setPlatformSettings(null));
    customerService.getCustomers({ is_active: true, approval_status: "APPROVED", limit: 30 })
      .then(res => setCustomerOptions(res?.data?.list || []))
      .catch(() => setCustomerOptions([]));
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      customerService.getCustomers({ search: customerSearch, is_active: true, approval_status: "APPROVED", limit: 30 })
        .then(res => setCustomerOptions(res?.data?.list || []))
        .catch(() => setCustomerOptions([]));
    }, 300);
    return () => clearTimeout(handle);
  }, [customerSearch]);

  const selectCustomer = async (id) => {
    setSelectedCustomerId(id);
    if (!id) { setSelectedCustomer(null); return; }
    try {
      const res = await customerService.getCustomerById(id);
      setSelectedCustomer(res?.data || null);
      if (res?.data?.preferred_courier) setDeliveryPartner(res.data.preferred_courier);
    } catch (err) {
      notify.error(err.message || "Could not load customer details");
      setSelectedCustomer(null);
    }
  };

  const handleSearchLens = async () => {
    if (!rx.sph) {
      notify.warning("Enter at least SPH to search.");
      return;
    }
    setSearching(true);
    try {
      const res = await productApi.findMyLens({ sph: rx.sph, cyl: rx.cyl, axis: rx.axis, add: rx.add });
      setLensResults(res?.data || []);
    } catch (err) {
      notify.error(err.message || "Lens search failed");
      setLensResults([]);
    } finally {
      setSearching(false);
    }
  };

  const addToCart = (lens) => {
    const qty = Number(qtyByProduct[lens.product_id] || 1);
    if (qty <= 0) return;
    setCart(prev => [...prev, {
      key: `${lens.product_id}-${Date.now()}`,
      product_id: lens.product_id,
      brand: lens.brand,
      lens_type: lens.lens_type,
      product_code: lens.product_code,
      sph: Number(rx.sph),
      cyl: rx.cyl === "" ? null : Number(rx.cyl),
      axis: rx.axis === "" ? null : Number(rx.axis),
      add: rx.add === "" ? null : Number(rx.add),
      qty,
      unitPrice: Number(lens.min_selling_price) || 0,
    }]);
  };

  const removeFromCart = (key) => setCart(prev => prev.filter(c => c.key !== key));
  const updateCartPrice = (key, price) => setCart(prev => prev.map(c => c.key === key ? { ...c, unitPrice: Number(price) || 0 } : c));
  const updateCartQty = (key, qty) => setCart(prev => prev.map(c => c.key === key ? { ...c, qty: Math.max(1, Number(qty) || 1) } : c));

  const subtotal = useMemo(() => cart.reduce((s, c) => s + c.qty * c.unitPrice, 0), [cart]);
  const gstRate = selectedCustomer?.negotiated_gst_rate || 5;
  const gstAmount = +(subtotal * gstRate / 100).toFixed(2);
  const urgentSurcharge = isUrgent ? (platformSettings?.urgent_delivery_charge ?? 100) : 0;
  // Cartage packaging charge is applied during dispatch based on actual cartons
  const cartageCharge = 0;
  const totalAmount = subtotal + gstAmount + urgentSurcharge;

  const usedBalance = selectedCustomer?.used_balance || 0;
  const creditLimit = selectedCustomer?.credit_limit ?? 0;
  const availableBalance = selectedCustomer?.current_balance ?? Math.max(0, creditLimit - usedBalance);
  const isBlocked = !!selectedCustomer && (usedBalance + totalAmount > creditLimit);

  const handlePlaceOrder = async () => {
    if (!selectedCustomer) return notify.warning("Select a customer first.");
    if (cart.length === 0) return notify.warning("Cart is empty.");
    setPlacing(true);
    try {
      const res = await orderApi.createOrder({
        customerId: selectedCustomer._id,
        items: cart.map(c => ({
          product_id: c.product_id, sph: c.sph, cyl: c.cyl, axis: c.axis, add: c.add,
          quantity: c.qty, unit_price: c.unitPrice
        })),
        orderType,
        deliveryPartner,
        paymentMode,
        isUrgentDelivery: isUrgent
      });
      notify.success(`Order ${res?.data?.order_number || ""} placed successfully`);
      navigate({ to: `/orders/${res?.data?._id}` });
    } catch (err) {
      notify.error(err.message || "Could not place order");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 mb-6 mt-2">
        <Link to="/orders" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-slate-600">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create New Order</h1>
          <p className="text-[13px] text-slate-500 mt-1">Find My Lens & Smart Cart System</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
        {/* Left Column: Customer + Find My Lens */}
        <div className="flex flex-col gap-6">
          <div className="vw-card p-5">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><User size={16} className="text-blue-600" /> Select Customer</h3>
            <input
              type="text"
              placeholder="Search by name, company, or phone..."
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
              className="w-full h-10 px-3 mb-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500"
            />
            <select
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500"
              value={selectedCustomerId}
              onChange={(e) => selectCustomer(e.target.value)}
            >
              <option value="">-- Choose a Customer / Shop --</option>
              {customerOptions.map(c => (
                <option key={c._id} value={c._id}>{c.company_name || c.name} ({c.city || "—"})</option>
              ))}
            </select>
            {selectedCustomer && (
              <div className="mt-3 flex justify-between text-[12px] text-slate-500 bg-slate-50 p-2 rounded-lg">
                <span>Credit Limit: <strong className="text-slate-700">₹{creditLimit.toLocaleString("en-IN")}</strong></span>
                <span>Outstanding: <strong className="text-slate-700">₹{usedBalance.toLocaleString("en-IN")}</strong></span>
                <span>Available: <strong className={availableBalance < 0 ? "text-rose-600" : "text-emerald-600"}>₹{availableBalance.toLocaleString("en-IN")}</strong></span>
              </div>
            )}
          </div>

          <div className="vw-card p-5 border-t-4 border-t-purple-500">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><Search size={16} className="text-purple-600" /> Find My Lens (Prescription)</h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">SPH</label>
                <input type="text" placeholder="-1.50" value={rx.sph} onChange={e => setRx({ ...rx, sph: e.target.value })} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">CYL</label>
                <input type="text" placeholder="-0.50" value={rx.cyl} onChange={e => setRx({ ...rx, cyl: e.target.value })} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">AXIS</label>
                <input type="text" placeholder="90" value={rx.axis} onChange={e => setRx({ ...rx, axis: e.target.value })} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">ADD</label>
                <input type="text" placeholder="+2.00" value={rx.add} onChange={e => setRx({ ...rx, add: e.target.value })} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-mono" />
              </div>
            </div>

            <button onClick={handleSearchLens} disabled={searching} className="vw-btn-primary w-full h-10 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 border-purple-700 disabled:opacity-60">
              <Search size={16} /> {searching ? "Searching…" : "Search Lenses"}
            </button>

            {lensResults.length > 0 && (
              <div className="mt-4 flex flex-col gap-2 max-h-[320px] overflow-y-auto">
                {lensResults.map(lens => (
                  <div key={lens.product_id} className="flex items-center justify-between gap-2 p-2.5 border border-slate-200 rounded-lg bg-slate-50/50">
                    <div className="min-w-0">
                      <div className="font-bold text-[13px] text-slate-800 truncate">{lens.brand} — {lens.product_code}</div>
                      <div className="text-[11px] text-slate-500">{lens.lens_type} • {lens.coating} • Index {lens.index}</div>
                      <div className="text-[11px] font-mono text-slate-400">₹{lens.min_selling_price}/pc • Stock: {lens.matched_power?.total_quantity ?? 0}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min="1"
                        value={qtyByProduct[lens.product_id] || 1}
                        onChange={e => setQtyByProduct(prev => ({ ...prev, [lens.product_id]: e.target.value }))}
                        className="w-14 h-9 px-2 bg-white border border-slate-200 rounded text-[12px] text-center"
                      />
                      <button onClick={() => addToCart(lens)} className="vw-btn-primary h-9 px-3 text-[12px]">Add</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {lensResults.length === 0 && !searching && (
              <p className="text-[12px] text-slate-400 mt-3 text-center">No search yet — enter a power and search.</p>
            )}
          </div>
        </div>

        {/* Right Column: Smart Cart */}
        <div className="vw-card p-0 overflow-hidden flex flex-col h-full min-h-[500px]">
          <div className="p-4 bg-slate-50 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><ShoppingCart size={16} className="text-blue-600" /> Smart Cart</h3>
          </div>

          <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto bg-slate-50/30">
            {cart.length === 0 ? (
              <div className="text-center text-slate-400 text-[13px] py-10">Cart is empty.<br />Search a lens to add.</div>
            ) : (
              cart.map((item) => (
                <div key={item.key} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-slate-800 text-[13px]">{item.brand} ({item.lens_type})</div>
                      <div className="text-[11px] font-mono text-slate-500 mt-1 bg-slate-100 inline-block px-1.5 py-0.5 rounded">
                        SPH {item.sph}{item.cyl ? ` CYL ${item.cyl}` : ""}{item.axis ? ` AXIS ${item.axis}` : ""}{item.add ? ` ADD ${item.add}` : ""}
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(item.key)} className="text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
                  </div>
                  <div className="flex justify-between items-center mt-3 border-t border-slate-50 pt-2 gap-2">
                    <div className="flex items-center gap-1.5 text-[12px] font-medium text-slate-600">
                      Qty:
                      <input type="number" min="1" value={item.qty} onChange={e => updateCartQty(item.key, e.target.value)} className="w-12 h-7 px-1 border border-slate-200 rounded text-center text-[12px]" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] text-slate-400">₹</span>
                      <input type="number" value={item.unitPrice} onChange={e => updateCartPrice(item.key, e.target.value)} className="w-20 h-7 px-1 border border-slate-200 rounded text-right text-[12px] font-bold text-blue-700" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-white border-t border-slate-200 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="parcel">Parcel</SelectItem>
                  <SelectItem value="stock">Stock (Bulk)</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="rx">RX</SelectItem>
                </SelectContent>
              </Select>
              <Select value={deliveryPartner} onValueChange={setDeliveryPartner}>
                <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {couriers.map(c => <SelectItem key={c._id} value={c.name}>{c.name}</SelectItem>)}
                  {!couriers.some(c => c.name === deliveryPartner) && <SelectItem value={deliveryPartner}>{deliveryPartner}</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <Select value={paymentMode} onValueChange={setPaymentMode}>
              <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Credit">Credit (Khata)</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="NEFT">NEFT</SelectItem>
                <SelectItem value="RTGS">RTGS</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={() => setIsUrgent(!isUrgent)}
              className={`h-9 rounded-lg text-[12px] font-bold flex items-center justify-center gap-1.5 border transition-colors ${isUrgent ? "bg-rose-500 text-white border-rose-600" : "bg-white text-slate-600 border-slate-200"}`}
            >
              <Zap size={14} className={isUrgent ? "text-yellow-300 fill-yellow-300" : "text-rose-500"} /> Urgent Delivery {isUrgent ? `(+₹${platformSettings?.urgent_delivery_charge ?? 100})` : ""}
            </button>

            <div className="border-t border-slate-100 pt-3 flex flex-col gap-1.5">
              <div className="flex justify-between text-[13px] text-slate-500">
                <span>Subtotal</span>
                <span className="font-bold text-slate-700">₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-[13px] text-slate-500">
                <span>GST ({gstRate}%)</span>
                <span className="font-bold text-slate-700">₹{gstAmount.toLocaleString("en-IN")}</span>
              </div>
              {urgentSurcharge > 0 && (
                <div className="flex justify-between text-[13px] text-rose-500">
                  <span>Urgent Surcharge</span>
                  <span className="font-bold">+₹{urgentSurcharge}</span>
                </div>
              )}
              {cartageCharge > 0 && (
                <div className="flex justify-between text-[13px] text-slate-500">
                  <span>Cartage Charge</span>
                  <span className="font-bold text-slate-700">+₹{cartageCharge}</span>
                </div>
              )}
              <div className="flex justify-between items-center mt-1">
                <span className="font-bold text-slate-800">Total Amount</span>
                <span className="font-bold text-blue-700 text-[18px]">₹{totalAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {isBlocked ? (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-rose-700 text-[12px] flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <strong>Order Blocked!</strong>
                  <div className="mt-0.5 opacity-90">This order exceeds the customer's available credit limit.</div>
                </div>
              </div>
            ) : null}

            <button
              onClick={handlePlaceOrder}
              disabled={isBlocked || cart.length === 0 || !selectedCustomer || placing}
              className="vw-btn-primary w-full h-12 flex items-center justify-center gap-2 text-[14px] disabled:opacity-60"
            >
              <CheckCircle2 size={18} /> {placing ? "Placing Order…" : "Place Order"}
            </button>
          </div>
        </div>

      </div>
    </>
  );
}
