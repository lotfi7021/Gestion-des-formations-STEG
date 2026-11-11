import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth-context";
import {
  Calendar,
  MapPin,
  Users,
  Star,
  Wallet,
  Target,
  ClipboardList,
  CircleHelp,
  ArrowLeft,
  CheckCircle2,
  Hourglass,
} from "lucide-react";
import { toast } from "sonner";
import { getFormation } from "@/lib/api/formations";
import { API_URL } from "@/lib/api/client";
import { enrollInSession } from "@/lib/api/sessions";
import { FormationAiAssistant } from "@/components/formation-ai-assistant";

export const Route = createFileRoute("/formations/$id")({
  component: FormationPage,
});

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function FormationPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [paymentDialog, setPaymentDialog] = useState<{ sessionId: string; montant: number } | null>(
    null,
  );

  const { data: formation, isLoading } = useQuery({
    queryKey: ["formation", id],
    queryFn: () => getFormation(id),
  });

  const enrollMutation = useMutation({
    mutationFn: (sessionId: string) => enrollInSession(sessionId),
    onSuccess: () => {
      toast.success("Inscription soumise !");
      queryClient.invalidateQueries({ queryKey: ["formation", id] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erreur lors de l'inscription");
    },
  });

  if (isLoading) {
    return (
      <ProtectedRoute>
        <PageShell>
          <div className="mx-auto max-w-7xl px-6 pt-12">
            <div className="skeleton h-5 w-32 rounded-lg" />
            <div className="mt-6 grid gap-10 lg:grid-cols-12">
              <div className="skeleton aspect-[16/10] rounded-2xl lg:col-span-7" />
              <div className="space-y-4 lg:col-span-5">
                <div className="skeleton h-4 w-28 rounded-lg" />
                <div className="skeleton h-12 w-full rounded-xl" />
                <div className="skeleton h-24 w-full rounded-xl" />
                <div className="skeleton h-20 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </PageShell>
      </ProtectedRoute>
    );
  }

  if (!formation) throw notFound();

  const sessions = formation.sessions || [];

  const handleEnroll = (sessionId: string, montant: number) => {
    if (!user) {
      navigate({ to: "/connexion" });
      return;
    }
    if (user.role !== "participant" && user.role !== "formateur") {
      toast.error("Seuls les participants et formateurs peuvent s'inscrire.");
      return;
    }
    setPaymentDialog({ sessionId, montant });
  };

  const confirmEnroll = () => {
    if (!paymentDialog) return;
    enrollMutation.mutate(paymentDialog.sessionId);
    setPaymentDialog(null);
  };

  const sections = [
    { title: "Description", body: formation.description, icon: ClipboardList },
    { title: "Objectifs", body: formation.objectifs, icon: Target },
    { title: "Prérequis", body: formation.prerequis, icon: CircleHelp },
    { title: "Programme", body: formation.programme, icon: ClipboardList },
  ].filter((sec) => sec.body);

  return (
    <ProtectedRoute>
      <PageShell>
        <section className="mx-auto max-w-7xl px-6 pt-12">
          <Link
            to="/catalogue"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Catalogue
          </Link>
          <div className="mt-6 grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7 animate-fade-up">
              <div className="card-sheen group relative aspect-[16/10] overflow-hidden rounded-2xl shadow-[var(--shadow-soft)]">
                {formation.imageUrl ? (
                  <img
                    src={`${API_URL}${formation.imageUrl}`}
                    alt={formation.titre}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-sky/25">
                    <span className="font-display text-6xl text-muted-foreground/20">
                      {formation.titre[0]}
                    </span>
                  </div>
                )}
                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  <Badge className="border-transparent bg-card/90 text-foreground backdrop-blur">
                    {formation.categorie || "Général"}
                  </Badge>
                  {formation.type && (
                    <Badge
                      variant="outline"
                      className="capitalize border-white/40 bg-black/20 text-white backdrop-blur"
                    >
                      {formation.type}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div
              className="lg:col-span-5 animate-fade-up"
              style={{ ["--anim-delay" as string]: "100ms" }}
            >
              <div className="text-xs uppercase tracking-widest text-primary">
                {formation.categorie || "Général"}
              </div>
              <h1 className="mt-3 font-display text-4xl text-gradient-brand md:text-5xl">
                {formation.titre}
              </h1>
              <p className="mt-4 leading-relaxed text-muted-foreground">{formation.description}</p>
              <div className="mt-8 grid grid-cols-3 gap-3">
                {[
                  {
                    label: "Niveau",
                    value: formation.type
                      ? String(formation.type).charAt(0).toUpperCase() +
                        String(formation.type).slice(1)
                      : "—",
                  },
                  {
                    label: "Durée",
                    value: `${formation.dureeEnJours} jour${formation.dureeEnJours > 1 ? "s" : ""}`,
                  },
                  {
                    label: "Tarif",
                    value: formation.tarif ? `${formation.tarif} DT` : "Sur devis",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-border bg-card p-3 text-center shadow-[var(--shadow-soft)] transition-colors hover:border-primary/30"
                  >
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {item.label}
                    </div>
                    <div className="mt-1 text-sm font-semibold">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {sections.length > 0 && (
          <section className="mx-auto mt-16 max-w-7xl px-6">
            <div className="grid gap-6 md:grid-cols-2">
              {sections.map((sec, i) => (
                <div
                  key={sec.title}
                  style={{ ["--anim-delay" as string]: `${i * 60}ms` }}
                  className="card-sheen animate-fade-up rounded-2xl p-6 shadow-[var(--shadow-soft)]"
                >
                  <h3 className="flex items-center gap-2 font-display text-xl">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                      <sec.icon className="h-4 w-4" />
                    </span>
                    {sec.title}
                  </h3>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                    {sec.body}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-3xl">Prochaines sessions</h2>
            <span className="rounded-full bg-secondary/60 px-3 py-1 text-xs font-medium text-muted-foreground">
              {sessions.length} session{sessions.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="mt-8 space-y-4">
            {sessions.length === 0 && (
              <div className="paper-grain rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
                Aucune session programmée pour l'instant.
              </div>
            )}
            {sessions.map((s, idx) => {
              const formateur = s.formateurs?.[0];
              const enrolled = s.participants?.some((p: { id: string }) => p.id === user?.id);
              const count = s.participants?.length || 0;
              const maxCap = s.capaciteMax || formation.capaciteMax;
              const full = maxCap ? count >= maxCap : false;
              const d = new Date(s.dateDebut);
              const months = [
                "JAN",
                "FÉV",
                "MAR",
                "AVR",
                "MAI",
                "JUI",
                "JUL",
                "AOÛ",
                "SEP",
                "OCT",
                "NOV",
                "DÉC",
              ];
              return (
                <div
                  key={s.id}
                  style={{ ["--anim-delay" as string]: `${idx * 60}ms` }}
                  className="group flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-lift)] animate-fade-up sm:flex-row sm:items-center"
                >
                  <div className="hidden shrink-0 overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-3 text-center sm:block">
                    <div className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {months[d.getMonth()]}
                    </div>
                    <div className="font-display text-3xl leading-tight text-primary">
                      {d.getDate()}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-primary">
                          <Calendar className="h-3.5 w-3.5" />
                        </span>
                        {fmtDate(s.dateDebut)} — {fmtDate(s.dateFin)}
                      </span>
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-primary">
                          <MapPin className="h-3.5 w-3.5" />
                        </span>
                        {s.lieu || "Distanciel"}
                      </span>
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-primary">
                          <Users className="h-3.5 w-3.5" />
                        </span>
                        {count}
                        {maxCap ? `/${maxCap}` : ""} inscrit{count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="mt-2 text-sm">
                      {formateur ? (
                        <span className="text-muted-foreground">
                          Avec{" "}
                          <span className="font-medium text-foreground">
                            {formateur.prenom} {formateur.nom}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60 italic">Formateur à définir</span>
                      )}
                    </div>
                    {maxCap ? (
                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div
                            className={`h-full rounded-full transition-all ${full ? "bg-destructive" : "bg-gradient-to-r from-primary to-sky"}`}
                            style={{
                              width: `${Math.min(100, Math.round((count / maxCap) * 100))}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {Math.round((count / maxCap) * 100)}%
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="shrink-0">
                    {enrolled ? (
                      <div className="flex items-center gap-2">
                        <Badge className="rounded-full border-primary/20 bg-primary/10 text-primary">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Inscrit
                        </Badge>
                        <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" asChild>
                          <Link to="/evaluation/$sessionId" params={{ sessionId: s.id }}>
                            <Star className="h-4 w-4" /> Évaluer
                          </Link>
                        </Button>
                      </div>
                    ) : full ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        className="rounded-xl bg-transparent"
                      >
                        Complet
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="rounded-xl shadow-[var(--shadow-soft)] transition-all hover:shadow-[var(--shadow-glow)]"
                        disabled={enrollMutation.isPending}
                        onClick={() => handleEnroll(s.id, formation.tarif || 0)}
                      >
                        {enrollMutation.isPending ? "..." : "S'inscrire"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Assistant IA — visible uniquement pour les participants inscrits */}
        {user?.role === "participant" &&
          sessions.some((s) => s.participants?.some((p: { id: string }) => p.id === user?.id)) && (
            <section className="mx-auto max-w-7xl px-6 pb-16">
              <FormationAiAssistant formationId={id} formationTitre={formation.titre} />
            </section>
          )}

        <Dialog open={paymentDialog !== null} onOpenChange={() => setPaymentDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display text-2xl">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Wallet className="h-5 w-5" />
                </span>
                Paiement requis
              </DialogTitle>
              <DialogDescription className="space-y-3 pt-3">
                <p>
                  Votre inscription a été prise en compte. Pour finaliser votre inscription, vous
                  devez effectuer le paiement en <strong>espèces</strong>.
                </p>
                <div className="overflow-hidden rounded-xl border border-primary/20">
                  <div className="bg-gradient-to-r from-primary to-sky px-4 py-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground">
                      <Hourglass className="h-3.5 w-3.5" /> Récapitulatif
                    </span>
                  </div>
                  <div className="space-y-2 bg-card p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Montant à payer</span>
                      <span className="text-lg font-bold text-primary">
                        {paymentDialog?.montant || 0} DT
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Mode de paiement</span>
                      <span className="font-medium">Espèces</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Une fois le paiement effectué, l'administration validera votre inscription. Vous
                  recevrez une notification de confirmation.
                </p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentDialog(null)}>
                Annuler
              </Button>
              <Button
                className="shadow-[var(--shadow-soft)] transition-all hover:shadow-[var(--shadow-glow)]"
                onClick={confirmEnroll}
                disabled={enrollMutation.isPending}
              >
                {enrollMutation.isPending ? "..." : "Confirmer l'inscription"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageShell>
    </ProtectedRoute>
  );
}
