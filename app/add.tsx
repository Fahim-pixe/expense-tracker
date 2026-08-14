import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { financeUi } from "@/constants/finance-ui";
import { CategoryIcon, SegmentedControl } from "@/components/finance-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MAX_TRANSACTION_NOTE_LENGTH, getCurrencySymbol, getLocalDateKey, isValidDate, parseAmountToCents, type TransactionType } from "@/lib/finance";
import { useFinance } from "@/lib/finance-store";

export default function AddTransactionScreen() {
  const colors = useColors();
  const { categories, preferences, addTransaction } = useFinance();
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(getLocalDateKey());
  const [isSaving, setIsSaving] = useState(false);
  const visibleCategories = useMemo(() => categories.filter((category) => category.type === type), [categories, type]);
  const amountCents = parseAmountToCents(amount);

  useEffect(() => {
    if (!visibleCategories.some((category) => category.id === categoryId)) setCategoryId(visibleCategories[0]?.id ?? "");
  }, [categoryId, visibleCategories]);

  const save = async () => {
    if (isSaving) return;
    if (amountCents <= 0) {
      Alert.alert("Add a valid amount", "Enter an amount greater than zero and within the supported range before saving.");
      return;
    }
    if (!categoryId) {
      Alert.alert("Choose a category", "Select the category that best describes this transaction.");
      return;
    }
    if (!isValidDate(date)) {
      Alert.alert("Use a valid date", "Enter the date in YYYY-MM-DD format.");
      return;
    }
    setIsSaving(true);
    const didSave = await addTransaction({ type, amountCents, categoryId, note: note.trim(), date });
    setIsSaving(false);
    if (didSave) {
      router.back();
      return;
    }
    Alert.alert("Couldn’t save transaction", "Your entry was not saved. Please try again.");
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
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              <View style={styles.header}>
                <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close new transaction" style={({ pressed }) => [styles.closeButton, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: financeUi.opacity.pressed }]}>
                  <MaterialIcons name="close" size={22} color={colors.foreground} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: colors.foreground }]}>New transaction</Text>
                <View style={styles.closeButton} />
              </View>
              <SegmentedControl value={type} onChange={setType} options={[{ label: "Expense", value: "expense" }, { label: "Income", value: "income" }]} />

              <View style={styles.amountBlock}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>AMOUNT</Text>
                <View style={styles.amountInputRow}>
                  <Text style={[styles.currencySymbol, { color: colors.primary }]}>{getCurrencySymbol(preferences.currencyCode)}</Text>
                  <TextInput autoFocus value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="decimal-pad" maxLength={12} accessibilityLabel={`Amount in ${preferences.currencyCode}`} accessibilityHint="Enter a positive amount with up to two decimal places" style={[styles.amountInput, { color: colors.foreground }]} returnKeyType="done" onSubmitEditing={save} />
                </View>
              </View>
              <Text style={[styles.fieldLabel, { color: colors.muted, marginBottom: 9 }]}>CATEGORY</Text>
            </View>
          }
          renderItem={({ item }) => {
            const selected = item.id === categoryId;
            return (
                <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}${selected ? ", selected" : ""}`} accessibilityState={{ selected }} onPress={() => setCategoryId(item.id)} style={({ pressed }) => [styles.categoryChoice, { backgroundColor: selected ? `${colors.primary}10` : colors.surface, borderColor: selected ? colors.primary : colors.border }, pressed && { opacity: financeUi.opacity.pressed }]}>
                <CategoryIcon category={item} size={36} />
                <Text style={[styles.categoryChoiceText, { color: selected ? colors.primary : colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                {selected ? <MaterialIcons name="check-circle" size={19} color={colors.primary} /> : null}
              </Pressable>
            );
          }}
          ListFooterComponent={
            <View style={styles.footerFields}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>DETAILS</Text>
              <View style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <MaterialIcons name="notes" size={20} color={colors.muted} />
                <TextInput value={note} onChangeText={setNote} placeholder="Add a note (optional)" placeholderTextColor={colors.muted} maxLength={MAX_TRANSACTION_NOTE_LENGTH} accessibilityLabel="Transaction note" style={[styles.detailInput, { color: colors.foreground }]} returnKeyType="done" />
              </View>
              <View style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <MaterialIcons name="calendar-today" size={19} color={colors.muted} />
                <TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} autoCapitalize="none" maxLength={10} accessibilityLabel="Transaction date" accessibilityHint="Use year, month, and day in YYYY-MM-DD format" style={[styles.detailInput, { color: colors.foreground }]} returnKeyType="done" onSubmitEditing={save} />
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Save ${type}`} accessibilityState={{ disabled: isSaving }} disabled={isSaving} onPress={save} style={({ pressed }) => [styles.saveButton, { backgroundColor: colors.primary }, isSaving && styles.saveDisabled, pressed && styles.savePressed]}>
                <Text style={[styles.saveButtonText, { color: colors.background }]}>{isSaving ? "Saving…" : `Save ${type === "income" ? "income" : "expense"}`}</Text>
              </Pressable>
            </View>
          }
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
  fieldLabel: { fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: 1.05 },
  flex: { flex: 1 },
  footerFields: { paddingTop: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  headerTitle: { fontSize: 17, lineHeight: 23, fontWeight: "800" },
  inputCard: { height: 50, borderRadius: financeUi.radius.button, borderWidth: financeUi.line.subtle, flexDirection: "row", alignItems: "center", paddingLeft: 14, marginTop: 9 },
  saveButton: { minHeight: 52, borderRadius: financeUi.radius.button, marginTop: 24, alignItems: "center", justifyContent: "center" },
  saveDisabled: { opacity: 0.72 },
  saveButtonText: { fontSize: 16, lineHeight: 22, fontWeight: "800" },
  savePressed: { opacity: financeUi.opacity.pressed, transform: [{ scale: 0.98 }] },
});
