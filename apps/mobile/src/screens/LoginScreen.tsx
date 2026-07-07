import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../shared/api/api-client";
import { PrimaryButton } from "../shared/components/PrimaryButton";
import { Screen } from "../shared/components/Screen";
import { colors } from "../shared/theme";

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("agent@opspulse.local");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login({
        email,
        password
      });
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

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
          <Text style={styles.noticeTitle}>Development login</Text>
          <Text style={styles.noticeText}>
            Use agent@opspulse.local with the seeded DEMO_USER_PASSWORD.
          </Text>
          <Text style={styles.noticeText}>Admin and Manager users use web.</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              editable={!isSubmitting}
              inputMode="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="agent@opspulse.local"
              style={styles.input}
              textContentType="username"
              value={email}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="password"
              editable={!isSubmitting}
              onChangeText={setPassword}
              placeholder="Seeded demo password"
              secureTextEntry
              style={styles.input}
              textContentType="password"
              value={password}
            />
          </View>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <PrimaryButton
            disabled={isSubmitting}
            label={isSubmitting ? "Signing in..." : "Sign in"}
            onPress={() => void handleSubmit()}
          />

          {isSubmitting && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>Checking credentials</Text>
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
}

function getLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Could not sign in. Please try again.";
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
    fontWeight: "800"
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
  },
  form: {
    gap: 16
  },
  field: {
    gap: 7
  },
  label: {
    color: colors.text,
    fontWeight: "800"
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 16
  },
  errorBox: {
    borderLeftWidth: 4,
    borderLeftColor: colors.errorText,
    borderRadius: 8,
    backgroundColor: colors.errorBackground,
    padding: 14
  },
  errorText: {
    color: colors.errorText,
    lineHeight: 21
  },
  loadingRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  loadingText: {
    color: colors.muted,
    fontWeight: "700"
  }
});
