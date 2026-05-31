import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppBootstrap } from "@/src/context/AppBootstrap";

export default function RootLayout() {
  return (
    <AppBootstrap>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AppBootstrap>
  );
}
