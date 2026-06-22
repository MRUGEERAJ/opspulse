import { StyleSheet, Text, View } from "react-native";

import { useDemoAuth } from "../auth/DemoAuthContext";
import { PrimaryButton } from "../shared/components/PrimaryButton";
import { Screen } from "../shared/components/Screen";
import { colors } from "../shared/theme";

export function LoginScreen() {
  const { login } = useDemoAuth();

  return (
    <Screen>
      <View style={styles.container}>
        <View>
          <Text style={styles.eyebrow}>Offline-first field operations</Text>
          <Text style={styles.title}>OpsPulse Field</Text>
          <Text style={styles.description}>
            Field agents use this app to view assigned jobs and eventually work
            safely through unreliable network conditions.
          </Text>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Development demo login</Text>
          <Text style={styles.noticeText}>No real authentication yet.</Text>
          <Text style={styles.noticeText}>Session is stored only in memory.</Text>
          <Text style={styles.noticeText}>
            Restarting the app will log you out.
          </Text>
        </View>

        <PrimaryButton label="Enter as Demo Field Agent" onPress={login} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    gap: 28,
    paddingVertical: 24
  },
  eyebrow: {
    marginBottom: 8,
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  title: {
    color: colors.text,
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: -1.2
  },
  description: {
    marginTop: 14,
    color: colors.muted,
    fontSize: 16,
    lineHeight: 25
  },
  notice: {
    gap: 5,
    borderLeftWidth: 4,
    borderLeftColor: "#d59a21",
    borderRadius: 8,
    backgroundColor: colors.warningBackground,
    padding: 16
  },
  noticeTitle: {
    color: colors.warningText,
    fontWeight: "800"
  },
  noticeText: {
    color: colors.warningText
  }
});
