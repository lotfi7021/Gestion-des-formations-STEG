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
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src="/images/logo.png" alt="steg_form" className="h-10 w-auto" />
          <span className="font-display text-2xl tracking-tight text-foreground">steg_form</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {!isAuthenticated &&
            publicNav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "text-foreground font-medium" }}
              >
                {n.label}
              </Link>
            ))}
          {!isLoading && isAuthenticated && user?.role !== "admin" && user?.role !== "cabinet" && (
            <>
              <Link
                to="/mes-formations"
                className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                Mes formations
              </Link>
              {user?.role === "formateur" && (
                <>
                  <Link
                    to="/formateur/dashboard"
                    className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    Mes sessions
                  </Link>
                  <Link
                    to="/formateur/calendrier"
                    className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    Calendrier
                  </Link>
                </>
              )}
              {(user?.role === "participant" || user?.role === "employe") && (
                <Link
                  to="/participant/calendrier"
                  className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Calendrier
                </Link>
              )}
            </>
          )}
          {!isLoading && isAuthenticated && user?.role === "cabinet" && (
            <Link
              to="/cabinet"
              className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              Tableau de bord
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          <DarkModeToggle />
          {!isLoading && isAuthenticated ? (
            <>
              {(user?.role === "admin" || user?.role === "cabinet") && (
                <Link
                  to={user?.role === "admin" ? "/admin" : "/cabinet"}
                  className="hidden rounded-md border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-secondary sm:inline-flex"
                >
                  Tableau de bord
                </Link>
              )}

              {user?.role !== "admin" && user?.role !== "cabinet" && (
                <Link
                  to="/catalogue"
                  className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-secondary"
                >
                  Catalogue
                </Link>
              )}
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="overflow-hidden rounded-full border-2 border-border text-foreground transition-colors hover:border-primary h-9 w-9">
                    {user?.avatarUrl ? (
                      <img
                        src={`${API_URL}${user.avatarUrl}`}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-primary/10 text-sm font-medium text-primary">
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
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Connexion
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <img src="/images/logo.png" alt="steg_form" className="h-10 w-auto" />
            <span className="font-display text-2xl">steg_form</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            La plateforme de gestion des formations de la STEG — Société Tunisienne de l'Électricité et du Gaz.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">Plateforme</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/">Accueil</Link>
            </li>
            <li>
              <Link to="/a-propos">À propos</Link>
            </li>
            <li>
              <Link to="/contact">Contact</Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">Société</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/a-propos">À propos</Link>
            </li>
            <li>
              <Link to="/contact">Contact</Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">Contact</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Direction de la Formation, Bizerte</li>
            <li>contact-formation@steg.tn</li>
            <li>+216 72 000 000</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © 2026 STEG — Direction de la Formation. Tous droits réservés.
      </div>
    </footer>
  );
}
