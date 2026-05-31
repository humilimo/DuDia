import { Tabs } from "expo-router";
import { ChartColumn, DollarSign, History, Package, User } from "lucide-react-native";
import { useTheme } from "@/src/theme";

export default function TabLayout() {
  const { tokens } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.palette.primary,
        tabBarInactiveTintColor: tokens.palette.foregroundSubtle,
        tabBarStyle: {
          backgroundColor: tokens.palette.surfaceElevated,
          borderTopColor: tokens.palette.border,
          height: 72,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarItemStyle: { marginTop: -2 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Vendas",
          tabBarIcon: ({ color, size }) => <DollarSign color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="produtos"
        options={{
          title: "Produtos",
          tabBarIcon: ({ color, size }) => <Package color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="balanco"
        options={{
          title: "Balanço",
          tabBarIcon: ({ color, size }) => <ChartColumn color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="historico"
        options={{
          title: "Histórico",
          tabBarIcon: ({ color, size }) => <History color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
