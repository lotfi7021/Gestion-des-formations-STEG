import { Outlet, createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-auth";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    requireAuth(["admin"]);
  },
  component: Outlet,
});
