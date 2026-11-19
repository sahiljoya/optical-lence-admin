import React, { useState } from "react";
import { X, ExternalLink, Image as ImageIcon, Video as VideoIcon, ChevronLeft, ChevronRight } from "lucide-react";

export function MediaPreviewModal({ isOpen, onClose, media }) {
  const [activeUrlIndex, setActiveUrlIndex] = useState(0);

  if (!isOpen || !media) return null;

  const isPoster = media.type === "poster";
  const allUrls = media.urls && media.urls.length > 0 ? media.urls : [media.thumbnail_url];
  const currentUrl = allUrls[activeUrlIndex] || media.thumbnail_url;

  // Helper to detect and get YouTube embed URL
  const getEmbedUrl = (url) => {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch && ytMatch[1]) {
      return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }
    return null;
  };

  const embedUrl = !isPoster ? getEmbedUrl(currentUrl) : null;
  const isDirectVideo =
    !isPoster &&
    !embedUrl &&
    (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(currentUrl) || currentUrl.includes("/video/upload/"));

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`p-1.5 rounded-lg text-xs font-bold uppercase tracking-wider shrink-0 ${
                isPoster ? "bg-amber-100 text-amber-700" : "bg-purple-100 text-purple-700"
              }`}
            >
              {isPoster ? <ImageIcon size={16} /> : <VideoIcon size={16} />}
            </span>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-800 truncate">
                {media.title}
              </h3>
              <p className="text-[11px] text-slate-400 capitalize">
                {media.type} • {allUrls.length} resource{allUrls.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentUrl && (
              <a
                href={currentUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Open original in new tab"
              >
                <ExternalLink size={17} />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Media Preview Container */}
        <div className="p-4 sm:p-6 flex-1 flex flex-col items-center justify-center bg-slate-950 overflow-hidden relative min-h-[300px] sm:min-h-[420px]">
          {isPoster ? (
            <img
              src={currentUrl}
              alt={media.title}
              className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-lg"
              onError={(e) => {
                e.target.src = media.thumbnail_url;
              }}
            />
          ) : embedUrl ? (
            <iframe
              src={embedUrl}
              title={media.title}
              className="w-full h-[320px] sm:h-[420px] rounded-lg border-0 shadow-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : isDirectVideo ? (
            <video
              src={currentUrl}
              controls
              className="max-h-[60vh] max-w-full rounded-lg shadow-lg"
              poster={media.thumbnail_url}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="text-center p-6 text-white space-y-3">
              <VideoIcon size={48} className="mx-auto text-purple-400 opacity-80" />
              <p className="text-sm font-medium text-slate-200">External Video Link</p>
              <a
                href={currentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
              >
                Watch Video <ExternalLink size={14} />
              </a>
            </div>
          )}

          {/* Navigation arrows for multiple URLs */}
          {allUrls.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setActiveUrlIndex((prev) => (prev > 0 ? prev - 1 : allUrls.length - 1))}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition-colors cursor-pointer"
                title="Previous file"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={() => setActiveUrlIndex((prev) => (prev < allUrls.length - 1 ? prev + 1 : 0))}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition-colors cursor-pointer"
                title="Next file"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail Selector if multiple URLs */}
        {allUrls.length > 1 && (
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-2 overflow-x-auto shrink-0">
            {allUrls.map((url, i) => (
              <button
                key={i}
                onClick={() => setActiveUrlIndex(i)}
                className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                  activeUrlIndex === i ? "border-blue-500 scale-105" : "border-slate-700 opacity-60 hover:opacity-100"
                }`}
              >
                {isPoster ? (
                  <img src={url} alt={`preview ${i}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center text-[10px] text-white font-bold">
                    #{i + 1}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
