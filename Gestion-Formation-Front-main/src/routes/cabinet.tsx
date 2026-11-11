import { Outlet, createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/protected-route";

export const Route = createFileRoute("/cabinet")({
  component: () => (
    <ProtectedRoute requiredRole="cabinet">
      <Outlet />
    </ProtectedRoute>
  ),
});
