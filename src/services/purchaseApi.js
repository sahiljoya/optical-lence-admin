// Purchasing module — MOCK data layer (design only).
//
// The backend purchasing APIs do not exist yet. Every function here returns SAMPLE data kept in
// memory (it resets on page reload) so the screens can be designed and reviewed first. The
// masters, ratios, sales and stock below are invented — they are NOT Vishal's real data.
//
// The flow the screens follow:
//   Super Master   — uploaded from an Excel or PDF file, never edited. Open one to see its
//                    Product Masters and to create a new one.
//   Product Master — made from a Super Master for ONE product: choose the product, choose the
//                    powers (the product's own range, a smaller range, or the whole Super Master)
//                    and the total pieces. Only the total changes later; each power keeps its ratio.
//   Order          — from a Product Master: need = keep − in stock − being made − on the way,
//                    power by power. Create the order or ignore it. The order then has 6 stages.
//   Alert          — per Product Master: when pieces we have fall to a number, and/or every N
//                    months. Whichever comes first.
// All purchasing belongs to one company, Vishal Optical.
//
// When the APIs are built, replace each function body with a makeRequestAuth(...) call and keep
// the same return shape; the pages should not need to change.

import { getItem } from "@/services/storage";
import { cellKey, steps, axesFromRange, ownRatios, spreadTotal, shortage, inside } from "@/services/purchaseMath";

export { cellKey } from "@/services/purchaseMath";

export const IS_MOCK = true;
export const COMPANY = "Vishal Optical Co.";

export const PO_STAGES = [
  { id: "held", label: "Held", hint: "Draft. Not sent yet.", group: "draft", action: "Mark as sent" },
  { id: "sent", label: "Sent", hint: "Sent to supplier. Pieces are fixed now.", group: "draft", action: "PI received" },
  { id: "pi_received", label: "PI received", hint: "Paid. Supplier is making it.", group: "making", action: "Packing list received" },
  { id: "packing_list", label: "Packing list", hint: "Still being made.", group: "making", action: "Mark as shipped" },
  { id: "shipped", label: "Shipped", hint: "On the way to us.", group: "transit", action: "Receive goods" },
  { id: "received", label: "Received", hint: "In Godown 1.", group: "done", action: null },
];

export const SALES_BASES = [
  { id: 1, label: "Last month" },
  { id: 3, label: "3-month average" },
  { id: 6, label: "6-month average" },
  { id: 12, label: "12-month average" },
];

export const LENS_TYPES = ["Single Vision", "KT", "Progressive"];
export const ACCEPTED_MASTER_FILES = ".xlsx,.xls,.csv,.pdf";

// ---------- helpers ----------

const DAY = 864e5;
const MONTH = 30.44 * DAY;
const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const delay = (v, ms = 120) => new Promise((resolve) => setTimeout(() => resolve(clone(v)), ms));
const fail = (message) => Promise.reject(new Error(message));
const monthsAgo = (m) => new Date(Date.now() - m * MONTH).toISOString();

// Deterministic 0..1 number from a string, so sample stock looks the same on every reload.
const seeded = (text) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
};

const currentUser = () => getItem("admin_user")?.name || "You";
const today = () => new Date().toISOString();

const powerText = (v) => (v === 0 ? "0.00" : `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}`);
// "SPH 0.00 to −6.00 · CYL 0.00 to −2.00" — written the way the client writes a range.
const rangeText = (rows, cols, colAxis) =>
  `SPH ${powerText(rows[0])} to ${powerText(rows[1])} · ${colAxis === "add" ? "ADD" : "CYL"} ${powerText(cols[0])} to ${powerText(cols[1])}`;

const ratioGrid = (rows, cols, fn) => {
  const cells = {};
  rows.forEach((r) => cols.forEach((c) => { cells[cellKey(r, c)] = Math.max(0, Math.round(fn(r, c))); }));
  return cells;
};

// ---------- sample Super Masters ----------

const minusRatio = (r, c) => 100 * Math.exp(-Math.abs(r) / 2.2) * Math.exp(-Math.abs(c) / 0.9);

const buildMaster = ({ rows, cols, ratio, file_name, ...rest }) => {
  const cells = ratioGrid(rows, cols, ratio);
  return {
    rows, cols, cells, version: 1,
    versions: [{ version: 1, cells: clone(cells), rows, cols, file_name, uploaded_by: "Rajat", at: "2026-11-10T10:00:00.000Z" }],
    ...rest,
  };
};

