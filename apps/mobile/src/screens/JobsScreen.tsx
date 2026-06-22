import type {
  BottomTabNavigationProp
} from "@react-navigation/bottom-tabs";
import type {
  CompositeNavigationProp
} from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  AppTabParamList,
  RootStackParamList
} from "../navigation/navigation.types";
import { Screen } from "../shared/components/Screen";
import { colors } from "../shared/theme";

type JobsNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, "Jobs">,
  NativeStackNavigationProp<RootStackParamList>
>;

const jobs = [
  {
    id: "demo-generator-inspection",
    title: "Inspect backup generator",
    location: "North Warehouse",
    priority: "HIGH"
  },
  {
    id: "demo-loading-bay-sensor",
    title: "Replace loading bay sensor",
    location: "Loading Bay 2",
    priority: "URGENT"
  }
] as const;

export function JobsScreen() {
  const navigation = useNavigation<JobsNavigation>();

  return (
    <Screen>
      <Text style={styles.eyebrow}>Assigned work</Text>
      <Text style={styles.title}>My Jobs</Text>
      <Text style={styles.description}>
        These are local placeholders for navigation only. Assigned-job API and
        offline storage are deferred.
      </Text>

      <View style={styles.list}>
        {jobs.map((job) => (
          <Pressable
            key={job.id}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed
            ]}
            onPress={() =>
              navigation.navigate("JobDetail", {
                jobId: job.id,
                title: job.title
              })
            }
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{job.title}</Text>
              <Text style={styles.priority}>{job.priority}</Text>
            </View>
            <Text style={styles.location}>{job.location}</Text>
            <Text style={styles.link}>View details →</Text>
          </Pressable>
        ))}
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
  list: {
    gap: 14,
    marginTop: 26
  },
  card: {
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 18
  },
  cardPressed: {
    opacity: 0.78
  },
  cardHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    justifyContent: "space-between"
  },
  cardTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: "800"
  },
  priority: {
    borderRadius: 999,
    backgroundColor: "#eef2f1",
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: colors.text,
    fontSize: 11,
    fontWeight: "800"
  },
  location: {
    color: colors.muted
  },
  link: {
    color: colors.primary,
    fontWeight: "800"
  }
});
