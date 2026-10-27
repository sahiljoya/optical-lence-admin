import { useState, useEffect } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Edit } from "lucide-react";
import { productApi, warehouseApi } from "../../services/productApi";
import { MatrixEditor, defaultRangeConfigFromProduct } from "./MatrixEditor";
import { notify } from "@/lib/notify";
import "@/styles/veriwide.css";

export function ProductMatrix() {
  const { id } = useParams({ strict: false });
  const [product, setProduct] = useState(null);
  const [racks, setRacks] = useState([]);
  const [rangeConfig, setRangeConfig] = useState(defaultRangeConfigFromProduct(null));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, rackRes] = await Promise.all([
        productApi.getProductDetail(id),
        warehouseApi.getRackSummary()
      ]);

      if (prodRes.error === false) {
        setProduct(prodRes.data);
        setRangeConfig(defaultRangeConfigFromProduct(prodRes.data));
      } else {
        notify.error(prodRes.message || "Failed to load product");
      }
      setRacks(rackRes.error === false ? rackRes.data : []);
    } catch (e) {
      console.error(e);
      notify.error("Failed to load product");
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="vw-card p-8 sm:p-12 text-center text-slate-500 rounded-2xl border border-slate-200/80 my-4">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs sm:text-[13px] font-semibold text-slate-600">Loading power matrix...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="vw-card p-6 sm:p-10 text-center rounded-2xl border border-rose-200 bg-rose-50/50 my-4">
        <p className="text-xs sm:text-[13px] font-bold text-rose-600">Product not found or failed to load.</p>
        <Link
          to="/products"
          className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-1.5 bg-white border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl hover:bg-rose-50 shadow-xs"
        >
          <ArrowLeft size={14} /> Back to Products
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4 mt-1 sm:mt-2">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link 
            to="/products" 
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-xs cursor-pointer shrink-0"
            title="Back to Products"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 tracking-tight truncate">
              {product.brand} - {product.lens_type}
            </h1>
            <p className="text-[11px] sm:text-xs md:text-[13px] text-slate-500 mt-0.5 truncate font-mono">
              Matrix & Inventory ({product.product_code || id})
            </p>
          </div>
        </div>
        <Link 
          to={`/products/${id}/edit`} 
          className="w-full sm:w-auto vw-btn-secondary h-9 sm:h-10 px-3.5 sm:px-4 gap-1.5 sm:gap-2 flex items-center justify-center text-xs sm:text-[13px] font-semibold rounded-xl shadow-xs cursor-pointer shrink-0"
        >
          <Edit size={15} /> Edit Product Details
        </Link>
      </div>

      <MatrixEditor
        productId={id}
        lensType={product.lens_type}
        racks={racks}
        rangeConfig={rangeConfig}
        onRangeConfigChange={setRangeConfig}
        autoGenerateIfEmpty={false}
      />
    </>
  );
}
