import React, { useState, useEffect } from "react";
import { X, Upload, Plus, Trash2, Loader2, Image as ImageIcon, Video as VideoIcon, Link as LinkIcon } from "lucide-react";
import { mediaApi } from "@/services/mediaService";
import { uploadImageApi } from "@/config/apiClient";
import { ImageUploadInput } from "@/components/common/ImageUploadInput";
import { notify } from "@/lib/notify";

export function MediaModal({ isOpen, onClose, media = null, onSaved }) {
  const isEdit = !!media;

  const [type, setType] = useState("poster"); // "poster" | "video"
  const [title, setTitle] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [urls, setUrls] = useState([]);
  const [newUrlInput, setNewUrlInput] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingResource, setIsUploadingResource] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (media) {
        setType(media.type || "poster");
        setTitle(media.title || "");
        setThumbnailUrl(media.thumbnail_url || "");
        setUrls(Array.isArray(media.urls) ? [...media.urls] : []);
        setIsActive(media.is_active !== undefined ? media.is_active : true);
      } else {
        setType("poster");
        setTitle("");
        setThumbnailUrl("");
        setUrls([]);
        setIsActive(true);
      }
      setNewUrlInput("");
    }
  }, [isOpen, media]);

  if (!isOpen) return null;

  const handleAddUrl = (urlToAdd) => {
    const val = (urlToAdd || newUrlInput).trim();
    if (!val) return;
    if (urls.includes(val)) {
      notify.warning("This URL is already added.");
      return;
    }
    setUrls([...urls, val]);
    setNewUrlInput("");
  };

  const handleRemoveUrl = (index) => {
    setUrls(urls.filter((_, i) => i !== index));
  };

  const handleResourceFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = type === "video" ? 100 * 1024 * 1024 : 25 * 1024 * 1024;
    const maxLabel = type === "video" ? "100MB" : "25MB";

    if (file.size > maxSize) {
      notify.warning(`File size must be less than ${maxLabel}`);
      return;
    }

    setIsUploadingResource(true);
    try {
      const res = await uploadImageApi(file);
      const uploadedUrl = res.data?.imageUrl || res.imageUrl;
      if (uploadedUrl) {
        handleAddUrl(uploadedUrl);
        notify.success(`${type === "video" ? "Video" : "File"} uploaded and added to list!`);
      } else {
        notify.error("Upload succeeded but file URL was missing.");
      }
    } catch (error) {
      console.error("Resource upload error:", error);
      notify.error(error.message || "Failed to upload file.");
    } finally {
      setIsUploadingResource(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      notify.warning("Please enter a media title.");
      return;
    }

    if (!thumbnailUrl.trim()) {
      notify.warning("Please upload or enter a thumbnail image URL.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        type,
        title: title.trim(),
        thumbnail_url: thumbnailUrl.trim(),
        urls: urls.filter(Boolean),
        is_active: isActive,
      };

      let res;
      if (isEdit) {
        res = await mediaApi.updateMedia(media._id, payload);
      } else {
        res = await mediaApi.createMedia(payload);
      }

      if (res && res.error === false) {
        notify.success(isEdit ? "Marketing media updated successfully!" : "Marketing media created successfully!");
        if (onSaved) onSaved(res.data);
        onClose();
      } else {
        notify.error(res?.message || "Failed to save marketing media.");
      }
    } catch (error) {
      console.error("Save media error:", error);
      notify.error(error.message || "Error saving marketing media.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {isEdit ? "Edit Marketing Media" : "Add Marketing Media"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit ? "Update promotional poster or video details." : "Upload a new marketing poster or training video for customer app."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs sm:text-[13px]">
          {/* 1. Media Type Selector */}
          <div>
            <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1.5">
              Media Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("poster")}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  type === "poster"
                    ? "border-amber-500 bg-amber-50/60 text-amber-900 shadow-xs"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <ImageIcon size={16} className={type === "poster" ? "text-amber-600" : "text-slate-400"} />
                Promotional Poster
              </button>
              <button
                type="button"
                onClick={() => setType("video")}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  type === "video"
                    ? "border-purple-500 bg-purple-50/60 text-purple-900 shadow-xs"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <VideoIcon size={16} className={type === "video" ? "text-purple-600" : "text-slate-400"} />
                Training Video
              </button>
            </div>
          </div>

          {/* 2. Media Title */}
          <div>
            <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === "poster" ? "e.g., VeriWide Clarity Campaign Poster" : "e.g., Progressive Lens Fitting Tutorial"}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs sm:text-[13px]"
            />
          </div>

          {/* 3. Thumbnail Image */}
          <div>
            <ImageUploadInput
              label="Thumbnail / Cover Photo *"
              value={thumbnailUrl}
              onChange={(url) => setThumbnailUrl(url)}
              helperText="Upload cover image (Max 5MB) or enter an image link. Displayed on mobile app cards."
            />
          </div>

          {/* 4. URLs / Media Assets */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] sm:text-xs font-bold text-slate-700">
                {type === "poster" ? "High-Res Poster Images / Variants" : "Video URLs / File Links"}
              </label>
              <span className="text-[10px] text-slate-400">{urls.length} added</span>
            </div>

            {/* List of added URLs */}
            {urls.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                {urls.map((u, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-slate-400 shrink-0">#{idx + 1}</span>
                      <span className="text-slate-700 truncate" title={u}>
                        {u}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveUrl(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors shrink-0 cursor-pointer"
                      title="Remove URL"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add URL Row */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newUrlInput}
                onChange={(e) => setNewUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddUrl();
                  }
                }}
                placeholder={
                  type === "poster"
                    ? "Paste image link or upload file below..."
                    : "Paste YouTube / MP4 / Cloudinary link..."
                }
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => handleAddUrl()}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <Plus size={13} /> Add
              </button>
            </div>

            {/* File Upload button for posters & videos */}
            <div>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer">
                {isUploadingResource ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={13} />{" "}
                    {type === "video" ? "Upload Video File to List (MP4, WebM, MOV)" : "Upload Image File to List"}
                  </>
                )}
                <input
                  type="file"
                  accept={type === "video" ? "video/*,video/mp4,video/webm,video/quicktime" : "image/*"}
                  disabled={isUploadingResource}
                  onChange={handleResourceFileUpload}
                  className="hidden"
                />
              </label>
              {type === "video" && (
                <span className="block text-[10px] text-slate-400 mt-1">
                  Supports MP4, WebM, MOV (Max 100MB). Or paste a YouTube/CDN link above.
                </span>
              )}
            </div>
          </div>

          {/* 5. Status Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700">Active Status</label>
              <p className="text-[11px] text-slate-400">
                {isActive ? "Visible to customers on the mobile app." : "Hidden from customers."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isActive ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isSaving && <Loader2 size={13} className="animate-spin" />}
              {isEdit ? "Update Media" : "Create Media"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
