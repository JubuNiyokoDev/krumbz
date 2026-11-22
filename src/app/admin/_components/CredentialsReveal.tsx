"use client";

import { useState } from "react";
import type { Credentials } from "../_lib/types";

/** Temporary credentials, shown once after a creation / reset, with the prefilled WhatsApp link. */
export function CredentialsReveal({ credentials }: { credentials: Credentials }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950" data-testid="credentials">
      <p className="font-semibold">Identifiants provisoires — affichés une seule fois</p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-sky-800">Adresse</dt>
        <dd className="break-all">{credentials.loginUrl}</dd>
        <dt className="text-sky-800">Identifiant</dt>
        <dd className="break-all font-mono" data-testid="credentials-identifier">
          {credentials.identifier}
        </dd>
        <dt className="text-sky-800">Mot de passe</dt>
        <dd className="font-mono text-base tracking-wide" data-testid="credentials-password">
          {credentials.password}
        </dd>
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        <a href={credentials.whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn bg-[#128c4a] text-white hover:bg-[#0f7a40]" data-testid="whatsapp-link">
          Envoyer par WhatsApp
        </a>
        <button
          type="button"
          className="btn border border-sky-300 bg-white text-sky-900 hover:bg-sky-100"
          onClick={() => {
            void navigator.clipboard
              ?.writeText(`Identifiant : ${credentials.identifier}\nMot de passe provisoire : ${credentials.password}`)
              .then(() => setCopied(true));
          }}
        >
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
      <p className="mt-2 text-xs text-sky-800">Le vendeur devra choisir un nouveau mot de passe à sa première connexion. Ce mot de passe n&apos;est enregistré nulle part en clair.</p>
    </div>
  );
}
