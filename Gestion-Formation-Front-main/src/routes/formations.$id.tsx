import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth-context";
import { Calendar, MapPin, Users, Star, Wallet } from "lucide-react";
import { toast } from "sonner";
import { getFormation } from "@/lib/api/formations";
import { API_URL } from "@/lib/api/client";
import { enrollInSession } from "@/lib/api/sessions";

export const Route = createFileRoute("/formations/$id")({
  component: FormationPage,
});

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function FormationPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [paymentDialog, setPaymentDialog] = useState<{ sessionId: string; montant: number } | null>(
    null,
  );

  const { data: formation, isLoading } = useQuery({
    queryKey: ["formation", id],
    queryFn: () => getFormation(id),
  });

  const enrollMutation = useMutation({
    mutationFn: (sessionId: string) => enrollInSession(sessionId),
    onSuccess: (data: any) => {
      toast.success("Inscription soumise !");
      queryClient.invalidateQueries({ queryKey: ["formation", id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de l'inscription");
    },
  });

  if (isLoading) {
    return (
      <ProtectedRoute>
        <PageShell>
          <div className="flex justify-center py-32 text-muted-foreground">Chargement...</div>
        </PageShell>
      </ProtectedRoute>
    );
  }

  if (!formation) throw notFound();

  const sessions = formation.sessions || [];

  const handleEnroll = (sessionId: string, montant: number) => {
    if (!user) {
      navigate({ to: "/connexion" });
      return;
    }
    if (user.role !== "participant" && user.role !== "employe" && user.role !== "formateur") {
      toast.error("Seuls les participants, employés et formateurs peuvent s'inscrire.");
      return;
    }
    setPaymentDialog({ sessionId, montant });
  };

  const confirmEnroll = () => {
    if (!paymentDialog) return;
    enrollMutation.mutate(paymentDialog.sessionId);
    setPaymentDialog(null);
  };

  return (
    <ProtectedRoute>
      <PageShell>
        <section className="mx-auto max-w-7xl px-6 pt-12">
          <Link to="/catalogue" className="text-sm text-muted-foreground hover:text-foreground">
            ← Catalogue
          </Link>
          <div className="mt-6 grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-secondary/10 aspect-[16/10] flex items-center justify-center">
                {formation.imageUrl ? (
                  <img
                    src={`${API_URL}${formation.imageUrl}`}
                    alt={formation.titre}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="font-display text-6xl text-muted-foreground/20">
                    {formation.titre[0]}
                  </span>
                )}
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                {formation.categorie || "Général"}
              </div>
              <h1 className="mt-3 font-display text-4xl md:text-5xl">{formation.titre}</h1>
              <p className="mt-4 text-muted-foreground">{formation.description}</p>
              <div className="mt-8 grid grid-cols-3 gap-4 rounded-xl border border-border p-4">
                <div>
                  <div className="text-xs text-muted-foreground">Niveau</div>
                  <div className="mt-1 text-sm font-medium capitalize">{formation.type}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Durée</div>
                  <div className="mt-1 text-sm font-medium">
                    {formation.dureeEnJours} jour{formation.dureeEnJours > 1 ? "s" : ""}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Tarif</div>
                  <div className="mt-1 text-sm font-medium">
                    {formation.tarif ? `${formation.tarif} DT` : "Sur devis"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20">
          <h2 className="font-display text-3xl">Prochaines sessions</h2>
          <div className="mt-8 space-y-4">
            {sessions.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
                Aucune session programmée pour l'instant.
              </div>
            )}
            {sessions.map((s) => {
              const formateur = s.formateurs?.[0];
              const enrolled = s.participants?.some((p: { id: string }) => p.id === user?.id);
              const count = (s.participants?.length || 0) + (s.employes?.length || 0);
              const maxCap = s.capaciteMax || formation.capaciteMax;
              const full = maxCap ? count >= maxCap : false;
              const d = new Date(s.dateDebut);
              const months = [
                "JAN",
                "FÉV",
                "MAR",
                "AVR",
                "MAI",
                "JUI",
                "JUI",
                "AOÛ",
                "SEP",
                "OCT",
                "NOV",
                "DÉC",
              ];
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-5 rounded-2xl border border-border bg-card p-5"
                >
                  <div className="hidden shrink-0 rounded-xl bg-secondary p-3 text-center sm:block">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {months[d.getMonth()]}
                    </div>
                    <div className="font-display text-3xl leading-tight text-primary">
                      {d.getDate()}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {fmtDate(s.dateDebut)} — {fmtDate(s.dateFin)}
                      </span>
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {s.lieu || "Distanciel"}
                      </span>
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {count}
                        {maxCap ? `/${maxCap}` : ""} inscrit{count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="mt-1.5 text-sm">
                      {formateur ? (
                        <span className="text-muted-foreground">
                          Avec{" "}
                          <span className="font-medium text-foreground">
                            {formateur.prenom} {formateur.nom}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60 italic">Formateur à définir</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {enrolled ? (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-600 text-white rounded-full">Inscrit</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 rounded-full"
                          asChild
                        >
                          <Link to="/evaluation/$sessionId" params={{ sessionId: s.id }}>
                            <Star className="h-4 w-4" /> Évaluer
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        disabled={full || enrollMutation.isPending}
                        onClick={() => handleEnroll(s.id, formation.tarif || 0)}
                      >
                        {full ? "Complet" : enrollMutation.isPending ? "..." : "S'inscrire"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <Dialog open={paymentDialog !== null} onOpenChange={() => setPaymentDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Paiement requis
              </DialogTitle>
              <DialogDescription className="space-y-3 pt-3">
                <p>
                  Votre inscription a été prise en compte. Pour finaliser votre inscription, vous
                  devez effectuer le paiement en <strong>espèces</strong>.
                </p>
                <div className="rounded-lg border border-border bg-secondary/50 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Montant à payer</span>
                    <span className="text-lg font-bold text-primary">
                      {paymentDialog?.montant || 0} DT
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span>Mode de paiement</span>
                    <span className="font-medium">Espèces</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Une fois le paiement effectué, l'administration validera votre inscription. Vous
                  recevrez une notification de confirmation.
                </p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentDialog(null)}>
                Annuler
              </Button>
              <Button onClick={confirmEnroll} disabled={enrollMutation.isPending}>
                {enrollMutation.isPending ? "..." : "Confirmer l'inscription"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageShell>
    </ProtectedRoute>
  );
}
