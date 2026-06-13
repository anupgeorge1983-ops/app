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
import { MicButton } from "@/src/components/MicButton";

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
          {/* Back */}
          <TouchableOpacity
            testID="new-case-back-button"
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>

          {/* Heading */}
          <Text style={styles.h1}>Name this case.</Text>
          <Text style={styles.sub}>
            A short name to remember it by. Like &quot;the dinner plans&quot; or
            &quot;the text yesterday.&quot;
          </Text>

          {/* Input */}
          <TextInput
            testID="case-title-input"
            value={title}
            onChangeText={setTitle}
            placeholder="The dinner plans"
            placeholderTextColor={theme.colors.charcoal40}
            style={styles.input}
            autoFocus
            autoCapitalize="sentences"
            maxLength={80}
            returnKeyType="done"
            onSubmitEditing={onCreate}
          />

          {/* Mic */}
          <View style={styles.micRow}>
            <MicButton
              onTranscribed={(t) => setTitle((prev) => (prev ? prev + " " : "") + t)}
              size="small"
            />
            <Text style={styles.micHint}>Or tap to speak</Text>
          </View>

          {error && (
            <Text testID="new-case-error" style={styles.error}>
              {error}
            </Text>
          )}

          {/* Submit */}
          <TouchableOpacity
            testID="create-case-button"
            disabled={submitting}
            onPress={onCreate}
            activeOpacity={0.85}
            style={[styles.btnDark, submitting && styles.btnDisabled]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnDarkText}>Start case</Text>
            )}
          </TouchableOpacity>

          {/* Info card */}
          <View style={styles.infoCard}>
            <Feather name="info" size={16} color={theme.colors.amber} />
            <Text style={styles.infoText}>
              You&apos;ll share your side first. Be Heard will mirror what you
              meant before your partner sees anything.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.cream },

  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
  },

  backBtn: { alignSelf: "flex-start", paddingVertical: 6, marginBottom: 28 },
  backBtnText: {
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    color: theme.colors.charcoal40,
  },

  h1: {
    fontFamily: theme.fonts.serifMedium,
    fontSize: 28,
    lineHeight: 36,
    color: theme.colors.charcoal,
    marginBottom: 10,
  },
  sub: {
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.charcoal55,
    marginBottom: 20,
  },

  input: {
    backgroundColor: theme.colors.offWhite,
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: theme.colors.charcoal18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontFamily: theme.fonts.sans,
    fontSize: 17,
    color: theme.colors.charcoal,
    ...theme.shadow.card,
  },

  micRow: {
    alignItems: "center",
    marginTop: 16,
    gap: 6,
  },
  micHint: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.charcoal40,
    marginTop: 4,
  },

  error: {
    fontFamily: theme.fonts.sans,
    color: theme.colors.rose,
    fontSize: 14,
    marginTop: 12,
  },

  btnDark: {
    backgroundColor: theme.colors.charcoal,
    borderRadius: theme.radius.button,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 24,
  },
  btnDarkText: {
    fontFamily: theme.fonts.sansMedium,
    color: "#F7F3EE",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  btnDisabled: { opacity: 0.5 },

  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: theme.colors.amberSoft,
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    color: theme.colors.charcoal55,
    lineHeight: 20,
  },
});
