import { useState } from "react";
import { ChevronRight, CreditCard, GitBranch, Bell, Search, Headphones, UserPlus, Receipt, TrendingUp, Send, Users, Clock, AlertCircle, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartsRow } from "./components/Charts";
import { kpis, pipeline, ordersByRange, rangeMeta } from "./components/mockData";
import { ArrowUp, ArrowDown } from "lucide-react";
import { BarChart3, Package, Tag, Truck, Trophy, Wallet, CheckCircle2 } from "lucide-react";

const ICONS = { BarChart3, Package, Tag, Truck, Trophy, Wallet, CheckCircle2 };

import { StatusPill } from "@/components/common/StatusPill";

function CardHead({ icon, title, right }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon && <span className="grid place-items-center rounded-lg" style={{ width: 28, height: 28, background: "var(--primary-tint)", color: "var(--primary-pressed)" }}>{icon}</span>}
      <span style={{ fontSize: 15, fontWeight: 600 }}>{title}</span>
      <div className="ml-auto">{right}</div>
    </div>
  );
}

function Spark({ data, color }) {
  const w = 90, h = 28, max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 2 - ((v - min) / (max - min || 1)) * (h - 6)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} className="absolute" style={{ right: 10, bottom: 10 }}>
      <path d={`${line} L${w},${h} L0,${h} Z`} style={{ fill: color, opacity: 0.2 }} />
      <path d={line} fill="none" strokeWidth={2} style={{ stroke: color, opacity: 0.7 }} />
    </svg>
  );
}

function Kpis() {
  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      {kpis.map((k) => {
        const I = ICONS[k.icon];
        const color = `var(--t-${k.theme}-ic)`;
        return (
          <div key={k.label} className="vw-tile" style={{ background: `var(--t-${k.theme}-bg)` }}>
            <div className="flex gap-3">
              <span className="grid place-items-center shrink-0" style={{ width: 44, height: 44, borderRadius: 12, background: color, color: "var(--on-primary)" }}><I size={22} /></span>
              <div className="min-w-0">
                <div className="truncate" style={{ fontSize: 12, color: "var(--muted)" }}>{k.label}</div>
                <div className="truncate" style={{ fontSize: k.value.length > 8 ? 18 : 24, fontWeight: 700, lineHeight: 1.25 }}>{k.value}</div>
              </div>
            </div>
            <div className="mt-2" style={{ fontSize: 12 }}>
              {"sub" in k ? <span style={{ color: "var(--muted)", fontWeight: 600 }}>{k.sub}</span> : (
                <span className="inline-flex items-center gap-0.5" style={{ fontWeight: 600, color: k.good ? "var(--up)" : "var(--down)" }}>
                  {k.dir === "up" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}{k.delta}
                </span>
              )}
              {!("sub" in k) && <div style={{ fontSize: 11, color: "var(--muted)" }}>vs last month</div>}
            </div>
            <Spark data={k.spark} color={color} />
          </div>
        );
      })}
    </div>
  );
}

