import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { Upload, Plus, Lock, FileText, BellRing, ChevronRight } from "lucide-react";
import { getSuperMaster, getPurchaseSettings, cellKey } from "@/services/purchaseApi";
import { hasPermission } from "@/lib/permissions";
import {
  PurchasingShell, Loading, ErrorNote, Card, Pill, StagePill, PowerMatrix, Segmented, SpeedLegend, speedBand, useLoad,
  btnPrimary, btnSecondary, thCls, tdCls, tableHead, fmtDate, fmtNum, fmtPower,
} from "./shared";
import { UploadSuperMasterModal } from "./UploadSuperMasterModal";

function Fact({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <div className="text-[11px] font-semibold text-slate-500">{label}</div>
      <div className="text-[14px] font-bold text-slate-900 tabular-nums">{value}</div>
    </div>
  );
}

// One Super Master: its basic details, the Product Masters made from it, and its grid.
export function SuperMasterView() {
  const { id } = useParams({ strict: false });
  const { data, loading, error, reload } = useLoad(() => Promise.all([getSuperMaster(id), getPurchaseSettings()]), [id]);
  const [mode, setMode] = useState("ratio");
  const [versionShown, setVersionShown] = useState(null);
  const [uploading, setUploading] = useState(false);
  const canUpload = hasPermission("MANAGE_SUPER_MASTER");
  const canManage = hasPermission("MANAGE_PURCHASING");
  const crumbs = [{ label: "Super Masters", to: "/purchasing" }, { label: data?.[0]?.code || id }];

  if (loading && !data) return <PurchasingShell crumbs={crumbs} title="Super Master"><Loading /></PurchasingShell>;
  if (error || !data) return <PurchasingShell crumbs={crumbs} title="Super Master"><ErrorNote>{error || "Not found."}</ErrorNote></PurchasingShell>;

  const [master, settings] = data;
  const shown = master.versions.find((v) => v.version === (versionShown ?? master.version)) || master.versions[0];
  const isCurrent = shown.version === master.version;
  const showSpeed = mode === "speed" && isCurrent;

  return (
    <PurchasingShell
      crumbs={crumbs}
      title={`${master.code} · ${master.title}`}
      actions={(
        <>
          {canUpload && <button type="button" className={btnSecondary} onClick={() => setUploading(true)}><Upload size={15} /> Upload new version</button>}
          {canManage && <Link to="/purchasing/product-masters/new" search={{ sm: master.id }} className={btnPrimary}><Plus size={15} /> Create Product Master</Link>}
        </>
      )}
    >
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
        <Fact label="Lens type" value={master.lens_types.join(", ")} />
        <Fact label="Range" value={master.range_text} />
        <Fact label="Index" value={master.index ?? "Any"} />
        <Fact label="Diameter" value={master.diameter ? `${master.diameter} mm` : "Any"} />
        <Fact label="Version" value={`v${master.version} · ${fmtDate(master.uploaded_at)}`} />
      </div>

      <Card
        className="mb-4"
        title={`Product Masters made from ${master.code} (${master.product_masters.length})`}
        subtitle="Each one is for one product: the powers it takes from this Super Master and how many pieces to keep."
      >
        {master.product_masters.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center">
            <p className="text-[13px] text-slate-600 mb-3">No Product Master yet. {master.products_ready_for_pm} product{master.products_ready_for_pm === 1 ? "" : "s"} can use this Super Master.</p>
            {canManage && <Link to="/purchasing/product-masters/new" search={{ sm: master.id }} className={btnPrimary}><Plus size={15} /> Create Product Master</Link>}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-left min-w-[760px]" style={{ borderCollapse: "collapse" }}>
              <thead style={tableHead}>
                <tr>
                  <th className={thCls}>Product</th>
                  <th className={thCls}>Powers taken</th>
                  <th className={`${thCls} text-right`}>Total pieces</th>
                  <th className={`${thCls} text-right`}>We have now</th>
                  <th className={thCls}>Alert</th>
                  <th className={thCls}><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {master.product_masters.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0">
                    <td className={tdCls}>
                      <Link to="/purchasing/product-masters/$id" params={{ id: p.id }} className="font-bold text-blue-700 hover:underline">{p.product}</Link>
                      <div className="text-[11px] text-slate-500">{p.range_label} · {p.id}</div>
                    </td>
                    <td className={`${tdCls} text-[12px] tabular-nums`}>{p.taken_text}</td>
                    <td className={`${tdCls} text-right tabular-nums font-semibold text-slate-900`}>{fmtNum(p.total)}</td>
                    <td className={`${tdCls} text-right tabular-nums`}>{fmtNum(p.have)}</td>
                    <td className={tdCls}>
                      {p.alert_active ? <Pill tone="red"><BellRing size={11} className="mr-1" />Alert</Pill> : <span className="text-[12px] text-slate-500">{p.alert_text}</span>}
                      {p.open_po && <div className="mt-1"><StagePill stage={p.open_po.stage} /> <span className="text-[11px] text-slate-500">{p.open_po.po_number}</span></div>}
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <Link to="/purchasing/product-masters/$id" params={{ id: p.id }} className={`${btnSecondary} !h-8 !text-[12px]`}>Open <ChevronRight size={13} /></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4 items-start">
        <Card
          className="min-w-0"
          title={isCurrent ? "Super Master grid" : `Super Master grid — old version v${shown.version}`}
          subtitle={showSpeed ? "Pieces sold per month for each power." : "The mix of each power. These are ratios, not pieces."}
          actions={isCurrent && <Segmented label="What the grid shows" value={mode} onChange={setMode} options={[{ id: "ratio", label: "Ratio" }, { id: "speed", label: "Selling speed" }]} />}
        >
          <div className="mb-3 flex items-center gap-2 text-[12px] text-slate-500"><Lock size={13} /> Read-only. Upload a new file to change it.</div>
          <PowerMatrix
            rows={shown.rows || master.rows}
            cols={shown.cols || master.cols}
            colAxis={master.col_axis}
            value={(r, c) => (showSpeed ? Math.round((master.speed[cellKey(r, c)] || 0) * 10) / 10 : shown.cells[cellKey(r, c)] ?? 0)}
            cellBg={showSpeed ? (r, c, v) => speedBand(settings.speed_bands, v)?.colour || "#ffffff" : undefined}
            cellTitle={(r, c) => `${fmtPower(r)} / ${fmtPower(c)} · ratio ${shown.cells[cellKey(r, c)] ?? 0}`}
          />
          {showSpeed && <div className="mt-3"><SpeedLegend bands={settings.speed_bands} /></div>}
        </Card>

        <Card title="Versions" subtitle="Every upload is kept.">
          <ol className="space-y-2">
            {master.versions.map((v) => {
              const active = shown.version === v.version;
              return (
                <li key={v.version}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setVersionShown(v.version === master.version ? null : v.version)}
                    className={`w-full text-left rounded-lg border px-3 py-2 cursor-pointer ${active ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-bold text-slate-800">v{v.version}</span>
                      {v.version === master.version && <Pill tone="green">Current</Pill>}
                    </div>
                    <div className="text-[12px] text-slate-600 flex items-center gap-1 mt-0.5 truncate" title={v.file_name}><FileText size={12} className="shrink-0" /> {v.file_name}</div>
                    <div className="text-[11px] text-slate-500">{v.uploaded_by} · {fmtDate(v.at)}</div>
                  </button>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>

      {uploading && (
        <UploadSuperMasterModal
          replace={master}
          onClose={() => setUploading(false)}
          onSaved={() => { setUploading(false); setVersionShown(null); reload(); }}
        />
      )}
    </PurchasingShell>
  );
}
