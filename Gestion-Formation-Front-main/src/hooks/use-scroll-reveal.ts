import { useEffect } from "react";

/**
 * Global scroll-reveal: observes every element carrying the `.reveal` class
 * and adds `.is-visible` when it enters the viewport.
 *
 * Mount it once near the app root (PageShell). Elements added later
 * (e.g. after data loads) are picked up by the MutationObserver.
 * Respects prefers-reduced-motion — CSS handles the no-animation case.
 */
export function useScrollReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    const observeAll = () => {
      document.querySelectorAll<HTMLElement>(".reveal:not(.is-visible)").forEach((el) => {
        observer.observe(el);
      });
    };

    observeAll();

    // Catch elements mounted later (query results, route changes...)
    const mutation = new MutationObserver(() => observeAll());
    mutation.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutation.disconnect();
    };
  }, []);
}
