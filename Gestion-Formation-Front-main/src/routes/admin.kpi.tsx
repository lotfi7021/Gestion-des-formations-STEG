import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin-shell";
import { getEvaluations } from "@/lib/api/evaluations";
import { getSessions } from "@/lib/api/sessions";
import { getFormations } from "@/lib/api/formations";
import { useState } from "react";
import * as XLSX from "xlsx";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Monitor,
  UserCheck,
  ThumbsUp,
  Users,
  Target,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BarChart3,
  FileDown,
  Info,
  CalendarDays,
  GraduationCap,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/kpi")({
  head: () => ({ meta: [{ title: "KPI Formations — steg_form Admin" }] }),
  component: AdminKPIPage,
});

const SEMESTER_MONTHS = { S1: [0, 1, 2, 3, 4, 5], S2: [6, 7, 8, 9, 10, 11] };

function getSemester(date: Date) {
  return date.getMonth() < 6 ? "S1" : "S2";
}

const cabineFields = [
  "noteObjectifClarte",
  "noteContenu",
  "noteUtilite",
  "noteDureeRythme",
  "noteConfortSalle",
  "noteEquipements",
  "noteSupports",
] as const;

const cabinetFieldFallbacks: Record<string, string[]> = {
  noteObjectifClarte: [],
  noteContenu: [],
  noteUtilite: [],
  noteDureeRythme: [],
  noteConfortSalle: [],
  noteEquipements: [],
  noteSupports: [],
};

const formateurFields = [
  "noteMaitriseSujet",
  "noteClarteExplications",
  "noteAnimation",
  "noteCapaciteReponse",
] as const;

const formateurFieldFallbacks: Record<string, string[]> = {
  noteMaitriseSujet: ["notePedagogie"],
  noteClarteExplications: [],
  noteAnimation: [],
  noteCapaciteReponse: [],
};

function getFieldValue(e: any, field: string, fallbacks: Record<string, string[]>): number | null {
  if (e[field] != null && !isNaN(Number(e[field]))) return Number(e[field]);
  for (const fb of fallbacks[field] ?? []) {
    if (e[fb] != null && !isNaN(Number(e[fb]))) return Number(e[fb]);
  }
  return null;
}

