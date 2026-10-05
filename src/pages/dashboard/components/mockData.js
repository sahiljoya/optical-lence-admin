export const inr = (n) => "₹" + n.toLocaleString("en-IN");

export const kpis = [
  { theme: "blue", icon: "BarChart3", label: "Total Sales (MTD)", value: "₹48.6 L", delta: "12.1%", dir: "up", good: true, spark: [3, 5, 4, 6, 5, 7, 8] },
  { theme: "green", icon: "Package", label: "Total Orders", value: "1,284", delta: "14%", dir: "up", good: true, spark: [4, 4, 5, 6, 6, 7, 8] },
  { theme: "purple", icon: "Tag", label: "Avg Order Value", value: "₹3,785", delta: "4.2%", dir: "up", good: true, spark: [5, 4, 5, 5, 6, 5, 6] },
  { theme: "orange", icon: "Truck", label: "Pending Dispatch", value: "73", delta: "6.2%", dir: "down", good: true, spark: [8, 7, 7, 6, 6, 5, 5] },
  { theme: "teal", icon: "Trophy", label: "Top Selling Lens", value: "Progressive", sub: "(38% of sales)", spark: [4, 5, 5, 6, 7, 7, 8] },
  { theme: "pink", icon: "Wallet", label: "Outstanding", value: "₹21.3 L", delta: "3.8%", dir: "up", good: false, spark: [5, 5, 6, 6, 6, 7, 7] },
];

export const salesAmount = [
  { m: "May", v: 41.5 }, { m: "Jun", v: 46.3 }, { m: "Jul", v: 43.1 },
  { m: "Aug", v: 47.0 }, { m: "Sep", v: 45.2 }, { m: "Oct", v: 48.6 },
];
export const orderCounts = [
  { m: "May", v: 1020 }, { m: "Jun", v: 1140 }, { m: "Jul", v: 1085 },
  { m: "Aug", v: 1190 }, { m: "Sep", v: 1215 }, { m: "Oct", v: 1284 },
];
export const orderCountsAlt = [
  { m: "Apr", v: 980 }, { m: "May", v: 1020 }, { m: "Jun", v: 1140 },
  { m: "Jul", v: 1085 }, { m: "Aug", v: 1190 }, { m: "Sep", v: 1215 },
];
export const lensMix = [
  { name: "Progressive", v: 38 }, { name: "Single Vision", v: 27 }, { name: "KT", v: 14 },
  { name: "RX", v: 12 }, { name: "Others", v: 9 },
];
export const lensMixAlt = [
  { name: "Progressive", v: 35 }, { name: "Single Vision", v: 30 }, { name: "KT", v: 13 },
  { name: "RX", v: 13 }, { name: "Others", v: 9 },
];

export const pipeline = [
  { name: "Received", n: 96 }, { name: "Credit Check", n: 41, slow: true },
  { name: "Packing", n: 58 }, { name: "Dispatched", n: 112 }, { name: "Delivered", n: 977 },
];

const ordersOct = [
  { no: "SO-1284", c: "Shree Opticals", d: "02 Oct 2026", a: 42500, s: "pending" },
  { no: "SO-1283", c: "Anand Eye Care", d: "01 Oct 2026", a: 68700, s: "delivered" },
  { no: "SO-1282", c: "Metro Optical", d: "01 Oct 2026", a: 31200, s: "delivered" },
  { no: "SO-1281", c: "Clear Sight Opticians", d: "30 Sep 2026", a: 55600, s: "process" },
  { no: "SO-1280", c: "SeeWell Vision", d: "30 Sep 2026", a: 24800, s: "delivered" },
];
const ordersSep = [
  { no: "SO-1190", c: "Vision Plus", d: "29 Sep 2026", a: 38900, s: "delivered" },
  { no: "SO-1189", c: "Shree Opticals", d: "28 Sep 2026", a: 51200, s: "delivered" },
  { no: "SO-1188", c: "Optic World", d: "27 Sep 2026", a: 27400, s: "delivered" },
  { no: "SO-1187", c: "Metro Optical", d: "26 Sep 2026", a: 44100, s: "delivered" },
  { no: "SO-1186", c: "Anand Eye Care", d: "25 Sep 2026", a: 19800, s: "delivered" },
];
export const ordersByRange = {
  "this-month": ordersOct, "last-month": ordersSep, "last-3": ordersOct,
};
export const rangeMeta = {
  "this-month": { period: "Oct 2026", today: "128", active: "186", text: "1 Oct 2026 to 31 Oct 2026" },
  "last-month": { period: "Sep 2026", today: "—", active: "179", text: "1 Sep 2026 to 30 Sep 2026" },
  "last-3": { period: "Aug–Oct 2026", today: "128", active: "204", text: "1 Aug 2026 to 31 Oct 2026" },
};

export const approvals = [
  { c: "Shree Opticals", t: "Credit limit", a: 500000, by: "Account Manager 1", age: "2h" },
  { c: "Anand Eye Care", t: "Return", a: 18400, by: "Account Manager 2", age: "3h" },
  { c: "Metro Optical", t: "Credit limit", a: 300000, by: "Account Manager 1", age: "5h" },
  { c: "Clear Sight Opticians", t: "Return", a: 9750, by: "Account Manager 3", age: "1d" },
];

export const dispatch = [
  { icon: "Truck", tone: "blue", t: "Batch B-2291  -  12 parcels", s: "Surat route", st: "onroute", label: "On route" },
  { icon: "Package", tone: "orange", t: "Batch B-2292  -  9 parcels", s: "Delhi route", st: "process", label: "Loaded" },
  { icon: "Package", tone: "orange", t: "Batch B-2293  -  14 parcels", s: "Pune route", st: "packed", label: "Packed" },
  { icon: "CheckCircle2", tone: "green", t: "Batch B-2290  -  7 parcels", s: "Jaipur route", st: "delivered", label: "Delivered" },
];

export const initialNotes = [
  "Follow up on payments overdue by more than 60 days.",
  "3 customers are close to their credit limit.",
  "Stock-out risk: Progressive 1.67.",
  "Month-end billing on 30 Oct.",
];
