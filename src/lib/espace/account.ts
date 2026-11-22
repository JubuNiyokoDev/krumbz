/**
 * Vendor space — password change (forced after a temporary password, or
 * voluntary). The caller revokes the other sessions afterwards
 * (revokeOtherSessions in src/lib/auth/session.ts).
 */
import { and, eq } from "drizzle-orm";
import { getDb, type Db } from "../db/client.ts";
import { users } from "../db/schema.ts";
import { changePassword, verifyPassword } from "../db/users.ts";
import { recordAudit } from "../tenant/audit.ts";
import { done, fail, type Result } from "./context.ts";
import type { FieldError } from "./validation.ts";

/** Same policy as passwordProblem() in src/lib/auth/guards.ts (kept here without "server-only"). */
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 200;

export async function changeVendorPassword(
  actor: { userId: string; tenantId: string },
  form: FormData,
  options: { requireCurrent: boolean },
  db: Db = getDb(),
): Promise<Result> {
  // Passwords are taken as typed (no trimming).
  const raw = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value : "";
  };
  const [current, next, confirm] = [raw("current"), raw("password"), raw("confirm")];

  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(and(eq(users.id, actor.userId), eq(users.tenantId, actor.tenantId), eq(users.role, "vendor")))
    .limit(1);
  if (!user) return fail("form", "not_found");

  const errors: FieldError[] = [];
  if (options.requireCurrent && !(await verifyPassword(current, user.passwordHash))) errors.push({ field: "current", code: "password_wrong" });
  if (next.length < PASSWORD_MIN) errors.push({ field: "password", code: "password_too_short", max: PASSWORD_MIN });
  else if (next.length > PASSWORD_MAX) errors.push({ field: "password", code: "password_too_long", max: PASSWORD_MAX });
  else if (next !== confirm) errors.push({ field: "confirm", code: "password_mismatch" });
  else if (await verifyPassword(next, user.passwordHash)) errors.push({ field: "password", code: "password_same" });
  if (errors.length) return { ok: false, errors };

  await changePassword(db, user.id, next);
  await recordAudit({ tenantId: actor.tenantId, actorUserId: user.id, action: "auth.password_change", entity: "user", entityId: user.id }, db);
  return done(null);
}
