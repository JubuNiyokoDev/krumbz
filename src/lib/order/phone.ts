/**
 * Burundi phone numbers: country code +257, 8-digit national numbers.
 * Accepts "62 697 087", "62697087", "+257 62 697 087", "00257…", "257…".
 * Returns the E.164 form (+257XXXXXXXX) or null.
 */
export function normalizeBurundiPhone(input: string): string | null {
  let digits = input.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("257")) digits = digits.slice(3);
  if (!/^\d{8}$/.test(digits)) return null;
  return `+257${digits}`;
}

export function formatBurundiPhone(e164: string): string {
  const national = e164.replace(/^\+257/, "");
  return `+257 ${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
}
