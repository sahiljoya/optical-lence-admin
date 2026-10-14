import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Save, Settings2, Plus, Tag } from "lucide-react";
import { brandApi, productApi, warehouseApi } from "../../services/productApi";
import { customerService } from "../../services/customerService";
import { notify } from "@/lib/notify";
import { MatrixEditor, defaultRangeConfigFromProduct } from "./MatrixEditor";
import "@/styles/veriwide.css";

export function EditProduct() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [brands, setBrands] = useState([]);
  const [racks, setRacks] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [newBrand, setNewBrand] = useState({ name: "", description: "", image: "" });

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
    grade: "",
    purchase_status: "Stable",
    return_status: "Can Take",
    part_number: "",
    low_stock_threshold: null,
    exclusivity: { city: "", customer_id: "" }
  });

  // A Product document is exactly one priced power range (see CreateProduct.jsx). The actual
  // matrix structure/stock is generated and edited by <MatrixEditor>; rangeConfig here just
  // seeds its range-definition form from this product's current min/max boundaries.
  const [rangeConfig, setRangeConfig] = useState(defaultRangeConfigFromProduct(null));

  useEffect(() => {
    if (!id) return;
    const init = async () => {
      setIsLoading(true);
      try {
        const [brandsRes, rackRes, custRes, prodRes] = await Promise.all([
          brandApi.getBrands(),
          warehouseApi.getRackSummary(),
          customerService.getCustomers({ limit: 200 }),
          productApi.getProductDetail(id)
        ]);

        const brandsList = brandsRes.error === false ? brandsRes.data : [];
        setBrands(brandsList);
        setRacks(rackRes.error === false ? rackRes.data : []);
        setCustomers(custRes.error === false ? (custRes.data?.list || []) : []);

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
          grade: product.grade || "",
          purchase_status: product.purchase_status || "Stable",
          return_status: product.return_status || "Can Take",
          part_number: product.part_number || "",
          low_stock_threshold: product.low_stock_threshold ?? null,
          exclusivity: {
            city: product.exclusivity?.city || "",
            customer_id: product.exclusivity?.customer_id || ""
          }
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

  const handleSaveBrand = async () => {
    if (!newBrand.name) return;
    try {
      const res = await brandApi.createBrand(newBrand);
      if (res.error === false) {
        setShowBrandModal(false);
        setNewBrand({ name: "", description: "", image: "" });
        fetchBrands();
      } else {
        notify.error(res.message);
      }
    } catch (error) {
      notify.error("Error creating brand");
    }
  };

  const handleSaveProduct = async () => {
    if (!productData.brand || !productData.product_code) return notify.warning("Brand and Product Code are required.");
    setIsSaving(true);
    try {
      const cylMins = rangeConfig.cylBlocks.map(b => parseFloat(b.min));
      const cylMaxs = rangeConfig.cylBlocks.map(b => parseFloat(b.max));
      const payload = {
        ...productData,
        min_sph: parseFloat(rangeConfig.sph.min),
        max_sph: parseFloat(rangeConfig.sph.max),
        min_cyl: cylMins.length > 0 ? Math.min(...cylMins) : 0,
        max_cyl: cylMaxs.length > 0 ? Math.max(...cylMaxs) : 0,
        grade: productData.grade || undefined,
        exclusivity: {
          city: productData.exclusivity.city || null,
          customer_id: productData.exclusivity.customer_id || null
        }
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
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Product Code (SKU) <span className="text-rose-500">*</span></label>
                <input type="text" placeholder="e.g. AIRSMART-1.61-BCUT-SV--6-4" value={productData.product_code} onChange={e => setProductData({...productData, product_code: e.target.value})} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 uppercase" />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Power Type</label>
                <select value={productData.lens_type} onChange={e => setProductData({...productData, lens_type: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500">
                  <option value="Single Vision">Single Vision (SV)</option>
                  <option value="Progressive">Progressive (PG)</option>
                  <option value="KT">Bifocal (KT)</option>
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
              <h4 className="text-[12px] font-bold text-slate-600 mb-3 uppercase">Tier Pricing <span className="text-slate-400 normal-case font-medium">(applies to this product's power range only)</span></h4>
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
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Minimum Selling Price</label>
                <input type="number" value={productData.min_selling_price} onChange={e => setProductData({...productData, min_selling_price: parseFloat(e.target.value)})} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Part Number</label>
                <input type="text" value={productData.part_number} onChange={e => setProductData({...productData, part_number: e.target.value})} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Sales Grade</label>
                <select value={productData.grade} onChange={e => setProductData({...productData, grade: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500">
                  <option value="">-- Not graded --</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Purchase Status</label>
                <select value={productData.purchase_status} onChange={e => setProductData({...productData, purchase_status: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500">
                  <option value="Stable">Stable</option>
                  <option value="Growing">Growing</option>
                  <option value="Risky">Risky</option>
                  <option value="Stopped">Stopped</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Return Status</label>
                <select value={productData.return_status} onChange={e => setProductData({...productData, return_status: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500">
                  <option value="Can Take">Can Take</option>
                  <option value="Do Not Take">Do Not Take</option>
                  <option value="Review">Review</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Low Stock Alert Threshold</label>
                <input type="number" value={productData.low_stock_threshold ?? ""} onChange={e => setProductData({...productData, low_stock_threshold: e.target.value === "" ? null : parseInt(e.target.value)})} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500" placeholder="Default (10)" />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5 mt-5">
              <h4 className="text-[12px] font-bold text-slate-600 mb-3 uppercase">City/Customer Exclusivity <span className="text-slate-400 normal-case font-medium">(for high-value, distributor-model products)</span></h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Exclusive City</label>
                  <input type="text" value={productData.exclusivity.city} onChange={e => setProductData({...productData, exclusivity: {...productData.exclusivity, city: e.target.value}})} className="w-full h-9 px-2 bg-white border border-slate-200 rounded text-[13px] focus:border-blue-500 focus:outline-none" placeholder="e.g. Udaipur" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Exclusive Customer</label>
                  <select value={productData.exclusivity.customer_id} onChange={e => setProductData({...productData, exclusivity: {...productData.exclusivity, customer_id: e.target.value}})} className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded text-[13px] focus:border-blue-500 focus:outline-none">
                    <option value="">-- None --</option>
                    {customers.map(c => (
                      <option key={c._id} value={c._id}>{c.company_name || c.name}</option>
                    ))}
                  </select>
                </div>
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

      {showBrandModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-[15px]">Add New Brand</h3>
              <button onClick={() => setShowBrandModal(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Brand Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={newBrand.name}
                  onChange={e => setNewBrand({...newBrand, name: e.target.value})}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Vishal HC"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Image URL</label>
                <input
                  type="text"
                  value={newBrand.image}
                  onChange={e => setNewBrand({...newBrand, image: e.target.value})}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500"
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Description</label>
                <textarea
                  value={newBrand.description}
                  onChange={e => setNewBrand({...newBrand, description: e.target.value})}
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 resize-none h-24"
                  placeholder="Brand details..."
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setShowBrandModal(false)} className="px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={handleSaveBrand} disabled={!newBrand.name} className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50">
                Save Brand
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
