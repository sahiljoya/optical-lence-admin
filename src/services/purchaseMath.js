// Purchasing maths, in one place. The mock service and the screens both use it, so a number on
// screen is always worked out the same way as the order that gets saved. The backend will
// implement exactly these rules.

export const cellKey = (row, col) => `${row}|${col}`;

export const steps = (from, to, step = 0.25) => {
  const out = [];
  const count = Math.round(Math.abs(to - from) / step);
  const dir = to >= from ? 1 : -1;
  for (let i = 0; i <= count; i += 1) out.push(Number((from + dir * i * step).toFixed(2)));
  return out;
};

export const inside = (value, [a, b]) => value >= Math.min(a, b) && value <= Math.max(a, b);

// The powers of a price line, from its range in the price file.
export const axesFromRange = (rowRange, colRange) => ({ rows: steps(rowRange[0], rowRange[1]), cols: steps(colRange[0], colRange[1]) });

// Step 1 — the part of a Super Master a line takes: the master's ratios for the line's own powers.
// Every other power of the master is left out (it is 0 for this line).
export const ownRatios = (grid, rowRange, colRange) => {
  const rows = grid.rows.filter((r) => inside(r, rowRange));
  const cols = grid.cols.filter((c) => inside(c, colRange));
  const ratios = {};
  rows.forEach((r) => cols.forEach((c) => { ratios[cellKey(r, c)] = grid.cells[cellKey(r, c)] ?? 0; }));
  return { rows, cols, ratios };
};

// Step 3 — Product Master: the total spread over the powers by their ratios, each rounded down.
// Ratios never change; only the total does.
export const spreadTotal = (ratios, total) => {
  const sum = Object.values(ratios).reduce((s, v) => s + v, 0);
  const pairs = {};
  const t = Math.max(0, Math.floor(Number(total) || 0));
  Object.entries(ratios).forEach(([k, ratio]) => { pairs[k] = sum ? Math.floor((t * ratio) / sum) : 0; });
  return pairs;
};

// Step 4 — what is short for one power: keep − in stock − being made − on the way, never below 0.
// Extra stock of one power never cancels a shortage of another.
export const shortage = (keep, have) => Math.max(0, keep - (have?.free || 0) - (have?.making || 0) - (have?.transit || 0));

export const sumValues = (map) => Object.values(map).reduce((s, v) => s + v, 0);
