import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Check, X, Clock } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/approbations")({
  component: AdminApprobations,
});

function AdminApprobations() {
  const queryClient = useQueryClient();

  const {
    data: pendingUsers,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["pending-users"],
    queryFn: () => api.get<any[]>("/auth/pending-users"),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/auth/approve/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-users"] });
      toast.success("Utilisateur approuvé");
    },
    onError: () => toast.error("Erreur lors de l'approbation"),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/auth/reject/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-users"] });
      toast.success("Inscription rejetée");
    },
    onError: () => toast.error("Erreur lors du rejet"),
  });

  return (
    <AdminShell
      title="Approbations"
      subtitle="Examinez les demandes d'inscription et approuvez ou rejetez les nouveaux participants."
    >
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-12 text-center">
          <X className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-4 font-medium text-destructive">Erreur de chargement</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "Impossible de récupérer les inscriptions en attente."}
          </p>
        </div>
      ) : !pendingUsers || pendingUsers.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Clock className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Aucune inscription en attente</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {pendingUsers.map((u: any) => (
                <tr key={u.id} className="border-t border-border hover:bg-secondary/40">
                  <td className="px-4 py-3 font-medium">{u.username}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary capitalize">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString("fr-FR") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => approveMutation.mutate(u.id)}
                        disabled={approveMutation.isPending}
                      >
                        <Check className="h-4 w-4 text-primary" /> Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (window.confirm("Rejeter cette inscription ?"))
                            rejectMutation.mutate(u.id);
                        }}
                        disabled={rejectMutation.isPending}
                      >
                        <X className="h-4 w-4 text-destructive" /> Rejeter
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
