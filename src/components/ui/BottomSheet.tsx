import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
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
  const { height: windowH } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(40)).current;
  const [keyboardPad, setKeyboardPad] = useState(0);

  useEffect(() => {
    if (!visible) {
      fade.setValue(0);
      slide.setValue(40);
      setKeyboardPad(0);
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

  useEffect(() => {
    if (!visible) return;
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const subShow = Keyboard.addListener(showEvt, (e) => {
      setKeyboardPad(e.endCoordinates.height);
    });
    const subHide = Keyboard.addListener(hideEvt, () => {
      setKeyboardPad(0);
    });
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [visible]);

  const basePad = insets.bottom + tokens.spacing.lg;
  const sheetPadBottom = basePad + keyboardPad;
  const scrollMinWhenKb =
    keyboardPad > 0 ? Math.max(220, windowH - keyboardPad - insets.top - 100) : undefined;

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
            {
              paddingBottom: sheetPadBottom,
              transform: [{ translateY: slide }],
              maxHeight: Math.min(windowH * 0.88, 640),
            },
            contentStyle,
          ]}
        >
          <View style={styles.inner}>
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
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={[
                styles.scrollInner,
                keyboardPad > 0 && scrollMinWhenKb !== undefined
                  ? { minHeight: scrollMinWhenKb, justifyContent: "center" }
                  : null,
              ]}
            >
              {children}
            </ScrollView>
          </View>
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
      ...t.shadows.lg,
    },
    inner: { width: "100%" },
    scrollInner: {
      flexGrow: 1,
      paddingBottom: t.spacing.md,
      gap: t.spacing.md,
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
