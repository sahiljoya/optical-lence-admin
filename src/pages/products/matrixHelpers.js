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
  const axis = cell.axis !== null && cell.axis !== undefined ? `*${cell.axis}` : "";
  if (hasAdd && hasCyl && hasSph) return `${sph}${cyl}${axis}`;
  if (hasAdd && hasCyl) return `${cyl}${axis}`;
  if (hasAdd && hasSph) return sph;
  if (!hasAdd && hasCyl && hasSph) return sph;
  return sph || `${cell.sph}_${cell.cyl}`;
}

export function getMatrixTypeInfo({ lensType, rangeConfig, hasCyl }) {
  const isProgressiveFamily = lensType === "Progressive" || lensType === "KT" || lensType === "RX";
  const hasSph =
    rangeConfig?.sph?.min !== undefined &&
    rangeConfig?.sph?.min !== null &&
    rangeConfig?.sph?.min !== "" &&
    !isNaN(parseFloat(rangeConfig.sph.min));

  const sphMin = hasSph ? parseFloat(rangeConfig.sph.min) : 0;
  const sphMax = hasSph ? parseFloat(rangeConfig.sph.max) : 0;

  const cylBlocks = rangeConfig?.cylBlocks || [];
  const cylMins = cylBlocks.map(b => parseFloat(b.min)).filter(n => !isNaN(n));
  const cylMaxs = cylBlocks.map(b => parseFloat(b.max)).filter(n => !isNaN(n));
  const cMin = cylMins.length > 0 ? Math.min(...cylMins) : 0;
  const cMax = cylMaxs.length > 0 ? Math.max(...cylMaxs) : 0;

  const sPos = hasSph && (sphMin > 1e-6 || sphMax > 1e-6);
  const sNeg = hasSph && (sphMin < -1e-6 || sphMax < -1e-6);
  const cPos = cMin > 1e-6 || cMax > 1e-6;
  const cNeg = cMin < -1e-6 || cMax < -1e-6;

  const isMixedSph = hasSph && sPos && sNeg;
  const isCross = hasCyl && !isMixedSph && ((sPos && cNeg) || (sNeg && cPos));

  if (isProgressiveFamily) {
    if (hasCyl && cylBlocks.length > 0) {
      if (cylBlocks.length > 1) {
        return {
          code: "Type D",
          name: "CYL (2 Axis Blocks) × ADD",
          shape: "Stacked Rectangles",
          isCross: false
        };
      }
      if (!hasSph) {
        return {
          code: "Type C",
          name: "CYL (1 axis) × ADD",
          shape: "Full Rectangle",
          isCross: false
        };
      }
      if (isMixedSph) {
        return {
          code: "Type E/F (Mixed)",
          name: "Mixed SPH Compound × ADD (Same-Sign & Cross Staircase)",
          shape: "Partial Staircase",
          isCross: true,
          isMixed: true
        };
      }
      return isCross
        ? {
          code: "Type F",
          name: "Compound (Cross Sign) × ADD",
          shape: "Staircase (|SPH| < |CYL|)",
          isCross: true
        }
        : {
          code: "Type E",
          name: "Compound (Same Sign) × ADD",
          shape: "Full Rectangle",
          isCross: false
        };
    }
    return {
      code: "Type A",
      name: "SPH × ADD",
      shape: "Full Rectangle",
      isCross: false
    };
  } else {
    // Single Vision
    if (hasCyl && cylBlocks.length > 0) {
      if (isMixedSph) {
        return {
          code: "Type B/G (Mixed)",
          name: "Mixed SPH × CYL (Same-Sign & Cross Staircase)",
          shape: "Partial Staircase",
          isCross: true,
          isMixed: true
        };
      }
      return isCross
        ? {
          code: "Type G",
          name: "SPH × CYL (Cross Staircase)",
          shape: "Staircase (|SPH| < |CYL|)",
          isCross: true
        }
        : {
          code: "Type B",
          name: "SPH × CYL",
          shape: "Full Rectangle",
          isCross: false
        };
    }
    return {
      code: "SPH List",
      name: "SPH Only",
      shape: "Single List",
      isCross: false
    };
  }
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
  const axisOrder = [];

  cells.forEach(cell => {
    const rk = rowKeyOf(cell, flags);
    const ck = colKeyOf(cell, flags);
    if (!rows.has(rk)) {
      if (cell.axis !== null && cell.axis !== undefined && !axisOrder.includes(cell.axis)) {
        axisOrder.push(cell.axis);
      }
      rows.set(rk, {
        label: rowLabelOf(cell, flags),
        sortSph: cell.sph ?? 0,
        sortCyl: cell.cyl ?? 0,
        axis: cell.axis ?? null,
        firstSeenIndex: rows.size,
        cellsByCol: new Map()
      });
    }
    rows.get(rk).cellsByCol.set(ck, cell);
    if (!cols.has(ck)) {
      cols.set(ck, {
        label: colLabelOf(cell, flags),
        sortVal: flags.hasAdd ? (cell.add ?? 0) : (cell.cyl ?? 0),
        firstSeenIndex: cols.size
      });
    }
  });

  const isMultiBlock = flags.hasAdd && flags.hasCyl && axisOrder.length > 1;

  const rowKeys = Array.from(rows.keys()).sort((a, b) => {
    const ra = rows.get(a), rb = rows.get(b);
    if (isMultiBlock) {
      // In multi-block (Type D), preserve explicit user block sequence (Block 1 Axis 90 first, Block 2 Axis 180 second)
      const ordA = axisOrder.indexOf(ra.axis);
      const ordB = axisOrder.indexOf(rb.axis);
      if (ordA !== ordB && ordA !== -1 && ordB !== -1) {
        return ordA - ordB;
      }
      if (Math.abs(ra.sortCyl) !== Math.abs(rb.sortCyl)) {
        return Math.abs(ra.sortCyl) - Math.abs(rb.sortCyl);
      }
      if (Math.abs(ra.sortSph) !== Math.abs(rb.sortSph)) {
        return Math.abs(ra.sortSph) - Math.abs(rb.sortSph);
      }
      return ra.firstSeenIndex - rb.firstSeenIndex;
    }
    return ra.firstSeenIndex - rb.firstSeenIndex;
  });
  const colKeys = Array.from(cols.keys()).sort((a, b) => cols.get(a).firstSeenIndex - cols.get(b).firstSeenIndex);

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
    const sphBound = min_sph !== undefined && min_sph !== null && !isNaN(min_sph) && min_sph !== 0 ? min_sph : (max_sph || 0);
    const sphStr = sphBound !== undefined && sphBound !== null && !isNaN(sphBound) ? (sphBound > 0 ? `+${sphBound}` : `${sphBound}`) : "";
    const cylBound = min_cyl !== undefined && min_cyl !== null && !isNaN(min_cyl) && min_cyl !== 0 ? min_cyl : (max_cyl || 0);
    const cylStr = cylBound !== undefined && cylBound !== null && !isNaN(cylBound) ? (cylBound > 0 ? `+${cylBound}` : `${cylBound}`) : "";
    rangeCode = `${sphStr}${cylStr}` || "STD";
  }

  const diaStr = diameter ? `-${diameter}MM` : "";

  return `${cleanBrand}-${index}-${baseCode}-${typeCode}-${rangeCode}${diaStr}`.toUpperCase();
}

