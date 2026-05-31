import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, PanResponder, StyleSheet, View } from "react-native";
import { Mic, X } from "lucide-react-native";
import { useTheme, type Tokens } from "@/src/theme";

interface Props {
  listening: boolean;
  processing: boolean;
  durationMs: number;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
}

export function MicButton({ listening, processing, durationMs: _durationMs, onStart, onStop, onCancel }: Props) {
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
          void onStart();
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
        <View
          style={[styles.cancelTarget, cancelling && styles.cancelTargetActive]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <X size={18} color={cancelling ? tokens.palette.dangerForeground : tokens.palette.danger} />
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
          <View
            accessibilityRole="button"
            accessibilityLabel={listening ? "Soltar microfone" : "Segurar microfone para falar"}
            accessibilityHint={
              listening ? "Arraste para cima e solte para cancelar a gravação." : undefined
            }
            accessibilityState={{ busy: listening, disabled: processing }}
            style={[styles.btn, listening && styles.btnActive, processing && styles.btnDisabled]}
            {...panResponder.panHandlers}
          >
            <Mic
              size={28}
              color={listening ? tokens.palette.dangerForeground : tokens.palette.primaryForeground}
            />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    wrap: { alignItems: "center", gap: 6 },
    cancelTarget: {
      alignItems: "center",
      justifyContent: "center",
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: t.palette.dangerSoft,
      borderWidth: 1,
      borderColor: t.palette.danger,
    },
    cancelTargetActive: { backgroundColor: t.palette.danger, borderColor: t.palette.danger },
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
    btnDisabled: { opacity: 0.45 },
  });
}
