import { redirect } from "next/navigation";
import type { NavItem } from "@/components/dashboard-shell";
import DashboardShell from "@/components/dashboard-shell";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "client") redirect("/dashboard");

  const items: NavItem[] = [
    { href: "/client/dashboard", label: "Dashboard", icon: "dashboard", exact: true },
    { href: "/client/projects", label: "Projects", icon: "projects" },
    { href: "/client/payments", label: "Payments", icon: "wallet" },
    { href: "/client/settings", label: "Settings", icon: "settings" },
  ];

  return (
    <DashboardShell user={user} items={items}>
      {children}
    </DashboardShell>
  );
}
