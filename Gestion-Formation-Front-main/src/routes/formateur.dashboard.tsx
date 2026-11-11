import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  Loader2,
  ArrowUpRight,
  Moon,
  Sun,
  FileText,
  Upload,
  Download,
  ChevronDown,
  ChevronUp,
  Paperclip,
} from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { PageShell } from "@/components/page-shell";
import { useAuth } from "@/contexts/auth-context";
import { API_URL, API_BASE } from "@/lib/api/client";
import { getMySessions } from "@/lib/api/sessions";
import {
  getSessionDocuments,
  uploadSessionDocument,
  type SessionDocument,
} from "@/lib/api/session-documents";
import { toast } from "sonner";

export const Route = createFileRoute("/formateur/dashboard")({
  component: () => (
    <ProtectedRoute requiredRole="formateur">
      <FormateurDashboard />
    </ProtectedRoute>
  ),
});

function FormateurDashboard() {
  const { user } = useAuth();
  const { data: mesSessions, isLoading } = useQuery({
    queryKey: ["my-sessions"],
    queryFn: () => getMySessions(),
  });

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-4xl">Mes sessions</h1>
            <p className="mt-1 text-muted-foreground">
              Sessions où vous intervenez en tant que formateur.
            </p>
          </div>
          <Link to="/mes-formations" className="text-sm text-primary hover:underline">
            Voir mes formations suivies →
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !mesSessions || mesSessions.length === 0 ? (
          <div className="mt-10 rounded-xl border border-border bg-card p-12 text-center">
            <Calendar className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Aucune session pour le moment</p>
            <Link
              to="/catalogue"
              className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Voir le catalogue <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mesSessions.map((s: any) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

function SessionCard({ session }: { session: any }) {
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: documents } = useQuery({
    queryKey: ["session-documents", session.id],
    queryFn: () => getSessionDocuments(session.id),
    enabled: expanded,
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadSessionDocument(session.id, file);
      toast.success("Document ajouté");
      queryClient.invalidateQueries({ queryKey: ["session-documents", session.id] });
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">
          {session.formation?.type || "Formation"}
        </span>
        <span className="text-xs text-muted-foreground">
          {session.participants?.length || 0} inscrits
        </span>
      </div>
      {session.formation?.imageUrl ? (
        <div className="mt-3 overflow-hidden rounded-lg aspect-video">
          <img
            src={`${API_URL}${session.formation.imageUrl}`}
            alt={session.formation.titre}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-lg aspect-video bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
          <span className="font-display text-4xl text-muted-foreground/20">
            {session.formation?.titre?.[0] || "F"}
          </span>
        </div>
      )}
      <h3 className="mt-3 font-display text-xl">{session.formation?.titre || "Formation"}</h3>
      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {new Date(session.dateDebut).toLocaleDateString("fr-FR")}
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {session.lieu || "Non défini"}
        </div>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-4 flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <span className="flex items-center gap-2">
          <Paperclip className="h-4 w-4" /> Documents
        </span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
            <Upload className="h-4 w-4" />
            {uploading ? "Upload..." : "Ajouter un document"}
            <input
              type="file"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
              accept=".pdf,.ppt,.pptx,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif"
            />
          </label>

          {documents?.length === 0 && (
            <p className="text-center text-xs text-muted-foreground">Aucun document</p>
          )}

          {documents?.map((doc: SessionDocument) => {
            const token = localStorage.getItem("access_token");
            return (
              <a
                key={doc.id}
                href={`${API_BASE}/sessions/${session.id}/documents/${doc.id}/download?token=${token}`}
                className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-secondary"
              >
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <span className="flex-1 truncate">{doc.originalName}</span>
                <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DarkModeToggle() {
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

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-md border border-border p-2 text-foreground transition-colors hover:bg-secondary"
      title={dark ? "Mode clair" : "Mode sombre"}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
