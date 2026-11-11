import { createFileRoute } from "@tanstack/react-router";
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  FileText,
  Award,
  CheckCircle,
  XCircle,
  FileSignature,
  UserCheck,
  Building2,
  Sparkles,
  Copy,
  X,
} from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import {
  getSessions,
  createSession,
  updateSession,
  deleteSession,
  type Session,
} from "@/lib/api/sessions";
import { getFormations } from "@/lib/api/formations";
import { API_BASE } from "@/lib/api/client";
import { getEmployes } from "@/lib/api/employes";
import { getFormateurs } from "@/lib/api/formateurs";
import { getParticipants } from "@/lib/api/users";
import { generateSessionCertificates, getCertificates, type Certificate } from "@/lib/api/certificates";
import { generateSessionSummary, generateCertificateText } from "@/lib/api/ai";
import {
  generateConvention,
  generateContratFormateur,
  generateFeuilleEmargement,
} from "@/lib/api/signatures";
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

export const Route = createFileRoute("/admin/sessions")({
  component: AdminSessions,
});

const months = ["JAN", "FÉV", "MAR", "AVR", "MAI", "JUI", "JUI", "AOÛ", "SEP", "OCT", "NOV", "DÉC"];

async function downloadPresenceList(sessionId: string, titre?: string) {
  const token = localStorage.getItem("access_token");
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/presence-list`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    toast.error("Erreur lors du téléchargement");
    return;
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `feuille_presence_${(titre || "formation").replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
const emptyForm = {
  dateDebut: "",
  dateFin: "",
  lieu: "",
  formationId: "",
  capaciteMax: "" as string | number,
  participantIds: [] as string[],
  employeIds: [] as string[],
  formateurIds: [] as string[],
};

function AdminSessions() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [employeSearch, setEmployeSearch] = useState("");
  const [source, setSource] = useState<"employes" | "participants">("participants");
  const [originFilter, setOriginFilter] = useState<"all" | "platform" | "cabinet">("all");
  const [search, setSearch] = useState("");

  // ─── État résumé IA ───────────────────────────────────────────────────────
  // summaryState : null = pas encore généré, 'loading' = en cours, string = texte généré
  const [summaryBySession, setSummaryBySession] = useState<Record<string, string>>({});
  const [summaryLoadingId, setSummaryLoadingId] = useState<string | null>(null);
  const [summaryEditById, setSummaryEditById] = useState<Record<string, string>>({});

  const handleGenerateSummary = async (sessionId: string) => {
    setSummaryLoadingId(sessionId);
    try {
      const result = await generateSessionSummary(sessionId);
      setSummaryBySession((prev) => ({ ...prev, [sessionId]: result.text }));
      setSummaryEditById((prev) => ({ ...prev, [sessionId]: result.text }));
      if (result.isFallback) {
        toast.warning("Résumé généré en mode fallback (IA indisponible)");
      } else {
        toast.success("Résumé IA généré avec succès");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la génération du résumé");
    } finally {
      setSummaryLoadingId(null);
    }
  };

  const copySummary = (sessionId: string) => {
    const text = summaryEditById[sessionId] || summaryBySession[sessionId];
    if (text) {
      navigator.clipboard.writeText(text).then(() => toast.success("Résumé copié"));
    }
  };

  const dismissSummary = (sessionId: string) => {
    setSummaryBySession((prev) => { const n = { ...prev }; delete n[sessionId]; return n; });
    setSummaryEditById((prev) => { const n = { ...prev }; delete n[sessionId]; return n; });
  };

  // ─── État texte de certificat IA ──────────────────────────────────────────
  const [certTextDialog, setCertTextDialog] = useState<{
    open: boolean;
    sessionId: string;
    certificateId: string;
    participantName: string;
  } | null>(null);
  const [certTextLoading, setCertTextLoading] = useState(false);
  const [certTextValue, setCertTextValue] = useState("");
  const [certTextIsFallback, setCertTextIsFallback] = useState(false);

  // Certificats chargés pour la session active (chargé à la demande)
  const { data: allCertificates } = useQuery({
    queryKey: ["certificates"],
    queryFn: getCertificates,
    enabled: !!certTextDialog,
  });

  const openCertTextDialog = (sessionId: string) => {
    setCertTextDialog({ open: true, sessionId, certificateId: "", participantName: "" });
    setCertTextValue("");
    setCertTextIsFallback(false);
  };

  const closeCertTextDialog = () => {
    setCertTextDialog(null);
    setCertTextValue("");
  };

  const handleGenerateCertText = async (certId: string) => {
    if (!certId) return;
    setCertTextLoading(true);
    try {
      const result = await generateCertificateText(certId);
      setCertTextValue(result.text);
      setCertTextIsFallback(result.isFallback);
      if (result.isFallback) {
        toast.warning("Texte généré en mode fallback (IA indisponible)");
      } else {
        toast.success("Texte de certificat généré avec succès");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la génération");
    } finally {
      setCertTextLoading(false);
    }
  };

  const copyCertText = () => {
    if (certTextValue) {
      navigator.clipboard.writeText(certTextValue).then(() => toast.success("Texte copié"));
    }
  };

  const { data: sessions, isLoading } = useQuery({ queryKey: ["sessions"], queryFn: getSessions });
  const filtered = (sessions || [])
    .filter((s) => {
      if (originFilter === "cabinet") return !!(s as any).clonedFromCabinetId;
      if (originFilter === "platform") return !(s as any).clonedFromCabinetId;
      return true;
    })
    .filter((s) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (s.formation?.titre || "").toLowerCase().includes(q) ||
        (s.lieu || "").toLowerCase().includes(q) ||
        (s.notes || "").toLowerCase().includes(q)
      );
    });
  const { data: formations } = useQuery({ queryKey: ["formations"], queryFn: getFormations });
  const { data: employes } = useQuery({ queryKey: ["employes"], queryFn: getEmployes });
  const { data: formateurs } = useQuery({ queryKey: ["formateurs"], queryFn: getFormateurs });
  const { data: participants } = useQuery({ queryKey: ["participants"], queryFn: getParticipants });

  const selectedFormation = formations?.find((f: any) => f.id === form.formationId);
  const formationType = selectedFormation?.type;
  const showSourceToggle = formationType === "intra";
  const showEmployes = formationType === "inter" || (showSourceToggle && source === "employes");
  const showParticipants =
    formationType !== "inter" && (!showSourceToggle || source === "participants");

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        capaciteMax: form.capaciteMax === "" ? undefined : Number(form.capaciteMax),
        participantIds: form.participantIds.length ? form.participantIds : undefined,
        employeIds: form.employeIds.length ? form.employeIds : undefined,
        formateurIds: form.formateurIds.length ? form.formateurIds : undefined,
      };
      return editingId ? updateSession(editingId, payload) : createSession(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
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
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setDeleteId(null);
      toast.success("Session supprimée");
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setDeleteId(null);
    },
  });

  const certMutation = useMutation({
    mutationFn: (sessionId: string) => generateSessionCertificates(sessionId),
    onSuccess: (data: any) => {
      toast.success(`${data.length} certificat(s) généré(s) avec succès`);
      queryClient.invalidateQueries({ queryKey: ["documents-signes"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la génération des certificats");
    },
  });

  const conventionMutation = useMutation({
    mutationFn: ({ sessionId, participantId }: { sessionId: string; participantId: string }) =>
      generateConvention(sessionId, participantId),
    onSuccess: () => {
      toast.success("Convention générée");
      queryClient.invalidateQueries({ queryKey: ["documents-signes"] });
    },
    onError: (err: any) => toast.error(err.message || "Erreur"),
  });

  const contratMutation = useMutation({
    mutationFn: ({ sessionId, formateurId }: { sessionId: string; formateurId: string }) =>
      generateContratFormateur(sessionId, formateurId),
    onSuccess: () => {
      toast.success("Contrat formateur généré");
      queryClient.invalidateQueries({ queryKey: ["documents-signes"] });
    },
    onError: (err: any) => toast.error(err.message || "Erreur"),
  });

  const emargementMutation = useMutation({
    mutationFn: (sessionId: string) => generateFeuilleEmargement(sessionId),
    onSuccess: () => {
      toast.success("Feuille d'émargement générée");
      queryClient.invalidateQueries({ queryKey: ["documents-signes"] });
    },
    onError: (err: any) => toast.error(err.message || "Erreur"),
  });

  const completeMutation = useMutation({
    mutationFn: (sessionId: string) => updateSession(sessionId, { isCompleted: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session marquée comme terminée");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur");
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
      participantIds: s.participants?.map((p: any) => p.id) || [],
      employeIds: s.employes?.map((e: any) => e.id) || [],
      formateurIds: s.formateurs?.map((f: any) => f.id) || [],
    });
    setOpen(true);
  };

  const filteredEmployes =
    employes?.filter(
      (e: any) =>
        !employeSearch ||
        `${e.nom} ${e.prenom} ${e.identifiant || ""}`
          .toLowerCase()
          .includes(employeSearch.toLowerCase()),
    ) || [];

  const toggleEmploye = (id: string) => {
    setForm((f) => ({
      ...f,
      employeIds: f.employeIds.includes(id)
        ? f.employeIds.filter((x) => x !== id)
        : [...f.employeIds, id],
    }));
  };
  const toggleParticipant = (id: string) => {
    setForm((f) => ({
      ...f,
      participantIds: f.participantIds.includes(id)
        ? f.participantIds.filter((x) => x !== id)
        : [...f.participantIds, id],
    }));
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
    <AdminShell
      title="Sessions"
      subtitle="Planifiez les sessions, assignez les formateurs et les participants, et suivez le deroulement de chaque formation."
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
              {showSourceToggle && (
                <div>
                  <Label>Type de participants</Label>
                  <div className="flex gap-2 rounded-md border border-border p-1">
                    <button
                      type="button"
                      onClick={() => setSource("employes")}
                      className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${source === "employes" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Employés
                    </button>
                    <button
                      type="button"
                      onClick={() => setSource("participants")}
                      className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${source === "participants" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Participants
                    </button>
                  </div>
                </div>
              )}
              {showEmployes && (
                <div>
                  <Label>Employés</Label>
                  <div className="relative mb-1">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      placeholder="Rechercher par identifiant ou nom…"
                      value={employeSearch}
                      onChange={(e) => setEmployeSearch(e.target.value)}
                      className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border p-2">
                    {filteredEmployes.map((e: any) => (
                      <label key={e.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.employeIds.includes(e.id)}
                          onChange={() => toggleEmploye(e.id)}
                          className="rounded"
                        />
                        <span className="font-mono text-xs text-muted-foreground">
                          {e.identifiant || "—"}
                        </span>
                        <span>
                          {e.prenom} {e.nom}
                        </span>
                      </label>
                    ))}
                    {filteredEmployes.length === 0 && (
                      <p className="text-xs text-muted-foreground py-2 text-center">
                        {employeSearch ? "Aucun employé trouvé" : "Aucun employé disponible"}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {showParticipants && (
                <div>
                  <Label>Participants</Label>
                  <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border p-2">
                    {participants?.map((p: any) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.participantIds.includes(p.id)}
                          onChange={() => toggleParticipant(p.id)}
                          className="rounded"
                        />
                        <span>
                          {p.prenom} {p.nom}
                        </span>
                      </label>
                    ))}
                    {(!participants || participants.length === 0) && (
                      <p className="text-xs text-muted-foreground py-2 text-center">
                        Aucun participant disponible
                      </p>
                    )}
                  </div>
                </div>
              )}
              <div>
                <Label>Formateurs</Label>
                <div className="max-h-32 overflow-y-auto space-y-1 rounded-md border p-2">
                  {formateurs?.map((f: any) => (
                    <label key={f.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.formateurIds.includes(f.id)}
                        onChange={() => toggleFormateur(f.id)}
                        className="rounded"
                      />
                      {f.prenom} {f.nom}
                    </label>
                  ))}
                  {(!formateurs || formateurs.length === 0) && (
                    <p className="text-xs text-muted-foreground">Aucun formateur disponible</p>
                  )}
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
        <div className="space-y-3">
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
          {filtered?.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">Aucune session planifiée</div>
          )}
          {filtered?.map((s: Session) => {
            const d = new Date(s.dateDebut);
            return (
              <div key={s.id} className="rounded-xl border border-border bg-card">
                <div className="grid grid-cols-[80px_minmax(0,1fr)_auto] items-center gap-4 p-5">
                  <div className="rounded-md bg-secondary p-3 text-center">
                    <div className="text-xs uppercase text-muted-foreground">
                      {months[d.getMonth()]}
                    </div>
                    <div className="font-display text-2xl text-primary">{d.getDate()}</div>
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-xl">
                      {s.formation?.titre || "Formation"}
                      {s.clonedFromCabinetId && (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                          {s.clonedFromCabinetName || "Cabinet"}
                        </span>
                      )}
                    </h3>
                    <p className="truncate text-sm text-muted-foreground">
                      {s.formateurs?.map((f: any) => `${f.prenom} ${f.nom}`).join(", ") ||
                        "Aucun formateur"}{" "}
                      · {s.lieu || "À définir"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {s.isCompleted ? (
                      <span className="hidden md:flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                        <CheckCircle className="h-3 w-3" /> Terminée
                      </span>
                    ) : s.isCancelled ? (
                      <span className="hidden md:flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                        <XCircle className="h-3 w-3" /> Annulée
                      </span>
                    ) : (
                      <span className="hidden md:flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                        Planifiée
                      </span>
                    )}
                    <div className="hidden text-right md:block">
                      <p className="text-xs uppercase text-muted-foreground">Participants</p>
                      <p className="text-sm font-medium">
                        {(s.participants?.length || 0) + (s.employes?.length || 0)}
                      </p>
                    </div>
                    <button
                      onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                      className="rounded-md border border-border bg-background p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      {expandedId === s.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => downloadPresenceList(s.id, s.formation?.titre)}
                      className="rounded-md border border-border bg-background p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      title="Télécharger la feuille de présence"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openEdit(s)}
                      className="rounded-md border border-border bg-background p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(s.id)}
                      className="rounded-md border border-border bg-background p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {expandedId === s.id && (
                  <div className="border-t border-border px-5 py-3 space-y-3">
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Participants (utilisateurs)
                      </p>
                      {s.participants?.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {s.participants.map((p: any) => (
                            <span
                              key={p.id}
                              className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium"
                            >
                              {p.prenom} {p.nom}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Aucun</p>
                      )}
                    </div>
                    {!s.isCompleted && !s.isCancelled && (
                      <div className="border-t border-border pt-3">
                        <button
                          onClick={() => completeMutation.mutate(s.id)}
                          disabled={completeMutation.isPending}
                          className="flex w-full items-center justify-center gap-2 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                        >
                          {completeMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          {completeMutation.isPending ? "Mise à jour..." : "Marquer comme terminée"}
                        </button>
                      </div>
                    )}
                    {s.isCompleted && (
                      <div className="border-t border-border pt-3 space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => certMutation.mutate(s.id)}
                            disabled={certMutation.isPending}
                            className="flex items-center justify-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                          >
                            {certMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Award className="h-4 w-4" />
                            )}
                            {certMutation.isPending ? "Génération..." : "Certificats"}
                          </button>
                          <button
                            onClick={() => emargementMutation.mutate(s.id)}
                            disabled={emargementMutation.isPending}
                            className="flex items-center justify-center gap-2 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                          >
                            {emargementMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileSignature className="h-4 w-4" />
                            )}
                            {emargementMutation.isPending ? "Génération..." : "Émargement"}
                          </button>
                          <button
                            onClick={() => openCertTextDialog(s.id)}
                            className="flex items-center justify-center gap-2 rounded-md border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100"
                          >
                            <Sparkles className="h-4 w-4" />
                            Texte cert. IA
                          </button>
                        </div>
                        <div className="text-xs text-muted-foreground text-center">
                          Générer des documents pour cette session
                        </div>

                        {/* ── Résumé IA ─────────────────────────────────── */}
                        <div className="border-t border-border pt-3">
                          {!summaryBySession[s.id] ? (
                            <button
                              onClick={() => handleGenerateSummary(s.id)}
                              disabled={summaryLoadingId === s.id}
                              className="flex w-full items-center justify-center gap-2 rounded-md border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50"
                            >
                              {summaryLoadingId === s.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Sparkles className="h-4 w-4" />
                              )}
                              {summaryLoadingId === s.id
                                ? "Génération en cours…"
                                : "Générer résumé IA"}
                            </button>
                          ) : (
                            <div className="rounded-md border border-violet-200 bg-violet-50/60 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-violet-700">
                                  <Sparkles className="h-3.5 w-3.5" />
                                  Résumé IA généré
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => copySummary(s.id)}
                                    title="Copier"
                                    className="rounded p-1 text-violet-600 hover:bg-violet-100"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleGenerateSummary(s.id)}
                                    disabled={summaryLoadingId === s.id}
                                    title="Régénérer"
                                    className="rounded p-1 text-violet-600 hover:bg-violet-100 disabled:opacity-50"
                                  >
                                    {summaryLoadingId === s.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Sparkles className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => dismissSummary(s.id)}
                                    title="Fermer"
                                    className="rounded p-1 text-muted-foreground hover:bg-secondary"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                              <textarea
                                value={summaryEditById[s.id] ?? summaryBySession[s.id]}
                                onChange={(e) =>
                                  setSummaryEditById((prev) => ({
                                    ...prev,
                                    [s.id]: e.target.value,
                                  }))
                                }
                                rows={8}
                                className="w-full resize-y rounded border border-violet-200 bg-white px-3 py-2 text-xs leading-relaxed text-foreground outline-none focus:border-violet-400"
                              />
                              <p className="text-[10px] text-muted-foreground">
                                Vous pouvez éditer ce texte avant de le copier ou l'utiliser.
                              </p>
                            </div>
                          )}
                        </div>
                        {/* ─────────────────────────────────────────────── */}
                      </div>
                    )}
                    {!s.isCompleted && !s.isCancelled && (
                      <div className="border-t border-border pt-3">
                        <details className="group">
                          <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                            Générer des documents (convention, contrat)
                          </summary>
                          <div className="mt-2 space-y-2">
                            {s.participants?.map((p: any) => (
                              <button
                                key={p.id}
                                onClick={() =>
                                  conventionMutation.mutate({
                                    sessionId: s.id,
                                    participantId: p.id,
                                  })
                                }
                                disabled={conventionMutation.isPending}
                                className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-secondary disabled:opacity-50"
                              >
                                <UserCheck className="h-3 w-3" />
                                Convention : {p.prenom} {p.nom}
                              </button>
                            ))}
                            {s.formateurs?.map((f: any) => (
                              <button
                                key={f.id}
                                onClick={() =>
                                  contratMutation.mutate({ sessionId: s.id, formateurId: f.id })
                                }
                                disabled={contratMutation.isPending}
                                className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-secondary disabled:opacity-50"
                              >
                                <Building2 className="h-3 w-3" />
                                Contrat : {f.prenom} {f.nom}
                              </button>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Employés
                      </p>
                      {s.employes?.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {s.employes.map((e: any) => (
                            <span
                              key={e.id}
                              className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium"
                            >
                              {e.prenom} {e.nom}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Aucun</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Dialog : texte de certificat IA ────────────────────────────────── */}
      <Dialog
        open={!!certTextDialog?.open}
        onOpenChange={(open) => {
          if (!open) closeCertTextDialog();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600" />
              Texte de certificat IA
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Sélectionnez un certificat déjà généré pour cette session. Claude rédigera un texte
              personnalisé basé sur la formation, le taux d'assiduité et les évaluations.
            </p>

            {/* Sélecteur de certificat */}
            <div className="space-y-1.5">
              <Label>Certificat du participant</Label>
              <Select
                value={certTextDialog?.certificateId || ""}
                onValueChange={(certId) => {
                  const cert = allCertificates?.find((c) => c.id === certId);
                  const name = cert
                    ? `${cert.user.prenom} ${cert.user.nom}`
                    : "";
                  setCertTextDialog((prev) =>
                    prev ? { ...prev, certificateId: certId, participantName: name } : prev,
                  );
                  // Réinitialiser le texte si on change de certificat
                  setCertTextValue("");
                  setCertTextIsFallback(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un certificat..." />
                </SelectTrigger>
                <SelectContent>
                  {allCertificates
                    ?.filter((c) => c.session?.id === certTextDialog?.sessionId)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.user.prenom} {c.user.nom} — {c.numeroCertificat}
                      </SelectItem>
                    ))}
                  {allCertificates?.filter((c) => c.session?.id === certTextDialog?.sessionId)
                    .length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      Aucun certificat pour cette session. Générez-les d'abord.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Bouton de génération */}
            <Button
              onClick={() => handleGenerateCertText(certTextDialog?.certificateId || "")}
              disabled={certTextLoading || !certTextDialog?.certificateId}
              className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white"
            >
              {certTextLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {certTextLoading ? "Génération en cours…" : "Générer le texte via Claude"}
            </Button>

            {/* Aperçu éditable */}
            {certTextValue && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Texte généré</span>
                    {certTextIsFallback && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        Fallback
                      </span>
                    )}
                    {!certTextIsFallback && (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                        Claude IA
                      </span>
                    )}
                  </div>
                  <button
                    onClick={copyCertText}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copier
                  </button>
                </div>

                {/* Aperçu visuel du certificat */}
                <div className="rounded-lg border-2 border-dashed border-violet-200 bg-violet-50/40 p-6">
                  <div className="mb-3 text-center">
                    <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">
                      Aperçu certificat
                    </p>
                    {certTextDialog?.participantName && (
                      <p className="mt-1 text-lg font-bold text-foreground">
                        {certTextDialog.participantName}
                      </p>
                    )}
                  </div>
                  <div className="rounded bg-white p-4 shadow-sm">
                    <p className="mb-2 text-xs font-medium text-muted-foreground italic">
                      Nous certifions que…
                    </p>
                    <textarea
                      value={certTextValue}
                      onChange={(e) => setCertTextValue(e.target.value)}
                      rows={10}
                      className="w-full resize-y rounded border border-border bg-transparent px-2 py-1 text-sm leading-relaxed text-foreground outline-none focus:border-violet-400"
                      placeholder="Le texte généré apparaîtra ici…"
                    />
                  </div>
                  <p className="mt-2 text-center text-[10px] text-muted-foreground">
                    Éditez le texte ci-dessus avant de l'utiliser dans le PDF final.
                  </p>
                </div>

                {/* Actions finales */}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => handleGenerateCertText(certTextDialog?.certificateId || "")}
                    disabled={certTextLoading || !certTextDialog?.certificateId}
                    className="flex-1 gap-2"
                  >
                    {certTextLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Régénérer
                  </Button>
                  <Button onClick={copyCertText} variant="outline" className="flex-1 gap-2">
                    <Copy className="h-4 w-4" />
                    Copier le texte
                  </Button>
                  <Button onClick={closeCertTextDialog} variant="ghost" className="gap-2">
                    <X className="h-4 w-4" />
                    Fermer
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* ─────────────────────────────────────────────────────────────────────── */}

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
    </AdminShell>
  );
}
