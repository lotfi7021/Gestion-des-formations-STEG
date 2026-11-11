import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin-shell";
import { getEvaluations } from "@/lib/api/evaluations";
import { getFormations } from "@/lib/api/formations";
import { getFormateurs } from "@/lib/api/formateurs";
import {
  Star,
  Loader2,
  MessageSquareText,
  Filter,
  X,
  BookOpen,
  Monitor,
  UserCheck,
  ThumbsUp,
  FileText,
  Building,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/evaluations")({
  head: () => ({ meta: [{ title: "Évaluations — steg_form Admin" }] }),
  component: AdminEvaluationsPage,
});

const sectionLabels: Record<string, { label: string; icon: any }> = {
  noteObjectifClarte: { label: "Clarté des objectifs", icon: BookOpen },
  noteContenu: { label: "Contenu", icon: BookOpen },
  noteUtilite: { label: "Utilité pour le travail", icon: BookOpen },
  noteDureeRythme: { label: "Durée et rythme", icon: BookOpen },
  noteConfortSalle: { label: "Confort de la salle", icon: Monitor },
  noteEquipements: { label: "Équipements", icon: Monitor },
  noteSupports: { label: "Supports remis", icon: Monitor },
  noteMaitriseSujet: { label: "Maîtrise du sujet", icon: UserCheck },
  noteClarteExplications: { label: "Clarté des explications", icon: UserCheck },
  noteAnimation: { label: "Animation", icon: UserCheck },
  noteCapaciteReponse: { label: "Capacité à répondre", icon: UserCheck },
  noteSatisfactionGlobale: { label: "Satisfaction globale", icon: ThumbsUp },
};

const sectionGroups = [
  {
    key: "avis",
    title: "Avis sur la formation",
    icon: BookOpen,
    fields: ["noteObjectifClarte", "noteContenu", "noteUtilite", "noteDureeRythme"],
  },
  {
    key: "conditions",
    title: "Conditions matérielles",
    icon: Monitor,
    fields: ["noteConfortSalle", "noteEquipements", "noteSupports"],
  },
  {
    key: "formateur",
    title: "Évaluation du formateur",
    icon: UserCheck,
    fields: ["noteMaitriseSujet", "noteClarteExplications", "noteAnimation", "noteCapaciteReponse"],
  },
  {
    key: "global",
    title: "Appréciation globale",
    icon: ThumbsUp,
    fields: ["noteSatisfactionGlobale"],
  },
];

