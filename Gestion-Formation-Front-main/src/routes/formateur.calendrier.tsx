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
} from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { PageShell } from "@/components/page-shell";
import { getMySessions, type Session } from "@/lib/api/sessions";
import { getFormation } from "@/lib/api/formations";
import { API_URL } from "@/lib/api/client";
import { DayPicker, DayButton, type DayButtonProps } from "react-day-picker";
import { fr } from "date-fns/locale";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

/**
 * Palette de couleurs pour distinguer les sessions sur le calendrier :
 * chaque session reçoit une couleur différente (cycle sur la palette).
 */
const SESSION_COLORS = [
  { color: "#dc2626", bg: "rgba(220, 38, 38, 0.14)" }, // rouge
  { color: "#2563eb", bg: "rgba(37, 99, 235, 0.14)" }, // bleu
  { color: "#16a34a", bg: "rgba(22, 163, 74, 0.14)" }, // vert
  { color: "#ea580c", bg: "rgba(234, 88, 12, 0.14)" }, // orange
  { color: "#7c3aed", bg: "rgba(124, 58, 237, 0.14)" }, // violet
  { color: "#0d9488", bg: "rgba(13, 148, 136, 0.14)" }, // sarcelle
];

export const Route = createFileRoute("/formateur/calendrier")({
  component: () => (
    <ProtectedRoute requiredRole="formateur">
      <FormateurCalendrier />
    </ProtectedRoute>
  ),
});

