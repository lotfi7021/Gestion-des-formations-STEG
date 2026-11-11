import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, UserPlus, Moon, Sun, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageShell } from "@/components/page-shell";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { registerSchema, type RegisterData } from "@/lib/validations";
import { useDarkMode } from "@/hooks/use-dark-mode";

export const Route = createFileRoute("/inscription")({
  head: () => ({
    meta: [{ title: "Inscription — steg_form" }],
  }),
  component: InscriptionPage,
});

function InscriptionPage() {
  const [success, setSuccess] = useState(false);
  const { dark, toggle } = useDarkMode();

  const form = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "participant",
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await api.post("/auth/register", {
        username: values.username,
        email: values.email,
        password: values.password,
        role: values.role,
      });
      setSuccess(true);
    } catch (err) {
      form.setError("root", {
        message: err instanceof Error ? err.message : "Erreur lors de l'inscription",
      });
    }
  });

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
          onClick={toggle}
          className="absolute right-4 top-4 rounded-md border border-[#2d3e3a]/20 p-2 text-[#2d3e3a] transition-colors hover:bg-white/40 dark:border-sidebar-border dark:text-sidebar-foreground dark:hover:bg-sidebar-accent"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <img src="/images/logo.png" alt="steg_form" className="mx-auto h-12 w-auto md:hidden" />
            <h1 className="mt-4 font-display text-4xl">Créer un compte</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Inscrivez-vous en tant que participant ou formateur
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-8">
            <Form {...form}>
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom d'utilisateur</FormLabel>
                      <FormControl>
                        <Input placeholder="ex : jean.dupont" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="ex : jean@exemple.fr" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mot de passe</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="6 caractères minimum" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmer le mot de passe</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Ressaisissez le mot de passe"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rôle</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="participant">Participant</SelectItem>
                          <SelectItem value="formateur">Formateur</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.formState.errors.root && (
                  <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
                )}
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  {form.formState.isSubmitting ? "Inscription en cours..." : "S'inscrire"}
                </Button>
              </form>
            </Form>
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
