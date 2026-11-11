import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Calendar,
  ArrowRight,
  Loader2,
  BookOpen,
  Star,
  Wallet,
  Clock,
  ChevronDown,
  ChevronUp,
  Paperclip,
  FileText,
  Download,
  Award,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/protected-route";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { API_URL, API_BASE } from "@/lib/api/client";
import { getMySessions } from "@/lib/api/sessions";
import { getMyInscriptions } from "@/lib/api/inscriptions";
import { getSessionDocuments, type SessionDocument } from "@/lib/api/session-documents";
import {
  getMyCertificates,
  getCertificateDownloadUrl,
  type Certificate,
} from "@/lib/api/certificates";

export const Route = createFileRoute("/mes-formations")({
  head: () => ({
    meta: [{ title: "Mes formations — steg_form" }],
  }),
  component: MesFormationsPage,
});

function MesFormationsPage() {
  const { user } = useAuth();
  const isFormateur = user?.role === "formateur";

  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ["my-sessions", isFormateur ? "enrolled" : "all"],
    queryFn: () => getMySessions(isFormateur ? "enrolled" : undefined),
  });

  const { data: inscriptions, isLoading: loadingInscriptions } = useQuery({
    queryKey: ["my-inscriptions"],
    queryFn: getMyInscriptions,
  });

  const isLoading = loadingSessions || loadingInscriptions;

  const pendingInscriptions = (inscriptions || []).filter((i) => i.statutPaiement === "en_attente");
  const refusedInscriptions = (inscriptions || []).filter((i) => i.statutPaiement === "refuse");

  return (
    <ProtectedRoute>
      <PageShell>
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="font-display text-4xl">Mes formations</h1>
          </div>
          <p className="mt-2 text-muted-foreground">
            Retrouvez toutes les sessions auxquelles vous êtes inscrit.
          </p>

          {pendingInscriptions.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-xl text-amber-600 dark:text-amber-400 mb-3">
                Inscriptions en attente de paiement
              </h2>
              <div className="space-y-3">
                {pendingInscriptions.map((ins) => {
                  const s = ins.session;
                  const d = new Date(s.dateDebut);
                  return (
                    <div
                      key={ins.id}
                      className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-6"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            <h3 className="font-display text-xl">
                              {s.formation?.titre || "Formation"}
                            </h3>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                              {d.toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </span>
                            {s.lieu && <span>📍 {s.lieu}</span>}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <Badge
                            variant="outline"
                            className="border-amber-400 text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50"
                          >
                            <Clock className="mr-1 h-3 w-3" />
                            Paiement en attente
                          </Badge>
                          <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                            {ins.montant} DT à payer en espèces
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {refusedInscriptions.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-xl text-red-600 dark:text-red-400 mb-3">
                Inscriptions refusées
              </h2>
              <div className="space-y-3">
                {refusedInscriptions.map((ins) => {
                  const s = ins.session;
                  const d = new Date(s.dateDebut);
                  return (
                    <div
                      key={ins.id}
                      className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-6"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-display text-xl">
                              {s.formation?.titre || "Formation"}
                            </h3>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4 text-red-600 dark:text-red-400" />
                              {d.toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </span>
                            {s.lieu && <span>📍 {s.lieu}</span>}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <Badge
                            variant="outline"
                            className="border-red-400 text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/50"
                          >
                            Refusé
                          </Badge>
                          <span className="text-sm font-semibold text-red-700 dark:text-red-300">
                            {ins.montant} DT
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="mt-12 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : sessions && sessions.length > 0 ? (
            <div className="mt-8 space-y-4">
              <h2 className="font-display text-xl">Inscriptions confirmées</h2>
              {sessions.map((s: any) => {
                const d = new Date(s.dateDebut);
                return <SessionCard key={s.id} session={s} />;
              })}
            </div>
          ) : (
            <div className="mt-12 rounded-xl border border-dashed border-border bg-card p-12 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">Vous n'êtes inscrit à aucune formation</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Parcourez le catalogue pour trouver une formation qui vous intéresse.
              </p>
              <Link
                to="/catalogue"
                className="mt-6 inline-flex items-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Parcourir le catalogue
              </Link>
            </div>
          )}
        </div>
      </PageShell>
    </ProtectedRoute>
  );
}

function SessionCard({ session }: { session: any }) {
  const [expanded, setExpanded] = useState(false);
  const [certExpanded, setCertExpanded] = useState(false);
  const d = new Date(session.dateDebut);
  const token = localStorage.getItem("access_token");

  const { data: documents } = useQuery({
    queryKey: ["session-documents", session.id],
    queryFn: () => getSessionDocuments(session.id),
    enabled: expanded,
  });

  const { data: allCerts } = useQuery({
    queryKey: ["my-certificates"],
    queryFn: getMyCertificates,
  });

  const sessionCerts = (allCerts || []).filter((c: Certificate) => c.session?.id === session.id);

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4">
          {session.formation?.imageUrl ? (
            <div className="hidden sm:block shrink-0 w-32 h-20 overflow-hidden rounded-lg">
              <img
                src={`${API_URL}${session.formation.imageUrl}`}
                alt={session.formation.titre}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="hidden sm:flex shrink-0 w-32 h-20 overflow-hidden rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 items-center justify-center">
              <span className="font-display text-2xl text-muted-foreground/20">
                {session.formation?.titre?.[0] || "F"}
              </span>
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl">{session.formation?.titre || "Formation"}</h2>
              <Badge className="bg-blue-600 text-white text-xs">Payé</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary" />
                {d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </span>
              {session.lieu && <span>📍 {session.lieu}</span>}
              {session.formateurs?.map((f: any) => (
                <span key={f.id}>
                  👤 {f.prenom} {f.nom}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {sessionCerts.length > 0 && !sessionCerts[0].certificatUrl ? null : (
            <>
              {sessionCerts.map((cert: Certificate) => (
                <a
                  key={cert.id}
                  href={getCertificateDownloadUrl(cert.id)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100"
                >
                  <Award className="h-4 w-4" />
                  Certificat
                </a>
              ))}
            </>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link to="/evaluation/$sessionId" params={{ sessionId: session.id }}>
              <Star className="h-4 w-4" /> Évaluer
            </Link>
          </Button>
          <Link
            to="/formations/$id"
            params={{ id: session.formation?.id }}
            className="flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Détails <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-4 flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <span className="flex items-center gap-2">
          <Paperclip className="h-4 w-4" /> Documents
        </span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {documents?.length === 0 && (
            <p className="text-center text-xs text-muted-foreground">
              Aucun document pour cette session
            </p>
          )}
          {documents?.map((doc: SessionDocument) => (
            <a
              key={doc.id}
              href={`${API_BASE}/sessions/${session.id}/documents/${doc.id}/download?token=${token}`}
              className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-secondary"
            >
              <FileText className="h-4 w-4 shrink-0 text-primary" />
              <span className="flex-1 truncate">{doc.originalName}</span>
              <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </a>
          ))}
        </div>
      )}

      {sessionCerts.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setCertExpanded(!certExpanded)}
            className="flex w-full items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 hover:bg-amber-100"
          >
            <span className="flex items-center gap-2">
              <Award className="h-4 w-4" /> Certificats
            </span>
            {certExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {certExpanded && (
            <div className="mt-2 space-y-2">
              {sessionCerts.map((cert: Certificate) => (
                <a
                  key={cert.id}
                  href={getCertificateDownloadUrl(cert.id)}
                  className="flex items-center gap-3 rounded-md border border-amber-200 bg-white px-3 py-2 text-sm hover:bg-amber-50"
                >
                  <Award className="h-4 w-4 shrink-0 text-amber-600" />
                  <span className="flex-1">Certificat — {cert.formation?.titre}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(cert.dateEmission).toLocaleDateString("fr-FR")}
                  </span>
                  <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
