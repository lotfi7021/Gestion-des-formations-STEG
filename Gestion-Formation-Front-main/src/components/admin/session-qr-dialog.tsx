import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Download, Loader2, QrCode } from "lucide-react";
import { toast } from "sonner";
import { getSessionCheckIn } from "@/lib/api/checkin";
import { queryKeys } from "@/lib/api/query-keys";
import { getErrorMessage } from "@/lib/api/errors";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SessionQrDialogProps {
  sessionId: string;
  titre?: string;
}

export function SessionQrDialog({ sessionId, titre }: SessionQrDialogProps) {
  const [open, setOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.sessionCheckIn(sessionId),
    queryFn: () => getSessionCheckIn(sessionId),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  async function copyLink() {
    if (!data?.url) return;
    try {
      await navigator.clipboard.writeText(data.url);
      toast.success("Lien de pointage copié");
    } catch {
      toast.error("Impossible de copier le lien");
    }
  }

  const fileBase = (titre || "session").replace(/[^a-zA-Z0-9]/g, "_");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-border bg-background p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
        title="QR code de pointage"
      >
        <QrCode className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pointage par QR code</DialogTitle>
            <DialogDescription>
              {titre || "Session"} — les participants scannent ce code pour pointer leur présence.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="py-6 text-center text-sm text-destructive">
              {getErrorMessage(error, "Impossible de générer le QR code")}
            </p>
          ) : data ? (
            <div className="space-y-4">
              <div className="flex justify-center rounded-xl border border-border bg-white p-4">
                <img src={data.qrCodeDataUrl} alt="QR code de pointage" className="h-56 w-56" />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Lien de pointage</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={data.url}
                    className="min-w-0 flex-1 rounded-md border border-border bg-secondary/50 px-3 py-2 text-xs"
                  />
                  <button
                    type="button"
                    onClick={copyLink}
                    className="rounded-md border border-border p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    title="Copier le lien"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <a
                    href={data.qrCodeDataUrl}
                    download={`qr_pointage_${fileBase}.png`}
                    className="rounded-md border border-border p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    title="Télécharger le QR code"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Le pointage est ouvert uniquement pendant les dates de la session, pour les
                participants inscrits.
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
