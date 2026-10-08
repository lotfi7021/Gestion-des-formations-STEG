import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  FileText,
  AlertCircle,
} from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { PageShell } from "@/components/page-shell";
import { getMySessions, type Session } from "@/lib/api/sessions";
import { getFormation } from "@/lib/api/formations";
import { API_URL } from "@/lib/api/client";
import { DayPicker } from "react-day-picker";
import { fr } from "date-fns/locale";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/participant/calendrier")({
  component: () => (
    <ProtectedRoute requiredRole={["participant"]}>
      <ParticipantCalendrier />
    </ProtectedRoute>
  ),
});

function sessionStatus(s: Session) {
  if (s.isCancelled)
    return { label: "Annulée", cls: "bg-destructive/10 text-destructive border-destructive/20" };
  if (s.isCompleted)
    return { label: "Terminée", cls: "bg-muted text-muted-foreground border-border" };
  if (new Date(s.dateDebut) > new Date())
    return { label: "À venir", cls: "bg-primary/10 text-primary border-primary/20" };
  return { label: "Passée", cls: "bg-secondary text-secondary-foreground border-border" };
}

function ParticipantCalendrier() {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["my-sessions"],
    queryFn: () => getMySessions(),
  });

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const { data: selectedFormation } = useQuery({
    queryKey: ["formation", selectedSession?.formation?.id],
    queryFn: () => getFormation(selectedSession!.formation!.id),
    enabled: !!selectedSession?.formation?.id,
  });

  const sessionDays = useMemo(() => {
    if (!sessions) return [];
    const days = sessions.map((s: Session) => {
      const d = new Date(s.dateDebut);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    });
    return days;
  }, [sessions]);

  const sessionsForSelectedDate = useMemo(() => {
    if (!sessions || !selectedDate) return [];
    return sessions
      .filter((s: Session) => {
        const sd = new Date(s.dateDebut);
        return (
          sd.getFullYear() === selectedDate.getFullYear() &&
          sd.getMonth() === selectedDate.getMonth() &&
          sd.getDate() === selectedDate.getDate()
        );
      })
      .sort(
        (a: Session, b: Session) =>
          new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime(),
      );
  }, [sessions, selectedDate]);

  const upcomingSessions = useMemo(() => {
    if (!sessions) return [];
    const now = new Date();
    return sessions
      .filter((s: Session) => new Date(s.dateDebut) > now && !s.isCancelled)
      .sort(
        (a: Session, b: Session) =>
          new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime(),
      );
  }, [sessions]);

  const nextSession = upcomingSessions[0];
  const totalSessions = sessions?.length ?? 0;
  const upcomingCount = upcomingSessions.length;

  const modifiers = {
    hasSession: sessionDays,
  };

  const modifiersStyles = {
    hasSession: {
      fontWeight: "700",
      color: "var(--color-primary)",
      backgroundColor: "oklch(0.42 0.17 255 / 0.1)",
      borderRadius: "999px",
    },
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 animate-fade-up">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" /> Espace participant
            </span>
            <h1 className="mt-3 font-display text-5xl text-gradient-brand">Mon calendrier</h1>
            <p className="mt-2 text-muted-foreground">
              Visualisez vos sessions de formation sur un calendrier.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-border bg-card px-4 py-2.5 text-center shadow-[var(--shadow-soft)]">
              <div className="font-display text-2xl leading-none text-primary">{upcomingCount}</div>
              <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                À venir
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card px-4 py-2.5 text-center shadow-[var(--shadow-soft)]">
              <div className="font-display text-2xl leading-none">{totalSessions}</div>
              <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                Sessions
              </div>
            </div>
            <Link
              to="/mes-formations"
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm font-medium text-primary transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-[var(--shadow-glow)]"
            >
              Mes formations <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
            <div className="skeleton h-[420px] rounded-2xl" />
            <div className="space-y-4">
              <div className="skeleton h-10 w-2/3 rounded-xl" />
              <div className="skeleton h-32 rounded-xl" />
              <div className="skeleton h-32 rounded-xl" />
            </div>
          </div>
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
            <div className="animate-fade-up" style={{ ["--anim-delay" as string]: "80ms" }}>
              <div className="card-sheen rounded-2xl p-5 shadow-[var(--shadow-soft)]">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  locale={fr}
                  modifiers={modifiers}
                  modifiersStyles={modifiersStyles}
                  showOutsideDays={false}
                  className="w-full"
                  classNames={{
                    root: "w-full",
                    months: "flex flex-col",
                    month: "flex flex-col gap-2",
                    month_caption: "flex items-center justify-center py-1 font-display text-xl",
                    nav: "flex items-center justify-between mb-3",
                    button_previous:
                      "inline-flex items-center justify-center rounded-full border border-border bg-background p-2 text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:opacity-50",
                    button_next:
                      "inline-flex items-center justify-center rounded-full border border-border bg-background p-2 text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:opacity-50",
                    table: "w-full border-collapse",
                    weekdays: "flex",
                    weekday:
                      "flex-1 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2",
                    week: "flex",
                    day: "flex-1 text-center p-0.5",
                    day_button:
                      "inline-flex h-10 w-full items-center justify-center rounded-full text-sm transition-all hover:bg-accent aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:shadow-[var(--shadow-glow)] aria-selected:font-semibold",
                    today: "border border-primary/40 bg-accent/60 font-semibold text-primary",
                    outside: "text-muted-foreground opacity-40",
                    disabled: "text-muted-foreground opacity-40",
                    selected: "bg-primary text-primary-foreground font-semibold",
                  }}
                  components={{
                    Chevron: ({ orientation }) => {
                      if (orientation === "left") return <ChevronLeft className="h-4 w-4" />;
                      return <ChevronRight className="h-4 w-4" />;
                    },
                  }}
                />
              </div>

              {nextSession && (
                <div
                  className="mt-5 overflow-hidden rounded-2xl border border-primary/20 shadow-[var(--shadow-soft)] animate-fade-up"
                  style={{ ["--anim-delay" as string]: "160ms" }}
                >
                  <div className="bg-gradient-to-r from-primary to-sky px-5 py-2.5">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground">
                      <Sparkles className="h-3.5 w-3.5" /> Prochaine session
                    </p>
                  </div>
                  <div className="bg-card p-5">
                    <p className="font-display text-xl leading-tight">
                      {nextSession.formation?.titre}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        {format(new Date(nextSession.dateDebut), "d MMMM yyyy", { locale: fr })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        {nextSession.heureDebut ||
                          format(new Date(nextSession.dateDebut), "HH:mm")}{" "}
                        - {nextSession.heureFin || format(new Date(nextSession.dateFin), "HH:mm")}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedSession(nextSession)}
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      Voir les détails <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="animate-fade-up" style={{ ["--anim-delay" as string]: "120ms" }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-3xl">
                    {selectedDate
                      ? format(selectedDate, "d MMMM yyyy", { locale: fr })
                      : "Sélectionnez une date"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {sessionsForSelectedDate.length > 0
                      ? `${sessionsForSelectedDate.length} session${sessionsForSelectedDate.length > 1 ? "s" : ""} prévue${sessionsForSelectedDate.length > 1 ? "s" : ""}`
                      : "Aucune session ce jour"}
                  </p>
                </div>
                <div className="hidden rounded-full bg-secondary/60 p-1 sm:flex">
                  <span className="rounded-full bg-card px-3 py-1 text-xs font-medium shadow-sm">
                    {format(selectedDate ?? new Date(), "EEEE", { locale: fr })}
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {sessionsForSelectedDate.length === 0 && (
                  <div className="paper-grain flex flex-col items-center rounded-2xl border border-dashed border-border bg-card p-12 text-center">
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-secondary">
                      <Calendar className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <p className="mt-4 font-display text-lg">Journée libre</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Aucune session programmée à cette date
                    </p>
                  </div>
                )}

                {sessionsForSelectedDate.map((s: Session, idx: number) => {
                  const status = sessionStatus(s);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSession(s)}
                      style={{ ["--anim-delay" as string]: `${idx * 60}ms` }}
                      className="group w-full overflow-hidden rounded-2xl border border-border bg-card p-5 text-left shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-lift)] animate-fade-up"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium capitalize text-secondary-foreground">
                          {s.formation?.type || "Formation"}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${status.cls}`}
                        >
                          {status.label}
                        </span>
                      </div>
                      <h3 className="mt-3 font-display text-2xl leading-snug transition-colors group-hover:text-primary">
                        {s.formation?.titre || "Formation"}
                      </h3>
                      <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                        <span className="flex items-center gap-2">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                            <Clock className="h-3.5 w-3.5" />
                          </span>
                          {s.heureDebut || format(new Date(s.dateDebut), "HH:mm")} -{" "}
                          {s.heureFin || format(new Date(s.dateFin), "HH:mm")}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                            <MapPin className="h-3.5 w-3.5" />
                          </span>
                          {s.lieu || "Non défini"}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                            <Users className="h-3.5 w-3.5" />
                          </span>
                          {s.participants?.length || 0}
                          {s.capaciteMax ? ` / ${s.capaciteMax}` : ""} inscrit
                          {(s.participants?.length || 0) !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {s.capaciteMax ? (
                        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-sky transition-all"
                            style={{
                              width: `${Math.min(100, Math.round(((s.participants?.length || 0) / s.capaciteMax) * 100))}%`,
                            }}
                          />
                        </div>
                      ) : null}
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                        Voir les détails <ArrowUpRight className="h-3 w-3" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          {selectedSession &&
            (() => {
              const s = selectedSession;
              const f = selectedFormation || s.formation;
              const status = sessionStatus(s);
              return (
                <>
                  <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-sky">
                    {f?.imageUrl && (
                      <img
                        src={`${API_URL}${f.imageUrl}`}
                        alt={f.titre}
                        className="h-full w-full object-cover opacity-40"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
                    <div className="absolute bottom-4 left-6 right-6">
                      <div className="flex flex-wrap gap-2">
                        <Badge className="border-transparent bg-card/90 text-foreground backdrop-blur">
                          {f?.categorie || "Général"}
                        </Badge>
                        {f?.type && (
                          <Badge
                            variant="outline"
                            className="capitalize border-white/40 bg-black/10 text-white backdrop-blur"
                          >
                            {f.type}
                          </Badge>
                        )}
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium backdrop-blur ${status.cls}`}
                        >
                          {status.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 px-6 pb-6 pt-2">
                    <DialogHeader className="text-left">
                      <DialogTitle className="font-display text-3xl leading-tight">
                        {f?.titre || "Formation"}
                      </DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-3 gap-3">
                      {[
                        {
                          label: "Niveau",
                          value: f?.type
                            ? String(f.type).charAt(0).toUpperCase() + String(f.type).slice(1)
                            : "—",
                        },
                        {
                          label: "Durée",
                          value: f?.dureeEnJours
                            ? `${f.dureeEnJours} jour${f.dureeEnJours > 1 ? "s" : ""}`
                            : "—",
                        },
                        { label: "Tarif", value: f?.tarif ? `${f.tarif} DT` : "Sur devis" },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-xl border border-border bg-secondary/40 p-3 text-center"
                        >
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            {item.label}
                          </div>
                          <div className="mt-1 text-sm font-semibold">{item.value}</div>
                        </div>
                      ))}
                    </div>

                    {[
                      { title: "Description", body: f?.description },
                      { title: "Objectifs", body: f?.objectifs },
                      { title: "Prérequis", body: f?.prerequis },
                      { title: "Programme", body: f?.programme },
                    ]
                      .filter((sec) => sec.body)
                      .map((sec) => (
                        <div key={sec.title}>
                          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-primary">
                            {sec.title === "Description" ? (
                              <FileText className="h-3.5 w-3.5" />
                            ) : (
                              <AlertCircle className="h-3.5 w-3.5" />
                            )}
                            {sec.title}
                          </h4>
                          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                            {sec.body}
                          </p>
                        </div>
                      ))}

                    {(f?.supportsFormation?.length ?? 0) > 0 && (
                      <div>
                        <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-primary">
                          <FileText className="h-3.5 w-3.5" /> Fichiers de la formation
                        </h4>
                        <div className="space-y-1.5">
                          {f.supportsFormation!.map((file, i: number) => (
                            <a
                              key={i}
                              href={`${API_URL}${file.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 text-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
                            >
                              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                                <FileText className="h-4 w-4" />
                              </span>
                              <span className="truncate flex-1 group-hover:text-primary">
                                {file.nom}
                              </span>
                              <span className="text-xs uppercase text-muted-foreground">
                                {file.type}
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="overflow-hidden rounded-2xl border border-primary/20">
                      <div className="bg-gradient-to-r from-primary to-sky px-4 py-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-primary-foreground">
                          Détails de la session
                        </h4>
                      </div>
                      <div className="space-y-3 bg-card p-4 text-sm">
                        {[
                          {
                            icon: Calendar,
                            text: `${format(new Date(s.dateDebut), "d MMMM yyyy", { locale: fr })} — ${format(new Date(s.dateFin), "d MMMM yyyy", { locale: fr })}`,
                          },
                          {
                            icon: Clock,
                            text: `${s.heureDebut || format(new Date(s.dateDebut), "HH:mm")} — ${s.heureFin || format(new Date(s.dateFin), "HH:mm")}`,
                          },
                          { icon: MapPin, text: s.lieu || "Non défini" },
                          {
                            icon: Users,
                            text: `${s.participants?.length || 0} participant${s.participants?.length !== 1 ? "s" : ""}${s.capaciteMax ? ` / ${s.capaciteMax} max` : ""}`,
                          },
                        ].map(({ icon: Icon, text }) => (
                          <div key={text} className="flex items-center gap-3">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="text-muted-foreground">{text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
