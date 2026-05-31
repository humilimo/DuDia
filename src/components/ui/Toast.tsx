import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, StyleSheet, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, type Tokens } from "@/src/theme";
import { Text } from "./Text";

type ToastKind = "info" | "success" | "warning" | "danger";

interface ToastState {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  show: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { base, tones } = useMemo(() => makeStyles(tokens), [tokens]);
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(-20)).current;
  const counter = useRef(0);

  const show = useCallback<ToastContextValue["show"]>((message, kind = "info") => {
    counter.current += 1;
    setToast({ id: counter.current, message, kind });
  }, []);

  useEffect(() => {
    if (!toast) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(translate, { toValue: 0, duration: 220, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(translate, { toValue: -20, duration: 220, useNativeDriver: true }),
      ]).start(() => setToast(null));
    }, 2500);
    return () => clearTimeout(timeout);
  }, [toast, opacity, translate]);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[
            base.wrap,
            tones[toast.kind],
            { top: insets.top + 12, opacity, transform: [{ translateY: translate }] },
          ]}
        >
          <Text variant="bodyStrong" tone="inverse" numberOfLines={2}>
            {toast.message}
          </Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

function makeStyles(t: Tokens) {
  const base = StyleSheet.create({
    wrap: {
      position: "absolute",
      left: t.spacing.lg,
      right: t.spacing.lg,
      paddingHorizontal: t.spacing.lg,
      paddingVertical: t.spacing.md,
      borderRadius: t.radius.md,
      ...t.shadows.lg,
    },
  });
  const tones: Record<ToastKind, ViewStyle> = {
    info: { backgroundColor: t.palette.primary },
    success: { backgroundColor: t.palette.success },
    warning: { backgroundColor: t.palette.warning },
    danger: { backgroundColor: t.palette.danger },
  };
  return { base, tones };
}
