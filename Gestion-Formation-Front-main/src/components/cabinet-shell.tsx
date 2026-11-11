import { Link, useRouterState, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  GraduationCap,
  CalendarDays,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "../contexts/auth-context";
import { API_URL } from "@/lib/api/client";
import { DarkModeToggle, NotificationBell } from "./shared-components";

const nav = [
  { to: "/cabinet", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { to: "/cabinet/formations", label: "Formations", icon: BookOpen },
  { to: "/cabinet/sessions", label: "Sessions", icon: CalendarDays },
  { to: "/cabinet/formateurs", label: "Formateurs", icon: GraduationCap },
];

export function CabinetShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.navigate({ to: "/" });
  };
  return (
    <div className="min-h-screen bg-secondary/40 text-foreground">
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
          <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
            <img src="/images/logoadmin.png" alt="steg_form" className="h-10 w-auto" />
            <span className="font-display text-2xl">steg_form</span>
            <span className="ml-auto rounded-md bg-sidebar-accent px-2 py-0.5 text-[10px] uppercase tracking-wide">
              Cabinet
            </span>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {nav.map((n) => {
              const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors " +
                    (active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")
                  }
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-sidebar-border p-3">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOut className="h-4 w-4" /> Déconnexion
            </button>
            <div className="mt-3 flex items-center gap-3 rounded-md bg-sidebar-accent/60 p-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-sidebar-primary text-sm font-medium text-sidebar-primary-foreground">
                {user?.avatarUrl ? (
                  <img
                    src={`${API_URL}${user.avatarUrl}`}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : user ? (
                  user.username.slice(0, 2).toUpperCase()
                ) : (
                  "U"
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user?.username || "Utilisateur"}</p>
                <p className="truncate text-xs text-sidebar-foreground/70 capitalize">
                  {user?.role || "Cabinet"}
                </p>
              </div>
              <Link
                to="/profil"
                className="shrink-0 rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur-md">
            <div className="flex flex-1 items-center gap-2 rounded-lg bg-secondary px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Rechercher (formations, sessions, formateurs…)"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-block">
                ⌘K
              </kbd>
            </div>
            <DarkModeToggle />
            <NotificationBell />
          </header>

          <div className="px-6 py-8">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <h1 className="font-display text-4xl tracking-tight md:text-5xl">{title}</h1>
                {subtitle && (
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground/80">
                    {subtitle}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">{actions}</div>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
