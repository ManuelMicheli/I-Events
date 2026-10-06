import { AREA_BY_TYPE, getActiveOrg, requireUser } from "@/lib/session";
import { redirect } from "next/navigation";

/** Entry point after sign-in: the area of the active organization, or onboarding. */
export default async function AppEntry() {
  await requireUser();
  const org = await getActiveOrg();
  redirect(org ? AREA_BY_TYPE[org.type] : "/onboarding");
}
