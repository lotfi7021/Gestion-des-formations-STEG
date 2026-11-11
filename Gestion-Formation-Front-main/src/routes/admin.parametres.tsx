import { createFileRoute } from "@tanstack/react-router";
import { Pen } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { ProfileForm } from "@/components/profile/profile-form";
import { PasswordForm } from "@/components/profile/password-form";
import { useAuth } from "@/contexts/auth-context";
import { saveSignature, getLatestSignature } from "@/lib/api/signatures";
import { queryKeys } from "@/lib/api/query-keys";
import { SignaturePad } from "@/components/signature-pad";

export const Route = createFileRoute("/admin/parametres")({
  component: AdminParametres,
});

function AdminParametres() {
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: existingSignature } = useQuery({
    queryKey: queryKeys.latestSignature,
    queryFn: getLatestSignature,
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

        <PasswordForm title="Mot de passe" />

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
                  queryClient.invalidateQueries({ queryKey: queryKeys.latestSignature });
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Erreur");
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
