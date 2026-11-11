import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { ProtectedRoute } from "@/components/protected-route";
import { PageShell } from "@/components/page-shell";
import { getFormations } from "@/lib/api/formations";
import { API_URL } from "@/lib/api/client";

export const Route = createFileRoute("/catalogue")({
  head: () => ({
    meta: [
      { title: "Catalogue — steg_form" },
      {
        name: "description",
        content: "Toutes les formations STEG : habilitations, sécurité, gaz, normes, soft skills.",
      },
    ],
  }),
  component: CataloguePage,
});

function CataloguePage() {
  const { data: formations, isLoading } = useQuery({
    queryKey: ["formations"],
    queryFn: getFormations,
  });
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Toutes");

  const categories = useMemo(
    () => [
      "Toutes",
      ...Array.from(new Set((formations ?? []).map((f) => f.categorie).filter(Boolean))),
    ],
    [formations],
  );

  const filtered = useMemo(
    () =>
      (formations ?? []).filter(
        (f) =>
          (cat === "Toutes" || f.categorie === cat) &&
          (q === "" || `${f.titre} ${f.description}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [formations, q, cat],
  );

  return (
    <ProtectedRoute>
      <PageShell>
        <section className="mx-auto max-w-7xl px-6 pt-16 pb-10">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Catalogue</div>
          <h1 className="mt-3 font-display text-5xl md:text-6xl">
            {isLoading
              ? "..."
              : `${filtered.length} formation${filtered.length > 1 ? "s" : ""} à explorer`}
          </h1>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher une formation, une compétence..."
              className="h-11 max-w-md rounded-full bg-background"
            />
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`rounded-full border px-4 py-1.5 text-sm transition ${
                    cat === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-foreground/40"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-24">
          {isLoading ? (
            <div className="flex justify-center py-16 text-muted-foreground">Chargement...</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((f) => (
                <Link
                  key={f.id}
                  to="/formations/$id"
                  params={{ id: f.id }}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:shadow-[var(--shadow-soft)]"
                >
                  <div className="aspect-[5/3] overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                    {f.imageUrl ? (
                      <img
                        src={`${API_URL}${f.imageUrl}`}
                        alt={f.titre}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <span className="font-display text-5xl text-muted-foreground/20">
                        {f.titre[0]}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="uppercase tracking-widest">{f.categorie || "Général"}</span>
                      <span className="capitalize">
                        {f.type} · {f.dureeEnJours}j
                      </span>
                    </div>
                    <h3 className="mt-3 font-display text-2xl leading-tight">{f.titre}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {f.description}
                    </p>
                    <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                      <span className="font-display text-xl">
                        {f.tarif ? `${f.tarif} DT` : "Sur devis"}
                      </span>
                      <span className="text-sm text-muted-foreground">Voir →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </PageShell>
    </ProtectedRoute>
  );
}
