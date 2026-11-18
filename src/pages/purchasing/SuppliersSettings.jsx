import { useEffect, useState } from "react";
import { Factory, Plus, Pencil, Trash2, Save } from "lucide-react";
import { listSuppliers, saveSupplier, getPurchaseSettings, savePurchaseSettings } from "@/services/purchaseApi";
import { hasPermission } from "@/lib/permissions";
import { notify } from "@/lib/notify";
import {
  PurchasingShell, Loading, Empty, ErrorNote, Card, Pill, Modal, useLoad,
  btnPrimary, btnSecondary, inputCls, labelCls, thCls, tdCls, tableHead,
} from "./shared";

const BLANK = { name: "", country: "", product_lines: "", lead_time_months: 4, payment_terms: "", contact: "", is_active: true };

function SettingsCard({ canManage }) {
  const { data, loading, error } = useLoad(getPurchaseSettings);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (data) setForm(data); }, [data]);

  const setBand = (i, patch) => setForm({ ...form, speed_bands: form.speed_bands.map((b, j) => (j === i ? { ...b, ...patch } : b)) });

  const save = async () => {
    setBusy(true);
    try {
      await savePurchaseSettings({
        ...form,
        safety_margin_months: Number(form.safety_margin_months) || 0,
        default_lead_time_months: Number(form.default_lead_time_months) || 4,
        speed_bands: form.speed_bands.map((b) => ({ ...b, min_pairs: Number(b.min_pairs) || 0 })),
      });
      notify.success("Settings saved.");
    } catch (e) {
      notify.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !form) return <Card title="Settings"><Loading /></Card>;
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!form) return null;

  return (
    <Card
      title="Settings"
      subtitle="Values the client has not finalised yet. They can change without a new release."
      actions={canManage && <button type="button" className={btnPrimary} disabled={busy} onClick={save}><Save size={14} /> Save settings</button>}
    >
      <fieldset disabled={!canManage} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="text-[13px] font-bold text-slate-800">Running-low list</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="set-lead">Default lead time (months)</label>
              <input id="set-lead" type="number" min="1" className={inputCls} value={form.default_lead_time_months} onChange={(e) => setForm({ ...form, default_lead_time_months: e.target.value })} />
            </div>
            <div>
              <label className={labelCls} htmlFor="set-margin">Safety margin (months)</label>
              <input id="set-margin" type="number" min="0" step="0.5" className={inputCls} value={form.safety_margin_months} onChange={(e) => setForm({ ...form, safety_margin_months: e.target.value })} />
            </div>
          </div>
          <p className="text-[12px] text-slate-500">A line shows as running low when its stock and incoming pairs last less than {Number(form.default_lead_time_months) + Number(form.safety_margin_months)} months.</p>
          <label className="flex items-start gap-2 text-[13px] text-slate-800 cursor-pointer">
            <input type="checkbox" className="mt-0.5" checked={form.suggest_zero_sale_lines} onChange={(e) => setForm({ ...form, suggest_zero_sale_lines: e.target.checked })} />
            <span>Also show lines that did not sell (off by default)</span>
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[13px] font-bold text-slate-800">Selling-speed colours</h3>
            {canManage && (
              <button type="button" className={`${btnSecondary} !h-8 !text-[12px]`} onClick={() => setForm({ ...form, speed_bands: [...form.speed_bands, { label: "New band", colour: "#e2e8f0", min_pairs: 0 }] })}>
                <Plus size={13} /> Add band
              </button>
            )}
          </div>
          {form.speed_bands.map((band, i) => (
            <div key={i} className="grid grid-cols-[44px_1fr_120px_36px] gap-2 items-end">
              <div>
                <label className="sr-only" htmlFor={`band-colour-${i}`}>Colour for {band.label}</label>
                <input id={`band-colour-${i}`} type="color" className="h-9 w-11 rounded-lg border border-slate-200 bg-white p-1 cursor-pointer" value={band.colour} onChange={(e) => setBand(i, { colour: e.target.value })} />
              </div>
              <div>
                <label className={labelCls} htmlFor={`band-label-${i}`}>Name</label>
                <input id={`band-label-${i}`} className={inputCls} value={band.label} onChange={(e) => setBand(i, { label: e.target.value })} />
              </div>
              <div>
                <label className={labelCls} htmlFor={`band-min-${i}`}>From pairs/mo</label>
                <input id={`band-min-${i}`} type="number" min="0" className={inputCls} value={band.min_pairs} onChange={(e) => setBand(i, { min_pairs: e.target.value })} />
              </div>
              {canManage && (
                <button type="button" aria-label={`Remove ${band.label}`} className="h-9 grid place-items-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer" onClick={() => setForm({ ...form, speed_bands: form.speed_bands.filter((_, j) => j !== i) })}>
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      </fieldset>
    </Card>
  );
}

export function SuppliersSettings() {
  const { data, loading, error, setData } = useLoad(listSuppliers);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const canManage = hasPermission("MANAGE_PURCHASING");
  const suppliers = data || [];

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      setData(await saveSupplier({ ...editing, lead_time_months: Number(editing.lead_time_months) || 4 }));
      notify.success("Supplier saved.");
      setEditing(null);
    } catch (err) {
      notify.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const field = (key, label, props = {}) => (
    <div>
      <label className={labelCls} htmlFor={`sup-${key}`}>{label}</label>
      <input id={`sup-${key}`} className={inputCls} value={editing[key] ?? ""} onChange={(e) => setEditing({ ...editing, [key]: e.target.value })} {...props} />
    </div>
  );

  return (
    <PurchasingShell icon={Factory} title="Suppliers & settings" subtitle="Who we buy from, how long they take, and the purchasing settings.">
      <div className="space-y-5">
        <Card
          title="Suppliers"
          subtitle="Lead time decides when a line shows as running low. Default 4 months."
          actions={canManage && <button type="button" className={btnPrimary} onClick={() => setEditing({ ...BLANK })}><Plus size={14} /> Add supplier</button>}
        >
          {loading && !data && <Loading />}
          {error && <ErrorNote>{error}</ErrorNote>}
          {data && (suppliers.length === 0 ? <Empty>No suppliers yet.</Empty> : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-left min-w-[780px]" style={{ borderCollapse: "collapse" }}>
                <thead style={tableHead}>
                  <tr>
                    <th className={thCls}>Supplier</th>
                    <th className={thCls}>Country</th>
                    <th className={thCls}>Product lines</th>
                    <th className={`${thCls} text-right`}>Lead time</th>
                    <th className={thCls}>Payment terms</th>
                    <th className={thCls}>Status</th>
                    {canManage && <th className={`${thCls} text-right`}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100 last:border-0">
                      <td className={tdCls}><div className="font-bold text-slate-900">{s.name}</div><div className="text-[11px] text-slate-500">{s.contact || "—"}</div></td>
                      <td className={tdCls}>{s.country || "—"}</td>
                      <td className={tdCls}>{s.product_lines || "—"}</td>
                      <td className={`${tdCls} text-right tabular-nums`}>{s.lead_time_months} months</td>
                      <td className={tdCls}>{s.payment_terms || "—"}</td>
                      <td className={tdCls}>{s.is_active ? <Pill tone="green">Active</Pill> : <Pill tone="grey">Inactive</Pill>}</td>
                      {canManage && <td className={`${tdCls} text-right`}><button type="button" className={`${btnSecondary} !h-8 !text-[12px]`} onClick={() => setEditing({ ...s })}><Pencil size={13} /> Edit</button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </Card>

        <SettingsCard canManage={canManage} />
      </div>

      {editing && (
        <Modal
          title={editing.id ? "Edit supplier" : "Add supplier"}
          onClose={() => setEditing(null)}
          footer={(
            <>
              <button type="button" className={btnSecondary} onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" form="supplier-form" className={btnPrimary} disabled={busy || !editing.name.trim()}>Save</button>
            </>
          )}
        >
          <form id="supplier-form" onSubmit={save} className="space-y-4">
            {field("name", "Supplier name *")}
            <div className="grid grid-cols-2 gap-3">
              {field("country", "Country")}
              {field("lead_time_months", "Lead time (months)", { type: "number", min: 1 })}
            </div>
            {field("product_lines", "Product lines it supplies")}
            {field("payment_terms", "Payment terms")}
            {field("contact", "Contact")}
            <label className="flex items-center gap-2 text-[13px] font-semibold text-slate-800 cursor-pointer">
              <input type="checkbox" checked={!!editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
              Active
            </label>
          </form>
        </Modal>
      )}
    </PurchasingShell>
  );
}
