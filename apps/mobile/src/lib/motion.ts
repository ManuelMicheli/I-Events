import { useEffect, useState } from "react";
import { AccessibilityInfo, Easing } from "react-native";

/**
 * Motion ("Carta e inchiostro", A1-A9): 120 / 180 / 240 / 320 ms (theme `motion`), ease-out to enter
 * and answer, ease-in-out to move, no bounce, only transform and opacity. With Reduce Motion every
 * animation becomes a 120 ms fade and loops stop.
 */
export const easeOut = Easing.bezier(0.2, 0, 0, 1);
export const easeInOut = Easing.bezier(0.4, 0, 0.2, 1);

/** Whether the person asked the system for less motion; follows the setting while the app runs. */
export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduce(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}
