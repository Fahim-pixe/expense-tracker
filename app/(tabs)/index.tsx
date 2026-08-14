import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { financeUi } from "@/constants/finance-ui";
import { AmountText, CategoryIcon, EmptyState, PageLoader, SectionTitle, SurfaceCard } from "@/components/finance-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { calculateBudgetProgress, calculateTotals, formatMoney, getCategoryTotals, getLocalDateKey, getMonthKey, getMonthTransactions, getMonthlyBudget, type FinanceTransaction } from "@/lib/finance";
import { useFinance } from "@/lib/finance-store";

function todayKey() {
  return getLocalDateKey();
}

export default function OverviewScreen() {
  const colors = useColors();
  const { transactions, categories, preferences, budgets, categoryBudgets, isReady } = useFinance();
  const monthTransactions = useMemo(() => getMonthTransactions(transactions, new Date()), [transactions]);
  const totals = useMemo(() => calculateTotals(monthTransactions), [monthTransactions]);
  const monthlyBudget = useMemo(() => getMonthlyBudget(budgets, new Date()), [budgets]);
  const budgetProgress = useMemo(() => calculateBudgetProgress(totals.expenseCents, monthlyBudget?.amountCents ?? 0), [monthlyBudget?.amountCents, totals.expenseCents]);
  const allCategoryTotals = useMemo(() => getCategoryTotals(monthTransactions, categories), [categories, monthTransactions]);
  const categoryTotals = useMemo(() => allCategoryTotals.slice(0, 3), [allCategoryTotals]);
  const categoryBudgetAlert = useMemo(() => {
    const spentByCategory = new Map(allCategoryTotals.map((item) => [item.category.id, item.amountCents]));
    return categoryBudgets
      .filter((budget) => budget.monthKey === getMonthKey(new Date()))
      .map((budget) => {
        const category = categories.find((item) => item.id === budget.categoryId);
        const progress = calculateBudgetProgress(spentByCategory.get(budget.categoryId) ?? 0, budget.amountCents);
        return category ? { category, progress } : null;
      })
      .filter((item): item is { category: NonNullable<typeof item>["category"]; progress: ReturnType<typeof calculateBudgetProgress> } => Boolean(item?.progress.isAtBudget))
      .sort((a, b) => b.progress.percentUsed - a.progress.percentUsed)[0];
  }, [allCategoryTotals, categories, categoryBudgets]);
  const recentTransactions = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [transactions],
  );
  const weeklySpend = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, offset) => {
      const day = new Date(today);
      day.setDate(today.getDate() - (6 - offset));
      const key = getLocalDateKey(day);
      const amountCents = transactions.filter((item) => item.type === "expense" && item.date === key).reduce((sum, item) => sum + item.amountCents, 0);
      return { key, label: new Intl.DateTimeFormat("en-US", { weekday: "narrow" }).format(day), amountCents };
    });
  }, [transactions]);
  const weeklyMax = Math.max(...weeklySpend.map((item) => item.amountCents), 1);

  if (!isReady) {
    return <ScreenContainer><PageLoader /></ScreenContainer>;
  }

  return (
    <ScreenContainer>
      <FlatList
        data={recentTransactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.pageHeader}>
              <View>
                <Text style={[styles.eyebrow, { color: colors.muted }]}>THIS MONTH</Text>
                <Text style={[styles.greeting, { color: colors.foreground }]}>Your money, clearly.</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Add transaction" onPress={() => router.push("/add")} style={({ pressed }) => [styles.addButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
                <MaterialIcons name="add" size={24} color={colors.background} />
              </Pressable>
            </View>

            <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}> 
              <View style={styles.balanceTopRow}>
                <View>
                  <Text style={[styles.balanceLabel, { color: colors.background }]}>MONTHLY NET</Text>
                  <Text style={[styles.balanceValue, { color: colors.background }]}>{formatMoney(totals.balanceCents, preferences.currencyCode)}</Text>
                </View>
                <View style={[styles.balanceIcon, { backgroundColor: "rgba(255,255,255,0.16)" }]}>
                  <MaterialIcons name="account-balance-wallet" size={22} color={colors.background} />
                </View>
              </View>
              <View style={styles.balanceFooter}>
                <View>
                  <Text style={[styles.balanceMetaLabel, { color: colors.background }]}>Income</Text>
                  <Text style={[styles.balanceMetaValue, { color: colors.background }]}>{formatMoney(totals.incomeCents, preferences.currencyCode)}</Text>
                </View>
                <View style={[styles.balanceDivider, { backgroundColor: "rgba(255,255,255,0.28)" }]} />
                <View>
                  <Text style={[styles.balanceMetaLabel, { color: colors.background }]}>Spent</Text>
                  <Text style={[styles.balanceMetaValue, { color: colors.background }]}>{formatMoney(totals.expenseCents, preferences.currencyCode)}</Text>
                </View>
              </View>
            </View>

            {monthlyBudget ? <Pressable accessibilityRole="button" accessibilityLabel="Open monthly budget" accessibilityHint={budgetProgress.isOverBudget ? "You are over your monthly budget" : "Review your budget progress"} onPress={() => router.push("/budget" as never)} style={({ pressed }) => [styles.budgetAlert, { backgroundColor: budgetProgress.isAtBudget ? `${colors.error}12` : `${colors.success}12`, borderColor: budgetProgress.isAtBudget ? `${colors.error}55` : `${colors.success}55` }, pressed && styles.pressed]}>
              <View style={[styles.budgetAlertIcon, { backgroundColor: budgetProgress.isAtBudget ? `${colors.error}18` : `${colors.success}18` }]}><MaterialIcons name={budgetProgress.isAtBudget ? "warning-amber" : "savings"} size={20} color={budgetProgress.isAtBudget ? colors.error : colors.success} /></View>
              <View style={styles.budgetAlertCopy}><Text style={[styles.budgetAlertTitle, { color: budgetProgress.isAtBudget ? colors.error : colors.foreground }]}>{budgetProgress.isOverBudget ? `${formatMoney(Math.abs(budgetProgress.remainingCents), preferences.currencyCode)} over budget` : `${formatMoney(budgetProgress.remainingCents, preferences.currencyCode)} left this month`}</Text><Text style={[styles.budgetAlertDescription, { color: colors.muted }]}>{formatMoney(budgetProgress.expenseCents, preferences.currencyCode)} spent of {formatMoney(budgetProgress.budgetCents, preferences.currencyCode)} target</Text></View>
              <MaterialIcons name="chevron-right" size={21} color={colors.muted} />
            </Pressable> : null}

            {categoryBudgetAlert ? <Pressable accessibilityRole="button" accessibilityLabel={`Open ${categoryBudgetAlert.category.name} category budget`} accessibilityHint={`${categoryBudgetAlert.category.name} has reached its spending limit`} onPress={() => router.push("/category-budgets" as never)} style={({ pressed }) => [styles.budgetAlert, { backgroundColor: `${colors.error}12`, borderColor: `${colors.error}55` }, pressed && styles.pressed]}>
              <View style={[styles.budgetAlertIcon, { backgroundColor: `${colors.error}18` }]}><MaterialIcons name="warning-amber" size={20} color={colors.error} /></View>
              <View style={styles.budgetAlertCopy}><Text style={[styles.budgetAlertTitle, { color: colors.error }]}>{categoryBudgetAlert.category.name} is over its limit</Text><Text style={[styles.budgetAlertDescription, { color: colors.muted }]}>{formatMoney(categoryBudgetAlert.progress.expenseCents, preferences.currencyCode)} spent of {formatMoney(categoryBudgetAlert.progress.budgetCents, preferences.currencyCode)} target</Text></View>
              <MaterialIcons name="chevron-right" size={21} color={colors.muted} />
            </Pressable> : null}

            <SectionTitle title="Spending pulse" />
            <SurfaceCard style={styles.pulseCard}>
              <View style={styles.pulseHeader}>
                <View>
                  <Text style={[styles.pulseAmount, { color: colors.foreground }]}>{formatMoney(weeklySpend.reduce((sum, item) => sum + item.amountCents, 0), preferences.currencyCode)}</Text>
                  <Text style={[styles.pulseCaption, { color: colors.muted }]}>spent over the last 7 days</Text>
                </View>
                <View style={[styles.pulseIcon, { backgroundColor: `${colors.error}16` }]}>
                  <MaterialIcons name="show-chart" size={20} color={colors.error} />
                </View>
              </View>
              <View style={styles.barChart}>
                {weeklySpend.map((item) => {
                  const height = item.amountCents === 0 ? 5 : Math.max(12, Math.round((item.amountCents / weeklyMax) * 64));
                  const isToday = item.key === todayKey();
                  return (
                    <View key={item.key} style={styles.barColumn}>
                      <View style={[styles.barTrack, { backgroundColor: `${colors.primary}12` }]}>
                        <View style={[styles.bar, { height, backgroundColor: isToday ? colors.primary : `${colors.primary}80` }]} />
                      </View>
                      <Text style={[styles.barLabel, { color: isToday ? colors.primary : colors.muted }]}>{item.label}</Text>
                    </View>
                  );
                })}
              </View>
            </SurfaceCard>

            <SectionTitle title="Top spending" actionLabel={categoryTotals.length ? "View insights" : undefined} onAction={() => router.push("/insights")} />
            {categoryTotals.length ? (
              <SurfaceCard style={styles.categoriesCard}>
                {categoryTotals.map(({ category, amountCents }) => (
                  <View key={category.id} style={styles.categoryRow}>
                    <CategoryIcon category={category} size={38} />
                    <Text style={[styles.categoryName, { color: colors.foreground }]} numberOfLines={1}>{category.name}</Text>
                    <AmountText amountCents={amountCents} currencyCode={preferences.currencyCode} size="small" />
                  </View>
                ))}
              </SurfaceCard>
            ) : (
              <EmptyState icon="pie-chart-outline" title="No spending yet" description="Add an expense to see what is shaping your month." />
            )}

            <SectionTitle title="Recent activity" actionLabel={recentTransactions.length ? "See all" : undefined} onAction={() => router.push("/transactions")} />
          </>
        }
        renderItem={({ item }) => <TransactionRow item={item} />}
        ListEmptyComponent={<EmptyState icon="receipt-long" title="Start your ledger" description="Your latest income and expenses will appear here." actionLabel="Add a transaction" onAction={() => router.push("/add")} />}
      />
    </ScreenContainer>
  );
}

