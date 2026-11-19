// Requests that match no locale route at all. Kept static (French, default locale).
import "./globals.css";
import "./[locale]/krumbz.css";
import type { Metadata } from "next";
import Link from "next/link";
import { fredoka, nunito } from "./fonts";
import fr from "../../content/site.fr.json";
import { CrumbleBiscuit } from "@/components/ui/CrumbleBiscuit";
import { Crumbs } from "@/components/ui/Crumbs";

export const metadata: Metadata = { title: `${fr.notFound.code} · ${fr.brand.name}`, robots: { index: false } };

export default function GlobalNotFound() {
  return (
    <html lang="fr" className={`${fredoka.variable} ${nunito.variable}`}>
      <body className="min-h-dvh bg-cream font-sans text-navy antialiased">
        <main className="grain relative flex min-h-dvh items-center overflow-hidden px-4 py-16 sm:px-6 lg:px-10">
          <Crumbs />
          <div className="relative mx-auto grid w-full max-w-[80rem] items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div className="mx-auto w-[min(56vw,17rem)] lg:order-2 lg:w-[min(28vw,24rem)]">
              <CrumbleBiscuit className="w-full" />
            </div>
            <div className="flex flex-col items-start gap-5 lg:order-1">
              <p aria-hidden className="crumble-code font-display text-[clamp(5rem,20vw,10rem)] font-bold leading-[0.8] text-rust">
                {fr.notFound.code}
              </p>
              <h1 className="font-display text-[clamp(2.2rem,6vw,4rem)] font-bold leading-[1]">{fr.notFound.title}</h1>
              <p className="max-w-lg text-lg text-navy/85">{fr.notFound.text}</p>
              <Link href="/" className="btn btn-primary mt-2">
                {fr.notFound.cta}
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
