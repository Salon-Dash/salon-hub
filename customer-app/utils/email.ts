/** Simple email shape check — clear enough for user-facing validation (blog: clear error messages). */
export function isValidEmail(value: string): boolean {
  const v = value.trim();
  if (v.length < 5) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(v);
}
