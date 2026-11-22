"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { changePassword, verifyPassword } from "@/lib/db/users";
import { login, logout, revokeOtherSessions } from "@/lib/auth/session";
import { passwordProblem, requireSuperadmin } from "@/lib/auth/guards";
import { audit } from "@/lib/admin/audit";
import type { ActionState } from "../_lib/types";

const LOGIN_ERRORS = {
  invalid: "Identifiant ou mot de passe incorrect.",
  wrong_area: "Identifiant ou mot de passe incorrect.",
  rate_limited: "Trop de tentatives : réessayez dans 15 minutes.",
  inactive: "Ce compte est désactivé.",
} as const;

export async function loginAction(_state: ActionState | null, form: FormData): Promise<ActionState> {
  const identifier = String(form.get("identifier") ?? "").slice(0, 200);
  const password = String(form.get("password") ?? "").slice(0, 200);
  if (!identifier || !password) return { error: "Saisissez votre adresse e-mail et votre mot de passe." };
  const result = await login(identifier, password, "superadmin");
  if (!result.ok) return { error: LOGIN_ERRORS[result.reason] };
  redirect(result.user.mustChangePassword ? "/mot-de-passe" : "/");
}

const PASSWORD_ERRORS = { too_short: "Le mot de passe doit contenir au moins 10 caractères.", too_long: "Le mot de passe est trop long (200 caractères maximum)." };

export async function changePasswordAction(_state: ActionState | null, form: FormData): Promise<ActionState> {
  const session = await requireSuperadmin({ allowMustChange: true });
  const current = String(form.get("current") ?? "");
  const next = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const db = getDb();
  const [user] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user) return { error: "Compte introuvable." };
  if (!session.mustChangePassword && !(await verifyPassword(current, user.passwordHash))) {
    return { error: "Mot de passe actuel incorrect.", fields: { current: "Mot de passe actuel incorrect." } };
  }
  const problem = passwordProblem(next);
  if (problem) return { error: PASSWORD_ERRORS[problem], fields: { password: PASSWORD_ERRORS[problem] } };
  if (next !== confirm) return { error: "Les deux saisies ne correspondent pas.", fields: { confirm: "Les deux saisies ne correspondent pas." } };
  if (await verifyPassword(next, user.passwordHash)) return { error: "Choisissez un mot de passe différent de l'actuel." };

  await changePassword(db, session.userId, next);
  await revokeOtherSessions(session.userId, session.sessionId);
  await audit(db, { actorUserId: session.userId, action: "auth.password_change", entity: "user", entityId: session.userId });
  redirect("/?mot-de-passe=ok");
}

export async function logoutAction(): Promise<void> {
  await logout();
  redirect("/connexion");
}
