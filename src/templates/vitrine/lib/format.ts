/** "+25762697087" → "+257 62 697 087" (other countries: unchanged). */
export function prettyPhone(e164: string): string {
  const m = e164.replace(/\s/g, "").match(/^\+257(\d{2})(\d{3})(\d{3})$/);
  return m ? `+257 ${m[1]} ${m[2]} ${m[3]}` : e164;
}
