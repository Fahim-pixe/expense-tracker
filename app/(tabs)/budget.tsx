import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { EmptyState, PageLoader, SectionTitle, SurfaceCard } from "@/components/finance-ui";
import { ScreenContainer } from "@/components/screen-container";
import { financeUi } from "@/constants/finance-ui";
import { useColors } from "@/hooks/use-colors";
import { calculateBudgetProgress, calculateTotals, formatMonth, formatMoney, getCurrencySymbol, getMonthKey, getMonthTransactions, getMonthlyBudget, getNextMonth, getPreviousMonth, parseAmountToCents, toAmountInput } from "@/lib/finance";
import { requestBudgetWidgetPin } from "@/lib/budget-widget";
import { useFinance } from "@/lib/finance-store";

export default function BudgetScreen() {
  const colors = useColors();
  const { transactions, preferences, budgets, setMonthlyBudget, deleteMonthlyBudget, isReady } = useFinance();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const monthKey = getMonthKey(month);
  const budget = useMemo(() => getMonthlyBudget(budgets, monthKey), [budgets, monthKey]);
  const [amount, setAmount] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const totals = useMemo(() => calculateTotals(getMonthTransactions(transactions, month)), [month, transactions]);
  const progress = calculateBudgetProgress(totals.expenseCents, budget?.amountCents ?? 0);
  const addWidget = async () => {
    const requested = await requestBudgetWidgetPin();
    if (!requested) Alert.alert("Add Budget Snapshot", "Home-screen widget placement is available in Android builds. Open this app on Android, then add Budget Snapshot from your launcher’s widget picker.");
  };

  useEffect(() => {
    setAmount(budget ? toAmountInput(budget.amountCents) : "");
  }, [budget, monthKey]);

  const saveBudget = async () => {
    const amountCents = parseAmountToCents(amount);
    if (amountCents <= 0) {
      Alert.alert("Add a monthly target", "Enter an amount greater than zero before saving your budget.");
      return;
    }
    setIsSaving(true);
    const didSave = await setMonthlyBudget(monthKey, amountCents);
    setIsSaving(false);
    if (!didSave) Alert.alert("Couldn’t save budget", "Your monthly target was not changed. Please try again.");
  };

  const removeBudget = () => {
    Alert.alert("Remove monthly target?", "This keeps your recorded spending but removes the budget target for this month.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => { void deleteMonthlyBudget(monthKey).then((didDelete) => { if (!didDelete) Alert.alert("Couldn’t remove budget", "Your target was not changed. Please try again."); }); } },
    ]);
  };

  if (!isReady) return <ScreenContainer><PageLoader /></ScreenContainer>;

  const progressWidth = `${Math.min(progress.percentUsed, 100)}%` as `${number}%`;
  return (
    <ScreenContainer>
      <FlatList
        data={budget ? [budget] : []}
        keyExtractor={(item) => item.monthKey}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<>
          <Text style={[styles.title, { color: colors.foreground }]}>Budget</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Give your spending a clear monthly boundary.</Text>
          <View style={[styles.monthControl, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => setMonth((value) => getPreviousMonth(value))} style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}><MaterialIcons name="chevron-left" size={24} color={colors.foreground} /></Pressable>
            <Text style={[styles.monthLabel, { color: colors.foreground }]}>{formatMonth(month)}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => setMonth((value) => getNextMonth(value))} style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}><MaterialIcons name="chevron-right" size={24} color={colors.foreground} /></Pressable>
          </View>
          {budget ? <SurfaceCard style={[styles.progressCard, { backgroundColor: progress.isAtBudget ? `${colors.error}12` : colors.surface, borderColor: progress.isAtBudget ? `${colors.error}66` : colors.border }]}>
            <View style={styles.progressHeading}><View><Text style={[styles.budgetLabel, { color: colors.muted }]}>MONTHLY SPENDING</Text><Text style={[styles.spendingValue, { color: progress.isAtBudget ? colors.error : colors.foreground }]}>{formatMoney(progress.expenseCents, preferences.currencyCode)}</Text></View><View style={[styles.progressIcon, { backgroundColor: progress.isAtBudget ? `${colors.error}16` : `${colors.primary}14` }]}><MaterialIcons name={progress.isAtBudget ? "warning-amber" : "savings"} size={23} color={progress.isAtBudget ? colors.error : colors.primary} /></View></View>
            <View style={[styles.progressTrack, { backgroundColor: `${progress.isAtBudget ? colors.error : colors.primary}18` }]}><View style={[styles.progressFill, { width: progressWidth, backgroundColor: progress.isAtBudget ? colors.error : colors.primary }]} /></View>
            <Text accessibilityLiveRegion="polite" style={[styles.progressStatus, { color: progress.isAtBudget ? colors.error : colors.muted }]}>{progress.isOverBudget ? `${formatMoney(Math.abs(progress.remainingCents), preferences.currencyCode)} over your monthly target` : progress.isAtBudget ? "You’ve reached your monthly target" : `${formatMoney(progress.remainingCents, preferences.currencyCode)} remaining of ${formatMoney(progress.budgetCents, preferences.currencyCode)}`}</Text>
          </SurfaceCard> : <EmptyState icon="savings" title="Set a monthly target" description="A spending boundary makes it easier to see when your month needs attention." />}
          <SectionTitle title={budget ? "Update target" : "Monthly target"} />
          <SurfaceCard>
            <Text style={[styles.inputLabel, { color: colors.muted }]}>SPENDING LIMIT</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}><Text style={[styles.currencySymbol, { color: colors.primary }]}>{getCurrencySymbol(preferences.currencyCode)}</Text><TextInput value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="decimal-pad" maxLength={12} accessibilityLabel={`Monthly budget in ${preferences.currencyCode}`} style={[styles.input, { color: colors.foreground }]} returnKeyType="done" onSubmitEditing={saveBudget} /></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Save monthly budget" disabled={isSaving} onPress={saveBudget} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary }, isSaving && styles.disabled, pressed && styles.pressed]}><Text style={[styles.primaryButtonText, { color: colors.background }]}>{isSaving ? "Saving…" : "Save monthly target"}</Text></Pressable>
            {budget ? <Pressable accessibilityRole="button" accessibilityLabel="Remove monthly budget" onPress={removeBudget} style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}><Text style={[styles.removeButtonText, { color: colors.error }]}>Remove target</Text></Pressable> : null}
          </SurfaceCard>
          <Pressable accessibilityRole="button" accessibilityLabel="Manage category budgets" onPress={() => router.push("/category-budgets" as never)} style={({ pressed }) => [styles.categoryBudgetsLink, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}><View style={[styles.categoryBudgetsIcon, { backgroundColor: `${colors.primary}14` }]}><MaterialIcons name="pie-chart-outline" size={21} color={colors.primary} /></View><View style={styles.categoryBudgetsCopy}><Text style={[styles.categoryBudgetsTitle, { color: colors.foreground }]}>Category limits</Text><Text style={[styles.categoryBudgetsDescription, { color: colors.muted }]}>Set targets and alerts for specific expense types.</Text></View><MaterialIcons name="chevron-right" size={22} color={colors.muted} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Add Budget Snapshot home screen widget" onPress={addWidget} style={({ pressed }) => [styles.categoryBudgetsLink, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}><View style={[styles.categoryBudgetsIcon, { backgroundColor: `${colors.primary}14` }]}><MaterialIcons name="widgets" size={21} color={colors.primary} /></View><View style={styles.categoryBudgetsCopy}><Text style={[styles.categoryBudgetsTitle, { color: colors.foreground }]}>Budget Snapshot widget</Text><Text style={[styles.categoryBudgetsDescription, { color: colors.muted }]}>View spending limits and alerts from your Android home screen.</Text></View><MaterialIcons name="chevron-right" size={22} color={colors.muted} /></Pressable>
        </>}
        renderItem={() => null}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  budgetLabel: { fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: 0.9 },
  content: { padding: financeUi.spacing.page, paddingBottom: 34 },
  currencySymbol: { fontSize: 24, fontWeight: "800", marginRight: 5 },
  categoryBudgetsCopy: { flex: 1 },
  categoryBudgetsDescription: { fontSize: 12, lineHeight: 17, marginTop: 1 },
  categoryBudgetsIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  categoryBudgetsLink: { minHeight: 68, borderRadius: financeUi.radius.button, borderWidth: financeUi.line.subtle, padding: 12, marginTop: 14, flexDirection: "row", alignItems: "center", gap: 11 },
  categoryBudgetsTitle: { fontSize: 15, lineHeight: 21, fontWeight: "800" },
  disabled: { opacity: 0.65 },
  input: { flex: 1, height: "100%", padding: 0, fontSize: 30, lineHeight: 38, fontWeight: "800", fontVariant: ["tabular-nums"] },
  inputLabel: { fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: 0.9, marginBottom: 8 },
  inputRow: { height: 58, borderWidth: financeUi.line.subtle, borderRadius: financeUi.radius.button, paddingHorizontal: 14, flexDirection: "row", alignItems: "center" },
  monthButton: { width: financeUi.size.tapTarget, height: financeUi.size.tapTarget, alignItems: "center", justifyContent: "center" },
  monthControl: { height: 50, borderRadius: financeUi.radius.button, borderWidth: financeUi.line.subtle, alignItems: "center", justifyContent: "space-between", flexDirection: "row", marginTop: 19, marginBottom: 14 },
  monthLabel: { fontSize: 15, lineHeight: 21, fontWeight: "800" },
  pressed: { opacity: financeUi.opacity.pressed, transform: [{ scale: 0.98 }] },
  primaryButton: { minHeight: 50, marginTop: 14, borderRadius: financeUi.radius.button, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { fontSize: 15, lineHeight: 21, fontWeight: "800" },
  progressCard: { marginBottom: financeUi.spacing.section },
  progressFill: { height: "100%", borderRadius: 5 },
  progressHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  progressIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  progressStatus: { fontSize: 14, lineHeight: 20, marginTop: 10, fontWeight: "700" },
  progressTrack: { height: 9, borderRadius: 5, marginTop: 16, overflow: "hidden" },
  removeButton: { minHeight: financeUi.size.tapTarget, alignSelf: "center", justifyContent: "center", marginTop: 8, paddingHorizontal: 12 },
  removeButtonText: { fontSize: 14, lineHeight: 20, fontWeight: "800" },
  spendingValue: { fontSize: 29, lineHeight: 37, fontWeight: "800", letterSpacing: -0.8, fontVariant: ["tabular-nums"], marginTop: 2 },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 1 },
  title: { fontSize: 28, lineHeight: 35, fontWeight: "800", letterSpacing: -0.6 },
});
