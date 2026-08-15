import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { financeUi } from "@/constants/finance-ui";
import { AmountText, CategoryIcon, EmptyState, PageLoader, SegmentedControl } from "@/components/finance-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getDateLabel, groupTransactionsForActivity, type FinanceTransaction, type LedgerActivity, type TransactionType } from "@/lib/finance";
import { useFinance } from "@/lib/finance-store";

type Filter = "all" | TransactionType;
type LedgerRow = { kind: "date"; id: string; label: string } | { kind: "transaction"; id: string; activity: LedgerActivity };

export default function TransactionsScreen() {
  const colors = useColors();
  const { transactions, categories, preferences, deleteTransaction, isReady } = useFinance();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  const rows = useMemo<LedgerRow[]>(() => {
    const visible = groupTransactionsForActivity(transactions)
      .filter((item) => filter === "all" || item.transaction.type === filter)
      .filter((item) => {
        const categoryNames = item.allocations.map((allocation) => categoryById.get(allocation.categoryId)?.name ?? "").join(" ");
        return `${item.transaction.note} ${categoryNames}`.toLowerCase().includes(query.trim().toLowerCase());
      })
    return visible.reduce<LedgerRow[]>((result, activity, index) => {
      if (index === 0 || visible[index - 1].transaction.date !== activity.transaction.date) result.push({ kind: "date", id: `date-${activity.transaction.date}`, label: getDateLabel(activity.transaction.date) });
      result.push({ kind: "transaction", id: activity.id, activity });
      return result;
    }, []);
  }, [categoryById, filter, query, transactions]);

  const confirmDelete = (transaction: FinanceTransaction) => {
    const isSplit = Boolean(transaction.splitGroupId);
    Alert.alert(isSplit ? "Delete split expense?" : "Delete transaction?", isSplit ? "This will remove every category allocation in the grouped expense." : "This will remove the entry from your on-device ledger.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { void deleteTransaction(transaction.id).then((didDelete) => { if (!didDelete) Alert.alert("Couldn’t delete transaction", "Your entry was not changed. Please try again."); }); } },
    ]);
  };

  if (!isReady) return <ScreenContainer><PageLoader /></ScreenContainer>;

  return (
    <ScreenContainer>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={16}
        maxToRenderPerBatch={16}
        windowSize={7}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <View style={styles.titleRow}>
              <View>
                <Text style={[styles.title, { color: colors.foreground }]}>Activity</Text>
                <Text style={[styles.subtitle, { color: colors.muted }]}>Every entry, in one place.</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Add transaction" onPress={() => router.push("/add")} style={({ pressed }) => [styles.addButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
                <MaterialIcons name="add" size={24} color={colors.background} />
              </Pressable>
            </View>
            <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialIcons name="search" size={20} color={colors.muted} />
              <TextInput value={query} onChangeText={setQuery} placeholder="Search notes or categories" placeholderTextColor={colors.muted} accessibilityLabel="Search transactions" style={[styles.searchInput, { color: colors.foreground }]} returnKeyType="done" />
              {query ? <Pressable onPress={() => setQuery("")} accessibilityLabel="Clear search" style={({ pressed }) => [styles.clearSearch, pressed && { opacity: financeUi.opacity.pressed }]}><MaterialIcons name="close" size={18} color={colors.muted} /></Pressable> : null}
            </View>
            <SegmentedControl value={filter} onChange={setFilter} options={[{ label: "All", value: "all" }, { label: "Income", value: "income" }, { label: "Expenses", value: "expense" }]} />
          </View>
        }
        renderItem={({ item }) => {
          if (item.kind === "date") return <Text style={[styles.dateHeader, { color: colors.muted }]}>{item.label}</Text>;
          const transaction = item.activity.transaction;
          const category = categoryById.get(transaction.categoryId);
          if (!category) return null;
          const isSplit = item.activity.isSplit;
          const splitCategories = item.activity.allocations.map((allocation) => categoryById.get(allocation.categoryId)?.name ?? "Unknown category").join(" · ");
          return (
            <View style={[styles.transactionRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Pressable accessibilityRole="button" accessibilityLabel={`${isSplit ? "Edit split expense" : "Edit"} ${transaction.note || category.name}`} accessibilityHint={isSplit ? "Opens the full grouped expense for editing" : "Opens this transaction for editing"} onPress={() => isSplit ? router.push(`/edit-split/${transaction.splitGroupId}` as never) : router.push(`/edit/${transaction.id}` as never)} style={({ pressed }) => [styles.transactionEditButton, pressed && { opacity: financeUi.opacity.pressed }]}>
                {isSplit ? <View style={[styles.splitIcon, { backgroundColor: `${colors.primary}12` }]}><MaterialIcons name="call-split" size={21} color={colors.primary} /></View> : <CategoryIcon category={category} />}
                <View style={styles.transactionContent}>
                  <Text style={[styles.transactionTitle, { color: colors.foreground }]} numberOfLines={1}>{isSplit ? transaction.note || "Split expense" : transaction.note || category.name}</Text>
                  <Text style={[styles.transactionMeta, { color: colors.muted }]} numberOfLines={1}>{isSplit ? `${item.activity.allocations.length} categories · ${splitCategories}` : `${category.name} · ${transaction.date}`}</Text>
                </View>
                <AmountText amountCents={item.activity.amountCents} currencyCode={preferences.currencyCode} type={transaction.type} size="small" />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${transaction.note || category.name}`} accessibilityHint="Permanently removes this transaction after confirmation" onPress={() => confirmDelete(transaction)} style={({ pressed }) => [styles.deleteButton, pressed && { opacity: financeUi.opacity.pressed }]}>
                <MaterialIcons name="delete-outline" size={20} color={colors.error} />
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={<EmptyState icon="search-off" title="Nothing found" description={query ? "Try a different note or category name." : "Record your first transaction to build your activity ledger."} actionLabel={query ? undefined : "Add transaction"} onAction={query ? undefined : () => router.push("/add")} />}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  addButton: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  clearSearch: { width: financeUi.size.tapTarget, height: financeUi.size.tapTarget, alignItems: "center", justifyContent: "center", marginRight: -7 },
  content: { padding: financeUi.spacing.page, paddingBottom: 34 },
  deleteButton: { width: financeUi.size.tapTarget, height: financeUi.size.tapTarget, alignItems: "center", justifyContent: "center", marginRight: -9 },
  dateHeader: { fontSize: 12, lineHeight: 18, fontWeight: "800", letterSpacing: 0.6, marginTop: 21, marginBottom: 8, textTransform: "uppercase" },
  pressed: { opacity: financeUi.opacity.pressed, transform: [{ scale: 0.97 }] },
  searchBox: { height: 48, borderWidth: financeUi.line.subtle, borderRadius: financeUi.radius.button, paddingLeft: 13, paddingRight: 6, alignItems: "center", flexDirection: "row", marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15, paddingHorizontal: 10, height: "100%" },
  splitIcon: { width: 42, height: 42, borderRadius: financeUi.radius.icon, alignItems: "center", justifyContent: "center" },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 1 },
  title: { fontSize: 28, lineHeight: 35, fontWeight: "800", letterSpacing: -0.6 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 19 },
  transactionContent: { flex: 1 },
  transactionEditButton: { flex: 1, minHeight: 70, flexDirection: "row", alignItems: "center", gap: 11 },
  transactionMeta: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  transactionRow: { minHeight: 72, borderRadius: financeUi.radius.button, borderWidth: financeUi.line.subtle, paddingLeft: 12, paddingRight: 5, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 11 },
  transactionTitle: { fontSize: 15, lineHeight: 21, fontWeight: "700" },
});
