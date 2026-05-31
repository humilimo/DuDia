import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppBootstrap } from "@/src/app-shell/AppBootstrap";
import { ThemeProvider, useTheme } from "@/src/theme";
import { ToastProvider } from "@/src/components/ui";

function ThemedStatusBar() {
  const { resolved } = useTheme();
  return <StatusBar style={resolved === "dark" ? "light" : "light"} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ToastProvider>
          <AppBootstrap>
            <ThemedStatusBar />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
            </Stack>
          </AppBootstrap>
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
