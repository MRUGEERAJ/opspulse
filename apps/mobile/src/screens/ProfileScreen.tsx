import type { HealthResponse } from "@opspulse/shared";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useDemoAuth } from "../auth/DemoAuthContext";
import { getApiHealth } from "../shared/api/health";
import { PrimaryButton } from "../shared/components/PrimaryButton";
import { Screen } from "../shared/components/Screen";
import { mobileEnvironment } from "../shared/config/environment";
import { colors } from "../shared/theme";

type HealthState =
  | { status: "loading" }
  | { status: "success"; data: HealthResponse }
  | { status: "error"; message: string };

export function ProfileScreen() {
  const { logout } = useDemoAuth();
  const [healthState, setHealthState] = useState<HealthState>({
    status: "loading"
  });

  const loadHealth = useCallback(async () => {
    setHealthState({ status: "loading" });

    try {
      const data = await getApiHealth();
      setHealthState({ status: "success", data });
    } catch (error) {
      setHealthState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Unknown API health error"
      });
    }
  }, []);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  return (
    <Screen>
      <Text style={styles.eyebrow}>Development account</Text>
      <Text style={styles.title}>Demo Field Agent</Text>
      <Text style={styles.description}>
        No real authentication yet. This session exists only in memory.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Backend connectivity</Text>
        <Text style={styles.endpoint}>{mobileEnvironment.apiUrl}</Text>

        {healthState.status === "loading" && (
          <Text style={styles.muted}>Checking API health…</Text>
        )}

        {healthState.status === "success" && (
          <View style={styles.healthDetails}>
            <Text style={[styles.healthBadge, styles.healthUp]}>Available</Text>
            <Text style={styles.muted}>{healthState.data.service}</Text>
            <Text style={styles.muted}>
              Environment: {healthState.data.environment}
            </Text>
            <Text style={styles.muted}>
              Checked: {new Date(healthState.data.timestamp).toLocaleString()}
            </Text>
          </View>
        )}

        {healthState.status === "error" && (
          <View style={styles.healthDetails}>
            <Text style={[styles.healthBadge, styles.healthDown]}>
              Unavailable
            </Text>
            <Text style={styles.errorText}>{healthState.message}</Text>
          </View>
        )}

        <PrimaryButton
          label="Retry API health"
          variant="secondary"
          disabled={healthState.status === "loading"}
          onPress={() => void loadHealth()}
        />
      </View>

      <View style={styles.logout}>
        <PrimaryButton label="Log out" variant="secondary" onPress={logout} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase"
  },
  title: {
    marginTop: 6,
    color: colors.text,
    fontSize: 32,
    fontWeight: "800"
  },
  description: {
    marginTop: 10,
    color: colors.muted,
    lineHeight: 22
  },
  card: {
    gap: 14,
    marginTop: 28,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 18
  },
  cardLabel: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800"
  },
  endpoint: {
    color: colors.primary,
    fontFamily: "Courier"
  },
  healthDetails: {
    gap: 7
  },
  healthBadge: {
    alignSelf: "flex-start",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontWeight: "800"
  },
  healthUp: {
    color: colors.successText,
    backgroundColor: colors.successBackground
  },
  healthDown: {
    color: colors.errorText,
    backgroundColor: colors.errorBackground
  },
  muted: {
    color: colors.muted
  },
  errorText: {
    color: colors.errorText,
    lineHeight: 21
  },
  logout: {
    marginTop: 20
  }
});
