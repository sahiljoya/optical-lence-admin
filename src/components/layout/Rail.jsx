import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Home, Users, ClipboardList, Package, Receipt, Truck, Undo2, BarChart3, KeyRound, Headphones, Search, ListChecks, RefreshCw, X, History, ChevronLeft, ChevronRight, Scale
} from "lucide-react";
import { hasPermission } from "@/lib/permissions";
import { getItem } from "@/services/storage";
import "@/styles/veriwide.css";

export function Rail({ mobileOpen = false, onMobileClose, collapsed = false, onToggleCollapse }) {
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
    ["Logistics & Courier Billing", Scale, "/courier-reconciliation", "MANAGE_DISPATCH"],
    ["Pick List", ListChecks, "/pick-list", "MANAGE_DISPATCH"],
    ["Reserve Stock", RefreshCw, "/replenishment", "VIEW_INVENTORY"],
    ["Returns", Undo2, "/returns", "VIEW_ORDERS"],
    ["Reports", BarChart3, "/reports", null],
    ["Access", KeyRound, "/settings", "MANAGE_USERS"],
    ...(isOwnerAdmin ? [["Activity Logs", History, "/logs", null]] : [])
  ].filter(([, , , permission]) => !permission || hasPermission(permission));

  // Close mobile drawer on Escape key press
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && onMobileClose) {
        onMobileClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, onMobileClose]);

  const renderNavLinks = (isMobile = false, isCollapsed = false) => (
    <>
      <nav className={`flex-1 space-y-1 ${isCollapsed ? "flex flex-col items-center" : ""}`}>
        {nav.map(([l, I, href]) => (
          href === "#" ? (
            <button
              key={l}
              type="button"
              className={`vw-nav ${isCollapsed ? "vw-nav-collapsed" : "w-full"} opacity-50 cursor-not-allowed hover:bg-transparent`}
              title={isCollapsed ? l : undefined}
              onClick={(e) => e.preventDefault()}
            >
              <I size={20} className="shrink-0" />
              {!isCollapsed && <span className="truncate">{l}</span>}
            </button>
          ) : (
            <Link 
              key={l} 
              to={href} 
              className={`vw-nav ${isCollapsed ? "vw-nav-collapsed" : "w-full"}`} 
              title={l}
              activeProps={{ className: "active" }} 
              activeOptions={{ exact: href === "/" }}
              onClick={() => {
                if (isMobile && onMobileClose) onMobileClose();
              }}
            >
              <I size={20} className="shrink-0" />
              {!isCollapsed && <span className="truncate">{l}</span>}
            </Link>
          )
        ))}
      </nav>
      {hasPermission("MANAGE_SUPPORT") && (
        isCollapsed ? (
          <Link
            to="/support"
            className="mt-auto mx-auto grid place-items-center rounded-xl hover:bg-slate-100 transition-colors shrink-0"
            style={{ width: 44, height: 44, background: "var(--soft-bg)", color: "var(--primary)" }}
            title="Support (Manage Tickets)"
          >
            <Headphones size={20} />
          </Link>
        ) : (
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
        )
      )}
    </>
  );

  return (
    <>
      {/* 1. Desktop Sticky Rail (Hidden on mobile / tablet / zoomed < 1024px) */}
      <aside className={`hidden lg:flex vw-rail ${collapsed ? "vw-rail-collapsed" : ""}`}>
        <div className={`flex items-center ${collapsed ? "justify-center flex-col gap-3" : "justify-between"} mb-6 px-1`}>
          {!collapsed ? (
            <>
              <div className="flex items-center gap-3 min-w-0">
                <svg width="34" height="19" viewBox="0 0 36 20" fill="none" style={{ stroke: "var(--ink)" }} strokeWidth="2" className="shrink-0">
                  <rect x="1" y="3" width="13" height="13" rx="5" /><rect x="22" y="3" width="13" height="13" rx="5" />
                  <path d="M14 8 q4 -3 8 0" />
                </svg>
                <div className="min-w-0">
                  <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.1 }} className="truncate">VOC ERP</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }} className="truncate">Vishal Optical Co.</div>
                </div>
              </div>
              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  title="Collapse sidebar"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                  aria-label="Collapse sidebar"
                >
                  <ChevronLeft size={18} />
                </button>
              )}
            </>
          ) : (
            <>
              <svg width="28" height="16" viewBox="0 0 36 20" fill="none" style={{ stroke: "var(--ink)" }} strokeWidth="2.2" className="shrink-0">
                <rect x="1" y="3" width="13" height="13" rx="5" /><rect x="22" y="3" width="13" height="13" rx="5" />
                <path d="M14 8 q4 -3 8 0" />
              </svg>
              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  title="Expand sidebar"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                  aria-label="Expand sidebar"
                >
                  <ChevronRight size={18} />
                </button>
              )}
            </>
          )}
        </div>
        {renderNavLinks(false, collapsed)}
      </aside>

      {/* 2. Mobile / Tablet / Zoom Off-Canvas Slide Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50">
          {/* Dark Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200 cursor-pointer"
            onClick={onMobileClose}
            aria-label="Close overlay"
          />
          {/* Slide-in Drawer */}
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white z-50 flex flex-col p-5 shadow-2xl overflow-y-auto animate-in slide-in-from-left duration-200 border-r border-slate-200">
            <div className="flex items-center justify-between mb-6 px-1">
              <div className="flex items-center gap-3">
                <svg width="34" height="19" viewBox="0 0 36 20" fill="none" style={{ stroke: "var(--ink)" }} strokeWidth="2">
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
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close menu"
                title="Close menu"
              >
                <X size={20} />
              </button>
            </div>
            {renderNavLinks(true, false)}
          </aside>
        </div>
      )}
    </>
  );
}
