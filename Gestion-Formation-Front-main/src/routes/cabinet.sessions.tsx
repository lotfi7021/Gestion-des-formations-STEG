import { createFileRoute } from "@tanstack/react-router";
import { Plus, Loader2, Pencil, Trash2, ChevronDown, ChevronUp, Search } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CabinetShell } from "@/components/cabinet-shell";
import {
  getSessions,
  createSession,
  updateSession,
  deleteSession,
  type Session,
} from "@/lib/api/sessions";
import { getFormations } from "@/lib/api/formations";
import { getFormateurs } from "@/lib/api/formateurs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sessionSchema } from "@/lib/validations";

export const Route = createFileRoute("/cabinet/sessions")({
  component: CabinetSessions,
});

const emptyForm = {
  dateDebut: "",
  dateFin: "",
  lieu: "",
  formationId: "",
  capaciteMax: "" as string | number,
  formateurIds: [] as string[],
};

function CabinetSessions() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["cabinet-sessions"],
    queryFn: getSessions,
  });
  const { data: formations } = useQuery({
    queryKey: ["cabinet-formations-list"],
    queryFn: getFormations,
  });
  const { data: formateurs } = useQuery({
    queryKey: ["cabinet-formateurs-list"],
    queryFn: getFormateurs,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        capaciteMax: form.capaciteMax === "" ? undefined : Number(form.capaciteMax),
        formateurIds: form.formateurIds.length ? form.formateurIds : undefined,
      };
      return editingId ? updateSession(editingId, payload) : createSession(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cabinet-sessions"] });
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast.success(editingId ? "Session modifiée" : "Session créée");
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cabinet-sessions"] });
      setDeleteId(null);
      toast.success("Session supprimée");
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["cabinet-sessions"] });
      setDeleteId(null);
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (s: Session) => {
    setEditingId(s.id);
    setForm({
      dateDebut: s.dateDebut ? new Date(s.dateDebut).toISOString().slice(0, 16) : "",
      dateFin: s.dateFin ? new Date(s.dateFin).toISOString().slice(0, 16) : "",
      lieu: s.lieu || "",
      formationId: s.formation?.id || "",
      capaciteMax: s.capaciteMax ?? "",
      formateurIds: s.formateurs?.map((f: any) => f.id) || [],
    });
    setOpen(true);
  };

  const toggleFormateur = (id: string) => {
    setForm((f) => ({
      ...f,
      formateurIds: f.formateurIds.includes(id)
        ? f.formateurIds.filter((x) => x !== id)
        : [...f.formateurIds, id],
    }));
  };

  return (
    <CabinetShell
      title="Sessions"
      subtitle="Planifiez les sessions et assignez les formateurs."
      actions={
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
              <Plus className="h-4 w-4" /> Planifier une session
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Modifier la session" : "Nouvelle session"}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setFormErrors({});
                const r = sessionSchema.safeParse(form);
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
              {formErrors.form && <p className="text-xs text-destructive">{formErrors.form}</p>}
              <div>
                <Label>Formation</Label>
                <Select
                  value={form.formationId}
                  onValueChange={(v) => setForm({ ...form, formationId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une formation" />
                  </SelectTrigger>
                  <SelectContent>
                    {formations?.map((f: any) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.titre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date début</Label>
                  <Input
                    type="datetime-local"
                    value={form.dateDebut}
                    onChange={(e) => setForm({ ...form, dateDebut: e.target.value })}
                  />
                  {formErrors.dateDebut && (
                    <p className="mt-1 text-xs text-destructive">{formErrors.dateDebut}</p>
                  )}
                </div>
                <div>
                  <Label>Date fin</Label>
                  <Input
                    type="datetime-local"
                    value={form.dateFin}
                    onChange={(e) => setForm({ ...form, dateFin: e.target.value })}
                  />
                  {formErrors.dateFin && (
                    <p className="mt-1 text-xs text-destructive">{formErrors.dateFin}</p>
                  )}
                </div>
              </div>
              <div>
                <Label>Lieu</Label>
                <Input
                  placeholder="ex : Paris 11e — Salle 3B"
                  value={form.lieu}
                  onChange={(e) => setForm({ ...form, lieu: e.target.value })}
                />
              </div>
              <div>
                <Label>Capacité max</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Nombre de places (laisser vide = illimité)"
                  value={form.capaciteMax}
                  onChange={(e) => setForm({ ...form, capaciteMax: e.target.value })}
                />
              </div>
              <div>
                <Label>Formateurs</Label>
                <div className="mt-1 space-y-1 max-h-40 overflow-y-auto rounded-md border border-border p-2">
                  {formateurs?.length === 0 && (
                    <p className="text-xs text-muted-foreground">Aucun formateur disponible</p>
                  )}
                  {formateurs?.map((t: any) => (
                    <label
                      key={t.id}
                      className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-secondary cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={form.formateurIds.includes(t.id)}
                        onChange={() => toggleFormateur(t.id)}
                        className="rounded border-border"
                      />
                      {t.prenom} {t.nom}
                    </label>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editingId ? "Enregistrer les modifications" : "Créer la session"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Formation</th>
                <th className="px-4 py-3">Formateur</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Lieu</th>
                <th className="px-4 py-3">Inscrits</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {(!sessions || sessions.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    Aucune session planifiée
                  </td>
                </tr>
              )}
              {sessions?.map((s) => (
                <tr key={s.id} className="border-t border-border hover:bg-secondary/40">
                  <td className="px-4 py-3 font-medium">{s.formation?.titre || "Formation"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.formateurs?.map((f: any) => `${f.prenom} ${f.nom}`).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(s.dateDebut).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.lieu || "—"}</td>
                  <td className="px-4 py-3">{s.participants?.length || 0}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-xs " +
                        (s.isCancelled
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary/10 text-primary")
                      }
                    >
                      {s.isCancelled ? "Annulée" : s.isCompleted ? "Terminée" : "Planifiée"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(s)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(s.id)}
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
      )}

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(v) => {
          if (!v) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette session ?</AlertDialogTitle>
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
    </CabinetShell>
  );
}
