import { Shell } from "@/components/shell";
import { requireOrg } from "@/lib/session";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const org = await requireOrg("agency");
  return <Shell org={org}>{children}</Shell>;
}
