import { AlertTriangle, HelpCircle } from "lucide-react";

// Presentational popup used by the useConfirm() hook — a proper Accept/Reject modal in place
// of the native window.confirm(), styled consistently with the rest of the app's modals.
export function ConfirmDialog({ title, message, acceptLabel = "Confirm", rejectLabel = "Cancel", danger = false, onAccept, onReject }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onReject}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className={`px-5 py-4 border-b border-slate-100 flex items-center gap-2 ${danger ? "bg-rose-50" : "bg-slate-50/50"}`}>
          {danger ? <AlertTriangle size={18} className="text-rose-500 shrink-0" /> : <HelpCircle size={18} className="text-blue-500 shrink-0" />}
          <h3 className={`font-bold text-[15px] ${danger ? "text-rose-800" : "text-slate-800"}`}>{title || (danger ? "Are you sure?" : "Confirm")}</h3>
        </div>
        <div className="p-5 text-[13px] text-slate-600 leading-relaxed">
          {message}
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onReject} className="px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
            {rejectLabel}
          </button>
          <button
            onClick={onAccept}
            className={`px-4 py-2 text-[13px] font-medium text-white rounded-lg transition-colors ${danger ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {acceptLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
