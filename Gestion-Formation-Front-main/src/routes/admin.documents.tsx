import { createFileRoute } from "@tanstack/react-router";
import {
  Award,
  FileSignature,
  FileText,
  Download,
  Loader2,
  Pen,
  FileCheck,
  UserCheck,
  Building2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { SignatureModal } from "@/components/signature-modal";
import {
  getAllDocumentsSignes,
  getAllSignatures,
  verifySignature,
  deleteSignature,
  generateConvention,
  generateContratFormateur,
  generateFeuilleEmargement,
  downloadDocumentSigne,
  getMySignatures,
  type DocumentSigne,
  type Signature,
} from "@/lib/api/signatures";
import { getSessions, type Session } from "@/lib/api/sessions";
import { getFormateurs } from "@/lib/api/formateurs";
import { getParticipants } from "@/lib/api/users";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/documents")({
  component: AdminDocuments,
});

const typeLabels: Record<string, string> = {
  convention_formation: "Convention",
  feuille_emargement: "Émargement",
  contrat_formateur: "Contrat",
  certificat: "Certificat",
};

const typeIcons: Record<string, typeof FileText> = {
  convention_formation: FileCheck,
  feuille_emargement: UserCheck,
  contrat_formateur: Building2,
  certificat: Award,
};

function AdminDocuments() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"documents" | "signatures">("documents");
  const [genDialog, setGenDialog] = useState<string | null>(null);
  const [genType, setGenType] = useState<"convention" | "contrat" | "emargement" | null>(null);
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState("");
  const [selectedFormateur, setSelectedFormateur] = useState("");

  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ["documents-signes"],
    queryFn: getAllDocumentsSignes,
  });

  const { data: signatures, isLoading: sigsLoading } = useQuery({
    queryKey: ["signatures-all"],
    queryFn: getAllSignatures,
  });

  const { data: sessions } = useQuery({
    queryKey: ["sessions"],
    queryFn: getSessions,
  });

  const { data: participants } = useQuery({
    queryKey: ["participants"],
    queryFn: getParticipants,
  });

  const { data: formateurs } = useQuery({
    queryKey: ["formateurs"],
    queryFn: getFormateurs,
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => verifySignature(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signatures-all"] });
      toast.success("Signature vérifiée");
    },
    onError: (err: any) => toast.error(err.message || "Erreur"),
  });

  const deleteSigMutation = useMutation({
    mutationFn: (id: string) => deleteSignature(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signatures-all"] });
      toast.success("Signature supprimée");
    },
    onError: (err: any) => toast.error(err.message || "Erreur"),
  });

  const genMutation = useMutation({
    mutationFn: async ({
      gType,
      sId,
      pId,
      fId,
    }: {
      gType: "convention" | "contrat" | "emargement";
      sId: string;
      pId?: string;
      fId?: string;
    }) => {
      if (gType === "convention" && !pId) throw new Error("Participant requis");
      if (gType === "contrat" && !fId) throw new Error("Formateur requis");
      if (gType === "convention") return generateConvention(sId, pId!);
      if (gType === "contrat") return generateContratFormateur(sId, fId!);
      if (gType === "emargement") return generateFeuilleEmargement(sId);
      throw new Error("Type invalide");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents-signes"] });
      toast.success("Document généré avec succès");
      setGenDialog(null);
      resetGenForm();
    },
    onError: (err: any) => toast.error(err.message || "Erreur"),
  });

  const resetGenForm = () => {
    setSelectedSession("");
    setSelectedParticipant("");
    setSelectedFormateur("");
  };

  const docCount = documents?.length || 0;
  const sigCount = signatures?.filter((s) => s.isVerified).length || 0;
  const pendingCount = signatures?.filter((s) => !s.isVerified).length || 0;

  return (
    <AdminShell
      title="Documents & Signatures"
      subtitle="Gérez les documents signés électroniquement : conventions, contrats formateurs, feuilles d'émargement et certificats."
      actions={
        <div className="flex gap-2">
          <SignatureModal
            onSigned={() => queryClient.invalidateQueries({ queryKey: ["signatures-all"] })}
          />
          <Dialog
            open={!!genDialog}
            onOpenChange={(o) => {
              if (!o) {
                setGenDialog(null);
                setGenType(null);
                resetGenForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => setGenDialog("gen")} className="gap-2">
                <FileText className="h-4 w-4" /> Générer un document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>Générer un document signé</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Type de document</Label>
                  <Select
                    value={genType || ""}
                    onValueChange={(v) => {
                      setGenType(v as any);
                      resetGenForm();
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="convention">Convention de formation</SelectItem>
                      <SelectItem value="contrat">Contrat formateur</SelectItem>
                      <SelectItem value="emargement">Feuille d'émargement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {genType && (
                  <div className="space-y-2">
                    <Label>Session</Label>
                    <Select value={selectedSession} onValueChange={setSelectedSession}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une session" />
                      </SelectTrigger>
                      <SelectContent>
                        {sessions?.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.formation?.titre || "Formation"} —{" "}
                            {new Date(s.dateDebut).toLocaleDateString("fr-FR")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {genType === "convention" && (
                  <div className="space-y-2">
                    <Label>Participant</Label>
                    <Select value={selectedParticipant} onValueChange={setSelectedParticipant}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un participant" />
                      </SelectTrigger>
                      <SelectContent>
                        {participants?.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.prenom} {p.nom} — {p.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {genType === "contrat" && (
                  <div className="space-y-2">
                    <Label>Formateur</Label>
                    <Select value={selectedFormateur} onValueChange={setSelectedFormateur}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un formateur" />
                      </SelectTrigger>
                      <SelectContent>
                        {formateurs?.map((f: any) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.prenom} {f.nom} — {f.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  onClick={() =>
                    genMutation.mutate({
                      gType: genType!,
                      sId: selectedSession,
                      pId: genType === "convention" ? selectedParticipant : undefined,
                      fId: genType === "contrat" ? selectedFormateur : undefined,
                    })
                  }
                  disabled={
                    genMutation.isPending ||
                    !selectedSession ||
                    (genType === "convention" && !selectedParticipant) ||
                    (genType === "contrat" && !selectedFormateur)
                  }
                  className="w-full gap-2"
                >
                  {genMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Générer le document
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
            <Award className="h-4 w-4" />
          </span>
          <p className="mt-4 font-display text-3xl">{docCount}</p>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Documents signés</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <FileSignature className="h-4 w-4" />
          </span>
          <p className="mt-4 font-display text-3xl">{sigCount}</p>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Signatures vérifiées
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Pen className="h-4 w-4" />
          </span>
          <p className="mt-4 font-display text-3xl">{pendingCount}</p>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            En attente de vérification
          </p>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-4 flex gap-2 border-b border-border">
          <button
            onClick={() => setTab("documents")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${tab === "documents" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Documents signés
          </button>
          <button
            onClick={() => setTab("signatures")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${tab === "signatures" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Signatures {pendingCount > 0 && `(${pendingCount} en attente)`}
          </button>
        </div>

        {tab === "documents" && (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {docsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !documents?.length ? (
              <div className="flex flex-col items-center gap-3 py-12 text-sm text-muted-foreground">
                <FileText className="h-10 w-10" />
                <p>Aucun document signé pour le moment</p>
                <p className="text-xs">
                  Générez une convention, un contrat ou une feuille d'émargement
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {documents.map((doc) => {
                  const Icon = typeIcons[doc.type] || FileText;
                  const label = typeLabels[doc.type] || doc.type;
                  const signedBy = [];
                  if (doc.isSignedByAdmin) signedBy.push("Admin");
                  if (doc.isSignedByParticipant) signedBy.push("Participant");
                  if (doc.isSignedByFormateur) signedBy.push("Formateur");
                  return (
                    <li
                      key={doc.id}
                      className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 text-sm hover:bg-secondary/40"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{doc.titre}</p>
                        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {label}
                          {doc.fileSize && <>· {doc.fileSize}</>}·{" "}
                          {new Date(doc.createdAt).toLocaleDateString("fr-FR")}
                          {signedBy.length > 0 && <> · Signé par : {signedBy.join(", ")}</>}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {signedBy.length > 0 && (
                          <Badge variant="secondary" className="text-[10px]">
                            Signé
                          </Badge>
                        )}
                        <button
                          onClick={() => downloadDocumentSigne(doc.id)}
                          className="rounded p-1 hover:bg-secondary"
                          title="Télécharger"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {tab === "signatures" && (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {sigsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !signatures?.length ? (
              <div className="flex flex-col items-center gap-3 py-12 text-sm text-muted-foreground">
                <FileSignature className="h-10 w-10" />
                <p>Aucune signature enregistrée</p>
                <p className="text-xs">Les utilisateurs peuvent signer depuis leur profil</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {signatures.map((sig) => (
                  <li
                    key={sig.id}
                    className="grid grid-cols-[100px_1fr_auto] items-center gap-4 px-4 py-3 text-sm hover:bg-secondary/40"
                  >
                    <div className="h-12 w-24 overflow-hidden rounded border border-border bg-white p-1">
                      <img
                        src={sig.imageData}
                        alt="Signature"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium">
                        {sig.user ? `${sig.user.prenom} ${sig.user.nom}` : "Utilisateur"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sig.user?.email || ""}
                        {sig.isVerified ? " · Vérifiée" : " · En attente"}
                        {sig.verifiedAt &&
                          ` · ${new Date(sig.verifiedAt).toLocaleDateString("fr-FR")}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {!sig.isVerified && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => verifyMutation.mutate(sig.id)}
                          disabled={verifyMutation.isPending}
                          className="h-8 text-xs"
                        >
                          Vérifier
                        </Button>
                      )}
                      {sig.isVerified && (
                        <Badge variant="secondary" className="text-[10px]">
                          Vérifiée
                        </Badge>
                      )}
                      <button
                        onClick={() => {
                          if (confirm("Supprimer cette signature ?"))
                            deleteSigMutation.mutate(sig.id);
                        }}
                        className="rounded p-1 text-destructive hover:bg-destructive/10"
                        title="Supprimer"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