export function Dashboard() {
  const [range, setRange] = useState("this-month");
  const meta = rangeMeta[range] ?? rangeMeta["this-month"];
  const muted = { fontSize: 12, color: "var(--muted)" };

  return (
    <>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr_340px]">
        <div className="vw-card flex flex-col md:flex-row items-start md:items-center gap-5" style={{ padding: "20px 24px" }}>
          <div className="min-w-0">
            <div style={muted}>Home&nbsp;&nbsp;&gt;&nbsp;&nbsp;Dashboard</div>
            <div className="flex items-center gap-4 mt-3">
              <span className="grid place-items-center rounded-full shrink-0" style={{ width: 64, height: 64, background: "var(--primary-gradient)", color: "var(--on-primary)", fontSize: 22, fontWeight: 700, boxShadow: "var(--glow)" }}>VO</span>
              <div>
                <div className="flex items-center gap-2"><span style={{ fontSize: 22, fontWeight: 700 }}>Vishal Optical Co.</span><StatusPill status="active" /></div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>Owner dashboard&nbsp;&nbsp;-&nbsp;&nbsp;Activity from {meta.text} (IST)</div>
              </div>
            </div>
          </div>
          <div className="mt-4 md:mt-0 w-full md:w-auto md:ml-auto md:pl-5 flex flex-col gap-3 md:border-l border-divider">
            <div className="flex flex-wrap gap-4 md:gap-6">
              {[["Period", meta.period], ["Orders today", meta.today], ["Active customers", meta.active], ["Last synced", "2 min ago"]].map(([l, v]) => (
                <div key={l} className="whitespace-nowrap"><div style={muted}>{l}</div><div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div></div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger className="h-10 w-[150px] rounded-[10px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="this-month">This month</SelectItem>
                  <SelectItem value="last-month">Last month</SelectItem>
                  <SelectItem value="last-3">Last 3 months</SelectItem>
                </SelectContent>
              </Select>
              <button className="vw-btn-primary h-10" style={{ fontSize: 14 }}>+ New Order</button>
            </div>
          </div>
        </div>

        <div className="vw-card" style={{ padding: "16px 20px" }}>
          <CardHead icon={<CreditCard size={16} />} title="Credit & Receivables" right={<ChevronRight size={18} style={{ color: "var(--muted)" }} />} />
          {[["Total outstanding", "₹21,30,000"], ["Overdue (60+ days)", "₹4,80,000", "var(--p-overdue)"], ["Avg payment days", "18 Days"], ["Credit approvals pending", "9"]].map(([l, v, c], i) => (
            <div key={l} className="flex justify-between py-2" style={{ borderTop: i ? "1px solid var(--divider)" : undefined }}>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>{l}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: c }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="flex flex-wrap items-center gap-3 py-2">
        <h3 className="w-full md:w-auto" style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, marginRight: 8 }}>Quick Actions</h3>
        
        <button className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 hover:border-blue-200 px-4 py-2 rounded-xl text-[13px] font-semibold text-slate-700 transition-all shadow-sm group">
          <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors"><UserPlus size={16} /></span>
          Create Customer
        </button>

        <button className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 hover:border-emerald-200 px-4 py-2 rounded-xl text-[13px] font-semibold text-slate-700 transition-all shadow-sm group">
          <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors"><Receipt size={16} /></span>
          Add Payment
        </button>

        <button className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 hover:border-amber-200 px-4 py-2 rounded-xl text-[13px] font-semibold text-slate-700 transition-all shadow-sm group">
          <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors"><TrendingUp size={16} /></span>
          Credit Request
        </button>

        <button className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 hover:border-indigo-200 px-4 py-2 rounded-xl text-[13px] font-semibold text-slate-700 transition-all shadow-sm group">
          <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Send size={16} /></span>
          Send Reminder
        </button>
      </div>

      <Kpis />
      <ChartsRow />

      <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        
        {/* 1. Pending Orders */}
        <div className="vw-card" style={{ padding: "16px 18px" }}>
          <CardHead icon={<Clock size={16} />} title="Recent Pending Orders" note="Needs dispatch" />
          <div className="space-y-3 mt-4">
            {[
              { id: "ORD-9021", shop: "Vision Plus", amount: "₹4,500", date: "2 hrs ago" },
              { id: "ORD-9020", shop: "Clear Optics", amount: "₹1,200", date: "4 hrs ago" },
              { id: "ORD-9018", shop: "Sunshine Eyewear", amount: "₹12,400", date: "Yesterday" }
            ].map(ord => (
              <div key={ord.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                <div>
                  <div className="font-semibold text-[13px] text-blue-600 hover:underline cursor-pointer">{ord.id}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{ord.shop} • {ord.date}</div>
                </div>
                <div className="font-bold text-[13px] text-slate-800">{ord.amount}</div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 text-[12px] font-semibold text-blue-600 hover:bg-blue-50 py-2 rounded-lg transition-colors">View All Pending Orders</button>
        </div>

        {/* 2. Pending Customers */}
        <div className="vw-card" style={{ padding: "16px 18px" }}>
          <CardHead icon={<Users size={16} />} title="Pending Approvals" note="Needs KYC" />
          <div className="space-y-3 mt-4">
            {[
              { id: "CUST-1045", shop: "Rajat Vision", city: "Delhi", date: "Today" },
              { id: "CUST-1046", shop: "Global Optics", city: "Pune", date: "Yesterday" }
            ].map(cust => (
              <div key={cust.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                <div>
                  <div className="font-semibold text-[13px] text-slate-800">{cust.shop}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{cust.id} • {cust.city}</div>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 bg-amber-100 text-amber-700 rounded border border-amber-200">Pending</div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 text-[12px] font-semibold text-blue-600 hover:bg-blue-50 py-2 rounded-lg transition-colors">Review Pending Accounts</button>
        </div>
        
        {/* 3. Pending & Overdue (Monthly Data) */}
        <div className="vw-card" style={{ padding: "16px 18px" }}>
          <CardHead icon={<AlertCircle size={16} />} title="Pending & Overdue" note="Monthly Snapshot" />
          
          <div className="mt-4 space-y-4">
            {/* This Month */}
            <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/30">
              <div className="flex items-center gap-2 mb-2 text-[12px] font-bold text-slate-600 uppercase tracking-wider">
                <Calendar size={14} className="text-blue-500" /> This Month (Oct)
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] text-slate-500 mb-0.5">Total Ordered</div>
                  <div className="text-[14px] font-bold text-slate-800">₹8,45,000</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 mb-0.5">Payment Received</div>
                  <div className="text-[14px] font-bold text-emerald-600">₹5,20,000</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-100/50 flex justify-between items-center">
                <span className="text-[11px] font-semibold text-slate-500">Unpaid / Pending</span>
                <span className="text-[13px] font-bold text-rose-600">₹3,25,000</span>
              </div>
            </div>

            {/* Last Month */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2 text-[12px] font-bold text-slate-600 uppercase tracking-wider">
                <Calendar size={14} className="text-slate-400" /> Last Month (Sep)
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] text-slate-500 mb-0.5">Total Ordered</div>
                  <div className="text-[14px] font-bold text-slate-800">₹14,20,000</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 mb-0.5">Payment Received</div>
                  <div className="text-[14px] font-bold text-emerald-600">₹12,80,000</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                <span className="text-[11px] font-semibold text-slate-500">Overdue (Unpaid)</span>
                <span className="text-[13px] font-bold text-rose-600">₹1,40,000</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
