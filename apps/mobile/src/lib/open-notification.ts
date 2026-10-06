import { appRouteForLink, parsePushData } from "@i-events/core";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useRef } from "react";
import { env } from "./env";
import { getPushPermission, pushSupported, registerPushToken } from "./push";
import { useSession } from "./session";
import { supabase } from "./supabase";
import { refreshUnread } from "./unread";

type Openable = { id: string; org_id: string; link: string | null; read_at?: string | null };

/** Marks a notification read, switches to the organization it belongs to and opens what it is about. */
export function useOpenNotification() {
  const { orgs, activeOrg, setActiveOrg } = useSession();
  return useCallback(
    async (n: Openable) => {
      if (!n.read_at) {
        await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id).is("read_at", null);
        refreshUnread();
      }
      if (n.org_id !== activeOrg?.id && orgs.some((o) => o.id === n.org_id)) setActiveOrg(n.org_id);
      const route = appRouteForLink(n.link);
      if (route) router.push(route as never);
      else if (n.link?.startsWith("/")) WebBrowser.openBrowserAsync(`${env.siteUrl}${n.link}`);
      else router.push("/notifiche");
    },
    [orgs, activeOrg, setActiveOrg],
  );
}

/** Pushes already opened, so a tap seen both at start and by the listener opens once. */
const handled = new Set<string>();

/**
 * Push on the signed-in screens: registers the phone when permission was already given, refreshes the badge when a
 * push arrives with the app open, and opens what a tapped push is about (also when the tap started the app).
 */
export function usePushNotifications() {
  const open = useOpenNotification();
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!pushSupported) return;
    getPushPermission().then((p) => p === "granted" && registerPushToken());

    const handle = (r: Notifications.NotificationResponse | null) => {
      if (!r || r.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const id = r.notification.request.identifier;
      if (handled.has(id)) return;
      handled.add(id);
      Notifications.clearLastNotificationResponse();
      const data = parsePushData(r.notification.request.content.data);
      if (data) openRef.current({ id: data.notificationId, org_id: data.orgId, link: data.link });
    };
    handle(Notifications.getLastNotificationResponse());
    const tapped = Notifications.addNotificationResponseReceivedListener(handle);
    const received = Notifications.addNotificationReceivedListener(() => refreshUnread());
    return () => {
      tapped.remove();
      received.remove();
    };
  }, []);
}
