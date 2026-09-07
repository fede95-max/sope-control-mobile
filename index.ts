import { registerRootComponent } from "expo";
import Constants, { ExecutionEnvironment } from "expo-constants";
import App from "./App";

const isDevBuild = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

if (isDevBuild) {
  void import("@react-native-firebase/messaging")
    .then(({ getMessaging, setBackgroundMessageHandler }) => {
      setBackgroundMessageHandler(getMessaging(), async (message) => {
        console.log("Notificación en background:", message.messageId);
      });
    })
    .catch((error) => {
      console.log("Firebase messaging no disponible:", error);
    });
}

registerRootComponent(App);
