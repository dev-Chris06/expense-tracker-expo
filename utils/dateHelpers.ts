/**
 * Petites fonctions utilitaires autour des dates.
 * La base stocke les dates au format ISO "YYYY-MM-DD" (voir db/schema.ts).
 */

/**
 * Retourne la date du jour au format ISO "YYYY-MM-DD", en heure locale.
 *
 * Attention : new Date().toISOString() renvoie la date en UTC, ce qui peut
 * donner le mauvais jour selon le fuseau horaire. On construit donc la
 * chaîne à partir des composantes locales.
 */
export function todayISO(): string {
  const now = new Date();
  return toISODate(now);
}

/**
 * Convertit un objet Date en chaîne ISO "YYYY-MM-DD" (heure locale).
 */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formate une date ISO pour l'affichage : "2026-08-02" → "02/08/2026".
 */
export function formatDisplayDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Vérifie qu'une chaîne est une date ISO "YYYY-MM-DD" valide.
 *
 * Le new Date() ne suffit pas : il accepte "2026-02-31" en le transformant
 * silencieusement en 3 mars. On reconstruit donc la chaîne ISO depuis le
 * Date obtenu et on compare : si elles diffèrent, la date n'existait pas.
 */
export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return toISODate(date) === value;
}
