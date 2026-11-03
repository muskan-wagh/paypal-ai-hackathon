import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Role router — every login/register lands here and fans out by role. */
export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  redirect(user.role === "client" ? "/client/dashboard" : "/freelancer/dashboard");
}
