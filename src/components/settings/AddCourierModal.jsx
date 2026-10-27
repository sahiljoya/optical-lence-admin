import { useState, useRef } from "react";
import { X, Upload, Link as LinkIcon, Loader2, Trash2 } from "lucide-react";
import { courierService } from "@/services/courierService";
import { notify } from "@/lib/notify";

export function AddCourierModal({ isOpen, onClose, onCourierCreated }) {
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageMode, setImageMode] = useState("upload"); // 'upload' | 'url'
  const [ratePerKg, setRatePerKg] = useState("");
  const [rateHalfKg, setRateHalfKg] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      notify.warning("Please select a valid image file (PNG, JPG, WEBP, etc.)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      notify.warning("Image size must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const res = await courierService.uploadImage(file);
      const uploadedUrl = res.data?.imageUrl || res.imageUrl;
      if (uploadedUrl) {
        setImageUrl(uploadedUrl);
        notify.success("Courier logo uploaded successfully!");
      } else {
        notify.error("Upload succeeded but image URL was missing.");
      }
    } catch (error) {
      console.error("Courier image upload error:", error);
      notify.error(error.message || "Failed to upload image.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClearImage = () => {
    setImageUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      notify.warning("Courier company name is required.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await courierService.createCourier(
        name.trim(),
        imageUrl.trim(),
        Number(ratePerKg) || 0,
        Number(rateHalfKg) || 0
      );
      if (res.error === false) {
        notify.success("Courier company added successfully!");
        setName("");
        setImageUrl("");
        setRatePerKg("");
        setRateHalfKg("");
        setImageMode("upload");
        if (onCourierCreated) onCourierCreated(res.data);
        onClose();
      } else {
        notify.error(res.message || "Failed to add courier company.");
      }
    } catch (error) {
      console.error("Create courier error:", error);
      notify.error(error.message || "Error adding courier company.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-6 overflow-hidden flex flex-col border border-slate-100 animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
          <div>
            <h3 className="font-bold text-slate-900 text-[16px]">Add Courier Company</h3>
            <p className="text-[12px] text-slate-500 mt-0.5">Name and optional logo, shown to customers when they pick a courier.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 p-1.5 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">

          {/* Courier Name */}
          <div>
            <label className="block text-[12px] font-bold text-slate-700 mb-1.5">
              Courier Company Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full h-10 px-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-[13px] text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              placeholder="e.g. DTDC, Blue Dart"
            />
          </div>

          {/* Image Selection (Upload vs URL) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12px] font-bold text-slate-700">Courier Logo (Optional)</label>

              {/* Mode Switcher Tabs */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setImageMode("upload")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                    imageMode === "upload"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Upload size={12} /> Local File
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode("url")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                    imageMode === "url"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <LinkIcon size={12} /> Link (URL)
                </button>
              </div>
            </div>

            {/* Input according to selected mode */}
            {imageMode === "upload" ? (
              imageUrl ? (
                <div className="relative w-full h-36 bg-slate-50/70 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center p-3 group">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="courier-image-upload-change"
                    disabled={isUploading}
                  />
                  <img
                    src={imageUrl}
                    alt="Courier logo preview"
                    className="max-h-full max-w-full object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://placehold.co/240x120?text=Invalid+Image+URL";
                    }}
                  />
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                    <label
                      htmlFor="courier-image-upload-change"
                      className="px-2.5 py-1 text-[11px] font-semibold bg-white/95 hover:bg-white text-slate-700 hover:text-blue-600 rounded-lg shadow-sm border border-slate-200 cursor-pointer transition-colors flex items-center gap-1"
                      title="Upload different image"
                    >
                      <Upload size={12} /> Change
                    </label>
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="p-1.5 bg-white/95 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg shadow-sm border border-slate-200 transition-colors"
                      title="Remove image"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="courier-image-upload"
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="courier-image-upload"
                    className={`w-full border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all ${
                      isUploading
                        ? "border-blue-300 bg-blue-50/40 cursor-wait"
                        : "border-slate-200 hover:border-blue-400 hover:bg-slate-50/50 bg-slate-50/30"
                    }`}
                  >
                    {isUploading ? (
                      <div className="flex items-center gap-2 text-[12px] text-blue-600 font-semibold py-3">
                        <Loader2 size={18} className="animate-spin" /> Uploading image...
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-center py-1">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1 shadow-sm">
                          <Upload size={18} />
                        </div>
                        <span className="text-[13px] font-semibold text-slate-700">Click to choose courier logo</span>
                        <span className="text-[11px] text-slate-400">PNG, JPG, WEBP up to 5MB</span>
                      </div>
                    )}
                  </label>
                </div>
              )
            ) : (
              <div className="space-y-2.5">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  className="w-full h-10 px-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-[13px] text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="Paste image link e.g. https://example.com/logo.png"
                />

                {imageUrl && (
                  <div className="relative w-full h-32 bg-slate-50/70 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center p-3 group">
                    <img
                      src={imageUrl}
                      alt="Courier logo preview"
                      className="max-h-full max-w-full object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://placehold.co/240x120?text=Invalid+Image+URL";
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="absolute top-2 right-2 p-1.5 bg-white/95 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg shadow-sm border border-slate-200 transition-colors"
                      title="Remove image"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Billing Rates (Section 11) */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                Rate per Kg (₹)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={ratePerKg}
                onChange={e => setRatePerKg(e.target.value)}
                placeholder="e.g. 60"
                className="w-full h-10 px-3 bg-slate-50/50 border border-slate-200 rounded-xl text-[13px] font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Standard 1st Kg</span>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                Rate / 0.5 Kg (₹)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={rateHalfKg}
                onChange={e => setRateHalfKg(e.target.value)}
                placeholder="e.g. 35"
                className="w-full h-10 px-3 bg-slate-50/50 border border-slate-200 rounded-xl text-[13px] font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Half-Kg increment</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isUploading || isSaving}
              className="px-5 py-2 text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              {isSaving ? <Loader2 size={15} className="animate-spin" /> : null}
              {isSaving ? "Saving..." : "Save Courier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
