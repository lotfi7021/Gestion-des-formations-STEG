import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { generateCertificateText } from "@/lib/api/ai";
import { getCertificates } from "@/lib/api/certificates";
import { queryKeys } from "@/lib/api/query-keys";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CertificateTextDialogProps = {
  open: boolean;
  sessionId: string;
  onClose: () => void;
};

export function CertificateTextDialog({ open, sessionId, onClose }: CertificateTextDialogProps) {
  const [certificateId, setCertificateId] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [text, setText] = useState("");
  const [isFallback, setIsFallback] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: allCertificates } = useQuery({
    queryKey: queryKeys.certificates,
    queryFn: getCertificates,
    enabled: open,
  });

  const handleGenerate = async () => {
    if (!certificateId) return;
    setLoading(true);
    try {
      const result = await generateCertificateText(certificateId);
      setText(result.text);
      setIsFallback(result.isFallback);
      if (result.isFallback) {
        toast.warning("Texte généré en mode fallback (IA indisponible)");
      } else {
        toast.success("Texte de certificat généré avec succès");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la génération");
    } finally {
      setLoading(false);
    }
  };

  const copyText = () => {
    if (text) {
      navigator.clipboard.writeText(text).then(() => toast.success("Texte copié"));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600" />
            Texte de certificat IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Sélectionnez un certificat déjà généré pour cette session. Claude rédigera un texte
            personnalisé basé sur la formation, le taux d'assiduité et les évaluations.
          </p>

          <div className="space-y-1.5">
            <Label>Certificat du participant</Label>
            <Select
              value={certificateId}
              onValueChange={(certId) => {
                const cert = allCertificates?.find((c) => c.id === certId);
                setParticipantName(cert ? `${cert.user.prenom} ${cert.user.nom}` : "");
                setCertificateId(certId);
                setText("");
                setIsFallback(false);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir un certificat..." />
              </SelectTrigger>
              <SelectContent>
                {allCertificates
                  ?.filter((c) => c.session?.id === sessionId)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.user.prenom} {c.user.nom} — {c.numeroCertificat}
                    </SelectItem>
                  ))}
                {allCertificates?.filter((c) => c.session?.id === sessionId).length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    Aucun certificat pour cette session. Générez-les d'abord.
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading || !certificateId}
            className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading ? "Génération en cours…" : "Générer le texte via Claude"}
          </Button>

          {text && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Texte généré</span>
                  {isFallback ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                      Fallback
                    </span>
                  ) : (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                      Claude IA
                    </span>
                  )}
                </div>
                <button
                  onClick={copyText}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copier
                </button>
              </div>

              <div className="rounded-lg border-2 border-dashed border-violet-200 bg-violet-50/40 p-6">
                <div className="mb-3 text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">
                    Aperçu certificat
                  </p>
                  {participantName && (
                    <p className="mt-1 text-lg font-bold text-foreground">{participantName}</p>
                  )}
                </div>
                <div className="rounded bg-white p-4 shadow-sm">
                  <p className="mb-2 text-xs font-medium text-muted-foreground italic">
                    Nous certifions que…
                  </p>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={10}
                    className="w-full resize-y rounded border border-border bg-transparent px-2 py-1 text-sm leading-relaxed text-foreground outline-none focus:border-violet-400"
                    placeholder="Le texte généré apparaîtra ici…"
                  />
                </div>
                <p className="mt-2 text-center text-[10px] text-muted-foreground">
                  Éditez le texte ci-dessus avant de l'utiliser dans le PDF final.
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={loading || !certificateId}
                  className="flex-1 gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Régénérer
                </Button>
                <Button onClick={copyText} variant="outline" className="flex-1 gap-2">
                  <Copy className="h-4 w-4" />
                  Copier le texte
                </Button>
                <Button onClick={onClose} variant="ghost" className="gap-2">
                  <X className="h-4 w-4" />
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
