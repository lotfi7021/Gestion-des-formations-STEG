import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Calendar,
  ArrowRight,
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
  MapPin,
  User,
  Sparkles,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/protected-route";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { API_URL, API_BASE } from "@/lib/api/client";
import type { Session } from "@/lib/api/sessions";
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
  const confirmedCount = sessions?.length ?? 0;
  const totalCount = confirmedCount + pendingInscriptions.length + refusedInscriptions.length;

  return (
    <ProtectedRoute>
      <PageShell>
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4 animate-fade-up">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                <BookOpen className="h-3 w-3" /> Mon parcours
              </span>
              <h1 className="mt-3 font-display text-5xl text-gradient-brand">Mes formations</h1>
              <p className="mt-2 text-muted-foreground">
                Retrouvez toutes les sessions auxquelles vous êtes inscrit.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-border bg-card px-4 py-2.5 text-center shadow-[var(--shadow-soft)]">
                <div className="font-display text-2xl leading-none text-primary">
                  {confirmedCount}
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  Confirmées
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card px-4 py-2.5 text-center shadow-[var(--shadow-soft)]">
                <div className="font-display text-2xl leading-none">{totalCount}</div>
                <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  Total
                </div>
              </div>
              {!isFormateur && (
                <Link
                  to="/participant/calendrier"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm font-medium text-primary transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-[var(--shadow-glow)]"
                >
                  Calendrier <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>

          {pendingInscriptions.length > 0 && (
            <div className="mt-10 animate-fade-up">
              <h2 className="mb-3 flex items-center gap-2 font-display text-xl text-amber-600 dark:text-amber-400">
                <Wallet className="h-4 w-4" /> Inscriptions en attente de paiement
              </h2>
              <div className="space-y-3">
                {pendingInscriptions.map((ins) => {
                  const s = ins.session;
                  const d = new Date(s.dateDebut);
                  return (
                    <div
                      key={ins.id}
                      className="overflow-hidden rounded-2xl border border-amber-200/80 bg-amber-50/70 p-6 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] dark:border-amber-800/60 dark:bg-amber-950/30"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/60 dark:text-amber-400">
                              <Wallet className="h-4 w-4" />
                            </span>
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
                            {s.lieu && (
                              <span className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                {s.lieu}
                              </span>
                            )}
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
            <div className="mt-10 animate-fade-up">
              <h2 className="mb-3 flex items-center gap-2 font-display text-xl text-red-600 dark:text-red-400">
                <XCircle className="h-4 w-4" /> Inscriptions refusées
              </h2>
              <div className="space-y-3">
                {refusedInscriptions.map((ins) => {
                  const s = ins.session;
                  const d = new Date(s.dateDebut);
                  return (
                    <div
                      key={ins.id}
                      className="overflow-hidden rounded-2xl border border-red-200/80 bg-red-50/70 p-6 shadow-[var(--shadow-soft)] opacity-90 transition-all hover:opacity-100 dark:border-red-800/60 dark:bg-red-950/30"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/60 dark:text-red-400">
                              <XCircle className="h-4 w-4" />
                            </span>
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
                            {s.lieu && (
                              <span className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4 text-red-600 dark:text-red-400" />
                                {s.lieu}
                              </span>
                            )}
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
            <div className="mt-12 space-y-4">
              <div className="skeleton h-8 w-52 rounded-xl" />
              <div className="skeleton h-40 rounded-2xl" />
              <div className="skeleton h-40 rounded-2xl" />
            </div>
          ) : sessions && sessions.length > 0 ? (
            <div className="mt-10 space-y-4 animate-fade-up">
              <h2 className="flex items-center gap-2 font-display text-xl">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Inscriptions confirmées
              </h2>
              {sessions.map((s: Session) => (
                <SessionCard key={s.id} session={s} />
              ))}
            </div>
          ) : (
            <div className="paper-grain mt-12 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-secondary">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mt-4 font-display text-2xl">Aucune formation pour le moment</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Parcourez le catalogue pour trouver une formation qui vous intéresse.
              </p>
              <Link
                to="/catalogue"
                className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:bg-primary/90 hover:shadow-[var(--shadow-lift)]"
              >
                Parcourir le catalogue <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </PageShell>
    </ProtectedRoute>
  );
}

function SessionCard({ session }: { session: Session }) {
  const [expanded, setExpanded] = useState(false);
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

  // Un seul certificat par session (garanti côté backend, on prend le premier).
  const cert = (allCerts || []).find((c: Certificate) => c.session?.id === session.id);

  return (
    <div className="card-sheen group overflow-hidden rounded-2xl p-6 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4">
          {session.formation?.imageUrl ? (
            <div className="hidden h-20 w-32 shrink-0 overflow-hidden rounded-xl sm:block">
              <img
                src={`${API_URL}${session.formation.imageUrl}`}
                alt={session.formation.titre}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          ) : (
            <div className="hidden h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-sky/20 sm:flex">
              <span className="font-display text-2xl text-muted-foreground/20">
                {session.formation?.titre?.[0] || "F"}
              </span>
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl transition-colors group-hover:text-primary">
                {session.formation?.titre || "Formation"}
              </h2>
              <Badge className="border-primary/20 bg-primary/10 text-primary">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Payé
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-primary">
                  <Calendar className="h-3.5 w-3.5" />
                </span>
                {d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </span>
              {session.lieu && (
                <span className="flex items-center gap-1.5">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-primary">
                    <MapPin className="h-3.5 w-3.5" />
                  </span>
                  {session.lieu}
                </span>
              )}
              {session.formateurs?.map((f) => (
                <span key={f.id} className="flex items-center gap-1.5">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-primary">
                    <User className="h-3.5 w-3.5" />
                  </span>
                  {f.prenom} {f.nom}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {cert?.certificatUrl && (
            <a
              href={getCertificateDownloadUrl(cert.id)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50"
            >
              <Award className="h-4 w-4" />
              Certificat
            </a>
          )}
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" asChild>
            <Link to="/evaluation/$sessionId" params={{ sessionId: session.id }}>
              <Star className="h-4 w-4" /> Évaluer
            </Link>
          </Button>
          <Link
            to="/formations/$id"
            params={{ id: session.formation?.id }}
            className="inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition-all hover:bg-primary/90 hover:shadow-[var(--shadow-glow)]"
          >
            Détails <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-4 flex w-full items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
      >
        <span className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-primary" /> Documents
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
              className="group/doc flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 text-sm transition-all hover:border-primary/30 hover:bg-primary/5"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-4 w-4" />
              </span>
              <span className="flex-1 truncate group-hover/doc:text-primary">
                {doc.originalName}
              </span>
              <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover/doc:text-primary" />
            </a>
          ))}
        </div>
      )}

      {cert && (
        <div className="mt-3 overflow-hidden rounded-xl border border-amber-200/80 dark:border-amber-800/60">
          <div className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-amber-100/60 px-4 py-2.5 text-sm dark:from-amber-950/40 dark:to-amber-900/30">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/60 dark:text-amber-400">
              <Award className="h-4 w-4" />
            </span>
            <span className="flex-1 truncate">
              Certificat — {cert.formation?.titre}
              {cert.numeroCertificat && (
                <span className="ml-2 text-xs text-muted-foreground">
                  N° {cert.numeroCertificat}
                </span>
              )}
            </span>
            <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
              Émis le {new Date(cert.dateEmission).toLocaleDateString("fr-FR")}
            </span>
            <a
              href={getCertificateDownloadUrl(cert.id)}
              className="shrink-0 rounded-lg border border-amber-300 bg-card px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/50"
            >
              Télécharger
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
