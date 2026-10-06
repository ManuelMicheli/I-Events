import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { pickActiveOrg, type MyOrg } from "./active-org";
import { supabase } from "./supabase";

export type { MyOrg, MyOrgType } from "./active-org";

const ACTIVE_ORG_KEY = "ie-active-org";

type SessionValue = {
  /** "loading" until the stored session has been read. */
  status: "loading" | "signed-out" | "signed-in";
  session: Session | null;
  orgs: MyOrg[];
  orgsStatus: "idle" | "loading" | "ready" | "error";
  activeOrg: MyOrg | null;
  setActiveOrg: (id: string) => void;
  reloadOrgs: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

async function loadOrgs(userId: string): Promise<MyOrg[]> {
  const { data, error } = await supabase
    .from("memberships")
    .select("role, organizations!inner(id, name, slug, type)")
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw error;
  return data.map((m) => ({ ...m.organizations, role: m.role }));
}

/** Who is signed in, their organizations and the one they are working in. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<SessionValue["status"]>("loading");
  /** Organizations of the user they were loaded for, so a different user never sees them. */
  const [loaded, setLoaded] = useState<{ userId: string; orgs: MyOrg[]; failed: boolean } | null>(null);
  const [reloading, setReloading] = useState(false);
  const [savedOrgId, setSavedOrgId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ACTIVE_ORG_KEY)
      .then(setSavedOrgId)
      .catch(() => {});
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setStatus(data.session ? "signed-in" : "signed-out");
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setStatus(next ? "signed-in" : "signed-out");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  const load = useCallback(
    (forUser: string) =>
      loadOrgs(forUser).then(
        (orgs) => setLoaded({ userId: forUser, orgs, failed: false }),
        () => setLoaded({ userId: forUser, orgs: [], failed: true }),
      ),
    [],
  );

  useEffect(() => {
    if (userId) load(userId);
  }, [userId, load]);

  const reloadOrgs = useCallback(async () => {
    if (!userId) return;
    setReloading(true);
    await load(userId);
    setReloading(false);
  }, [userId, load]);

  const setActiveOrg = useCallback((id: string) => {
    setSavedOrgId(id);
    AsyncStorage.setItem(ACTIVE_ORG_KEY, id).catch(() => {});
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem(ACTIVE_ORG_KEY).catch(() => {});
    setSavedOrgId(null);
  }, []);

  const value = useMemo<SessionValue>(() => {
    const current = userId && loaded?.userId === userId ? loaded : null;
    const orgs = current?.orgs ?? [];
    const orgsStatus = !userId ? "idle" : !current || reloading ? "loading" : current.failed ? "error" : "ready";
    return { status, session, orgs, orgsStatus, activeOrg: pickActiveOrg(orgs, savedOrgId), setActiveOrg, reloadOrgs, signOut };
  }, [userId, loaded, reloading, status, session, savedOrgId, setActiveOrg, reloadOrgs, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const v = useContext(SessionContext);
  if (!v) throw new Error("useSession outside SessionProvider");
  return v;
}

/** The active organization on screens that are only reachable with one. */
export function useActiveOrg(): MyOrg {
  const { activeOrg } = useSession();
  if (!activeOrg) throw new Error("No active organization");
  return activeOrg;
}