export function validatePowerRange(min, max, step, fieldName = "Power") {
  if (
    min === null || min === undefined || String(min).trim() === "" ||
    max === null || max === undefined || String(max).trim() === "" ||
    step === null || step === undefined || String(step).trim() === ""
  ) {
    return { valid: false, error: `${fieldName}: Min, Max, and Step are required and must be valid numbers.` };
  }

  const minNum = Number(min);
  const maxNum = Number(max);
  const stepNum = Number(step);

  if (isNaN(minNum) || isNaN(maxNum) || isNaN(stepNum)) {
    return { valid: false, error: `${fieldName}: Min, Max, and Step must be valid numbers.` };
  }

  const minInt = Math.round(minNum * 100);
  const maxInt = Math.round(maxNum * 100);
  const stepInt = Math.round(stepNum * 100);

  // Precision check: up to 2 decimal places (standard optical precision)
  if (
    Math.abs(minNum * 100 - minInt) > 1e-4 ||
    Math.abs(maxNum * 100 - maxInt) > 1e-4 ||
    Math.abs(stepNum * 100 - stepInt) > 1e-4
  ) {
    return { valid: false, error: `${fieldName} values must have at most 2 decimal places (e.g. 0.25, 0.50).` };
  }

  if (stepInt <= 0) {
    return { valid: false, error: `${fieldName} step must be greater than 0.` };
  }

  // Optical Rule: A range cannot cross zero between negative and positive
  if ((minInt < 0 && maxInt > 0) || (minInt > 0 && maxInt < 0)) {
    return {
      valid: false,
      error: `${fieldName} range cannot cross zero between negative and positive (${minNum > 0 ? "+" + minNum : minNum} to ${maxNum > 0 ? "+" + maxNum : maxNum}). Optical series must be purely minus (e.g. 0.00 to -4.00) or purely plus (e.g. 0.00 to +4.00).`
    };
  }

  // Optical Rule: Min is start power, Max is end power.
  // For negative ranges (minInt <= 0 && maxInt <= 0): magnitude must progress outward (|min| <= |max|)
  if (minInt <= 0 && maxInt <= 0) {
    if (Math.abs(minInt) > Math.abs(maxInt)) {
      return {
        valid: false,
        error: `${fieldName} Min (${minNum > 0 ? "+" + minNum : minNum}) magnitude cannot be greater than Max (${maxNum > 0 ? "+" + maxNum : maxNum}). Progression starts at Min and moves outward to Max (e.g. 0.00 to -4.00 or -1.00 to -3.00).`
      };
    }
  } else {
    // For positive ranges (minInt >= 0 && maxInt >= 0): minInt <= maxInt
    if (minInt > maxInt) {
      return {
        valid: false,
        error: `${fieldName} Min (${minNum > 0 ? "+" + minNum : minNum}) cannot be greater than Max (${maxNum > 0 ? "+" + maxNum : maxNum}). Progression starts at Min and moves up to Max (e.g. 0.00 to +4.00).`
      };
    }
  }

  const spanInt = Math.abs(maxInt - minInt);
  if (spanInt % stepInt !== 0) {
    return {
      valid: false,
      error: `${fieldName} range (${minNum > 0 ? "+" + minNum : minNum} to ${maxNum > 0 ? "+" + maxNum : maxNum}) is not evenly divisible by step (${stepNum}). Max endpoint must be reachable by exact step increments.`
    };
  }

  return { valid: true };
}

