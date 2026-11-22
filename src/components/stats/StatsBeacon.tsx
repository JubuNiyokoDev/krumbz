"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Anonymous counters of a storefront (POST /api/stats): one "visit" per page view, "whatsapp_click"
 * on any link to WhatsApp, "product_view" when an element marked data-stat-product="<slug>" is at
 * least half visible (once per page view). No cookie, no identifier, nothing stored in the browser.
 */
function send(kind: string, product?: string) {
  const body = JSON.stringify(product ? { kind, product } : { kind });
  try {
    if (navigator.sendBeacon?.("/api/stats", new Blob([body], { type: "application/json" }))) return;
  } catch {
    /* fall through */
  }
  fetch("/api/stats", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
}

const WHATSAPP = /(^|\.)(wa\.me|whatsapp\.com)$/i;

export function StatsBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    send("visit");
    const seen = new Set<string>();
    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                const slug = (entry.target as HTMLElement).dataset.statProduct;
                if (!entry.isIntersecting || !slug || seen.has(slug)) continue;
                seen.add(slug);
                send("product_view", slug);
              }
            },
            { threshold: 0.5 },
          )
        : null;
    const observeAll = () => document.querySelectorAll<HTMLElement>("[data-stat-product]").forEach((el) => observer?.observe(el));
    observeAll();
    const mutations = observer ? new MutationObserver(observeAll) : null;
    mutations?.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer?.disconnect();
      mutations?.disconnect();
    };
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link) return;
      try {
        if (WHATSAPP.test(new URL(link.href).hostname)) send("whatsapp_click");
      } catch {
        /* not a URL */
      }
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
