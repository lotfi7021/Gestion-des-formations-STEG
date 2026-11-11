import { redirect } from "@tanstack/react-router";
import type { User } from "@/lib/api/auth";
import { getAccessToken, getRefreshToken } from "@/lib/api/client";

const USER_STORAGE_KEY = "steg_auth_user";

export function saveAuthUser(user: User) {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // localStorage indisponible : la session reste valide en mémoire
  }
}

export function getAuthUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function clearAuthUser() {
  try {
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function requireAuth(roles?: string[]): User | null {
  if (typeof window === "undefined") return null;

  const hasSession = Boolean(getAccessToken() || getRefreshToken());
  const user = getAuthUser();

  if (!hasSession || !user) {
    throw redirect({ to: "/connexion" });
  }

  if (roles && !roles.includes(user.role)) {
    throw redirect({ to: "/" });
  }

  return user;
}
