/** Strips zero-width / format Unicode chars often introduced by mobile autofill. */
export function sanitizeAuthText(value: string): string {
  return value.replace(/\p{Cf}/gu, "").trim();
}

export function sanitizePassword(value: string): string {
  return value.replace(/\p{Cf}/gu, "");
}
