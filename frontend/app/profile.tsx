import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { theme } from "@/src/theme";
import { api, Profile } from "@/src/api";
import { getOrCreateUserId, resetSession, getUserNames } from "@/src/session";
import { Eyebrow } from "@/src/components/ui";

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [names, setNames] = useState<{ name: string; partner: string }>({ name: "", partner: "" });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const uid = await getOrCreateUserId();
    const local = await getUserNames();
    setNames(local);
    try {
      const p = await api.getProfile(uid);
      setProfile(p);
    } catch {
      setProfile(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const reset = async () => {
    await resetSession();
    router.replace("/onboarding");
  };

  const displayName = names.name || profile?.name || "You";
  const displayPartner = names.partner || profile?.partner_name || "Partner";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          testID="profile-back-button"
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Eyebrow label="Your profile" />
        <Text style={styles.h1}>About you</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.rose} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.name} testID="profile-name">
            {displayName}
          </Text>
          <Text style={styles.partnerLine}>
            with{" "}
            <Text style={styles.partnerName}>{displayPartner}</Text>
          </Text>

          {/* Quick links */}
          <View style={styles.linksBlock}>
            <TouchableOpacity
              testID="profile-past-cases-button"
              onPress={() => router.push("/cases")}
              activeOpacity={0.8}
              style={styles.linkRow}
            >
              <View style={styles.linkIcon}>
                <Feather name="archive" size={18} color={theme.colors.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.linkTitle}>Past conversations</Text>
                <Text style={styles.linkSub}>Review your history</Text>
              </View>
              <Feather name="chevron-right" size={18} color={theme.colors.charcoal40} />
            </TouchableOpacity>

            <TouchableOpacity
              testID="profile-stats-button"
              onPress={() => router.push("/stats")}
              activeOpacity={0.8}
              style={styles.linkRow}
            >
              <View style={styles.linkIcon}>
                <Feather name="bar-chart-2" size={18} color={theme.colors.rose} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.linkTitle}>Your stats</Text>
                <Text style={styles.linkSub}>Personal and community totals</Text>
              </View>
              <Feather name="chevron-right" size={18} color={theme.colors.charcoal40} />
            </TouchableOpacity>
          </View>

          {/* Conflict style answers */}
          {profile?.answers && profile.answers.length > 0 && (
            <View style={styles.answersBlock}>
              <Text style={styles.sectionLabel}>Your conflict style</Text>
              {profile.answers.map((a, idx) => (
                <View key={idx} style={styles.answerCard}>
                  <Text style={styles.answerQ}>{a.question}</Text>
                  <Text style={styles.answerA}>{a.answer}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Reset */}
          <TouchableOpacity
            testID="reset-session-button"
            onPress={reset}
            activeOpacity={0.7}
            style={styles.resetBtn}
          >
            <Feather name="refresh-cw" size={15} color={theme.colors.charcoal40} />
            <Text style={styles.resetText}>Reset onboarding</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.cream },

  header: {
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  backBtn: { alignSelf: "flex-start", paddingVertical: 6, marginBottom: 20 },
  backBtnText: {
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    color: theme.colors.charcoal40,
  },
  h1: {
    fontFamily: theme.fonts.serifMedium,
    fontSize: 26,
    lineHeight: 34,
    color: theme.colors.charcoal,
    marginBottom: 4,
  },

  scroll: {
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 48,
    alignItems: "stretch",
  },

  // Avatar
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: theme.colors.roseSoft,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 14,
  },
  avatarInitial: {
    fontFamily: theme.fonts.serifMedium,
    fontSize: 30,
    color: theme.colors.rose,
  },
  name: {
    fontFamily: theme.fonts.serifMedium,
    fontSize: 22,
    color: theme.colors.charcoal,
    textAlign: "center",
    marginBottom: 4,
  },
  partnerLine: {
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    color: theme.colors.charcoal55,
    textAlign: "center",
    marginBottom: 4,
  },
  partnerName: {
    fontFamily: theme.fonts.sansMedium,
    color: theme.colors.rose,
  },

  // Links
  linksBlock: {
    marginTop: 24,
    gap: 10,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.charcoal18,
    backgroundColor: theme.colors.surface,
    gap: 14,
    ...theme.shadow.card,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.amberSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  linkTitle: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: 15,
    color: theme.colors.charcoal,
  },
  linkSub: {
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    color: theme.colors.charcoal40,
    marginTop: 2,
  },

  // Answers
  answersBlock: { marginTop: 32 },
  sectionLabel: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: theme.colors.charcoal40,
    marginBottom: 12,
  },
  answerCard: {
    backgroundColor: theme.colors.creamWarm,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
  },
  answerQ: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.charcoal40,
    marginBottom: 5,
  },
  answerA: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: 15,
    color: theme.colors.charcoal,
  },

  // Reset
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 40,
    paddingVertical: 12,
  },
  resetText: {
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    color: theme.colors.charcoal40,
  },
});
