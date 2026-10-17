import { useState } from "react";
import { Outlet } from "@tanstack/react-router";
import { Rail } from "./Rail";
import { TopBar } from "./TopBar";
import "@/styles/veriwide.css";

export function AdminLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="veriwide-root">
      <Rail mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      <main className="min-w-0 flex flex-col gap-4 flex-1 px-3.5 sm:px-5 lg:px-7 py-3 sm:py-4">
        <TopBar onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        {/* Child pages will render here */}
        <Outlet />
      </main>
    </div>
  );
}
