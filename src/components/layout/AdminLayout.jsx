import { Outlet } from "@tanstack/react-router";
import { Rail } from "./Rail";
import { TopBar } from "./TopBar";
import "@/styles/veriwide.css";

export function AdminLayout() {
  return (
    <div className="veriwide-root">
      <Rail />
      <main className="min-w-0 flex flex-col gap-4" style={{ padding: "16px 28px 28px" }}>
        <TopBar />
        {/* Child pages will render here */}
        <Outlet />
      </main>
    </div>
  );
}
