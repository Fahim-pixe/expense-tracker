import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { CategoryIcon, EmptyState, PageLoader } from "@/components/finance-ui";
import { ScreenContainer } from "@/components/screen-container";
import { financeUi } from "@/constants/finance-ui";
import { useColors } from "@/hooks/use-colors";
import { calculateBudgetProgress, formatMonth, formatMoney, getCategoryBudget, getCategoryTotals, getMonthKey, getMonthTransactions, getNextMonth, getPreviousMonth } from "@/lib/finance";
import { useFinance } from "@/lib/finance-store";

export default function CategoryBudgetsScreen() {
  const colors = useColors();
  const { categories, transactions, categoryBudgets, preferences, isReady } = useFinance();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const monthKey = getMonthKey(month);
  const totalsByCategory = useMemo(() => new Map(getCategoryTotals(getMonthTransactions(transactions, month), categories).map((item) => [item.category.id, item.amountCents])), [categories, month, transactions]);
  const rows = useMemo(() => categories.filter((category) => category.type === "expense").map((category) => { const target = getCategoryBudget(categoryBudgets, monthKey, category.id); return { category, target, progress: calculateBudgetProgress(totalsByCategory.get(category.id) ?? 0, target?.amountCents ?? 0) }; }), [categories, categoryBudgets, monthKey, totalsByCategory]);
  if (!isReady) return <ScreenContainer><PageLoader /></ScreenContainer>;
  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><FlatList data={rows} keyExtractor={(item) => item.category.id} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} ListHeaderComponent={<View><View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Close category budgets" onPress={() => router.back()} style={({ pressed }) => [styles.closeButton, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}><MaterialIcons name="close" size={22} color={colors.foreground} /></Pressable><Text style={[styles.title, { color: colors.foreground }]}>Category limits</Text><View style={styles.closeButton} /></View><Text style={[styles.subtitle, { color: colors.muted }]}>Set a monthly spending boundary for each expense type.</Text><View style={[styles.monthControl, { backgroundColor: colors.surface, borderColor: colors.border }]}><Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => setMonth((value) => getPreviousMonth(value))} style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}><MaterialIcons name="chevron-left" size={24} color={colors.foreground} /></Pressable><Text style={[styles.monthLabel, { color: colors.foreground }]}>{formatMonth(month)}</Text><Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => setMonth((value) => getNextMonth(value))} style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}><MaterialIcons name="chevron-right" size={24} color={colors.foreground} /></Pressable></View></View>} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Set ${item.category.name} budget`} accessibilityHint={item.target ? `${item.progress.percentUsed}% of target used` : "No target set"} onPress={() => router.push({ pathname: "/category-budgets/[id]" as never, params: { id: item.category.id, monthKey } } as never)} style={({ pressed }) => [styles.row, { backgroundColor: item.progress.isAtBudget ? `${colors.error}10` : colors.surface, borderColor: item.progress.isAtBudget ? `${colors.error}55` : colors.border }, pressed && styles.pressed]}><CategoryIcon category={item.category} /><View style={styles.rowCopy}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{item.category.name}</Text><Text style={[styles.rowDetail, { color: item.progress.isAtBudget ? colors.error : colors.muted }]}>{item.target ? item.progress.isOverBudget ? `${formatMoney(Math.abs(item.progress.remainingCents), preferences.currencyCode)} over target` : `${formatMoney(item.progress.remainingCents, preferences.currencyCode)} left` : "No target set"}</Text>{item.target ? <View style={[styles.track, { backgroundColor: `${item.progress.isAtBudget ? colors.error : item.category.color}1A` }]}><View style={[styles.fill, { width: `${Math.min(item.progress.percentUsed, 100)}%` as `${number}%`, backgroundColor: item.progress.isAtBudget ? colors.error : item.category.color }]} /></View> : null}</View><Text style={[styles.spent, { color: colors.foreground }]}>{formatMoney(item.progress.expenseCents, preferences.currencyCode)}</Text><MaterialIcons name="chevron-right" size={21} color={colors.muted} /></Pressable>} ListEmptyComponent={<EmptyState icon="pie-chart-outline" title="No expense categories" description="Add an expense category before setting a category-level target." />} /></ScreenContainer>;
}

const styles = StyleSheet.create({
  closeButton: { width: financeUi.size.tapTarget, height: financeUi.size.tapTarget, borderRadius: 22, borderWidth: financeUi.line.subtle, alignItems: "center", justifyContent: "center" },
  content: { padding: financeUi.spacing.page, paddingBottom: 32 },
  fill: { height: "100%", borderRadius: 4 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  monthButton: { width: financeUi.size.tapTarget, height: financeUi.size.tapTarget, alignItems: "center", justifyContent: "center" },
  monthControl: { height: 50, borderRadius: financeUi.radius.button, borderWidth: financeUi.line.subtle, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18, marginBottom: 16 },
  monthLabel: { fontSize: 15, lineHeight: 21, fontWeight: "800" },
  pressed: { opacity: financeUi.opacity.pressed, transform: [{ scale: 0.98 }] },
  row: { minHeight: 78, borderWidth: financeUi.line.subtle, borderRadius: financeUi.radius.button, padding: 12, marginBottom: 9, flexDirection: "row", alignItems: "center", gap: 10 },
  rowCopy: { flex: 1 },
  rowDetail: { fontSize: 12, lineHeight: 17, marginTop: 1 },
  rowTitle: { fontSize: 15, lineHeight: 21, fontWeight: "800" },
  spent: { fontSize: 13, lineHeight: 19, fontWeight: "800", fontVariant: ["tabular-nums"] },
  subtitle: { fontSize: 14, lineHeight: 20 },
  title: { fontSize: 17, lineHeight: 23, fontWeight: "800" },
  track: { height: 6, borderRadius: 4, overflow: "hidden", marginTop: 7 },
});
