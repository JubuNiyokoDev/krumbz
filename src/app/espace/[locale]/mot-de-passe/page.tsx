import type { Metadata } from "next";
import { passwordAction } from "@/espace/actions";
import { ActionForm } from "@/espace/components/ActionForm";
import { Shell } from "@/espace/components/Shell";
import { espaceMessages } from "@/espace/i18n";
import { vendorContext } from "@/espace/server";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/espace/account";

export async function generateMetadata({ params }: PageProps<"/espace/[locale]/mot-de-passe">): Promise<Metadata> {
  return { title: espaceMessages((await params).locale).password.title };
}

export default async function PasswordPage({ params }: PageProps<"/espace/[locale]/mot-de-passe">) {
  const { locale, m, session } = await vendorContext((await params).locale, { allowMustChange: true });
  const forced = session.mustChangePassword;

  return (
    <Shell locale={locale} m={m} path="/mot-de-passe" nav={!forced} logout>
      <div className="auth card">
        <h1>{m.password.title}</h1>
        <p className={forced ? "notice notice-ok" : "muted"}>{forced ? m.password.forcedIntro : m.password.intro}</p>
        <ActionForm action={passwordAction.bind(null, locale)} submitLabel={m.password.submit} pendingLabel={m.common.saving} errorTitle={m.common.errorTitle} resetOnSuccess testId="password-form">
          {/* Lets password managers attach the new password to the right account. */}
          <input type="text" name="username" autoComplete="username" defaultValue={session.email} hidden readOnly />
          {forced ? null : (
            <label className="field">
              <span>{m.password.current}</span>
              <input name="current" type="password" autoComplete="current-password" required maxLength={PASSWORD_MAX} />
            </label>
          )}
          <label className="field">
            <span>{m.password.new}</span>
            <input name="password" type="password" autoComplete="new-password" required minLength={PASSWORD_MIN} maxLength={PASSWORD_MAX} />
            <small>{m.password.newHint}</small>
          </label>
          <label className="field">
            <span>{m.password.confirm}</span>
            <input name="confirm" type="password" autoComplete="new-password" required minLength={PASSWORD_MIN} maxLength={PASSWORD_MAX} />
          </label>
        </ActionForm>
      </div>
    </Shell>
  );
}
