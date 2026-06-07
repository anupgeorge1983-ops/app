import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { theme } from "@/src/theme";
import { api } from "@/src/api";
import { getOrCreateUserId, getUserNames } from "@/src/session";

export default function NewCase() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCreate = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const uid = await getOrCreateUserId();
      const { name, partner } = await getUserNames();
      const c = await api.createCase({
        user_id: uid,
        title: title.trim() || "New disagreement",
        partner_a_name: name || "You",
        partner_b_name: partner || "Partner",
      });
      router.replace(`/case/${c.id}`);
    } catch (e: any) {
      setError(e?.message || "Could not start a case. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            testID="new-case-back-button"
            onPress={() => router.back()}
            style={{ width: 40, height: 40, justifyContent: "center" }}
          >
            <Feather name="arrow-left" size={22} color={theme.colors.textHeading} />
          </TouchableOpacity>

          <Text style={styles.h1}>Name this case</Text>
          <Text style={styles.sub}>
            A short name to remember it by. Like &quot;the dinner plans&quot; or &quot;the text
            yesterday.&quot;
          </Text>

          <View style={{ marginTop: theme.spacing.xl }}>
            <TextInput
              testID="case-title-input"
              value={title}
              onChangeText={setTitle}
              placeholder="The dinner plans"
              placeholderTextColor={theme.colors.textSubtle}
              style={styles.input}
              autoFocus
              autoCapitalize="sentences"
              maxLength={80}
              returnKeyType="done"
              onSubmitEditing={onCreate}
            />
          </View>

          {error && (
            <Text testID="new-case-error" style={styles.error}>
              {error}
            </Text>
          )}

          <TouchableOpacity
            testID="create-case-button"
            disabled={submitting}
            onPress={onCreate}
            activeOpacity={0.85}
            style={[styles.primaryBtn, submitting && { opacity: 0.6 }]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Start case</Text>
            )}
          </TouchableOpacity>

          <View style={styles.infoCard}>
            <Feather name="info" size={16} color={theme.colors.primary} />
            <Text style={styles.infoText}>
              You&apos;ll share your side first. Be Heard will mirror what you meant before
              your partner sees anything.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  h1: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.textHeading,
    marginTop: theme.spacing.md,
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 15,
    color: theme.colors.textBody,
    marginTop: theme.spacing.sm,
    lineHeight: 22,
  },
  input: {
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 16,
    fontSize: 17,
    color: theme.colors.textHeading,
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.button,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: theme.spacing.xl,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  error: {
    color: theme.colors.danger,
    fontSize: 14,
    marginTop: theme.spacing.md,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: theme.colors.primaryTint,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
    padding: theme.spacing.md,
    marginTop: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textBody,
    lineHeight: 19,
  },
});
