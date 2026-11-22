import type { Metadata } from "next";
import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth/guards";
import { PasswordForm } from "../_components/AuthForms";

export const metadata: Metadata = { title: "Mot de passe" };

/** Forced change after a temporary password (users.must_change_password), or voluntary change. */
export default async function PasswordPage() {
  const session = await requireSuperadmin({ allowMustChange: true });
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="card w-full max-w-sm">
        <h1 className="mb-2 text-xl font-semibold">{session.mustChangePassword ? "Choisissez votre mot de passe" : "Changer de mot de passe"}</h1>
        {session.mustChangePassword ? (
          <p className="mb-5 text-sm text-slate-600">Vous vous êtes connecté avec un mot de passe provisoire : choisissez-en un nouveau pour continuer.</p>
        ) : (
          <p className="mb-5 text-sm text-slate-600">Vos autres sessions ouvertes seront fermées.</p>
        )}
        <PasswordForm askCurrent={!session.mustChangePassword} />
        {!session.mustChangePassword && (
          <p className="mt-4 text-center text-sm">
            <Link href="/" className="link">
              Retour au tableau de bord
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
