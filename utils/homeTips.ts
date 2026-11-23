/**
 * Choix de la carte de conseil affichée sur l'accueil (fonction pure).
 */
export type Tip = "start" | "firstDone" | "reminder" | "share" | null;

const DAY = 24 * 60 * 60 * 1000;
/** En dessous, pas grand-chose à perdre : on ne dérange pas. */
const SHARE_MIN_OPERATIONS = 10;
/** Sans envoi hors du téléphone depuis ce délai, on le repropose. */
const SHARE_EVERY_DAYS = 30;
/** « Plus tard » : la carte revient après ce délai. */
export const SNOOZE_DAYS = 14;

export function pickTip(input: {
  /** Nouvel utilisateur, accueil terminé : aides des premiers pas. */
  firstSteps?: boolean;
  reminderOffered: boolean;
  reminderEnabled: boolean;
  operations: number;
  lastShared: string | null;
  snoozedUntil: string | null;
  now: Date;
}): Tip {
  // Premiers pas : d'abord « touche ＋ », puis « bravo » une fois la première opération notée.
  if (input.firstSteps) return input.operations === 0 ? "start" : "firstDone";
  if (!input.reminderOffered && !input.reminderEnabled) return "reminder";
  const now = input.now.getTime();
  const sharedLongAgo =
    input.lastShared === null || now - new Date(input.lastShared).getTime() > SHARE_EVERY_DAYS * DAY;
  const snoozed = input.snoozedUntil !== null && now < new Date(input.snoozedUntil).getTime();
  return input.operations >= SHARE_MIN_OPERATIONS && sharedLongAgo && !snoozed ? "share" : null;
}
