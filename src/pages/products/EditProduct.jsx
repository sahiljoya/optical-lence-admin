import { useState, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Save, Settings2, Plus, Tag } from "lucide-react";
import { brandApi, productApi, warehouseApi } from "../../services/productApi";
import { notify } from "@/lib/notify";
import { MatrixEditor, defaultRangeConfigFromProduct } from "./MatrixEditor";
import { generateProductCode } from "./matrixHelpers";
import { DeptBadge } from "@/components/common/DeptBadge";
import { AddBrandModal } from "@/components/products/AddBrandModal";
import "@/styles/veriwide.css";

export function EditProduct() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [brands, setBrands] = useState([]);
  const [racks, setRacks] = useState([]);
  const [showBrandModal, setShowBrandModal] = useState(false);

  const [productData, setProductData] = useState({
    brand: "",
    index: 1.56,
    base: "Hard Coat (HC)",
    coating: "Standard",
    lens_type: "Single Vision",
    diameter: 65,
    product_code: "",
    min_selling_price: 100,
    value_tier: "commodity",
    tier_prices: { courier: 120, stock_a: 110, stock_a_plus: 105, stock_platinum: 100 },
    range_label: "",
    lens_nature: "Finished",
    grade_quantity: "",
    grade_rate: "",
    purchase_status: "Stable",
    return_status: "Can Take",
    part_number: "",
    low_stock_threshold: null,
    n_a_flag: false
  });

  // A Product document is exactly one priced power range (see CreateProduct.jsx). The actual
  // matrix structure/stock is generated and edited by <MatrixEditor>; rangeConfig here just
  // seeds its range-definition form from this product's current min/max boundaries.
  const [rangeConfig, setRangeConfig] = useState(defaultRangeConfigFromProduct(null));

  const autoSku = useMemo(() => {
    if (productData.product_code) return productData.product_code;
    const cylMins = rangeConfig?.cylBlocks?.map(b => parseFloat(b.min)) || [];
    const cylMaxs = rangeConfig?.cylBlocks?.map(b => parseFloat(b.max)) || [];
    return generateProductCode({
      brand: productData.brand,
      index: productData.index,
      base: productData.base,
      lens_type: productData.lens_type,
      diameter: productData.diameter,
      min_sph: parseFloat(rangeConfig?.sph?.min),
      max_sph: parseFloat(rangeConfig?.sph?.max),
      min_cyl: cylMins.length > 0 ? Math.min(...cylMins) : 0,
      max_cyl: cylMaxs.length > 0 ? Math.max(...cylMaxs) : 0,
      range_label: productData.range_label
    });
  }, [productData.product_code, productData.brand, productData.index, productData.base, productData.lens_type, productData.diameter, productData.range_label, rangeConfig]);

  useEffect(() => {
    if (!id) return;
    const init = async () => {
      setIsLoading(true);
      try {
        const [brandsRes, rackRes, prodRes] = await Promise.all([
          brandApi.getBrands(),
          warehouseApi.getRackSummary(),
          productApi.getProductDetail(id)
        ]);

        const brandsList = brandsRes.error === false ? brandsRes.data : [];
        setBrands(brandsList);
        setRacks(rackRes.error === false ? rackRes.data : []);

        if (prodRes.error !== false) {
          notify.error(prodRes.message || "Failed to load product");
          return;
        }
        const product = prodRes.data;
        setProductData({
          brand: product.brand,
          index: product.index,
          base: product.base,
          coating: product.coating,
          lens_type: product.lens_type,
          diameter: product.diameter,
          product_code: product.product_code,
          min_selling_price: product.min_selling_price || 0,
          value_tier: product.value_tier || "commodity",
          tier_prices: product.tier_prices || { courier: 0, stock_a: 0, stock_a_plus: 0, stock_platinum: 0 },
          range_label: product.range_label || "",
          lens_nature: product.lens_nature || "Finished",
          grade_quantity: product.grade_quantity || "",
          grade_rate: product.grade_rate || "",
          purchase_status: product.purchase_status || "Stable",
          return_status: product.return_status || "Can Take",
          part_number: product.part_number || "",
          low_stock_threshold: product.low_stock_threshold ?? null,
          n_a_flag: product.n_a_flag || false
        });

        setRangeConfig(defaultRangeConfigFromProduct(product));
      } catch (e) {
        console.error("Failed to load product", e);
        notify.error("Failed to load product");
      }
      setIsLoading(false);
    };
    init();
  }, [id]);

  const fetchBrands = async () => {
    try {
      const res = await brandApi.getBrands();
      if (res.error === false) setBrands(res.data);
    } catch (e) {
      console.error("Failed to fetch brands", e);
    }
  };

  const handleSaveProduct = async () => {
    if (!productData.brand) return notify.warning("Brand is required.");
    const sku = productData.product_code || autoSku;
    if (!sku) return notify.warning("Unable to determine Product Code (SKU).");
    setIsSaving(true);
    try {
      const cylMins = rangeConfig.cylBlocks.map(b => parseFloat(b.min));
      const cylMaxs = rangeConfig.cylBlocks.map(b => parseFloat(b.max));
      const payload = {
        ...productData,
        product_code: sku,
        min_sph: parseFloat(rangeConfig.sph.min),
        max_sph: parseFloat(rangeConfig.sph.max),
        min_cyl: cylMins.length > 0 ? Math.min(...cylMins) : 0,
        max_cyl: cylMaxs.length > 0 ? Math.max(...cylMaxs) : 0,
        grade_quantity: productData.grade_quantity || undefined,
        grade_rate: productData.grade_rate || undefined
      };

      const pRes = await productApi.updateProduct(id, payload);
      if (pRes.error !== false) {
        notify.error(pRes.message || "Failed to update product");
      } else {
        notify.success("Product details updated.");
      }
    } catch (error) {
      notify.error("An error occurred while saving.");
      console.error(error);
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return <div className="p-10 text-center text-slate-500 text-[13px]">Loading product...</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6 mt-2">
        <div className="flex items-center gap-3">
          <Link to="/products" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-slate-600">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Update Lens Series</h1>
            <p className="text-[13px] text-slate-500 mt-1">Editing {productData.product_code || id}</p>
          </div>
        </div>
        <button onClick={handleSaveProduct} disabled={isSaving} className="vw-btn-primary h-10 px-4 gap-2 flex items-center justify-center disabled:opacity-50">
          <Save size={16} /> {isSaving ? "Saving..." : "Update Details"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_500px] gap-6 items-start">
        <div className="flex flex-col gap-6">
          <div className="vw-card p-5">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-3"><Settings2 size={16} className="text-blue-600"/> Basic Details</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[12px] font-bold text-slate-700">Brand</label>
                  <button onClick={() => setShowBrandModal(true)} className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"><Plus size={12}/> New Brand</button>
                </div>
                <select value={productData.brand} onChange={e => setProductData({...productData, brand: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500">
                  <option value="">-- Select a Brand --</option>
                  {brands.map(b => (
                    <option key={b._id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Product Code (SKU)</span>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Auto Generated</span>
                </label>
                <div className="w-full h-10 px-3 bg-slate-100 border border-slate-200 rounded-lg text-[13px] font-mono font-medium text-slate-800 flex items-center truncate select-all">
                  {productData.product_code || autoSku || <span className="text-slate-400 italic font-sans text-xs">No SKU available</span>}
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Power Type</label>
                <select value={productData.lens_type} onChange={e => setProductData({...productData, lens_type: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500">
                  <option value="Single Vision">Single Vision (SV)</option>
                  <option value="Progressive">Progressive (PG)</option>
                  <option value="KT">Bifocal (KT)</option>
                  <option value="Cross">Cross</option>
                  <option value="RX">RX (Made-to-order)</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Lens Nature</label>
                <select value={productData.lens_nature} onChange={e => setProductData({...productData, lens_nature: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500">
                  <option value="Finished">Finished</option>
                  <option value="Raw / Semi-Finished">Raw / Semi-Finished</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Base Material</label>
                <select value={productData.base} onChange={e => setProductData({...productData, base: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500">
                  <option value="Hard Coat (HC)">Hard Coat (HC)</option>
                  <option value="Blue Cut (B.CUT)">Blue Cut (B.CUT)</option>
                  <option value="Photo Grey">Photo Grey</option>
                  <option value="Polycarbonate (POLY)">Polycarbonate (POLY)</option>
                  <option value="Blue Cut + Photo Grey">Blue Cut + Photo Grey</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Coating</label>
                <select value={productData.coating} onChange={e => setProductData({...productData, coating: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500">
                  <option value="Standard">Standard</option>
                  <option value="Anti-Reflective">Anti-Reflective</option>
                  <option value="Blue Cut">Blue Cut</option>
                  <option value="Photochromic">Photochromic</option>
                  <option value="Opal Blue">Opal Blue</option>
                  <option value="Evergreen">Evergreen</option>
                  <option value="Volt Blue">Volt Blue</option>
                  <option value="Solara Gold">Solara Gold</option>
                  <option value="Hard Coat">Hard Coat</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Index</label>
                <select value={productData.index} onChange={e => setProductData({...productData, index: parseFloat(e.target.value)})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500">
                  <option value="1.49">1.49</option>
                  <option value="1.56">1.56</option>
                  <option value="1.59">1.59</option>
                  <option value="1.61">1.61</option>
                  <option value="1.67">1.67</option>
                  <option value="1.74">1.74</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Diameter</label>
                <select value={productData.diameter} onChange={e => setProductData({...productData, diameter: parseInt(e.target.value)})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500">
                  <option value="55">55 DIA</option>
                  <option value="65">65 DIA</option>
                  <option value="70">70 DIA</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Value Tier</label>
                <select value={productData.value_tier} onChange={e => setProductData({...productData, value_tier: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500">
                  <option value="commodity">Commodity</option>
                  <option value="high_value">High Value</option>
                </select>
              </div>
            </div>

            {/* PRICING */}
            <div className="border-t border-slate-100 pt-5 mt-2">
              <h4 className="text-[12px] font-bold text-slate-600 mb-3 uppercase flex items-center gap-2">Tier Pricing <span className="text-slate-400 normal-case font-medium">(applies to this product's power range only)</span> <DeptBadge dept="sales" /></h4>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Courier</label>
                  <input type="number" value={productData.tier_prices.courier} onChange={e => setProductData({...productData, tier_prices: {...productData.tier_prices, courier: parseInt(e.target.value)}})} className="w-full h-9 px-2 bg-white border border-slate-200 rounded text-[13px] focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Stock A</label>
                  <input type="number" value={productData.tier_prices.stock_a} onChange={e => setProductData({...productData, tier_prices: {...productData.tier_prices, stock_a: parseInt(e.target.value)}})} className="w-full h-9 px-2 bg-white border border-slate-200 rounded text-[13px] focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Stock A+</label>
                  <input type="number" value={productData.tier_prices.stock_a_plus} onChange={e => setProductData({...productData, tier_prices: {...productData.tier_prices, stock_a_plus: parseInt(e.target.value)}})} className="w-full h-9 px-2 bg-white border border-slate-200 rounded text-[13px] focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Platinum</label>
                  <input type="number" value={productData.tier_prices.stock_platinum} onChange={e => setProductData({...productData, tier_prices: {...productData.tier_prices, stock_platinum: parseInt(e.target.value)}})} className="w-full h-9 px-2 bg-white border border-slate-200 rounded text-[13px] focus:border-blue-500 focus:outline-none" />
                </div>
              </div>
            </div>

          </div>

          <div className="vw-card p-5">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-3"><Tag size={16} className="text-emerald-600"/> Additional Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">Minimum Selling Price <DeptBadge dept="sales" /></label>
                <input type="number" value={productData.min_selling_price} onChange={e => setProductData({...productData, min_selling_price: parseFloat(e.target.value)})} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">Part Number <DeptBadge dept="purchase" /></label>
                <input type="text" value={productData.part_number} onChange={e => setProductData({...productData, part_number: e.target.value})} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">Grade — Quantity/Volume <DeptBadge dept="sales" /></label>
                <select value={productData.grade_quantity} onChange={e => setProductData({...productData, grade_quantity: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500">
                  <option value="">-- Not graded --</option>
                  <option value="A">A — Super Fast</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D — Dead Stock</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">Grade — Rate/Value <DeptBadge dept="sales" /></label>
                <select value={productData.grade_rate} onChange={e => setProductData({...productData, grade_rate: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500">
                  <option value="">-- Not graded --</option>
                  <option value="A">A — High Margin</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D — Low Margin</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">Purchase Status <DeptBadge dept="purchase" /></label>
                <select value={productData.purchase_status} onChange={e => setProductData({...productData, purchase_status: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500">
                  <option value="Stable">Stable</option>
                  <option value="Growing">Growing</option>
                  <option value="Risky">Risky</option>
                  <option value="Stopped">Stopped</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">Return Status <DeptBadge dept="sales" /></label>
                <select value={productData.return_status} onChange={e => setProductData({...productData, return_status: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500">
                  <option value="Can Take">Can Take</option>
                  <option value="Do Not Take">Do Not Take</option>
                  <option value="Review">Review</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">Low Stock Alert Threshold <DeptBadge dept="purchase" /></label>
                <input type="number" value={productData.low_stock_threshold ?? ""} onChange={e => setProductData({...productData, low_stock_threshold: e.target.value === "" ? null : parseInt(e.target.value)})} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500" placeholder="Default (10)" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">Stock Status <DeptBadge dept="stock" /></label>
                <label className="flex items-center gap-2 h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] cursor-pointer">
                  <input type="checkbox" checked={productData.n_a_flag} onChange={e => setProductData({...productData, n_a_flag: e.target.checked})} />
                  Mark as N/A (Not Available for Sale)
                </label>
              </div>
            </div>
          </div>
        </div>

        <MatrixEditor
          productId={id}
          lensType={productData.lens_type}
          racks={racks}
          rangeConfig={rangeConfig}
          onRangeConfigChange={setRangeConfig}
          autoGenerateIfEmpty={false}
        />
      </div>

      <AddBrandModal
        isOpen={showBrandModal}
        onClose={() => setShowBrandModal(false)}
        onBrandCreated={(createdBrand) => {
          fetchBrands();
          if (createdBrand?.name) {
            setProductData(prev => ({ ...prev, brand: createdBrand.name }));
          }
        }}
      />
    </>
  );
}
