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
  const { token } = useAuth();

  useEffect(() => {
    void initializeNotifications(token);
  }, [token]);

  useEffect(() => {
    return setupNotificationListeners(
      {
        onForegroundMessage: showForegroundNotificationAlert,
      },
      token,
    );
  }, [token]);

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
