import * as Network from "expo-network";

/** False only when the phone knows it has no connection; while it is still finding out, it counts as online. */
export function useOnline(): boolean {
  const s = Network.useNetworkState();
  return s.isConnected !== false && s.isInternetReachable !== false;
}