export function generateMatrixCellsClient({ lensType, rangeConfig, hasCyl }) {
  const isProgressiveFamily =
    lensType === "Progressive" || lensType === "KT" || lensType === "RX";

  const hasSph =
    rangeConfig?.sph?.min !== undefined &&
    rangeConfig?.sph?.min !== null &&
    String(rangeConfig.sph.min).trim() !== "" &&
    rangeConfig?.sph?.max !== undefined &&
    rangeConfig?.sph?.max !== null &&
    String(rangeConfig.sph.max).trim() !== "";

  // Validate SPH range only if SPH is specified (Rule C: SPH can be absent in Type C)
  if (hasSph) {
    const vSph = validatePowerRange(
      rangeConfig.sph.min,
      rangeConfig.sph.max,
      rangeConfig.sph.step,
      "SPH"
    );
    if (!vSph.valid) throw new Error(vSph.error);
  }

  // Validate ADD range for Progressive
  if (isProgressiveFamily && rangeConfig?.add?.min !== undefined && rangeConfig?.add?.max !== undefined) {
    const vAdd = validatePowerRange(
      Math.abs(parseFloat(rangeConfig.add.min)),
      Math.abs(parseFloat(rangeConfig.add.max)),
      rangeConfig.add.step,
      "ADD"
    );
    if (!vAdd.valid) throw new Error(vAdd.error);
  }

  // Validate CYL blocks if cylinder present
  if (hasCyl && rangeConfig?.cylBlocks?.length > 0) {
    rangeConfig.cylBlocks.forEach((b, idx) => {
      const vCyl = validatePowerRange(b.min, b.max, b.step, `CYL Block ${idx + 1}`);
      if (!vCyl.valid) throw new Error(vCyl.error);
    });
  }

  const stepVal = (start, end, step) => {
    const v = validatePowerRange(start, end, step, "Range");
    if (!v.valid) throw new Error(v.error);

    const values = [];
    const startInt = Math.round(Number(start) * 100);
    const endInt = Math.round(Number(end) * 100);
    const stepInt = Math.round(Number(step) * 100);

    if (startInt <= endInt) {
      for (let val = startInt; val <= endInt; val += stepInt) {
        values.push(val === 0 ? 0 : val / 100);
      }
    } else {
      for (let val = startInt; val >= endInt; val -= stepInt) {
        values.push(val === 0 ? 0 : val / 100);
      }
    }
    return values;
  };

  const sphMin = hasSph ? parseFloat(rangeConfig.sph.min) : NaN;
  const sphMax = hasSph ? parseFloat(rangeConfig.sph.max) : NaN;
  const sphStep = hasSph ? (parseFloat(rangeConfig.sph.step) || 0.25) : 0.25;
  const sphVals =
    hasSph && !isNaN(sphMin) && !isNaN(sphMax) ? stepVal(sphMin, sphMax, sphStep) : [null];

  const addMin = parseFloat(rangeConfig?.add?.min);
  const addMax = parseFloat(rangeConfig?.add?.max);
  const addStep = parseFloat(rangeConfig?.add?.step) || 0.25;
  const addVals =
    isProgressiveFamily && !isNaN(addMin) && !isNaN(addMax)
      ? stepVal(Math.abs(addMin), Math.abs(addMax), addStep)
      : [null];

  const blocks =
    hasCyl && rangeConfig?.cylBlocks?.length > 0
      ? rangeConfig.cylBlocks
      : [{ min: null, max: null, step: null, axis: null }];

  const cellsMap = new Map();

  for (const block of blocks) {
    const cMin = parseFloat(block.min);
    const cMax = parseFloat(block.max);
    const cStep = parseFloat(block.step) || 0.25;
    const hasCylVal = !isNaN(cMin) && !isNaN(cMax);
    const cylVals = hasCylVal ? stepVal(cMin, cMax, cStep) : [null];

    let resolvedAxis = null;
    if (hasCylVal) {
      if (!isProgressiveFamily) {
        resolvedAxis = null;
      } else {
        const axisNum = parseInt(block.axis);
        resolvedAxis = !isNaN(axisNum) && axisNum >= 1 && axisNum <= 180 ? axisNum : null;
      }
    }

    for (const c of cylVals) {
      for (const s of sphVals) {
        // Cross-sign check (|SPH| >= |CYL| excluded)
        if (s !== null && c !== null) {
          const sPos = s > 1e-6;
          const sNeg = s < -1e-6;
          const cPos = c > 1e-6;
          const cNeg = c < -1e-6;
          const isCross = (sPos && cNeg) || (sNeg && cPos);
          if (isCross && Math.abs(s) >= Math.abs(c)) {
            continue;
          }
        }

        for (const a of addVals) {
          const safeAdd = isProgressiveFamily && a !== null ? Math.abs(a) : null;
          const cellKeyStr = `${s}_${c}_${resolvedAxis}_${safeAdd}`;
          if (!cellsMap.has(cellKeyStr)) {
            cellsMap.set(cellKeyStr, {
              sph: s,
              cyl: c,
              axis: resolvedAxis,
              add: safeAdd,
              total_quantity: 0,
              locations: [],
              status: "available",
            });
          }
        }
      }
    }
  }

  return Array.from(cellsMap.values());
}