import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, Clock, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api/errors";
import { checkIn, getCheckInInfo, type CheckInInfo } from "@/lib/api/checkin";
import { queryKeys } from "@/lib/api/query-keys";
import { requireAuth } from "@/lib/route-auth";

export const Route = createFileRoute("/check-in/$token")({
  beforeLoad: () => {
    requireAuth(["participant"]);
  },
  head: () => ({
    meta: [{ title: "Pointage — steg_form" }],
  }),
  component: CheckInPage,
});

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function CheckInPage() {
  const { token } = Route.useParams();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.checkIn(token),
    queryFn: () => getCheckInInfo(token),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: () => checkIn(token),
    onSuccess: (result) => {
      const next: CheckInInfo = {
        session: result.session,
        alreadyCheckedIn: true,
        heureArrivee: result.heureArrivee,
      };
      queryClient.setQueryData(queryKeys.checkIn(token), next);
      toast.success("Présence enregistrée");
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Impossible d'enregistrer votre présence"));
    },
  });

  return (
    <PageShell>
      <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-4 py-16">
        <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="space-y-3 text-center">
              <p className="text-lg font-semibold text-foreground">Lien invalide</p>
              <p className="text-sm text-muted-foreground">
                {getErrorMessage(error, "Ce lien de pointage n'est plus valable.")}
              </p>
              <Button asChild variant="outline">
                <Link to="/mes-formations">Voir mes formations</Link>
              </Button>
            </div>
          ) : data ? (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-primary">
                  Pointage de présence
                </p>
                <h1 className="mt-2 text-2xl font-bold text-foreground">{data.session.titre}</h1>
              </div>

              <div className="space-y-2 rounded-xl bg-secondary/50 p-4 text-sm">
                <p className="flex items-center gap-2 text-foreground">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  {formatDate(data.session.dateDebut)}
                  {data.session.dateFin &&
                    new Date(data.session.dateFin).toDateString() !==
                      new Date(data.session.dateDebut).toDateString() && (
                      <> au {formatDate(data.session.dateFin)}</>
                    )}
                </p>
                {data.session.heureDebut && (
                  <p className="flex items-center gap-2 text-foreground">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {data.session.heureDebut}
                    {data.session.heureFin ? ` - ${data.session.heureFin}` : ""}
                  </p>
                )}
                {(data.session.lieu || data.session.salle) && (
                  <p className="flex items-center gap-2 text-foreground">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {[data.session.lieu, data.session.salle].filter(Boolean).join(" - ")}
                  </p>
                )}
              </div>

              {data.alreadyCheckedIn ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  <p className="font-semibold text-emerald-700">Présence déjà enregistrée</p>
                  {data.heureArrivee && (
                    <p className="text-sm text-emerald-700">Arrivée à {data.heureArrivee}</p>
                  )}
                </div>
              ) : (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    "Confirmer ma présence"
                  )}
                </Button>
              )}

              <div className="text-center">
                <Link
                  to="/mes-formations"
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Voir mes formations
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </PageShell>
  );
}
