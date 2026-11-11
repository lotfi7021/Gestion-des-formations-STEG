import { useRouter } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { Bell, Moon, Sun, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getNotifications,
  markNotificationAsRead,
  subscribeToNotifications,
  type Notification as AppNotification,
} from "@/lib/api/notifications";
import { queryKeys } from "@/lib/api/query-keys";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { useAuth } from "@/contexts/auth-context";

export function DarkModeToggle() {
  const { dark, toggle } = useDarkMode();

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
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: items = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: getNotifications,
    enabled: !!user,
    refetchInterval: 60000,
    staleTime: 15000,
  });

  useEffect(() => {
    if (!user) return;
    return subscribeToNotifications((notification: AppNotification) => {
      queryClient.setQueryData<AppNotification[]>(queryKeys.notifications, (previous = []) => {
        if (previous.some((item) => item.id === notification.id)) return previous;
        return [notification, ...previous];
      });
      toast(notification.titre, { description: notification.message });
    });
  }, [user, queryClient]);

  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });

  function markRead(id: string) {
    markReadMutation.mutate(id);
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
