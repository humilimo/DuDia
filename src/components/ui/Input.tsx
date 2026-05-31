import { forwardRef, useMemo, useState } from "react";
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useTheme, type Tokens } from "@/src/theme";
import { Text } from "./Text";

export interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  errorText?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    hint,
    errorText,
    leadingIcon,
    trailingIcon,
    containerStyle,
    style,
    onFocus,
    onBlur,
    placeholderTextColor,
    ...rest
  },
  ref,
) {
  const { tokens } = useTheme();
  const [focused, setFocused] = useState(false);
  const styles = useMemo(() => makeStyles(tokens), [tokens]);

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? (
        <Text variant="overline" tone="muted" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.fieldRow,
          focused && styles.fieldFocused,
          !!errorText && styles.fieldError,
        ]}
      >
        {leadingIcon}
        <TextInput
          ref={ref}
          {...rest}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={placeholderTextColor ?? tokens.palette.foregroundSubtle}
          style={[styles.input, style]}
        />
        {trailingIcon}
      </View>
      {errorText ? (
        <Text variant="caption" tone="danger" style={styles.hint}>
          {errorText}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="subtle" style={styles.hint}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    wrap: { gap: t.spacing.xs },
    label: { marginLeft: t.spacing.xs },
    fieldRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
      minHeight: 52,
      paddingHorizontal: t.spacing.lg,
      borderRadius: t.radius.md,
      borderWidth: 1,
      borderColor: t.palette.border,
      backgroundColor: t.palette.surface,
    },
    fieldFocused: { borderColor: t.palette.primary, borderWidth: 2, paddingHorizontal: t.spacing.lg - 1 },
    fieldError: { borderColor: t.palette.danger, borderWidth: 2, paddingHorizontal: t.spacing.lg - 1 },
    input: {
      flex: 1,
      fontSize: 16,
      fontWeight: "600",
      color: t.palette.foreground,
      paddingVertical: t.spacing.sm,
    },
    hint: { marginLeft: t.spacing.xs },
  });
}
