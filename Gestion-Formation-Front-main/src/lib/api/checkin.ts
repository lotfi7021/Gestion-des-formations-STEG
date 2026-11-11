import { api } from "./client";

export type CheckInSession = {
  id: string;
  titre: string;
  dateDebut: string;
  dateFin: string;
  heureDebut?: string;
  heureFin?: string;
  lieu?: string;
  salle?: string;
};

export type CheckInInfo = {
  session: CheckInSession;
  alreadyCheckedIn: boolean;
  heureArrivee: string | null;
};

export type CheckInResult = CheckInInfo;

export type SessionCheckIn = {
  token: string;
  url: string;
  qrCodeDataUrl: string;
  session: CheckInSession;
};

export async function getCheckInInfo(token: string): Promise<CheckInInfo> {
  return api.get<CheckInInfo>(`/check-in/${token}`);
}

export async function checkIn(token: string): Promise<CheckInResult> {
  return api.post<CheckInResult>(`/check-in/${token}`);
}

export async function getSessionCheckIn(sessionId: string): Promise<SessionCheckIn> {
  return api.get<SessionCheckIn>(`/sessions/${sessionId}/check-in`);
}

export async function sendSessionConvocations(
  sessionId: string,
): Promise<{ sent: number; failed: number }> {
  return api.post<{ sent: number; failed: number }>(`/sessions/${sessionId}/convocation`);
}