const masters = [
  buildMaster({ id: "M05", code: "M05", title: "−6/−2", lens_types: ["Single Vision"], index: null, diameter: null, axis: null, col_axis: "cyl", rows: steps(0, -6), cols: steps(0, -2), ratio: minusRatio, file_name: "M05 -6-2.xlsx" }),
  buildMaster({ id: "M06", code: "M06", title: "+4/+2", lens_types: ["Single Vision"], index: null, diameter: null, axis: null, col_axis: "cyl", rows: steps(0, 4), cols: steps(0, 2), ratio: (r, c) => 70 * Math.exp(-Math.abs(r) / 1.6) * Math.exp(-Math.abs(c) / 0.8), file_name: "M06 +4+2.xlsx" }),
  buildMaster({ id: "M10", code: "M10", title: "−6/−4", lens_types: ["Single Vision"], index: null, diameter: null, axis: null, col_axis: "cyl", rows: steps(0, -6), cols: steps(-2.25, -4), ratio: (r, c) => 24 * Math.exp(-Math.abs(r) / 2.4) * Math.exp(-(Math.abs(c) - 2.25) / 0.8), file_name: "M10 -6-4.pdf" }),
  buildMaster({ id: "M26", code: "M26", title: "−2 SPH with ADD", lens_types: ["KT", "Progressive"], index: null, diameter: null, axis: null, col_axis: "add", rows: steps(0, -2), cols: steps(0.75, 3), ratio: (r, c) => 60 * Math.exp(-Math.abs(r) / 1.2) * Math.max(0.2, 1 - Math.abs(c - 2) / 2.5), file_name: "M26 KT ADD.xlsx" }),
  buildMaster({ id: "1142", code: "1142", title: "Comp KT +2+1 × 180°", lens_types: ["KT"], index: 1.56, diameter: 65, axis: 180, col_axis: "cyl", rows: steps(0.25, 2), cols: steps(0.25, 1), ratio: (r, c) => 30 * Math.exp(-Math.abs(r) / 1.1) * Math.exp(-Math.abs(c) / 0.7), file_name: "1142 Comp KT.pdf" }),
];

// ---------- sample products (price lines) and their Product Masters ----------

const pmSeed = (line, masterId, total, { qty = null, everyMonths = null, lastOrderMonthsAgo = null } = {}) => ({
  master_id: masterId, master_version: 1, range: { rows: [...line.row_range], cols: [...line.col_range] },
  total, basis: 3, months: 6, created_at: monthsAgo(4),
  alert: { qty, every_months: everyMonths, set_at: monthsAgo(4) },
  last_order_at: lastOrderMonthsAgo === null ? null : monthsAgo(lastOrderMonthsAgo),
  history: [{ action: `Created from Super Master ${masterId}`, by: "Purchase team", at: monthsAgo(4), note: "" }],
});

const lines = [
  { id: "RG00001", item_code: "IT0001", product: "AIRSMART 1.56 HC SV", lens_type: "Single Vision", index: 1.56, diameter: null, range_label: "−6/−2", row_range: [0, -6], col_range: [0, -2], base_sale: 420, cover: 2.5, last_counted: "2026-11-02" },
  { id: "RG00002", item_code: "IT0001", product: "AIRSMART 1.56 HC SV", lens_type: "Single Vision", index: 1.56, diameter: null, range_label: "−3/−2", row_range: [0, -3], col_range: [0, -2], base_sale: 180, cover: 7, last_counted: "2026-10-18" },
  { id: "RG00014", item_code: "IT0004", product: "AIRSMART 1.56 B.CUT SV", lens_type: "Single Vision", index: 1.56, diameter: null, range_label: "+4/+2", row_range: [0, 4], col_range: [0, 2], base_sale: 150, cover: 3, last_counted: null },
  { id: "RG00031", item_code: "IT0009", product: "AIRSMART 1.60 B.CUT SV", lens_type: "Single Vision", index: 1.6, diameter: null, range_label: "−6/−4", row_range: [0, -6], col_range: [-2.25, -4], base_sale: 90, cover: 6.5, last_counted: "2026-11-05" },
  { id: "RG00102", item_code: "IT0031", product: "AIRSMART 1.56 KT", lens_type: "KT", index: 1.56, diameter: 70, range_label: "−2 SPH, ADD +1.00 to +3.00", row_range: [0, -2], col_range: [1, 3], col_kind: "add", base_sale: 240, cover: 1.5, last_counted: "2026-10-27" },
  { id: "RG00118", item_code: "IT0036", product: "AIRSMART 1.56 KT COMP", lens_type: "KT", index: 1.56, diameter: 65, range_label: "+2+1 × 180°", row_range: [0.25, 2], col_range: [0.25, 1], base_sale: 30, cover: 4, last_counted: "2026-11-08" },
  { id: "RG00140", item_code: "IT0044", product: "AIRSMART 1.56 PROGRESSIVE", lens_type: "Progressive", index: 1.56, diameter: 70, range_label: "−2 SPH, ADD +1.00 to +3.00", row_range: [0, -2], col_range: [1, 3], col_kind: "add", base_sale: 60, cover: 3, last_counted: null },
  { id: "RG00050", item_code: "IT0012", product: "AIRSMART 1.60 HC SV", lens_type: "Single Vision", index: 1.6, diameter: null, range_label: "−4/−2", row_range: [0, -4], col_range: [0, -2], base_sale: 110, cover: 2, last_counted: "2026-11-01" },
  { id: "RG00077", item_code: "IT0020", product: "AIRSMART 1.67 B.CUT SV", lens_type: "Single Vision", index: 1.67, diameter: null, range_label: "−8/−2", row_range: [0, -8], col_range: [0, -2], base_sale: 40, cover: 1, last_counted: null },
];
const lineById = (id) => lines.find((l) => l.id === id);
lineById("RG00001").pm = pmSeed(lineById("RG00001"), "M05", 2400, { qty: 1200, lastOrderMonthsAgo: 1 });
lineById("RG00002").pm = pmSeed(lineById("RG00002"), "M05", 1050, { qty: 300, everyMonths: 2, lastOrderMonthsAgo: 3 });
lineById("RG00014").pm = pmSeed(lineById("RG00014"), "M06", 900, { qty: 360 });
lineById("RG00031").pm = pmSeed(lineById("RG00031"), "M10", 520);
lineById("RG00102").pm = pmSeed(lineById("RG00102"), "M26", 1400, { qty: 560, everyMonths: 3, lastOrderMonthsAgo: 1 });
lineById("RG00118").pm = pmSeed(lineById("RG00118"), "1142", 180, { qty: 72, everyMonths: 2, lastOrderMonthsAgo: 0.5 });

