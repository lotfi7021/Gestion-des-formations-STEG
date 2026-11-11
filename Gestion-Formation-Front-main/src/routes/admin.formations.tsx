import { createFileRoute } from "@tanstack/react-router";
import {
  Filter,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Upload,
  FileText,
  Download,
  Image as ImageIcon,
  Eye,
} from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import {
  getFormations,
  createFormation,
  updateFormation,
  deleteFormation,
  uploadFormationSupport,
  uploadFormationImage,
  type Formation,
} from "@/lib/api/formations";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { API_URL } from "@/lib/api/client";
import { formationSchema } from "@/lib/validations";

export const Route = createFileRoute("/admin/formations")({
  component: AdminFormations,
});

const emptyForm: {
  titre: string;
  description: string;
  categorie: string;
  type: "catalogue" | "intra" | "inter";
  tarif: number;
  dureeEnJours: number;
  programme: string;
  imageUrl?: string;
} = {
  titre: "",
  description: "",
  categorie: "",
  type: "catalogue",
  tarif: 0,
  dureeEnJours: 1,
  programme: "",
};

function AdminFormations() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [supports, setSupports] = useState<{ nom: string; url: string; type: string }[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingSupports, setPendingSupports] = useState<File[]>([]);
  const [detailFormation, setDetailFormation] = useState<Formation | null>(null);
  const [originFilter, setOriginFilter] = useState<"all" | "platform" | "cabinet">("all");
  const [search, setSearch] = useState("");

  const { data: formations, isLoading } = useQuery({
    queryKey: ["formations"],
    queryFn: getFormations,
  });
  const filtered = (formations || [])
    .filter((f) => {
      if (originFilter === "cabinet") return !!f.clonedFromCabinetId;
      if (originFilter === "platform") return !f.clonedFromCabinetId;
      return true;
    })
    .filter((f) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        f.titre.toLowerCase().includes(q) ||
        (f.description || "").toLowerCase().includes(q) ||
        (f.categorie || "").toLowerCase().includes(q)
      );
    });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) return updateFormation(editingId, form);
      const created = await createFormation(form);
      if (pendingImage) await uploadFormationImage(created.id, pendingImage);
      for (const file of pendingSupports) await uploadFormationSupport(created.id, file);
      return created;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["formations"] });
      setPendingImage(null);
      setPendingSupports([]);
      if (editingId) {
        setOpen(false);
        resetForm();
        toast.success("Formation modifiée");
      } else {
        setEditingId(data.id);
        setForm({
          titre: data.titre,
          description: data.description || "",
          categorie: data.categorie || "",
          type: data.type,
          tarif: data.tarif || 0,
          dureeEnJours: data.dureeEnJours || 1,
          programme: data.programme || "",
          imageUrl: data.imageUrl,
        });
        setImagePreview(data.imageUrl ? `${API_URL}${data.imageUrl}` : null);
        setSupports(data.supportsFormation || []);
        toast.success("Formation créée");
      }
    },
    onError: (err: any) => {
      console.error("Save formation error:", err);
      try {
        const msg = JSON.parse(err.message);
        toast.error(msg.message || "Erreur");
      } catch {
        toast.error(err.message || "Erreur lors de l'enregistrement");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFormation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formations"] });
      setDeleteId(null);
      toast.success("Formation supprimée");
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["formations"] });
      setDeleteId(null);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadFormationSupport(id, file),
    onSuccess: (data) => {
      setSupports(data.supportsFormation || []);
      toast.success("Fichier ajouté");
    },
    onError: () => toast.error("Erreur lors de l'upload"),
  });

  const imageUploadMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadFormationImage(id, file),
    onSuccess: (data) => {
      if (data.imageUrl) {
        setImagePreview(`${API_URL}${data.imageUrl}`);
        setForm({ ...form, imageUrl: data.imageUrl });
      }
      toast.success("Image mise à jour");
    },
    onError: () => toast.error("Erreur lors de l'upload de l'image"),
  });

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSupports([]);
    setImagePreview(null);
    setPendingImage(null);
    setPendingSupports([]);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (f: Formation) => {
    setEditingId(f.id);
    setForm({
      titre: f.titre,
      description: f.description || "",
      categorie: f.categorie || "",
      type: f.type,
      tarif: Number(f.tarif) || 0,
      dureeEnJours: Number(f.dureeEnJours) || 1,
      programme: f.programme || "",
      imageUrl: f.imageUrl,
    });
    setSupports(f.supportsFormation || []);
    setImagePreview(f.imageUrl ? `${API_URL}${f.imageUrl}` : null);
    setPendingImage(null);
    setPendingSupports([]);
    setOpen(true);
  };

  return (
    <AdminShell
      title="Formations"
      subtitle="Créez et organisez votre catalogue de formations. Définissez les programmes, les objectifs et les prerequis pour chaque formation."
      actions={
        <>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4" /> Filtres
          </Button>
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Nouvelle formation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader className="pb-2">
                <DialogTitle className="text-base">
                  {editingId ? "Modifier la formation" : "Nouvelle formation"}
                </DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setFormErrors({});
                  const r = formationSchema.safeParse(form);
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
                className="min-w-0 space-y-2.5 overflow-y-auto max-h-[70vh] pr-1"
              >
                <div>
                  <Label className="text-xs">Titre</Label>
                  <Input
                    className="h-8"
                    placeholder="ex : Cybersécurité Fondamentaux"
                    value={form.titre}
                    onChange={(e) => setForm({ ...form, titre: e.target.value })}
                  />
                  {formErrors.titre && (
                    <p className="mt-1 text-xs text-destructive">{formErrors.titre}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    className="min-h-[56px]"
                    rows={2}
                    placeholder="Décrivez le contenu et les objectifs de la formation..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Catégorie</Label>
                    <Input
                      className="h-8"
                      placeholder="ex : Sécurité, Management"
                      value={form.categorie}
                      onChange={(e) => setForm({ ...form, categorie: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={form.type}
                      onValueChange={(v) => setForm({ ...form, type: v as any })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="catalogue">Catalogue</SelectItem>
                        <SelectItem value="intra">Intra</SelectItem>
                        <SelectItem value="inter">Inter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Tarif (DT)</Label>
                    <Input
                      className="h-8"
                      type="number"
                      placeholder="ex : 1500"
                      min={0}
                      value={form.tarif}
                      onChange={(e) => setForm({ ...form, tarif: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Durée (jours)</Label>
                    <Input
                      className="h-8"
                      type="number"
                      placeholder="ex : 3"
                      min={1}
                      max={365}
                      value={form.dureeEnJours}
                      onChange={(e) => setForm({ ...form, dureeEnJours: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Programme</Label>
                  <Textarea
                    className="min-h-[56px]"
                    rows={2}
                    placeholder="Modules, chapitres, compétences visées..."
                    value={form.programme}
                    onChange={(e) => setForm({ ...form, programme: e.target.value })}
                  />
                </div>
                <div className="min-w-0 space-y-3">
                  <div className="space-y-2 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-3">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="text-xs font-medium">Image de la formation</span>
                    </div>
                    {imagePreview && (
                      <div className="overflow-hidden rounded-md border border-border">
                        <img
                          src={imagePreview}
                          alt="Aperçu"
                          className="aspect-video max-h-32 w-full object-cover"
                        />
                      </div>
                    )}
                    <label className="flex cursor-pointer flex-col items-center gap-1 rounded-md border-2 border-dashed border-muted-foreground/20 bg-background px-3 py-2 transition-colors hover:border-primary/50 hover:bg-primary/5">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {imageUploadMutation.isPending
                          ? "Upload en cours..."
                          : !editingId && pendingImage
                            ? `${pendingImage.name} (en attente)`
                            : imagePreview
                              ? "Changer l'image"
                              : "Cliquez pour ajouter une image"}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        disabled={imageUploadMutation.isPending}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (editingId) {
                              imageUploadMutation.mutate({ id: editingId, file });
                            } else {
                              setPendingImage(file);
                              setImagePreview(URL.createObjectURL(file));
                            }
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>
                  </div>
                  <div className="space-y-2 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="text-xs font-medium">Supports PDF</span>
                    </div>
                    <label className="flex cursor-pointer flex-col items-center gap-1 rounded-md border-2 border-dashed border-muted-foreground/20 bg-background px-3 py-2 transition-colors hover:border-primary/50 hover:bg-primary/5">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {uploadMutation.isPending
                          ? "Upload en cours..."
                          : !editingId && pendingSupports.length > 0
                            ? `${pendingSupports.length} fichier(s) en attente`
                            : "Cliquez pour ajouter un PDF"}
                      </span>
                      <input
                        type="file"
                        accept=".pdf"
                        disabled={uploadMutation.isPending}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (editingId) {
                              uploadMutation.mutate({ id: editingId, file });
                            } else {
                              setPendingSupports([...pendingSupports, file]);
                            }
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>
                    {(supports.length > 0 || (!editingId && pendingSupports.length > 0)) && (
                      <ul className="min-w-0 space-y-1">
                        {supports.map((s, i) => (
                          <li
                            key={i}
                            className="flex min-w-0 items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-xs"
                          >
                            <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                            <span className="min-w-0 flex-1 truncate" title={s.nom}>
                              {s.nom}
                            </span>
                            <a
                              href={`${API_URL}${s.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          </li>
                        ))}
                        {!editingId &&
                          pendingSupports.map((f, i) => (
                            <li
                              key={`pending-${i}`}
                              className="flex min-w-0 items-center gap-2 rounded-md border border-dashed bg-background px-2.5 py-1.5 text-xs text-muted-foreground"
                            >
                              <FileText className="h-3.5 w-3.5 shrink-0 text-primary/50" />
                              <span className="min-w-0 flex-1 truncate" title={f.name}>
                                {f.name}
                              </span>
                              <span className="shrink-0 text-[10px]">en attente</span>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-8 text-xs"
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {editingId ? "Enregistrer les modifications" : "Créer la formation"}
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
            {(["all", "platform", "cabinet"] as const).map((o) => (
              <button
                key={o}
                onClick={() => setOriginFilter(o)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  originFilter === o
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                }`}
              >
                {o === "all" ? "Tous" : o === "platform" ? "Plateforme" : "Cabinet"}
              </button>
            ))}
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 w-12" />
                  <th className="px-4 py-3">Titre</th>
                  <th className="px-4 py-3">Catégorie</th>
                  <th className="px-4 py-3">Format</th>
                  <th className="px-4 py-3">Durée</th>
                  <th className="px-4 py-3">Prix HT</th>
                  <th className="px-4 py-3">Sessions</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {formations?.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      Aucune formation pour le moment
                    </td>
                  </tr>
                )}
                {filtered?.map((f: Formation) => (
                  <tr key={f.id} className="border-t border-border hover:bg-secondary/40">
                    <td className="px-4 py-3">
                      <div className="h-10 w-10 overflow-hidden rounded-md bg-gradient-to-br from-primary/10 to-secondary/10">
                        {f.imageUrl ? (
                          <img
                            src={`${API_URL}${f.imageUrl}`}
                            alt={f.titre}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground/40 font-display">
                            {f.titre[0]}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {f.titre}
                      {f.clonedFromCabinetId && (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                          {f.clonedFromCabinetName || "Cabinet"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{f.categorie || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        {f.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {f.dureeEnJours ? `${f.dureeEnJours}j` : "—"}
                    </td>
                    <td className="px-4 py-3">{f.tarif ? `${f.tarif} DT` : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{f.sessions?.length || 0}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDetailFormation(f)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(f)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(f.id)}
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
        </>
      )}

      <Dialog
        open={!!detailFormation}
        onOpenChange={(v) => {
          if (!v) setDetailFormation(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-sm text-primary-foreground">
                {detailFormation?.titre?.[0]}
              </div>
              <div>
                <span>{detailFormation?.titre}</span>
                {detailFormation?.clonedFromCabinetId && (
                  <span className="ml-2 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                    Issu de {detailFormation?.clonedFromCabinetName || "cabinet"}
                  </span>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          {detailFormation && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {detailFormation.categorie && (
                  <Badge variant="secondary">{detailFormation.categorie}</Badge>
                )}
                {detailFormation.type && <Badge>{detailFormation.type}</Badge>}
                {detailFormation.dureeEnJours && (
                  <Badge variant="outline">
                    {detailFormation.dureeEnJours} jour{detailFormation.dureeEnJours > 1 ? "s" : ""}
                  </Badge>
                )}
                {detailFormation.dureeEnHeures && (
                  <Badge variant="outline">{detailFormation.dureeEnHeures}h</Badge>
                )}
              </div>
              {detailFormation.tarif > 0 && (
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-sm font-medium">
                    {Number(detailFormation.tarif).toLocaleString()} TND
                  </p>
                </div>
              )}
              {detailFormation.description && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Description</p>
                  <p className="text-sm whitespace-pre-wrap">{detailFormation.description}</p>
                </div>
              )}
              {detailFormation.objectifs && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Objectifs</p>
                  <p className="text-sm whitespace-pre-wrap">{detailFormation.objectifs}</p>
                </div>
              )}
              {detailFormation.prerequis && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Prérequis</p>
                  <p className="text-sm whitespace-pre-wrap">{detailFormation.prerequis}</p>
                </div>
              )}
              {detailFormation.programme && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Programme</p>
                  <p className="text-sm whitespace-pre-wrap">{detailFormation.programme}</p>
                </div>
              )}
              {detailFormation.imageUrl && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Image</p>
                  <img
                    src={`${API_URL}${detailFormation.imageUrl}`}
                    alt={detailFormation.titre}
                    className="max-h-40 rounded-lg object-cover"
                  />
                </div>
              )}
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
            <AlertDialogTitle>Supprimer cette formation ?</AlertDialogTitle>
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
