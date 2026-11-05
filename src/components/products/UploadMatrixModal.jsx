import { useState, useRef } from "react";
import { X, Upload, Download, FileSpreadsheet, CheckCircle2, Loader2, Grid } from "lucide-react";
import { productApi } from "@/services/productApi";
import { notify } from "@/lib/notify";

export function UploadMatrixModal({ isOpen, product, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen || !product) return null;

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloading(true);
      const filename = `${product.product_code || "stock"}_matrix_template.xlsx`;
      await productApi.downloadMatrixExcelTemplate(product._id, filename);
      notify.success("Product matrix stock template downloaded!");
    } catch (err) {
      console.error(err);
      notify.error("Failed to download template: " + (err.message || "Unknown error"));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (!selected.name.match(/\.(xlsx|xls)$/i)) {
        notify.warning("Please select a valid Excel (.xlsx / .xls) file.");
        return;
      }
      setFile(selected);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      notify.warning("Please choose an Excel file first.");
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await productApi.uploadMatrixExcel(product._id, formData);
      if (res.error === false) {
        setResult(res.data);
        notify.success(res.message || "Stock matrix updated successfully!");
        if (onSuccess) onSuccess();
      } else {
        notify.error(res.message || "Failed to upload matrix Excel.");
      }
    } catch (err) {
      console.error(err);
      notify.error(err.message || "Server error while uploading matrix Excel.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <Grid size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Matrix Stock Excel</h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {product.product_code} · {product.brand}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
          {/* Step 1: Download Locked Template */}
          <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-purple-950">
              <span className="font-bold block">1. Download Locked Template</span>
              <span className="text-[11px] text-purple-700">
                Contains this product's exact power cells. Running &amp; Reserve stock pre-filled if
                available.
              </span>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={isDownloading}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors shadow-2xs disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}
              {isDownloading ? "Generating..." : "Download Excel"}
            </button>
          </div>

          {/* Step 2: Upload Filled Template */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-700">2. Upload Filled Stock Excel</span>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                file
                  ? "border-purple-400 bg-purple-50/30"
                  : "border-slate-300 hover:border-purple-300 hover:bg-slate-50"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls"
                className="hidden"
              />
              <div
                className={`p-3 rounded-2xl ${file ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-500"}`}
              >
                <Upload size={22} />
              </div>
              {file ? (
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-800">{file.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB · Ready to upload
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-700">
                    Click to select filled stock Excel
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Must be the template generated for this product
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Info Badge */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 space-y-1">
            <span className="font-bold text-slate-700 block">Warehouse Shelf Range Guide:</span>
            <p className="text-slate-500">
              • <strong>Strict Locations:</strong> Agar quantity &gt; 0 dali hai to Floor, Rack aur
              Start Shelf dalna compulsory hai (no silent fallbacks).
            </p>
            <p className="text-slate-500">
              • <strong>Start &amp; End Shelf:</strong> Agar End Shelf khali chhodenge to single
              shelf assign hoga.
            </p>
            <p className="text-slate-500">
              • <strong>Floors:</strong> Running Stock strictly Floors 1, 2, 3. Reserve Stock Floor
              4 (Main) ya Floor 0 (Ground Dock).
            </p>
            <p className="text-slate-500">
              • <strong>Product Lock:</strong> Ye file sirf{" "}
              <span className="font-mono font-bold text-slate-700">{product.product_code}</span> ke
              liye valid hai.
            </p>
          </div>

          {/* Result Summary */}
          {result && (
            <div className="border border-emerald-200 rounded-xl p-3.5 bg-emerald-50/70 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 size={16} className="text-emerald-600" /> Stock Matrix Successfully
                Updated!
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-white rounded-lg border border-emerald-200">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">
                    Total Cells
                  </span>
                  <span className="font-mono font-bold text-slate-800">{result.total_cells}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-emerald-200">
                  <span className="block text-[10px] text-emerald-700 font-bold uppercase">
                    Running Units
                  </span>
                  <span className="font-mono font-bold text-emerald-800">
                    {result.running_units}
                  </span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-emerald-200">
                  <span className="block text-[10px] text-amber-700 font-bold uppercase">
                    Reserve Units
                  </span>
                  <span className="font-mono font-bold text-amber-800">{result.reserve_units}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
          >
            {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {isUploading ? "Updating Matrix..." : "Upload Stock Excel"}
          </button>
        </div>
      </div>
    </div>
  );
}
