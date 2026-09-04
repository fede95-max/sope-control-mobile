import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import { AccountsScreen } from "../screens/AccountsScreen";
import { BudgetsScreen } from "../screens/BudgetsScreen";
import { CardsScreen } from "../screens/CardsScreen";
import { CategoriesScreen } from "../screens/CategoriesScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { HouseholdScreen } from "../screens/HouseholdScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { MoreScreen } from "../screens/MoreScreen";
import { RecurringScreen } from "../screens/RecurringScreen";
import { TransactionsScreen } from "../screens/TransactionsScreen";
import { colors, space } from "../theme";
import type { MainTabParamList, MoreStackParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();

function MoreNavigator() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen component={MoreScreen} name="MoreMenu" />
      <MoreStack.Screen component={CategoriesScreen} name="Categories" />
      <MoreStack.Screen component={BudgetsScreen} name="Budgets" />
      <MoreStack.Screen component={RecurringScreen} name="Recurring" />
      <MoreStack.Screen component={HouseholdScreen} name="Household" />
    </MoreStack.Navigator>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  const tabBarBottomInset = Platform.OS === "android" ? Math.max(insets.bottom, space.sm) : 0;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: {
          backgroundColor: colors.surface,
          ...(tabBarBottomInset > 0
            ? {
                paddingBottom: tabBarBottomInset,
                height: 56 + tabBarBottomInset,
              }
            : undefined),
        },
      }}
    >
      <Tab.Screen
        component={DashboardScreen}
        name="Dashboard"
        options={{ tabBarLabel: "Resumen", tabBarIcon: ({ color }) => <TabMark color={color} label="R" /> }}
      />
      <Tab.Screen
        component={TransactionsScreen}
        name="Transactions"
        options={{ tabBarLabel: "Movs", tabBarIcon: ({ color }) => <TabMark color={color} label="M" /> }}
      />
      <Tab.Screen
        component={AccountsScreen}
        name="Accounts"
        options={{ tabBarLabel: "Cuentas", tabBarIcon: ({ color }) => <TabMark color={color} label="C" /> }}
      />
      <Tab.Screen
        component={CardsScreen}
        name="Cards"
        options={{ tabBarLabel: "Tarjetas", tabBarIcon: ({ color }) => <TabMark color={color} label="T" /> }}
      />
      <Tab.Screen
        component={MoreNavigator}
        name="More"
        options={{ tabBarLabel: "Más", tabBarIcon: ({ color }) => <TabMark color={color} label="+" /> }}
      />
    </Tab.Navigator>
  );
}

function TabMark({ color, label }: { color: string; label: string }) {
  return <Text style={{ color, fontWeight: "700", fontSize: 16 }}>{label}</Text>;
}

export function AppNavigator() {
  const auth = useAuth();

  if (!auth.ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.teal} size="large" />
      </View>
    );
  }

  if (auth.token === undefined) {
    return <LoginScreen />;
  }

  return <MainTabs />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.ink,
  },
});
