import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/protected-route";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  ArrowLeft,
  ClipboardCheck,
  BookOpen,
  Monitor,
  UserCheck,
  Star,
  ThumbsUp,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { getSession } from "@/lib/api/sessions";
import { createEvaluation, getEvaluations } from "@/lib/api/evaluations";
import { useState } from "react";

export const Route = createFileRoute("/evaluation/$sessionId")({
  head: () => ({ meta: [{ title: "Évaluation — steg_form" }] }),
  component: EvaluerPage,
});

const scaleLabels = [
  "Pas du tout satisfait",
  "Peu satisfait",
  "Plutôt satisfait",
  "Très satisfait",
];

function LikertInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium leading-snug">{label}</p>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex h-14 w-full flex-col items-center justify-center rounded-xl border-2 text-xs font-medium transition-all ${
              value === n
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-border bg-card text-muted-foreground hover:border-muted-foreground/30 hover:bg-secondary/50"
            }`}
          >
            <span className="text-base font-bold">{n}</span>
          </button>
        ))}
      </div>
      {value > 0 && (
        <p className="mt-1 text-[11px] text-muted-foreground">{scaleLabels[value - 1]}</p>
      )}
    </div>
  );
}

function StarInput({
  label,
  value,
  onChange,
  max = 5,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      <div className="flex gap-1">
        {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="rounded-md p-1 transition-all hover:scale-110"
          >
            <Star
              className={`h-6 w-6 ${
                star <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function EvaluerPage() {
  const { sessionId } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: session, isLoading } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => getSession(sessionId),
  });

  const { data: existingEval } = useQuery({
    queryKey: ["evaluations", "check", sessionId, user?.id],
    queryFn: () => getEvaluations({ sessionId, participantId: user?.id }),
    enabled: !!user?.id,
    select: (data) => data.length > 0,
  });

  // Section 2: Avis sur la formation (1-4)
  const [noteObjectifClarte, setNoteObjectifClarte] = useState(0);
  const [noteContenu, setNoteContenu] = useState(0);
  const [noteUtilite, setNoteUtilite] = useState(0);
  const [noteDureeRythme, setNoteDureeRythme] = useState(0);

  // Section 3: Conditions matérielles (1-4)
  const [noteConfortSalle, setNoteConfortSalle] = useState(0);
  const [noteEquipements, setNoteEquipements] = useState(0);
  const [noteSupports, setNoteSupports] = useState(0);

  // Section 4: Évaluation du formateur (1-4)
  const [noteMaitriseSujet, setNoteMaitriseSujet] = useState(0);
  const [noteClarteExplications, setNoteClarteExplications] = useState(0);
  const [noteAnimation, setNoteAnimation] = useState(0);
  const [noteCapaciteReponse, setNoteCapaciteReponse] = useState(0);

  // Section 5: Appréciation globale (1-4)
  const [noteSatisfactionGlobale, setNoteSatisfactionGlobale] = useState(0);

  // Section 6: Commentaires
  const [commentaire, setCommentaire] = useState("");
  const [pointsForts, setPointsForts] = useState("");
  const [pointsAmeliorer, setPointsAmeliorer] = useState("");
  const [noteCfpStir, setNoteCfpStir] = useState(0);

  const formateur = session?.formateurs?.[0];

  const allSectionsFilled =
    noteObjectifClarte > 0 &&
    noteContenu > 0 &&
    noteUtilite > 0 &&
    noteDureeRythme > 0 &&
    noteConfortSalle > 0 &&
    noteEquipements > 0 &&
    noteSupports > 0 &&
    noteMaitriseSujet > 0 &&
    noteClarteExplications > 0 &&
    noteAnimation > 0 &&
    noteCapaciteReponse > 0 &&
    noteSatisfactionGlobale > 0;

  const mutation = useMutation({
    mutationFn: () => {
      if (!formateur) throw new Error("Aucun formateur trouvé pour cette session");
      if (!user) throw new Error("Utilisateur non connecté");
      const avgNote =
        (noteObjectifClarte +
          noteContenu +
          noteUtilite +
          noteDureeRythme +
          noteConfortSalle +
          noteEquipements +
          noteSupports +
          noteMaitriseSujet +
          noteClarteExplications +
          noteAnimation +
          noteCapaciteReponse +
          noteSatisfactionGlobale) /
        12;
      return createEvaluation({
        note: Math.round(avgNote * 10) / 10,
        noteContenu,
        noteSupports,
        commentaire: commentaire || undefined,
        recommande: noteSatisfactionGlobale >= 3,
        dateEvaluation: new Date().toISOString(),
        formateurId: formateur.id,
        sessionId,
        participantId: user.id,
        noteObjectifClarte,
        noteUtilite,
        noteDureeRythme,
        noteConfortSalle,
        noteEquipements,
        noteMaitriseSujet,
        noteClarteExplications,
        noteAnimation,
        noteCapaciteReponse,
        noteSatisfactionGlobale,
        pointsForts: pointsForts || undefined,
        pointsAmeliorer: pointsAmeliorer || undefined,
        noteCfpStir: noteCfpStir || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Évaluation envoyée avec succès !");
      queryClient.invalidateQueries({ queryKey: ["my-sessions"] });
    },
    onError: (err: any) => {
      try {
        const msg = JSON.parse(err.message);
        toast.error(msg.message || "Erreur lors de l'envoi");
      } catch {
        toast.error("Erreur lors de l'envoi");
      }
    },
  });

  if (isLoading) {
    return (
      <ProtectedRoute>
        <PageShell>
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </PageShell>
      </ProtectedRoute>
    );
  }

  if (!session) {
    return (
      <ProtectedRoute>
        <PageShell>
          <div className="mx-auto max-w-3xl px-6 py-16 text-center">
            <p className="text-lg">Session introuvable.</p>
            <Link to="/mes-formations" className="mt-4 inline-block text-primary underline">
              Retour
            </Link>
          </div>
        </PageShell>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageShell>
        <div className="mx-auto max-w-3xl px-6 py-12">
          <Link
            to="/mes-formations"
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Retour à mes formations
          </Link>

          <div className="mb-8">
            <h1 className="font-display text-3xl">Évaluation de la formation</h1>
            <p className="mt-1.5 text-muted-foreground">
              {session.formation?.titre} — {new Date(session.dateDebut).toLocaleDateString("fr-FR")}
            </p>
          </div>

          <div className="space-y-8">
            {/* Section 1: Informations sur la formation */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-5 flex items-center gap-2 font-display text-lg">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                1. Informations sur la formation
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Intitulé de la formation</p>
                  <p className="font-medium">{session.formation?.titre}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {new Date(session.dateDebut).toLocaleDateString("fr-FR")} —{" "}
                    {new Date(session.dateFin).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nom du formateur</p>
                  <p className="font-medium">
                    {formateur ? `${formateur.prenom} ${formateur.nom}` : "Non assigné"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Direction / Service</p>
                  <p className="font-medium">{session.formation?.categorie || "—"}</p>
                </div>
              </div>
            </section>

            {/* Section 2: Avis sur la formation */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-5 flex items-center gap-2 font-display text-lg">
                <BookOpen className="h-5 w-5 text-primary" />
                2. Avis sur la formation
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  (1 — Pas du tout satisfait à 4 — Très satisfait)
                </span>
              </h2>
              <div className="space-y-5">
                <LikertInput
                  label="Clarté des objectifs de la formation"
                  value={noteObjectifClarte}
                  onChange={setNoteObjectifClarte}
                />
                <div className="border-t border-border/50" />
                <LikertInput
                  label="Contenu de la formation"
                  value={noteContenu}
                  onChange={setNoteContenu}
                />
                <div className="border-t border-border/50" />
                <LikertInput
                  label="Utilité de la formation pour mon travail"
                  value={noteUtilite}
                  onChange={setNoteUtilite}
                />
                <div className="border-t border-border/50" />
                <LikertInput
                  label="Durée et rythme de la formation"
                  value={noteDureeRythme}
                  onChange={setNoteDureeRythme}
                />
              </div>
            </section>

            {/* Section 3: Conditions matérielles */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-5 flex items-center gap-2 font-display text-lg">
                <Monitor className="h-5 w-5 text-primary" />
                3. Conditions matérielles et environnement de formation
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  (Salle / bureau / moyens pédagogiques)
                </span>
              </h2>
              <div className="space-y-5">
                <LikertInput
                  label="Confort de la salle ou du bureau (éclairage, bruit, espace)"
                  value={noteConfortSalle}
                  onChange={setNoteConfortSalle}
                />
                <div className="border-t border-border/50" />
                <LikertInput
                  label="Équipements et moyens pédagogiques utilisés"
                  value={noteEquipements}
                  onChange={setNoteEquipements}
                />
                <div className="border-t border-border/50" />
                <LikertInput
                  label="Supports de formation remis"
                  value={noteSupports}
                  onChange={setNoteSupports}
                />
              </div>
            </section>

            {/* Section 4: Évaluation du formateur */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-5 flex items-center gap-2 font-display text-lg">
                <UserCheck className="h-5 w-5 text-primary" />
                4. Évaluation du formateur
                <span className="ml-auto text-sm font-normal text-muted-foreground">
                  {formateur?.prenom} {formateur?.nom}
                </span>
              </h2>
              <div className="space-y-5">
                <LikertInput
                  label="Maîtrise du sujet"
                  value={noteMaitriseSujet}
                  onChange={setNoteMaitriseSujet}
                />
                <div className="border-t border-border/50" />
                <LikertInput
                  label="Clarté des explications"
                  value={noteClarteExplications}
                  onChange={setNoteClarteExplications}
                />
                <div className="border-t border-border/50" />
                <LikertInput
                  label="Animation et interaction avec les participants"
                  value={noteAnimation}
                  onChange={setNoteAnimation}
                />
                <div className="border-t border-border/50" />
                <LikertInput
                  label="Capacité à répondre aux questions"
                  value={noteCapaciteReponse}
                  onChange={setNoteCapaciteReponse}
                />
              </div>
            </section>

            {/* Section 5: Appréciation globale */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-5 flex items-center gap-2 font-display text-lg">
                <ThumbsUp className="h-5 w-5 text-primary" />
                5. Appréciation globale
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  (1 — Insatisfait à 4 — Très satisfait)
                </span>
              </h2>
              <LikertInput
                label="Votre niveau de satisfaction globale"
                value={noteSatisfactionGlobale}
                onChange={setNoteSatisfactionGlobale}
              />
            </section>

            {/* Section 6: Commentaires */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-5 flex items-center gap-2 font-display text-lg">
                <Star className="h-5 w-5 text-primary" />
                6. Commentaires
              </h2>
              <div className="space-y-5">
                <div>
                  <Label htmlFor="pointsForts" className="mb-1.5 block text-sm font-medium">
                    Points forts
                  </Label>
                  <Textarea
                    id="pointsForts"
                    placeholder="Qu'avez-vous particulièrement apprécié ?"
                    value={pointsForts}
                    onChange={(e) => setPointsForts(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
                <div>
                  <Label htmlFor="pointsAmeliorer" className="mb-1.5 block text-sm font-medium">
                    Points à améliorer
                  </Label>
                  <Textarea
                    id="pointsAmeliorer"
                    placeholder="Selon vous, qu'est-ce qui pourrait être amélioré ?"
                    value={pointsAmeliorer}
                    onChange={(e) => setPointsAmeliorer(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
                <div>
                  <Label htmlFor="commentaire" className="mb-1.5 block text-sm font-medium">
                    Appréciation globale à propos du CFP STIR
                  </Label>
                  <StarInput label="" value={noteCfpStir} onChange={setNoteCfpStir} max={5} />
                </div>
              </div>
            </section>

            <Button
              onClick={() => mutation.mutate()}
              disabled={!allSectionsFilled || mutation.isPending || existingEval}
              className="h-12 w-full text-base"
            >
              {existingEval ? (
                "Déjà évalué"
              ) : mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Envoi en cours…
                </>
              ) : (
                "Envoyer l'évaluation"
              )}
            </Button>
          </div>
        </div>
      </PageShell>
    </ProtectedRoute>
  );
}
