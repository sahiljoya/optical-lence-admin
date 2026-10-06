import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Search, Plus, Filter, Package, Grid } from "lucide-react";
import { productApi } from "../../services/productApi";
import "@/styles/veriwide.css";

export function Products() {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await productApi.getProducts({});
      if (res.error === false) {
        setProducts(res.data.list || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const filteredProducts = products.filter(p => p.brand.toLowerCase().includes(searchTerm.toLowerCase()) || p.product_code?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 mt-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory Catalog</h1>
          <p className="text-[13px] text-slate-500 mt-1">Manage lens series, matrices, and stock variants.</p>
        </div>
        <Link to="/products/new" className="vw-btn-primary h-10 px-4 gap-2 flex items-center justify-center">
          <Plus size={16} /> New Product Series
        </Link>
      </div>

      <div className="vw-card p-3 mb-6 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search products by brand or code..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <button className="vw-btn-secondary h-10 px-4 gap-2 w-full sm:w-auto flex items-center justify-center">
          <Filter size={16} /> Filters
        </button>
      </div>

      <div className="vw-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ fontSize: 13 }}>
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="font-semibold text-slate-600 px-4 py-3">Product Name</th>
                <th className="font-semibold text-slate-600 px-4 py-3">Details</th>
                <th className="font-semibold text-slate-600 px-4 py-3 text-center">Base Price</th>
                <th className="font-semibold text-slate-600 px-4 py-3">Status</th>
                <th className="font-semibold text-slate-600 px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-slate-500 font-medium">Loading products...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-slate-500 font-medium">No products found.</td>
                </tr>
              ) : (
                filteredProducts.map((prod) => (
                  <tr key={prod._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-800">{prod.brand}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{prod.product_code || "NO CODE"}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] font-semibold border border-blue-100">{prod.lens_type}</span>
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-semibold border border-slate-200">Index: {prod.index}</span>
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-semibold border border-slate-200">{prod.coating}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 font-bold text-[13px] text-emerald-700">
                        ₹{prod.min_selling_price}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide border ${
                        prod.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {prod.is_active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/products/${prod._id}/edit`} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors" title="Edit Product">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                        </Link>
                        <Link to={`/products/${prod._id}`} className="vw-btn-secondary h-8 px-3 text-[12px] gap-1 inline-flex items-center rounded">
                          <Package size={14} /> View Matrix
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
