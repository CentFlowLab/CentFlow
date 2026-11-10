/** Idade mínima para criar conta (ADR-038). */
export const MIN_SIGN_UP_AGE = 16;

/** Anos completos entre duas datas de calendário `YYYY-MM-DD`. */
export function ageOn(birthDate: string, today: string): number {
  const [by = 0, bm = 0, bd = 0] = birthDate.split('-').map(Number);
  const [ty = 0, tm = 0, td = 0] = today.split('-').map(Number);
  const beforeBirthday = tm < bm || (tm === bm && td < bd);
  return ty - by - (beforeBirthday ? 1 : 0);
}
