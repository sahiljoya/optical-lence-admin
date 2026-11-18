import { useRef, useState } from "react";
import { FileSpreadsheet, FileText, UploadCloud, Loader2, Check, Lock } from "lucide-react";
import { readSuperMasterFile, saveSuperMaster, LENS_TYPES, ACCEPTED_MASTER_FILES, cellKey } from "@/services/purchaseApi";
import { notify } from "@/lib/notify";
import { Modal, PowerMatrix, btnPrimary, btnSecondary, inputCls, labelCls, fmtNum } from "./shared";

function Steps({ step }) {
  const items = ["Choose the file", "Check the grid and say what it is for"];
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {items.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <li key={label} className="flex items-center gap-2">
            {i > 0 && <span className="w-6 h-px bg-slate-300" aria-hidden="true" />}
            <span className={`grid place-items-center w-6 h-6 rounded-full text-[11px] font-bold ${done ? "bg-emerald-600 text-white" : active ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>
              {done ? <Check size={13} /> : n}
            </span>
            <span className={`text-[12px] font-semibold ${active ? "text-slate-900" : "text-slate-500"}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

// Upload a Super Master from an Excel or PDF file: 1. choose the file, 2. check the grid read from
// it and say what it is for (lens type, range, index, diameter). A Super Master is never edited
// after this — changing it means uploading a new file, which becomes a new version.
export function UploadSuperMasterModal({ replace = null, onClose, onSaved }) {
  const fileRef = useRef(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState(() => ({
    code: replace?.code || "",
    title: replace?.title || "",
    lens_types: replace?.lens_types || [],
    index: replace?.index ?? "",
    diameter: replace?.diameter ?? "",
    axis: replace?.axis ?? "",
  }));

  const read = async (file) => {
    if (!file) return;
    setReading(true);
    try {
      const result = await readSuperMasterFile(file);
      setPreview(result);
      if (!replace) setForm((f) => ({ ...f, code: f.code || result.guess.code, title: f.title || result.guess.title }));
    } catch (e) {
      notify.error(e.message);
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const toggleLensType = (type) => setForm((f) => ({
    ...f,
    lens_types: f.lens_types.includes(type) ? f.lens_types.filter((t) => t !== type) : [...f.lens_types, type],
  }));

  const save = async () => {
    setSaving(true);
    try {
      const saved = await saveSuperMaster({ ...form, replaceId: replace?.id, preview });
      notify.success(replace ? `${saved.code} saved as version ${saved.version}.` : `Super Master ${saved.code} uploaded.`);
      onSaved(saved);
    } catch (e) {
      notify.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const ratioSum = preview ? Object.values(preview.cells).reduce((s, v) => s + v, 0) : 0;
  const missing = [!form.lens_types.length && "lens type", !replace && !form.code.trim() && "master code"].filter(Boolean);

  return (
    <Modal
      wide={!!preview}
      title={replace ? `Upload a new version of ${replace.code}` : "Upload a Super Master"}
      subtitle={replace
        ? `Saved as version ${replace.version + 1}. Older versions are kept. Product Masters keep their version until someone updates them.`
        : "From an Excel or PDF file. After saving, nobody can edit it — a change means uploading a new file."}
      onClose={onClose}
      footer={(
        <>
          {missing.length > 0 && preview && <span className="mr-auto self-center text-[12px] text-amber-700">Still needed: {missing.join(", ")}</span>}
          {preview && <button type="button" className={btnSecondary} onClick={() => setPreview(null)}>Choose another file</button>}
          <button type="button" className={btnSecondary} onClick={onClose}>Cancel</button>
          {preview && (
            <button type="button" className={btnPrimary} disabled={saving || missing.length > 0} onClick={save}>
              {saving && <Loader2 size={14} className="animate-spin" />} {replace ? "Save new version" : "Save Super Master"}
            </button>
          )}
        </>
      )}
    >
      <Steps step={preview ? 2 : 1} />

      {!preview && (
        <>
          <label
            htmlFor="sm-file"
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); read(e.dataTransfer.files?.[0]); }}
            className={`flex flex-col items-center justify-center text-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 cursor-pointer transition-colors ${dragging ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"}`}
          >
            {reading ? <Loader2 size={28} className="text-blue-600 animate-spin" /> : <UploadCloud size={28} className="text-blue-600" />}
            <span className="text-[14px] font-bold text-slate-900">{reading ? "Reading the file..." : "Drop the file here, or click to choose"}</span>
            <span className="text-[12px] text-slate-500 flex items-center gap-3">
              <span className="inline-flex items-center gap-1"><FileSpreadsheet size={13} /> Excel (.xlsx, .xls, .csv)</span>
              <span className="inline-flex items-center gap-1"><FileText size={13} /> PDF</span>
            </span>
            <span className="text-[11px] text-slate-500 max-w-sm">Powers down the side (SPH), cylinder or ADD across, a ratio in each cell — the same layout as the master files today.</span>
            <input id="sm-file" ref={fileRef} type="file" accept={ACCEPTED_MASTER_FILES} className="sr-only" onChange={(e) => read(e.target.files?.[0])} disabled={reading} />
          </label>
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-[12px] text-slate-600">
            <b className="text-slate-800">Next step:</b> you check the grid and fill what this master is for — <b>lens type</b>, <b>index</b> and <b>diameter</b>. The <b>range</b> is read from the file.
          </div>
        </>
      )}

      {preview && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
          <div className="min-w-0 space-y-2">
            <div className="text-[13px] text-slate-700">
              Read from <b className="text-slate-900">{preview.file_name}</b> ({preview.file_type}) · {preview.rows.length * preview.cols.length} powers · ratios add up to {fmtNum(ratioSum)}
            </div>
            <PowerMatrix rows={preview.rows} cols={preview.cols} colAxis={preview.col_axis} value={(r, c) => preview.cells[cellKey(r, c)] ?? 0} maxHeight="50vh" />
            <p className="text-[12px] text-slate-500">
              Check every number against the file before saving. Every power in the grid is part of the range, even with ratio 0.
              <span className="text-amber-700"> Sample preview: reading real files comes with the backend.</span>
            </p>
          </div>

          <div className="space-y-4">
            <section className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 space-y-3">
              <div>
                <h4 className="text-[13px] font-bold text-slate-900">What is this master for?</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">A price line can use this master only when all four match.</p>
              </div>

              <fieldset>
                <legend className={labelCls}>1. Lens type <span className="text-rose-500">*</span></legend>
                <div className="flex flex-wrap gap-1.5">
                  {LENS_TYPES.map((t) => (
                    <label key={t} className={`h-8 px-2.5 rounded-lg border text-[12px] font-semibold inline-flex items-center gap-1 cursor-pointer bg-white ${form.lens_types.includes(t) ? "border-blue-500 text-blue-800 ring-1 ring-blue-200" : "border-slate-200 text-slate-600"}`}>
                      <input type="checkbox" className="sr-only" checked={form.lens_types.includes(t)} onChange={() => toggleLensType(t)} />
                      {form.lens_types.includes(t) && <Check size={12} />} {t}
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">A KT master can also serve progressive: tick both.</p>
              </fieldset>

              <div>
                <span className={labelCls}>2. Range</span>
                <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] font-semibold text-slate-900 tabular-nums">
                  {preview.range_text}
                  <div className="text-[11px] font-normal text-slate-500 mt-0.5 flex items-center gap-1"><Lock size={11} /> Read from the file · step {preview.step.toFixed(2)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls} htmlFor="sm-index">3. Index</label>
                  <input id="sm-index" type="number" step="0.01" className={inputCls} value={form.index} onChange={(e) => setForm({ ...form, index: e.target.value })} placeholder="Any" />
                </div>
                <div>
                  <label className={labelCls} htmlFor="sm-dia">4. Diameter</label>
                  <input id="sm-dia" type="number" className={inputCls} value={form.diameter} onChange={(e) => setForm({ ...form, diameter: e.target.value })} placeholder="Any (mm)" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">Fill index and diameter only if the file heading names them. Empty = fits any index or diameter.</p>
            </section>

            <section className="space-y-3">
              <h4 className="text-[13px] font-bold text-slate-900">Name it</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls} htmlFor="sm-code">Code {!replace && <span className="text-rose-500">*</span>}</label>
                  <input id="sm-code" className={inputCls} value={form.code} disabled={!!replace} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="M05" />
                </div>
                <div>
                  <label className={labelCls} htmlFor="sm-axis">Axis</label>
                  <select id="sm-axis" className={inputCls} value={form.axis} onChange={(e) => setForm({ ...form, axis: e.target.value })}>
                    <option value="">None</option>
                    {[45, 90, 135, 180].map((a) => <option key={a} value={a}>{a}°</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls} htmlFor="sm-title">Name</label>
                <input id="sm-title" className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="−6/−2" />
              </div>
            </section>
          </div>
        </div>
      )}
    </Modal>
  );
}
