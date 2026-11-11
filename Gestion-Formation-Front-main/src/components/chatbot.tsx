import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Bot, User as UserIcon, Trash2 } from "lucide-react";
import { useAuth } from "../contexts/auth-context";
import { api } from "../lib/api/client";

type Message = {
  role: "user" | "bot";
  text: string;
};

export function ChatBot() {
  const { isAuthenticated, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: `Bonjour${isAuthenticated && user ? ` ${user.prenom || user.username}` : ""} ! Je suis l'assistant steg_form. ${!isAuthenticated ? "Connectez-vous pour profiter de mes services." : getRoleMessage(user?.role)}`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const userIdRef = useRef(user?.id);

  useEffect(() => {
    if (user?.id !== userIdRef.current) {
      userIdRef.current = user?.id;
      setMessages([
        {
          role: "bot",
          text: `Bonjour${isAuthenticated && user ? ` ${user.prenom || user.username}` : ""} ! Je suis l'assistant steg_form. ${!isAuthenticated ? "Connectez-vous pour profiter de mes services." : getRoleMessage(user?.role)}`,
        },
      ]);
    }
  }, [user?.id, user?.role, isAuthenticated]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const resetConversation = () => {
    setMessages([
      {
        role: "bot",
        text: `Bonjour${isAuthenticated && user ? ` ${user.prenom || user.username}` : ""} ! Je suis l'assistant steg_form. ${!isAuthenticated ? "Connectez-vous pour profiter de mes services." : getRoleMessage(user?.role)}`,
      },
    ]);
  };

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);

    try {
      const res = await api.post<{ answer: string }>("/chatbot/ask", { question: q });
      setMessages((prev) => [...prev, { role: "bot", text: res.answer }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: err.message || "Erreur de connexion." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:scale-105 active:scale-95"
        title="Assistant steg_form"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex w-80 flex-col rounded-2xl border border-border bg-card shadow-2xl sm:w-96">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Assistant steg_form</p>
              <p className="text-[10px] text-muted-foreground">
                {isAuthenticated && user ? user.role : "Non connecté"}
              </p>
            </div>
            <button
              onClick={resetConversation}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Effacer la conversation"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex h-80 flex-col gap-2 overflow-y-auto p-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-secondary text-foreground rounded-tl-sm"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {msg.role === "bot" ? (
                      <Bot className="h-3 w-3" />
                    ) : (
                      <UserIcon className="h-3 w-3" />
                    )}
                    <span className="text-[10px] opacity-70">
                      {msg.role === "bot" ? "Assistant" : "Vous"}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-secondary px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Réflexion...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={
                  isAuthenticated ? "Posez votre question..." : "Connectez-vous pour discuter"
                }
                disabled={!isAuthenticated || loading}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!isAuthenticated || loading || !input.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function getRoleMessage(role?: string): string {
  switch (role) {
    case "admin":
      return "Je peux vous aider avec tout : formations, sessions, inscriptions, paiements, participants, employés, formateurs. Que voulez-vous savoir ?";
    case "formateur":
      return "Je peux vous renseigner sur vos sessions et formations. Posez-moi une question !";
    case "participant":
    case "employe":
      return "Je peux vous aider pour vos formations et inscriptions. De quoi avez-vous besoin ?";
    default:
      return "Connectez-vous pour profiter de mes services.";
  }
}
