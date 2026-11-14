import React, { useState, useRef } from "react";
import { Upload, Link as LinkIcon, Trash2, Loader2 } from "lucide-react";
import { uploadImageApi } from "@/config/apiClient";
import { notify } from "@/lib/notify";

export const ImageUploadInput = ({
  label = "Product Envelope Photo",
  value = "",
  onChange,
  id = "image-upload-input",
  helperText = "Upload packet photo from your computer (Max 5MB) or enter an image link.",
  className = "",
}) => {
  const [imageMode, setImageMode] = useState("upload");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

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
      const res = await uploadImageApi(file);
      const uploadedUrl = res.data?.imageUrl || res.imageUrl;
      if (uploadedUrl) {
        onChange(uploadedUrl);
        notify.success("Image uploaded successfully!");
      } else {
        notify.error("Upload succeeded but image URL was missing.");
      }
    } catch (error) {
      console.error("Image upload error:", error);
      notify.error(error.message || "Failed to upload image.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClear = () => {
    onChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Header with Label and Mode Toggle Tabs */}
      <div className="flex items-center justify-between gap-2">
        <label className="block text-[11px] sm:text-xs font-bold text-slate-700">
          {label}
        </label>

        <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] sm:text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setImageMode("upload")}
            className={`flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md transition-all cursor-pointer ${
              imageMode === "upload"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Upload size={11} /> File
          </button>
          <button
            type="button"
            onClick={() => setImageMode("url")}
            className={`flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md transition-all cursor-pointer ${
              imageMode === "url"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <LinkIcon size={11} /> Link
          </button>
        </div>
      </div>

      {/* Upload Mode */}
      {imageMode === "upload" ? (
        value ? (
          /* Preview with Change / Remove actions */
          <div className="flex items-center gap-3 p-2 sm:p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id={`${id}-change`}
              disabled={isUploading}
            />
            <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-0.5 shadow-2xs">
              <img
                src={value}
                alt="Product preview"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "https://placehold.co/100x100?text=Invalid";
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-mono text-slate-600 truncate">{value}</p>
              <div className="flex items-center gap-2 mt-1">
                <label
                  htmlFor={`${id}-change`}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/70 px-2 py-0.5 rounded cursor-pointer transition-colors"
                >
                  <Upload size={10} /> Change
                </label>
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/70 px-2 py-0.5 rounded cursor-pointer transition-colors"
                >
                  <Trash2 size={10} /> Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Upload Dropzone / Button */
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id={id}
              disabled={isUploading}
            />
            <label
              htmlFor={id}
              className={`w-full border-2 border-dashed rounded-xl p-2.5 sm:p-3 flex items-center justify-center gap-2.5 cursor-pointer transition-all ${
                isUploading
                  ? "border-blue-300 bg-blue-50/40 cursor-wait"
                  : "border-slate-200 hover:border-blue-400 hover:bg-slate-50/60 bg-slate-50/30"
              }`}
            >
              {isUploading ? (
                <div className="flex items-center gap-2 text-[11px] sm:text-xs text-blue-600 font-semibold py-0.5">
                  <Loader2 size={14} className="animate-spin" /> Uploading to Cloudinary...
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-600 font-medium">
                  <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Upload size={13} />
                  </div>
                  <span>Choose packet photo from computer</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Max 5MB)</span>
                </div>
              )}
            </label>
          </div>
        )
      ) : (
        /* URL Input Mode */
        <div className="flex items-center gap-2">
          <input
            type="url"
            placeholder="https://... (direct image link)"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-9 sm:h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs transition-all"
          />
          {value ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <img
                src={value}
                alt="Preview"
                className="w-9 h-9 rounded-lg object-contain border border-slate-200 bg-white"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "https://placehold.co/100x100?text=Invalid";
                }}
              />
              <button
                type="button"
                onClick={handleClear}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Clear image URL"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ) : null}
        </div>
      )}

      {helperText && !value && (
        <p className="text-[10px] text-slate-400 mt-0.5">{helperText}</p>
      )}
    </div>
  );
};
