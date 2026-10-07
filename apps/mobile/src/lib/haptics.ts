import * as Haptics from "expo-haptics";

/**
 * Haptics that go with the icons in motion (A10): a light tap for each strike of the bell, a medium
 * one when the check-in ticket gives. They are cues of the animations, so with Reduce Motion there
 * are none; the system setting for vibration still has the last word.
 */
export const haptics = {
  light: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  medium: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
};
