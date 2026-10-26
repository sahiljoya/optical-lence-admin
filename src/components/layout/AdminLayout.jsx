import { useState, useEffect, useCallback } from "react";
import { Outlet } from "@tanstack/react-router";
import { Rail } from "./Rail";
import { TopBar } from "./TopBar";
import "@/styles/veriwide.css";

export function AdminLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("voc_sidebar_collapsed") === "true";
      } catch (e) {
        return false;
      }
    }
    return false;
  });

  const handleToggleSidebar = useCallback(() => {
    // If screen is tablet / mobile or zoomed (< 1024px)
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileMenuOpen((prev) => !prev);
    } else {
      // Desktop / laptop: toggle collapsed mode
      setDesktopCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem("voc_sidebar_collapsed", String(next));
        } catch (e) {
          // ignore
        }
        return next;
      });
    }
  }, []);

  // Automatically close mobile menu when viewport expands to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mobileMenuOpen]);

  return (
    <div className={`veriwide-root ${desktopCollapsed ? "sidebar-collapsed" : ""}`}>
      <Rail
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        collapsed={desktopCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />
      <main className="min-w-0 flex flex-col gap-4 flex-1 px-3.5 sm:px-5 lg:px-7 py-3 sm:py-4 overflow-x-hidden">
        <TopBar
          onToggleSidebar={handleToggleSidebar}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          sidebarOpen={mobileMenuOpen}
          desktopCollapsed={desktopCollapsed}
        />
        {/* Child pages will render here */}
        <Outlet />
      </main>
    </div>
  );
}
