import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Search, Plus, ShoppingCart, User, AlertTriangle, CheckCircle2 } from "lucide-react";
import "@/styles/veriwide.css";

export function CreateOrder() {
  const [customer, setCustomer] = useState("");
  const [rx, setRx] = useState({ sph: "", cyl: "", axis: "", add: "" });
  const [cart, setCart] = useState([]);

  // Mock Credit Limit check
  const totalAmount = cart.reduce((acc, item) => acc + item.total, 0);
  const creditLimit = 5000;
  const isBlocked = totalAmount > creditLimit;

  const handleAddToCart = () => {
    if(!customer || !rx.sph) return;
    setCart([...cart, { 
      id: Date.now(), 
      name: "VisionPlus Progressive ARC", 
      power: `SPH ${rx.sph} | CYL ${rx.cyl || '0.00'}`, 
      qty: 1, 
      unitPrice: 1200, 
      total: 1200 
    }]);
    setRx({ sph: "", cyl: "", axis: "", add: "" });
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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6 items-start">
        {/* Left Column: Find My Lens */}
        <div className="flex flex-col gap-6">
          <div className="vw-card p-5">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><User size={16} className="text-blue-600"/> Select Customer</h3>
            <select 
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
            >
              <option value="">-- Choose a Customer / Shop --</option>
              <option value="CUST-001">Vishal Optical Co. (Tier: Stock A+)</option>
              <option value="CUST-002">Sunshine Eyewear (Tier: Courier)</option>
            </select>
          </div>

          <div className="vw-card p-5 border-t-4 border-t-purple-500">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><Search size={16} className="text-purple-600"/> Find My Lens (Prescription)</h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">SPH</label>
                <input type="text" placeholder="-1.50" value={rx.sph} onChange={e => setRx({...rx, sph: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">CYL</label>
                <input type="text" placeholder="-0.50" value={rx.cyl} onChange={e => setRx({...rx, cyl: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">AXIS</label>
                <input type="text" placeholder="90" value={rx.axis} onChange={e => setRx({...rx, axis: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">ADD</label>
                <input type="text" placeholder="+2.00" value={rx.add} onChange={e => setRx({...rx, add: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-mono" />
              </div>
            </div>

            <button onClick={handleAddToCart} className="vw-btn-primary w-full h-10 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 border-purple-700">
              <Search size={16} /> Search & Add To Cart
            </button>
          </div>
        </div>

        {/* Right Column: Smart Cart */}
        <div className="vw-card p-0 overflow-hidden flex flex-col h-full min-h-[400px]">
          <div className="p-4 bg-slate-50 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><ShoppingCart size={16} className="text-blue-600"/> Smart Cart</h3>
          </div>
          
          <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto bg-slate-50/30">
            {cart.length === 0 ? (
              <div className="text-center text-slate-400 text-[13px] py-10">Cart is empty.<br/>Search a lens to add.</div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                  <div className="font-bold text-slate-800 text-[13px]">{item.name}</div>
                  <div className="text-[11px] font-mono text-slate-500 mt-1 bg-slate-100 inline-block px-1.5 py-0.5 rounded">{item.power}</div>
                  <div className="flex justify-between items-center mt-3 border-t border-slate-50 pt-2">
                    <span className="text-[12px] font-medium text-slate-600">Qty: {item.qty}</span>
                    <span className="font-bold text-blue-700">₹{item.total}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-white border-t border-slate-200">
            <div className="flex justify-between text-[13px] text-slate-500 mb-2">
              <span>Subtotal</span>
              <span className="font-bold text-slate-700">₹{totalAmount}</span>
            </div>
            <div className="flex justify-between text-[13px] text-slate-500 mb-4">
              <span>GST (5%)</span>
              <span className="font-bold text-slate-700">₹{(totalAmount * 0.05).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center mb-6">
              <span className="font-bold text-slate-800">Total Amount</span>
              <span className="font-bold text-blue-700 text-[18px]">₹{(totalAmount * 1.05).toFixed(2)}</span>
            </div>

            {isBlocked ? (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-rose-700 text-[12px] flex items-start gap-2 mb-4">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <strong>Order Blocked!</strong>
                  <div className="mt-0.5 opacity-90">This order exceeds the customer's available credit limit (₹{creditLimit}).</div>
                </div>
              </div>
            ) : null}

            <button disabled={isBlocked || cart.length === 0} className="vw-btn-primary w-full h-12 flex items-center justify-center gap-2 text-[14px]">
              <CheckCircle2 size={18} /> Place Order
            </button>
            {isBlocked && (
              <button className="w-full mt-2 text-[12px] font-bold text-blue-600 hover:underline">Request Limit Increase</button>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
