import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef } from "react";
import { Loader2, Calendar, ArrowRight, Camera } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/page-shell";
import { ProfileForm } from "@/components/profile/profile-form";
import { PasswordForm } from "@/components/profile/password-form";
import { useAuth } from "@/contexts/auth-context";
import { API_URL } from "@/lib/api/client";
import { uploadAvatar } from "@/lib/api/auth";
import { getMySessions, type Session } from "@/lib/api/sessions";
import { queryKeys } from "@/lib/api/query-keys";
import { requireAuth } from "@/lib/route-auth";

export const Route = createFileRoute("/profil")({
  beforeLoad: () => {
    requireAuth();
  },
  head: () => ({
    meta: [{ title: "Mon profil — steg_form" }],
  }),
  component: ProfilPage,
});

function ProfilPage() {
  const { user, setUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const roleLabel =
    user?.role === "admin"
      ? "Administrateur"
      : user?.role === "formateur"
        ? "Formateur"
        : "Participant";

  const avatarMutation = useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: (data) => {
      if (user) setUser({ ...user, avatarUrl: data.avatarUrl });
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) avatarMutation.mutate(file);
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-primary text-3xl font-display text-primary-foreground">
              {user?.avatarUrl ? (
                <img
                  src={`${API_URL}${user.avatarUrl}`}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                user?.username?.[0]?.toUpperCase() || "?"
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground transition-colors"
              disabled={avatarMutation.isPending}
            >
              {avatarMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <h1 className="font-display text-4xl">Mon profil</h1>
            <p className="text-muted-foreground">
              {user?.email} · <span className="capitalize">{roleLabel}</span>
            </p>
          </div>
        </div>

        <div className="mt-10 space-y-8">
          {user && (
            <ProfileForm
              user={user}
              roleLabel={roleLabel}
              onUpdated={(values) =>
                setUser({
                  ...user,
                  username: values.username,
                  nom: values.nom ?? "",
                  prenom: values.prenom ?? "",
                  telephone: values.telephone || undefined,
                })
              }
            />
          )}

          <PasswordForm />

          {user?.role === "participant" && <MesFormations />}
        </div>
      </div>
    </PageShell>
  );
}

function MesFormations() {
  const { data: sessions, isLoading } = useQuery({
    queryKey: queryKeys.mySessions(),
    queryFn: () => getMySessions(),
  });

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        <h2 className="font-display text-2xl">Mes formations</h2>
      </div>
      {isLoading ? (
        <div className="mt-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : sessions && sessions.length > 0 ? (
        <div className="mt-6 space-y-3">
          {sessions.map((s: Session) => {
            const d = new Date(s.dateDebut);
            return (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-border bg-background p-4"
              >
                <div>
                  <p className="font-medium">{s.formation?.titre || "Formation"}</p>
                  <p className="text-sm text-muted-foreground">
                    {d.toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}{" "}
                    · {s.lieu || "À définir"}
                  </p>
                </div>
                <Link
                  to="/formations/$id"
                  params={{ id: s.formation?.id }}
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Détails <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-background p-8 text-center">
          <p className="text-sm text-muted-foreground">Vous n'êtes inscrit à aucune formation.</p>
          <Link to="/catalogue" className="mt-2 inline-block text-sm text-primary hover:underline">
            Parcourir le catalogue
          </Link>
        </div>
      )}
    </section>
  );
}
