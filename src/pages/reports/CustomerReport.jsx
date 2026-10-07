import { useState } from "react";
import { ArrowLeft, Edit, TrendingUp, IndianRupee, CreditCard, ShoppingBag, Eye, Settings, Download } from "lucide-react";
import { Link, useParams } from "@tanstack/react-router";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import "@/styles/veriwide.css";

const MOCK_CUSTOMERS = {
  "CUST-001": { name: "Sunshine Eyewear", city: "Mumbai", limit: 50000, due: 62000, totalOrders: 142, revenue: 850000, profit: 125000 },
  "CUST-002": { name: "Vision Plus", city: "Delhi", limit: 50000, due: 45000, totalOrders: 98, revenue: 420000, profit: 68000 },
  "CUST-003": { name: "Clear Optics", city: "Pune", limit: 20000, due: 12500, totalOrders: 210, revenue: 1280000, profit: 240000 },
  "CUST-004": { name: "Rajat Vision", city: "Delhi", limit: 30000, due: 0, totalOrders: 45, revenue: 115000, profit: 21000 },
};

const PRODUCT_WISE_DATA = [
  { name: "CR-39 Hard Coat", orders: 450, revenue: 225000 },
  { name: "Blue Cut Lenses", orders: 380, revenue: 304000 },
  { name: "Kryptok Bifocal", orders: 120, revenue: 84000 },
  { name: "Progressive HD", orders: 85, revenue: 170000 },
];

