/**
 * Deux recalculs du rappel lancés en même temps ne doivent pas programmer
 * deux fois les mêmes soirs (bug vu sur téléphone en 1.5.1).
 */
const mockScheduled = new Map<string, unknown>();
let mockAutoId = 0;

jest.mock("expo-notifications", () => ({
  SchedulableTriggerInputTypes: { DATE: "date" },
  AndroidImportance: { DEFAULT: 3 },
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {
    await Promise.resolve();
    mockScheduled.clear();
  }),
  scheduleNotificationAsync: jest.fn(async (request: { identifier?: string }) => {
    await Promise.resolve();
    const id = request.identifier ?? `auto-${mockAutoId++}`;
    mockScheduled.set(id, request);
    return id;
  }),
}));

jest.mock("@/db/settings", () => ({
  getReminderSettings: () => ({ enabled: true, hour: 20, minute: 0 }),
}));

jest.mock("@/db/transactions", () => ({
  hasTransactionOn: async () => false,
}));

import { reminderId, syncReminders } from "../utils/reminders";

describe("rappel du soir", () => {
  beforeEach(() => mockScheduled.clear());

  it("programme 7 soirs, même avec deux recalculs simultanés", async () => {
    const now = new Date(2026, 10, 23, 18, 0);
    await Promise.all([syncReminders(now), syncReminders(now), syncReminders(now)]);
    expect(mockScheduled.size).toBe(7);
    expect([...mockScheduled.keys()][0]).toBe("rappel-2026-11-23");
  });

  it("donne un identifiant par soir", () => {
    expect(reminderId(new Date(2026, 0, 5, 20, 0))).toBe("rappel-2026-01-05");
  });
});
