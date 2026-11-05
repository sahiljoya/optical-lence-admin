import { useState, useRef } from "react";
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { productApi } from "@/services/productApi";
import { notify } from "@/lib/notify";

export function ImportProductsModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloading(true);
      await productApi.downloadMasterExcelTemplate();
      notify.success("Sample template downloaded!");
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

      const res = await productApi.bulkExcelUpload(formData);
      if (res.error === false) {
        setResult(res.data);
        notify.success(res.message || "Products processed successfully!");
        if (onSuccess) onSuccess();
      } else {
        notify.error(res.message || "Failed to process Excel file.");
      }
    } catch (err) {
      console.error(err);
      notify.error(err.message || "Server error while processing Excel file.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Import Products via Excel
              </h3>
              <p className="text-[11px] text-slate-500">
                Bulk upload or update product masters &amp; ranges
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
          {/* Download Template Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl">
            <div className="text-xs text-blue-900">
              <span className="font-bold block">Need the standard Excel format?</span>
              <span className="text-[11px] text-blue-700">
                Download the pre-formatted template with all required tier prices.
              </span>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={isDownloading}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors shadow-2xs disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}
              {isDownloading ? "Downloading..." : "Download Template"}
            </button>
          </div>

          {/* File Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
              file
                ? "border-emerald-400 bg-emerald-50/30"
                : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
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
              className={`p-3 rounded-2xl ${file ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
            >
              <Upload size={24} />
            </div>
            {file ? (
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-800">{file.name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {(file.size / 1024).toFixed(1)} KB · Ready to import
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-700">
                  Click to choose or drag &amp; drop Excel file
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Supported formats: .xlsx, .xls</p>
              </div>
            )}
          </div>

          {/* Rules / Guidance */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 flex flex-col gap-1">
            <span className="font-bold text-slate-700">Strict Validation Rules:</span>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500">
              <li>
                <strong className="text-slate-700">Compulsory Tiers:</strong> Courier Price, Stock A
                Price, Stock A+ Price, and Stock Platinum Price are mandatory.
              </li>
              <li>
                <strong className="text-slate-700">Strict Specs:</strong> Index, Dia (mm), Base,
                Coating, and Price per pair (₹) are mandatory (no silent fallbacks).
              </li>
              <li>
                <strong className="text-slate-700">Duplicate Handling:</strong> If the exact SKU
                exists, its prices &amp; details update automatically. Different coatings/ranges
                create separate products.
              </li>
              <li>
                <strong className="text-slate-700">Brands:</strong> Any new brand name found in
                Excel is created automatically.
              </li>
            </ul>
          </div>

          {/* Result / Error Display */}
          {result && (
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <CheckCircle2 size={16} className="text-emerald-600" /> Import Summary
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">
                    Total Rows
                  </span>
                  <span className="text-sm font-bold text-slate-800 font-mono">{result.total}</span>
                </div>
                <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="block text-[10px] text-emerald-700 font-bold uppercase">
                    Created
                  </span>
                  <span className="text-sm font-bold text-emerald-800 font-mono">
                    {result.created}
                  </span>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="block text-[10px] text-blue-700 font-bold uppercase">
                    Updated
                  </span>
                  <span className="text-sm font-bold text-blue-800 font-mono">
                    {result.updated}
                  </span>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="mt-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 mb-1">
                    <AlertCircle size={14} /> Issues Found ({result.errors.length} rows skipped)
                  </div>
                  <div className="max-h-36 overflow-y-auto bg-white border border-rose-200 rounded-lg p-2 text-[10px] font-mono text-rose-700 space-y-1">
                    {result.errors.map((err, idx) => (
                      <div key={idx} className="border-b border-rose-50 last:border-0 pb-0.5">
                        {err}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleReset}
            disabled={!file && !result}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
          >
            Reset
          </button>
          <div className="flex items-center gap-2">
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
            >
              {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {isUploading ? "Importing Products..." : "Upload & Import"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
