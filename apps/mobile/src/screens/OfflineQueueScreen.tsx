import { StyleSheet, Text, View } from "react-native";

import { Screen } from "../shared/components/Screen";
import { colors } from "../shared/theme";

export function OfflineQueueScreen() {
  return (
    <Screen>
      <Text style={styles.eyebrow}>Offline-first foundation</Text>
      <Text style={styles.title}>Offline Queue</Text>
      <Text style={styles.description}>
        The queue screen exists now so future sync work has a stable navigation
        destination.
      </Text>

      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No queued actions</Text>
        <Text style={styles.emptyText}>
          Local persistence, retry counts, conflict results, and failed actions
          are intentionally deferred.
        </Text>
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
    fontSize: 15,
    lineHeight: 23
  },
  emptyState: {
    gap: 8,
    marginTop: 28,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: 12,
    padding: 24
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800"
  },
  emptyText: {
    color: colors.muted,
    lineHeight: 22
  }
});