function FormateurCalendrier() {
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

  /**
   * Map « clé jour (yyyy-mm-dd) » → couleur de la session qui couvre ce jour.
   * Utilisée par le DayButton custom pour colorer chaque jour.
   */
  const dayColorMap = useMemo(() => {
    const map = new Map<string, { color: string; bg: string }>();
    if (!sessions) return map;
    sessions.forEach((s: Session, idx: number) => {
      const c = SESSION_COLORS[idx % SESSION_COLORS.length];
      const start = new Date(s.dateDebut);
      const end = new Date(s.dateFin);
      const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      // Garde-fou : 60 jours max par session pour éviter une boucle infinie
      for (let i = 0; i < 60 && cur <= last; i++) {
        map.set(
          `${cur.getFullYear()}-${cur.getMonth()}-${cur.getDate()}`,
          { color: c.color, bg: c.bg },
        );
        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }, [sessions]);

  /**
   * Bouton de jour personnalisé : applique la couleur de la session
   * directement en style inline (fiable, contrairement à modifiersStyles
   * qui est écrasé par le CSS Tailwind de day_button).
   */
  const ColoredDayButton = useMemo(() => {
    const colorMap = dayColorMap;
    return function ColoredDayButton({ day, modifiers, ...props }: DayButtonProps) {
      const key = `${day.date.getFullYear()}-${day.date.getMonth()}-${day.date.getDate()}`;
      const c = colorMap.get(key);
      if (!c || modifiers.outside || modifiers.disabled) {
        return <DayButton day={day} modifiers={modifiers} {...props} />;
      }
      return (
        <DayButton
          day={day}
          modifiers={modifiers}
          {...props}
          style={{
            ...props.style,
            fontWeight: "700",
            color: c.color,
            backgroundColor: c.bg,
          }}
        />
      );
    };
  }, [dayColorMap]);

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-4xl">Mon calendrier</h1>
            <p className="mt-1 text-muted-foreground">
              Visualisez vos sessions formations sur un calendrier.
            </p>
          </div>
          <Link
            to="/formateur/dashboard"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Liste des sessions <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                locale={fr}
                showOutsideDays={false}
                className="rounded-xl border border-border bg-card p-4"
                classNames={{
                  root: "w-full",
                  months: "flex flex-col",
                  month: "flex flex-col gap-2",
                  month_caption: "flex items-center justify-center py-1 font-display text-lg",
                  nav: "flex items-center justify-between mb-2",
                  button_previous:
                    "inline-flex items-center justify-center rounded-md border border-border bg-background p-1.5 text-foreground hover:bg-secondary disabled:opacity-50",
                  button_next:
                    "inline-flex items-center justify-center rounded-md border border-border bg-background p-1.5 text-foreground hover:bg-secondary disabled:opacity-50",
                  table: "w-full border-collapse",
                  weekdays: "flex",
                  weekday: "flex-1 text-center text-xs font-medium text-muted-foreground py-2",
                  week: "flex",
                  day: "flex-1 text-center p-0",
                  day_button:
                    "inline-flex h-10 w-full items-center justify-center rounded-md text-sm hover:bg-secondary aria-selected:bg-primary aria-selected:text-primary-foreground",
                  today: "bg-accent text-accent-foreground font-semibold",
                  outside: "text-muted-foreground opacity-50",
                  disabled: "text-muted-foreground opacity-50",
                  selected: "bg-primary text-primary-foreground font-semibold",
                }}
                components={{
                  DayButton: ColoredDayButton,
                  Chevron: ({ orientation }) => {
                    if (orientation === "left") return <ChevronLeft className="h-4 w-4" />;
                    return <ChevronRight className="h-4 w-4" />;
                  },
                }}
              />

              {/* Légende : une couleur par session */}
              {sessions && sessions.length > 0 && (
                <div className="mt-2 space-y-1 px-1">
                  {sessions.slice(0, SESSION_COLORS.length).map((s: Session, idx: number) => (
                    <p
                      key={s.id}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: SESSION_COLORS[idx % SESSION_COLORS.length].color }}
                        aria-hidden
                      />
                      <span className="truncate">
                        {s.formation?.titre || "Session"} ·{" "}
                        {format(new Date(s.dateDebut), "d MMM yyyy", { locale: fr })}
                      </span>
                    </p>
                  ))}
                  {sessions.length > SESSION_COLORS.length && (
                    <p className="text-xs text-muted-foreground/70">
                      + {sessions.length - SESSION_COLORS.length} autre(s) session(s) — couleurs
                      répétées
                    </p>
                  )}
                </div>
              )}

              {nextSession && (
                <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs font-medium text-primary">Prochaine session</p>
                  <p className="mt-1 font-display text-lg leading-tight">
                    {nextSession.formation?.titre}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(nextSession.dateDebut), "d MMMM yyyy", { locale: fr })}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {nextSession.heureDebut ||
                      format(new Date(nextSession.dateDebut), "HH:mm")} -{" "}
                    {nextSession.heureFin || format(new Date(nextSession.dateFin), "HH:mm")}
                  </div>
                </div>
              )}
            </div>

            <div>
              <h2 className="font-display text-2xl">
                {selectedDate
                  ? format(selectedDate, "d MMMM yyyy", { locale: fr })
                  : "Sélectionnez une date"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {sessionsForSelectedDate.length > 0
                  ? `${sessionsForSelectedDate.length} session${sessionsForSelectedDate.length > 1 ? "s" : ""}`
                  : "Aucune session ce jour"}
              </p>

              <div className="mt-4 space-y-4">
                {sessionsForSelectedDate.length === 0 && (
                  <div className="flex flex-col items-center rounded-xl border border-border bg-card p-10 text-center">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 text-sm text-muted-foreground">
                      Aucune session programmée à cette date
                    </p>
                  </div>
                )}

                {sessionsForSelectedDate.map((s: Session) => {
                  const isUpcoming = new Date(s.dateDebut) > new Date();
                  const statusClass = s.isCancelled
                    ? "border-destructive/30 bg-destructive/5"
                    : s.isCompleted
                      ? "border-border bg-card"
                      : isUpcoming
                        ? "border-primary/20 bg-primary/5"
                        : "border-border bg-card";

                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSession(s)}
                      className={`w-full rounded-xl border p-5 text-left transition-colors hover:shadow-md ${statusClass}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          {s.formation?.type || "Formation"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {s.isCancelled
                            ? "Annulée"
                            : s.isCompleted
                              ? "Terminée"
                              : isUpcoming
                                ? "À venir"
                                : "Passée"}
                        </span>
                      </div>
                      <h3 className="mt-2 font-display text-xl">
                        {s.formation?.titre || "Formation"}
                      </h3>
                      <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {s.heureDebut || format(new Date(s.dateDebut), "HH:mm")} -{" "}
                          {s.heureFin || format(new Date(s.dateFin), "HH:mm")}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {s.lieu || "Non défini"}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {s.participants?.length || 0} participant
                          {s.participants?.length !== 1 ? "s" : ""}
                          {s.capaciteMax ? ` / ${s.capaciteMax}` : ""}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedSession &&
            (() => {
              const s = selectedSession;
              const f = selectedFormation || s.formation;
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                      {f?.imageUrl && (
                        <img
                          src={`${API_URL}${f.imageUrl}`}
                          alt={f.titre}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      )}
                      {f?.titre || "Formation"}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-6">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{f?.categorie || "Général"}</Badge>
                      <Badge variant="outline" className="capitalize">
                        {f?.type}
                      </Badge>
                    </div>

                    {f?.description && (
                      <div>
                        <h4 className="mb-1 text-sm font-medium text-muted-foreground">
                          Description
                        </h4>
                        <p className="text-sm">{f.description}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-4 rounded-xl border border-border p-4">
                      <div>
                        <div className="text-xs text-muted-foreground">Niveau</div>
                        <div className="mt-1 text-sm font-medium capitalize">{f?.type}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Durée</div>
                        <div className="mt-1 text-sm font-medium">
                          {f?.dureeEnJours
                            ? `${f.dureeEnJours} jour${f.dureeEnJours > 1 ? "s" : ""}`
                            : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Tarif</div>
                        <div className="mt-1 text-sm font-medium">
                          {f?.tarif ? `${f.tarif} DT` : "Sur devis"}
                        </div>
                      </div>
                    </div>

                    {f?.objectifs && (
                      <div>
                        <h4 className="mb-1 text-sm font-medium text-muted-foreground">
                          Objectifs
                        </h4>
                        <p className="text-sm whitespace-pre-line">{f.objectifs}</p>
                      </div>
                    )}

                    {f?.prerequis && (
                      <div>
                        <h4 className="mb-1 text-sm font-medium text-muted-foreground">
                          Prérequis
                        </h4>
                        <p className="text-sm whitespace-pre-line">{f.prerequis}</p>
                      </div>
                    )}

                    {f?.programme && (
                      <div>
                        <h4 className="mb-1 text-sm font-medium text-muted-foreground">
                          Programme
                        </h4>
                        <p className="text-sm whitespace-pre-line">{f.programme}</p>
                      </div>
                    )}

                    {(f?.supportsFormation?.length ?? 0) > 0 && (
                      <div>
                        <h4 className="mb-1 text-sm font-medium text-muted-foreground">
                          Fichiers de la formation
                        </h4>
                        <div className="space-y-1">
                          {f.supportsFormation!.map((file, i: number) => (
                            <a
                              key={i}
                              href={`${API_URL}${file.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                            >
                              <span className="truncate flex-1">{file.nom}</span>
                              <span className="text-xs uppercase text-muted-foreground">
                                {file.type}
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl border border-border bg-secondary/30 p-4">
                      <h4 className="mb-3 text-sm font-medium">Détails de la session</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4 shrink-0" />
                          <span>
                            {format(new Date(s.dateDebut), "d MMMM yyyy", { locale: fr })} —{" "}
                            {format(new Date(s.dateFin), "d MMMM yyyy", { locale: fr })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4 shrink-0" />
                          <span>
                            {s.heureDebut || format(new Date(s.dateDebut), "HH:mm")} —{" "}
                            {s.heureFin || format(new Date(s.dateFin), "HH:mm")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span>{s.lieu || "Non défini"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4 shrink-0" />
                          <span>
                            {s.participants?.length || 0} participant
                            {s.participants?.length !== 1 ? "s" : ""}
                            {s.capaciteMax ? ` / ${s.capaciteMax} max` : ""}
                          </span>
                        </div>
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
