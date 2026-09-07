import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StyleSheet } from "react-native";
import { AppearanceProvider } from "./src/appearance/AppearanceContext";
import { AuthProvider } from "./src/auth/AuthContext";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { useAuth } from "./src/auth/AuthContext";
import {
  initializeNotifications,
  setupNotificationListeners,
  showForegroundNotificationAlert,
} from "./src/services/notifications";
import { useEffect } from "react";

function NotificationBootstrap() {
  const { ready, token } = useAuth();

  useEffect(() => {
    if (!ready) {
      return;
    }
    void initializeNotifications(token);
  }, [ready, token]);

  useEffect(() => {
    if (!ready) {
      return () => {};
    }
    return setupNotificationListeners(
      {
        onForegroundMessage: showForegroundNotificationAlert,
      },
      token,
    );
  }, [ready, token]);

  return null;
}

export default function App() {

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <NotificationBootstrap />
          <AppearanceProvider>
            <NavigationContainer>
              <StatusBar style="dark" />
              <AppNavigator />
            </NavigationContainer>
          </AppearanceProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
