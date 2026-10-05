import { createFileRoute } from "@tanstack/react-router";
import { Login } from "@/pages/auth/Login";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — VOC ERP" },
      { name: "description", content: "Sign in to Vishal Optical Co. ERP." },
    ]
  }),
  component: Login,
});
