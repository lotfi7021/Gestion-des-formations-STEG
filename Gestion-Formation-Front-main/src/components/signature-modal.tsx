import { useState } from "react";
import { Pen, X } from "lucide-react";
import { SignaturePad } from "./signature-pad";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { saveSignature, getLatestSignature } from "@/lib/api/signatures";
import { toast } from "sonner";

type SignatureModalProps = {
  onSigned?: () => void;
};

export function SignatureModal({ onSigned }: SignatureModalProps) {
  const [open, setOpen] = useState(false);
  const [savedSig, setSavedSig] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    setOpen(true);
    try {
      const latest = await getLatestSignature();
      if (latest) setSavedSig(latest.imageData);
    } catch {
      setSavedSig(null);
    }
  };

  const handleSave = async (imageData: string, type?: string) => {
    setLoading(true);
    try {
      await saveSignature(imageData, type);
      toast.success("Signature enregistrée");
      setSavedSig(imageData);
      onSigned?.();
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!loading) setOpen(o);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" onClick={handleOpen} className="gap-2">
          <Pen className="h-4 w-4" />{" "}
          {savedSig ? "Modifier ma signature" : "Signer électroniquement"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Signature électronique</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="mb-4 text-sm text-muted-foreground">
            Dessinez votre signature ou importez une image de signature depuis votre ordinateur.
          </p>
          <SignaturePad
            onSave={handleSave}
            savedSignature={savedSig}
            label="Dessinez votre signature ici"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
