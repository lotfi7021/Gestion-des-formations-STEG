import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  Loader2,
  Sparkles,
  MessageSquare,
  User as UserIcon,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFormationAiSummary, askFormationQuestion } from "@/lib/api/ai";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "summary" | "chat";

type ChatMessage = {
  role: "user" | "bot";
  text: string;
  isFallback?: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convertit le markdown basique (gras, listes, sauts) en JSX lisible */
function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;

        // Titres **bold** ou ###
        if (line.startsWith("### "))
          return (
            <p key={i} className="font-semibold text-foreground mt-2">
              {line.replace("### ", "")}
            </p>
          );
        if (line.startsWith("## "))
          return (
            <p key={i} className="font-bold text-foreground mt-3">
              {line.replace("## ", "")}
            </p>
          );

        // Listes
        if (line.startsWith("- ") || line.startsWith("• ")) {
          const content = line.replace(/^[-•]\s/, "");
          return (
            <div key={i} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span dangerouslySetInnerHTML={{ __html: inlineBold(content) }} />
            </div>
          );
        }

        // Numérotation
        const numbered = line.match(/^(\d+)\.\s(.+)/);
        if (numbered) {
          return (
            <div key={i} className="flex gap-2">
              <span className="shrink-0 font-medium text-primary">{numbered[1]}.</span>
              <span dangerouslySetInnerHTML={{ __html: inlineBold(numbered[2]) }} />
            </div>
          );
        }

        // Ligne normale
        return (
          <p key={i} dangerouslySetInnerHTML={{ __html: inlineBold(line) }} />
        );
      })}
    </div>
  );
}

function inlineBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface FormationAiAssistantProps {
  formationId: string;
  formationTitre: string;
}

export function FormationAiAssistant({
  formationId,
  formationTitre,
}: FormationAiAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("summary");

  // ── Résumé ────────────────────────────────────────────────────────────────
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryFallback, setSummaryFallback] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const handleGenerateSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const res = await getFormationAiSummary(formationId);
      setSummary(res.text);
      setSummaryFallback(res.isFallback);
    } catch (err: any) {
      setSummaryError(err.message || "Erreur lors de la génération du résumé.");
    } finally {
      setSummaryLoading(false);
    }
  };

  // ── Chat Q&A ──────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      text: `Bonjour ! Je suis votre assistant pour la formation **"${formationTitre}"**. Posez-moi une question sur le contenu de cette formation et je vous répondrai en me basant uniquement sur les documents de cours disponibles.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && activeTab === "chat") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, activeTab]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || chatLoading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setChatLoading(true);

    try {
      const res = await askFormationQuestion(formationId, q);
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: res.text, isFallback: res.isFallback },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: err.message || "Une erreur est survenue. Veuillez réessayer.",
          isFallback: true,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([
      {
        role: "bot",
        text: `Bonjour ! Je suis votre assistant pour la formation **"${formationTitre}"**. Posez-moi une question sur le contenu de cette formation.`,
      },
    ]);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* En-tête cliquable */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-6 py-4 text-left transition-colors hover:bg-secondary/50"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground">Assistant IA de la formation</p>
          <p className="text-xs text-muted-foreground">
            Résumé automatique · Questions & réponses sur le contenu
          </p>
        </div>
        <div className="text-muted-foreground">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-border">
          {/* Onglets */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("summary")}
              className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "summary"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              Résumé
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "chat"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              Poser une question
            </button>
          </div>

          {/* ── Onglet Résumé ─────────────────────────────────────────────── */}
          {activeTab === "summary" && (
            <div className="p-5 space-y-4">
              {!summary && !summaryLoading && (
                <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-6 text-center">
                  <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Générez un résumé intelligent de cette formation à partir des documents de cours partagés par le formateur.
                  </p>
                  <Button onClick={handleGenerateSummary} className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Générer le résumé
                  </Button>
                </div>
              )}

              {summaryLoading && (
                <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm">Analyse des documents en cours…</p>
                </div>
              )}

              {summaryError && (
                <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Erreur</p>
                    <p className="text-xs mt-0.5 opacity-80">{summaryError}</p>
                  </div>
                </div>
              )}

              {summary && !summaryLoading && (
                <div className="space-y-3">
                  {summaryFallback && (
                    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      Résumé généré en mode fallback (IA temporairement indisponible)
                    </div>
                  )}
                  <div className="rounded-xl border border-border bg-secondary/30 p-5">
                    <MarkdownText text={summary} />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-xs"
                      onClick={handleGenerateSummary}
                      disabled={summaryLoading}
                    >
                      <RefreshCw className="h-3 w-3" />
                      Régénérer
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Onglet Chat Q&A ───────────────────────────────────────────── */}
          {activeTab === "chat" && (
            <div className="flex flex-col">
              {/* Messages */}
              <div className="flex h-80 flex-col gap-2 overflow-y-auto p-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-secondary text-foreground rounded-tl-sm"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 opacity-70">
                        {msg.role === "bot" ? (
                          <Bot className="h-3 w-3" />
                        ) : (
                          <UserIcon className="h-3 w-3" />
                        )}
                        <span className="text-[10px]">
                          {msg.role === "bot" ? "Assistant IA" : "Vous"}
                        </span>
                        {msg.isFallback && (
                          <span className="text-[10px] opacity-60">(fallback)</span>
                        )}
                      </div>
                      {msg.role === "bot" ? (
                        <MarkdownText text={msg.text} />
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-secondary px-4 py-2.5 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Analyse en cours…
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Avertissement RAG */}
              <div className="mx-4 mb-2 flex items-center gap-1.5 rounded-lg bg-secondary/50 px-3 py-1.5 text-[11px] text-muted-foreground">
                <Bot className="h-3 w-3 shrink-0" />
                Les réponses sont basées uniquement sur les documents de cette formation.
              </div>

              {/* Input */}
              <div className="border-t border-border p-3">
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder="Posez une question sur la formation…"
                    disabled={chatLoading}
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                  />
                  <button
                    onClick={handleSend}
                    disabled={chatLoading || !input.trim()}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    {chatLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={resetChat}
                    title="Effacer la conversation"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
