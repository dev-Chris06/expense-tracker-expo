import { backupsToDelete, folderLabel, isBackupDue } from "../utils/autoBackup";
import { formatDateTime } from "../utils/dateHelpers";
import { pickTip } from "../utils/homeTips";
import { formatReminderTime, reminderDates } from "../utils/reminderSchedule";

jest.mock("expo-file-system", () => ({ Directory: class {}, File: class {}, Paths: {} }));
jest.mock("../db/backup", () => ({}));
jest.mock("../db/settings", () => ({}));

const at = (d: Date) => `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;

describe("evening reminder schedule", () => {
  const time = { hour: 20, minute: 0 };

  it("schedules tonight and the next 6 evenings", () => {
    const dates = reminderDates(new Date(2026, 10, 20, 9, 0), time, false);
    expect(dates.map(at)).toEqual(["20/11 20:00", "21/11 20:00", "22/11 20:00", "23/11 20:00", "24/11 20:00", "25/11 20:00", "26/11 20:00"]);
  });

  it("skips tonight when something was already noted today", () => {
    expect(at(reminderDates(new Date(2026, 10, 20, 9, 0), time, true)[0])).toBe("21/11 20:00");
    expect(reminderDates(new Date(2026, 10, 20, 9, 0), time, true)).toHaveLength(7);
  });

  it("skips tonight once the time has passed", () => {
    expect(at(reminderDates(new Date(2026, 10, 20, 20, 30), time, false)[0])).toBe("21/11 20:00");
  });

  it("crosses month ends", () => {
    expect(reminderDates(new Date(2026, 10, 30, 21, 0), { hour: 21, minute: 30 }, false).map(at).slice(0, 2)).toEqual([
      "30/11 21:30",
      "1/12 21:30",
    ]);
  });

  it("formats the time", () => {
    expect(formatReminderTime({ hour: 20, minute: 0 })).toBe("20 h");
    expect(formatReminderTime({ hour: 21, minute: 5 })).toBe("21 h 05");
  });
});

describe("automatic backup", () => {
  const now = new Date("2026-11-20T18:00:00Z");

  it("is due weekly", () => {
    expect(isBackupDue(null, now)).toBe(true);
    expect(isBackupDue("2026-11-15T18:00:00Z", now)).toBe(false);
    expect(isBackupDue("2026-11-13T18:00:00Z", now)).toBe(true);
    // Horloge du téléphone revenue en arrière : on sauvegarde par prudence.
    expect(isBackupDue("2027-01-01T00:00:00Z", now)).toBe(true);
  });

  it("keeps the 5 most recent backups and nothing else is touched", () => {
    const names = [
      "depenses-perso-sauvegarde-2026-10-01.json",
      "depenses-perso-sauvegarde-2026-10-08.json",
      "depenses-perso-sauvegarde-2026-10-15.json",
      "depenses-perso-sauvegarde-2026-10-22.json",
      "depenses-perso-sauvegarde-2026-10-29.json",
      "depenses-perso-sauvegarde-2026-11-05.json",
      "depenses-perso-sauvegarde-2026-11-12 (1).json",
      "photo.jpg",
      "depenses-perso-operations-2026-11-01.csv",
    ];
    expect(backupsToDelete(names)).toEqual([
      "depenses-perso-sauvegarde-2026-10-08.json",
      "depenses-perso-sauvegarde-2026-10-01.json",
    ]);
  });

  it("shows a readable folder name", () => {
    expect(
      folderLabel("content://com.android.externalstorage.documents/tree/primary%3ADocuments%2FD%C3%A9penses%20Perso"),
    ).toBe("Documents/Dépenses Perso");
    expect(folderLabel("content://com.android.externalstorage.documents/tree/primary%3A")).toBe("Mémoire du téléphone");
    expect(folderLabel("content://com.android.externalstorage.documents/tree/primary%3ADepenses/")).toBe("Depenses");
    expect(folderLabel("content://com.android.externalstorage.documents/tree/primary%3ADepenses%2F")).toBe("Depenses");
    expect(folderLabel("content://com.android.externalstorage.documents/tree/primary%3A/")).toBe("Mémoire du téléphone");
  });

  it("formats date and time", () => {
    expect(formatDateTime(new Date(2026, 10, 20, 18, 5).toISOString())).toBe("20/11/2026 à 18 h 05");
  });
});

describe("home tip", () => {
  const base = {
    reminderOffered: true,
    reminderEnabled: true,
    operations: 25,
    lastShared: "2026-11-01T00:00:00Z",
    snoozedUntil: null,
    now: new Date("2026-11-20T00:00:00Z"),
  };

  it("offers the reminder first, until answered", () => {
    expect(pickTip({ ...base, reminderOffered: false, reminderEnabled: false })).toBe("reminder");
    expect(pickTip({ ...base, reminderOffered: true, reminderEnabled: false })).toBeNull();
  });

  it("guides a new user to the first operation, then congratulates once", () => {
    expect(pickTip({ ...base, firstSteps: true, operations: 0, reminderOffered: false })).toBe("start");
    expect(pickTip({ ...base, firstSteps: true, operations: 1 })).toBe("firstDone");
    expect(pickTip({ ...base, firstSteps: false, operations: 0, lastShared: null })).toBeNull();
  });

  it("asks to send a backup off the phone every 30 days, once there is data to lose", () => {
    expect(pickTip(base)).toBeNull();
    expect(pickTip({ ...base, lastShared: null })).toBe("share");
    expect(pickTip({ ...base, lastShared: "2026-10-10T00:00:00Z" })).toBe("share");
    expect(pickTip({ ...base, lastShared: null, operations: 3 })).toBeNull();
    expect(pickTip({ ...base, lastShared: null, snoozedUntil: "2026-12-01T00:00:00Z" })).toBeNull();
  });
});
