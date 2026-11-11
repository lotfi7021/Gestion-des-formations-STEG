import { api } from "./client";
import { API_BASE, getAccessToken } from "./client";
import type { UserRef } from "./types";

export type Notification = {
  id: string;
  type: string;
  titre: string;
  message: string;
  isRead: boolean;
  dateEnvoi: string;
  dateLecture: string;
  lienAction: string;
  metadata: Record<string, unknown>;
  user: UserRef;
};

export async function getNotifications(): Promise<Notification[]> {
  return api.get<Notification[]>("/notifications");
}

export async function getNotification(id: string): Promise<Notification> {
  return api.get<Notification>(`/notifications/${id}`);
}

export async function getNotificationsByUser(userId: string): Promise<Notification[]> {
  return api.get<Notification[]>(`/notifications/user/${userId}`);
}

export async function markNotificationAsRead(id: string): Promise<Notification> {
  return api.patch<Notification>(`/notifications/${id}/read`, {});
}

/**
 * Ouvre le flux SSE des notifications (via fetch pour pouvoir envoyer le
 * header Authorization, contrairement à EventSource) et se reconnecte
 * automatiquement après une coupure réseau.
 */
export function subscribeToNotifications(
  onNotification: (notification: Notification) => void,
): () => void {
  const controller = new AbortController();

  const connect = async () => {
    while (!controller.signal.aborted) {
      const token = getAccessToken();
      if (!token) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }

      try {
        const res = await fetch(`${API_BASE}/notifications/stream`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error(`SSE ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!controller.signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() ?? "";

          for (const block of blocks) {
            const payloadText = block
              .split("\n")
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trimStart())
              .join("\n");
            if (!payloadText) continue;
            try {
              const payload = JSON.parse(payloadText) as {
                type?: string;
                notification?: Notification;
              };
              if (payload.type === "notification" && payload.notification) {
                onNotification(payload.notification);
              }
            } catch {
              // Ligne non-JSON (heartbeat) : ignorée.
            }
          }
        }
      } catch {
        if (controller.signal.aborted) return;
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  };

  void connect();
  return () => controller.abort();
}
