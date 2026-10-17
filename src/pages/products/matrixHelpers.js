// Mirrors backend/routes/services/serviceProduct.js's generateMatrix row/col grouping rules
// (Power_Matrix_Reference_Guide Section 2.3/2.4) so the grid renders consistently with how
// the backend classifies a matrix as Single Vision / Progressive-family / CYL-only etc.

export const formatPower = (n) => {
  if (n === null || n === undefined) return null;
  return n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2);
};

export const cellKey = (c) => `${c.sph}_${c.cyl}_${c.axis}_${c.add}`;

export function classifyMatrix(cells) {
  const hasAdd = cells.some(c => c.add !== null && c.add !== undefined);
  const hasCyl = cells.some(c => c.cyl !== null && c.cyl !== undefined);
  const hasSph = cells.some(c => c.sph !== null && c.sph !== undefined);
  return { hasAdd, hasCyl, hasSph };
}

function rowKeyOf(cell, { hasAdd, hasCyl, hasSph }) {
  if (hasAdd && hasCyl && hasSph) return `SPH_${cell.sph}_CYL_${cell.cyl}_AXIS_${cell.axis}`;
  if (hasAdd && hasCyl) return `CYL_${cell.cyl}_AXIS_${cell.axis}`;
  if (hasAdd && hasSph) return `SPH_${cell.sph}`;
  if (!hasAdd && hasCyl && hasSph) return `SPH_${cell.sph}`;
  if (!hasAdd && !hasCyl && hasSph) return `SPH_${cell.sph}`;
  return `Cell_${cell.sph}_${cell.cyl}`;
}

function colKeyOf(cell, { hasAdd, hasCyl, hasSph }) {
  if (hasAdd) return cell.add !== null && cell.add !== undefined ? `ADD_${cell.add}` : "Unknown";
  if (hasCyl && hasSph) return cell.cyl !== null && cell.cyl !== undefined ? `CYL_${cell.cyl}` : "Unknown";
  return "Total";
}

function rowLabelOf(cell, { hasAdd, hasCyl, hasSph }) {
  const sph = cell.sph !== null && cell.sph !== undefined ? formatPower(cell.sph) : "";
  const cyl = cell.cyl !== null && cell.cyl !== undefined ? formatPower(cell.cyl) : "";
  const axis = cell.axis !== null && cell.axis !== undefined ? `X${cell.axis}` : "";
  if (hasAdd && hasCyl && hasSph) return `${sph}${cyl}${axis}`;
  if (hasAdd && hasCyl) return `${cyl}${axis}`;
  if (hasAdd && hasSph) return sph;
  if (!hasAdd && hasCyl && hasSph) return sph;
  return sph || `${cell.sph}_${cell.cyl}`;
}

function colLabelOf(cell, { hasAdd }) {
  if (hasAdd) return `ADD ${formatPower(cell.add)}`;
  return formatPower(cell.cyl) ?? "Qty";
}

// Builds a generic row x col grid structure from a flat power_cells[] array (whatever shape
// generateMatrix produced — SV rectangle, Progressive ADD-column, Cross staircase, etc.)
export function buildGridFromCells(cells) {
  const flags = classifyMatrix(cells);
  const rows = new Map();
  const cols = new Map();

  cells.forEach(cell => {
    const rk = rowKeyOf(cell, flags);
    const ck = colKeyOf(cell, flags);
    if (!rows.has(rk)) {
      rows.set(rk, {
        label: rowLabelOf(cell, flags),
        sortSph: cell.sph ?? 0,
        sortCyl: cell.cyl ?? 0,
        cellsByCol: new Map()
      });
    }
    rows.get(rk).cellsByCol.set(ck, cell);
    if (!cols.has(ck)) {
      cols.set(ck, {
        label: colLabelOf(cell, flags),
        sortVal: flags.hasAdd ? (cell.add ?? 0) : (cell.cyl ?? 0)
      });
    }
  });

  const rowKeys = Array.from(rows.keys()).sort((a, b) => {
    const ra = rows.get(a), rb = rows.get(b);
    if (rb.sortCyl !== ra.sortCyl) return rb.sortCyl - ra.sortCyl;
    return rb.sortSph - ra.sortSph;
  });
  const colKeys = Array.from(cols.keys()).sort((a, b) => cols.get(a).sortVal - cols.get(b).sortVal);

  return { flags, rows, cols, rowKeys, colKeys };
}

export function generateProductCode({
  brand,
  index,
  base,
  lens_type,
  diameter,
  min_sph,
  max_sph,
  min_cyl,
  max_cyl,
  range_label
}) {
  if (!brand) return "";

  const cleanBrand = String(brand).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Base code
  let baseCode = "HC";
  const b = String(base || "");
  if (b.includes("HC") || b.toLowerCase().includes("hard coat")) baseCode = "HC";
  else if (b.includes("B.CUT") || b.toLowerCase().includes("blue cut")) baseCode = "BCUT";
  else if (b.includes("POLY") || b.toLowerCase().includes("polycarbonate")) baseCode = "POLY";
  else if (b.toLowerCase().includes("photo grey")) baseCode = "PG";
  else if (b) baseCode = b.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);

  // Type code
  let typeCode = "SV";
  if (lens_type === "Progressive") typeCode = "PG";
  else if (lens_type === "KT") typeCode = "KT";
  else if (lens_type === "RX") typeCode = "RX";
  else if (lens_type === "Cross") typeCode = "CROSS";

  // Power range code
  let rangeCode = "";
  if (range_label && String(range_label).trim()) {
    rangeCode = String(range_label).trim().toUpperCase().replace(/\s+/g, "");
  } else {
    const sphStr = min_sph !== undefined && !isNaN(min_sph) ? (min_sph > 0 ? `+${min_sph}` : `${min_sph}`) : "";
    const cylBound = min_cyl !== undefined && !isNaN(min_cyl) && min_cyl !== 0 ? min_cyl : (max_cyl || 0);
    const cylStr = cylBound !== undefined && !isNaN(cylBound) ? (cylBound > 0 ? `+${cylBound}` : `${cylBound}`) : "";
    rangeCode = `${sphStr}${cylStr}` || "STD";
  }

  const diaStr = diameter ? `-${diameter}MM` : "";

  return `${cleanBrand}-${index}-${baseCode}-${typeCode}-${rangeCode}${diaStr}`.toUpperCase();
}
