import { useEffect, useState, type ReactNode } from "react";
import { ArrowUp } from "lucide-react";
import { SiteFooter, SiteHeader } from "./site-header";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

export function PageShell({ children }: { children: ReactNode }) {
  useScrollReveal();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      {children}
      <SiteFooter />
      <BackToTop />
    </div>
  );
}

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Retour en haut"
      className={`fixed bottom-6 right-6 z-50 grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-foreground shadow-[var(--shadow-soft)] transition-all duration-300 hover:border-primary/50 hover:text-primary ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
