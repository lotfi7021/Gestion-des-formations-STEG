import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Loader2, Save, Lock, User, Pen, Check } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { useAuth } from "@/contexts/auth-context";
import { updateProfile, changePassword } from "@/lib/api/auth";
import { saveSignature, getLatestSignature } from "@/lib/api/signatures";
import { SignaturePad } from "@/components/signature-pad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/parametres")({
  component: AdminParametres,
});

function AdminParametres() {
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState(user?.username || "");
  const [nom, setNom] = useState(user?.nom || "");
  const [prenom, setPrenom] = useState(user?.prenom || "");
  const [telephone, setTelephone] = useState(user?.telephone || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const { data: existingSignature } = useQuery({
    queryKey: ["my-signature"],
    queryFn: getLatestSignature,
  });

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
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () => {
      if (newPassword !== confirmPassword) {
        throw new Error("Les mots de passe ne correspondent pas");
      }
      return changePassword({ currentPassword, newPassword });
    },
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
        : "Participant";

  return (
    <AdminShell
      title="Paramètres"
      subtitle="Mettez a jour vos informations personnelles et votre mot de passe en toute simplicite."
    >
      <div className="grid gap-8 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl">Informations du compte</h2>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              profileMutation.mutate();
            }}
            className="mt-6 space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nom</Label>
                <Input value={nom} onChange={(e) => setNom(e.target.value)} required />
              </div>
              <div>
                <Label>Prénom</Label>
                <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} required />
              </div>
            </div>
            <div>
              <Label>Nom d'utilisateur</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
              />
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
              <p className="mt-1 text-xs text-muted-foreground">L'email ne peut pas être modifié</p>
            </div>
            <div>
              <Label>Rôle</Label>
              <Input value={roleLabel} disabled className="opacity-60" />
            </div>
            <Button type="submit" disabled={profileMutation.isPending}>
              {profileMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Enregistrer
            </Button>
            {profileMutation.isSuccess && <p className="text-sm text-primary">Profil mis à jour</p>}
          </form>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl">Mot de passe</h2>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPasswordError("");
              passwordMutation.mutate();
            }}
            className="mt-6 space-y-4"
          >
            <div>
              <Label>Mot de passe actuel</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Nouveau mot de passe</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div>
              <Label>Confirmer le nouveau mot de passe</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
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
              Mettre à jour
            </Button>
          </form>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <Pen className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl">Signature électronique</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Votre signature sera intégrée automatiquement dans les conventions, contrats,
            certificats et feuilles d'émargement.
          </p>
          <div className="mt-6">
            <SignaturePad
              onSave={async (imageData, type) => {
                try {
                  await saveSignature(imageData, type);
                  toast.success("Signature enregistrée");
                  queryClient.invalidateQueries({ queryKey: ["my-signature"] });
                } catch (err: any) {
                  toast.error(err.message || "Erreur");
                }
              }}
              savedSignature={existingSignature?.imageData || null}
              label="Dessinez ou importez votre signature"
            />
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
