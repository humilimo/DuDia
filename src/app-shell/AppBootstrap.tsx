import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { initStore } from "@/src/lib/domain/store";
import { initSettings } from "@/src/lib/storage/settings";
import { useTheme } from "@/src/theme";

const AppReadyContext = createContext(false);

export function AppBootstrap({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const { tokens } = useTheme();

  useEffect(() => {
    Promise.all([initStore(), initSettings()]).then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={[styles.loading, { backgroundColor: tokens.palette.background }]}>
        <ActivityIndicator size="large" color={tokens.palette.primary} />
      </View>
    );
  }

  return <AppReadyContext.Provider value={true}>{children}</AppReadyContext.Provider>;
}

export function useAppReady() {
  return useContext(AppReadyContext);
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
