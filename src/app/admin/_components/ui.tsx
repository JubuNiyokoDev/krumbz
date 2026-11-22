import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const TONES = {
  green: "bg-emerald-100 text-emerald-900",
  amber: "bg-amber-100 text-amber-900",
  red: "bg-red-100 text-red-900",
  slate: "bg-slate-100 text-slate-700",
  sky: "bg-sky-100 text-sky-900",
} as const;

export function Badge({ tone = "slate", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONES[tone]}`}>{children}</span>;
}

const TENANT_STATUS: Record<string, { label: string; tone: keyof typeof TONES }> = {
  active: { label: "Active", tone: "green" },
  trial: { label: "Essai", tone: "sky" },
  paused: { label: "En pause", tone: "red" },
};

export function TenantStatusBadge({ status }: { status: string }) {
  const s = TENANT_STATUS[status] ?? { label: status, tone: "slate" as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

const PAYMENT_STATUS: Record<string, { label: string; tone: keyof typeof TONES }> = {
  pending: { label: "À valider", tone: "amber" },
  validated: { label: "Validé", tone: "green" },
  rejected: { label: "Refusé", tone: "red" },
};

export function PaymentStatusBadge({ status }: { status: string }) {
  const s = PAYMENT_STATUS[status] ?? { label: status, tone: "slate" as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

const CERT_STATUS: Record<string, { label: string; tone: keyof typeof TONES }> = {
  pending: { label: "En attente", tone: "amber" },
  issued: { label: "Émis", tone: "green" },
  error: { label: "Erreur", tone: "red" },
};

export function CertificateBadge({ status, known = true }: { status: string; known?: boolean }) {
  if (!known) return <Badge>Jamais demandé</Badge>;
  const s = CERT_STATUS[status] ?? { label: status, tone: "slate" as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{children}</p>;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="card">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
