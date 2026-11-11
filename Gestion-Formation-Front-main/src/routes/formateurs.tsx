import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/protected-route";
import { PageShell } from "@/components/page-shell";
import { getFormateurs, type Formateur } from "@/lib/api/formateurs";

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-4 w-4 ${s <= Math.round(value) ? "fill-ochre text-ochre" : "text-muted-foreground/20"}`}
        />
      ))}
    </div>
  );
}

export const Route = createFileRoute("/formateurs")({
  head: () => ({
    meta: [
      { title: "Nos formateurs — steg_form" },
      { name: "description", content: "Découvrez les experts qui animent nos formations." },
    ],
  }),
  component: TrainersPage,
});

function TrainersPage() {
  const { data: formateurs, isLoading } = useQuery({
    queryKey: ["formateurs"],
    queryFn: getFormateurs,
  });

  return (
    <ProtectedRoute>
      <PageShell>
        <section className="border-b border-border bg-card/50">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Formateurs</p>
            <h1 className="mt-2 font-display text-5xl md:text-6xl">
              Des experts <em className="text-primary">passionnés</em>.
            </h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Nos formateurs combinent expérience terrain et pédagogie active. Chaque session est
              évaluée par les participants.
            </p>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-6 py-16">
          {isLoading ? (
            <div className="flex justify-center py-16 text-muted-foreground">Chargement...</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {formateurs?.length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  Aucun formateur pour le moment
                </div>
              )}
              {formateurs?.map((t) => (
                <article
                  key={t.id}
                  className="rounded-xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-primary font-display text-xl text-primary-foreground">
                      {t.prenom?.[0]}
                      {t.nom?.[0]}
                    </div>
                    <div>
                      <h3 className="font-display text-xl">
                        {t.prenom} {t.nom}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t.specialites || "Formateur"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
                    <div className="flex items-center gap-2">
                      <StarRating value={t.noteGlobale} />
                      <span className="text-xs text-muted-foreground">
                        ({t.noteGlobale ?? "—"})
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      {t.sessionsAsFormateur?.length || 0} sessions
                    </span>
                    <span className="text-muted-foreground">{t.email}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </PageShell>
    </ProtectedRoute>
  );
}
