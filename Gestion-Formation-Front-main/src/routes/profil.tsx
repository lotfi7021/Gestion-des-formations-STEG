import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Loader2, Save, Lock, User, Calendar, ArrowRight, Camera } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/protected-route";
import { PageShell } from "@/components/page-shell";
import { useAuth } from "@/contexts/auth-context";
import { API_URL } from "@/lib/api/client";
import { updateProfile, changePassword, uploadAvatar } from "@/lib/api/auth";
import { getMySessions } from "@/lib/api/sessions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordSchema } from "@/lib/validations";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [{ title: "Mon profil — steg_form" }],
  }),
  component: ProfilPage,
});

function ProfilPage() {
  const { user, setUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState(user?.username || "");
  const [nom, setNom] = useState(user?.nom || "");
  const [prenom, setPrenom] = useState(user?.prenom || "");
  const [telephone, setTelephone] = useState(user?.telephone || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setNom(user.nom || "");
      setPrenom(user.prenom || "");
      setTelephone(user.telephone || "");
    }
  }, [user]);

  const profileMutation = useMutation({
    mutationFn: () => updateProfile({ username, nom, prenom, telephone: telephone || undefined }),
    onSuccess: () => {
      setUser({ ...user!, username, nom, prenom });
      setProfileErrors({});
    },
    onError: (err: any) => {
      try {
        const msg = JSON.parse(err.message);
        setProfileErrors({ form: msg.message || "Erreur" });
      } catch {
        setProfileErrors({ form: "Erreur lors de la mise à jour" });
      }
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () => changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("Mot de passe mis à jour avec succès");
    },
    onError: (err: any) => {
      setPasswordError(err?.message || "Erreur lors du changement de mot de passe");
    },
  });

  const roleLabel =
    user?.role === "admin"
      ? "Administrateur"
      : user?.role === "formateur"
        ? "Formateur"
        : user?.role === "cabinet"
          ? "Cabinet"
          : "Participant";

  const avatarMutation = useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: (data) => {
      setUser({ ...user!, avatarUrl: data.avatarUrl });
    },
    onError: (err: any) => {
      setProfileErrors({ form: err.message || "Erreur lors du téléchargement" });
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) avatarMutation.mutate(file);
  };

  return (
    <ProtectedRoute>
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
            <section className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <h2 className="font-display text-2xl">Informations du compte</h2>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setProfileErrors({});
                  profileMutation.mutate();
                }}
                className="mt-6 space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Nom</Label>
                    <Input
                      placeholder="ex : Martin"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Prénom</Label>
                    <Input
                      placeholder="ex : Sophie"
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Nom d'utilisateur</Label>
                  <Input
                    placeholder={user?.username || "ex : jean.dupont"}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  {profileErrors.username && (
                    <p className="mt-1 text-xs text-destructive">{profileErrors.username}</p>
                  )}
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input
                    placeholder="+216XXXXXXXX"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={user?.email || ""} disabled className="opacity-60" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    L'email ne peut pas être modifié
                  </p>
                </div>
                <div>
                  <Label>Rôle</Label>
                  <Input value={roleLabel} disabled className="opacity-60" />
                </div>
                {profileErrors.form && (
                  <p className="text-sm text-destructive">{profileErrors.form}</p>
                )}
                <Button type="submit" disabled={profileMutation.isPending}>
                  {profileMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Enregistrer
                </Button>
              </form>
            </section>

            <section className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <h2 className="font-display text-2xl">Changer le mot de passe</h2>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setPasswordError("");
                  const r = changePasswordSchema.safeParse({
                    currentPassword,
                    newPassword,
                    confirmPassword,
                  });
                  if (!r.success) {
                    const fe: Record<string, string> = {};
                    r.error.issues.forEach((i) => {
                      const f = i.path[0] as string;
                      if (!fe[f]) fe[f] = i.message;
                    });
                    setPasswordError(
                      fe.confirmPassword || fe.newPassword || fe.currentPassword || "",
                    );
                    return;
                  }
                  passwordMutation.mutate();
                }}
                className="mt-6 space-y-4"
              >
                <div>
                  <Label>Mot de passe actuel</Label>
                  <Input
                    type="password"
                    placeholder="Votre mot de passe actuel"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Nouveau mot de passe</Label>
                  <Input
                    type="password"
                    placeholder="6 caractères minimum"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Confirmer le nouveau mot de passe</Label>
                  <Input
                    type="password"
                    placeholder="Ressaisissez le nouveau mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                {passwordError && (
                  <p
                    className={`text-sm ${passwordMutation.isSuccess ? "text-primary" : "text-destructive"}`}
                  >
                    {passwordError}
                  </p>
                )}
                <Button type="submit" disabled={passwordMutation.isPending}>
                  {passwordMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  Mettre à jour le mot de passe
                </Button>
              </form>
            </section>

            {(user?.role === "participant" || user?.role === "employe") && <MesFormations />}
          </div>
        </div>
      </PageShell>
    </ProtectedRoute>
  );
}

function MesFormations() {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["my-sessions"],
    queryFn: getMySessions,
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
          {sessions.map((s: any) => {
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
