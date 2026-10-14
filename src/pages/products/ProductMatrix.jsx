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
    return <div className="p-8 text-center text-slate-500">Loading matrix...</div>;
  }

  if (!product) {
    return <div className="p-8 text-center text-rose-500">Product not found.</div>;
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
        <Link to={`/products/${id}/edit`} className="vw-btn-secondary h-10 px-4 gap-2 flex items-center justify-center">
          <Edit size={16} /> Edit Product Details
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
