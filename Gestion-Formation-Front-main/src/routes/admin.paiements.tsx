import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Loader2,
  Wallet,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  Euro,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
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
import {
  getPendingInscriptions,
  getConfirmedInscriptions,
  confirmPayment,
  rejectInscription,
  type Inscription,
} from "@/lib/api/inscriptions";

export const Route = createFileRoute("/admin/paiements")({
  component: AdminPaiementsPage,
});

function AdminPaiementsPage() {
  const queryClient = useQueryClient();
  const [refuseDialogId, setRefuseDialogId] = useState<string | null>(null);

  const { data: inscriptions, isLoading } = useQuery({
    queryKey: ["pending-inscriptions"],
    queryFn: getPendingInscriptions,
  });

  const { data: confirmed } = useQuery({
    queryKey: ["confirmed-inscriptions"],
    queryFn: getConfirmedInscriptions,
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => confirmPayment(id),
    onSuccess: () => {
      toast.success("Paiement confirmé ! L'inscription a été validée.");
      queryClient.invalidateQueries({ queryKey: ["pending-inscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["confirmed-inscriptions"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la confirmation");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectInscription(id),
    onSuccess: () => {
      toast.success("Inscription refusée.");
      setRefuseDialogId(null);
      queryClient.invalidateQueries({ queryKey: ["pending-inscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["confirmed-inscriptions"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors du refus");
    },
  });

  return (
    <AdminShell
      title="Paiements en attente"
      subtitle="Gérez les inscriptions en attente de paiement en espèces"
    >
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : inscriptions && inscriptions.length > 0 ? (
        <div className="space-y-4">
          {inscriptions.map((ins: Inscription) => {
            const s = ins.session;
            const u = ins.user;
            const d = new Date(s.dateDebut);
            return (
              <div key={ins.id} className="rounded-xl border border-border bg-card p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-amber-500" />
                      <h3 className="font-display text-lg">{s.formation?.titre || "Formation"}</h3>
                      <Badge
                        variant="outline"
                        className="border-amber-300 text-amber-700 bg-amber-50"
                      >
                        En attente
                      </Badge>
                    </div>
                    <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                      <span className="flex items-center gap-1.5">
                        <User className="h-4 w-4" />
                        {u.prenom} {u.nom}
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {u.role}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        {d.toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Euro className="h-4 w-4" />
                        {ins.montant} DT — Espèces
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {u.email} · Inscrit le{" "}
                      {new Date(ins.dateInscription).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-1.5"
                      disabled={confirmMutation.isPending || rejectMutation.isPending}
                      onClick={() => confirmMutation.mutate(ins.id)}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Paiement reçu
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      disabled={confirmMutation.isPending || rejectMutation.isPending}
                      onClick={() => setRefuseDialogId(ins.id)}
                    >
                      <XCircle className="h-4 w-4" />
                      Refuser
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center">
          <Wallet className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">Aucun paiement en attente</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Toutes les inscriptions ont été traitées.
          </p>
        </div>
      )}

      {confirmed && confirmed.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-xl mb-4">Historique des paiements</h2>
          <div className="space-y-3">
            {confirmed.map((ins: Inscription) => {
              const s = ins.session;
              const u = ins.user;
              const d = new Date(s.dateDebut);
              return (
                <div key={ins.id} className="rounded-xl border border-border bg-card p-4 opacity-80">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                      <div>
                        <p className="font-medium text-sm">{s.formation?.titre || "Formation"}</p>
                        <p className="text-xs text-muted-foreground">
                          {u.prenom} {u.nom} · {u.email} · {ins.montant} DT
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {d.toLocaleDateString("fr-FR")}
                      </span>
                      {ins.datePaiement && (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Payé le {new Date(ins.datePaiement).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={refuseDialogId !== null} onOpenChange={() => setRefuseDialogId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Refuser l'inscription
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-3">
              <p>Êtes-vous sûr de vouloir refuser cette inscription ?</p>
              <p className="text-xs text-muted-foreground">
                L'utilisateur verra le statut "Refusé" dans ses formations et pourra se réinscrire
                ultérieurement.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefuseDialogId(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={rejectMutation.isPending}
              onClick={() => refuseDialogId && rejectMutation.mutate(refuseDialogId)}
            >
              {rejectMutation.isPending ? "..." : "Confirmer le refus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
