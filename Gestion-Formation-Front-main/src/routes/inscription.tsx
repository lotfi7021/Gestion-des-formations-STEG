import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, UserPlus, Moon, Sun, ArrowLeft } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { registerSchema } from "@/lib/validations";

export const Route = createFileRoute("/inscription")({
  head: () => ({
    meta: [{ title: "Inscription — steg_form" }],
  }),
  component: InscriptionPage,
});

function InscriptionPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "participant",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const result = registerSchema.safeParse(form);
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
      await api.post("/auth/register", {
        username: form.username,
        email: form.email,
        password: form.password,
        role: form.role,
      });
      setSuccess(true);
    } catch (err: any) {
      setErrors({ general: err.message || "Erreur lors de l'inscription" });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <PageShell>
        <div className="flex min-h-[calc(100vh-16rem)] items-center justify-center px-6 py-16">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary text-3xl text-primary-foreground">
              ✓
            </div>
            <h1 className="mt-6 font-display text-4xl">Inscription soumise</h1>
            <p className="mt-3 text-muted-foreground">
              Votre demande a été envoyée. Un administrateur validera votre compte dans les plus
              brefs délais.
              <br />
              Vous recevrez un email de confirmation.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link
                to="/"
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary"
              >
                Accueil
              </Link>
              <Link
                to="/connexion"
                className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
              >
                Se connecter
              </Link>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

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
            const next = !document.documentElement.classList.contains("dark");
            document.documentElement.classList.toggle("dark", next);
            localStorage.setItem("theme", next ? "dark" : "light");
          }}
          className="absolute right-4 top-4 rounded-md border border-[#2d3e3a]/20 p-2 text-[#2d3e3a] transition-colors hover:bg-white/40 dark:border-sidebar-border dark:text-sidebar-foreground dark:hover:bg-sidebar-accent"
        >
          {document.documentElement.classList.contains("dark") ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
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
            <h1 className="mt-4 font-display text-4xl">Créer un compte</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Inscrivez-vous en tant que participant, formateur ou cabinet
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nom d'utilisateur</Label>
                <Input
                  placeholder="ex : jean.dupont"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
                {errors.username && (
                  <p className="mt-1 text-xs text-destructive">{errors.username}</p>
                )}
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="ex : jean@exemple.fr"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
              </div>
              <div>
                <Label>Mot de passe</Label>
                <Input
                  type="password"
                  placeholder="6 caractères minimum"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-destructive">{errors.password}</p>
                )}
              </div>
              <div>
                <Label>Confirmer le mot de passe</Label>
                <Input
                  type="password"
                  placeholder="Ressaisissez le mot de passe"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
              <div>
                <Label>Rôle</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="participant">Participant</SelectItem>
                    <SelectItem value="formateur">Formateur</SelectItem>
                    <SelectItem value="cabinet">Cabinet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {errors.form && <p className="text-sm text-destructive">{errors.form}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {loading ? "Inscription en cours..." : "S'inscrire"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Déjà inscrit ?{" "}
              <Link to="/connexion" className="text-primary hover:underline">
                Connectez-vous
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
