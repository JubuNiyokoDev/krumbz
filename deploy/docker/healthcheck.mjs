// Docker HEALTHCHECK of the image (Dockerfile). Exit 0 = healthy.
// Rundinova Studio: GET /api/health must answer 200 {"ok":true,"db":true}.
// Builds without that route (Krumbz on main) answer 404: fall back to "/" (< 500).
const port = process.env.PORT ?? "3000";
const base = `http://127.0.0.1:${port}`;
const get = (path) => fetch(base + path, { signal: AbortSignal.timeout(4000), redirect: "manual" });

try {
  const res = await get("/api/health");
  if (res.status === 404) {
    const home = await get("/");
    process.exit(home.status > 0 && home.status < 500 ? 0 : 1);
  }
  const body = await res.json().catch(() => ({}));
  process.exit(res.ok && body.ok === true && body.db !== false ? 0 : 1);
} catch {
  process.exit(1);
}
