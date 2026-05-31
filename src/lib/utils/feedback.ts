import * as Haptics from "expo-haptics";
import { settingsStore } from "@/src/lib/storage/settings";

export async function haptic(ms = 25) {
  if (!settingsStore.get().vibration) return;
  const style =
    ms >= 80
      ? Haptics.ImpactFeedbackStyle.Heavy
      : ms >= 50
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light;
  await Haptics.impactAsync(style);
}

export function feedback(kind: "ok" | "err" | "warn" = "ok") {
  void haptic(kind === "ok" ? 25 : kind === "warn" ? 50 : 80);
}
