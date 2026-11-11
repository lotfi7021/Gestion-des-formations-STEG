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
  Mail,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { CertificateTextDialog } from "@/components/admin/certificate-text-dialog";
import { SessionQrDialog } from "@/components/admin/session-qr-dialog";
import {
  getSessions,
  createSession,
  updateSession,
  deleteSession,
  type Session,
} from "@/lib/api/sessions";
import { getFormations, type Formation } from "@/lib/api/formations";
import { API_BASE, getAuthHeaders } from "@/lib/api/client";
import { getFormateurs } from "@/lib/api/formateurs";
import { getParticipants as getParticipantsUsers } from "@/lib/api/users";
import { queryKeys } from "@/lib/api/query-keys";
import { sendSessionConvocations } from "@/lib/api/checkin";
import { getErrorMessage } from "@/lib/api/errors";

/** Inscrit possible à une session : participant (User) ou employé STEG (User role=employe). */
type PersonneInscriptible = {
  id: string;
  prenom: string;
  nom: string;
  identifiant?: string | null;
};
import type { UserRef } from "@/lib/api/types";
import type { Formateur } from "@/lib/api/formateurs";
import { generateSessionCertificates, type Certificate } from "@/lib/api/certificates";
import { generateSessionSummary } from "@/lib/api/ai";
import { generateConvention, generateContratFormateur } from "@/lib/api/signatures";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sessionSchema, type SessionData } from "@/lib/validations";

export const Route = createFileRoute("/admin/sessions")({
  component: AdminSessions,
});

const months = ["JAN", "FÉV", "MAR", "AVR", "MAI", "JUI", "JUI", "AOÛ", "SEP", "OCT", "NOV", "DÉC"];

