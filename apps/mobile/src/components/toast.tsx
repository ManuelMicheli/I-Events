import { useSegments } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { easeInOut, easeOut, useReduceMotion } from "@/lib/motion";
import { radius, space, useTheme } from "@/theme";
import { AnimatedPath } from "./icon-kit";
import { T } from "./text";

/**
 * Toast (Carta item 12), as on the website: Grafite on Carta (inverted in dark mode), radius 12, at
 * most 360 wide, icon on the left, optional text action in Fiamma 400. One at a time: a new one
 * replaces the one on screen. It stays 4 s (6 s with an action), rises 12 in 200 ms and leaves in
 * 160 ms; the tick of a success draws itself. Above the tab bar where there is one. With Reduce
 * Motion it simply fades. Screen readers hear it as it appears.
 */
export type ToastTone = "neutral" | "success" | "error";
type Toast = { id: number; text: string; tone: ToastTone; action?: { label: string; onPress: () => void } };
type ToastInput = Omit<Toast, "id" | "tone"> & { tone?: ToastTone };

const ToastContext = createContext<(t: ToastInput) => void>(() => {});

export const useToast = () => useContext(ToastContext);

/** Tab bar height on the main sections (see app/(tabs)/_layout.tsx). */
const TAB_BAR = 56;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const next = useRef(0);
  const show = useCallback((t: ToastInput) => {
    next.current += 1;
    setToast({ id: next.current, tone: "success", ...t });
    AccessibilityInfo.announceForAccessibility(t.text);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      <View style={styles.fill}>
        {children}
        {toast && <ToastView key={toast.id} toast={toast} onGone={() => setToast((now) => (now?.id === toast.id ? null : now))} />}
      </View>
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onGone }: { toast: Toast; onGone: () => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const segments = useSegments() as string[];
  const reduce = useReduceMotion();
  const [shown] = useState(() => new Animated.Value(0));
  const [rise] = useState(() => new Animated.Value(12));
  const [tick] = useState(() => new Animated.Value(12));
  const leaving = useRef(false);

  const leave = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    Animated.parallel([
      Animated.timing(shown, { toValue: 0, duration: reduce ? 120 : 160, easing: easeInOut, useNativeDriver: true }),
      Animated.timing(rise, { toValue: reduce ? 0 : 8, duration: 160, easing: easeInOut, useNativeDriver: true }),
    ]).start(onGone);
  }, [shown, rise, reduce, onGone]);

  useEffect(() => {
    if (reduce) {
      rise.setValue(0);
      tick.setValue(0);
      Animated.timing(shown, { toValue: 1, duration: 120, useNativeDriver: true }).start();
    } else {
      Animated.parallel([
        Animated.timing(shown, { toValue: 1, duration: 200, easing: easeOut, useNativeDriver: true }),
        Animated.timing(rise, { toValue: 0, duration: 200, easing: easeOut, useNativeDriver: true }),
        Animated.timing(tick, { toValue: 0, duration: 240, delay: 120, easing: easeOut, useNativeDriver: false }),
      ]).start();
    }
    const t = setTimeout(leave, toast.action ? 6000 : 4000);
    return () => clearTimeout(t);
  }, [shown, rise, tick, reduce, leave, toast.action]);

  const bottom = segments[0] === "(tabs)" ? TAB_BAR + insets.bottom + space[3] : Math.max(insets.bottom, space[4]) + space[4];
  return (
    <View pointerEvents="box-none" style={[styles.slot, { bottom }]}>
      <Animated.View
        accessibilityRole="alert"
        style={[styles.toast, { backgroundColor: c.textPrimary, opacity: shown, transform: [{ translateY: rise }] }]}
      >
        {toast.tone !== "neutral" && (
          <Svg width={20} height={20} viewBox="0 0 20 20" fill="none" style={styles.icon}>
            <Circle cx={10} cy={10} r={7.25} stroke={c.bgApp} strokeWidth={1.5} />
            {toast.tone === "success" ? (
              <AnimatedPath
                d="M6.75 10.25l2.25 2.25 4.25-4.75"
                stroke={c.bgApp}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={12}
                strokeDashoffset={tick}
              />
            ) : (
              <>
                <Path d="M10 6.25v4.5" stroke={c.bgApp} strokeWidth={1.5} strokeLinecap="round" />
                <Circle cx={10} cy={13.5} r={0.9} fill={c.bgApp} />
              </>
            )}
          </Svg>
        )}
        <T variant="callout" style={[styles.text, { color: c.bgApp }]}>
          {toast.text}
        </T>
        {toast.action && (
          <Pressable
            onPress={() => {
              toast.action?.onPress();
              leave();
            }}
            accessibilityRole="button"
            hitSlop={{ top: 6, bottom: 6 }}
            style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}
          >
            <T variant="calloutStrong" style={{ color: c.toastAction }}>
              {toast.action.label}
            </T>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  slot: { position: "absolute", left: space[4], right: space[4], alignItems: "center" },
  toast: {
    width: "100%",
    maxWidth: 360,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space[3],
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  icon: { marginTop: 1 },
  text: { flex: 1 },
  action: { minHeight: 32, marginVertical: -space[1], marginRight: -space[2], paddingHorizontal: space[2], justifyContent: "center", borderRadius: radius.sm },
});
