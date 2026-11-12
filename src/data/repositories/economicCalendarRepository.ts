import { EVENT_COUNTRY_LABELS, EVENT_REMINDER_LEAD_MINUTES, eventReminderBody } from '@/src/core/constants/economicCalendar';
import { storageGet, storageSet } from '@/src/core/storage/storage';
import {
  RemoteEconomicCalendarDatasource,
  type IEconomicCalendarDatasource,
} from '@/src/data/datasources/economicCalendarDatasource';
import { notificationsDatasource } from '@/src/data/datasources/notificationsDatasource';
import type { EconomicEvent } from '@/src/domain/models';

const REMINDERS_KEY = 'altin_kasam_event_reminders_v1';

export type ReminderResult = { reminders: string[]; ok: boolean };

/** Son açıklananlar bu kadar geriye kadar gösterilir; sunucu ucu da aynı aralıkta sonuç arar. */
const RECENT_WINDOW_MS = 21 * 86_400_000;

export type EconomicCalendar = {
  /** Henüz açıklanmamış olaylar, yakından uzağa. */
  upcoming: EconomicEvent[];
  /** Son üç haftada açıklananlar, yeniden eskiye; sonuç kaynak yayımladıysa `result` içinde. */
  recent: EconomicEvent[];
};

const notificationId = (eventId: string) => `economic-event-${eventId}`;

export class EconomicCalendarRepository {
  constructor(private readonly datasource: IEconomicCalendarDatasource = new RemoteEconomicCalendarDatasource()) {}

  async load(now = Date.now()): Promise<EconomicCalendar> {
    const events = await this.datasource.fetchEvents();
    const time = (e: EconomicEvent) => Date.parse(e.at);
    return {
      upcoming: events.filter((e) => time(e) > now).sort((a, b) => time(a) - time(b)),
      recent: events
        .filter((e) => time(e) <= now && time(e) > now - RECENT_WINDOW_MS)
        .sort((a, b) => time(b) - time(a)),
    };
  }

  /** Hatırlatma kurulmuş, henüz açıklanmamış olayların kimlikleri. */
  async listReminders(events: EconomicEvent[]): Promise<string[]> {
    const saved = (await storageGet<string[]>(REMINDERS_KEY)) ?? [];
    const upcoming = new Set(events.map((e) => e.id));
    const active = saved.filter((id) => upcoming.has(id));
    if (active.length !== saved.length) await storageSet(REMINDERS_KEY, active);
    return active;
  }

  /** Bildirim izni yoksa ya da açıklamaya hatırlatma süresinden az kaldıysa `ok: false`. */
  async toggleReminder(event: EconomicEvent): Promise<ReminderResult> {
    const saved = (await storageGet<string[]>(REMINDERS_KEY)) ?? [];
    if (saved.includes(event.id)) {
      await notificationsDatasource.cancel(notificationId(event.id));
      const reminders = saved.filter((id) => id !== event.id);
      await storageSet(REMINDERS_KEY, reminders);
      return { reminders, ok: true };
    }
    if (!(await notificationsDatasource.ensurePermission())) return { reminders: saved, ok: false };
    const remindAt = new Date(Date.parse(event.at) - EVENT_REMINDER_LEAD_MINUTES * 60_000);
    const scheduled = await notificationsDatasource.scheduleAt(
      notificationId(event.id),
      remindAt,
      `${EVENT_COUNTRY_LABELS[event.country]} · ${event.title}`,
      eventReminderBody(event),
      '/calendar',
    );
    if (!scheduled) return { reminders: saved, ok: false };
    const reminders = [...saved, event.id];
    await storageSet(REMINDERS_KEY, reminders);
    return { reminders, ok: true };
  }
}

export const economicCalendarRepository = new EconomicCalendarRepository();
