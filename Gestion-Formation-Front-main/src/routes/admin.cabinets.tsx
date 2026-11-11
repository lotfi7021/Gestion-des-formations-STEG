import { createFileRoute } from "@tanstack/react-router";
import {
  Plus,
  Loader2,
  Mail,
  Eye,
  Users,
  Calendar,
  BookOpen,
  Phone,
  Star,
  MapPin,
  UserCheck,
  FileText,
  Download,
  Clock,
  ToggleRight,
  ToggleLeft,
} from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { getCabinets, createCabinet, type Cabinet } from "@/lib/api/cabinets";
import { toggleUserActive } from "@/lib/api/users";
import { API_BASE } from "@/lib/api/client";
import { getFormateurs, type Formateur, cloneFormateurForPlatform } from "@/lib/api/formateurs";
import { getFormations, type Formation, cloneFormationForPlatform } from "@/lib/api/formations";
import { getSessions, type Session, cloneSessionForPlatform } from "@/lib/api/sessions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const UPLOADS_BASE = API_BASE.replace(/\/api$/, "");

export const Route = createFileRoute("/admin/cabinets")({
  component: AdminCabinets,
});

function FormateurDetailDialog({
  formateur,
  open,
  onClose,
}: {
  formateur: Formateur;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-sm text-primary-foreground">
              {formateur.prenom?.[0]}
              {formateur.nom?.[0]}
            </div>
            <div>
              <span>
                {formateur.prenom} {formateur.nom}
              </span>
              <p className="text-sm font-normal text-muted-foreground">{formateur.email}</p>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {formateur.telephone && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm">{formateur.telephone}</span>
              </div>
            )}
            {formateur.noteGlobale > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3">
                <Star className="h-4 w-4 shrink-0 text-yellow-500" />
                <span className="text-sm">{formateur.noteGlobale.toFixed(1)} / 5</span>
              </div>
            )}
          </div>
          {formateur.specialites && (
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">Spécialités</p>
              <p className="text-sm">{formateur.specialites}</p>
            </div>
          )}
          {formateur.qualifications && (
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">Qualifications</p>
              <p className="text-sm whitespace-pre-wrap">{formateur.qualifications}</p>
            </div>
          )}
          {formateur.biographie && (
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">Biographie</p>
              <p className="text-sm whitespace-pre-wrap">{formateur.biographie}</p>
            </div>
          )}
          {formateur.disponibilites?.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">Disponibilités</p>
              <div className="space-y-1">
                {formateur.disponibilites.map((d, i) => (
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
              {[
                { label: "CV", url: formateur.cvUrl },
                { label: "Programme", url: formateur.programmeUrl },
                { label: "Modèle CNFCPP", url: formateur.modeleCnfcppUrl },
                { label: "Feuille de présence", url: formateur.feuillePresenceUrl },
                { label: "Attestation", url: formateur.attestationUrl },
              ].map((doc) => (
                <div
                  key={doc.label}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background p-2.5"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {doc.url ? (
                    <a
                      href={`${UPLOADS_BASE}${doc.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      {doc.label} <Download className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground">{doc.label} · Non fourni</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SessionDetailDialog({
  session,
  open,
  onClose,
}: {
  session: Session;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{session.formation?.titre || "Session"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {session.dateDebut && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3">
                <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="text-sm">
                  <p>{new Date(session.dateDebut).toLocaleDateString()}</p>
                  {session.dateFin && (
                    <p className="text-xs text-muted-foreground">
                      → {new Date(session.dateFin).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            )}
            {session.lieu && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3">
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="text-sm">
                  <p>{session.lieu}</p>
                  {session.salle && (
                    <p className="text-xs text-muted-foreground">Salle {session.salle}</p>
                  )}
                </div>
              </div>
            )}
          </div>
          {session.heureDebut && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3">
              <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm">
                {session.heureDebut} → {session.heureFin || "..."}
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3">
              <UserCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="text-sm">
                <p>{session.nombreParticipants || 0} participants</p>
                {session.capaciteMax && (
                  <p className="text-xs text-muted-foreground">Max {session.capaciteMax}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3">
              {session.isCancelled ? (
                <Badge variant="destructive">Annulée</Badge>
              ) : session.isCompleted ? (
                <Badge className="bg-green-600">Terminée</Badge>
              ) : (
                <Badge>Active</Badge>
              )}
            </div>
          </div>
          {session.formateurs?.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">Formateurs</p>
              <div className="space-y-1">
                {session.formateurs.map((f: any) => (
                  <div key={f.id} className="flex items-center gap-2 text-sm">
                    <span>
                      {f.prenom} {f.nom}
                    </span>
                    <span className="text-xs text-muted-foreground">({f.email})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {session.notes && (
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{session.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FormationDetailDialog({
  formation,
  open,
  onClose,
}: {
  formation: Formation;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{formation.titre}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {formation.categorie && <Badge variant="secondary">{formation.categorie}</Badge>}
            {formation.type && <Badge>{formation.type}</Badge>}
            {formation.dureeEnJours && (
              <Badge variant="outline">
                {formation.dureeEnJours} jour{formation.dureeEnJours > 1 ? "s" : ""}
              </Badge>
            )}
            {formation.dureeEnHeures && <Badge variant="outline">{formation.dureeEnHeures}h</Badge>}
          </div>
          {formation.tarif > 0 && (
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-sm font-medium">{Number(formation.tarif).toLocaleString()} TND</p>
            </div>
          )}
          {formation.description && (
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">Description</p>
              <p className="text-sm whitespace-pre-wrap">{formation.description}</p>
            </div>
          )}
          {formation.objectifs && (
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">Objectifs</p>
              <p className="text-sm whitespace-pre-wrap">{formation.objectifs}</p>
            </div>
          )}
          {formation.prerequis && (
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">Prérequis</p>
              <p className="text-sm whitespace-pre-wrap">{formation.prerequis}</p>
            </div>
          )}
          {formation.programme && (
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">Programme</p>
              <p className="text-sm whitespace-pre-wrap">{formation.programme}</p>
            </div>
          )}
          {formation.imageUrl && (
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">Image</p>
              <img
                src={formation.imageUrl}
                alt={formation.titre}
                className="max-h-40 rounded-lg object-cover"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CabinetDetail({
  cabinet,
  open,
  onClose,
}: {
  cabinet: Cabinet;
  open: boolean;
  onClose: () => void;
}) {
  const [selectedFormateur, setSelectedFormateur] = useState<Formateur | null>(null);
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const { data: formateurs, isLoading: loadingF } = useQuery({
    queryKey: ["formateurs", cabinet.id],
    queryFn: () => getFormateurs(cabinet.id),
    enabled: open,
  });

  const { data: platformFormateurs } = useQuery({
    queryKey: ["formateurs"],
    queryFn: () => getFormateurs(),
    enabled: open,
  });

  const { data: formations, isLoading: loadingFo } = useQuery({
    queryKey: ["formations", cabinet.id],
    queryFn: () => getFormations(cabinet.id),
    enabled: open,
  });

  const { data: platformFormations } = useQuery({
    queryKey: ["formations"],
    queryFn: () => getFormations(),
    enabled: open,
  });

  const { data: sessions, isLoading: loadingS } = useQuery({
    queryKey: ["sessions", cabinet.id],
    queryFn: () => getSessions(cabinet.id),
    enabled: open,
  });

  const { data: platformSessions } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => getSessions(),
    enabled: open,
  });

  const clonedFormateurIds = new Set(
    (platformFormateurs || []).filter((f) => f.clonedFromId).map((f) => f.clonedFromId),
  );
  const clonedFormationIds = new Set(
    (platformFormations || []).filter((f) => f.clonedFromId).map((f) => f.clonedFromId),
  );
  const clonedSessionIds = new Set(
    (platformSessions || []).filter((s) => s.clonedFromId).map((s) => s.clonedFromId),
  );

  const queryClient = useQueryClient();

  const takeFormateur = useMutation({
    mutationFn: (id: string) => cloneFormateurForPlatform(id),
    onSuccess: () => {
      toast.success(
        "Formateur cloné sur la plateforme (copie créée, original conservé chez le cabinet)",
      );
    },
    onError: (err: any) => toast.error(err.message),
  });

  const takeFormation = useMutation({
    mutationFn: (id: string) => cloneFormationForPlatform(id),
    onSuccess: () => {
      toast.success(
        "Formation clonée sur la plateforme (copie créée, original conservée chez le cabinet)",
      );
    },
    onError: (err: any) => toast.error(err.message),
  });

  const takeSession = useMutation({
    mutationFn: (id: string) => cloneSessionForPlatform(id),
    onSuccess: () => {
      toast.success(
        "Session clonée sur la plateforme (copie créée, original conservée chez le cabinet)",
      );
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-sm text-primary-foreground">
              {cabinet.nom?.[0] || cabinet.email[0].toUpperCase()}
            </div>
            <div>
              <span>{cabinet.nom}</span>
              <p className="text-sm font-normal text-muted-foreground">{cabinet.email}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Formateurs */}
          <section>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Users className="h-4 w-4" /> Formateurs ({formateurs?.length ?? 0})
            </div>
            {loadingF ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : !formateurs?.length ? (
              <p className="text-sm text-muted-foreground">Aucun formateur</p>
            ) : (
              <div className="grid gap-2">
                {formateurs.map((f) => (
                  <div
                    key={f.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-secondary/50"
                    onClick={() => setSelectedFormateur(f)}
                  >
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold">
                      {f.prenom?.[0]}
                      {f.nom?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {f.prenom} {f.nom}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{f.email}</p>
                    </div>
                    {f.telephone && (
                      <span className="shrink-0 text-xs text-muted-foreground">{f.telephone}</span>
                    )}
                    {clonedFormateurIds.has(f.id) ? (
                      <Badge variant="secondary" className="text-xs">
                        Déjà cloné
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-green-600 hover:text-green-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          takeFormateur.mutate(f.id);
                        }}
                        disabled={takeFormateur.isPending}
                      >
                        Récupérer
                      </Button>
                    )}
                    <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Formations */}
          <section>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <BookOpen className="h-4 w-4" /> Formations ({formations?.length ?? 0})
            </div>
            {loadingFo ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : !formations?.length ? (
              <p className="text-sm text-muted-foreground">Aucune formation</p>
            ) : (
              <div className="grid gap-2">
                {formations.map((f) => (
                  <div
                    key={f.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-secondary/50"
                    onClick={() => setSelectedFormation(f)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{f.titre}</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {f.categorie && <Badge variant="secondary">{f.categorie}</Badge>}
                        {f.type && <Badge>{f.type}</Badge>}
                        {f.dureeEnJours && (
                          <Badge variant="outline" className="text-xs">
                            {f.dureeEnJours}j
                          </Badge>
                        )}
                      </div>
                    </div>
                    {clonedFormationIds.has(f.id) ? (
                      <Badge variant="secondary" className="text-xs">
                        Déjà clonée
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-green-600 hover:text-green-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          takeFormation.mutate(f.id);
                        }}
                        disabled={takeFormation.isPending}
                      >
                        Récupérer
                      </Button>
                    )}
                    <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Sessions */}
          <section>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Calendar className="h-4 w-4" /> Sessions ({sessions?.length ?? 0})
            </div>
            {loadingS ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : !sessions?.length ? (
              <p className="text-sm text-muted-foreground">Aucune session</p>
            ) : (
              <div className="grid gap-2">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-secondary/50"
                    onClick={() => setSelectedSession(s)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{s.formation?.titre || "Session"}</p>
                      {s.dateDebut && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(s.dateDebut).toLocaleDateString()}{" "}
                          {s.dateFin ? `→ ${new Date(s.dateFin).toLocaleDateString()}` : ""}
                        </p>
                      )}
                    </div>
                    {clonedSessionIds.has(s.id) ? (
                      <Badge variant="secondary" className="text-xs">
                        Déjà clonée
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-green-600 hover:text-green-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          takeSession.mutate(s.id);
                        }}
                        disabled={takeSession.isPending}
                      >
                        Récupérer
                      </Button>
                    )}
                    <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </DialogContent>

      {selectedFormateur && (
        <FormateurDetailDialog
          formateur={selectedFormateur}
          open={!!selectedFormateur}
          onClose={() => setSelectedFormateur(null)}
        />
      )}
      {selectedFormation && (
        <FormationDetailDialog
          formation={selectedFormation}
          open={!!selectedFormation}
          onClose={() => setSelectedFormation(null)}
        />
      )}
      {selectedSession && (
        <SessionDetailDialog
          session={selectedSession}
          open={!!selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </Dialog>
  );
}

function AdminCabinets() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [detailCabinet, setDetailCabinet] = useState<Cabinet | null>(null);
  const [form, setForm] = useState({ nomCabinet: "", email: "", telephone: "" });
  const [search, setSearch] = useState("");

  const { data: cabinets, isLoading } = useQuery({ queryKey: ["cabinets"], queryFn: getCabinets });
  const filtered = (cabinets || []).filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.nom.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.telephone || "").toLowerCase().includes(q)
    );
  });

  const createMutation = useMutation({
    mutationFn: () => createCabinet(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cabinets"] });
      setOpen(false);
      setForm({ nomCabinet: "", email: "", telephone: "" });
      toast.success("Cabinet ajouté · Email envoyé avec les identifiants");
    },
    onError: (err: any) => {
      try {
        const msg = JSON.parse(err.message);
        toast.error(msg.message || "Erreur");
      } catch {
        toast.error("Erreur lors de la création");
      }
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleUserActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cabinets"] });
      toast.success("Statut mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  return (
    <AdminShell
      title="Cabinets"
      subtitle="Gérez les cabinets de formation partenaires."
      actions={
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setForm({ nom: "", prenom: "", email: "", telephone: "" });
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" /> Ajouter un cabinet
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau cabinet</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <Label>Nom du cabinet</Label>
                <Input
                  placeholder="ex : Cabinet ABC Consulting"
                  value={form.nomCabinet}
                  onChange={(e) => setForm({ ...form, nomCabinet: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="ex : contact@cabinet.fr"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input
                  placeholder="+216XXXXXXXX"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Ajouter le cabinet
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                {cabinets?.length === 0
                  ? "Aucun cabinet pour le moment"
                  : "Aucun résultat pour cette recherche"}
              </div>
            )}
            {filtered.map((c: Cabinet) => (
              <div key={c.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary font-display text-lg text-primary-foreground">
                    {c.nom?.[0] || c.email[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-lg">{c.nom}</h3>
                    <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                    {c.telephone && <p className="text-xs text-muted-foreground">{c.telephone}</p>}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${c.isActive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}
                  >
                    {c.isActive ? "Actif" : "Inactif"}
                  </span>
                  <button
                    onClick={() => toggleMutation.mutate({ id: c.id, isActive: !c.isActive })}
                    disabled={toggleMutation.isPending}
                    className={`rounded p-1.5 ${c.isActive ? "text-green-600 hover:bg-green-100" : "text-muted-foreground hover:bg-secondary"}`}
                    title={c.isActive ? "Désactiver" : "Activer"}
                  >
                    {c.isActive ? (
                      <ToggleRight className="h-4 w-4" />
                    ) : (
                      <ToggleLeft className="h-4 w-4" />
                    )}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-8 px-2"
                    onClick={() => setDetailCabinet(c)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <a
                    href={`mailto:${c.email}`}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs hover:bg-secondary"
                  >
                    <Mail className="h-3 w-3" /> Contacter
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {detailCabinet && (
        <CabinetDetail cabinet={detailCabinet} open={true} onClose={() => setDetailCabinet(null)} />
      )}
    </AdminShell>
  );
}
