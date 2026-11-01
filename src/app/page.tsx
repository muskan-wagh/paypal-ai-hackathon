import { redirect } from "next/navigation";
import AppHeader from "@/components/app-header";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSessionUser();
  if (user) redirect("/milestones");
  redirect("/login");
}
