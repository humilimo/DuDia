import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, PanResponder, Pressable, StyleSheet, View } from "react-native";
import { Mic, X } from "lucide-react-native";
import { Text } from "@/src/components/ui";
import { useTheme, type Tokens } from "@/src/theme";

interface Props {
  listening: boolean;
  processing: boolean;
  durationMs: number;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
}

const fmtDuration = (ms: number) => {
  const totalSec = Math.floor(ms / 1000);
  const min = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const sec = String(totalSec % 60).padStart(2, "0");
  return `${min}:${sec}`;
};

export function MicButton({ listening, processing, durationMs, onStart, onStop, onCancel }: Props) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const [cancelling, setCancelling] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(0)).current;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          if (processing) return;
          setCancelling(false);
          onStart();
        },
        onPanResponderMove: (_e, gesture) => {
          if (processing) return;
          setCancelling(gesture.dy < -70);
        },
        onPanResponderRelease: (_e, gesture) => {
          if (processing) return;
          if (gesture.dy < -70) onCancel();
          else onStop();
          setCancelling(false);
        },
        onPanResponderTerminate: () => {
          if (!processing) onCancel();
          setCancelling(false);
        },
      }),
    [processing, onStart, onStop, onCancel],
  );

  useEffect(() => {
    if (listening) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.1, duration: 480, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 480, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      );
      const ringLoop = Animated.loop(
        Animated.timing(ring, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      );
      loop.start();
      ringLoop.start();
      return () => {
        loop.stop();
        ringLoop.stop();
        ring.setValue(0);
      };
    }
    scale.setValue(1);
    ring.setValue(0);
  }, [listening, scale, ring]);

  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

  return (
    <View style={styles.wrap}>
      {listening ? (
        <View style={[styles.cancelTarget, cancelling && styles.cancelTargetActive]}>
          <X size={14} color={cancelling ? tokens.palette.dangerForeground : tokens.palette.danger} />
          <Text variant="caption" tone={cancelling ? "inverse" : "danger"}>
            {cancelling ? "Solte para cancelar" : "Arraste para cancelar"}
          </Text>
        </View>
      ) : null}
      {listening ? (
        <View style={styles.durationPill}>
          <Text variant="caption" tone="primary">
            {fmtDuration(durationMs)}
          </Text>
        </View>
      ) : null}
      <View style={styles.btnArea}>
        {listening ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ring,
              { backgroundColor: tokens.palette.danger, opacity: ringOpacity, transform: [{ scale: ringScale }] },
            ]}
          />
        ) : null}
        <Animated.View style={{ transform: [{ scale }] }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={listening ? "Soltar microfone" : "Segurar microfone para falar"}
            accessibilityState={{ busy: listening }}
            disabled={processing}
            style={[styles.btn, listening && styles.btnActive]}
            {...panResponder.panHandlers}
          >
            <Mic
              size={28}
              color={listening ? tokens.palette.dangerForeground : tokens.palette.primaryForeground}
            />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    wrap: { alignItems: "center", gap: 6 },
    cancelTarget: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: t.radius.pill,
      paddingHorizontal: t.spacing.md,
      paddingVertical: 4,
      backgroundColor: t.palette.dangerSoft,
      borderWidth: 1,
      borderColor: t.palette.danger,
    },
    cancelTargetActive: { backgroundColor: t.palette.danger, borderColor: t.palette.danger },
    durationPill: {
      backgroundColor: t.palette.surfaceElevated,
      paddingHorizontal: t.spacing.sm,
      paddingVertical: 2,
      borderRadius: t.radius.pill,
      ...t.shadows.sm,
    },
    btnArea: { alignItems: "center", justifyContent: "center", width: 72, height: 72 },
    ring: { position: "absolute", width: 72, height: 72, borderRadius: 36 },
    btn: {
      width: 68,
      height: 68,
      borderRadius: 34,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.palette.primary,
      ...t.shadows.md,
    },
    btnActive: { backgroundColor: t.palette.danger },
  });
}
