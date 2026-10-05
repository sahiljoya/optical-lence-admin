import { Link } from "@tanstack/react-router";
import { 
  Home, Users, ClipboardList, Package, Receipt, Truck, Undo2, BarChart3, KeyRound, Headphones
} from "lucide-react";
import "@/styles/veriwide.css";

export function Rail() {
  const nav = [
    ["Dashboard", Home, "/"], 
    ["Customers", Users, "/customers"], 
    ["Orders", ClipboardList, "/orders"], 
    ["Inventory", Package, "/products"], 
    ["Billing", Receipt, "#"], 
    ["Dispatch", Truck, "#"], 
    ["Returns", Undo2, "#"], 
    ["Reports", BarChart3, "#"], 
    ["Access", KeyRound, "/settings"]
  ];
  
  return (
    <aside className="vw-rail">
      <div className="flex items-center gap-3 mb-6 px-1">
        <svg width="36" height="20" viewBox="0 0 36 20" fill="none" style={{ stroke: "var(--ink)" }} strokeWidth="2">
          <rect x="1" y="3" width="13" height="13" rx="5" /><rect x="22" y="3" width="13" height="13" rx="5" />
          <path d="M14 8 q4 -3 8 0" />
        </svg>
        <div><div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>VOC ERP</div><div style={{ fontSize: 12, color: "var(--muted)" }}>Vishal Optical Co.</div></div>
      </div>
      <nav>
        {nav.map(([l, I, href]) => (
          href === "#" ? (
            <button key={l} className="vw-nav w-full"><I size={20} />{l}</button>
          ) : (
            <Link key={l} to={href} className="vw-nav w-full" activeProps={{ className: "active" }} activeOptions={{ exact: href === "/" }}>
              <I size={20} />{l}
            </Link>
          )
        ))}
      </nav>
      <div className="mt-auto flex items-center gap-3" style={{ background: "var(--soft-bg)", borderRadius: 14, padding: 14 }}>
        <span className="grid place-items-center rounded-full" style={{ width: 36, height: 36, background: "var(--card)", color: "var(--primary)" }}><Headphones size={18} /></span>
        <div><div style={{ fontSize: 14, fontWeight: 600 }}>Support</div><div style={{ fontSize: 12, color: "var(--muted)" }}>Mon - Sat, 9 AM - 6 PM</div></div>
      </div>
    </aside>
  );
}
