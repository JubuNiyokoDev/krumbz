/**
 * Raw public host of a request. The Host header by default; X-Forwarded-Host
 * only when TRUST_FORWARDED_HOST=1 (the VPS nginx terminates TLS and sets it —
 * never trust it from an arbitrary client).
 */
export function requestHostHeader(headers: Pick<Headers, "get">): string | null {
  if (process.env.TRUST_FORWARDED_HOST === "1") {
    const forwarded = headers.get("x-forwarded-host");
    if (forwarded) return forwarded.split(",")[0].trim();
  }
  return headers.get("host");
}