function StarRating({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${cls} ${
            s <= Math.round(value) ? "fill-ochre text-ochre" : "text-muted-foreground/15"
          }`}
        />
      ))}
    </div>
  );
}

function pct(val: number, total: number) {
  return total ? `${Math.round((val / total) * 100)}%` : "—";
}

function AdminEvaluationsPage() {
  const [formationFilter, setFormationFilter] = useState("");
  const [formateurFilter, setFormateurFilter] = useState("");
  const [selectedEval, setSelectedEval] = useState<any>(null);
  const { data: formations } = useQuery({ queryKey: ["formations"], queryFn: getFormations });
  const { data: formateurs } = useQuery({ queryKey: ["formateurs"], queryFn: getFormateurs });

  const { data: evaluations, isLoading } = useQuery({
    queryKey: ["evaluations", formationFilter, formateurFilter],
    queryFn: () =>
      getEvaluations({
        formationId: formationFilter || undefined,
        formateurId: formateurFilter || undefined,
      }),
  });

  const avg = (vals: (number | undefined | null)[]) => {
    const nums = vals.filter((v): v is number => v != null);
    return nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1) : "—";
  };

  const avgSection = (fields: string[]) => {
    if (!evaluations) return "—";
    const vals = evaluations.flatMap((e) => fields.map((f) => (e as any)[f]));
    return avg(vals);
  };

  const stats = useMemo(() => {
    if (!evaluations) return null;
    const total = evaluations.length;
    const n4 = evaluations.filter((e) => e.note >= 4).length;
    const recommends = evaluations.filter((e) => e.recommande).length;
    const hasAvis = evaluations.some((e) => e.noteObjectifClarte != null);
    return {
      total,
      successRate: pct(n4, total),
      recommendRate: pct(recommends, total),
      avgNote: avg(evaluations.map((e) => e.note)),
      avgAvis: hasAvis
        ? avgSection(["noteObjectifClarte", "noteContenu", "noteUtilite", "noteDureeRythme"])
        : "—",
      avgConditions: hasAvis
        ? avgSection(["noteConfortSalle", "noteEquipements", "noteSupports"])
        : "—",
      avgFormateur: hasAvis
        ? avgSection([
            "noteMaitriseSujet",
            "noteClarteExplications",
            "noteAnimation",
            "noteCapaciteReponse",
          ])
        : "—",
      avgCfpStir: avg(evaluations.map((e) => e.noteCfpStir)),
    };
  }, [evaluations]);

  const formationOpts = useMemo(() => {
    if (!formations || !evaluations) return [];
    const ids = new Set(evaluations.map((e) => e.session?.formation?.id).filter(Boolean));
    return formations.filter((f) => ids.has(f.id));
  }, [formations, evaluations]);

  const formateurOpts = useMemo(() => {
    if (!formateurs || !evaluations) return [];
    const ids = new Set(evaluations.map((e) => e.formateur?.id).filter(Boolean));
    return formateurs.filter((f) => ids.has(f.id));
  }, [formateurs, evaluations]);

  return (
    <AdminShell
      title="Évaluations"
      subtitle="Analysez les retours des participants : notes, commentaires et taux de satisfaction pour chaque formation."
    >
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" /> Filtrer par
            </div>
            <select
              value={formationFilter}
              onChange={(e) => setFormationFilter(e.target.value)}
              className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Toutes les formations</option>
              {formationOpts.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.titre}
                </option>
              ))}
            </select>
            <select
              value={formateurFilter}
              onChange={(e) => setFormateurFilter(e.target.value)}
              className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Tous les formateurs</option>
              {formateurOpts.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.prenom} {f.nom}
                </option>
              ))}
            </select>
            {(formationFilter || formateurFilter) && (
              <button
                onClick={() => {
                  setFormationFilter("");
                  setFormateurFilter("");
                }}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary"
              >
                <X className="h-3 w-3" /> Réinitialiser
              </button>
            )}
          </div>

          {stats && (
            <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md border-t-[3px] border-t-primary">
                <p className="text-[11px] uppercase tracking-widest text-primary">Évaluations</p>
                <p className="mt-0.5 font-display text-2xl">{stats.total}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md border-t-[3px] border-t-ochre">
                <p className="text-[11px] uppercase tracking-widest text-ochre">Taux de succès</p>
                <p className="mt-0.5 font-display text-2xl">{stats.successRate}</p>
                <p className="text-[10px] text-muted-foreground">Notes ≥ 4/5</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md border-t-[3px] border-t-accent">
                <p className="text-[11px] uppercase tracking-widest text-accent-foreground/70">
                  Recommandation
                </p>
                <p className="mt-0.5 font-display text-2xl">{stats.recommendRate}</p>
                <p className="text-[10px] text-muted-foreground">Recommandent cette formation</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md border-t-[3px] border-t-primary/50">
                <p className="text-[11px] uppercase tracking-widest text-primary/60">
                  Moy. générale
                </p>
                <p className="mt-0.5 font-display text-2xl">{stats.avgNote}</p>
                <p className="text-[10px] text-muted-foreground">/5</p>
              </div>
            </div>
          )}

          {stats && stats.avgAvis !== "—" && (
            <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    Avis formation
                  </p>
                </div>
                <p className="mt-0.5 font-display text-2xl">{stats.avgAvis}</p>
                <p className="text-[10px] text-muted-foreground">/4</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-primary" />
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    Conditions
                  </p>
                </div>
                <p className="mt-0.5 font-display text-2xl">{stats.avgConditions}</p>
                <p className="text-[10px] text-muted-foreground">/4</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    Formateur
                  </p>
                </div>
                <p className="mt-0.5 font-display text-2xl">{stats.avgFormateur}</p>
                <p className="text-[10px] text-muted-foreground">/4</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-primary" />
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    CFP STIR
                  </p>
                </div>
                <p className="mt-0.5 font-display text-2xl">{stats.avgCfpStir || "—"}</p>
                <p className="text-[10px] text-muted-foreground">/5</p>
              </div>
            </div>
          )}

          {!evaluations || evaluations.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-20 text-center text-muted-foreground">
              <MessageSquareText className="h-10 w-10" />
              <p className="text-lg font-medium">Aucune évaluation pour le moment</p>
              <p className="text-sm">Les évaluations des participants apparaîtront ici.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {evaluations.length} évaluation{evaluations.length > 1 ? "s" : ""}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {evaluations.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {e.participant?.prenom} {e.participant?.nom}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {e.session?.formation?.titre || "Formation inconnue"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StarRating value={e.note} size="md" />
                        <span className="font-display text-lg tabular-nums text-foreground">
                          {e.note}
                        </span>
                      </div>
                    </div>

                    {e.commentaire && (
                      <p className="mt-4 text-xs italic leading-relaxed text-muted-foreground/70 border-t border-border/50 pt-3">
                        "{e.commentaire}"
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-[11px] text-muted-foreground/50">
                      <span>{new Date(e.dateEvaluation).toLocaleDateString("fr-FR")}</span>
                      <div className="flex items-center gap-2">
                        {e.formateur?.prenom} {e.formateur?.nom}
                        {e.recommande && <span className="text-primary">· Recommandé</span>}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => setSelectedEval(e)}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Détail
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <Dialog open={!!selectedEval} onOpenChange={(o) => !o && setSelectedEval(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Détail de l'évaluation</DialogTitle>
          </DialogHeader>

          {selectedEval && (
            <div className="space-y-5">
              <div className="rounded-lg bg-secondary/50 p-4">
                <p className="font-medium">
                  {selectedEval.participant?.prenom} {selectedEval.participant?.nom}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedEval.session?.formation?.titre}
                </p>
                <p className="text-xs text-muted-foreground">
                  Formateur : {selectedEval.formateur?.prenom} {selectedEval.formateur?.nom}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(selectedEval.dateEvaluation).toLocaleDateString("fr-FR")}
                </p>
              </div>

              {sectionGroups.map((group) => {
                const values = group.fields
                  .map((f) => ({ key: f, value: (selectedEval as any)[f] }))
                  .filter((v) => v.value != null);
                if (values.length === 0) return null;
                return (
                  <div key={group.key}>
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                      <group.icon className="h-4 w-4 text-primary" />
                      {group.title}
                    </p>
                    <div className="space-y-1.5">
                      {values.map((v) => (
                        <div key={v.key} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {sectionLabels[v.key]?.label || v.key}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4].map((s) => (
                                <Star
                                  key={s}
                                  className={`h-3.5 w-3.5 ${
                                    s <= v.value
                                      ? "fill-ochre text-ochre"
                                      : "text-muted-foreground/15"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="w-4 text-right text-xs tabular-nums text-muted-foreground">
                              {v.value}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {selectedEval.noteCfpStir != null && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                    <Building className="h-4 w-4 text-primary" />
                    Appréciation CFP STIR
                  </p>
                  <StarRating value={selectedEval.noteCfpStir} size="md" />
                </div>
              )}

              {selectedEval.commentaire && (
                <div>
                  <p className="mb-1 text-sm font-medium">Commentaire</p>
                  <p className="rounded-lg bg-muted/30 p-3 text-sm italic leading-relaxed">
                    "{selectedEval.commentaire}"
                  </p>
                </div>
              )}

              {selectedEval.pointsForts && (
                <div>
                  <p className="mb-1 text-sm font-medium">Points forts</p>
                  <p className="rounded-lg bg-muted/30 p-3 text-sm leading-relaxed">
                    {selectedEval.pointsForts}
                  </p>
                </div>
              )}

              {selectedEval.pointsAmeliorer && (
                <div>
                  <p className="mb-1 text-sm font-medium">Points à améliorer</p>
                  <p className="rounded-lg bg-muted/30 p-3 text-sm leading-relaxed">
                    {selectedEval.pointsAmeliorer}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
