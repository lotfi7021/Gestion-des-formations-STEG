import { createFileRoute } from "@tanstack/react-router";
import {
  Plus,
  Star,
  Loader2,
  Mail,
  Pencil,
  Trash2,
  Upload,
  FileText,
  Download,
  Eye,
} from "lucide-react";

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3 w-3 ${s <= Math.round(value) ? "fill-ochre text-ochre" : "text-muted-foreground/20"}`}
        />
      ))}
    </div>
  );
}
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CabinetShell } from "@/components/cabinet-shell";
import {
  getFormateurs,
  createFormateur,
  updateFormateur,
  deleteFormateur,
  uploadFormateurDocument,
  DOCUMENT_TYPES,
  type Formateur,
} from "@/lib/api/formateurs";
import { formatPhone } from "@/lib/phone";
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
import { Textarea } from "@/components/ui/textarea";
import { formateurSchema } from "@/lib/validations";
import { API_URL } from "@/lib/api/client";

export const Route = createFileRoute("/cabinet/formateurs")({
  component: CabinetFormateurs,
});

const emptyForm = {
  nom: "",
  prenom: "",
  email: "",
  telephone: "",
  specialites: "",
  qualifications: "",
};

function CabinetFormateurs() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [pendingDocs, setPendingDocs] = useState<Record<string, File>>({});
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [detailFormateur, setDetailFormateur] = useState<Formateur | null>(null);

  const { data: formateurs, isLoading } = useQuery({
    queryKey: ["cabinet-formateurs"],
    queryFn: getFormateurs,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) return updateFormateur(editingId, form);
      const created = await createFormateur(form);
      for (const type of Object.keys(pendingDocs)) {
        await uploadFormateurDocument(created.id, type, pendingDocs[type]);
      }
      return created;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cabinet-formateurs"] });
      setPendingDocs({});
      if (editingId) {
        setOpen(false);
        resetForm();
        toast.success("Formateur modifié");
      } else {
        setEditingId(data.id);
        setForm({
          nom: data.nom,
          prenom: data.prenom,
          email: data.email,
          telephone: data.telephone || "",
          specialites: data.specialites || "",
          qualifications: data.qualifications || "",
        });
        const urls: Record<string, string> = {};
        for (const dt of DOCUMENT_TYPES) {
          if ((data as any)[dt.field]) urls[dt.key] = (data as any)[dt.field];
        }
        setDocUrls(urls);
        toast.success("Formateur ajouté");
      }
    },
    onError: (err: any) => {
      console.error("Save formateur error:", err);
      toast.error(err.message || "Erreur lors de l'enregistrement");
    },
  });

  const uploadDocMutation = useMutation({
    mutationFn: ({ id, type, file }: { id: string; type: string; file: File }) =>
      uploadFormateurDocument(id, type, file),
    onSuccess: () => toast.success("Document mis à jour"),
    onError: () => toast.error("Erreur lors de l'upload"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFormateur(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cabinet-formateurs"] });
      setDeleteId(null);
      toast.success("Formateur supprimé");
    },
    onError: (err: any) => {
      console.error("Delete formateur error:", err);
      toast.error(err.message || "Erreur lors de la suppression");
      setDeleteId(null);
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setPendingDocs({});
    setDocUrls({});
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (t: Formateur) => {
    setEditingId(t.id);
    setForm({
      nom: t.nom,
      prenom: t.prenom,
      email: t.email,
      telephone: t.telephone || "",
      specialites: t.specialites || "",
      qualifications: t.qualifications || "",
    });
    const urls: Record<string, string> = {};
    for (const dt of DOCUMENT_TYPES) {
      if ((t as any)[dt.field]) urls[dt.key] = (t as any)[dt.field];
    }
    setDocUrls(urls);
    setPendingDocs({});
    setOpen(true);
  };

  return (
    <CabinetShell
      title="Formateurs"
      subtitle="Gérez vos intervenants : consultez leurs profils, spécialités et disponibilités."
      actions={
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Ajouter un formateur
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-base">
                {editingId ? "Modifier le formateur" : "Nouveau formateur"}
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setFormErrors({});
                const r = formateurSchema.safeParse(form);
                if (!r.success) {
                  const fe: Record<string, string> = {};
                  r.error.issues.forEach((i) => {
                    const f = i.path[0] as string;
                    if (!fe[f]) fe[f] = i.message;
                  });
                  setFormErrors(fe);
                  return;
                }
                if (!editingId) {
                  const missing = DOCUMENT_TYPES.filter((dt) => !pendingDocs[dt.key]);
                  if (missing.length) {
                    toast.error(`Documents requis : ${missing.map((m) => m.label).join(", ")}`);
                    return;
                  }
                }
                saveMutation.mutate();
              }}
              className="min-w-0 space-y-2.5 overflow-y-auto max-h-[70vh] pr-1"
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Nom</Label>
                  <Input
                    className="h-8"
                    placeholder="ex : Martin"
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  />
                  {formErrors.nom && (
                    <p className="mt-1 text-xs text-destructive">{formErrors.nom}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Prénom</Label>
                  <Input
                    className="h-8"
                    placeholder="ex : Sophie"
                    value={form.prenom}
                    onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                  />
                  {formErrors.prenom && (
                    <p className="mt-1 text-xs text-destructive">{formErrors.prenom}</p>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  className="h-8"
                  type="email"
                  placeholder="ex : sophie.martin@exemple.fr"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                {formErrors.email && (
                  <p className="mt-1 text-xs text-destructive">{formErrors.email}</p>
                )}
              </div>
              <div>
                <Label className="text-xs">Téléphone</Label>
                <Input
                  className="h-8"
                  placeholder="+216XXXXXXXX"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  onBlur={(e) => setForm({ ...form, telephone: formatPhone(e.target.value) })}
                />
                {formErrors.telephone && (
                  <p className="mt-1 text-xs text-destructive">{formErrors.telephone}</p>
                )}
              </div>
              <div>
                <Label className="text-xs">Spécialités</Label>
                <Input
                  className="h-8"
                  placeholder="ex : Cybersécurité, Réseau"
                  value={form.specialites}
                  onChange={(e) => setForm({ ...form, specialites: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Qualifications</Label>
                <Textarea
                  className="min-h-[56px]"
                  rows={2}
                  placeholder="Diplômes, certifications, années d'expérience..."
                  value={form.qualifications}
                  onChange={(e) => setForm({ ...form, qualifications: e.target.value })}
                />
              </div>
              <div className="space-y-2 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-3">
                <p className="text-xs font-medium text-foreground">Documents obligatoires (PDF)</p>
                {DOCUMENT_TYPES.map((dt) => {
                  const isUploading = uploadDocMutation.isPending;
                  const hasUrl = !!docUrls[dt.key];
                  const hasPending = !!pendingDocs[dt.key];
                  return (
                    <div
                      key={dt.key}
                      className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1 text-xs">{dt.label}</span>
                      {hasUrl && !editingId ? (
                        <span className="shrink-0 text-[10px] text-muted-foreground">✓</span>
                      ) : hasPending ? (
                        <span
                          className="shrink-0 truncate text-[10px] text-muted-foreground max-w-[100px]"
                          title={pendingDocs[dt.key].name}
                        >
                          {pendingDocs[dt.key].name}
                        </span>
                      ) : hasUrl && editingId ? (
                        <a
                          href={`${API_URL}${docUrls[dt.key]}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                      <label className="shrink-0 cursor-pointer rounded border border-border bg-background px-2 py-0.5 text-[10px] font-medium hover:bg-secondary">
                        {isUploading ? "..." : "Choisir"}
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          disabled={isUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (editingId) {
                              uploadDocMutation.mutate({ id: editingId, type: dt.key, file });
                            } else {
                              setPendingDocs({ ...pendingDocs, [dt.key]: file });
                            }
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
              <Button
                type="submit"
                className="w-full h-8 text-xs"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {editingId ? "Enregistrer les modifications" : "Ajouter le formateur"}
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {formateurs?.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              Aucun formateur pour le moment
            </div>
          )}
          {formateurs?.map((t: Formateur) => (
            <div key={t.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary font-display text-lg text-primary-foreground overflow-hidden">
                  {t.avatarUrl ? (
                    <img
                      src={`${API_URL}${t.avatarUrl}`}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <>
                      {t.prenom?.[0]}
                      {t.nom?.[0]}
                    </>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-lg">
                    {t.prenom} {t.nom}
                  </h3>
                  <p className="truncate text-xs text-muted-foreground">{t.specialites || "—"}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <StarRating value={t.noteGlobale} />
                    <span className="text-xs text-muted-foreground">({t.noteGlobale || "—"})</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => setDetailFormateur(t)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openEdit(t)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(t.id)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  Disponible
                </span>
                <a
                  href={`mailto:${t.email}`}
                  className="ml-auto inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs hover:bg-secondary"
                >
                  <Mail className="h-3 w-3" /> Contacter
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={!!detailFormateur}
        onOpenChange={(v) => {
          if (!v) setDetailFormateur(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">
              {detailFormateur?.prenom} {detailFormateur?.nom}
            </DialogTitle>
          </DialogHeader>
          {detailFormateur && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Email</span>
                  <p className="font-medium">{detailFormateur.email}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Téléphone</span>
                  <p className="font-medium">{detailFormateur.telephone || "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Spécialités</span>
                  <p className="font-medium">{detailFormateur.specialites || "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Note</span>
                  <p className="font-medium">{detailFormateur.noteGlobale || "—"}</p>
                </div>
              </div>
              {detailFormateur.qualifications && (
                <div>
                  <span className="text-xs text-muted-foreground">Qualifications</span>
                  <p className="mt-0.5 text-sm">{detailFormateur.qualifications}</p>
                </div>
              )}
              <div>
                <span className="text-xs text-muted-foreground">Documents</span>
                <div className="mt-2 space-y-1.5">
                  {DOCUMENT_TYPES.map((dt) => {
                    const url = (detailFormateur as any)[dt.field];
                    return (
                      <div
                        key={dt.key}
                        className="flex items-center gap-2 rounded-md border bg-background px-3 py-2"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                        <span className="flex-1 text-xs">{dt.label}</span>
                        {url ? (
                          <a
                            href={`${API_URL}${url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Non fourni</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(v) => {
          if (!v) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce formateur ?</AlertDialogTitle>
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
