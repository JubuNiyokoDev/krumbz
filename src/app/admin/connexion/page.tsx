import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "../_components/AuthForms";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage() {
  const session = await getSession();
  if (session?.role === "superadmin") redirect(session.mustChangePassword ? "/mot-de-passe" : "/");
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="card w-full max-w-sm">
        <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase">Rundinova Studio</p>
        <h1 className="mt-1 mb-5 text-xl font-semibold">Super-administration</h1>
        <LoginForm />
      </div>
    </main>
  );
}
