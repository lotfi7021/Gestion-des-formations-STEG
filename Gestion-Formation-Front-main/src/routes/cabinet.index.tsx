import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BookOpen,
  Calendar,
  GraduationCap,
  TrendingUp,
  Users,
  Loader2,
  CheckCircle2,
  Info,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CabinetShell } from "@/components/cabinet-shell";
import { getFormations } from "@/lib/api/formations";
import { getSessions } from "@/lib/api/sessions";
import { getFormateurs } from "@/lib/api/formateurs";
import { getEvaluations } from "@/lib/api/evaluations";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/cabinet/")({
  component: CabinetDashboard,
});

function KpiCard({ label, value, icon: Icon, tone, detail }: {
  label: string;
  value: string;
  icon: any;
  tone: "primary" | "ochre";
  detail?: { title: string; rows: { label: string; value: string | number }[] };
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between">
          <span
            className={
              "grid h-9 w-9 place-items-center rounded-md " +
              (tone === "primary"
                ? "bg-primary/10 text-primary"
                : "bg-ochre/20 text-ochre-foreground")
            }
          >
            <Icon className="h-4 w-4" />
          </span>
          {detail && (
            <button
              onClick={() => setOpen(true)}
              className="rounded-md p-1 text-muted-foreground/40 transition-colors hover:bg-secondary hover:text-foreground"
              title="Voir le détail"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className="mt-4 font-display text-3xl">{value}</p>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      {detail && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{detail.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {detail.rows.map((row, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-2.5 text-sm"
                >
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-medium tabular-nums text-foreground">{row.value}</span>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function CabinetDashboard() {
  const { data: formations } = useQuery({
    queryKey: ["cabinet-formations"],
    queryFn: getFormations,
  });
  const { data: sessions } = useQuery({ queryKey: ["cabinet-sessions"], queryFn: getSessions });
  const { data: formateurs } = useQuery({
    queryKey: ["cabinet-formateurs"],
    queryFn: getFormateurs,
  });
  const { data: evaluations } = useQuery({
    queryKey: ["cabinet-evaluations"],
    queryFn: () => getEvaluations(),
  });

  const sessionsCeMois =
    sessions?.filter((s) => {
      const d = new Date(s.dateDebut);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length || 0;

  const sessionsTerminees = sessions?.filter((s) => s.isCompleted).length || 0;

  const tauxSatisfaction = (() => {
    if (!evaluations?.length) return null;
    const nbNotesSup4 = evaluations.filter(
      (e: any) => (e.noteSatisfactionGlobale ?? e.note ?? 0) >= 4,
    ).length;
    return Math.round((nbNotesSup4 / evaluations.length) * 100);
  })();

  const totalSessions = sessions?.length || 0;

  return (
    <CabinetShell
      title="Tableau de bord"
      subtitle="Gérez vos formations, sessions et formateurs."
      actions={
        <>
          <Link
            to="/cabinet/sessions"
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            + Nouvelle session
          </Link>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Sessions ce mois"
          value={String(sessionsCeMois)}
          icon={Calendar}
          tone="primary"
          detail={{
            title: "Sessions ce mois",
            rows: [
              { label: "Sessions ce mois", value: sessionsCeMois },
              { label: "Total sessions", value: totalSessions },
            ],
          }}
        />
        <KpiCard
          label="Formateurs"
          value={String(formateurs?.length || 0)}
          icon={GraduationCap}
          tone="ochre"
          detail={{
            title: "Formateurs",
            rows: [
              { label: "Nombre de formateurs", value: formateurs?.length || 0 },
            ],
          }}
        />
        <KpiCard
          label="Formations au catalogue"
          value={String(formations?.length || 0)}
          icon={BookOpen}
          tone="primary"
          detail={{
            title: "Formations au catalogue",
            rows: [
              { label: "Nombre de formations", value: formations?.length || 0 },
            ],
          }}
        />
        <KpiCard
          label="Sessions terminées"
          value={String(sessionsTerminees)}
          icon={CheckCircle2}
          tone="ochre"
          detail={{
            title: "Sessions terminées",
            rows: [
              { label: "Terminées", value: sessionsTerminees },
              { label: "Total sessions", value: totalSessions },
            ],
          }}
        />
        <KpiCard
          label="Taux de satisfaction"
          value={tauxSatisfaction !== null ? `${tauxSatisfaction}%` : "—"}
          icon={TrendingUp}
          tone="primary"
          detail={tauxSatisfaction !== null ? {
            title: "Taux de satisfaction",
            rows: [
              { label: "Notes ≥ 4", value: evaluations?.filter((e: any) => (e.noteSatisfactionGlobale ?? e.note ?? 0) >= 4).length || 0 },
              { label: "Total évaluations", value: evaluations?.length || 0 },
              { label: "Formule", value: "(notes ≥ 4 / total) × 100" },
              { label: "Calcul", value: `(${evaluations?.filter((e: any) => (e.noteSatisfactionGlobale ?? e.note ?? 0) >= 4).length || 0} / ${evaluations?.length || 0}) × 100` },
              { label: "Résultat", value: `${tauxSatisfaction}%` },
            ],
          } : undefined}
        />
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl">Prochaines sessions</h2>
            <p className="text-sm text-muted-foreground">
              Les sessions planifiées dans les 30 prochains jours.
            </p>
          </div>
          <Link
            to="/cabinet/sessions"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            Tout voir <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mt-5 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Formation</th>
                <th className="px-4 py-3">Formateur</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Lieu</th>
                <th className="px-4 py-3">Inscrits</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {(!sessions || sessions.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    Aucune session planifiée
                  </td>
                </tr>
              )}
              {sessions?.slice(0, 5).map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{s.formation?.titre || "Formation"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.formateurs?.map((f: any) => `${f.prenom} ${f.nom}`).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(s.dateDebut).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.lieu || "—"}</td>
                  <td className="px-4 py-3">{s.participants?.length || 0}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-xs " +
                        (s.isCancelled
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary/10 text-primary")
                      }
                    >
                      {s.isCancelled ? "Annulée" : s.isCompleted ? "Terminée" : "Planifiée"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </CabinetShell>
  );
}
