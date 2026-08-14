import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { financeUi } from "@/constants/finance-ui";
import { SegmentedControl, SurfaceCard } from "@/components/finance-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "@/lib/finance";
import { useFinance } from "@/lib/finance-store";

export default function SettingsScreen() {
  const colors = useColors();
  const { preferences, transactions, categories, updatePreferences, resetData } = useFinance();
  const confirmReset = () => {
    Alert.alert("Reset local data?", "All entries and custom categories on this device will be permanently removed.", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: () => { void resetData().then((didReset) => { if (!didReset) Alert.alert("Couldn’t reset data", "Your ledger was not changed. Please try again."); }); } },
    ]);
  };
  const updateCurrency = (currencyCode: CurrencyCode) => {
    void updatePreferences({ currencyCode }).then((didUpdate) => { if (!didUpdate) Alert.alert("Couldn’t update currency", "Your display currency was not changed. Please try again."); });
  };
  const rows = [
    { id: "categories", icon: "category" as const, title: "Manage categories", detail: `${categories.length} categories`, action: () => router.push("/categories") },
    { id: "reset", icon: "delete-outline" as const, title: "Reset local data", detail: `${transactions.length} transactions stored`, action: confirmReset, destructive: true },
  ];
  return (
    <ScreenContainer>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Make the ledger feel like your own.</Text>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>DISPLAY CURRENCY</Text>
            <SegmentedControl<CurrencyCode> value={preferences.currencyCode} onChange={updateCurrency} options={SUPPORTED_CURRENCIES.map((currency) => ({ label: currency.label, value: currency.code }))} />
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>YOUR DATA</Text>
          </>
        }
        renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={item.title} accessibilityHint={item.detail} onPress={item.action} style={({ pressed }) => [styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: financeUi.opacity.pressed }]}><View style={[styles.settingIcon, { backgroundColor: item.destructive ? `${colors.error}14` : `${colors.primary}12` }]}><MaterialIcons name={item.icon} size={21} color={item.destructive ? colors.error : colors.primary} /></View><View style={styles.settingText}><Text style={[styles.settingTitle, { color: item.destructive ? colors.error : colors.foreground }]}>{item.title}</Text><Text style={[styles.settingDetail, { color: colors.muted }]}>{item.detail}</Text></View><MaterialIcons name="chevron-right" size={22} color={colors.muted} /></Pressable>}
        ListFooterComponent={<SurfaceCard style={styles.privacyCard}><View style={[styles.privacyIcon, { backgroundColor: `${colors.success}16` }]}><MaterialIcons name="phone-iphone" size={21} color={colors.success} /></View><View style={styles.privacyText}><Text style={[styles.privacyTitle, { color: colors.foreground }]}>Private by default</Text><Text style={[styles.privacyDescription, { color: colors.muted }]}>Your ledger lives on this device. This version does not require an account or upload your transactions.</Text></View></SurfaceCard>}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: financeUi.spacing.page, paddingBottom: 34 },
  privacyCard: { marginTop: 20, flexDirection: "row", gap: 12, alignItems: "flex-start" },
  privacyDescription: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  privacyIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  privacyText: { flex: 1 },
  privacyTitle: { fontSize: 14, lineHeight: 20, fontWeight: "800" },
  sectionLabel: { fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: 1, marginTop: 27, marginBottom: 9 },
  settingDetail: { fontSize: 12, lineHeight: 17, marginTop: 1 },
  settingIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  settingRow: { minHeight: 66, borderWidth: financeUi.line.subtle, borderRadius: financeUi.radius.button, padding: 12, flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 8 },
  settingText: { flex: 1 },
  settingTitle: { fontSize: 15, lineHeight: 21, fontWeight: "700" },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 1 },
  title: { fontSize: 28, lineHeight: 35, fontWeight: "800", letterSpacing: -0.6 },
});
