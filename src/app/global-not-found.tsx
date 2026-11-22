// Requests that match no route at all: unknown shop (sub-domain without tenant),
// host that is not the platform's, unknown platform path. Neutral (not a vendor's
// branding): storefront 404s are rendered by each template's own not-found.
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Page introuvable · Rundinova Studio", robots: { index: false } };

export default function GlobalNotFound() {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f7f5f2", color: "#1c1b1a" }}>
        <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "2rem", textAlign: "center" }}>
          <div style={{ maxWidth: "30rem", display: "grid", gap: "0.75rem" }}>
            <p style={{ margin: 0, fontSize: "4rem", fontWeight: 800, lineHeight: 1 }}>404</p>
            <h1 style={{ margin: 0, fontSize: "1.75rem" }}>Page ou boutique introuvable</h1>
            <p style={{ margin: 0, color: "#5b5955" }}>Vérifiez l’adresse : cette page n’existe pas, ou la boutique n’est pas (ou plus) sur Rundinova Studio.</p>
          </div>
        </main>
      </body>
    </html>
  );
}
