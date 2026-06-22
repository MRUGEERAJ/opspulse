import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";

import type { RootStackParamList } from "../navigation/navigation.types";
import { Screen } from "../shared/components/Screen";
import { colors } from "../shared/theme";

type Props = NativeStackScreenProps<RootStackParamList, "JobDetail">;

export function JobDetailScreen({ route }: Props) {
  return (
    <Screen>
      <Text style={styles.eyebrow}>Placeholder detail</Text>
      <Text style={styles.title}>{route.params.title}</Text>
      <Text style={styles.identifier}>Job ID: {route.params.jobId}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Future field workflow</Text>
        <Text style={styles.body}>
          Status actions, proof photos, location capture, QR scanning, and
          offline queue writes will be added on their focused implementation
          days.
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
    marginTop: 8,
    color: colors.text,
    fontSize: 30,
    fontWeight: "800"
  },
  identifier: {
    marginTop: 10,
    color: colors.muted
  },
  card: {
    gap: 10,
    marginTop: 28,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 18
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800"
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23
  }
});