const MONTHS = ["2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];

// Net monthly sale = pieces dispatched − pieces returned, both businesses together.
const netMonthly = (line, basis) => {
  const recent = MONTHS.slice(-basis).map((month) => {
    const sold = Math.round(line.base_sale * (0.8 + 0.4 * seeded(`${line.id}${month}`)));
    return sold - Math.round(sold * 0.04);
  });
  return Math.round(recent.reduce((s, v) => s + v, 0) / basis);
};
const figuresFor = (line) => SALES_BASES.map((b) => ({ ...b, monthly: netMonthly(line, b.id) }));

// ---------- state ----------

const stockAdded = {}; // lineId -> { key: pieces received through a PO }
const ignoredAlerts = {}; // lineId -> { at, have } — hidden until stock drops further or time comes round again
let purchaseOrders = [];
let poCounter = 0;

let suppliers = [
  { id: "SUP1", name: "Sample Lens Co.", country: "China", product_lines: "Single vision, KT", lead_time_months: 4, payment_terms: "30% advance, 70% before shipping", contact: "Contact person · +86 000 0000", is_active: true },
  { id: "SUP2", name: "Sample Optics", country: "Italy", product_lines: "Progressive", lead_time_months: 3, payment_terms: "100% on PI", contact: "Contact person · +39 000 0000", is_active: true },
];

let settings = {
  speed_bands: [
    { label: "Fast", colour: "#fca5a5", min_pieces: 12 },
    { label: "Medium", colour: "#fdba74", min_pieces: 4 },
    { label: "Slow", colour: "#fde047", min_pieces: 1 },
  ],
};

const masterById = (id) => masters.find((m) => m.id === id);
const versionOf = (master, version) => master.versions.find((v) => v.version === version) || master.versions[0];
const gridOf = (master, version) => {
  const v = versionOf(master, version ?? master.version);
  return { rows: v.rows || master.rows, cols: v.cols || master.cols, col_axis: master.col_axis, cells: v.cells };
};

// A product fits a Super Master when lens type, index, diameter match and its range is inside.
const fits = (line, m) => {
  if (!m.lens_types.includes(line.lens_type)) return false;
  if (m.index !== null && m.index !== line.index) return false;
  if (m.diameter !== null && m.diameter !== line.diameter) return false;
  return line.row_range.every((v) => v >= Math.min(...m.rows) && v <= Math.max(...m.rows))
    && line.col_range.every((v) => v >= Math.min(...m.cols) && v <= Math.max(...m.cols));
};

// ---------- stock: in stock / being made / on the way, per power ----------

// Held and Sent count as nothing yet; PI received + Packing list = being made; Shipped = on the way.
const incoming = (lineId, k, exceptPoId) => {
  let making = 0;
  let transit = 0;
  purchaseOrders.forEach((po) => {
    if (po.line_id !== lineId || po.id === exceptPoId) return;
    const row = po.lines.find((l) => l.key === k);
    if (!row) return;
    if (po.stage === "pi_received" || po.stage === "packing_list") making += row.ordered;
    if (po.stage === "shipped") transit += Math.max(0, row.ordered - row.received);
  });
  return { making, transit };
};

// MOCK stock: more pieces near zero power, like a real shelf. The backend reads InventoryMatrix
// (all godowns; pieces for confirmed orders are already taken out there).
const stockWeight = (line, r, c) => Math.exp(-Math.abs(r) / 2.2) * (line.col_kind === "add" ? Math.max(0.15, 1 - Math.abs(c - 2) / 2.5) : Math.exp(-Math.abs(c) / 0.9));

const inventoryFor = (line, range, exceptPoId) => {
  const { rows, cols } = axesFromRange(range.rows, range.cols);
  let weightSum = 0;
  rows.forEach((r) => cols.forEach((c) => { weightSum += stockWeight(line, r, c); }));
  const cells = {};
  const totals = { free: 0, making: 0, transit: 0 };
  rows.forEach((r) => cols.forEach((c) => {
    const k = cellKey(r, c);
    const share = weightSum ? stockWeight(line, r, c) / weightSum : 0;
    const free = Math.floor(share * line.base_sale * line.cover * (0.3 + 1.4 * seeded(`${line.id}${k}`))) + (stockAdded[line.id]?.[k] || 0);
    const { making, transit } = incoming(line.id, k, exceptPoId);
    cells[k] = { free, making, transit };
    totals.free += free;
    totals.making += making;
    totals.transit += transit;
  }));
  return { rows, cols, cells, totals, have: totals.free + totals.making + totals.transit };
};

// Product Master pieces per power, the stock per power, and what is needed (power by power).
const orderSheet = (line, exceptPoId) => {
  const m = masterById(line.pm.master_id);
  const own = ownRatios(gridOf(m, line.pm.master_version), line.pm.range.rows, line.pm.range.cols);
  const pieces = spreadTotal(own.ratios, line.pm.total);
  const inv = inventoryFor(line, line.pm.range, exceptPoId);
  const cells = {};
  const totals = { keep: 0, free: 0, making: 0, transit: 0, need: 0 };
  own.rows.forEach((r) => own.cols.forEach((c) => {
    const k = cellKey(r, c);
    const have = inv.cells[k] || { free: 0, making: 0, transit: 0 };
    const need = shortage(pieces[k], have);
    cells[k] = { row: r, col: c, ratio: own.ratios[k], keep: pieces[k], ...have, need };
    totals.keep += pieces[k];
    totals.free += have.free;
    totals.making += have.making;
    totals.transit += have.transit;
    totals.need += need;
  }));
  return { master: m, rows: own.rows, cols: own.cols, cells, totals };
};

const openPoFor = (lineId) => purchaseOrders.find((po) => po.line_id === lineId && (po.stage === "held" || po.stage === "sent"));
const poBrief = (po) => (po ? { id: po.id, po_number: po.po_number, stage: po.stage } : null);

// ---------- alerts: by quantity and/or by months, whichever comes first ----------

const alertState = (line) => {
  const pm = line.pm;
  if (!pm) return null;
  const inv = inventoryFor(line, pm.range);
  const since = pm.last_order_at || pm.alert.set_at;
  const monthsSince = (Date.now() - Date.parse(since)) / MONTH;
  const reasons = [];
  if (pm.alert.qty !== null && inv.have <= pm.alert.qty) {
    reasons.push({ kind: "qty", text: `Only ${inv.have.toLocaleString("en-IN")} pieces left. Alert is set at ${pm.alert.qty.toLocaleString("en-IN")}.` });
  }
  if (pm.alert.every_months !== null && monthsSince >= pm.alert.every_months) {
    reasons.push({ kind: "time", text: `${Math.floor(monthsSince)} months since ${pm.last_order_at ? "the last order" : "the alert was set"}. Reminder is every ${pm.alert.every_months} months.` });
  }
  // "Ignore" hides it until stock drops below what it was, or the time reminder comes round again.
  const ignored = ignoredAlerts[line.id];
  const hidden = ignored && !(inv.have < ignored.have) && (Date.now() - Date.parse(ignored.at)) / MONTH < (pm.alert.every_months || Infinity);
  return { have: inv.have, months_since: monthsSince, reasons, active: reasons.length > 0 && !hidden, ignored: !!(reasons.length && hidden) };
};

const alertText = (alert) => {
  const parts = [];
  if (alert.qty !== null) parts.push(`at ${alert.qty.toLocaleString("en-IN")} pieces`);
  if (alert.every_months !== null) parts.push(`every ${alert.every_months} months`);
  return parts.length ? parts.join(" or ") : "No alert set";
};

// ---------- summaries ----------

const lineSummary = (line) => ({
  id: line.id, item_code: line.item_code, product: line.product, lens_type: line.lens_type, index: line.index, diameter: line.diameter,
  range_label: line.range_label, range_text: rangeText(line.row_range, line.col_range, line.col_kind),
  row_range: line.row_range, col_range: line.col_range, col_kind: line.col_kind || "cyl",
  last_counted: line.last_counted, monthly_sale: netMonthly(line, 3),
  has_pm: !!line.pm, pm_master_code: line.pm ? masterById(line.pm.master_id).code : null,
});

const pmCard = (line) => {
  const m = masterById(line.pm.master_id);
  const state = alertState(line);
  return {
    id: line.id, product: line.product, range_label: line.range_label, item_code: line.item_code,
    taken_text: rangeText(line.pm.range.rows, line.pm.range.cols, m.col_axis), total: line.pm.total,
    have: state.have, alert_text: alertText(line.pm.alert), alert_active: state.active,
    version_used: line.pm.master_version, open_po: poBrief(openPoFor(line.id)),
  };
};

const masterSummary = (m) => {
  const latest = m.versions[0];
  const pms = lines.filter((l) => l.pm?.master_id === m.id);
  return {
    id: m.id, code: m.code, title: m.title, lens_types: m.lens_types, index: m.index, diameter: m.diameter, axis: m.axis,
    col_axis: m.col_axis, version: m.version, powers: m.rows.length * m.cols.length,
    range_text: rangeText([m.rows[0], m.rows.at(-1)], [m.cols[0], m.cols.at(-1)], m.col_axis),
    file_name: latest.file_name, uploaded_by: latest.uploaded_by, uploaded_at: latest.at,
    product_masters: pms.length, alerts: pms.filter((l) => alertState(l).active).length,
  };
};

// Selling speed of a power = its share of the net monthly sale of every product using the master.
const speedCells = (master) => {
  const out = {};
  lines.filter((l) => l.pm?.master_id === master.id).forEach((line) => {
    const own = ownRatios(gridOf(master, line.pm.master_version), line.pm.range.rows, line.pm.range.cols);
    const sum = Object.values(own.ratios).reduce((s, v) => s + v, 0);
    const monthly = netMonthly(line, 3);
    Object.entries(own.ratios).forEach(([k, ratio]) => { if (sum) out[k] = (out[k] || 0) + (monthly * ratio) / sum; });
  });
  return out;
};

// ---------- Super Masters (upload only) ----------

export const listSuperMasters = () => delay(masters.map(masterSummary));

export const getSuperMaster = (id) => {
  const m = masterById(id);
  if (!m) return fail("Super Master not found.");
  const fitting = lines.filter((l) => fits(l, m));
  return delay({
    ...masterSummary(m), rows: m.rows, cols: m.cols, cells: m.cells, versions: m.versions, speed: speedCells(m),
    product_masters: lines.filter((l) => l.pm?.master_id === m.id).map(pmCard),
    products_ready_for_pm: fitting.filter((l) => !l.pm).length,
  });
};

// Reads the grid out of an uploaded file. MOCK: returns a sample grid — reading real Excel and
// PDF files is the backend's job. The screen shows this preview so every number is checked
// before it is saved.
export const readSuperMasterFile = (file) => {
  if (!file) return fail("Choose a file.");
  const ext = file.name.split(".").pop().toLowerCase();
  if (!["xlsx", "xls", "csv", "pdf"].includes(ext)) return fail("Upload an Excel (.xlsx, .xls, .csv) or PDF file.");
  const isAdd = /add|kt|prog/i.test(file.name);
  const rows = isAdd ? steps(0, -2) : steps(0, -4);
  const cols = isAdd ? steps(1, 3) : steps(0, -2);
  const cells = isAdd
    ? ratioGrid(rows, cols, (r, c) => 50 * Math.exp(-Math.abs(r) / 1.2) * (1 - Math.abs(c - 2) / 2.5))
    : ratioGrid(rows, cols, minusRatio);
  const base = file.name.replace(/\.[^.]+$/, "");
  return delay({
    file_name: file.name, file_type: ext === "pdf" ? "PDF" : "Excel", col_axis: isAdd ? "add" : "cyl", rows, cols, cells,
    range_text: rangeText([rows[0], rows.at(-1)], [cols[0], cols.at(-1)], isAdd ? "add" : "cyl"), step: Math.abs(rows[1] - rows[0]),
    guess: { code: base.split(/[\s_-]+/)[0].toUpperCase().slice(0, 12), title: base },
  }, 700);
};

export const saveSuperMaster = ({ replaceId, code, title, lens_types, index, diameter, axis, preview }) => {
  if (!preview) return fail("Upload a file first.");
  const cleanCode = (code || "").trim().toUpperCase();
  if (!replaceId) {
    if (!cleanCode) return fail("Enter the master code.");
    if (masters.some((m) => m.code === cleanCode)) return fail(`A Super Master with code ${cleanCode} already exists. Open it and upload a new version instead.`);
  }
  if (!lens_types?.length) return fail("Choose at least one lens type.");
  const version = { cells: clone(preview.cells), rows: preview.rows, cols: preview.cols, file_name: preview.file_name, uploaded_by: currentUser(), at: today() };
  const details = {
    title: (title || "").trim() || cleanCode, lens_types,
    index: index === "" || index === null || index === undefined ? null : Number(index),
    diameter: diameter === "" || diameter === null || diameter === undefined ? null : Number(diameter),
    axis: axis ? Number(axis) : null,
  };
  if (replaceId) {
    const m = masterById(replaceId);
    if (!m) return fail("Super Master not found.");
    m.version += 1;
    Object.assign(m, details, { rows: preview.rows, cols: preview.cols, col_axis: preview.col_axis, cells: clone(preview.cells) });
    m.versions = [{ version: m.version, ...version }, ...m.versions];
    return delay(masterSummary(m));
  }
  const m = { id: cleanCode, code: cleanCode, ...details, col_axis: preview.col_axis, rows: preview.rows, cols: preview.cols, cells: clone(preview.cells), version: 1, versions: [{ version: 1, ...version }] };
  masters.push(m);
  return delay(masterSummary(m));
};

// ---------- Product Masters ----------

export const listProductMasters = () => {
  const withPm = lines.filter((l) => l.pm);
  const result = withPm.map((line) => {
    const card = pmCard(line);
    const m = masterById(line.pm.master_id);
    return {
      ...card,
      master_id: line.pm.master_id,
      master_code: m ? m.code : line.pm.master_id,
      master_title: m ? m.title : "",
      lens_type: line.lens_type,
      index: line.index,
      diameter: line.diameter,
      monthly_sale: netMonthly(line, 3),
      created_at: line.pm.created_at,
      last_order_at: line.pm.last_order_at,
    };
  });
  return delay(result);
};

// Everything the "Create Product Master" page needs: the Super Master's grid and the products
// that fit it (lens type, index, diameter and range).
export const getProductMasterSetup = (masterId) => {
  const m = masterById(masterId);
  if (!m) return fail("Super Master not found.");
  return delay({
    master: { ...masterSummary(m), ...gridOf(m) },
    products: lines.filter((l) => fits(l, m)).map((l) => ({ ...lineSummary(l), figures: figuresFor(l) })),
  });
};

export const createProductMaster = (lineId, { masterId, range, total, basis, months, alert }) => {
  const line = lineById(lineId);
  const m = masterById(masterId);
  if (!line) return fail("Choose a product.");
  if (!m) return fail("Super Master not found.");
  if (line.pm) return fail("This product already has a Product Master.");
  const within = (vals, axis) => vals.every((v) => v >= Math.min(...axis) && v <= Math.max(...axis));
  if (!range || !within(range.rows, m.rows) || !within(range.cols, m.cols)) return fail("Choose powers inside this Super Master.");
  const pieces = Math.floor(Number(total) || 0);
  if (pieces <= 0) return fail("Enter the total pieces.");
  line.pm = {
    master_id: m.id, master_version: m.version, range: clone(range), total: pieces, basis: Number(basis) || 3, months: Number(months) || 6, created_at: today(),
    alert: { qty: alert?.qty ?? null, every_months: alert?.every_months ?? null, set_at: today() },
    last_order_at: null,
    history: [{ action: `Created from Super Master ${m.code} v${m.version} with ${pieces.toLocaleString("en-IN")} pieces`, by: currentUser(), at: today(), note: "" }],
  };
  return delay({ id: line.id });
};

export const getProductMaster = (lineId) => {
  const line = lineById(lineId);
  if (!line?.pm) return fail("Product Master not found.");
  const m = masterById(line.pm.master_id);
  const sheet = orderSheet(line);
  const state = alertState(line);
  const latest = m.versions[0];
  const outside = !(inside(line.pm.range.rows[0], line.row_range) && inside(line.pm.range.rows[1], line.row_range)
    && inside(line.pm.range.cols[0], line.col_range) && inside(line.pm.range.cols[1], line.col_range));
  return delay({
    line: lineSummary(line), figures: figuresFor(line),
    master: { id: m.id, code: m.code, title: m.title, col_axis: m.col_axis, version_used: line.pm.master_version, latest_version: m.version, latest_uploaded_at: latest.at, latest_uploaded_by: latest.uploaded_by },
    taken_text: rangeText(line.pm.range.rows, line.pm.range.cols, m.col_axis), outside_product_range: outside,
    rows: sheet.rows, cols: sheet.cols, cells: sheet.cells, totals: sheet.totals,
    pm: { total: line.pm.total, basis: line.pm.basis, months: line.pm.months, history: line.pm.history, alert: line.pm.alert, last_order_at: line.pm.last_order_at },
    alert_state: state, alert_text: alertText(line.pm.alert), open_po: poBrief(openPoFor(line.id)),
  });
};

export const setProductMasterTotal = (lineId, { total, basis, months }) => {
  const line = lineById(lineId);
  if (!line?.pm) return fail("Product Master not found.");
  const pieces = Math.floor(Number(total) || 0);
  if (pieces <= 0) return fail("Enter the total pieces.");
  if (pieces === line.pm.total) return fail("The total is the same as before.");
  const from = line.pm.total;
  line.pm.total = pieces;
  if (basis) line.pm.basis = Number(basis);
  if (months) line.pm.months = Number(months);
  line.pm.history = [{ action: `Total changed from ${from.toLocaleString("en-IN")} to ${pieces.toLocaleString("en-IN")}`, by: currentUser(), at: today(), note: "" }, ...line.pm.history];
  return getProductMaster(lineId);
};

export const saveProductMasterAlert = (lineId, { qty, every_months }) => {
  const line = lineById(lineId);
  if (!line?.pm) return fail("Product Master not found.");
  const q = qty === null || qty === "" || qty === undefined ? null : Math.floor(Number(qty));
  const e = every_months === null || every_months === "" || every_months === undefined ? null : Number(every_months);
  if (q !== null && !(q >= 0)) return fail("Pieces must be 0 or more.");
  if (e !== null && !(e > 0)) return fail("Months must be more than 0.");
  line.pm.alert = { qty: q, every_months: e, set_at: today() };
  delete ignoredAlerts[lineId];
  line.pm.history = [{ action: `Alert set: ${alertText(line.pm.alert)}`, by: currentUser(), at: today(), note: "" }, ...line.pm.history];
  return getProductMaster(lineId);
};

// A newer Super Master upload never changes a Product Master by itself; a person chooses this.
export const switchToLatestMasterVersion = (lineId) => {
  const line = lineById(lineId);
  if (!line?.pm) return fail("Product Master not found.");
  const m = masterById(line.pm.master_id);
  line.pm.master_version = m.version;
  line.pm.history = [{ action: `Ratios updated to Super Master ${m.code} v${m.version}`, by: currentUser(), at: today(), note: "" }, ...line.pm.history];
  return getProductMaster(lineId);
};

// ---------- Order check: what we have, what we need ----------

export const getOrderCheck = (lineId) => {
  const line = lineById(lineId);
  if (!line?.pm) return fail("Product Master not found.");
  const sheet = orderSheet(line);
  const m = sheet.master;
  return delay({
    line: lineSummary(line), company: COMPANY,
    pm: { total: line.pm.total, master_id: m.id, master_code: m.code, taken_text: rangeText(line.pm.range.rows, line.pm.range.cols, m.col_axis) },
    rows: sheet.rows, cols: sheet.cols, col_axis: m.col_axis, cells: sheet.cells, totals: sheet.totals,
    open_po: poBrief(openPoFor(line.id)),
  });
};

// ---------- Alerts ----------

export const getAlerts = () => {
  const withPm = lines.filter((l) => l.pm);
  const active = [];
  const all = [];
  withPm.forEach((l) => {
    const s = alertState(l);
    const row = { ...pmCard(l), master_code: masterById(l.pm.master_id).code, alert: l.pm.alert, reasons: s.reasons, ignored: s.ignored };
    all.push(row);
    if (s.active) active.push(row);
  });
  return delay({ active, all });
};

export const getAlertCount = () => delay(lines.filter((l) => l.pm && alertState(l).active).length, 0);

export const ignoreAlert = (lineId) => {
  const line = lineById(lineId);
  if (!line?.pm) return fail("Product Master not found.");
  ignoredAlerts[lineId] = { at: today(), have: inventoryFor(line, line.pm.range).have };
  return delay(true);
};

// ---------- Purchase orders ----------

const poLinesFrom = (sheet) => Object.entries(sheet.cells)
  .filter(([, c]) => c.need > 0)
  .map(([key, c]) => ({ key, row: c.row, col: c.col, keep: c.keep, free_stock: c.free, being_made: c.making, on_the_way: c.transit, ordered: c.need, received: 0 }));

const poRows = (po) => (po.stage === "held" ? poLinesFrom(orderSheet(lineById(po.line_id), po.id)) : po.lines);

function poListItem(po) {
  const line = lineById(po.line_id);
  const rows = poRows(po);
  return {
    id: po.id, po_number: po.po_number, stage: po.stage, on_hold: po.on_hold, created_at: po.created_at, supplier_id: po.supplier_id,
    supplier_name: suppliers.find((s) => s.id === po.supplier_id)?.name || "—",
    line: { id: line.id, product: line.product, range_label: line.range_label },
    total_ordered: rows.reduce((s, r) => s + r.ordered, 0), total_received: rows.reduce((s, r) => s + r.received, 0),
  };
}

const poView = (po) => {
  const line = lineById(po.line_id);
  const { rows, cols } = axesFromRange(line.pm.range.rows, line.pm.range.cols);
  return { ...po, ...poListItem(po), company: COMPANY, lines: poRows(po), grid: { rows, cols, col_axis: masterById(line.pm.master_id).col_axis } };
};

const pushHistory = (po, action, note = "") => { po.history = [{ action, by: currentUser(), at: today(), note }, ...po.history]; };

export const listPurchaseOrders = () => delay(purchaseOrders.map(poListItem));

export const getPurchaseOrder = (id) => {
  const po = purchaseOrders.find((p) => p.id === id);
  return po ? delay(poView(po)) : fail("Purchase order not found.");
};

export const createPurchaseOrder = ({ lineId, supplierId }) => {
  const line = lineById(lineId);
  if (!line?.pm) return fail("Create the Product Master first.");
  if (!supplierId) return fail("Choose a supplier.");
  const open = openPoFor(lineId);
  if (open) return fail(`${open.po_number} is already open for this product.`);
  const sheet = orderSheet(line);
  if (sheet.totals.need === 0) return fail("Nothing is needed: what we have covers the Product Master.");
  poCounter += 1;
  const po = {
    id: `PO${poCounter}`, po_number: `PO-2026-${String(poCounter).padStart(4, "0")}`, supplier_id: supplierId, line_id: lineId,
    master_code: sheet.master.code, master_version: line.pm.master_version, pm_total: line.pm.total,
    stage: "held", on_hold: false, hold_reason: "", pi_number: "", pi_value_per_piece: null, packing_list_ref: "",
    lines: poLinesFrom(sheet), history: [], created_by: currentUser(), created_at: today(),
  };
  pushHistory(po, "Created as a held draft");
  purchaseOrders = [po, ...purchaseOrders];
  line.pm.last_order_at = today(); // the month reminder starts again from today
  delete ignoredAlerts[lineId];
  return delay(poView(po));
};

export const advancePurchaseOrder = (id, details = {}) => {
  const po = purchaseOrders.find((p) => p.id === id);
  if (!po) return fail("Purchase order not found.");
  if (po.on_hold) return fail("This order is on hold. Release it first.");
  const index = PO_STAGES.findIndex((s) => s.id === po.stage);
  const next = PO_STAGES[index + 1];
  if (!next || next.id === "received") return fail("Use Receive goods to bring this order into Godown 1.");
  if (next.id === "sent") po.lines = poLinesFrom(orderSheet(lineById(po.line_id), po.id));
  if (next.id === "pi_received") {
    if (!Number(details.pi_value_per_piece)) return fail("Enter the PI value per piece.");
    po.pi_value_per_piece = Number(details.pi_value_per_piece);
    po.pi_number = details.pi_number || "";
  }
  if (next.id === "packing_list") po.packing_list_ref = details.packing_list_ref || "";
  po.stage = next.id;
  pushHistory(po, `Moved to ${next.label}`, details.note || "");
  return delay(poView(po));
};

export const togglePurchaseOrderHold = (id, reason) => {
  const po = purchaseOrders.find((p) => p.id === id);
  if (!po) return fail("Purchase order not found.");
  po.on_hold = !po.on_hold;
  po.hold_reason = po.on_hold ? reason || "" : "";
  pushHistory(po, po.on_hold ? "Put on hold" : "Released from hold", reason || "");
  return delay(poView(po));
};

export const receivePurchaseOrder = (id, receivedNow) => {
  const po = purchaseOrders.find((p) => p.id === id);
  if (!po) return fail("Purchase order not found.");
  if (po.stage !== "shipped") return fail("Only a shipped order can be received.");
  if (po.on_hold) return fail("This order is on hold.");
  let total = 0;
  po.lines.forEach((row) => {
    const pieces = Math.max(0, Math.floor(Number(receivedNow[row.key]) || 0));
    if (!pieces) return;
    row.received += pieces;
    total += pieces;
    if (!stockAdded[po.line_id]) stockAdded[po.line_id] = {};
    stockAdded[po.line_id][row.key] = (stockAdded[po.line_id][row.key] || 0) + pieces;
  });
  if (!total) return fail("Enter the pieces received for at least one power.");
  pushHistory(po, `Received ${total} pieces into Godown 1`);
  if (po.lines.every((row) => row.received >= row.ordered)) {
    po.stage = "received";
    pushHistory(po, "All pieces received. Order closed");
  }
  return delay(poView(po));
};

// ---------- Suppliers and settings ----------

export const listSuppliers = () => delay(suppliers);

export const saveSupplier = (supplier) => {
  if (!supplier.name?.trim()) return fail("Supplier name is required.");
  if (supplier.id) suppliers = suppliers.map((s) => (s.id === supplier.id ? { ...s, ...supplier } : s));
  else suppliers = [...suppliers, { ...supplier, id: `SUP${suppliers.length + 1}`, is_active: true }];
  return delay(suppliers);
};

export const getPurchaseSettings = () => delay(settings);

export const savePurchaseSettings = (next) => {
  settings = clone(next);
  return delay(settings);
};

// ---------- a few sample orders so the lists are not empty ----------

const seedPo = (lineId, stage, piValue) => {
  const line = lineById(lineId);
  const sheet = orderSheet(line);
  poCounter += 1;
  purchaseOrders.push({
    id: `PO${poCounter}`, po_number: `PO-2026-${String(poCounter).padStart(4, "0")}`, supplier_id: "SUP1", line_id: lineId,
    master_code: sheet.master.code, master_version: 1, pm_total: line.pm.total, stage, on_hold: false, hold_reason: "",
    pi_number: piValue ? `PI-${1000 + poCounter}` : "", pi_value_per_piece: piValue || null, packing_list_ref: "",
    lines: poLinesFrom(sheet), created_by: "Purchase team", created_at: "2026-10-20T09:30:00.000Z",
    history: [{ action: `Sample order at stage ${stage}`, by: "Purchase team", at: "2026-10-20T09:30:00.000Z", note: "" }],
  });
};

seedPo("RG00014", "shipped", 38);
seedPo("RG00102", "pi_received", 92);
seedPo("RG00118", "held", null);
