/**
 * Erreur dont le message est destiné à l'utilisateur et peut être affiché
 * tel quel. Les autres erreurs (techniques) sont remplacées par un message
 * générique.
 */
export class UserFacingError extends Error {}
