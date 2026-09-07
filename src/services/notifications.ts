import { Alert, PermissionsAndroid, Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { registerDeviceToken } from "../api/sope";

type RemoteMessage = {
  messageId?: string;
  notification?: {
    title?: string;
    body?: string;
  };
};

export type NotificationHandlers = {
  onForegroundMessage?: (message: RemoteMessage) => void;
  onNotificationOpened?: (message: RemoteMessage) => void;
};

function isPushNotificationsSupported(): boolean {
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

async function loadMessagingModule() {
  if (!isPushNotificationsSupported()) {
    throw new Error("Push notifications require a development build (not Expo Go)");
  }
  return import("@react-native-firebase/messaging");
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "android" && Platform.Version >= 33) {
    const permission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
      return false;
    }
  }

  try {
    const { AuthorizationStatus, getMessaging, requestPermission } = await loadMessagingModule();
    const status = await requestPermission(getMessaging());
    return (
      status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
}

export async function getFcmToken(): Promise<string | undefined> {
  try {
    const { getMessaging, getToken } = await loadMessagingModule();
    return await getToken(getMessaging());
  } catch (error) {
    console.log("No se pudo obtener el token FCM:", error);
    return undefined;
  }
}

export async function initializeNotifications(accessToken?: string): Promise<string | undefined> {
  if (!isPushNotificationsSupported()) {
    console.log(
      "Las notificaciones push requieren un development build. Ejecuta: npx expo run:android",
    );
    return undefined;
  }

  const granted = await requestNotificationPermission();
  if (!granted) {
    console.log("Permiso de notificaciones rechazado");
    return undefined;
  }

  const token = await getFcmToken();
  if (token === undefined) {
    return undefined;
  }

  console.log("FCM TOKEN:", token);

  if (accessToken !== undefined) {
    try {
      await registerDeviceToken(accessToken, token, Platform.OS === "ios" ? "ios" : "android");
      console.log("Token FCM registrado en el servidor");
    } catch (error) {
      console.log("No se pudo registrar el token en el servidor:", error);
    }
  }

  return token;
}

export function setupNotificationListeners(
  handlers: NotificationHandlers = {},
  accessToken?: string,
): () => void {
  if (!isPushNotificationsSupported()) {
    return () => {};
  }

  let unsubscribe = () => {};

  void loadMessagingModule()
    .then(
      ({
        getInitialNotification,
        getMessaging,
        onMessage,
        onNotificationOpenedApp,
        onTokenRefresh,
      }) => {
        const messaging = getMessaging();

        const unsubOnMessage = onMessage(messaging, (message) => {
          handlers.onForegroundMessage?.(message);
        });

        const unsubOnOpen = onNotificationOpenedApp(messaging, (message) => {
          handlers.onNotificationOpened?.(message);
        });

        const unsubOnRefresh = onTokenRefresh(messaging, (token) => {
          console.log("FCM token actualizado:", token);
          if (accessToken !== undefined) {
            void registerDeviceToken(
              accessToken,
              token,
              Platform.OS === "ios" ? "ios" : "android",
            ).catch((error) => {
              console.log("No se pudo actualizar el token en el servidor:", error);
            });
          }
        });

        void getInitialNotification(messaging).then((message) => {
          if (message !== null) {
            handlers.onNotificationOpened?.(message);
          }
        });

        unsubscribe = () => {
          unsubOnMessage();
          unsubOnOpen();
          unsubOnRefresh();
        };
      },
    )
    .catch((error) => {
      console.log("Notificaciones push no disponibles en esta build:", error);
    });

  return () => {
    unsubscribe();
  };
}

export function showForegroundNotificationAlert(message: RemoteMessage): void {
  const title = message.notification?.title ?? "Nueva notificación";
  const body = message.notification?.body ?? "";
  Alert.alert(title, body);
}
