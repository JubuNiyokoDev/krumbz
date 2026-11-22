import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { espacePath } from "@/lib/auth/guards";
import { getSession } from "@/lib/auth/session";
import { loginAction } from "@/espace/actions";
import { ActionForm } from "@/espace/components/ActionForm";
import { Shell } from "@/espace/components/Shell";
import { espaceLocale, espaceMessages } from "@/espace/i18n";

export async function generateMetadata({ params }: PageProps<"/espace/[locale]/connexion">): Promise<Metadata> {
  return { title: espaceMessages((await params).locale).login.title };
}

export default async function LoginPage({ params }: PageProps<"/espace/[locale]/connexion">) {
  const locale = espaceLocale((await params).locale);
  const m = espaceMessages(locale);
  const session = await getSession();
  if (session?.role === "vendor") redirect(espacePath(locale, session.mustChangePassword ? "/mot-de-passe" : "/"));

  return (
    <Shell locale={locale} m={m} path="/connexion" nav={false}>
      <div className="auth card">
        <h1>{m.login.title}</h1>
        <p className="muted">{m.login.intro}</p>
        <ActionForm action={loginAction.bind(null, locale)} submitLabel={m.login.submit} pendingLabel={m.login.pending} errorTitle={m.common.errorTitle} testId="login-form">
          <label className="field">
            <span>{m.login.identifier}</span>
            <input name="identifier" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={120} />
            <small>{m.login.identifierHint}</small>
          </label>
          <label className="field">
            <span>{m.login.password}</span>
            <input name="password" type="password" autoComplete="current-password" required maxLength={200} />
          </label>
        </ActionForm>
        <p className="hint">{m.login.help}</p>
      </div>
    </Shell>
  );
}
