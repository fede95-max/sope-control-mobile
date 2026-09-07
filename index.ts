import { registerRootComponent } from "expo";
import App from "./App";

void import("@react-native-firebase/messaging")
  .then(({ getMessaging, setBackgroundMessageHandler }) => {
    setBackgroundMessageHandler(getMessaging(), async (message) => {
      console.log("Notificación en background:", message.messageId);
    });
  })
  .catch(() => {
    // Expo Go no incluye módulos nativos de Firebase.
  });

registerRootComponent(App);
