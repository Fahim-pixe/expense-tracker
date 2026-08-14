import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { financeUi } from "@/constants/finance-ui";
import { AmountText, CategoryIcon, EmptyState, PageLoader, SegmentedControl } from "@/components/finance-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getDateLabel, type FinanceTransaction, type TransactionType } from "@/lib/finance";
import { useFinance } from "@/lib/finance-store";

type Filter = "all" | TransactionType;
type LedgerRow = { kind: "date"; id: string; label: string } | { kind: "transaction"; id: string; transaction: FinanceTransaction };

export default function TransactionsScreen() {
  const colors = useColors();
  const { transactions, categories, preferences, deleteTransaction, isReady } = useFinance();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const rows = useMemo<LedgerRow[]>(() => {
    const visible = transactions
      .filter((item) => filter === "all" || item.type === filter)
      .filter((item) => {
        const categoryName = categories.find((category) => category.id === item.categoryId)?.name ?? "";
        return `${item.note} ${categoryName}`.toLowerCase().includes(query.trim().toLowerCase());
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    return visible.reduce<LedgerRow[]>((result, transaction, index) => {
      if (index === 0 || visible[index - 1].date !== transaction.date) result.push({ kind: "date", id: `date-${transaction.date}`, label: getDateLabel(transaction.date) });
      result.push({ kind: "transaction", id: transaction.id, transaction });
      return result;
    }, []);
  }, [categories, filter, query, transactions]);

  const confirmDelete = (transaction: FinanceTransaction) => {
    Alert.alert("Delete transaction?", "This will remove the entry from your on-device ledger.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteTransaction(transaction.id) },
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
              <TextInput value={query} onChangeText={setQuery} placeholder="Search notes or categories" placeholderTextColor={colors.muted} style={[styles.searchInput, { color: colors.foreground }]} returnKeyType="done" />
              {query ? <Pressable onPress={() => setQuery("")} accessibilityLabel="Clear search" style={({ pressed }) => [styles.clearSearch, pressed && { opacity: financeUi.opacity.pressed }]}><MaterialIcons name="close" size={18} color={colors.muted} /></Pressable> : null}
            </View>
            <SegmentedControl value={filter} onChange={setFilter} options={[{ label: "All", value: "all" }, { label: "Income", value: "income" }, { label: "Expenses", value: "expense" }]} />
          </View>
        }
        renderItem={({ item }) => {
          if (item.kind === "date") return <Text style={[styles.dateHeader, { color: colors.muted }]}>{item.label}</Text>;
          const category = categories.find((entry) => entry.id === item.transaction.categoryId);
          if (!category) return null;
          return (
            <Pressable onLongPress={() => confirmDelete(item.transaction)} accessibilityLabel={`Delete ${item.transaction.note || category.name}`} style={({ pressed }) => [styles.transactionRow, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: financeUi.opacity.pressed }]}>
              <CategoryIcon category={category} />
              <View style={styles.transactionContent}>
                <Text style={[styles.transactionTitle, { color: colors.foreground }]} numberOfLines={1}>{item.transaction.note || category.name}</Text>
                <Text style={[styles.transactionMeta, { color: colors.muted }]}>{category.name} · Hold to delete</Text>
              </View>
              <AmountText amountCents={item.transaction.amountCents} currencyCode={preferences.currencyCode} type={item.transaction.type} size="small" />
            </Pressable>
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
  dateHeader: { fontSize: 12, lineHeight: 18, fontWeight: "800", letterSpacing: 0.6, marginTop: 21, marginBottom: 8, textTransform: "uppercase" },
  pressed: { opacity: financeUi.opacity.pressed, transform: [{ scale: 0.97 }] },
  searchBox: { height: 48, borderWidth: financeUi.line.subtle, borderRadius: financeUi.radius.button, paddingLeft: 13, paddingRight: 6, alignItems: "center", flexDirection: "row", marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15, paddingHorizontal: 10, height: "100%" },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 1 },
  title: { fontSize: 28, lineHeight: 35, fontWeight: "800", letterSpacing: -0.6 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 19 },
  transactionContent: { flex: 1 },
  transactionMeta: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  transactionRow: { minHeight: 72, borderRadius: financeUi.radius.button, borderWidth: financeUi.line.subtle, paddingHorizontal: 12, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 11 },
  transactionTitle: { fontSize: 15, lineHeight: 21, fontWeight: "700" },
});
