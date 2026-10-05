import { Search, Bell, ChevronDown } from "lucide-react";
import { useIst } from "@/hooks/useIst";

export function TopBar() {
  const { d, t } = useIst();
  return (
    <div className="flex items-center gap-4" style={{ height: 64 }}>
      <label className="flex items-center gap-2 flex-1" style={{ maxWidth: 640, height: 44, background: "var(--search-bg)", border: "1px solid var(--card-border)", borderRadius: 999, padding: "0 16px" }}>
        <Search size={18} style={{ color: "var(--faint)" }} />
        <input className="flex-1 bg-transparent outline-none" style={{ fontSize: 14 }} placeholder="Search customers, orders, products, invoices..." />
      </label>
      <div className="ml-auto flex items-center gap-3">
        <button aria-label="Notifications" className="relative grid place-items-center rounded-full" style={{ width: 40, height: 40, background: "var(--card)", border: "1px solid var(--card-border)" }}>
          <Bell size={18} /><span className="absolute rounded-full" style={{ top: 8, right: 9, width: 8, height: 8, background: "var(--t-pink-ic)" }} />
        </button>
        <span className="grid place-items-center rounded-full" style={{ width: 36, height: 36, background: "var(--primary-gradient)", color: "var(--on-primary)", fontSize: 13, fontWeight: 600 }}>OW</span>
        <button className="flex items-center gap-1" style={{ fontSize: 14, fontWeight: 500 }}>Owner <ChevronDown size={16} /></button>
        <span style={{ width: 1, height: 32, background: "var(--card-border)" }} />
        <div className="text-right"><div style={{ fontSize: 14, fontWeight: 600 }}>{d}</div><div style={{ fontSize: 12, color: "var(--muted)" }}>{t}</div></div>
      </div>
    </div>
  );
}
