import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps
} from "react-native";

import { colors } from "../theme";

type PrimaryButtonProps = PressableProps & {
  label: string;
  variant?: "primary" | "secondary";
};

export function PrimaryButton({
  label,
  variant = "primary",
  disabled,
  ...props
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" ? styles.primary : styles.secondary,
        pressed && styles.pressed,
        disabled && styles.disabled
      ]}
      {...props}
    >
      <Text
        style={
          variant === "primary"
            ? styles.primaryLabel
            : styles.secondaryLabel
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12
  },
  primary: {
    backgroundColor: colors.primary
  },
  secondary: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  primaryLabel: {
    color: colors.surface,
    fontWeight: "800"
  },
  secondaryLabel: {
    color: colors.text,
    fontWeight: "800"
  },
  pressed: {
    opacity: 0.82
  },
  disabled: {
    opacity: 0.55
  }
});
