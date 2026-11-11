import { createFileRoute } from "@tanstack/react-router";
import { Plus, Loader2, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import {
  getEmployes,
  createEmploye,
  updateEmploye,
  deleteEmploye,
  type Employe,
} from "@/lib/api/employes";
import { toggleUserActive } from "@/lib/api/users";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { employeSchema } from "@/lib/validations";

export const Route = createFileRoute("/admin/employes")({
  component: AdminEmployes,
});

const emptyForm = {
  nom: "",
  prenom: "",
  email: "",
  poste: "",
  departement: "",
  telephone: "",
  entrepriseText: "",
};

function AdminEmployes() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const { data: employes, isLoading } = useQuery({ queryKey: ["employes"], queryFn: getEmployes });
  const filtered = (employes || []).filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.nom.toLowerCase().includes(q) ||
      p.prenom.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.poste || "").toLowerCase().includes(q) ||
      (p.identifiant || "").toLowerCase().includes(q)
    );
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const { entrepriseText, ...rest } = form;
      const payload = { ...rest, entrepriseText: entrepriseText || undefined };
      return editingId ? updateEmploye(editingId, payload as any) : createEmploye(payload as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employes"] });
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast.success(
        editingId ? "Employé modifié" : "Employé ajouté — identifiant généré automatiquement",
      );
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEmploye(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employes"] });
      setDeleteId(null);
      toast.success("Employé supprimé");
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["employes"] });
      setDeleteId(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleUserActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employes"] });
      toast.success("Statut mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (p: Employe) => {
    setEditingId(p.id);
    setForm({
      nom: p.nom,
      prenom: p.prenom,
      email: p.email,
      poste: p.poste || "",
      departement: p.departement || "",
      telephone: p.telephone || "",
      entrepriseText: p.entrepriseText || "",
    });
    setOpen(true);
  };

  return (
    <AdminShell
      title="Employés"
      subtitle="Enregistrez les employes et gerez leurs identifiants uniques. Suivez leur participation aux formations."
      actions={
        <>
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) {
                setEditingId(null);
                setForm(emptyForm);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Ajouter un employé
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Modifier l'employé" : "Nouvel employé"}</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setFormErrors({});
                  const r = employeSchema.safeParse(form);
                  if (!r.success) {
                    const fe: Record<string, string> = {};
                    r.error.issues.forEach((i) => {
                      const f = i.path[0] as string;
                      if (!fe[f]) fe[f] = i.message;
                    });
                    setFormErrors(fe);
                    return;
                  }
                  saveMutation.mutate();
                }}
                className="space-y-4"
              >
                <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">
                    L'identifiant unique sera généré automatiquement au format{" "}
                    <span className="font-mono text-foreground">2026STG001</span> (Année + STG +
                    numéro incrémental).
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Nom</Label>
                    <Input
                      placeholder="ex : Dupont"
                      value={form.nom}
                      onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    />
                    {formErrors.nom && (
                      <p className="mt-1 text-xs text-destructive">{formErrors.nom}</p>
                    )}
                  </div>
                  <div>
                    <Label>Prénom</Label>
                    <Input
                      placeholder="ex : Jean"
                      value={form.prenom}
                      onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                    />
                    {formErrors.prenom && (
                      <p className="mt-1 text-xs text-destructive">{formErrors.prenom}</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="ex : jean.dupont@entreprise.fr"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                  {formErrors.email && (
                    <p className="mt-1 text-xs text-destructive">{formErrors.email}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Téléphone</Label>
                    <Input
                      placeholder="+216XXXXXXXX"
                      value={form.telephone}
                      onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Poste</Label>
                    <Input
                      placeholder="ex : Chef de projet"
                      value={form.poste}
                      onChange={(e) => setForm({ ...form, poste: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Département</Label>
                  <Input
                    placeholder="ex : Informatique"
                    value={form.departement}
                    onChange={(e) => setForm({ ...form, departement: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Entreprise</Label>
                  <Input
                    placeholder="ex : Société ABC"
                    value={form.entrepriseText}
                    onChange={(e) => setForm({ ...form, entrepriseText: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {editingId ? "Enregistrer les modifications" : "Ajouter l'employé"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-3 text-xs outline-none focus:border-primary"
            />
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Identifiant</th>
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Poste</th>
                  <th className="px-4 py-3">Département</th>
                  <th className="px-4 py-3">Téléphone</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      {employes?.length === 0
                        ? "Aucun employé pour le moment"
                        : "Aucun résultat pour cette recherche"}
                    </td>
                  </tr>
                )}
                {filtered.map((p: Employe) => (
                  <tr key={p.id} className="border-t border-border hover:bg-secondary/40">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-medium text-primary">
                        {p.identifiant || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                          {p.prenom?.[0]}
                          {p.nom?.[0]}
                        </div>
                        <p className="font-medium">
                          {p.prenom} {p.nom}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.poste || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.departement || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.telephone || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${p.userActive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}
                      >
                        {p.userActive ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {p.userId && (
                          <button
                            onClick={() =>
                              toggleMutation.mutate({ id: p.userId!, isActive: !p.userActive })
                            }
                            disabled={toggleMutation.isPending}
                            className={`rounded p-1.5 ${p.userActive ? "text-green-600 hover:bg-green-100" : "text-muted-foreground hover:bg-secondary"}`}
                            title={p.userActive ? "Désactiver" : "Activer"}
                          >
                            {p.userActive ? (
                              <ToggleRight className="h-4 w-4" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(p)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(p.id)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(v) => {
          if (!v) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet employé ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
