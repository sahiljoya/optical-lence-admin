import { Link } from "@tanstack/react-router";
import {
  Home, Users, ClipboardList, Package, Receipt, Truck, Undo2, BarChart3, KeyRound, Headphones, Search, ListChecks, RefreshCw
} from "lucide-react";
import { hasPermission } from "@/lib/permissions";
import "@/styles/veriwide.css";

export function Rail() {
  const nav = [
    ["Dashboard", Home, "/", null],
    ["Customers", Users, "/customers", "VIEW_CUSTOMERS"],
    ["Orders", ClipboardList, "/orders", "VIEW_ORDERS"],
    ["Products", Package, "/products", "VIEW_PRODUCTS"],
    ["Find My Lens", Search, "/find-my-lens", "VIEW_INVENTORY"],
    ["Billing", Receipt, "/billing", "VIEW_CUSTOMERS"],
    ["Dispatch", Truck, "/dispatch", "MANAGE_DISPATCH"],
    ["Pick List", ListChecks, "/pick-list", "MANAGE_DISPATCH"],
    ["Replenishment", RefreshCw, "/replenishment", "VIEW_INVENTORY"],
    ["Returns", Undo2, "/returns", "VIEW_ORDERS"],
    ["Reports", BarChart3, "/reports", null],
    ["Access", KeyRound, "/settings", "MANAGE_USERS"]
  ].filter(([, , , permission]) => !permission || hasPermission(permission));

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
            <button key={l} type="button" className="vw-nav w-full opacity-50 cursor-not-allowed hover:bg-transparent" onClick={(e) => e.preventDefault()}><I size={20} />{l}</button>
          ) : (
            <Link key={l} to={href} className="vw-nav w-full" activeProps={{ className: "active" }} activeOptions={{ exact: href === "/" }}>
              <I size={20} />{l}
            </Link>
          )
        ))}
      </nav>
      {hasPermission("MANAGE_SUPPORT") && (
        <Link to="/support" className="mt-auto flex items-center gap-3 w-full hover:bg-slate-100 transition-colors" style={{ background: "var(--soft-bg)", borderRadius: 14, padding: 14 }}>
          <span className="grid place-items-center rounded-full shrink-0" style={{ width: 36, height: 36, background: "var(--card)", color: "var(--primary)" }}><Headphones size={18} /></span>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 14, fontWeight: 600 }} className="text-slate-800">Support</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }} className="truncate">Manage Tickets</div>
          </div>
        </Link>
      )}
    </aside>
  );
}
