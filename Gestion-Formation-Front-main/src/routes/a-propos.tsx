import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/a-propos")({
  head: () => ({
    meta: [
      { title: "À propos — steg_form" },
      {
        name: "description",
        content: "Notre mission : simplifier la gestion de la formation professionnelle.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <PageShell>
      <section className="mx-auto max-w-4xl px-6 py-20">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">À propos</p>
        <h1 className="mt-2 font-display text-5xl md:text-7xl">
          La STEG forme ses agents <em className="text-primary">avec excellence</em>.
        </h1>
        <div className="mt-10 space-y-6 text-lg leading-relaxed text-muted-foreground">
          <p>
            La Société Tunisienne de l'Électricité et du Gaz (STEG) a mis en place steg_form pour
            moderniser la gestion de la formation au sein de ses directions et districts.
          </p>
          <p>
            Ce portail centralise l'ensemble du cycle de formation : habilitations électriques,
            sécurité industrielle, normes ISO, et développement des compétences de ses agents.
          </p>
          <p>
            Le centre de formation de Bizerte intervient pour coordonner les sessions et garantir
            la conformité des habilitations obligatoires.
          </p>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            { k: "1958", v: "Création de la STEG" },
            { k: "450+", v: "Agents formés par an" },
            { k: "35", v: "Formations techniques" },
          ].map((s) => (
            <div key={s.v} className="rounded-xl border border-border bg-card p-6">
              <div className="font-display text-4xl text-primary">{s.k}</div>
              <p className="mt-1 text-sm text-muted-foreground">{s.v}</p>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
