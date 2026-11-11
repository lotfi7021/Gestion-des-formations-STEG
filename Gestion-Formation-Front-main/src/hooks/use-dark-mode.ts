import { useEffect, useState } from "react";

/**
 * Gère le thème clair/sombre : applique le thème persisté au montage et expose un
 * basculeur. Logique partagée par le bouton de thème et les pages d'authentification.
 */
export function useDarkMode() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (
      stored === "dark" ||
      (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      document.documentElement.classList.add("dark");
      setDark(true);
    }
  }, []);

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setDark(next);
  }

  return { dark, toggle };
}
