import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { CategoryIcon, SegmentedControl } from "@/components/finance-ui";
import { ScreenContainer } from "@/components/screen-container";
import { financeUi } from "@/constants/finance-ui";
import { useColors } from "@/hooks/use-colors";
import { MAX_TRANSACTION_NOTE_LENGTH, getCurrencySymbol, isValidDate, parseAmountToCents, toAmountInput, type TransactionType } from "@/lib/finance";
import { useFinance } from "@/lib/finance-store";

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { transactions, categories, preferences, updateTransaction, deleteTransaction } = useFinance();
  const existing = transactions.find((transaction) => transaction.id === id);
  const [type, setType] = useState<TransactionType>(existing?.type ?? "expense");
  const [amount, setAmount] = useState(existing ? toAmountInput(existing.amountCents) : "");
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [date, setDate] = useState(existing?.date ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const visibleCategories = useMemo(() => categories.filter((category) => category.type === type), [categories, type]);
  const amountCents = parseAmountToCents(amount);

  useEffect(() => {
    if (!existing) router.back();
  }, [existing]);

  useEffect(() => {
    if (!visibleCategories.some((category) => category.id === categoryId)) setCategoryId(visibleCategories[0]?.id ?? "");
  }, [categoryId, visibleCategories]);

  if (!existing) return null;

  const save = async () => {
    if (isSaving) return;
    if (amountCents <= 0 || !categoryId || !isValidDate(date)) {
      Alert.alert("Check transaction details", "Add a valid amount, category, and date before saving your changes.");
      return;
    }
    setIsSaving(true);
    const didSave = await updateTransaction(existing.id, { type, amountCents, categoryId, note: note.trim(), date });
    setIsSaving(false);
    if (didSave) {
      router.back();
      return;
    }
    Alert.alert("Couldn’t save changes", "Your transaction was not changed. Please try again.");
  };

  const remove = () => {
    Alert.alert("Delete transaction?", "This permanently removes the entry from your on-device ledger.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { void deleteTransaction(existing.id).then((didDelete) => { if (didDelete) router.back(); else Alert.alert("Couldn’t delete transaction", "Your entry was not changed. Please try again."); }); } },
    ]);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <FlatList
          data={visibleCategories}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.content}
          columnWrapperStyle={styles.categoryColumns}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<View><View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Close edit transaction" onPress={() => router.back()} style={({ pressed }) => [styles.closeButton, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}><MaterialIcons name="close" size={22} color={colors.foreground} /></Pressable><Text style={[styles.headerTitle, { color: colors.foreground }]}>Edit transaction</Text><Pressable accessibilityRole="button" accessibilityLabel="Delete transaction" onPress={remove} style={({ pressed }) => [styles.closeButton, { backgroundColor: `${colors.error}12`, borderColor: `${colors.error}55` }, pressed && styles.pressed]}><MaterialIcons name="delete-outline" size={21} color={colors.error} /></Pressable></View><SegmentedControl value={type} onChange={setType} options={[{ label: "Expense", value: "expense" }, { label: "Income", value: "income" }]} /><View style={styles.amountBlock}><Text style={[styles.fieldLabel, { color: colors.muted }]}>AMOUNT</Text><View style={styles.amountInputRow}><Text style={[styles.currencySymbol, { color: colors.primary }]}>{getCurrencySymbol(preferences.currencyCode)}</Text><TextInput value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="decimal-pad" maxLength={12} accessibilityLabel={`Amount in ${preferences.currencyCode}`} style={[styles.amountInput, { color: colors.foreground }]} returnKeyType="done" onSubmitEditing={save} /></View></View><Text style={[styles.fieldLabel, { color: colors.muted, marginBottom: 9 }]}>CATEGORY</Text></View>}
          renderItem={({ item }) => { const selected = item.id === categoryId; return <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}${selected ? ", selected" : ""}`} accessibilityState={{ selected }} onPress={() => setCategoryId(item.id)} style={({ pressed }) => [styles.categoryChoice, { backgroundColor: selected ? `${colors.primary}10` : colors.surface, borderColor: selected ? colors.primary : colors.border }, pressed && styles.pressed]}><CategoryIcon category={item} size={36} /><Text style={[styles.categoryChoiceText, { color: selected ? colors.primary : colors.foreground }]} numberOfLines={1}>{item.name}</Text>{selected ? <MaterialIcons name="check-circle" size={19} color={colors.primary} /> : null}</Pressable>; }}
          ListFooterComponent={<View style={styles.footerFields}><Text style={[styles.fieldLabel, { color: colors.muted }]}>DETAILS</Text><View style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><MaterialIcons name="notes" size={20} color={colors.muted} /><TextInput value={note} onChangeText={setNote} placeholder="Add a note (optional)" placeholderTextColor={colors.muted} maxLength={MAX_TRANSACTION_NOTE_LENGTH} accessibilityLabel="Transaction note" style={[styles.detailInput, { color: colors.foreground }]} returnKeyType="done" /></View><View style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><MaterialIcons name="calendar-today" size={19} color={colors.muted} /><TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} autoCapitalize="none" maxLength={10} accessibilityLabel="Transaction date" style={[styles.detailInput, { color: colors.foreground }]} returnKeyType="done" onSubmitEditing={save} /></View><Pressable accessibilityRole="button" accessibilityLabel="Save transaction changes" accessibilityState={{ disabled: isSaving }} disabled={isSaving} onPress={save} style={({ pressed }) => [styles.saveButton, { backgroundColor: colors.primary }, isSaving && styles.disabled, pressed && styles.pressed]}><Text style={[styles.saveButtonText, { color: colors.background }]}>{isSaving ? "Saving…" : "Save changes"}</Text></Pressable></View>}
        />
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  amountBlock: { paddingTop: 30, paddingBottom: 28, alignItems: "center" },
  amountInput: { fontSize: 46, lineHeight: 58, fontWeight: "800", letterSpacing: -1.4, minWidth: 130, fontVariant: ["tabular-nums"], textAlign: "left", padding: 0 },
  amountInputRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "center", marginTop: 2 },
  categoryChoice: { width: "48.5%", minHeight: 62, borderRadius: financeUi.radius.button, borderWidth: financeUi.line.subtle, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 9 },
  categoryChoiceText: { flex: 1, fontSize: 13, lineHeight: 17, fontWeight: "700" },
  categoryColumns: { justifyContent: "space-between" },
  closeButton: { width: financeUi.size.tapTarget, height: financeUi.size.tapTarget, borderRadius: 22, borderWidth: financeUi.line.subtle, alignItems: "center", justifyContent: "center" },
  content: { padding: financeUi.spacing.page, paddingBottom: 25 },
  currencySymbol: { fontSize: 30, lineHeight: 38, fontWeight: "800", marginRight: 4 },
  detailInput: { flex: 1, fontSize: 15, height: "100%", paddingHorizontal: 10 },
  disabled: { opacity: 0.65 },
  fieldLabel: { fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: 1.05 },
  flex: { flex: 1 },
  footerFields: { paddingTop: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  headerTitle: { fontSize: 17, lineHeight: 23, fontWeight: "800" },
  inputCard: { height: 50, borderRadius: financeUi.radius.button, borderWidth: financeUi.line.subtle, flexDirection: "row", alignItems: "center", paddingLeft: 14, marginTop: 9 },
  pressed: { opacity: financeUi.opacity.pressed, transform: [{ scale: 0.98 }] },
  saveButton: { minHeight: 52, borderRadius: financeUi.radius.button, marginTop: 24, alignItems: "center", justifyContent: "center" },
  saveButtonText: { fontSize: 16, lineHeight: 22, fontWeight: "800" },
});
