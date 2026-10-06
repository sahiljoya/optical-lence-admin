import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Save, Grid, Settings2, Plus, Trash2, AlertCircle, Package } from "lucide-react";
import { brandApi, productApi, warehouseApi } from "../../services/productApi";
import "@/styles/veriwide.css";

function PowerInput({ value, onChange, placeholder }) {
  const handleDec = () => {
    let val = parseFloat(value || 0);
    if(isNaN(val)) val = 0;
    const newVal = (val - 0.25).toFixed(2);
    onChange(parseFloat(newVal) > 0 ? `+${newVal}` : newVal);
  };
  const handleInc = () => {
    let val = parseFloat(value || 0);
    if(isNaN(val)) val = 0;
    const newVal = (val + 0.25).toFixed(2);
    onChange(parseFloat(newVal) > 0 ? `+${newVal}` : newVal);
  };

  return (
    <div className="flex items-center border border-slate-200 rounded overflow-hidden h-8 bg-white">
      <button onClick={handleDec} className="w-8 h-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 border-r border-slate-200 font-bold transition-colors">−</button>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="flex-1 w-full h-full text-center text-[12px] font-mono focus:outline-none" />
      <button onClick={handleInc} className="w-8 h-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 border-l border-slate-200 font-bold transition-colors">+</button>
    </div>
  );
}

