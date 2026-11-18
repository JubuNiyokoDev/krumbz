// Requests that match no locale route at all. Kept minimal and static.
import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { fredoka, nunito } from "./fonts";
import fr from "../../content/site.fr.json";

export const metadata: Metadata = { title: `404 · Krumbz`, robots: { index: false } };

export default function GlobalNotFound() {
  return (
    <html lang="fr" className={`${fredoka.variable} ${nunito.variable}`}>
      <body className="flex min-h-dvh items-center justify-center bg-cream p-6 text-center font-sans text-navy">
        <main>
          <p className="font-display text-8xl font-bold text-gold">{fr.notFound.code}</p>
          <h1 className="mt-4 text-3xl">{fr.notFound.title}</h1>
          <p className="mt-2">{fr.notFound.text}</p>
          <Link href="/" className="mt-6 inline-block rounded-full bg-navy px-6 py-3 font-semibold text-cream">
            {fr.notFound.cta}
          </Link>
        </main>
      </body>
    </html>
  );
}
