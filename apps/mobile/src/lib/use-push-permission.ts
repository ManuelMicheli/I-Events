import { useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { enablePush, getPushPermission, pushSupported, type PushPermission } from "./push";

/** The push permission on this phone, shared by every screen that shows it. */
let state: { permission: PushPermission | null; enabling: boolean } = { permission: pushSupported ? null : "unsupported", enabling: false };
const listeners = new Set<() => void>();
const set = (next: Partial<typeof state>) => {
  state = { ...state, ...next };
  for (const l of listeners) l();
};

function refreshPermission() {
  if (!pushSupported) return;
  getPushPermission().then(
    (permission) => set({ permission }),
    () => set({ permission: "unsupported" }),
  );
}

async function enable() {
  set({ enabling: true });
  const permission = await enablePush().catch((): PushPermission => "denied");
  set({ permission, enabling: false });
}

/** Read again when the person comes back from the system settings. */
export function usePushPermission() {
  useEffect(() => {
    refreshPermission();
    const sub = AppState.addEventListener("change", (s) => s === "active" && refreshPermission());
    return () => sub.remove();
  }, []);
  const current = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
  return { state: current.permission, enabling: current.enabling, enable };
}