export function CustomerReport() {
  const { customerId } = useParams({ from: '/_admin/reports/$customerId' });
  const customer = MOCK_CUSTOMERS[customerId] || MOCK_CUSTOMERS["CUST-001"];

  const [limitModal, setLimitModal] = useState(false);
  const [newLimit, setNewLimit] = useState(customer.limit);
  
  const [pricingModal, setPricingModal] = useState(false);

  const handleUpdateLimit = (e) => {
    e.preventDefault();
    alert(`Credit Limit for ${customer.name} updated to ₹${newLimit}`);
    setLimitModal(false);
  }

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
          <button onClick={() => setPricingModal(true)} className="flex-1 sm:flex-none vw-btn-secondary h-10 px-4 flex items-center justify-center gap-2">
            <Settings size={16} /> Set Custom Pricing
          </button>
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
            ₹{customer.revenue.toLocaleString()} <IndianRupee size={18} className="text-emerald-500" />
          </h2>
        </div>
        <div className="vw-card p-5 border-l-4 border-l-purple-500">
          <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Net Profit / Margin</p>
          <h2 className="text-2xl font-black text-slate-900 mt-2 flex items-center gap-2">
            ₹{customer.profit.toLocaleString()} <TrendingUp size={18} className="text-purple-500" />
          </h2>
          <p className="text-[11px] text-purple-600 font-bold mt-1">{Math.round((customer.profit/customer.revenue)*100)}% Profit Margin</p>
        </div>
        <div className="vw-card p-5 border-l-4 border-l-rose-500">
          <div className="flex justify-between items-start">
            <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Credit Limit / Due</p>
            <button onClick={() => setLimitModal(true)} className="text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors" title="Update Credit Limit">
              <Edit size={14} />
            </button>
          </div>
          <h2 className={`text-xl font-black mt-2 ${customer.due > customer.limit ? 'text-rose-600' : 'text-slate-900'}`}>
            ₹{customer.due.toLocaleString()} <span className="text-[14px] text-slate-400 font-medium">/ ₹{customer.limit.toLocaleString()}</span>
          </h2>
          {customer.due > customer.limit && (
            <p className="text-[11px] text-rose-600 font-bold mt-1">Limit Exceeded by ₹{(customer.due - customer.limit).toLocaleString()}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Product wise data chart */}
        <div className="vw-card p-5">
          <h3 className="text-[14px] font-bold text-slate-800 uppercase tracking-wider mb-6">Product-wise Revenue for this Customer</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={PRODUCT_WISE_DATA} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={val => `₹${val/1000}k`} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }} width={100} />
                <Tooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24}>
                  {PRODUCT_WISE_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#2563eb' : '#60a5fa'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Custom Pricing & Order history summary */}
        <div className="vw-card overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-[14px] font-bold text-slate-800 uppercase tracking-wider">Negotiated Pricing Items</h3>
              <p className="text-[12px] text-slate-500 mt-0.5">Special rates set exclusively for {customer.name}</p>
            </div>
            <button onClick={() => setPricingModal(true)} className="text-blue-600 text-[12px] font-bold hover:underline">Manage</button>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="px-5 py-3 font-bold">Product</th>
                  <th className="px-5 py-3 font-bold text-right">Standard Rate</th>
                  <th className="px-5 py-3 font-bold text-right text-blue-600">Custom Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3 text-[13px] font-bold text-slate-800">Blue Cut Lenses</td>
                  <td className="px-5 py-3 text-[13px] font-medium text-slate-500 text-right line-through">₹850</td>
                  <td className="px-5 py-3 text-[14px] font-black text-emerald-600 text-right">₹700</td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3 text-[13px] font-bold text-slate-800">CR-39 Hard Coat</td>
                  <td className="px-5 py-3 text-[13px] font-medium text-slate-500 text-right line-through">₹500</td>
                  <td className="px-5 py-3 text-[14px] font-black text-emerald-600 text-right">₹420</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Credit Limit Modal */}
      {limitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-[15px] text-slate-800">Adjust Credit Limit</h2>
            </div>
            <form onSubmit={handleUpdateLimit} className="p-5">
              <div className="mb-4">
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">New Limit Amount (₹)</label>
                <input 
                  type="number" 
                  value={newLimit}
                  onChange={e => setNewLimit(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[14px] font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setLimitModal(false)} className="flex-1 vw-btn-secondary h-10">Cancel</button>
                <button type="submit" className="flex-1 vw-btn-primary h-10">Save Limit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Pricing Modal */}
      {pricingModal && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-[18px] text-slate-900">Custom Pricing Matrix</h2>
                <div className="text-[13px] text-slate-500 mt-0.5">{customer.name}</div>
              </div>
              <button onClick={() => setPricingModal(false)} className="text-slate-400 hover:text-slate-700">Close</button>
            </div>
            <div className="flex-1 p-5 overflow-auto">
              <p className="text-[13px] text-slate-600 mb-4">Set specific discounts or fixed rates for products. This will override standard inventory prices when this customer places an order.</p>
              
              <div className="space-y-4">
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="font-bold text-[14px] text-slate-800 mb-2">Blue Cut Lenses</div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Standard Rate</label>
                      <div className="text-[14px] font-medium text-slate-500">₹850</div>
                    </div>
                    <div className="flex-1">
                      <label className="text-[11px] font-bold text-blue-600 uppercase">Custom Rate (₹)</label>
                      <input type="number" defaultValue="700" className="w-full h-8 px-2 border border-slate-200 rounded text-[13px] font-bold focus:border-blue-500" />
                    </div>
                  </div>
                </div>
                
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="font-bold text-[14px] text-slate-800 mb-2">CR-39 Hard Coat</div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Standard Rate</label>
                      <div className="text-[14px] font-medium text-slate-500">₹500</div>
                    </div>
                    <div className="flex-1">
                      <label className="text-[11px] font-bold text-blue-600 uppercase">Custom Rate (₹)</label>
                      <input type="number" defaultValue="420" className="w-full h-8 px-2 border border-slate-200 rounded text-[13px] font-bold focus:border-blue-500" />
                    </div>
                  </div>
                </div>
              </div>
              <button className="w-full mt-4 border-2 border-dashed border-slate-300 text-slate-500 font-bold text-[13px] h-10 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors">
                + Add Custom Product Rate
              </button>
            </div>
            <div className="p-4 border-t border-slate-100">
              <button className="w-full vw-btn-primary h-10" onClick={() => setPricingModal(false)}>Save Pricing Rules</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
