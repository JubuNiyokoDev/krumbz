import { logoutAction } from "../_actions/auth";
import { AdminNav } from "../_components/AdminNav";
import { currentAdmin } from "../_lib/server";

/** Authenticated area: navigation shell. Each page also checks the session itself. */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await currentAdmin();
  return (
    <>
      <AdminNav logout={logoutAction} userName={admin.name || admin.email} />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">{children}</div>
    </>
  );
}
