import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, type Tokens } from "@/src/theme";
import { Text } from "./Text";
import { IconButton } from "./IconButton";
import { X } from "lucide-react-native";

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  dismissOnBackdrop?: boolean;
  contentStyle?: ViewStyle;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  dismissOnBackdrop = true,
  contentStyle,
}: BottomSheetProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (!visible) {
      fade.setValue(0);
      slide.setValue(40);
      return;
    }
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, fade, slide]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissOnBackdrop ? onClose : undefined}
          accessibilityLabel="Fechar"
          accessibilityRole="button"
        />
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + tokens.spacing.lg, transform: [{ translateY: slide }] },
            contentStyle,
          ]}
        >
          <View style={styles.handle} />
          {title ? (
            <View style={styles.header}>
              <Text variant="heading">{title}</Text>
              <IconButton
                label="Fechar"
                icon={<X size={20} color={tokens.palette.foregroundMuted} />}
                tone="neutral"
                onPress={onClose}
              />
            </View>
          ) : null}
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: t.palette.overlay,
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: t.palette.surfaceElevated,
      borderTopLeftRadius: t.radius.xl,
      borderTopRightRadius: t.radius.xl,
      paddingHorizontal: t.spacing.xl,
      paddingTop: t.spacing.sm,
      gap: t.spacing.md,
      ...t.shadows.lg,
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: t.palette.borderStrong,
      marginBottom: t.spacing.sm,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
  });
}
