import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { Upload, ArrowLeft, Lock, FileText } from "lucide-react";
import { getSuperMaster, getPurchaseSettings, cellKey } from "@/services/purchaseApi";
import { hasPermission } from "@/lib/permissions";
import {
  PurchasingShell, Loading, ErrorNote, Card, Pill, BigNumber, PowerMatrix, Segmented, SpeedLegend, speedBand, useLoad,
  btnPrimary, btnSecondary, fmtDate, fmtNum, fmtPower,
} from "./shared";
import { UploadSuperMasterModal } from "./UploadSuperMasterModal";

export function SuperMasterView() {
  const { id } = useParams({ strict: false });
  const { data, loading, error, reload } = useLoad(() => Promise.all([getSuperMaster(id), getPurchaseSettings()]), [id]);
  const [mode, setMode] = useState("ratio");
  const [versionShown, setVersionShown] = useState(null);
  const [uploading, setUploading] = useState(false);
  const canUpload = hasPermission("MANAGE_SUPER_MASTER");

  if (loading && !data) return <PurchasingShell icon={Upload} title="Super Master"><Loading /></PurchasingShell>;
  if (error || !data) return <PurchasingShell icon={Upload} title="Super Master"><ErrorNote>{error || "Not found."}</ErrorNote></PurchasingShell>;

  const [master, settings] = data;
  const shown = master.versions.find((v) => v.version === (versionShown ?? master.version)) || master.versions[0];
  const isCurrent = shown.version === master.version;
  const ratioSum = Object.values(shown.cells).reduce((s, v) => s + v, 0);
  const showSpeed = mode === "speed" && isCurrent;

  return (
    <PurchasingShell
      icon={Upload}
      title={`${master.code} · ${master.title}`}
      subtitle={`Lens type: ${master.lens_types.join(", ")} · Range: ${master.range_text} · Index: ${master.index ?? "any"} · Diameter: ${master.diameter ? `${master.diameter} mm` : "any"}${master.axis ? ` · Axis ${master.axis}°` : ""}`}
      actions={(
        <>
          <Link to="/purchasing/super-masters" className={btnSecondary}><ArrowLeft size={15} /> All Super Masters</Link>
          {canUpload && <button type="button" className={btnPrimary} onClick={() => setUploading(true)}><Upload size={15} /> Upload new version</button>}
        </>
      )}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <BigNumber label="Version" value={`v${master.version}`} hint={`Uploaded ${fmtDate(master.uploaded_at)} by ${master.uploaded_by}`} />
        <BigNumber label="Powers in range" value={master.powers} hint="Including powers with ratio 0" />
        <BigNumber label="Ratios add up to" value={fmtNum(ratioSum)} hint="A ratio, not an order" />
        <BigNumber label="Product Masters" value={master.product_masters.length} hint="Made from this master" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4 items-start">
        <Card
          className="min-w-0"
          title={isCurrent ? "Ratio per power" : `Ratio per power — old version v${shown.version}`}
          subtitle={showSpeed ? "Pairs sold per month for each power, across every Product Master using this master." : "For every 100 pairs of the top power, how many of each other power to keep."}
          actions={(
            <Segmented
              label="What the grid shows"
              value={isCurrent ? mode : "ratio"}
              onChange={setMode}
              options={isCurrent ? [{ id: "ratio", label: "Ratio" }, { id: "speed", label: "Selling speed" }] : [{ id: "ratio", label: "Ratio" }]}
            />
          )}
        >
          <div className="mb-3 flex items-center gap-2 text-[12px] text-slate-500">
            <Lock size={13} /> Read-only. Upload a new file to change it.
          </div>
          <PowerMatrix
            rows={shown.rows || master.rows}
            cols={shown.cols || master.cols}
            colAxis={master.col_axis}
            value={(r, c) => {
              const k = cellKey(r, c);
              if (showSpeed) return Math.round((master.speed[k] || 0) * 10) / 10;
              return shown.cells[k] ?? 0;
            }}
            cellBg={showSpeed ? (r, c, v) => speedBand(settings.speed_bands, v)?.colour || "#ffffff" : undefined}
            cellTitle={(r, c) => {
              const k = cellKey(r, c);
              return `${fmtPower(r)} / ${fmtPower(c)} · ratio ${shown.cells[k] ?? 0}${isCurrent ? ` · about ${(master.speed[k] || 0).toFixed(1)} pairs/month` : ""}`;
            }}
          />
          {showSpeed && <div className="mt-3"><SpeedLegend bands={settings.speed_bands} /></div>}
        </Card>

        <aside className="space-y-4">
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

          <Card title="Product Masters made from it">
            {master.product_masters.length === 0 ? (
              <p className="text-[12px] text-slate-500">None yet.</p>
            ) : (
              <ul className="space-y-2">
                {master.product_masters.map((p) => (
                  <li key={p.id}>
                    <Link to="/purchasing/product-masters/$id" params={{ id: p.id }} className="block rounded-lg border border-slate-200 px-3 py-2 hover:border-blue-300 hover:bg-slate-50">
                      <div className="text-[12px] font-bold text-slate-900">{p.product}</div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-between gap-2">
                        <span>{p.range_label} · total {fmtNum(p.total)}</span>
                        {p.version_used !== master.version ? <span className="text-amber-700 font-semibold">uses v{p.version_used}</span> : <span>v{p.version_used}</span>}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
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
