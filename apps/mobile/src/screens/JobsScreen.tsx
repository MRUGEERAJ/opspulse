import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { CompositeNavigationProp } from "@react-navigation/native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../auth/AuthContext";
import { listAssignedJobs } from "../jobs/jobs.api";
import type { AssignedJob } from "../jobs/jobs.types";
import {
  formatJobDueDate,
  getJobPriorityLabel,
  getJobStatusLabel
} from "../jobs/jobs.utils";
import type {
  AppTabParamList,
  RootStackParamList
} from "../navigation/navigation.types";
import { ApiError } from "../shared/api/api-client";
import { PrimaryButton } from "../shared/components/PrimaryButton";
import { colors } from "../shared/theme";

type JobsNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, "Jobs">,
  NativeStackNavigationProp<RootStackParamList>
>;

const FIRST_PAGE = 1;
const PAGE_SIZE = 20;

export function JobsScreen() {
  const navigation = useNavigation<JobsNavigation>();
  const { authenticatedRequest } = useAuth();
  const hasLoadedOnceRef = useRef(false);
  const [jobs, setJobs] = useState<AssignedJob[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadJobs = useCallback(
    async (mode: "initial" | "refresh") => {
      if (mode === "refresh") {
        setIsRefreshing(true);
      } else {
        setIsInitialLoading(true);
      }

      setErrorMessage(null);

      try {
        const response = await listAssignedJobs(authenticatedRequest, {
          page: FIRST_PAGE,
          limit: PAGE_SIZE
        });
        setJobs(response.data);
      } catch (error) {
        setErrorMessage(getJobsErrorMessage(error));
      } finally {
        setIsInitialLoading(false);
        setIsRefreshing(false);
      }
    },
    [authenticatedRequest]
  );

  useFocusEffect(
    useCallback(() => {
      const mode = hasLoadedOnceRef.current ? "refresh" : "initial";
      hasLoadedOnceRef.current = true;
      loadJobs(mode);
    }, [loadJobs])
  );

  const refreshJobs = useCallback(() => {
    loadJobs("refresh");
  }, [loadJobs]);

  const showFullScreenError =
    !isInitialLoading && jobs.length === 0 && errorMessage !== null;

  if (isInitialLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.centerTitle}>Loading assigned jobs</Text>
          <Text style={styles.centerText}>
            Pulling your current field assignments from OpsPulse.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showFullScreenError) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <View style={styles.centerState}>
          <Text style={styles.centerTitle}>Could not load jobs</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <PrimaryButton
            label="Retry"
            onPress={() => {
              loadJobs("initial");
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <FlatList
        contentContainerStyle={styles.content}
        data={jobs}
        keyExtractor={(job) => job.id}
        ListEmptyComponent={<EmptyJobsState />}
        ListHeaderComponent={
          <JobsHeader
            errorMessage={errorMessage}
            totalJobs={jobs.length}
            onRetry={refreshJobs}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            tintColor={colors.primary}
            onRefresh={refreshJobs}
          />
        }
        renderItem={({ item }) => (
          <JobCard
            job={item}
            onPress={() =>
              navigation.navigate("JobDetail", {
                jobId: item.id,
                title: item.title
              })
            }
          />
        )}
      />
    </SafeAreaView>
  );
}

function JobsHeader({
  errorMessage,
  totalJobs,
  onRetry
}: {
  errorMessage: string | null;
  totalJobs: number;
  onRetry: () => void;
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.eyebrow}>Assigned work</Text>
      <Text style={styles.title}>My Jobs</Text>
      <Text style={styles.description}>
        Current jobs assigned to your FieldAgent account.
      </Text>
      <Text style={styles.countText}>
        {totalJobs === 1 ? "1 assigned job" : `${totalJobs} assigned jobs`}
      </Text>

      {errorMessage && (
        <View style={styles.inlineError}>
          <Text style={styles.inlineErrorTitle}>Refresh failed</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <PrimaryButton label="Retry refresh" variant="secondary" onPress={onRetry} />
        </View>
      )}
    </View>
  );
}

function JobCard({ job, onPress }: { job: AssignedJob; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{job.title}</Text>
        <Text style={styles.priority}>{getJobPriorityLabel(job.priority)}</Text>
      </View>

      <View style={styles.badgeRow}>
        <Text style={styles.statusBadge}>{getJobStatusLabel(job.status)}</Text>
      </View>

      <View style={styles.cardMeta}>
        <Text style={styles.metaLabel}>Site</Text>
        <Text style={styles.metaValue}>{job.siteAddress ?? "No site address"}</Text>
      </View>

      <View style={styles.cardMeta}>
        <Text style={styles.metaLabel}>Due</Text>
        <Text style={styles.metaValue}>{formatJobDueDate(job.dueAt)}</Text>
      </View>

      <Text style={styles.link}>View details</Text>
    </Pressable>
  );
}

function EmptyJobsState() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No assigned jobs</Text>
      <Text style={styles.emptyText}>
        When a manager assigns work to your account, it will appear here.
      </Text>
    </View>
  );
}

function getJobsErrorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return "Could not load assigned jobs. Please try again.";
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    flexGrow: 1,
    gap: 14,
    padding: 20
  },
  header: {
    marginBottom: 10
  },
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
  countText: {
    marginTop: 14,
    color: colors.text,
    fontWeight: "800"
  },
  inlineError: {
    gap: 10,
    marginTop: 18,
    borderLeftWidth: 4,
    borderLeftColor: colors.errorText,
    borderRadius: 8,
    backgroundColor: colors.errorBackground,
    padding: 14
  },
  inlineErrorTitle: {
    color: colors.errorText,
    fontWeight: "800"
  },
  card: {
    gap: 12,
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
    fontWeight: "800",
    lineHeight: 23
  },
  priority: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#eef2f1",
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: colors.text,
    fontSize: 11,
    fontWeight: "800"
  },
  badgeRow: {
    flexDirection: "row"
  },
  statusBadge: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: colors.successBackground,
    paddingHorizontal: 9,
    paddingVertical: 5,
    color: colors.successText,
    fontSize: 12,
    fontWeight: "800"
  },
  cardMeta: {
    gap: 3
  },
  metaLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  metaValue: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21
  },
  link: {
    color: colors.primary,
    fontWeight: "800"
  },
  emptyState: {
    gap: 8,
    marginTop: 18,
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
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24
  },
  centerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center"
  },
  centerText: {
    color: colors.muted,
    lineHeight: 22,
    textAlign: "center"
  },
  errorText: {
    color: colors.errorText,
    lineHeight: 21
  }
});
