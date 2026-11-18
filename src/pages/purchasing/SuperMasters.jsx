import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Upload, Lock } from "lucide-react";
import { listSuperMasters } from "@/services/purchaseApi";
import { hasPermission } from "@/lib/permissions";
import { PurchasingShell, Loading, Empty, ErrorNote, useLoad, btnPrimary, thCls, tdCls, tableHead, fmtDate } from "./shared";
import { UploadSuperMasterModal } from "./UploadSuperMasterModal";

export function SuperMasters() {
  const { data, loading, error } = useLoad(listSuperMasters);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const canUpload = hasPermission("MANAGE_SUPER_MASTER");
  const masters = data || [];

  return (
    <PurchasingShell
      icon={Upload}
      title="Super Masters"
      subtitle="The fixed ratio of pairs across a power range — the house recipe. Uploaded from Excel or PDF and never edited."
      actions={canUpload && <button type="button" className={btnPrimary} onClick={() => setUploading(true)}><Upload size={15} /> Upload Super Master</button>}
    >
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] text-slate-600">
        <Lock size={14} className="mt-0.5 shrink-0 text-slate-500" />
        <span>Nobody can change a Super Master's numbers. To change one, upload a new file: it becomes a new version and the old ones are kept. Product Masters are made from these.</span>
      </div>

      {loading && !data && <Loading />}
      {error && <ErrorNote>{error}</ErrorNote>}
      {data && (
        <div className="vw-card overflow-hidden">
          {masters.length === 0 ? <Empty>No Super Masters yet. Upload the first file.</Empty> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[880px]" style={{ borderCollapse: "collapse" }}>
                <thead style={tableHead}>
                  <tr>
                    <th className={thCls}>Code</th>
                    <th className={thCls}>Range</th>
                    <th className={thCls}>Lens types</th>
                    <th className={thCls}>Index</th>
                    <th className={thCls}>Dia</th>
                    <th className={`${thCls} text-right`}>Powers</th>
                    <th className={`${thCls} text-right`}>Product Masters</th>
                    <th className={thCls}>Version</th>
                    <th className={thCls}>Last upload</th>
                  </tr>
                </thead>
                <tbody>
                  {masters.map((m) => (
                    <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                      <td className={tdCls}><Link to="/purchasing/super-masters/$id" params={{ id: m.id }} className="font-bold text-blue-700 hover:underline">{m.code}</Link></td>
                      <td className={tdCls}>
                        <div className="font-semibold text-slate-900">{m.title}{m.axis ? <span className="text-slate-500 font-normal"> · axis {m.axis}°</span> : null}</div>
                        <div className="text-[11px] text-slate-500 tabular-nums">{m.range_text}</div>
                      </td>
                      <td className={tdCls}>{m.lens_types.join(", ")}</td>
                      <td className={tdCls}>{m.index ?? "Any"}</td>
                      <td className={tdCls}>{m.diameter ?? "Any"}</td>
                      <td className={`${tdCls} text-right tabular-nums`}>{m.powers}</td>
                      <td className={`${tdCls} text-right tabular-nums`}>{m.product_masters}</td>
                      <td className={tdCls}>v{m.version}</td>
                      <td className={tdCls}>
                        <div className="text-slate-800 truncate max-w-[200px]" title={m.file_name}>{m.file_name}</div>
                        <div className="text-[11px] text-slate-500">{m.uploaded_by} · {fmtDate(m.uploaded_at)}</div>
                      </td>
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
          onSaved={(saved) => { setUploading(false); navigate({ to: "/purchasing/super-masters/$id", params: { id: saved.id } }); }}
        />
      )}
    </PurchasingShell>
  );
}
