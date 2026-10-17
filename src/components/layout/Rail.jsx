import { Link } from "@tanstack/react-router";
import {
  Home, Users, ClipboardList, Package, Receipt, Truck, Undo2, BarChart3, KeyRound, Headphones, Search, ListChecks, RefreshCw, X, History
} from "lucide-react";
import { hasPermission } from "@/lib/permissions";
import { getItem } from "@/services/storage";
import "@/styles/veriwide.css";

export function Rail({ mobileOpen = false, onMobileClose }) {
  // Activity Logs is hardcoded to the literal "admin" (Owner) role — it is never
  // exposed as a grantable permission in Roles & Access, by design.
  const isOwnerAdmin = getItem("admin_user")?.role?.name === "admin";

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
    ["Access", KeyRound, "/settings", "MANAGE_USERS"],
    ...(isOwnerAdmin ? [["Activity Logs", History, "/logs", null]] : [])
  ].filter(([, , , permission]) => !permission || hasPermission(permission));

  const renderNavLinks = (isMobile = false) => (
    <>
      <nav className="flex-1 space-y-1">
        {nav.map(([l, I, href]) => (
          href === "#" ? (
            <button key={l} type="button" className="vw-nav w-full opacity-50 cursor-not-allowed hover:bg-transparent" onClick={(e) => e.preventDefault()}><I size={20} />{l}</button>
          ) : (
            <Link 
              key={l} 
              to={href} 
              className="vw-nav w-full" 
              activeProps={{ className: "active" }} 
              activeOptions={{ exact: href === "/" }}
              onClick={() => {
                if (isMobile && onMobileClose) onMobileClose();
              }}
            >
              <I size={20} />{l}
            </Link>
          )
        ))}
      </nav>
      {hasPermission("MANAGE_SUPPORT") && (
        <Link 
          to="/support" 
          className="mt-auto flex items-center gap-3 w-full hover:bg-slate-100 transition-colors" 
          style={{ background: "var(--soft-bg)", borderRadius: 14, padding: 14 }}
          onClick={() => {
            if (isMobile && onMobileClose) onMobileClose();
          }}
        >
          <span className="grid place-items-center rounded-full shrink-0" style={{ width: 36, height: 36, background: "var(--card)", color: "var(--primary)" }}><Headphones size={18} /></span>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 14, fontWeight: 600 }} className="text-slate-800">Support</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }} className="truncate">Manage Tickets</div>
          </div>
        </Link>
      )}
    </>
  );

  return (
    <>
      {/* 1. Desktop Sticky Rail (Hidden on mobile / tablet < 1024px) */}
      <aside className="hidden lg:flex vw-rail">
        <div className="flex items-center gap-3 mb-6 px-1">
          <svg width="36" height="20" viewBox="0 0 36 20" fill="none" style={{ stroke: "var(--ink)" }} strokeWidth="2">
            <rect x="1" y="3" width="13" height="13" rx="5" /><rect x="22" y="3" width="13" height="13" rx="5" />
            <path d="M14 8 q4 -3 8 0" />
          </svg>
          <div><div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>VOC ERP</div><div style={{ fontSize: 12, color: "var(--muted)" }}>Vishal Optical Co.</div></div>
        </div>
        {renderNavLinks(false)}
      </aside>

      {/* 2. Mobile Off-Canvas Slide Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Dark Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={onMobileClose}
          />
          {/* Slide-in Drawer */}
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white z-50 flex flex-col p-5 shadow-2xl overflow-y-auto animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between mb-6 px-1">
              <div className="flex items-center gap-3">
                <svg width="36" height="20" viewBox="0 0 36 20" fill="none" style={{ stroke: "var(--ink)" }} strokeWidth="2">
                  <rect x="1" y="3" width="13" height="13" rx="5" /><rect x="22" y="3" width="13" height="13" rx="5" />
                  <path d="M14 8 q4 -3 8 0" />
                </svg>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>VOC ERP</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>Vishal Optical Co.</div>
                </div>
              </div>
              <button 
                type="button"
                onClick={onMobileClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>
            {renderNavLinks(true)}
          </aside>
        </div>
      )}
    </>
  );
}
