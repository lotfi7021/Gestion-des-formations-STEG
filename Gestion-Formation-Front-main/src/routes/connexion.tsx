import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, LogIn, Loader2, Moon, Sun, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { loginSchema } from "@/lib/validations";

export const Route = createFileRoute("/connexion")({
  head: () => ({
    meta: [
      { title: "Connexion — steg_form" },
      {
        name: "description",
        content: "Connectez-vous à votre espace steg_form pour gérer vos formations.",
      },
      { property: "og:title", content: "Connexion — steg_form" },
      { property: "og:description", content: "Accédez à votre tableau de bord formation." },
    ],
  }),
  component: ConnexionPage,
});

function ConnexionPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dark, setDark] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      router.navigate({
        to:
          user.role === "admin"
            ? "/admin"
            : user.role === "formateur"
              ? "/formateur/dashboard"
              : user.role === "cabinet"
                ? "/cabinet"
                : "/catalogue",
      });
    }
  }, [isAuthenticated, user]);

  if (isAuthenticated) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setLoading(true);
    try {
      await login({ email, password });
      toast.success("Connexion réussie");
    } catch (err: any) {
      setErrors({ form: err.message || "Identifiants incorrects" });
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Link
        to="/"
        className="fixed left-4 top-4 z-10 rounded-md border border-border bg-background p-2 text-foreground transition-colors hover:bg-secondary"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <div className="relative hidden w-1/2 flex-col items-center justify-center gap-6 bg-[#e9e6db] p-16 dark:bg-sidebar md:flex">
        <img src="/images/logo.png" alt="steg_form" className="h-16 w-auto" />
        <h2 className="text-center font-display text-4xl text-[#2d3e3a] dark:text-sidebar-foreground">
          steg_form
        </h2>
        <p className="max-w-sm text-center text-sm text-[#5c6f6b] dark:text-sidebar-foreground/80">
          Espace Formation STEG — Direction de la Formation et du Développement des Compétences.
        </p>
        <div className="mt-8 grid gap-4 text-sm text-[#5c6f6b] dark:text-sidebar-foreground/80">
          <div className="flex items-center gap-3 rounded-lg bg-white/60 px-4 py-3 dark:bg-sidebar-accent">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#2d3e3a] text-white text-xs font-bold dark:bg-sidebar-primary dark:text-sidebar-primary-foreground">
              1
            </span>
            Planifiez vos sessions
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-white/60 px-4 py-3 dark:bg-sidebar-accent">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#2d3e3a] text-white text-xs font-bold dark:bg-sidebar-primary dark:text-sidebar-primary-foreground">
              2
            </span>
            Gérez participants et formateurs
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-white/60 px-4 py-3 dark:bg-sidebar-accent">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#2d3e3a] text-white text-xs font-bold dark:bg-sidebar-primary dark:text-sidebar-primary-foreground">
              3
            </span>
            Certificats et conformité
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            const next = !dark;
            document.documentElement.classList.toggle("dark", next);
            localStorage.setItem("theme", next ? "dark" : "light");
            setDark(next);
          }}
          className="absolute right-4 top-4 rounded-md border border-[#2d3e3a]/20 p-2 text-[#2d3e3a] transition-colors hover:bg-white/40 dark:border-sidebar-border dark:text-sidebar-foreground dark:hover:bg-sidebar-accent"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <img
              src="/images/image.png"
              alt="steg_form"
              className="mx-auto h-12 w-auto md:hidden"
            />
            <h1 className="mt-4 font-display text-4xl">Connexion</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Accédez à votre espace administrateur
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Identifiant ou Email
                </label>
                <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    id="email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex: 2026STG001 ou admin@test.fr"
                    required
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Mot de passe
                </label>
                <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
                  <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="ex : 123456"
                    required
                    minLength={6}
                    title="Minimum 6 caractères"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>

              {errors.form && <p className="text-sm text-destructive">{errors.form}</p>}

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="rounded border-border text-primary focus:ring-primary/20"
                  />
                  <span className="text-muted-foreground">Se souvenir de moi</span>
                </label>
                <Link to="/" className="text-primary hover:underline">
                  Mot de passe oublié ?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {loading ? "Connexion en cours..." : "Se connecter"}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link to="/inscription" className="text-primary hover:underline">
              Inscrivez-vous
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
