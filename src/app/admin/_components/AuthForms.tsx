"use client";

import { useActionState } from "react";
import { changePasswordAction, loginAction } from "../_actions/auth";
import type { ActionState } from "../_lib/types";
import { FormFeedback, SubmitButton } from "./ActionForm";

export function LoginForm() {
  const [state, action] = useActionState<ActionState | null, FormData>(loginAction, null);
  return (
    <form action={action} className="space-y-4" aria-label="Connexion">
      <div>
        <label htmlFor="identifier" className="label">
          Adresse e-mail
        </label>
        <input id="identifier" name="identifier" type="email" autoComplete="username" required className="input" />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Mot de passe
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </div>
      <SubmitButton className="w-full">Se connecter</SubmitButton>
      <FormFeedback state={state} />
    </form>
  );
}

export function PasswordForm({ askCurrent }: { askCurrent: boolean }) {
  const [state, action] = useActionState<ActionState | null, FormData>(changePasswordAction, null);
  return (
    <form action={action} className="space-y-4" aria-label="Changer le mot de passe">
      {askCurrent && (
        <div>
          <label htmlFor="current" className="label">
            Mot de passe actuel
          </label>
          <input id="current" name="current" type="password" autoComplete="current-password" required className="input" aria-invalid={Boolean(state?.fields?.current)} />
        </div>
      )}
      <div>
        <label htmlFor="password" className="label">
          Nouveau mot de passe
        </label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required className="input" aria-invalid={Boolean(state?.fields?.password)} />
        <p className="hint">10 caractères au minimum. Une phrase de passe est idéale.</p>
      </div>
      <div>
        <label htmlFor="confirm" className="label">
          Confirmer le nouveau mot de passe
        </label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required className="input" aria-invalid={Boolean(state?.fields?.confirm)} />
      </div>
      <SubmitButton className="w-full">Enregistrer le mot de passe</SubmitButton>
      <FormFeedback state={state} />
    </form>
  );
}
