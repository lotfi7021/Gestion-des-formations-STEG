import { api } from "./client";

export type Notification = {
  id: string;
  type: string;
  titre: string;
  message: string;
  isRead: boolean;
  dateEnvoi: string;
  dateLecture: string;
  lienAction: string;
  metadata: Record<string, any>;
  user: any;
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
