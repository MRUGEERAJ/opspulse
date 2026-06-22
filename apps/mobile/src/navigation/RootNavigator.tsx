import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useDemoAuth } from "../auth/DemoAuthContext";
import { JobDetailScreen } from "../screens/JobDetailScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { AppTabs } from "./AppTabs";
import type { RootStackParamList } from "./navigation.types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated } = useDemoAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: {
          backgroundColor: "#f4f7f6"
        },
        headerStyle: {
          backgroundColor: "#f4f7f6"
        },
        headerShadowVisible: false,
        headerTintColor: "#0f7660"
      }}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen
            name="App"
            component={AppTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="JobDetail"
            component={JobDetailScreen}
            options={({ route }) => ({ title: route.params.title })}
          />
        </>
      ) : (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
}