function TransactionRow({ item }: { item: FinanceTransaction }) {
  const colors = useColors();
  const { categories, preferences } = useFinance();
  const category = categories.find((entry) => entry.id === item.categoryId);
  if (!category) return null;
  return (
    <View style={[styles.transaction, { borderBottomColor: colors.border }]}>
      <CategoryIcon category={category} />
      <View style={styles.transactionBody}>
        <Text style={[styles.transactionName, { color: colors.foreground }]} numberOfLines={1}>{item.note || category.name}</Text>
        <Text style={[styles.transactionMeta, { color: colors.muted }]}>{category.name} · {item.date}</Text>
      </View>
      <AmountText amountCents={item.amountCents} currencyCode={preferences.currencyCode} type={item.type} size="small" />
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  balanceCard: { borderRadius: 26, padding: 21, marginBottom: financeUi.spacing.section, shadowColor: "#1D3EA3", shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  balanceDivider: { width: 1, height: 28 },
  balanceFooter: { flexDirection: "row", alignItems: "center", gap: 18, marginTop: 22 },
  balanceIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  balanceLabel: { fontSize: 11, lineHeight: 16, letterSpacing: 1, fontWeight: "800", opacity: 0.75 },
  balanceMetaLabel: { fontSize: 12, lineHeight: 17, opacity: 0.72 },
  balanceMetaValue: { fontSize: 15, lineHeight: 21, fontWeight: "800", fontVariant: ["tabular-nums"] },
  balanceTopRow: { flexDirection: "row", justifyContent: "space-between" },
  balanceValue: { fontSize: 33, lineHeight: 41, fontWeight: "800", letterSpacing: -1, fontVariant: ["tabular-nums"], marginTop: 4 },
  budgetAlert: { minHeight: 70, borderWidth: financeUi.line.subtle, borderRadius: financeUi.radius.button, paddingHorizontal: 13, marginBottom: financeUi.spacing.section, flexDirection: "row", alignItems: "center", gap: 10 },
  budgetAlertCopy: { flex: 1 },
  budgetAlertDescription: { fontSize: 12, lineHeight: 17, marginTop: 1 },
  budgetAlertIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  budgetAlertTitle: { fontSize: 14, lineHeight: 20, fontWeight: "800" },
  bar: { borderRadius: 5, width: "100%" },
  barChart: { flexDirection: "row", height: 95, alignItems: "flex-end", justifyContent: "space-between", marginTop: 15 },
  barColumn: { flex: 1, alignItems: "center", gap: 7 },
  barLabel: { fontSize: 11, fontWeight: "700" },
  barTrack: { height: 64, width: 10, borderRadius: 5, justifyContent: "flex-end", overflow: "hidden" },
  categoriesCard: { paddingVertical: 8, marginBottom: financeUi.spacing.section },
  categoryName: { flex: 1, fontSize: 15, lineHeight: 21, fontWeight: "700" },
  categoryRow: { flexDirection: "row", alignItems: "center", gap: 11, minHeight: 54 },
  content: { padding: financeUi.spacing.page, paddingBottom: 36 },
  eyebrow: { fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: 1.1 },
  greeting: { fontSize: 24, lineHeight: 31, fontWeight: "800", letterSpacing: -0.5, marginTop: 2 },
  pageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 19 },
  pressed: { opacity: financeUi.opacity.pressed, transform: [{ scale: 0.97 }] },
  pulseAmount: { fontSize: 19, lineHeight: 26, fontWeight: "800", fontVariant: ["tabular-nums"] },
  pulseCaption: { fontSize: 13, lineHeight: 18, marginTop: 1 },
  pulseCard: { marginBottom: financeUi.spacing.section },
  pulseHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pulseIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  transaction: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 66, borderBottomWidth: financeUi.line.subtle },
  transactionBody: { flex: 1 },
  transactionMeta: { fontSize: 12, lineHeight: 17, marginTop: 1 },
  transactionName: { fontSize: 15, lineHeight: 21, fontWeight: "700" },
});
