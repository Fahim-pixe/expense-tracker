import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { financeUi } from "@/constants/finance-ui";
import { AmountText, EmptyState, PageLoader, SectionTitle, SurfaceCard } from "@/components/finance-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { calculateTotals, formatMonth, formatMoney, getCategoryTotals, getMonthTransactions, getNextMonth, getPreviousMonth } from "@/lib/finance";
import { useFinance } from "@/lib/finance-store";

export default function InsightsScreen() {
  const colors = useColors();
  const { transactions, categories, preferences, isReady } = useFinance();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const monthTransactions = useMemo(() => getMonthTransactions(transactions, month), [month, transactions]);
  const totals = useMemo(() => calculateTotals(monthTransactions), [monthTransactions]);
  const categoryTotals = useMemo(() => getCategoryTotals(monthTransactions, categories), [categories, monthTransactions]);
  const dailyTotals = useMemo(() => {
    const dayCount = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return Array.from({ length: dayCount }, (_, index) => {
      const day = index + 1;
      const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return { day, amountCents: monthTransactions.filter((item) => item.type === "expense" && item.date === key).reduce((sum, item) => sum + item.amountCents, 0) };
    });
  }, [month, monthTransactions]);
  const dailyMax = Math.max(...dailyTotals.map((item) => item.amountCents), 1);
  const selectedWeek = dailyTotals.slice(Math.max(0, dailyTotals.length - 7));

  if (!isReady) return <ScreenContainer><PageLoader /></ScreenContainer>;

  return (
    <ScreenContainer>
      <FlatList
        data={categoryTotals}
        keyExtractor={(item) => item.category.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>Insights</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Look at the rhythm behind your choices.</Text>
            <View style={[styles.monthControl, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Pressable onPress={() => setMonth((value) => getPreviousMonth(value))} accessibilityLabel="Previous month" style={({ pressed }) => [styles.monthButton, pressed && { opacity: financeUi.opacity.pressed }]}><MaterialIcons name="chevron-left" size={24} color={colors.foreground} /></Pressable>
              <Text style={[styles.monthLabel, { color: colors.foreground }]}>{formatMonth(month)}</Text>
              <Pressable onPress={() => setMonth((value) => getNextMonth(value))} accessibilityLabel="Next month" style={({ pressed }) => [styles.monthButton, pressed && { opacity: financeUi.opacity.pressed }]}><MaterialIcons name="chevron-right" size={24} color={colors.foreground} /></Pressable>
            </View>
            <View style={styles.statGrid}>
              <SurfaceCard style={styles.statCard}><Text style={[styles.statLabel, { color: colors.muted }]}>INCOME</Text><AmountText amountCents={totals.incomeCents} currencyCode={preferences.currencyCode} type="income" size="regular" /></SurfaceCard>
              <SurfaceCard style={styles.statCard}><Text style={[styles.statLabel, { color: colors.muted }]}>SPENT</Text><AmountText amountCents={totals.expenseCents} currencyCode={preferences.currencyCode} type="expense" size="regular" /></SurfaceCard>
            </View>
            <SurfaceCard style={styles.netCard}>
              <View><Text style={[styles.statLabel, { color: colors.muted }]}>NET FOR {formatMonth(month).toUpperCase()}</Text><Text style={[styles.netValue, { color: totals.balanceCents >= 0 ? colors.success : colors.error }]}>{formatMoney(totals.balanceCents, preferences.currencyCode)}</Text></View>
              <View style={[styles.netIcon, { backgroundColor: `${totals.balanceCents >= 0 ? colors.success : colors.error}18` }]}><MaterialIcons name={totals.balanceCents >= 0 ? "trending-up" : "trending-down"} size={24} color={totals.balanceCents >= 0 ? colors.success : colors.error} /></View>
            </SurfaceCard>
            <SectionTitle title="Spending by category" />
          </>
        }
        renderItem={({ item }) => {
          const percentage = totals.expenseCents ? Math.round((item.amountCents / totals.expenseCents) * 100) : 0;
          return (
            <View style={[styles.categoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.categoryHeadline}>
                <View style={[styles.categoryDot, { backgroundColor: item.category.color }]} />
                <Text style={[styles.categoryName, { color: colors.foreground }]}>{item.category.name}</Text>
                <Text style={[styles.categoryAmount, { color: colors.foreground }]}>{formatMoney(item.amountCents, preferences.currencyCode)}</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: `${item.category.color}18` }]}><View style={[styles.progressValue, { backgroundColor: item.category.color, width: `${percentage}%` }]} /></View>
              <Text style={[styles.categoryPercent, { color: colors.muted }]}>{percentage}% of monthly spending</Text>
            </View>
          );
        }}
        ListEmptyComponent={<EmptyState icon="insights" title="No insights yet" description="As you log expenses for this month, your patterns will appear here." />}
        ListFooterComponent={
          <View style={styles.dailySection}>
            <SectionTitle title="Daily spending" />
            <SurfaceCard>
              {selectedWeek.some((item) => item.amountCents > 0) ? (
                <View style={styles.dailyChart}>
                  {selectedWeek.map((item) => <View key={item.day} style={styles.dailyColumn}><Text style={[styles.dailyValue, { color: colors.muted }]}>{item.amountCents ? formatMoney(item.amountCents, preferences.currencyCode, { compact: true }) : ""}</Text><View style={[styles.dailyTrack, { backgroundColor: `${colors.primary}12` }]}><View style={[styles.dailyBar, { backgroundColor: colors.primary, height: item.amountCents ? Math.max(12, Math.round((item.amountCents / dailyMax) * 82)) : 3 }]} /></View><Text style={[styles.dailyLabel, { color: colors.muted }]}>{item.day}</Text></View>)}
                </View>
              ) : <Text style={[styles.noDailyData, { color: colors.muted }]}>No daily spending has been recorded for this month.</Text>}
            </SurfaceCard>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  categoryAmount: { fontSize: 14, lineHeight: 20, fontWeight: "800", fontVariant: ["tabular-nums"] },
  categoryCard: { borderWidth: financeUi.line.subtle, borderRadius: financeUi.radius.button, padding: 14, marginBottom: 9 },
  categoryDot: { width: 10, height: 10, borderRadius: 5 },
  categoryHeadline: { flexDirection: "row", alignItems: "center", gap: 8 },
  categoryName: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: "700" },
  categoryPercent: { fontSize: 12, lineHeight: 17, marginTop: 6 },
  content: { padding: financeUi.spacing.page, paddingBottom: 34 },
  dailyBar: { width: "100%", borderRadius: 4 },
  dailyChart: { height: 128, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  dailyColumn: { flex: 1, alignItems: "center", height: "100%", justifyContent: "flex-end", gap: 5 },
  dailyLabel: { fontSize: 11, fontWeight: "700" },
  dailyTrack: { width: 13, height: 82, borderRadius: 5, justifyContent: "flex-end", overflow: "hidden" },
  dailyValue: { fontSize: 9, lineHeight: 12, textAlign: "center", minHeight: 12 },
  dailySection: { marginTop: financeUi.spacing.section },
  monthButton: { width: financeUi.size.tapTarget, height: financeUi.size.tapTarget, alignItems: "center", justifyContent: "center" },
  monthControl: { height: 50, borderRadius: financeUi.radius.button, borderWidth: financeUi.line.subtle, alignItems: "center", justifyContent: "space-between", flexDirection: "row", marginTop: 19, marginBottom: 14 },
  monthLabel: { fontSize: 15, lineHeight: 21, fontWeight: "800" },
  netCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: financeUi.spacing.section },
  netIcon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  netValue: { fontSize: 23, lineHeight: 30, fontWeight: "800", fontVariant: ["tabular-nums"], marginTop: 3 },
  noDailyData: { fontSize: 14, lineHeight: 20, textAlign: "center", paddingVertical: 17 },
  progressTrack: { height: 7, borderRadius: 4, marginTop: 12, overflow: "hidden" },
  progressValue: { height: "100%", borderRadius: 4 },
  statCard: { flex: 1, padding: 14 },
  statGrid: { flexDirection: "row", gap: 10, marginBottom: 10 },
  statLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 0.85, fontWeight: "800", marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 1 },
  title: { fontSize: 28, lineHeight: 35, fontWeight: "800", letterSpacing: -0.6 },
});
