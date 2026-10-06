import AsyncStorage from "@react-native-async-storage/async-storage";
import { PUSH_CHANNEL_ID } from "@i-events/core";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

const TOKEN_KEY = "ie-push-token";

/** Push works on real phones only: not on the web, not on the iOS simulator. */
export const pushSupported = (Platform.OS === "ios" || Platform.OS === "android") && Device.isDevice;

if (pushSupported) {
  // While the app is open, a push still shows as a banner and updates the badge.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }),
  });
}

/**
 * Where the person stands with push on this phone. `blocked`: they said no and only the system settings can
 * turn it back on.
 */
export type PushPermission = "unsupported" | "undetermined" | "granted" | "denied" | "blocked";

export async function getPushPermission(): Promise<PushPermission> {
  if (!pushSupported) return "unsupported";
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return "granted";
  if (p.status === "undetermined") return "undetermined";
  return p.canAskAgain ? "denied" : "blocked";
}

/** Asks the system for permission (only when it can still ask) and registers the phone if granted. */
export async function enablePush(): Promise<PushPermission> {
  let state = await getPushPermission();
  if (state === "undetermined" || state === "denied") {
    const p = await Notifications.requestPermissionsAsync();
    state = p.granted ? "granted" : p.canAskAgain ? "denied" : "blocked";
  }
  if (state === "granted") await registerPushToken();
  return state;
}

/** Ties this phone's push token to the signed-in person. Safe to call at every start. */
export async function registerPushToken(): Promise<boolean> {
  if (!pushSupported) return false;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  // Without an EAS project there is no push token: the app works, only without push.
  if (!projectId) return false;
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(PUSH_CHANNEL_ID, {
        name: "Notifiche",
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: "#FF4626",
      });
    }
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { error } = await supabase.rpc("register_push_token", { p_token: token, p_platform: Platform.OS });
    if (error) return false;
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return true;
  } catch {
    return false;
  }
}

/** Before signing out: this phone stops receiving the person's notifications. */
export async function unregisterPushToken(): Promise<void> {
  if (!pushSupported) return;
  const token = await AsyncStorage.getItem(TOKEN_KEY).catch(() => null);
  if (token) await supabase.rpc("unregister_push_token", { p_token: token });
  await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
  await Notifications.setBadgeCountAsync(0).catch(() => false);
}

/** Keeps the app icon badge equal to the unread notifications. */
export function setAppBadge(count: number) {
  if (pushSupported) Notifications.setBadgeCountAsync(count).catch(() => false);
}
