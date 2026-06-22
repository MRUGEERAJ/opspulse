import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { JobsScreen } from "../screens/JobsScreen";
import { OfflineQueueScreen } from "../screens/OfflineQueueScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import type { AppTabParamList } from "./navigation.types";

const Tab = createBottomTabNavigator<AppTabParamList>();

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: "#f4f7f6"
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          color: "#17212b",
          fontWeight: "700"
        },
        tabBarActiveTintColor: "#0f7660",
        tabBarInactiveTintColor: "#64736f",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700"
        }
      }}
    >
      <Tab.Screen name="Jobs" component={JobsScreen} />
      <Tab.Screen
        name="OfflineQueue"
        component={OfflineQueueScreen}
        options={{ title: "Offline Queue" }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
