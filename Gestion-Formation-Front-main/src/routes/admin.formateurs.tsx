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
  Clock,
  Phone,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { StarRating } from "@/components/star-rating";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { API_BASE, API_URL } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { getErrorMessage } from "@/lib/api/errors";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { formateurSchema, type FormateurData } from "@/lib/validations";

export const Route = createFileRoute("/admin/formateurs")({
  component: AdminFormateurs,
});

const emptyForm = {
  nom: "",
  prenom: "",
  email: "",
  telephone: "",
  specialites: "",
  qualifications: "",
};

function AdminFormateurs() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const form = useForm<FormateurData>({
    resolver: zodResolver(formateurSchema),
    defaultValues: emptyForm,
  });
  const [pendingDocs, setPendingDocs] = useState<Record<string, File>>({});
  const [detailFormateur, setDetailFormateur] = useState<Formateur | null>(null);
  const [search, setSearch] = useState("");

  const { data: formateurs, isLoading } = useQuery({
    queryKey: queryKeys.formateurs,
    queryFn: () => getFormateurs(),
  });
  const filtered = (formateurs || []).filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      f.nom.toLowerCase().includes(q) ||
      f.prenom.toLowerCase().includes(q) ||
      f.email.toLowerCase().includes(q) ||
      (f.specialites || "").toLowerCase().includes(q)
    );
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const values = form.getValues();
      if (editingId) return updateFormateur(editingId, values);
      const created = await createFormateur(values);
      for (const [type, file] of Object.entries(pendingDocs)) {
        await uploadFormateurDocument(created.id, type, file);
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.formateurs });
      setOpen(false);
      setEditingId(null);
      form.reset(emptyForm);
      setPendingDocs({});
      toast.success(editingId ? "Formateur modifié" : "Formateur ajouté · Email envoyé");
    },
    onError: (err: Error) => {
      toast.error(getErrorMessage(err, "Erreur lors de l'enregistrement"));
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ id, type, file }: { id: string; type: string; file: File }) =>
      uploadFormateurDocument(id, type, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.formateurs });
      toast.success("Document ajouté");
    },
    onError: (err: Error) => toast.error(err.message || "Erreur upload"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFormateur(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.formateurs });
      setDeleteId(null);
      toast.success("Formateur supprimé");
    },
    onError: (err: Error) => {
      toast.error(getErrorMessage(err, "Erreur lors de la suppression"));
      setDeleteId(null);
    },
  });

  const openCreate = () => {
    setEditingId(null);
    form.reset(emptyForm);
    setPendingDocs({});
    setOpen(true);
  };

  const openEdit = (t: Formateur) => {
    setEditingId(t.id);
    form.reset({
      nom: t.nom,
      prenom: t.prenom,
      email: t.email,
      telephone: t.telephone || "",
      specialites: t.specialites || "",
      qualifications: t.qualifications || "",
    });
    setOpen(true);
  };

  const UPLOADS_BASE = API_BASE.replace(/\/api$/, "");

  return (
    <AdminShell
      title="Formateurs"
      subtitle="Gerer vos intervenants : consultez leurs profils, specialites, disponibilites et consultez leurs evaluations."
      actions={
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) {
              setEditingId(null);
              form.reset(emptyForm);
              setPendingDocs({});
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Ajouter un formateur
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Modifier le formateur" : "Nouveau formateur"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(() => {
                  if (!editingId) {
                    const missing = DOCUMENT_TYPES.filter((dt) => !pendingDocs[dt.key]);
                    if (missing.length) {
                      toast.error(`Documents requis : ${missing.map((m) => m.label).join(", ")}`);
                      return;
                    }
                  }
                  saveMutation.mutate();
                })}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="nom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom</FormLabel>
                        <FormControl>
                          <Input placeholder="ex : Martin" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="prenom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prénom</FormLabel>
                        <FormControl>
                          <Input placeholder="ex : Sophie" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="ex : sophie.martin@exemple.fr"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="telephone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+216XXXXXXXX"
                          {...field}
                          onBlur={(e) => {
                            field.onBlur();
                            field.onChange(formatPhone(e.target.value));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="specialites"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Spécialités</FormLabel>
                      <FormControl>
                        <Input placeholder="ex : Cybersécurité, Réseau" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="qualifications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qualifications</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Diplômes, certifications, années d'expérience..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Documents obligatoires */}
                {!editingId && (
                  <div className="rounded-lg border border-border bg-background p-4">
                    <p className="mb-3 text-sm font-semibold">Documents obligatoires (PDF)</p>
                    <div className="grid grid-cols-2 gap-3">
                      {DOCUMENT_TYPES.map((dt) => (
                        <div key={dt.key} className="space-y-1">
                          <Label className="text-xs">{dt.label}</Label>
                          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-background px-3 py-2 text-xs text-muted-foreground hover:bg-secondary/50">
                            <Upload className="h-3.5 w-3.5" />
                            <span className="truncate">
                              {pendingDocs[dt.key]?.name || "Choisir un fichier"}
                            </span>
                            <input
                              type="file"
                              accept=".pdf,application/pdf"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) setPendingDocs((prev) => ({ ...prev, [dt.key]: f }));
                              }}
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents existants en mode édition */}
                {editingId &&
                  (() => {
                    const formateur = formateurs?.find((f) => f.id === editingId);
                    if (!formateur) return null;
                    return (
                      <div className="rounded-lg border border-border bg-background p-4">
                        <p className="mb-3 text-sm font-semibold">Documents</p>
                        <div className="grid grid-cols-2 gap-2">
                          {DOCUMENT_TYPES.map((dt) => {
                            const url = formateur[dt.field as keyof Formateur] as
                              | string
                              | undefined;
                            return (
                              <div
                                key={dt.key}
                                className="flex items-center gap-2 rounded-md border border-border p-2.5"
                              >
                                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                {url ? (
                                  <a
                                    href={`${UPLOADS_BASE}${url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                                  >
                                    {dt.label} <Download className="h-3 w-3" />
                                  </a>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    {dt.label} · Non fourni
                                  </span>
                                )}
                                <label className="ml-auto cursor-pointer rounded p-1 text-muted-foreground hover:bg-secondary">
                                  <Upload className="h-3.5 w-3.5" />
                                  <input
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f && editingId)
                                        uploadMutation.mutate({
                                          id: editingId,
                                          type: dt.key,
                                          file: f,
                                        });
                                    }}
                                  />
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {editingId ? "Enregistrer les modifications" : "Ajouter le formateur"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-3 text-xs outline-none focus:border-primary"
            />
            <span className="text-xs font-medium text-muted-foreground">Origine :</span>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
              Plateforme
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered?.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                Aucun formateur pour le moment
              </div>
            )}
            {filtered?.map((t: Formateur) => (
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
                      <StarRating value={t.noteGlobale} className="h-3 w-3" />
                      <span className="text-xs text-muted-foreground">
                        ({t.noteGlobale || "—"})
                      </span>
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
        </>
      )}

      <Dialog
        open={!!detailFormateur}
        onOpenChange={(v) => {
          if (!v) setDetailFormateur(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-sm text-primary-foreground">
                {detailFormateur?.prenom?.[0]}
                {detailFormateur?.nom?.[0]}
              </div>
              <div>
                <span>
                  {detailFormateur?.prenom} {detailFormateur?.nom}
                </span>
                <p className="text-sm font-normal text-muted-foreground">
                  {detailFormateur?.email}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          {detailFormateur && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {detailFormateur.telephone && (
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3">
                    <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm">{detailFormateur.telephone}</span>
                  </div>
                )}
                {detailFormateur.noteGlobale > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3">
                    <Star className="h-4 w-4 shrink-0 text-yellow-500" />
                    <span className="text-sm">{detailFormateur.noteGlobale.toFixed(1)} / 5</span>
                  </div>
                )}
              </div>
              {detailFormateur.specialites && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Spécialités</p>
                  <p className="text-sm">{detailFormateur.specialites}</p>
                </div>
              )}
              {detailFormateur.qualifications && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Qualifications</p>
                  <p className="text-sm whitespace-pre-wrap">{detailFormateur.qualifications}</p>
                </div>
              )}
              {detailFormateur.biographie && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Biographie</p>
                  <p className="text-sm whitespace-pre-wrap">{detailFormateur.biographie}</p>
                </div>
              )}
              {detailFormateur.disponibilites?.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Disponibilités</p>
                  <div className="space-y-1">
                    {detailFormateur.disponibilites.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="capitalize">{d.jour}</span>
                        <span className="text-muted-foreground">
                          {d.heureDebut} → {d.heureFin}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Documents */}
              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Documents</p>
                <div className="grid grid-cols-2 gap-2">
                  {DOCUMENT_TYPES.map((dt) => {
                    const url = detailFormateur[dt.field as keyof Formateur] as string | undefined;
                    return (
                      <div
                        key={dt.label}
                        className="flex items-center gap-2 rounded-lg border border-border bg-background p-2.5"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        {url ? (
                          <a
                            href={`${UPLOADS_BASE}${url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            {dt.label} <Download className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {dt.label} · Non fourni
                          </span>
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
    </AdminShell>
  );
}
