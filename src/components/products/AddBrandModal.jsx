import { useState, useRef } from "react";
import { X, Upload, Link as LinkIcon, Loader2, Image as ImageIcon, Trash2 } from "lucide-react";
import { brandApi } from "@/services/productApi";
import { notify } from "@/lib/notify";

export function AddBrandModal({ isOpen, onClose, onBrandCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageMode, setImageMode] = useState("upload"); // 'upload' | 'url'
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      notify.warning("Please select a valid image file (PNG, JPG, WEBP, etc.)");
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      notify.warning("Image size must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const res = await brandApi.uploadImage(file);
      // Backend returns { error: false, message: "SUCCESS.", data: { imageUrl, imageName } }
      const uploadedUrl = res.data?.imageUrl || res.imageUrl;
      if (uploadedUrl) {
        setImageUrl(uploadedUrl);
        notify.success("Brand image uploaded successfully!");
      } else {
        notify.error("Upload succeeded but image URL was missing.");
      }
    } catch (error) {
      console.error("Brand image upload error:", error);
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
      notify.warning("Brand Name is required.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        image: imageUrl.trim()
      };

      const res = await brandApi.createBrand(payload);
      if (res.error === false) {
        notify.success("Brand created successfully!");
        // Reset state
        setName("");
        setDescription("");
        setImageUrl("");
        setImageMode("upload");
        if (onBrandCreated) {
          onBrandCreated(res.data || payload);
        }
        onClose();
      } else {
        notify.error(res.message || "Failed to create brand.");
      }
    } catch (error) {
      console.error("Create brand error:", error);
      notify.error(error.message || "Error creating brand");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-4 sm:my-6 overflow-hidden flex flex-col border border-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">Add New Brand</h3>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Define brand name and optional logo.</p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 p-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-3.5 sm:p-5 space-y-3 sm:space-y-4">
          
          {/* Brand Name */}
          <div>
            <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5">
              Brand Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full h-9 sm:h-10 px-3 sm:px-3.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs transition-all"
              placeholder="e.g. Vishal HC, Crizal, Essilor"
            />
          </div>

          {/* Image Selection (Upload vs URL) */}
          <div>
            <div className="flex items-center justify-between mb-1 sm:mb-1.5">
              <label className="text-[11px] sm:text-xs font-bold text-slate-700">Brand Logo / Image</label>
              
              {/* Mode Switcher Tabs */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] sm:text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setImageMode("upload")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    imageMode === "upload"
                      ? "bg-white text-blue-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Upload size={12} /> Local File
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode("url")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    imageMode === "url"
                      ? "bg-white text-blue-600 shadow-xs"
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
                /* Prominent clean image preview for uploaded file */
                <div className="relative w-full h-32 sm:h-36 bg-slate-50/70 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center p-3 group">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="brand-image-upload-change"
                    disabled={isUploading}
                  />
                  <img
                    src={imageUrl}
                    alt="Brand logo preview"
                    className="max-h-full max-w-full object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://placehold.co/240x120?text=Invalid+Image+URL";
                    }}
                  />
                  
                  {/* Floating Action Buttons */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                    <label
                      htmlFor="brand-image-upload-change"
                      className="px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold bg-white/95 hover:bg-white text-slate-700 hover:text-blue-600 rounded-lg shadow-xs border border-slate-200 cursor-pointer transition-colors flex items-center gap-1"
                      title="Upload different image"
                    >
                      <Upload size={12} /> Change
                    </label>
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="p-1.5 bg-white/95 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg shadow-xs border border-slate-200 transition-colors cursor-pointer"
                      title="Remove image"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ) : (
                /* Upload Dropzone */
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="brand-image-upload"
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="brand-image-upload"
                    className={`w-full border-2 border-dashed rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center cursor-pointer transition-all ${
                      isUploading 
                        ? "border-blue-300 bg-blue-50/40 cursor-wait" 
                        : "border-slate-200 hover:border-blue-400 hover:bg-slate-50/50 bg-slate-50/30"
                    }`}
                  >
                    {isUploading ? (
                      <div className="flex items-center gap-2 text-[11px] sm:text-xs text-blue-600 font-semibold py-3">
                        <Loader2 size={16} className="animate-spin" /> Uploading image to Cloudinary...
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-center py-1">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-0.5 sm:mb-1 shadow-xs">
                          <Upload size={16} className="sm:w-[18px] sm:h-[18px]" />
                        </div>
                        <span className="text-xs sm:text-[13px] font-semibold text-slate-700">Click to choose brand logo</span>
                        <span className="text-[10px] sm:text-[11px] text-slate-400">PNG, JPG, WEBP up to 5MB</span>
                      </div>
                    )}
                  </label>
                </div>
              )
            ) : (
              /* URL Mode */
              <div className="space-y-2.5">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  className="w-full h-9 sm:h-10 px-3 sm:px-3.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs transition-all"
                  placeholder="Paste image link e.g. https://example.com/logo.png"
                />

                {imageUrl && (
                  <div className="relative w-full h-32 bg-slate-50/70 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center p-3 group">
                    <img
                      src={imageUrl}
                      alt="Brand logo preview"
                      className="max-h-full max-w-full object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://placehold.co/240x120?text=Invalid+Image+URL";
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="absolute top-2 right-2 p-1.5 bg-white/95 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg shadow-xs border border-slate-200 transition-colors cursor-pointer"
                      title="Remove image"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 sm:mb-1.5">Description (Optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-xs transition-all resize-none h-18 sm:h-20"
              placeholder="Brief details about this lens brand..."
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-2.5">
            <button 
              type="button"
              onClick={onClose} 
              className="w-full sm:w-auto px-4 py-2 text-xs sm:text-[13px] font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors text-center cursor-pointer shadow-xs"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={!name.trim() || isUploading || isSaving} 
              className="w-full sm:w-auto px-5 py-2 text-xs sm:text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
              {isSaving ? "Saving..." : "Save Brand"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