export function CreateProduct() {
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [locations, setLocations] = useState([]);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [newBrand, setNewBrand] = useState({ name: "", description: "", image: "" });
  const [isSaving, setIsSaving] = useState(false);

  const [productData, setProductData] = useState({
    brand: "",
    index: 1.56,
    base: "Hard Coat (HC)",
    coating: "Standard",
    lens_type: "Single Vision",
    diameter: 65,
    product_code: "",
    min_selling_price: 100,
    tier_prices: { courier: 120, stock_a: 110, stock_a_plus: 105, stock_platinum: 100 }
  });

  const [matrices, setMatrices] = useState([
    { 
      id: 1, 
      name: "Base Range", 
      minSph: "-6.00", maxSph: "+4.00", 
      minCyl: "-2.00", maxCyl: "0.00",
      grid: null,
      location_id: ""
    }
  ]);

  useEffect(() => {
    fetchBrands();
    fetchLocations();
  }, []);

  const fetchBrands = async () => {
    try {
      const res = await brandApi.getBrands();
      if (res.error === false) {
        setBrands(res.data);
        if (res.data.length > 0 && !productData.brand) {
          setProductData(prev => ({ ...prev, brand: res.data[0].name }));
        }
      }
    } catch (e) {
      console.error("Failed to fetch brands", e);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await warehouseApi.getLocations({});
      if (res.error === false) {
        setLocations(res.data);
        if (res.data.length > 0) {
          setMatrices(prev => prev.map(m => ({ ...m, location_id: res.data[0]._id })));
        }
      }
    } catch (e) {
      console.error("Failed to fetch locations", e);
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
        alert(res.message);
      }
    } catch (error) {
      alert("Error creating brand");
    }
  };

  const handleSaveProduct = async () => {
    if (!productData.brand || !productData.product_code) return alert("Brand and Product Code are required.");
    setIsSaving(true);
    try {
      // 1. Create Product
      const payload = {
        ...productData,
        power_ranges: matrices.map(m => ({
          name: m.name,
          min_sph: parseFloat(m.minSph),
          max_sph: parseFloat(m.maxSph),
          min_cyl: parseFloat(m.minCyl),
          max_cyl: parseFloat(m.maxCyl)
        }))
      };

      const pRes = await productApi.createProduct(payload);
      if (pRes.error !== false) {
        setIsSaving(false);
        return alert(pRes.message || "Failed to create product");
      }
      
      const productId = pRes.data._id;

      // 2. Update Stock Matrices if grid generated
      let powerCells = [];
      
      for (const matrix of matrices) {
        if (matrix.grid) {
          for (const sph of matrix.grid.sphList) {
            for (const cyl of matrix.grid.cylList) {
              const qty = matrix.grid.values[`${sph}_${cyl}`];
              if (qty && parseInt(qty) > 0) {
                const locations = matrix.location_id 
                  ? [{ warehouse_location_id: matrix.location_id, quantity: parseInt(qty) }] 
                  : [];

                powerCells.push({
                  sph: parseFloat(sph),
                  cyl: parseFloat(cyl),
                  quantity: parseInt(qty), // Send quantity for backward compatibility
                  locations
                });
              }
            }
          }
        }
      }

      if (powerCells.length > 0) {
        await productApi.updateMatrix({
          productId,
          godownId: "running_stock",
          powerCells
        });
      }

      alert("Product and Stock Saved Successfully!");
      navigate({ to: "/products" });

    } catch (error) {
      alert("An error occurred while saving.");
      console.error(error);
    }
    setIsSaving(false);
  };

  const addMatrix = () => {
    setMatrices([...matrices, { 
      id: Date.now(), 
      name: `Matrix Range ${matrices.length + 1}`, 
      minSph: "0.00", maxSph: "0.00", minCyl: "0.00", maxCyl: "0.00",
      grid: null,
      location_id: locations.length > 0 ? locations[0]._id : ""
    }]);
  };

  const removeMatrix = (id) => {
    if (matrices.length > 1) {
      setMatrices(matrices.filter(m => m.id !== id));
    }
  };

  const updateMatrix = (id, field, value) => {
    setMatrices(matrices.map(m => m.id === id ? { ...m, [field]: value } : m));
  };
  
  const validateMatrix = (m) => {
    const minS = parseFloat(m.minSph);
    const maxS = parseFloat(m.maxSph);
    const minC = parseFloat(m.minCyl);
    const maxC = parseFloat(m.maxCyl);
    let error = null;
    if (minS > maxS) error = "Min SPH cannot be greater than Max SPH.";
    else if (minC > maxC) error = "Min CYL cannot be greater than Max CYL.";
    return error;
  };

  const handleGenerateGrid = (id) => {
    const m = matrices.find(x => x.id === id);
    if (validateMatrix(m)) return alert("Fix matrix errors before generating.");
    
    const minS = parseFloat(m.minSph);
    const maxS = parseFloat(m.maxSph);
    const minC = parseFloat(m.minCyl);
    const maxC = parseFloat(m.maxCyl);
    
    const sList = [];
    for(let i=maxS; i>=minS; i-=0.25) sList.push(i > 0 ? `+${i.toFixed(2)}` : i.toFixed(2));
    
    const cList = [];
    for(let i=maxC; i>=minC; i-=0.25) cList.push(i > 0 ? `+${i.toFixed(2)}` : i.toFixed(2));

    setMatrices(matrices.map(x => x.id === id ? { ...x, grid: { sphList: sList, cylList: cList, values: {} } } : x));
  };

  const handleCellChange = (matrixId, sph, cyl, val) => {
    setMatrices(matrices.map(m => {
      if (m.id !== matrixId) return m;
      return {
        ...m,
        grid: {
          ...m.grid,
          values: { ...m.grid.values, [`${sph}_${cyl}`]: val }
        }
      };
    }));
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6 mt-2">
        <div className="flex items-center gap-3">
          <Link to="/products" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-slate-600">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Create New Lens Series</h1>
            <p className="text-[13px] text-slate-500 mt-1">Define product attributes and generate power matrices.</p>
          </div>
        </div>
        <button onClick={handleSaveProduct} disabled={isSaving} className="vw-btn-primary h-10 px-4 gap-2 flex items-center justify-center disabled:opacity-50">
          <Save size={16} /> {isSaving ? "Saving..." : "Save Product"}
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
                <input type="text" placeholder="e.g. VIS-HC-156" value={productData.product_code} onChange={e => setProductData({...productData, product_code: e.target.value})} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 uppercase" />
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
            </div>
            
            {/* PRICING */}
            <div className="border-t border-slate-100 pt-5 mt-2">
              <h4 className="text-[12px] font-bold text-slate-600 mb-3 uppercase">Tier Pricing</h4>
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
        </div>

        <div className="vw-card p-5">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Grid size={16} className="text-purple-600"/> STEP 1: SELECT POWER RANGE</h3>
            <button onClick={addMatrix} className="text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded text-[11px] font-bold inline-flex items-center gap-1 transition-colors">
              <Plus size={14} /> Add Range
            </button>
          </div>
          
          <p className="text-[12px] text-slate-500 mb-5 leading-relaxed">
            Set the Min and Max boundaries for SPH and CYL. The system will use this range to generate customer dropdowns and stock grids.
          </p>
          
          <div className="flex flex-col gap-6">
            {matrices.map((matrix) => {
              const error = validateMatrix(matrix);
              return (
                <div key={matrix.id} className={`bg-slate-50/50 border rounded-lg p-4 relative transition-colors ${error ? 'border-rose-300' : 'border-slate-200'}`}>
                  {matrices.length > 1 && (
                    <button onClick={() => removeMatrix(matrix.id)} className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                  
                  <div className="mb-4 pr-8">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Matrix Name</label>
                    <input 
                      type="text" 
                      value={matrix.name} 
                      onChange={e => updateMatrix(matrix.id, 'name', e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded text-[13px] font-semibold text-slate-800 focus:outline-none focus:border-blue-500" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                      <div className="text-[11px] font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">SPH Range</div>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-slate-500 w-10">Min</span>
                          <div className="flex-1"><PowerInput value={matrix.minSph} onChange={v => updateMatrix(matrix.id, 'minSph', v)} placeholder="-6.00" /></div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-slate-500 w-10">Max</span>
                          <div className="flex-1"><PowerInput value={matrix.maxSph} onChange={v => updateMatrix(matrix.id, 'maxSph', v)} placeholder="+4.00" /></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                      <div className="text-[11px] font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">CYL Range</div>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-slate-500 w-10">Min</span>
                          <div className="flex-1"><PowerInput value={matrix.minCyl} onChange={v => updateMatrix(matrix.id, 'minCyl', v)} placeholder="-2.00" /></div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-slate-500 w-10">Max</span>
                          <div className="flex-1"><PowerInput value={matrix.maxCyl} onChange={v => updateMatrix(matrix.id, 'maxCyl', v)} placeholder="0.00" /></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {error && (
                    <div className="mt-4 bg-rose-50 text-rose-600 border border-rose-200 p-2.5 rounded text-[12px] flex items-center gap-2 font-medium">
                      <AlertCircle size={14} />
                      {error}
                    </div>
                  )}

                  {!matrix.grid && !error && (
                    <button onClick={() => handleGenerateGrid(matrix.id)} className="mt-6 vw-btn-secondary h-10 w-full font-bold bg-purple-600 text-white hover:bg-purple-700">
                      ⬇️ STEP 2: OPEN GRID TO ENTER STOCK
                    </button>
                  )}

                  {matrix.grid && (
                    <div className="mt-6 pt-6 border-t border-slate-200 animate-in fade-in slide-in-from-top-4 duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Package size={16} className="text-emerald-600"/> WAREHOUSE LOCATION & STOCK ENTRY</h3>
                        <button onClick={() => handleGenerateGrid(matrix.id)} className="text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded text-[11px] font-bold inline-flex items-center gap-1 transition-colors">
                          🔄 Update Grid
                        </button>
                      </div>
                      
                      <div className="mb-6 p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase">Select Warehouse Location</label>
                        <select value={matrix.location_id} onChange={e => updateMatrix(matrix.id, 'location_id', e.target.value)} className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded focus:border-emerald-500 focus:outline-none text-[13px]">
                          <option value="">-- Choose Location --</option>
                          {locations.map(loc => (
                            <option key={loc._id} value={loc._id}>
                              {loc.location_code} (Floor: {loc.floor}, Rack: {loc.rack}, Box: {loc.box_no})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[500px] overflow-y-auto">
                        <table className="w-full text-center border-collapse text-[12px]">
                          <thead className="bg-slate-100 sticky top-0 z-10">
                            <tr>
                              <th className="p-2 border-b border-r border-slate-200 min-w-[80px] font-bold text-slate-700 bg-slate-200">SPH \ CYL</th>
                              {matrix.grid.cylList.map(cyl => (
                                <th key={cyl} className="p-2 border-b border-r border-slate-200 min-w-[60px] font-bold text-slate-700">{cyl}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {matrix.grid.sphList.map(sph => (
                              <tr key={sph}>
                                <th className="p-2 border-b border-r border-slate-200 bg-slate-50 font-bold text-slate-700 sticky left-0 z-10">{sph}</th>
                                {matrix.grid.cylList.map(cyl => (
                                  <td key={cyl} className="p-1 border-b border-r border-slate-100 hover:bg-emerald-50 transition-colors relative">
                                    <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-300 pointer-events-none select-none z-0">
                                      {matrix.grid.values[`${sph}_${cyl}`] ? '' : 'Qty'}
                                    </div>
                                    <input 
                                      type="number" 
                                      min="0"
                                      value={matrix.grid.values[`${sph}_${cyl}`] || ''}
                                      onChange={(e) => handleCellChange(matrix.id, sph, cyl, e.target.value)}
                                      className="w-full text-center h-7 focus:outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded bg-transparent relative z-10"
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
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
