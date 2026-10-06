import { useState, useEffect } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Search, Plus, Filter, Package, Grid, CheckCircle2 } from "lucide-react";
import { productApi } from "../../services/productApi";
import "@/styles/veriwide.css";

export function ProductMatrix() {
  const { id } = useParams({ strict: false });
  const [product, setProduct] = useState(null);
  const [matrix, setMatrix] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, matRes] = await Promise.all([
        productApi.getProductDetail(id),
        productApi.updateMatrix({ productId: id }) // Sending no powerCells acts as GET
      ]);

      if (prodRes.error === false) {
        setProduct(prodRes.data);
      }
      if (matRes.error === false) {
        setMatrix(matRes.data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading matrix...</div>;
  }

  if (!product) {
    return <div className="p-8 text-center text-rose-500">Product not found.</div>;
  }

  // Generate grid axes from product bounds
  const minSph = product.min_sph || -6.00;
  const maxSph = product.max_sph || 4.00;
  const minCyl = product.min_cyl || -2.00;
  const maxCyl = product.max_cyl || 0.00;

  const SPH_VALUES = [];
  for (let i = maxSph; i >= minSph; i -= 0.25) SPH_VALUES.push(i > 0 ? `+${i.toFixed(2)}` : i.toFixed(2));
  
  const CYL_VALUES = [];
  for (let i = maxCyl; i >= minCyl; i -= 0.25) CYL_VALUES.push(i > 0 ? `+${i.toFixed(2)}` : i.toFixed(2));

  // Map power cells
  const stockMap = {};
  if (matrix && matrix.power_cells) {
    matrix.power_cells.forEach(cell => {
      stockMap[`${cell.sph.toFixed(2)}_${cell.cyl !== null ? cell.cyl.toFixed(2) : 'null'}`] = cell.total_quantity || 0;
    });
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 mt-2">
        <div className="flex items-center gap-3">
          <Link to="/products" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-slate-600">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{product.brand} - {product.lens_type}</h1>
            <p className="text-[13px] text-slate-500 mt-1">Matrix & Inventory ({product.product_code || id})</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button className="vw-btn-secondary h-10 px-4 gap-2 flex flex-1 items-center justify-center">
            <Grid size={16} /> Edit Matrix
          </button>
          <button className="vw-btn-primary h-10 px-4 gap-2 flex flex-1 items-center justify-center">
            <Package size={16} /> Update Stock
          </button>
        </div>
      </div>

      <div className="vw-card p-4 overflow-x-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Grid size={16} className="text-purple-600"/> Power Matrix (SPH / CYL)
          </h3>
          <div className="text-[11px] flex gap-3">
             <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-200"></span> In Stock</span>
             <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-200"></span> Low Stock</span>
             <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-rose-50 border border-rose-200"></span> Out of Stock</span>
          </div>
        </div>
        
        <table className="w-full text-center border-collapse min-w-[500px]">
          <thead>
            <tr>
              <th className="p-2 border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 w-24 sticky left-0 z-10">SPH \ CYL</th>
              {CYL_VALUES.map(cyl => (
                <th key={cyl} className="p-2 border border-slate-200 bg-blue-50/50 text-[12px] font-bold text-blue-900">{cyl}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SPH_VALUES.map(sph => (
              <tr key={sph}>
                <td className="p-2 border border-slate-200 bg-blue-50/50 text-[12px] font-bold text-blue-900 sticky left-0 z-10">{sph}</td>
                {CYL_VALUES.map(cyl => {
                  const sphNum = parseFloat(sph);
                  const cylNum = parseFloat(cyl);
                  const stock = stockMap[`${sphNum.toFixed(2)}_${cylNum.toFixed(2)}`] || 0;
                  
                  let bg = "bg-emerald-50 hover:bg-emerald-100";
                  let text = "text-emerald-700";
                  if(stock === 0) { bg = "bg-rose-50 hover:bg-rose-100"; text = "text-rose-500"; }
                  else if(stock < 15) { bg = "bg-amber-50 hover:bg-amber-100"; text = "text-amber-700"; }

                  return (
                    <td key={cyl} className={`p-2 border border-slate-200 cursor-pointer transition-colors ${bg}`}>
                      <div className={`text-[13px] font-bold font-mono ${text}`}>{stock}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-wide">qty</div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
