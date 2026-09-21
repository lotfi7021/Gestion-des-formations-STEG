import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  GraduationCap,
  QrCode,
  ShieldCheck,
  Users,
  Lock,
  Loader2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/page-shell";
import { useAuth } from "@/contexts/auth-context";
import { getFormations } from "@/lib/api/formations";
import { API_URL } from "@/lib/api/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "steg_form — Gestion intelligente des formations STEG" },
      {
        name: "description",
        content:
          "Pilotez intra, inter et catalogue depuis une seule plateforme : sessions, formateurs, certificats, signatures.",
      },
      { property: "og:title", content: "steg_form — Plateforme de gestion des formations STEG" },
      {
        property: "og:description",
        content: "La plateforme française pour gérer toutes vos formations professionnelles.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { isAuthenticated, user } = useAuth();
  const { data: formations, isLoading } = useQuery({
    queryKey: ["formations"],
    queryFn: () => getFormations(),
  });
  const featured = formations?.slice(0, 3) || [];

  return (
    <PageShell>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="paper-grain absolute inset-0 opacity-60" aria-hidden />
        {/* Ambient gradient blobs */}
        <div
          className="pointer-events-none absolute -top-32 right-[-10%] h-[480px] w-[480px] rounded-full bg-gradient-to-br from-primary/20 to-sky/10 blur-3xl"
          aria-hidden
        />
        <div
          className="animate-float-slow pointer-events-none absolute top-40 left-[-8%] h-[320px] w-[320px] rounded-full bg-gradient-to-br from-ochre/15 to-transparent blur-3xl"
          aria-hidden
        />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 pb-24 pt-20 md:grid-cols-12 md:pt-28">
          <div className="md:col-span-7">
            <span
              className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-[var(--shadow-soft)]"
              style={{ "--anim-delay": "0ms" } as React.CSSProperties}
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ochre" /> Nouvelle version
              · Juin 2026
            </span>
            <h1
              className="animate-fade-up mt-6 font-display text-5xl leading-[1.05] text-foreground md:text-7xl"
              style={{ "--anim-delay": "80ms" } as React.CSSProperties}
            >
              Toute votre <em className="text-gradient-brand">ingénierie de formation</em>, dans une
              seule plateforme.
            </h1>
            <p
              className="animate-fade-up mt-6 max-w-xl text-lg text-muted-foreground"
              style={{ "--anim-delay": "160ms" } as React.CSSProperties}
            >
              steg_form centralise vos sessions intra, inter et catalogue : planification,
              convocations, présences, certificats signés et QR-code de vérification.
            </p>
            <div
              className="animate-fade-up mt-8 flex flex-wrap items-center gap-3"
              style={{ "--anim-delay": "240ms" } as React.CSSProperties}
            >
              {isAuthenticated ? (
                <>
                  <Link
                    to="/catalogue"
                    className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-sky px-6 py-3 text-sm font-medium text-white shadow-[var(--shadow-soft)] transition-all duration-300 hover:shadow-[var(--shadow-glow)] hover:brightness-110"
                  >
                    Découvrir le catalogue
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                  {user?.role === "admin" && <SecondaryLink to="/admin" label="Administration" />}
                  {user?.role === "formateur" && (
                    <SecondaryLink to="/formateur/dashboard" label="Mes sessions" />
                  )}
                </>
              ) : (
                <>
                  <Link
                    to="/connexion"
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-sky px-6 py-3 text-sm font-medium text-white shadow-[var(--shadow-soft)] transition-all duration-300 hover:shadow-[var(--shadow-glow)] hover:brightness-110"
                  >
                    Accéder à la plateforme <Lock className="h-4 w-4" />
                  </Link>
                  <SecondaryLink to="/contact" label="Demander une démo" />
                </>
              )}
            </div>
            <dl
              className="animate-fade-up mt-12 grid max-w-lg grid-cols-3 gap-6"
              style={{ "--anim-delay": "320ms" } as React.CSSProperties}
            >
              {[
                { k: `${formations?.length || 240}+`, v: "Formations actives" },
                { k: "92", v: "Formateurs certifiés" },
                { k: "98%", v: "Taux de satisfaction" },
              ].map((s) => (
                <div key={s.v}>
                  <dt className="font-display text-4xl text-gradient-brand">{s.k}</dt>
                  <dd className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                    {s.v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div
            className="animate-fade-up md:col-span-5"
            style={{ "--anim-delay": "200ms" } as React.CSSProperties}
          >
            <div className="card-sheen relative rounded-2xl p-6 shadow-[var(--shadow-deep)] transition-transform duration-500 hover:-translate-y-1">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Prochaine session
                  </p>
                  <p className="font-display text-2xl">Cybersécurité — Fondamentaux</p>
                </div>
                <span className="rounded-md bg-ochre/20 px-2 py-1 text-xs font-medium text-ochre-foreground">
                  Inter
                </span>
              </div>
              <div className="mt-5 space-y-3 text-sm">
                <Row icon={<Calendar className="h-4 w-4" />} label="22 juin 2026 · 9h – 17h" />
                <Row icon={<Users className="h-4 w-4" />} label="15 / 20 participants" />
                <Row
                  icon={<GraduationCap className="h-4 w-4" />}
                  label="Idriss Bennani, expert SSI"
                />
                <Row
                  icon={<ShieldCheck className="h-4 w-4" />}
                  label="Certificat signé électroniquement"
                />
              </div>
              <div className="mt-5 rounded-lg bg-secondary p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    Présences du jour
                  </span>
                  <span className="font-display text-2xl text-primary">14/15</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full w-[93%] rounded-full bg-gradient-to-r from-primary to-sky"
                    style={{ animation: "fade-up 1s var(--ease-out-expo) 0.6s both" }}
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                <QrCode className="h-8 w-8 shrink-0 text-primary" />
                Vérifiez l'authenticité d'un certificat en scannant son QR-code.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-border bg-card/50">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-10 md:grid-cols-12 md:gap-16">
            <div className="reveal md:col-span-4">
              <h2 className="font-display text-4xl leading-tight md:text-5xl">
                Une plateforme,
                <br />
                <em className="text-gradient-brand">cinq métiers</em> couverts.
              </h2>
              <p className="mt-4 text-muted-foreground">
                De l'organisation pédagogique à la conformité documentaire, steg_form accompagne
                chaque étape du cycle de formation.
              </p>
            </div>
            <div className="grid gap-6 md:col-span-8 md:grid-cols-2">
              {features.map((f, i) => (
                <article
                  key={f.title}
                  className="reveal group rounded-xl border border-border bg-background p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[var(--shadow-lift)]"
                  style={{ "--reveal-delay": `${i * 90}ms` } as React.CSSProperties}
                >
                  <span className="grid h-11 w-11 place-items-center rounded-lg bg-gradient-to-br from-primary to-sky text-white shadow-[var(--shadow-soft)] transition-transform duration-300 group-hover:scale-110">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-display text-2xl">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured catalog */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="reveal flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Catalogue</p>
            <h2 className="mt-1 font-display text-4xl md:text-5xl">Formations à l'affiche</h2>
          </div>
          {isAuthenticated && (
            <Link
              to="/catalogue"
              className="group hidden items-center gap-1 text-sm font-medium text-primary md:inline-flex"
            >
              Voir tout
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          )}
        </div>
        {isLoading ? (
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-6">
                <div className="skeleton aspect-video w-full" />
                <div className="skeleton mt-4 h-5 w-3/4" />
                <div className="skeleton mt-3 h-4 w-full" />
                <div className="skeleton mt-2 h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {featured.map((f, i) => {
              const Wrapper = isAuthenticated ? Link : "div";
              const wrapperProps = isAuthenticated
                ? {
                    to: "/formations/$id" as const,
                    params: { id: f.id },
                    className:
                      "reveal group flex flex-col rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-[var(--shadow-lift)]",
                  }
                : {
                    className:
                      "reveal flex flex-col rounded-xl border border-border bg-card p-6 opacity-80",
                  };
              return (
                <Wrapper
                  key={f.id}
                  {...(wrapperProps as any)}
                  style={{ "--reveal-delay": `${i * 100}ms` } as React.CSSProperties}
                >
                  {f.imageUrl ? (
                    <div className="relative mb-4 aspect-video overflow-hidden rounded-lg">
                      <img
                        src={`${API_URL}${f.imageUrl}`}
                        alt={f.titre}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    </div>
                  ) : (
                    <div className="mb-4 flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary/10 to-sky/10">
                      <span className="font-display text-6xl text-muted-foreground/20 transition-transform duration-500 group-hover:scale-110">
                        {f.titre?.[0]}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="rounded-md bg-secondary px-2 py-1 font-medium text-secondary-foreground">
                      {f.categorie || "Général"}
                    </span>
                    <span className="text-muted-foreground">{f.type}</span>
                  </div>
                  <h3 className="mt-4 font-display text-2xl leading-tight">{f.titre}</h3>
                  <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{f.description}</p>
                  <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-sm">
                    <span className="text-muted-foreground">
                      {f.dureeEnJours ? `${f.dureeEnJours}j` : "—"}
                    </span>
                    <span className="font-display text-xl text-primary">
                      {f.tarif ? `${f.tarif} DT` : "Sur devis"}
                    </span>
                  </div>
                </Wrapper>
              );
            })}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="reveal relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-sky px-8 py-16 text-white shadow-[var(--shadow-deep)] md:px-16">
          <div className="paper-grain absolute inset-0 opacity-20" aria-hidden />
          <div
            className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl"
            aria-hidden
          />
          <div className="relative grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="font-display text-4xl md:text-5xl">
                Prêt à digitaliser votre service formation ?
              </h2>
              <p className="mt-4 text-white/80">
                Démo personnalisée en 30 minutes. Sans engagement.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Link
                to="/contact"
                className="rounded-full bg-white px-6 py-3 text-sm font-medium text-primary shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
              >
                Demander une démo
              </Link>
              <Link
                to={
                  isAuthenticated
                    ? user?.role === "admin"
                      ? "/admin"
                      : user?.role === "formateur"
                        ? "/formateur/dashboard"
                        : "/catalogue"
                    : "/connexion"
                }
                className="rounded-full border border-white/30 px-6 py-3 text-sm font-medium transition-colors hover:bg-white/10"
              >
                {isAuthenticated
                  ? user?.role === "admin"
                    ? "Administration"
                    : "Mon espace"
                  : "Se connecter"}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function SecondaryLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-soft)]"
    >
      {label}
    </Link>
  );
}

function Row({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 text-foreground">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-secondary text-primary">
        {icon}
      </span>
      {label}
    </div>
  );
}

const features = [
  {
    icon: BookOpen,
    title: "Formations Intra · Inter · Catalogue",
    desc: "Configurez chaque session selon son format, ses participants, son lieu et ses livrables.",
  },
  {
    icon: Calendar,
    title: "Planning & convocations",
    desc: "Calendrier intégré, invitations automatiques et rappels e-mail aux participants.",
  },
  {
    icon: Users,
    title: "Suivi des participants",
    desc: "Historique de formation, certifications obtenues et fiches de présence en un clic.",
  },
  {
    icon: ShieldCheck,
    title: "Conformité & signatures",
    desc: "Signature électronique des certificats, QR-code de vérification, RGPD natif.",
  },
];
