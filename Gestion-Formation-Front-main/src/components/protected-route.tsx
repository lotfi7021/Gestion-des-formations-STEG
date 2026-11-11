import { useEffect, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { useAuth } from "../contexts/auth-context";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: ReactNode;
  requiredRole?: string | string[];
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  const hasRole = requiredRole
    ? Array.isArray(requiredRole)
      ? requiredRole.includes(user?.role || "")
      : user?.role === requiredRole
    : true;

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.navigate({ to: "/connexion" });
      return;
    }
    if (!hasRole) {
      router.navigate({ to: "/" });
    }
  }, [isAuthenticated, isLoading, user, requiredRole, hasRole, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (!hasRole) return null;

  return <>{children}</>;
}
