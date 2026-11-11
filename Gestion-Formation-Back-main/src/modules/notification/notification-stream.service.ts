import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export type NotificationStreamPayload = {
  type: 'notification' | 'ping';
  notification?: unknown;
};

/**
 * Diffusion en mémoire des notifications (SSE).
 * Mono-instance : suffisant pour le déploiement actuel, à remplacer par Redis
 * si l'API est un jour répliquée sur plusieurs instances.
 */
@Injectable()
export class NotificationStreamService {
  private readonly streams = new Map<string, Set<Subject<NotificationStreamPayload>>>();

  subscribe(userId: string): Observable<NotificationStreamPayload> {
    const subject = new Subject<NotificationStreamPayload>();
    let subjects = this.streams.get(userId);
    if (!subjects) {
      subjects = new Set();
      this.streams.set(userId, subjects);
    }
    subjects.add(subject);

    return new Observable<NotificationStreamPayload>((subscriber) => {
      const subscription = subject.subscribe(subscriber);
      return () => {
        subscription.unsubscribe();
        const current = this.streams.get(userId);
        current?.delete(subject);
        if (current && current.size === 0) this.streams.delete(userId);
      };
    });
  }

  emit(userId: string, payload: NotificationStreamPayload): void {
    const subjects = this.streams.get(userId);
    if (!subjects) return;
    for (const subject of subjects) subject.next(payload);
  }
}
