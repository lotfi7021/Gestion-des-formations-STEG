import { Link, useRouter } from "@tanstack/react-router";
import { User, LogOut } from "lucide-react";
import { useAuth } from "../contexts/auth-context";
import { API_URL } from "@/lib/api/client";
import { DarkModeToggle, NotificationBell } from "./shared-components";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const publicNav = [
  { to: "/", label: "Accueil" },
  { to: "/a-propos", label: "À propos" },
  { to: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-6">
        <Link to="/" className="group flex items-center gap-2">
          <img
            src="/images/logo.png"
            alt="steg_form"
            className="h-10 w-auto transition-transform duration-500 group-hover:scale-105"
          />
          <span className="font-display text-2xl tracking-tight text-foreground">
            steg<span className="text-gradient-brand">_form</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {!isAuthenticated &&
            publicNav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                className="rounded-full px-4 py-2 text-sm text-muted-foreground transition-all duration-200 hover:bg-secondary hover:text-foreground"
                activeProps={{
                  className: "bg-secondary text-foreground font-medium",
                }}
              >
                {n.label}
              </Link>
            ))}
          {!isLoading && isAuthenticated && user?.role !== "admin" && (
            <>
              <NavLink to="/mes-formations" label="Mes formations" />
              {user?.role === "formateur" && (
                <>
                  <NavLink to="/formateur/dashboard" label="Mes sessions" />
                  <NavLink to="/formateur/calendrier" label="Calendrier" />
                </>
              )}
              {(user?.role === "participant" || user?.role === "employe") && (
                <NavLink to="/participant/calendrier" label="Calendrier" />
              )}
            </>
          )}
        </nav>
        <div className="flex items-center gap-2">
          <DarkModeToggle />
          {!isLoading && isAuthenticated ? (
            <>
              {user?.role === "admin" && (
                <Link
                  to="/admin"
                  className="hidden rounded-full border border-border bg-card px-4 py-1.5 text-sm text-foreground transition-all duration-200 hover:border-primary/40 hover:text-primary sm:inline-flex"
                >
                  Tableau de bord
                </Link>
              )}

              {user?.role !== "admin" && (
                <Link
                  to="/catalogue"
                  className="rounded-full border border-border bg-card px-4 py-1.5 text-sm text-foreground transition-all duration-200 hover:border-primary/40 hover:text-primary"
                >
                  Catalogue
                </Link>
              )}
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-9 w-9 overflow-hidden rounded-full border-2 border-border transition-all duration-200 hover:border-primary hover:shadow-[var(--shadow-glow)]">
                    {user?.avatarUrl ? (
                      <img
                        src={`${API_URL}${user.avatarUrl}`}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary to-sky text-sm font-medium text-white">
                        {user?.username?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/profil" className="flex items-center gap-2">
                      <User className="h-4 w-4" /> Paramètres
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-destructive"
                  >
                    <LogOut className="h-4 w-4" /> Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link
              to="/connexion"
              className="inline-flex items-center rounded-full bg-gradient-to-r from-primary to-sky px-5 py-2 text-sm font-medium text-white shadow-[var(--shadow-soft)] transition-all duration-300 hover:shadow-[var(--shadow-glow)] hover:brightness-110"
            >
              Connexion
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="relative rounded-full px-4 py-2 text-sm font-medium text-primary transition-all duration-200 hover:bg-primary/10"
      activeProps={{ className: "bg-primary/10" }}
    >
      {label}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative mt-24 border-t border-border bg-secondary/40">
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
        aria-hidden
      />
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <img src="/images/logo.png" alt="steg_form" className="h-10 w-auto" />
            <span className="font-display text-2xl">
              steg<span className="text-gradient-brand">_form</span>
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            La plateforme de gestion des formations de la STEG — Société Tunisienne de l'Électricité
            et du Gaz.
          </p>
        </div>
        <FooterCol
          title="Plateforme"
          links={[
            { to: "/", label: "Accueil" },
            { to: "/a-propos", label: "À propos" },
            { to: "/contact", label: "Contact" },
          ]}
        />
        <FooterCol
          title="Société"
          links={[
            { to: "/a-propos", label: "À propos" },
            { to: "/contact", label: "Contact" },
          ]}
        />
        <div>
          <h4 className="text-sm font-semibold text-foreground">Contact</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Direction de la Formation, Bizerte</li>
            <li>
              <a
                href="mailto:contact-formation@steg.tn"
                className="transition-colors hover:text-primary"
              >
                contact-formation@steg.tn
              </a>
            </li>
            <li>
              <a href="tel:+21672000000" className="transition-colors hover:text-primary">
                +216 72 000 000
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © 2026 STEG — Direction de la Formation. Tous droits réservés.
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {links.map((l) => (
          <li key={`${l.to}-${l.label}`}>
            <Link
              to={l.to}
              className="inline-block transition-all hover:translate-x-0.5 hover:text-primary"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
