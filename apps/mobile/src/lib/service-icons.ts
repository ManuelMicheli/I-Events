import type Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";

type Icon = ComponentProps<typeof Ionicons>["name"];

/** The icon of each service, matching the catalog's own icon names. */
const ICONS: Record<string, Icon> = {
  organization: "clipboard-outline",
  venue: "business-outline",
  logistics: "car-outline",
  av: "volume-high-outline",
  entertainment: "musical-notes-outline",
  security: "shield-checkmark-outline",
  cleaning: "sparkles-outline",
  catering: "restaurant-outline",
  setup: "color-palette-outline",
  staffing: "people-outline",
  media: "camera-outline",
  permits: "document-text-outline",
};

export const serviceIcon = (key: string): Icon => ICONS[key] ?? "ellipsis-horizontal-circle-outline";
