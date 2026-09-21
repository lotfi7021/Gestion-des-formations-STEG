import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ProtectedRoute } from "@/components/protected-route";
import { PageShell } from "@/components/page-shell";
import { getFormations } from "@/lib/api/formations";
import { API_URL } from "@/lib/api/client";

/** Construit la liste de boutons : 1 … 4 5 6 … 12 (ellipses intelligentes). */
function pageNumbers(current: number, total: number): (number | "…")[] {
  const pages: (number | "…")[] = [];
  const push = (n: number | "…") => pages.push(n);

  if (total <= 7) {
    for (let i = 1; i <= total; i++) push(i);
    return pages;
  }

  push(1);
  if (current > 3) push("…");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) push(i);
  if (current < total - 2) push("…");
  push(total);
  return pages;
}

export const Route = createFileRoute("/catalogue")({
  validateSearch: (search: Record<string, unknown>): { page?: number } => ({
    page: search.page ? Number(search.page) : undefined,
  }),
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

/** Nombre de formations par page. */
const PAGE_SIZE = 9;

function CataloguePage() {
  const navigate = useNavigate();
  const { data: formations, isLoading } = useQuery({
    queryKey: ["formations"],
    queryFn: () => getFormations(),
  });
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Toutes");

  // Page courante synchronisée avec l'URL (?page=2) — partageable et robuste au back/forward
  const pageParam = Route.useSearch().page;
  const page = Math.max(1, Number(pageParam) || 1);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Si l'URL pointe vers une page qui n'existe plus (recherche/filtre réduits), on revient à 1
  useEffect(() => {
    if (page > totalPages) navigate({ to: "/catalogue", search: { page: 1 }, replace: true });
  }, [page, totalPages, navigate]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  const goToPage = (p: number) => {
    navigate({ to: "/catalogue", search: { page: p }, replace: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <ProtectedRoute>
      <PageShell>
        <section className="relative mx-auto max-w-7xl px-6 pt-16 pb-10">
          <div
            className="pointer-events-none absolute -top-20 right-[-5%] h-72 w-72 rounded-full bg-gradient-to-br from-primary/15 to-sky/10 blur-3xl"
            aria-hidden
          />
          <div className="animate-fade-up text-xs uppercase tracking-widest text-muted-foreground">
            Catalogue
          </div>
          <h1
            className="animate-fade-up mt-3 font-display text-5xl md:text-6xl"
            style={{ "--anim-delay": "80ms" } as React.CSSProperties}
          >
            {isLoading
              ? "..."
              : `${filtered.length} formation${filtered.length > 1 ? "s" : ""} à explorer`}
          </h1>
          {totalPages > 1 && (
            <p className="animate-fade-up mt-2 text-sm text-muted-foreground">
              Page {page} sur {totalPages}
            </p>
          )}
          <div
            className="animate-fade-up mt-10 flex flex-wrap items-center gap-3"
            style={{ "--anim-delay": "160ms" } as React.CSSProperties}
          >
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher une formation, une compétence..."
              className="h-11 max-w-md rounded-full bg-background shadow-[var(--shadow-soft)] transition-shadow focus-visible:shadow-[var(--shadow-glow)]"
            />
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`rounded-full border px-4 py-1.5 text-sm transition-all duration-200 ${
                    cat === c
                      ? "border-primary bg-gradient-to-r from-primary to-sky text-white shadow-[var(--shadow-soft)]"
                      : "border-border bg-card hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
                  <div className="skeleton aspect-[5/3] w-full" />
                  <div className="p-6">
                    <div className="skeleton h-4 w-1/3" />
                    <div className="skeleton mt-3 h-6 w-3/4" />
                    <div className="skeleton mt-2 h-4 w-full" />
                    <div className="skeleton mt-6 h-5 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <p className="text-muted-foreground">
                Aucune formation ne correspond à votre recherche.
              </p>
              {(q !== "" || cat !== "Toutes") && (
                <button
                  onClick={() => {
                    setQ("");
                    setCat("Toutes");
                    goToPage(1);
                  }}
                  className="mt-4 text-sm font-medium text-primary hover:underline"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          ) : (
            <div key={page} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {paginated.map((f, i) => (
                <Link
                  key={f.id}
                  to="/formations/$id"
                  params={{ id: f.id }}
                  style={{ "--reveal-delay": `${Math.min(i, 8) * 60}ms` } as React.CSSProperties}
                  className="reveal group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-[var(--shadow-lift)]"
                >
                  <div className="aspect-[5/3] overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                    {f.imageUrl ? (
                      <div className="relative">
                        <img
                          src={`${API_URL}${f.imageUrl}`}
                          alt={f.titre}
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-primary/25 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      </div>
                    ) : (
                      <span className="font-display text-6xl text-muted-foreground/20 transition-transform duration-500 group-hover:scale-110">
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
                    <h3 className="mt-3 font-display text-2xl leading-tight transition-colors duration-300 group-hover:text-primary">
                      {f.titre}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {f.description}
                    </p>
                    <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                      <span className="font-display text-xl">
                        {f.tarif ? `${f.tarif} DT` : "Sur devis"}
                      </span>
                      <span className="group inline-flex items-center gap-1 text-sm font-medium text-primary">
                        Voir
                        <span className="transition-transform duration-300 group-hover:translate-x-1">
                          →
                        </span>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-1.5">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                aria-label="Page précédente"
                className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground transition-all hover:border-primary/40 hover:text-primary disabled:opacity-40 disabled:hover:border-border disabled:hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {pageNumbers(page, totalPages).map((p, idx) =>
                p === "…" ? (
                  <span key={`ellipsis-${idx}`} className="px-1.5 text-sm text-muted-foreground">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goToPage(p as number)}
                    aria-current={p === page ? "page" : undefined}
                    className={`h-10 min-w-10 rounded-full px-3 text-sm font-medium transition-all ${
                      p === page
                        ? "bg-gradient-to-r from-primary to-sky text-white shadow-[var(--shadow-soft)]"
                        : "border border-border bg-card text-foreground hover:border-primary/40 hover:text-primary"
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}

              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                aria-label="Page suivante"
                className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground transition-all hover:border-primary/40 hover:text-primary disabled:opacity-40 disabled:hover:border-border disabled:hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </nav>
          )}
        </section>
      </PageShell>
    </ProtectedRoute>
  );
}
