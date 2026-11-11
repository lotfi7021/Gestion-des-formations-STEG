import { useRef, useState, useEffect, useCallback } from "react";
import { Trash2, Check, Pen, Upload } from "lucide-react";

type SignaturePadProps = {
  onSave: (imageData: string, type?: string) => void;
  width?: number;
  height?: number;
  label?: string;
  savedSignature?: string | null;
};

export function SignaturePad({
  onSave,
  width = 500,
  height = 180,
  label = "Signez ici",
  savedSignature,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [saved, setSaved] = useState(!!savedSignature);
  const [mode, setMode] = useState<"draw" | "upload">("draw");
  const [signatureType, setSignatureType] = useState<string>("captured");

  const getPos = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: (e.touches[0]?.clientX ?? 0) - rect.left,
        y: (e.touches[0]?.clientY ?? 0) - rect.top,
      };
    }
    return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top };
  }, []);

  const startDraw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (mode === "upload") return;
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas || saved) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const pos = getPos(e.nativeEvent as any);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      setIsDrawing(true);
      setHasContent(true);
    },
    [getPos, saved, mode],
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (mode === "upload") return;
      e.preventDefault();
      if (!isDrawing || saved) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const pos = getPos(e.nativeEvent as any);
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#000";
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    },
    [isDrawing, getPos, saved, mode],
  );

  const endDraw = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
    setSaved(false);
    setSignatureType("captured");
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl, signatureType);
    setSaved(true);
  };

  useEffect(() => {
    if (savedSignature && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
          ctx.drawImage(img, 10, 10, canvasRef.current!.width - 20, canvasRef.current!.height - 20);
          setHasContent(true);
        }
      };
      img.src = savedSignature;
    }
  }, [savedSignature]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const scale = Math.min((canvas.width - 20) / img.width, (canvas.height - 20) / img.height);
        const x = (canvas.width - img.width * scale) / 2;
        const y = (canvas.height - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        setHasContent(true);
        setSignatureType("uploaded");
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const switchMode = (newMode: "draw" | "upload") => {
    if (newMode === mode) return;
    clear();
    setMode(newMode);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>

      <div className="flex gap-1 rounded-lg border border-border p-0.5 bg-muted/30">
        <button
          type="button"
          onClick={() => switchMode("draw")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "draw"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Pen className="h-3.5 w-3.5" /> Dessiner
        </button>
        <button
          type="button"
          onClick={() => switchMode("upload")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "upload"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Upload className="h-3.5 w-3.5" /> Importer un fichier
        </button>
      </div>

      <div className="relative overflow-hidden rounded-lg border-2 border-dashed border-border bg-background">
        {mode === "upload" && !hasContent && (
          <div
            className="flex cursor-pointer flex-col items-center justify-center gap-2"
            style={{ width, height }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-muted-foreground/40" />
            <span className="text-xs text-muted-foreground/60">
              Cliquez pour sélectionner une image (PNG, JPG)
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={`block w-full ${mode === "draw" ? "touch-none cursor-crosshair" : ""}`}
          style={{
            maxWidth: width,
            height,
            display: mode === "upload" && !hasContent ? "none" : "block",
          }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {mode === "draw" && !hasContent && !saved && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-1 text-muted-foreground/40">
              <Pen className="h-6 w-6" />
              <span className="text-xs">{label}</span>
            </div>
          </div>
        )}
      </div>
      {mode === "upload" && hasContent && (
        <p className="text-xs text-muted-foreground">
          Aperçu de l'image importée. Vous pouvez l'effacer ou la valider.
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={clear}
          disabled={!hasContent}
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs transition-colors hover:bg-secondary disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" /> Effacer
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!hasContent || saved}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
        >
          <Check className="h-3.5 w-3.5" /> {saved ? "Signé" : "Valider la signature"}
        </button>
      </div>
    </div>
  );
}
