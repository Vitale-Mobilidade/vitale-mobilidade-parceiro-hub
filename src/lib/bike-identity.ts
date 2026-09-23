/**
 * Identificador único de bike usado internamente no catálogo, quiz, radar e painel.
 * - Mesmo regex usado em validações de servidor e de rota.
 * - Permite hífen e underscore; não começa com hífen/underscore.
 * - Case-insensitive, mas IDs oficiais devem ser mantidos em minúsculas.
 */
export const BIKE_ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