function avg(vals: (number | undefined | null)[]) {
  const nums = vals.filter((v): v is number => v != null && !isNaN(v));
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function toPct(val: number, max: number) {
  if (max == null || max === 0 || isNaN(val) || isNaN(max)) return 0;
  return Math.round((val / max) * 100);
}

function safeNum(v: any, fallback = 0) {
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}

function statusColor(value: number, thresholds: { pass: number; warn: number }) {
  const v = safeNum(value);
  if (v >= thresholds.pass) return "text-emerald-600 dark:text-emerald-400";
  if (v >= thresholds.warn) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function statusBadge(value: number, thresholds: { pass: number; warn: number }) {
  const v = safeNum(value);
  if (v >= thresholds.pass)
    return {
      label: "Atteint",
      class: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    };
  if (value >= thresholds.warn)
    return {
      label: "À améliorer",
      class: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    };
  return {
    label: "Non atteint",
    class: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  };
}

function interpretationLabel(value: number, type: "formateur" | "cabinet" | "formation") {
  const pct = safeNum(value);
  if (pct >= 70) {
    if (type === "formateur") return "Retenu";
    if (type === "cabinet") return "Performant";
    return "Réussie";
  }
  if (pct >= 40) return "À améliorer";
  if (type === "formateur") return "Non retenu (exclusion 3 ans)";
  if (type === "cabinet") return "Non retenu (exclusion consultations)";
  return "Non réussie (révision complète)";
}

function interpretationColor(value: number) {
  const v = safeNum(value);
  if (v >= 70) return "text-emerald-600 dark:text-emerald-400";
  if (v >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function KpiCard({
  title,
  value,
  unit = "%",
  target,
  icon: Icon,
  subtitle,
  formulaRows,
  detailTitle,
}: {
  title: string;
  value: number | string;
  unit?: string;
  target: number;
  icon: any;
  subtitle?: string;
  formulaRows?: { label: string; value: string | number }[];
  detailTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const numVal = typeof value === "number" ? value : parseFloat(value);
  const isValid = typeof numVal === "number" && !isNaN(numVal);
  const stat = isValid ? statusBadge(numVal, { pass: target, warn: target * 0.6 }) : null;
  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{title}</p>
            <p className="mt-1 font-display text-3xl tabular-nums">
              {isValid ? `${numVal}${unit}` : "—"}
            </p>
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <Icon className="h-5 w-5 shrink-0 text-muted-foreground/40" />
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-xs">
          <span className="text-muted-foreground">
            Cible: {target}
            {unit}
          </span>
          <div className="flex items-center gap-1">
            {formulaRows && (
              <button
                onClick={() => setOpen(true)}
                className="rounded-md p-1 text-muted-foreground/40 transition-colors hover:bg-secondary hover:text-foreground"
                title="Voir le détail du calcul"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            )}
            {stat && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${stat.class}`}>
                {stat.label}
              </span>
            )}
          </div>
        </div>
      </div>
      {formulaRows && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{detailTitle || `Calcul — ${title}`}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {formulaRows.map((row, i) => (
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

function ProgressRing({
  value,
  size = 48,
  strokeWidth = 4,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
}) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 70 ? "#10b981" : value >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted-foreground/10"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

function exportToExcel(sessionsWithData: any[], currentYear: number) {
  const rows: any[] = [];
  let n = 0;
  for (const s of sessionsWithData) {
    for (const ev of s.evaluations) {
      n++;
      const cabFields = [
        "noteObjectifClarte",
        "noteContenu",
        "noteUtilite",
        "noteDureeRythme",
        "noteConfortSalle",
        "noteEquipements",
        "noteSupports",
      ];
      const forFields = [
        "noteMaitriseSujet",
        "noteClarteExplications",
        "noteAnimation",
        "noteCapaciteReponse",
      ];

      const cabVals = cabFields.map((f) => (ev as any)[f]).filter((v: any) => v != null);
      const forVals = forFields.map((f) => (ev as any)[f]).filter((v: any) => v != null);

      const scoreCabinetPart = cabVals.length ? avg(cabVals) : 0;
      const scoreFormateurPart = forVals.length ? avg(forVals) : 0;
      const scoreConditionPart = (scoreCabinetPart + scoreFormateurPart) / 2;

      rows.push({
        "N°": n,
        "Thème de la formation": s.formationTitle,
        "Date début": s.dateDebut.toLocaleDateString("fr-FR"),
        "Date fin": s.dateFin.toLocaleDateString("fr-FR"),
        "Nom du formateur": s.formateurName,
        Modalité: "",
        Direction: "",
        "Nb participants prévus": s.nbPrevus,
        "Nb participants réelles": s.nbReels,
        participants: ev.participant
          ? `${ev.participant.prenom ?? ""} ${ev.participant.nom ?? ""}`.trim()
          : "—",
        "Clarté des objectifs de la formation": ev.noteObjectifClarte ?? "",
        "Contenu de la formation": ev.noteContenu ?? "",
        "Utilité de la formation pour mon travail": ev.noteUtilite ?? "",
        "Durée et rythme de la formation": ev.noteDureeRythme ?? "",
        "Confort de la salle ou du bureau": ev.noteConfortSalle ?? "",
        "Équipements et moyens pédagogiques utilisés": ev.noteEquipements ?? "",
        "Supports pédagogique de formation remis": ev.noteSupports ?? "",
        "Maîtrise du sujet": ev.noteMaitriseSujet ?? "",
        "Clarté des explications": ev.noteClarteExplications ?? "",
        "Animation et interaction avec les participants": ev.noteAnimation ?? "",
        "Capacité à répondre aux questions": ev.noteCapaciteReponse ?? "",
        "score condition du cabinet/participants": Math.round(scoreCabinetPart * 100) / 100,
        "score formateur/participants": Math.round(scoreFormateurPart * 100) / 100,
        "Score condition de formation /participant": Math.round(scoreConditionPart * 100) / 100,
      });
    }
    if (s.evaluations.length > 0) {
      rows[rows.length - 1]["Score condition de formation /session"] =
        Math.round(s.scoreFormation * 100) / 100;
      rows[rows.length - 1]["Taux d'évaluation de la formation"] =
        `${Math.round(s.tauxEvaluation)}%`;
      rows[rows.length - 1]["Nb de note >4"] = s.nbNotesSup4;
      rows[rows.length - 1]["Taux de participation"] = `${s.tauxParticipation}%`;
      rows[rows.length - 1]["Taux de satisfaction"] = `${s.tauxSatisfaction}%`;
      rows[rows.length - 1]["score condition du cabinet/session"] =
        Math.round(s.scoreCabinet * 100) / 100;
      rows[rows.length - 1]["Taux condition du cabinet"] = `${Math.round(s.tauxCabinet)}%`;
      rows[rows.length - 1]["score formateur/ session"] = Math.round(s.scoreFormateur * 100) / 100;
      rows[rows.length - 1]["Taux formateur"] = `${Math.round(s.tauxFormateur)}%`;
    }
  }

  const sem =
    (sessionsWithData.length > 0
      ? sessionsWithData[0].dateDebut.getMonth() < 6
        ? "S1"
        : "S2"
      : "S1") + ` ${currentYear}`;
  const totalPrev = sessionsWithData.reduce((s: number, x: any) => s + x.nbPrevus, 0);
  const totalReel = sessionsWithData.reduce((s: number, x: any) => s + x.nbReels, 0);
  const tauxPartSem = totalPrev > 0 ? Math.round((totalReel / totalPrev) * 100) : 0;

  for (const row of rows) {
    row["nb participant prévue/semestre"] = totalPrev;
    row["nb participant réelle/semestre"] = totalReel;
    row["taux de participation/semestre"] = `${tauxPartSem}%`;
  }

  if (rows.length > 0) {
    const lastRow = rows[rows.length - 1];
    const nbReussis = sessionsWithData.reduce((s: number, x: any) => s + x.nbReussis, 0);
    const totalReelSum = sessionsWithData.reduce((s: number, x: any) => s + x.nbReels, 0);
    lastRow["Nb Participants réussis (≥13)"] = nbReussis;
    lastRow["Taux de réussite"] =
      totalReelSum > 0 ? `${Math.round((nbReussis / totalReelSum) * 100)}%` : "—";
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const colWidths = Object.keys(rows[0] ?? {}).map(() => ({ wch: 22 }));
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "notification évaluation à chaud");

  const kpiRows = [
    {
      Indicateur: "Pourcentage du personnel formé",
      Valeur: `${Math.round((totalReel / (totalPrev || 1)) * 100)}%`,
      Cible: "≥ 35%",
      Statut: totalPrev > 0 && totalReel / totalPrev >= 0.35 ? "Atteint" : "Non atteint",
    },
    { Indicateur: "Taux de réalisation du plan", Valeur: "", Cible: "≥ 95%", Statut: "" },
    {
      Indicateur: "Taux d'évaluation du cabinet (MSC)",
      Valeur: `${Math.round(sessionsWithData.length ? sessionsWithData.reduce((s: number, x: any) => s + x.tauxCabinet, 0) / sessionsWithData.length : 0)}%`,
      Cible: "≥ 70%",
      Statut:
        sessionsWithData.length > 0
          ? sessionsWithData.reduce((s: number, x: any) => s + x.tauxCabinet, 0) /
              sessionsWithData.length >=
            70
            ? "Atteint"
            : "Non atteint"
          : "",
    },
    {
      Indicateur: "Taux d'évaluation du formateur (MSF-formateur)",
      Valeur: `${Math.round(sessionsWithData.length ? sessionsWithData.reduce((s: number, x: any) => s + x.tauxFormateur, 0) / sessionsWithData.length : 0)}%`,
      Cible: "≥ 70%",
      Statut: "",
    },
    {
      Indicateur: "Taux d'évaluation de la formation (MSF)",
      Valeur: `${Math.round(sessionsWithData.length ? sessionsWithData.reduce((s: number, x: any) => s + x.tauxEvaluation, 0) / sessionsWithData.length : 0)}%`,
      Cible: "≥ 70%",
      Statut: "",
    },
    {
      Indicateur: "Taux de participation (MSP)",
      Valeur: `${tauxPartSem}%`,
      Cible: "≥ 70%",
      Statut: tauxPartSem >= 70 ? "Atteint" : "Non atteint",
    },
    {
      Indicateur: "Taux de réussite (MSR)",
      Valeur: `${totalReel > 0 ? Math.round((sessionsWithData.reduce((s: number, x: any) => s + x.nbReussis, 0) / totalReel) * 100) : 0}%`,
      Cible: "≥ 70%",
      Statut: "",
    },
    {
      Indicateur: "Taux de satisfaction (MSS)",
      Valeur: `${Math.round(sessionsWithData.length ? sessionsWithData.reduce((s: number, x: any) => s + x.tauxSatisfaction, 0) / sessionsWithData.length : 0)}%`,
      Cible: "≥ 70%",
      Statut: "",
    },
  ];

  const ws2 = XLSX.utils.json_to_sheet(kpiRows);
  const colWidths2 = [40, 15, 15, 15];
  ws2["!cols"] = colWidths2.map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws2, "Tableau de bord KPI");

  XLSX.writeFile(wb, `KPI_Formations_${currentYear}.xlsx`);
}

function SemesterCard({ sem }: { sem: any }) {
  const [semOpen, setSemOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg">{sem.label}</h3>
        {sem.sessions.length > 0 && (
          <button
            onClick={() => setSemOpen(true)}
            className="rounded-md p-1 text-muted-foreground/40 transition-colors hover:bg-secondary hover:text-foreground"
            title="Détail des calculs"
          >
            <Info className="h-4 w-4" />
          </button>
        )}
      </div>
      {sem.sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune session ce semestre</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">MSC — Cabinet</p>
              <p className={`mt-0.5 font-display text-2xl tabular-nums ${statusColor(sem.msc, { pass: 70, warn: 40 })}`}>
                {Math.round(sem.msc)}%
              </p>
              <p className="text-[10px] text-muted-foreground">{interpretationLabel(sem.msc, "cabinet")}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">MSF — Formateur</p>
              <p className={`mt-0.5 font-display text-2xl tabular-nums ${statusColor(sem.msfFormateur, { pass: 70, warn: 40 })}`}>
                {Math.round(sem.msfFormateur)}%
              </p>
              <p className="text-[10px] text-muted-foreground">{interpretationLabel(sem.msfFormateur, "formateur")}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/50">
            <div>
              <p className="text-[10px] text-muted-foreground">MSF — Formation</p>
              <p className={`font-display text-lg tabular-nums ${statusColor(sem.msf, { pass: 70, warn: 40 })}`}>{Math.round(sem.msf)}%</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">MSP — Participation</p>
              <p className={`font-display text-lg tabular-nums ${statusColor(sem.msp, { pass: 70, warn: 40 })}`}>{Math.round(sem.msp)}%</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">MSS — Satisfaction</p>
              <p className={`font-display text-lg tabular-nums ${statusColor(sem.mss, { pass: 70, warn: 40 })}`}>{Math.round(sem.mss)}%</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground">MSR — Réussite</p>
              <p className={`font-display text-lg tabular-nums ${statusColor(sem.msr, { pass: 70, warn: 40 })}`}>{Math.round(sem.msr)}%</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Sessions</p>
              <p className="font-display text-lg tabular-nums text-muted-foreground">{sem.sessions.length}</p>
            </div>
          </div>
        </div>
      )}
      <Dialog open={semOpen} onOpenChange={setSemOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Détail — {sem.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 font-medium text-muted-foreground">Session</th>
                  <th className="pb-2 font-medium text-muted-foreground">MSC</th>
                  <th className="pb-2 font-medium text-muted-foreground">MSF-F</th>
                  <th className="pb-2 font-medium text-muted-foreground">MSF</th>
                  <th className="pb-2 font-medium text-muted-foreground">MSP</th>
                  <th className="pb-2 font-medium text-muted-foreground">MSS</th>
                  <th className="pb-2 font-medium text-muted-foreground">MSR</th>
                </tr>
              </thead>
              <tbody>
                {sem.sessions.map((s: any) => (
                  <tr key={s.sessionId} className="border-b border-border/50">
                    <td className="py-1.5 pr-2 font-medium">{s.formationTitle}</td>
                    <td className="py-1.5 tabular-nums">{Math.round(s.tauxCabinet)}%</td>
                    <td className="py-1.5 tabular-nums">{Math.round(s.tauxFormateur)}%</td>
                    <td className="py-1.5 tabular-nums">{Math.round(s.tauxEvaluation)}%</td>
                    <td className="py-1.5 tabular-nums">{s.tauxParticipation}%</td>
                    <td className="py-1.5 tabular-nums">{s.tauxSatisfaction}%</td>
                    <td className="py-1.5 tabular-nums">{s.tauxReussite}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border font-medium">
                  <td className="pt-2 pr-2">Moyenne</td>
                  <td className="pt-2 tabular-nums">{Math.round(sem.msc)}%</td>
                  <td className="pt-2 tabular-nums">{Math.round(sem.msfFormateur)}%</td>
                  <td className="pt-2 tabular-nums">{Math.round(sem.msf)}%</td>
                  <td className="pt-2 tabular-nums">{Math.round(sem.msp)}%</td>
                  <td className="pt-2 tabular-nums">{Math.round(sem.mss)}%</td>
                  <td className="pt-2 tabular-nums">{Math.round(sem.msr)}%</td>
                </tr>
              </tfoot>
            </table>
            <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Formules</p>
              <p>MSC = Σ(score cabinet / session) / nb sessions × 25</p>
              <p>MSF-Formateur = Σ(score formateur / session) / nb sessions × 25</p>
              <p>MSF = Σ(taux évaluation) / nb sessions</p>
              <p>MSP = Σ(participations) / nb sessions</p>
              <p>MSS = Σ(satisfactions) / nb sessions</p>
              <p>MSR = Σ(réussites) / nb sessions</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GrilleCard({ type, sessionsWithData, sessionMap }: { type: "formateur" | "cabinet" | "formation"; sessionsWithData: any[]; sessionMap: Map<string, any> }) {
  const [interpOpen, setInterpOpen] = useState(false);
  const withEval = sessionsWithData.filter((s) => s.evaluations.length > 0);
  const sessionsOfType = withEval.filter((s) => {
    if (type === "cabinet") {
      const session = sessionMap.get(s.sessionId);
      if (!session) return false;
      if (session.cabinetId) return true;
      if (session.clonedFromCabinetId) return true;
      return false;
    }
    const v = type === "formateur" ? s.tauxFormateur : s.tauxEvaluation;
    const raw = type === "formateur" ? s.scoreFormateur : s.scoreFormation;
    if (v == null || isNaN(Number(v)) || raw === 0) return false;
    return true;
  });
  const hasAnyCabinet = type === "cabinet" && sessionsWithData.some((s) => {
    const session = sessionMap.get(s.sessionId);
    return session != null && (session.cabinetId != null || session.clonedFromCabinetId != null);
  });
  const hasData = sessionsOfType.length > 0;
  const raw = hasData
    ? avg(sessionsOfType.map((s) => (type === "formateur" ? s.tauxFormateur : type === "cabinet" ? s.tauxCabinet : s.tauxEvaluation)))
    : null;
  const avgVal = raw != null && !isNaN(raw) ? raw : null;
  const Icon = type === "formateur" ? UserCheck : type === "cabinet" ? Monitor : BookOpen;
  const title = type === "formateur" ? "Formateur" : type === "cabinet" ? "Cabinet" : "Formation";
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className={`text-2xl font-display tabular-nums ${avgVal != null ? interpretationColor(avgVal) : "text-muted-foreground"}`}>
              {avgVal != null ? `${Math.round(avgVal)}%` : "—"}
            </p>
          </div>
        </div>
        {hasData && (
          <button
            onClick={() => setInterpOpen(true)}
            className="rounded-md p-1 text-muted-foreground/40 transition-colors hover:bg-secondary hover:text-foreground"
            title="Voir le détail par session"
          >
            <Info className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className={`mt-3 text-xs font-medium ${avgVal != null ? interpretationColor(avgVal) : "text-muted-foreground"}`}>
        {avgVal != null ? interpretationLabel(avgVal, type) : hasAnyCabinet ? "En attente d'évaluations" : "Aucune session"}
      </p>
      <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
        <p>≥ 70% : {type === "formateur" ? "Retenu" : type === "cabinet" ? "Performant" : "Réussie"}</p>
        <p>40-69% : À améliorer</p>
        <p>&lt; 40% : {type === "formateur" ? "Non retenu (exclusion 3 ans)" : type === "cabinet" ? "Non retenu (exclusion consultations)" : "Non réussie (révision complète)"}</p>
      </div>
      <Dialog open={interpOpen} onOpenChange={setInterpOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Détail — {title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Formule de calcul</p>
              {type === "formateur" && (
                <>
                  <p>1. Score / participant = moyenne des 4 critères formateur (note 1-4)</p>
                  <p className="pl-4">= (Maîtrise + Clarté + Animation + Réponses) / 4</p>
                  <p>2. Score / session = moyenne des scores de tous les participants</p>
                  <p>3. Taux formateur = Score / session × 25</p>
                </>
              )}
              {type === "cabinet" && (
                <>
                  <p>1. Score / participant = moyenne des 7 critères cabinet (note 1-4)</p>
                  <p className="pl-4">= (Objectifs + Contenu + Utilité + Rythme + Confort + Équipements + Supports) / 7</p>
                  <p>2. Score / session = moyenne des scores de tous les participants</p>
                  <p>3. Taux cabinet = Score / session × 25</p>
                </>
              )}
              {type === "formation" && (
                <>
                  <p>1. Score formation / participant = (Score cabinet + Score formateur) / 2</p>
                  <p>2. Score formation / session = moyenne des scores de tous les participants</p>
                  <p>3. Taux évaluation = Score formation / session × 25</p>
                </>
              )}
            </div>
            <div className="space-y-2">
              {sessionsOfType.map((s: any) => {
                const val = type === "formateur" ? s.tauxFormateur : type === "cabinet" ? s.tauxCabinet : s.tauxEvaluation;
                const rawScore = type === "formateur" ? s.scoreFormateur : type === "cabinet" ? s.scoreCabinet : s.scoreFormation;
                const formationId = s.sessionId ? sessionMap.get(s.sessionId)?.formation?.id : null;
                return (
                  <div key={s.sessionId} className="rounded-lg bg-muted/30 px-4 py-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-muted-foreground font-medium truncate">{s.formationTitle}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {formationId && (
                            <Link to="/admin/formations" className="rounded p-0.5 text-muted-foreground/40 hover:text-primary transition-colors" title="Voir la formation">
                              <BookOpen className="h-3 w-3" />
                            </Link>
                          )}
                          <Link to="/admin/sessions" className="rounded p-0.5 text-muted-foreground/40 hover:text-primary transition-colors" title="Voir la session">
                            <CalendarDays className="h-3 w-3" />
                          </Link>
                          <Link to="/admin/formateurs" className="rounded p-0.5 text-muted-foreground/40 hover:text-primary transition-colors" title="Voir le formateur">
                            <GraduationCap className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                      <span className={`font-medium tabular-nums shrink-0 ${interpretationColor(val)}`}>
                        {Math.round(val)}%
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground/60">
                      <span>Score brut: {rawScore.toFixed(2)}/4</span>
                      <span>× 25 = {Math.round(val)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5 text-sm font-medium">
              <span>Moyenne générale</span>
              <span className={`tabular-nums ${interpretationColor(avgVal)}`}>{Math.round(avgVal)}%</span>
            </div>
            <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Seuils d'interprétation</p>
              <p>≥ 70% : {type === "formateur" ? "Retenu" : type === "cabinet" ? "Performant" : "Réussie"}</p>
              <p>40-69% : À améliorer</p>
              <p>&lt; 40% : {type === "formateur" ? "Non retenu (exclusion 3 ans)" : type === "cabinet" ? "Non retenu (exclusion consultations)" : "Non réussie (révision complète)"}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminKPIPage() {
  const { data: evaluations, isLoading: evLoading } = useQuery({
    queryKey: ["evaluations"],
    queryFn: () => getEvaluations(),
  });

  const { data: sessions } = useQuery({
    queryKey: ["sessions-all"],
    queryFn: () => getSessions(undefined, true),
  });

  const { data: formations } = useQuery({
    queryKey: ["formations-all"],
    queryFn: () => getFormations(undefined, true),
  });

  if (evLoading) {
    return (
      <AdminShell
        title="KPI Formations"
        subtitle="Indicateurs clés de performance — Barème IT-CFP-002"
      >
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminShell>
    );
  }

  const sessionMap = new Map((sessions ?? []).map((s) => [s.id, s]));
  const formationMap = new Map((formations ?? []).map((f) => [f.id, f]));

  const evalsBySession = new Map<string, any[]>();
  for (const ev of evaluations ?? []) {
    const list = evalsBySession.get(ev.session?.id) ?? [];
    list.push(ev);
    evalsBySession.set(ev.session?.id, list);
  }

  const sessionsWithData: {
    sessionId: string;
    formationTitle: string;
    formateurName: string;
    dateDebut: Date;
    dateFin: Date;
    nbPrevus: number;
    nbReels: number;
    evaluations: any[];
    scoreCabinet: number;
    scoreFormateur: number;
    scoreFormation: number;
    tauxEvaluation: number;
    nbNotesSup4: number;
    tauxParticipation: number;
    tauxSatisfaction: number;
    tauxCabinet: number;
    tauxFormateur: number;
    tauxReussite: number;
    nbReussis: number;
  }[] = [];

  for (const [sessionId, session] of sessionMap) {
    if (!session || session.isCancelled) continue;

    const sessionEvals = evalsBySession.get(sessionId) ?? [];
    const nbPrevus = (session.capaciteMax ?? sessionEvals.length) || 1;
    const nbReels = session.nombreParticipants ?? sessionEvals.length;

    const cabinetScores = sessionEvals
      .map((e: any) => {
        const vals = cabineFields
          .map((f) => getFieldValue(e, f, cabinetFieldFallbacks))
          .filter((v) => v != null);
        return vals.length ? avg(vals) : null;
      })
      .filter((v: any) => v != null);

    const formateurScores = sessionEvals
      .map((e: any) => {
        const vals = formateurFields
          .map((f) => getFieldValue(e, f, formateurFieldFallbacks))
          .filter((v) => v != null);
        return vals.length ? avg(vals) : null;
      })
      .filter((v: any) => v != null);

    const scoreCabinet = cabinetScores.length ? avg(cabinetScores) : 0;
    const scoreFormateur = formateurScores.length ? avg(formateurScores) : 0;
    const scoreFormation =
      cabinetScores.length || formateurScores.length ? (scoreCabinet + scoreFormateur) / 2 : 0;

    const tauxEvaluation = toPct(scoreFormation, 4);
    const tauxCabinet = toPct(scoreCabinet, 4);
    const tauxFormateur = toPct(scoreFormateur, 4);

    const nbNotesSup4 = sessionEvals.filter(
      (e: any) => (e.noteSatisfactionGlobale ?? e.note ?? 0) >= 4,
    ).length;
    const tauxSatisfaction = nbReels > 0 ? Math.round((nbNotesSup4 / nbReels) * 100) : 0;
    const tauxParticipation = nbPrevus > 0 ? Math.round((nbReels / nbPrevus) * 100) : 100;

    const nbReussis = sessionEvals.filter((e: any) => {
      const s = e.noteSatisfactionGlobale ?? e.note ?? 0;
      const pct = toPct(s, 4);
      return pct >= 60;
    }).length;
    const tauxReussite = nbReels > 0 ? Math.round((nbReussis / nbReels) * 100) : 0;

    const formateur = sessionEvals[0]?.formateur ?? session.formateurs?.[0];
    const formateurName = formateur
      ? `${formateur.prenom ?? ""} ${formateur.nom ?? ""}`.trim()
      : "—";

    sessionsWithData.push({
      sessionId,
      formationTitle: session.formation?.titre ?? "—",
      formateurName,
      dateDebut: new Date(session.dateDebut),
      dateFin: new Date(session.dateFin),
      nbPrevus,
      nbReels,
      evaluations: sessionEvals,
      scoreCabinet,
      scoreFormateur,
      scoreFormation,
      tauxEvaluation,
      nbNotesSup4,
      tauxParticipation,
      tauxSatisfaction,
      tauxCabinet,
      tauxFormateur,
      tauxReussite,
      nbReussis,
    });
  }

  sessionsWithData.sort((a, b) => b.dateDebut.getTime() - a.dateDebut.getTime());

  const totalPrevus = sessionsWithData.reduce((s, x) => s + x.nbPrevus, 0);
  const totalReels = sessionsWithData.reduce((s, x) => s + x.nbReels, 0);
  const pctPersonnelForme = totalPrevus > 0 ? Math.round((totalReels / totalPrevus) * 100) : 0;

  const themesRealises = new Set(sessionsWithData.map((s) => s.formationTitle)).size;
  const themesProgrammes = new Set((formations ?? []).map((f) => f.titre)).size;
  const tauxRealisationPlan =
    themesProgrammes > 0 ? Math.round((themesRealises / themesProgrammes) * 100) : 0;

  function semAvg(sessions: typeof sessionsWithData, field: keyof (typeof sessionsWithData)[0]) {
    const vals = sessions.map((s) => s[field] as number);
    return vals.length ? avg(vals) : 0;
  }

  const currentYear = new Date().getFullYear();
  const s1Sessions = sessionsWithData.filter((s) => {
    const d = s.dateDebut;
    return d.getFullYear() === currentYear && getSemester(d) === "S1";
  });
  const s2Sessions = sessionsWithData.filter((s) => {
    const d = s.dateDebut;
    return d.getFullYear() === currentYear && getSemester(d) === "S2";
  });

  const semesters = [
    {
      label: `S1 ${currentYear}`,
      sessions: s1Sessions,
      msc: toPct(semAvg(s1Sessions, "scoreCabinet"), 4),
      msfFormateur: toPct(semAvg(s1Sessions, "scoreFormateur"), 4),
      msf: semAvg(s1Sessions, "tauxEvaluation"),
      msp: semAvg(s1Sessions, "tauxParticipation"),
      msr: semAvg(s1Sessions, "tauxReussite"),
      mss: semAvg(s1Sessions, "tauxSatisfaction"),
    },
    {
      label: `S2 ${currentYear}`,
      sessions: s2Sessions,
      msc: toPct(semAvg(s2Sessions, "scoreCabinet"), 4),
      msfFormateur: toPct(semAvg(s2Sessions, "scoreFormateur"), 4),
      msf: semAvg(s2Sessions, "tauxEvaluation"),
      msp: semAvg(s2Sessions, "tauxParticipation"),
      msr: semAvg(s2Sessions, "tauxReussite"),
      mss: semAvg(s2Sessions, "tauxSatisfaction"),
    },
  ];

  return (
    <AdminShell
      title="KPI Formations"
      subtitle="Indicateurs clés de performance — Conforme au barème IT-CFP-002 (indice 02, 15/05/2026)"
      actions={
        sessionsWithData.length > 0 ? (
          <button
            onClick={() => exportToExcel(sessionsWithData, currentYear)}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <FileDown className="h-4 w-4" />
            Exporter Excel
          </button>
        ) : undefined
      }
    >
      <div className="space-y-10">
        {/* SECTION: Vue d'ensemble */}
        <section>
          <h2 className="mb-5 flex items-center gap-2 font-display text-xl">
            <BarChart3 className="h-5 w-5 text-primary" />
            Vue d'ensemble {currentYear}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Personnel formé"
              value={pctPersonnelForme}
              target={35}
              icon={Users}
              subtitle={`${totalReels} / ${totalPrevus} participants`}
              formulaRows={[
                { label: "Nb participants réels (Σ réels)", value: totalReels },
                { label: "Nb participants prévus (Σ prévus)", value: totalPrevus },
                { label: "Formule", value: "(Σ réels / Σ prévus) × 100" },
                { label: "Calcul", value: `(${totalReels} / ${totalPrevus}) × 100` },
                { label: "Résultat", value: `${pctPersonnelForme}%` },
              ]}
              detailTitle="Calcul — Pourcentage du personnel formé"
            />
            <KpiCard
              title="Réalisation du plan"
              value={tauxRealisationPlan}
              target={95}
              icon={Target}
              subtitle={`${themesRealises} / ${themesProgrammes} thèmes`}
              formulaRows={[
                { label: "Thèmes réalisés (avec évaluations)", value: themesRealises },
                { label: "Thèmes programmés (total formations)", value: themesProgrammes },
                { label: "Formule", value: "(réalisés / programmés) × 100" },
                { label: "Calcul", value: `(${themesRealises} / ${themesProgrammes}) × 100` },
                { label: "Résultat", value: `${tauxRealisationPlan}%` },
              ]}
              detailTitle="Calcul — Taux de réalisation du plan"
            />
            <KpiCard
              title="Taux d'évaluation (MSF)"
              value={(() => {
                const v = semAvg(s2Sessions.length ? s2Sessions : s1Sessions, "tauxEvaluation");
                return Math.round(v);
              })()}
              target={70}
              icon={BookOpen}
              subtitle="Moyenne semestre en cours"
              formulaRows={(() => {
                const active = s2Sessions.length ? s2Sessions : s1Sessions;
                const v = semAvg(active, "tauxEvaluation");
                const details = active.slice(0, 10).map((s) => ({
                  label: s.formationTitle,
                  value: `${Math.round(s.tauxEvaluation)}%`,
                }));
                return [
                  ...details,
                  ...(active.length > 10
                    ? [{ label: `… et ${active.length - 10} autres`, value: "" }]
                    : []),
                  { label: "Moyenne", value: `${Math.round(v)}%` },
                  { label: "Cible", value: "≥ 70%" },
                ];
              })()}
              detailTitle="Détail MSF — Taux d'évaluation par session"
            />
            <KpiCard
              title="Satisfaction globale"
              value={(() => {
                const v = semAvg(s2Sessions.length ? s2Sessions : s1Sessions, "tauxSatisfaction");
                return Math.round(v);
              })()}
              target={70}
              icon={ThumbsUp}
              subtitle="Moyenne semestre en cours"
              formulaRows={(() => {
                const active = s2Sessions.length ? s2Sessions : s1Sessions;
                const v = semAvg(active, "tauxSatisfaction");
                const details = active.slice(0, 10).map((s) => ({
                  label: s.formationTitle,
                  value: `${s.tauxSatisfaction}%`,
                }));
                return [
                  ...details,
                  ...(active.length > 10
                    ? [{ label: `… et ${active.length - 10} autres`, value: "" }]
                    : []),
                  { label: "Moyenne (MSS)", value: `${Math.round(v)}%` },
                  { label: "Formule", value: "Σ (notes ≥ 4 / réels) × 100 / nb sessions" },
                  { label: "Cible", value: "≥ 70%" },
                ];
              })()}
              detailTitle="Détail MSS — Satisfaction par session"
            />
          </div>
        </section>

        {/* SECTION: Moyennes semestrielles */}
        <section>
          <h2 className="mb-5 flex items-center gap-2 font-display text-xl">
            <TrendingUp className="h-5 w-5 text-primary" />
            Moyennes semestrielles
          </h2>
          <div className="grid gap-6 lg:grid-cols-2">
            {semesters.map((sem) => (
              <SemesterCard key={sem.label} sem={sem} />
            ))}
          </div>
        </section>

        {/* SECTION: Grille d'interprétation */}
        <section>
          <h2 className="mb-5 flex items-center gap-2 font-display text-xl">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Grille d'interprétation — Évaluations par session
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {(["formateur", "cabinet", "formation"] as const).map((type) => (
              <GrilleCard
                key={type}
                type={type}
                sessionsWithData={sessionsWithData}
                sessionMap={sessionMap}
              />
            ))}
          </div>
        </section>

        {/* SECTION: Détail par session */}
        <section>
          <h2 className="mb-5 flex items-center gap-2 font-display text-xl">
            <BookOpen className="h-5 w-5 text-primary" />
            Détail par session
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {sessionsWithData.length} session{sessionsWithData.length > 1 ? "s" : ""}
            </span>
          </h2>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="sticky left-0 bg-muted/50 px-4 py-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                    Formation
                  </th>
                  <th className="px-3 py-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                    Formateur
                  </th>
                  <th className="px-3 py-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                    Date
                  </th>
                  <th className="px-3 py-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                    Prévus
                  </th>
                  <th className="px-3 py-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                    Réels
                  </th>
                  <th className="px-3 py-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                    Participation
                  </th>
                  <th className="px-3 py-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                    Cabinet
                  </th>
                  <th className="px-3 py-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                    Formateur
                  </th>
                  <th className="px-3 py-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                    Formation
                  </th>
                  <th className="px-3 py-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                    Satisf.
                  </th>
                  <th className="px-3 py-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                    Réussite
                  </th>
                  <th className="px-3 py-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                    Interprétation
                  </th>
                </tr>
              </thead>
              <tbody>
                {sessionsWithData.map((s, i) => (
                  <tr
                    key={s.sessionId}
                    className={`border-b border-border/50 ${i % 2 === 0 ? "bg-card" : "bg-muted/20"}`}
                  >
                    <td className="sticky left-0 bg-inherit px-4 py-3 font-medium whitespace-nowrap">
                      {s.formationTitle}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                      {s.formateurName}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                      {s.dateDebut.toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-3 py-3 tabular-nums">{s.nbPrevus}</td>
                    <td className="px-3 py-3 tabular-nums">{s.nbReels}</td>
                    <td
                      className={`px-3 py-3 tabular-nums font-medium ${statusColor(s.tauxParticipation, { pass: 70, warn: 40 })}`}
                    >
                      {s.tauxParticipation}%
                    </td>
                    <td
                      className={`px-3 py-3 tabular-nums font-medium ${statusColor(s.tauxCabinet, { pass: 70, warn: 40 })}`}
                    >
                      {Math.round(s.tauxCabinet)}%
                    </td>
                    <td
                      className={`px-3 py-3 tabular-nums font-medium ${statusColor(s.tauxFormateur, { pass: 70, warn: 40 })}`}
                    >
                      {Math.round(s.tauxFormateur)}%
                    </td>
                    <td
                      className={`px-3 py-3 tabular-nums font-medium ${statusColor(s.tauxEvaluation, { pass: 70, warn: 40 })}`}
                    >
                      {Math.round(s.tauxEvaluation)}%
                    </td>
                    <td
                      className={`px-3 py-3 tabular-nums font-medium ${statusColor(s.tauxSatisfaction, { pass: 70, warn: 40 })}`}
                    >
                      {s.tauxSatisfaction}%
                    </td>
                    <td
                      className={`px-3 py-3 tabular-nums font-medium ${statusColor(s.tauxReussite, { pass: 70, warn: 40 })}`}
                    >
                      {s.tauxReussite}%
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`text-[10px] font-medium ${interpretationColor(s.tauxEvaluation)}`}
                      >
                        {interpretationLabel(s.tauxEvaluation, "formation")}
                      </span>
                    </td>
                  </tr>
                ))}
                {sessionsWithData.length === 0 && (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      Aucune session avec évaluations détaillées pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION: Synthèse des non-conformités */}
        {sessionsWithData.length > 0 && (
          <section>
            <h2 className="mb-5 flex items-center gap-2 font-display text-xl">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Synthèse des alertes
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <XCircle className="h-4 w-4 text-red-500" />
                  Formateurs non retenus (&lt; 40%)
                </h3>
                {(() => {
                  const bad = sessionsWithData.filter((s) => s.tauxFormateur < 40);
                  if (bad.length === 0) {
                    return (
                      <p className="text-xs text-muted-foreground">
                        Aucun formateur en dessous du seuil.
                      </p>
                    );
                  }
                  return (
                    <ul className="space-y-1">
                      {bad.map((s) => (
                        <li key={s.sessionId} className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{s.formateurName}</span> —{" "}
                          {s.formationTitle} ({Math.round(s.tauxFormateur)}%)
                          <span className="ml-1 text-red-500">— Fiche F048 requise</span>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <XCircle className="h-4 w-4 text-red-500" />
                  Formations non réussies (&lt; 40%)
                </h3>
                {(() => {
                  const bad = sessionsWithData.filter((s) => s.tauxEvaluation < 40);
                  if (bad.length === 0) {
                    return (
                      <p className="text-xs text-muted-foreground">
                        Aucune formation en dessous du seuil.
                      </p>
                    );
                  }
                  return (
                    <ul className="space-y-1">
                      {bad.map((s) => (
                        <li key={s.sessionId} className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{s.formationTitle}</span> (
                          {Math.round(s.tauxEvaluation)}%)
                          <span className="ml-1 text-red-500">— Révision complète nécessaire</span>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            </div>
          </section>
        )}
      </div>
    </AdminShell>
  );
}
