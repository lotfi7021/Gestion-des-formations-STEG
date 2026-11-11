import { Link, useRouterState, useRouter, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  GraduationCap,
  CalendarDays,
  FileText,
  Settings,
  Search,
  LogOut,
  UserCheck,
  IdCard,
  Star,
  Wallet,
  Building2,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../contexts/auth-context";
import { API_URL } from "@/lib/api/client";
import { getFormations } from "@/lib/api/formations";
import { getSessions } from "@/lib/api/sessions";
import { getFormateurs } from "@/lib/api/formateurs";
import { getEmployes } from "@/lib/api/employes";
import { getParticipants } from "@/lib/api/users";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { useQuery } from "@tanstack/react-query";
import { DarkModeToggle, NotificationBell } from "./shared-components";

const nav = [
  { to: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { to: "/admin/formations", label: "Formations", icon: BookOpen },
  { to: "/admin/sessions", label: "Sessions", icon: CalendarDays },
  { to: "/admin/employes", label: "Employés", icon: IdCard },
  { to: "/admin/formateurs", label: "Formateurs", icon: GraduationCap },
  { to: "/admin/participants", label: "Participants", icon: Users },
  { to: "/admin/approbations", label: "Approbations", icon: UserCheck },
  { to: "/admin/paiements", label: "Paiements", icon: Wallet },
  { to: "/admin/documents", label: "Documents", icon: FileText },
  { to: "/admin/evaluations", label: "Évaluations", icon: Star },
  { to: "/admin/kpi", label: "KPI Formations", icon: BarChart3 },
  { to: "/admin/cabinets", label: "Cabinets", icon: Building2 },
];

function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const shortcut = isMac ? "⌘K" : "Ctrl+K";

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const { data: formations } = useQuery({
    queryKey: ["search-formations"],
    queryFn: () => getFormations(undefined, true),
  });
  const { data: sessions } = useQuery({
    queryKey: ["search-sessions"],
    queryFn: () => getSessions(undefined, true),
  });
  const { data: formateurs } = useQuery({
    queryKey: ["search-formateurs"],
    queryFn: () => getFormateurs(undefined, true),
  });
  const { data: employes } = useQuery({
    queryKey: ["search-employes"],
    queryFn: getEmployes,
  });
  const { data: participants } = useQuery({
    queryKey: ["search-participants"],
    queryFn: getParticipants,
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex flex-1 items-center gap-2 rounded-lg bg-secondary px-3 py-2"
      >
        <Search className="h-4 w-4 text-muted-foreground" />
        <span className="w-full text-left text-sm text-muted-foreground">
          Rechercher (formations, participants, sessions…)
        </span>
        <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-block">
          {shortcut}
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Rechercher dans toute la plateforme…" />
        <CommandList>
          <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
          {formations && formations.length > 0 && (
            <CommandGroup heading="Formations">
              {formations.map((f) => (
                <CommandItem
                  key={f.id}
                  value={`formation-${f.titre}`}
                  onSelect={() => {
                    setOpen(false);
                    navigate({ to: "/admin/formations" });
                  }}
                >
                  <BookOpen className="h-4 w-4" />
                  <span>{f.titre}</span>
                  {f.cabinetId && (
                    <span className="ml-auto text-[10px] text-muted-foreground">Cabinet</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {sessions && sessions.length > 0 && (
            <CommandGroup heading="Sessions">
              {sessions.map((s) => (
                <CommandItem
                  key={s.id}
                  value={`session-${s.formation?.titre || ""}-${s.lieu || ""}`}
                  onSelect={() => {
                    setOpen(false);
                    navigate({ to: "/admin/sessions" });
                  }}
                >
                  <CalendarDays className="h-4 w-4" />
                  <span>{s.formation?.titre || "Session"}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {new Date(s.dateDebut).toLocaleDateString("fr-FR")}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {formateurs && formateurs.length > 0 && (
            <CommandGroup heading="Formateurs">
              {formateurs.map((f) => (
                <CommandItem
                  key={f.id}
                  value={`formateur-${f.prenom}-${f.nom}-${f.email}`}
                  onSelect={() => {
                    setOpen(false);
                    navigate({ to: "/admin/formateurs" });
                  }}
                >
                  <GraduationCap className="h-4 w-4" />
                  <span>{f.prenom + " " + f.nom}</span>
                  <span className="text-xs text-muted-foreground ml-2">{f.email}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {employes && employes.length > 0 && (
            <CommandGroup heading="Employés">
              {employes.map((e) => (
                <CommandItem
                  key={e.id}
                  value={`employe-${e.prenom}-${e.nom}-${e.email}`}
                  onSelect={() => {
                    setOpen(false);
                    navigate({ to: "/admin/employes" });
                  }}
                >
                  <IdCard className="h-4 w-4" />
                  <span>{e.prenom + " " + e.nom}</span>
                  <span className="text-xs text-muted-foreground ml-2">{e.email}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {participants && participants.length > 0 && (
            <CommandGroup heading="Participants">
              {participants.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`participant-${p.prenom}-${p.nom}-${p.email}`}
                  onSelect={() => {
                    setOpen(false);
                    navigate({ to: "/admin/participants" });
                  }}
                >
                  <Users className="h-4 w-4" />
                  <span>{p.prenom + " " + p.nom}</span>
                  <span className="text-xs text-muted-foreground ml-2">{p.email}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}

export function AdminShell({
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
              Admin
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
                  {user?.role || "Administrateur"}
                </p>
              </div>
              <Link
                to="/admin/parametres"
                className="shrink-0 rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur-md">
            <GlobalSearch />
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


