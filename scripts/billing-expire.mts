#!/usr/bin/env node
/**
 * Daily expiration run (cron on the host, or manually).
 *
 *   npm run billing:expire
 *
 * Marks expired subscriptions and pauses their shops. Idempotent. The in-memory
 * tenant route cache is invalidated for every paused slug by expireSubscriptions().
 */
import { closeDb } from "../src/lib/db/client.ts";
import { expireSubscriptions } from "../src/lib/billing/expire.ts";

const result = await expireSubscriptions(undefined, {
  onPaused: (slug) => console.log(`[expire] boutique en pause : ${slug}`),
});
console.log(`[expire] ${result.expired} abonnement(s) expiré(s), ${result.paused.length} boutique(s) en pause.`);
await closeDb();
