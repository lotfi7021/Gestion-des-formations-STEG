import { Outlet, createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/protected-route";

export const Route = createFileRoute("/admin")({
  component: () => (
    <ProtectedRoute requiredRole="admin">
      <Outlet />
    </ProtectedRoute>
  ),
});
