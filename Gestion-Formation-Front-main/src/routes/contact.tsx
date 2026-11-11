import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — steg_form" },
      { name: "description", content: "Discutons de votre projet formation." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <PageShell>
      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Contact</p>
          <h1 className="mt-2 font-display text-5xl md:text-6xl">Parlons de votre projet.</h1>
          <p className="mt-4 text-muted-foreground">
            Réponse sous 24h ouvrées. Nos équipes vous proposent une démo personnalisée selon vos
            besoins.
          </p>
          <div className="mt-10 space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-primary" /> contact-formation@steg.tn
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-primary" /> +216 72 000 000
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-primary" /> Direction de la Formation, Bizerte
            </div>
          </div>
        </div>
        <form className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Prénom" placeholder="Marie" />
            <Field label="Nom" placeholder="Durand" />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="E-mail pro" placeholder="marie@entreprise.fr" type="email" />
            <Field label="Entreprise" placeholder="Acme SA" />
          </div>
          <div className="mt-4">
            <label className="text-sm font-medium">Votre message</label>
            <textarea
              rows={5}
              placeholder="Décrivez votre besoin en formation…"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            type="button"
            className="mt-6 w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Envoyer ma demande
          </button>
        </form>
      </section>
    </PageShell>
  );
}

function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        {...props}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}
