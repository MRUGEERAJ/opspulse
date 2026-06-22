import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { DemoAuthProvider } from "./src/auth/DemoAuthContext";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <DemoAuthProvider>
        <NavigationContainer>
          <StatusBar barStyle="dark-content" backgroundColor="#f4f7f6" />
          <RootNavigator />
        </NavigationContainer>
      </DemoAuthProvider>
    </SafeAreaProvider>
  );
}
