import { useRouter } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { Bell, Moon, Sun, Loader2 } from "lucide-react";
import {
  getNotifications,
  markNotificationAsRead,
  type Notification,
} from "@/lib/api/notifications";

export function DarkModeToggle() {
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

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getNotifications()
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch(() => {
        setItems([]);
        setLoading(false);
      });
  }, [open]);

  async function markRead(id: string) {
    try {
      await markNotificationAsRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {}
  }

  const unread = items.filter((n) => !n.isRead);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative rounded-md border border-border p-2 text-foreground transition-colors hover:bg-secondary"
      >
        <Bell className="h-4 w-4" />
        {unread.length > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-md border bg-popover shadow-md">
          <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
            Notifications
          </div>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              Aucune notification
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              {items.slice(0, 10).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-xs transition-colors hover:bg-secondary ${!n.isRead ? "bg-primary/5" : ""}`}
                  onClick={() => {
                    markRead(n.id);
                    setOpen(false);
                    if (n.lienAction) router.navigate({ to: n.lienAction });
                  }}
                >
                  <span className="font-medium text-foreground">{n.titre}</span>
                  <span className="text-muted-foreground line-clamp-2">{n.message}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
