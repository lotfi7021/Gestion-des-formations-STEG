import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, CalendarDays, GraduationCap, Search, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getFormations } from "@/lib/api/formations";
import { getSessions } from "@/lib/api/sessions";
import { getFormateurs } from "@/lib/api/formateurs";
import { getParticipants } from "@/lib/api/users";
import { queryKeys } from "@/lib/api/query-keys";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const shortcut = isMac ? "⌘K" : "Ctrl+K";

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const { data: formations } = useQuery({
    queryKey: queryKeys.formationsAll,
    queryFn: () => getFormations({ all: true }),
  });
  const { data: sessions } = useQuery({
    queryKey: queryKeys.sessionsAll,
    queryFn: () => getSessions(true),
  });
  const { data: formateurs } = useQuery({
    queryKey: queryKeys.formateurs,
    queryFn: () => getFormateurs(),
  });
  const { data: participants } = useQuery({
    queryKey: queryKeys.participants,
    queryFn: getParticipants,
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex flex-1 items-center gap-2 rounded-lg bg-secondary px-3 py-2"
      >
        <Search className="h-4 w-4 text-muted-foreground" />
        <span className="w-full text-left text-sm text-muted-foreground">
          Rechercher (formations, participants, sessions…)
        </span>
        <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-block">
          {shortcut}
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Rechercher dans toute la plateforme…" />
        <CommandList>
          <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
          {formations && formations.length > 0 && (
            <CommandGroup heading="Formations">
              {formations.map((f) => (
                <CommandItem
                  key={f.id}
                  value={`formation-${f.titre}`}
                  onSelect={() => {
                    setOpen(false);
                    navigate({ to: "/admin/formations" });
                  }}
                >
                  <BookOpen className="h-4 w-4" />
                  <span>{f.titre}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {sessions && sessions.length > 0 && (
            <CommandGroup heading="Sessions">
              {sessions.map((s) => (
                <CommandItem
                  key={s.id}
                  value={`session-${s.formation?.titre || ""}-${s.lieu || ""}`}
                  onSelect={() => {
                    setOpen(false);
                    navigate({ to: "/admin/sessions" });
                  }}
                >
                  <CalendarDays className="h-4 w-4" />
                  <span>{s.formation?.titre || "Session"}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {new Date(s.dateDebut).toLocaleDateString("fr-FR")}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {formateurs && formateurs.length > 0 && (
            <CommandGroup heading="Formateurs">
              {formateurs.map((f) => (
                <CommandItem
                  key={f.id}
                  value={`formateur-${f.prenom}-${f.nom}-${f.email}`}
                  onSelect={() => {
                    setOpen(false);
                    navigate({ to: "/admin/formateurs" });
                  }}
                >
                  <GraduationCap className="h-4 w-4" />
                  <span>{f.prenom + " " + f.nom}</span>
                  <span className="text-xs text-muted-foreground ml-2">{f.email}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {participants && participants.length > 0 && (
            <CommandGroup heading="Participants">
              {participants.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`participant-${p.prenom}-${p.nom}-${p.email}`}
                  onSelect={() => {
                    setOpen(false);
                    navigate({ to: "/admin/participants" });
                  }}
                >
                  <Users className="h-4 w-4" />
                  <span>{p.prenom + " " + p.nom}</span>
                  <span className="text-xs text-muted-foreground ml-2">{p.email}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
