import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { PropsWithChildren } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../auth/AuthContext";
import { JobDetailScreen } from "../screens/JobDetailScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { colors } from "../shared/theme";
import { SyncQueueProvider } from "../sync-queue/SyncQueueContext";
import { AppTabs } from "./AppTabs";
import type { RootStackParamList } from "./navigation.types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { status } = useAuth();

  if (status === "checking") {
    return <SessionRestoreScreen />;
  }

  return status === "authenticated" ? (
    <AuthenticatedStack />
  ) : (
    <AnonymousStack />
  );
}

function AuthenticatedStack() {
  return (
    <SyncQueueBoundary>
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
      </Stack.Navigator>
    </SyncQueueBoundary>
  );
}

function SyncQueueBoundary({ children }: PropsWithChildren) {
  return <SyncQueueProvider>{children}</SyncQueueProvider>;
}

function AnonymousStack() {
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
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function SessionRestoreScreen() {
  return (
    <View style={styles.restoreContainer}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.restoreTitle}>Restoring session</Text>
      <Text style={styles.restoreText}>
        Checking your secure mobile session with OpsPulse.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  restoreContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    padding: 24
  },
  restoreTitle: {
    marginTop: 18,
    color: colors.text,
    fontSize: 20,
    fontWeight: "800"
  },
  restoreText: {
    marginTop: 8,
    color: colors.muted,
    lineHeight: 22,
    textAlign: "center"
  }
});
