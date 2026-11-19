import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Filter,
  Image as ImageIcon,
  Video as VideoIcon,
  Trash2,
  Edit2,
  Eye,
  Loader2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  Play,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { mediaApi } from "@/services/mediaService";
import { MediaModal } from "@/components/media/MediaModal";
import { MediaPreviewModal } from "@/components/media/MediaPreviewModal";
import { notify } from "@/lib/notify";
import { useConfirm } from "@/hooks/useConfirm";
import { hasPermission } from "@/lib/permissions";
import "@/styles/veriwide.css";

export function Media() {
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // "all" | "poster" | "video"
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "active" | "inactive"

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedia, setEditingMedia] = useState(null);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const { confirm, confirmDialog } = useConfirm();
  const canManage = hasPermission("MANAGE_PRODUCTS");

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch media on filter or pagination changes
  useEffect(() => {
    fetchMedia();
  }, [page, limit, typeFilter, statusFilter, debouncedSearch]);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
      };

      if (typeFilter !== "all") params.type = typeFilter;
      if (statusFilter === "active") params.is_active = true;
      if (statusFilter === "inactive") params.is_active = false;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const res = await mediaApi.getMediaList(params);
      if (res && res.error === false) {
        const payload = res.data || {};
        setMediaList(payload?.list || []);
        setTotal(payload?.total || 0);
        setTotalPages(payload?.totalPages || 1);
      } else {
        notify.error(res?.message || "Failed to load marketing media.");
      }
    } catch (error) {
      console.error("Error fetching media:", error);
      notify.error(error.message || "Error fetching marketing media.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingMedia(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item, e) => {
    if (e) e.stopPropagation();
    setEditingMedia(item);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (item, e) => {
    if (e) e.stopPropagation();
    if (!canManage) {
      notify.warning("You do not have permission to edit media.");
      return;
    }

    setTogglingId(item._id);
    const newStatus = !item.is_active;

    try {
      const res = await mediaApi.updateMedia(item._id, { is_active: newStatus });
      if (res && res.error === false) {
        setMediaList((prev) =>
          prev.map((m) => (m._id === item._id ? { ...m, is_active: newStatus } : m)),
        );
        notify.success(
          newStatus
            ? `"${item.title}" activated — visible in mobile app.`
            : `"${item.title}" deactivated — hidden from customers.`,
        );
      } else {
        notify.error(res?.message || "Failed to update status.");
      }
    } catch (error) {
      console.error("Error toggling status:", error);
      notify.error("Error updating media status.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (item, e) => {
    if (e) e.stopPropagation();
    if (!canManage) {
      notify.warning("You do not have permission to delete media.");
      return;
    }

    const ok = await confirm(`Are you sure you want to permanently delete "${item.title}"?`, {
      title: "Delete Marketing Media",
      acceptLabel: "Delete Media",
      rejectLabel: "Cancel",
      danger: true,
    });

    if (!ok) return;

    try {
      const res = await mediaApi.deleteMedia(item._id);
      if (res && res.error === false) {
        notify.success("Marketing media deleted successfully.");
        // Refresh list
        fetchMedia();
      } else {
        notify.error(res?.message || "Failed to delete media.");
      }
    } catch (error) {
      console.error("Error deleting media:", error);
      notify.error(error.message || "Error deleting media.");
    }
  };

  const handleSaved = () => {
    fetchMedia();
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-8">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mt-1 sm:mt-2">
        <div>
          <h1 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Marketing Media & Posters
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              {total} Total
            </span>
          </h1>
          <p className="text-[11px] sm:text-xs md:text-[13px] text-slate-500 mt-0.5">
            Manage promotional posters, banners, and lens training videos for the customer mobile
            app.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-[13px] font-semibold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus size={16} /> Add Media / Poster
          </button>
        )}
      </div>

      {/* 2. Controls Bar: Tabs, Status, Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-xs">
        {/* Left: Type Segmented Tabs */}
        <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setTypeFilter("all");
              setPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              typeFilter === "all"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers size={13} /> All Media
          </button>
          <button
            type="button"
            onClick={() => {
              setTypeFilter("poster");
              setPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              typeFilter === "poster"
                ? "bg-white text-amber-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ImageIcon size={13} className={typeFilter === "poster" ? "text-amber-600" : ""} />{" "}
            Posters
          </button>
          <button
            type="button"
            onClick={() => {
              setTypeFilter("video");
              setPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              typeFilter === "video"
                ? "bg-white text-purple-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <VideoIcon size={13} className={typeFilter === "video" ? "text-purple-600" : ""} />{" "}
            Videos
          </button>
        </div>

        {/* Right: Status filter & Search bar */}
        <div className="flex items-center gap-2 flex-1 md:justify-end">
          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* Search Input */}
          <div className="relative flex-1 md:max-w-xs">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 3. Media Grid View */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
          <Loader2 size={32} className="animate-spin text-blue-600" />
          <p className="text-xs sm:text-sm font-medium">Loading marketing media...</p>
        </div>
      ) : mediaList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 sm:p-14 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            <ImageIcon size={28} />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800">
            No Marketing Media Found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm || typeFilter !== "all" || statusFilter !== "all"
              ? "Try adjusting your search terms or filters to find what you are looking for."
              : "No posters or training videos have been uploaded yet. Click below to add the first one."}
          </p>
          {canManage && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={15} /> Upload Media
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {mediaList.map((item) => {
            const isPoster = item.type === "poster";
            const resourceCount = item.urls?.length || 0;
            const isToggling = togglingId === item._id;

            return (
              <div
                key={item._id}
                onClick={() => setPreviewMedia(item)}
                className="group bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 overflow-hidden flex flex-col cursor-pointer"
              >
                {/* Media Image / Thumbnail */}
                <div className="relative aspect-4/3 w-full bg-slate-900 overflow-hidden">
                  <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src =
                        "https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&q=80&w=400";
                    }}
                  />

                  {/* Top Overlay Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
                    {/* Type Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm pointer-events-auto ${
                        isPoster
                          ? "bg-amber-500/90 text-white backdrop-blur-xs"
                          : "bg-purple-600/90 text-white backdrop-blur-xs"
                      }`}
                    >
                      {isPoster ? <ImageIcon size={11} /> : <VideoIcon size={11} />}
                      {item.type}
                    </span>

                    {/* Active / Inactive Status Pill */}
                    <button
                      type="button"
                      disabled={!canManage || isToggling}
                      onClick={(e) => handleToggleStatus(item, e)}
                      title={item.is_active ? "Click to deactivate" : "Click to activate"}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-sm transition-all pointer-events-auto cursor-pointer ${
                        item.is_active
                          ? "bg-emerald-500 text-white hover:bg-emerald-600"
                          : "bg-slate-700/80 text-slate-200 hover:bg-slate-700"
                      }`}
                    >
                      {isToggling ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : item.is_active ? (
                        <CheckCircle2 size={10} />
                      ) : (
                        <XCircle size={10} />
                      )}
                      {item.is_active ? "Active" : "Hidden"}
                    </button>
                  </div>

                  {/* Video Play Overlay Icon if Video */}
                  {!isPoster && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors pointer-events-none">
                      <div className="w-11 h-11 rounded-full bg-white/90 group-hover:bg-white text-purple-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play size={20} className="ml-0.5 fill-purple-600" />
                      </div>
                    </div>
                  )}

                  {/* Resource Count Badge Bottom Right */}
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-semibold text-white pointer-events-none">
                    {resourceCount} {resourceCount === 1 ? "file" : "files"}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3
                      className="text-xs sm:text-[13px] font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors"
                      title={item.title}
                    >
                      {item.title}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
                      Added on{" "}
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </p>
                  </div>

                  {/* Actions Footer */}
                  <div
                    className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setPreviewMedia(item)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      <Eye size={13} /> Preview
                    </button>

                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEdit(item, e)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit media"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(item, e)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete media"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            Showing Page <span className="font-semibold text-slate-800">{page}</span> of{" "}
            <span className="font-semibold text-slate-800">{totalPages}</span> ({total} media items)
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors flex items-center gap-1 cursor-pointer"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* 5. Modals */}
      <MediaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        media={editingMedia}
        onSaved={handleSaved}
      />

      <MediaPreviewModal
        isOpen={!!previewMedia}
        onClose={() => setPreviewMedia(null)}
        media={previewMedia}
      />

      {confirmDialog}
    </div>
  );
}
