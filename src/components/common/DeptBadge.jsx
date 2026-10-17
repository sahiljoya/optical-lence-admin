// Field-level ownership color-coding (Section 13-style department convention): which team a
// product field "belongs" to. Purely visual for now — actual field-level RBAC (Purchase can
// only edit Blue, etc.) is future work once Settings' Roles module supports per-field grants.
const DEPT_STYLES = {
  purchase: "bg-blue-50 text-blue-700 border-blue-200",
  stock: "bg-orange-50 text-orange-700 border-orange-200",
  sales: "bg-white text-slate-600 border-slate-300"
};
const DEPT_LABELS = { purchase: "Purchase", stock: "Warehouse", sales: "Sales" };

export function DeptBadge({ dept }) {
  if (!dept || !DEPT_STYLES[dept]) return null;
  return (
    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${DEPT_STYLES[dept]}`}>
      {DEPT_LABELS[dept]}
    </span>
  );
}