async function downloadPresenceList(sessionId: string, titre?: string) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/presence-list`, {
    headers: getAuthHeaders(),
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
  formateurIds: [] as string[],
};

function AdminSessions() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const form = useForm<SessionData>({
    resolver: zodResolver(sessionSchema),
    defaultValues: emptyForm,
  });
  const participantIds = form.watch("participantIds") ?? [];
  const formateurIds = form.watch("formateurIds") ?? [];
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [participantSearch, setParticipantSearch] = useState("");
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la génération du résumé");
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
    setSummaryBySession((prev) => {
      const n = { ...prev };
      delete n[sessionId];
      return n;
    });
    setSummaryEditById((prev) => {
      const n = { ...prev };
      delete n[sessionId];
      return n;
    });
  };

  const [certTextSessionId, setCertTextSessionId] = useState<string | null>(null);

  const { data: sessions, isLoading } = useQuery({
    queryKey: queryKeys.sessions,
    queryFn: () => getSessions(),
  });
  const filtered = (sessions || []).filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.formation?.titre || "").toLowerCase().includes(q) ||
      (s.lieu || "").toLowerCase().includes(q) ||
      (s.notes || "").toLowerCase().includes(q)
    );
  });
  const { data: formations } = useQuery({
    queryKey: queryKeys.formations,
    queryFn: () => getFormations(),
  });
  const { data: formateurs } = useQuery({
    queryKey: queryKeys.formateurs,
    queryFn: () => getFormateurs(),
  });
  // Liste unifiée : employés STEG (role=employe) + participants (role=participant)
  const { data: participants } = useQuery({
    queryKey: queryKeys.participantsForSelect,
    queryFn: async (): Promise<PersonneInscriptible[]> => {
      const users = await getParticipantsUsers();
      return [...users];
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const values = form.getValues();
      const payload = {
        ...values,
        capaciteMax: values.capaciteMax === "" ? undefined : Number(values.capaciteMax),
        participantIds: values.participantIds?.length ? values.participantIds : undefined,
        formateurIds: values.formateurIds?.length ? values.formateurIds : undefined,
      };
      return editingId ? updateSession(editingId, payload) : createSession(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      setOpen(false);
      setEditingId(null);
      form.reset(emptyForm);
      toast.success(editingId ? "Session modifiée" : "Session créée");
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      setDeleteId(null);
      toast.success("Session supprimée");
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      setDeleteId(null);
    },
  });

  const certMutation = useMutation({
    mutationFn: (sessionId: string) => generateSessionCertificates(sessionId),
    onSuccess: (data: unknown[]) => {
      toast.success(`${data.length} certificat(s) généré(s) avec succès`);
      queryClient.invalidateQueries({ queryKey: queryKeys.documentsSignes });
    },
    onError: (err: Error) => {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la génération des certificats",
      );
    },
  });

  const conventionMutation = useMutation({
    mutationFn: ({ sessionId, participantId }: { sessionId: string; participantId: string }) =>
      generateConvention(sessionId, participantId),
    onSuccess: () => {
      toast.success("Convention générée");
      queryClient.invalidateQueries({ queryKey: queryKeys.documentsSignes });
    },
    onError: (err: Error) => toast.error(err.message || "Erreur"),
  });

  const contratMutation = useMutation({
    mutationFn: ({ sessionId, formateurId }: { sessionId: string; formateurId: string }) =>
      generateContratFormateur(sessionId, formateurId),
    onSuccess: () => {
      toast.success("Contrat formateur généré");
      queryClient.invalidateQueries({ queryKey: queryKeys.documentsSignes });
    },
    onError: (err: Error) => toast.error(err.message || "Erreur"),
  });

  const completeMutation = useMutation({
    mutationFn: (sessionId: string) => updateSession(sessionId, { isCompleted: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      toast.success("Session marquée comme terminée");
    },
    onError: (err: Error) => {
      toast.error(err instanceof Error ? err.message : "Erreur");
    },
  });

  const convocationMutation = useMutation({
    mutationFn: (sessionId: string) => sendSessionConvocations(sessionId),
    onSuccess: (result) => {
      toast.success(`${result.sent} convocation(s) envoyée(s)`);
      if (result.failed > 0) {
        toast.error(`${result.failed} envoi(s) ont échoué`);
      }
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Erreur lors de l'envoi des convocations"));
    },
  });

  const openCreate = () => {
    setEditingId(null);
    form.reset(emptyForm);
    setOpen(true);
  };

  const openEdit = (s: Session) => {
    setEditingId(s.id);
    form.reset({
      dateDebut: s.dateDebut ? new Date(s.dateDebut).toISOString().slice(0, 16) : "",
      dateFin: s.dateFin ? new Date(s.dateFin).toISOString().slice(0, 16) : "",
      lieu: s.lieu || "",
      formationId: s.formation?.id || "",
      capaciteMax: s.capaciteMax ?? "",
      participantIds: s.participants?.map((p) => p.id) || [],
      formateurIds: s.formateurs?.map((f) => f.id) || [],
    });
    setOpen(true);
  };

  const toggleParticipant = (id: string) => {
    form.setValue(
      "participantIds",
      participantIds.includes(id)
        ? participantIds.filter((x) => x !== id)
        : [...participantIds, id],
      { shouldValidate: true },
    );
  };
  const toggleFormateur = (id: string) => {
    form.setValue(
      "formateurIds",
      formateurIds.includes(id) ? formateurIds.filter((x) => x !== id) : [...formateurIds, id],
      { shouldValidate: true },
    );
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
              form.reset(emptyForm);
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
            <Form {...form}>
              <form onSubmit={form.handleSubmit(() => saveMutation.mutate())} className="space-y-4">
                <FormField
                  control={form.control}
                  name="formationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Formation</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une formation" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {formations?.map((f: Formation) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.titre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="dateDebut"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date début</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dateFin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date fin</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="lieu"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lieu</FormLabel>
                      <FormControl>
                        <Input placeholder="ex : Paris 11e — Salle 3B" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="capaciteMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacité max</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="Nombre de places (laisser vide = illimité)"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <Label>Participants</Label>
                  <div className="relative mb-1">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      placeholder="Rechercher par nom ou identifiant…"
                      value={participantSearch}
                      onChange={(e) => setParticipantSearch(e.target.value)}
                      className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border p-2">
                    {(participants || [])
                      .filter(
                        (p: PersonneInscriptible) =>
                          !participantSearch ||
                          `${p.nom} ${p.prenom} ${p.identifiant || ""}`
                            .toLowerCase()
                            .includes(participantSearch.toLowerCase()),
                      )
                      .map((p: PersonneInscriptible) => (
                        <label
                          key={p.id}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={participantIds.includes(p.id)}
                            onChange={() => toggleParticipant(p.id)}
                            className="rounded"
                          />
                          {p.identifiant && (
                            <span className="font-mono text-xs text-muted-foreground">
                              {p.identifiant}
                            </span>
                          )}
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
                <div>
                  <Label>Formateurs</Label>
                  <div className="max-h-32 overflow-y-auto space-y-1 rounded-md border p-2">
                    {formateurs?.map((f: Formateur) => (
                      <label key={f.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formateurIds.includes(f.id)}
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
            <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
              Plateforme
            </span>
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
                    </h3>
                    <p className="truncate text-sm text-muted-foreground">
                      {s.formateurs?.map((f) => `${f.prenom} ${f.nom}`).join(", ") ||
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
                      <p className="text-sm font-medium">{s.participants?.length || 0}</p>
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
                    <SessionQrDialog sessionId={s.id} titre={s.formation?.titre} />
                    <button
                      onClick={() => convocationMutation.mutate(s.id)}
                      disabled={
                        convocationMutation.isPending && convocationMutation.variables === s.id
                      }
                      className="rounded-md border border-border bg-background p-2 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
                      title="Envoyer les convocations (.ics)"
                    >
                      {convocationMutation.isPending && convocationMutation.variables === s.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
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
                          {s.participants.map((p: UserRef) => (
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
                            onClick={() => setCertTextSessionId(s.id)}
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
                            {s.participants?.map((p: UserRef) => (
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
                            {s.formateurs?.map((f: UserRef) => (
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CertificateTextDialog
        key={certTextSessionId ?? "closed"}
        open={!!certTextSessionId}
        sessionId={certTextSessionId ?? ""}
        onClose={() => setCertTextSessionId(null)}
      />

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
