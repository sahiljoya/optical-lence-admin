import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Upload, Lock, ChevronRight, BellRing } from "lucide-react";
import { listSuperMasters } from "@/services/purchaseApi";
import { hasPermission } from "@/lib/permissions";
import { PurchasingShell, Loading, Empty, ErrorNote, Pill, useLoad, btnPrimary, thCls, tdCls, tableHead, fmtDate } from "./shared";
import { UploadSuperMasterModal } from "./UploadSuperMasterModal";

// The first page of Purchasing: every Super Master, and the button to upload one.
export function SuperMasters() {
  const { data, loading, error } = useLoad(listSuperMasters);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const canUpload = hasPermission("MANAGE_SUPER_MASTER");
  const masters = data || [];
  const open = (id) => navigate({ to: "/purchasing/super-masters/$id", params: { id } });

  return (
    <PurchasingShell
      icon={Upload}
      title="Super Masters"
      subtitle="Open a Super Master to see its Product Masters or to make a new one."
      actions={canUpload && <button type="button" className={btnPrimary} onClick={() => setUploading(true)}><Upload size={15} /> Upload Super Master</button>}
    >
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] text-slate-600">
        <Lock size={14} className="mt-0.5 shrink-0 text-slate-500" />
        <span>A Super Master is the standard mix of powers for a range. It comes from an Excel or PDF file and cannot be edited — to change it, upload a new file.</span>
      </div>

      {loading && !data && <Loading />}
      {error && <ErrorNote>{error}</ErrorNote>}
      {data && (
        <div className="vw-card overflow-hidden">
          {masters.length === 0 ? <Empty>No Super Masters yet. Upload the first file.</Empty> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[760px]" style={{ borderCollapse: "collapse" }}>
                <thead style={tableHead}>
                  <tr>
                    <th className={thCls}>Super Master</th>
                    <th className={thCls}>Lens type</th>
                    <th className={thCls}>Index · Dia</th>
                    <th className={`${thCls} text-right`}>Product Masters</th>
                    <th className={thCls}>Last upload</th>
                    <th className={thCls}><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody>
                  {masters.map((m) => (
                    <tr key={m.id} onClick={() => open(m.id)} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/40 cursor-pointer">
                      <td className={tdCls}>
                        <button type="button" onClick={(e) => { e.stopPropagation(); open(m.id); }} className="font-bold text-blue-700 hover:underline text-left">{m.code} · {m.title}</button>
                        <div className="text-[11px] text-slate-500 tabular-nums">{m.range_text}</div>
                      </td>
                      <td className={tdCls}>{m.lens_types.join(", ")}</td>
                      <td className={tdCls}>{m.index ?? "Any"} · {m.diameter ? `${m.diameter} mm` : "Any"}</td>
                      <td className={`${tdCls} text-right`}>
                        <span className="tabular-nums font-semibold text-slate-900">{m.product_masters}</span>
                        {m.alerts > 0 && <span className="ml-2"><Pill tone="red"><BellRing size={11} className="mr-1" />{m.alerts} alert</Pill></span>}
                      </td>
                      <td className={tdCls}>
                        <div className="text-slate-800 truncate max-w-[200px]" title={m.file_name}>v{m.version} · {m.file_name}</div>
                        <div className="text-[11px] text-slate-500">{m.uploaded_by} · {fmtDate(m.uploaded_at)}</div>
                      </td>
                      <td className={`${tdCls} text-right`}><ChevronRight size={18} className="text-slate-400 inline" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {uploading && (
        <UploadSuperMasterModal
          onClose={() => setUploading(false)}
          onSaved={(saved) => { setUploading(false); open(saved.id); }}
        />
      )}
    </PurchasingShell>
  );
}
