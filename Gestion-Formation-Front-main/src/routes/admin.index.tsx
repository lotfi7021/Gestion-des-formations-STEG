import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BookOpen,
  Calendar,
  GraduationCap,
  TrendingUp,
  Users,
  Loader2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin-shell";
import { getFormations } from "@/lib/api/formations";
import { getSessions } from "@/lib/api/sessions";
import { getEmployes } from "@/lib/api/employes";
import { getFormateurs } from "@/lib/api/formateurs";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: formations } = useQuery({ queryKey: ["formations"], queryFn: getFormations });
  const { data: sessions } = useQuery({ queryKey: ["sessions"], queryFn: getSessions });
  const { data: employes } = useQuery({ queryKey: ["employes"], queryFn: getEmployes });
  const { data: formateurs } = useQuery({ queryKey: ["formateurs"], queryFn: getFormateurs });

  const sessionsCeMois =
    sessions?.filter((s) => {
      const d = new Date(s.dateDebut);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length || 0;

  const kpis = [
    {
      label: "Sessions ce mois",
      value: String(sessionsCeMois),
      delta: "—",
      icon: Calendar,
      tone: "primary" as const,
    },
    {
      label: "Participants actifs",
      value: String(employes?.length || 0),
      delta: "—",
      icon: Users,
      tone: "ochre" as const,
    },
    {
      label: "Formations au catalogue",
      value: String(formations?.length || 0),
      delta: "—",
      icon: BookOpen,
      tone: "primary" as const,
    },
    {
      label: "Taux de satisfaction",
      value: "98%",
      delta: "—",
      icon: TrendingUp,
      tone: "ochre" as const,
    },
  ];

  return (
    <AdminShell
      title="Bonjour Sarah."
      subtitle="Bienvenue sur votre tableau de bord. Retrouvez en un coup d'œil l'activité de votre plateforme."
      actions={
        <>
          <button className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-secondary">
            Exporter
          </button>
          <Link
            to="/admin/sessions"
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            + Nouvelle session
          </Link>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span
                className={
                  "grid h-9 w-9 place-items-center rounded-md " +
                  (k.tone === "primary"
                    ? "bg-primary/10 text-primary"
                    : "bg-ochre/20 text-ochre-foreground")
                }
              >
                <k.icon className="h-4 w-4" />
              </span>
              <span className="text-xs font-medium text-primary">{k.delta}</span>
            </div>
            <p className="mt-4 font-display text-3xl">{k.value}</p>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Chart card */}
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl">Sessions par mois</h2>
              <p className="text-sm text-muted-foreground">Volume des sessions réalisées en 2026</p>
            </div>
            <div className="flex gap-2 text-xs">
              <button className="rounded-md bg-secondary px-3 py-1">12 mois</button>
              <button className="rounded-md px-3 py-1 text-muted-foreground hover:bg-secondary">
                6 mois
              </button>
              <button className="rounded-md px-3 py-1 text-muted-foreground hover:bg-secondary">
                30j
              </button>
            </div>
          </div>
          <div className="mt-6 flex h-56 items-end gap-3">
            {[35, 48, 42, 60, 55, 72, 68, 80, 65, 78, 88, 95].map((v, i) => (
              <div key={i} className="group flex flex-1 flex-col items-center gap-2">
                <div
                  className="relative w-full overflow-hidden rounded-md bg-secondary"
                  style={{ height: `${v * 1.8}px` }}
                >
                  <div className="absolute inset-x-0 bottom-0 h-full rounded-md bg-gradient-to-t from-primary to-primary/60 transition-all group-hover:opacity-80" />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-2xl">Activité récente</h2>
          <ul className="mt-5 space-y-4">
            <li className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                CV
              </div>
              <div className="min-w-0">
                <p className="text-sm">
                  <strong>Plateforme active</strong>{" "}
                  <span className="text-muted-foreground">— connectée</span>
                </p>
                <p className="text-xs text-muted-foreground">à l'instant</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Upcoming sessions */}
      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl">Prochaines sessions</h2>
            <p className="text-sm text-muted-foreground">
              Les sessions planifiées dans les 30 prochains jours.
            </p>
          </div>
          <Link
            to="/admin/sessions"
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

      <div className="mt-8 flex items-center gap-3 rounded-xl border border-border bg-card p-5">
        <GraduationCap className="h-5 w-5 text-primary" />
        <p className="text-sm text-muted-foreground">
          Astuce — Utilisez{" "}
          <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px]">
            ⌘K
          </kbd>{" "}
          pour ouvrir la recherche globale.
        </p>
      </div>
    </AdminShell>
  );
}
