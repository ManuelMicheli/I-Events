import { Shell } from "@/components/shell";
import { getActiveOrg, requireUser } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const org = await getActiveOrg();
  if (!org) redirect("/onboarding");
  return <Shell org={org}>{children}</Shell>;
}
