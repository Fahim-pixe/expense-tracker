import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { CategoryIcon, SurfaceCard } from "@/components/finance-ui";
import { ScreenContainer } from "@/components/screen-container";
import { financeUi } from "@/constants/finance-ui";
import { useColors } from "@/hooks/use-colors";
import { MAX_TRANSACTION_NOTE_LENGTH, formatMoney, getCurrencySymbol, getLocalDateKey, isValidDate, parseAmountToCents, toAmountInput } from "@/lib/finance";
import { useFinance } from "@/lib/finance-store";

type DraftAllocation = { id: string; categoryId: string; amount: string };

export default function SplitTransactionScreen() {
  const colors = useColors();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const { categories, preferences, transactions, addSplitTransaction, updateSplitTransaction } = useFinance();
  const expenseCategories = useMemo(() => categories.filter((category) => category.type === "expense"), [categories]);
  const existingSplit = useMemo(() => groupId ? transactions.filter((transaction) => transaction.splitGroupId === groupId).sort((a, b) => (a.splitIndex ?? 0) - (b.splitIndex ?? 0)) : [], [groupId, transactions]);
  const isEditing = Boolean(groupId && existingSplit.length >= 2);
  const [total, setTotal] = useState("");
  const [allocations, setAllocations] = useState<DraftAllocation[]>(() => [
    { id: "allocation-a", categoryId: expenseCategories[0]?.id ?? "", amount: "" },
    { id: "allocation-b", categoryId: expenseCategories[1]?.id ?? expenseCategories[0]?.id ?? "", amount: "" },
  ]);
  const [activeAllocationId, setActiveAllocationId] = useState("allocation-a");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(getLocalDateKey());
  const [isSaving, setIsSaving] = useState(false);
  const totalCents = parseAmountToCents(total);
  const allocatedCents = allocations.reduce((sum, allocation) => sum + parseAmountToCents(allocation.amount), 0);
  const remainingCents = totalCents - allocatedCents;

  useEffect(() => {
    if (!isEditing) return;
    const totalCents = existingSplit[0].splitTotalCents ?? existingSplit.reduce((sum, transaction) => sum + transaction.amountCents, 0);
    setTotal(toAmountInput(totalCents));
    setAllocations(existingSplit.map((transaction, index) => ({ id: `allocation-${index}`, categoryId: transaction.categoryId, amount: toAmountInput(transaction.amountCents) })));
    setActiveAllocationId("allocation-0");
    setNote(existingSplit[0].note);
    setDate(existingSplit[0].date);
  }, [existingSplit, isEditing]);

  const updateAllocation = (id: string, patch: Partial<DraftAllocation>) => setAllocations((current) => current.map((allocation) => allocation.id === id ? { ...allocation, ...patch } : allocation));
  const addAllocation = () => {
    if (allocations.length >= 8) return;
    const unusedCategory = expenseCategories.find((category) => !allocations.some((allocation) => allocation.categoryId === category.id));
    if (!unusedCategory) { Alert.alert("All categories are in use", "Remove an allocation before adding another category."); return; }
    const id = `allocation-${Date.now()}`;
    setAllocations((current) => [...current, { id, categoryId: unusedCategory.id, amount: "" }]);
    setActiveAllocationId(id);
  };
  const removeAllocation = (id: string) => { if (allocations.length > 2) setAllocations((current) => current.filter((allocation) => allocation.id !== id)); };
  const save = async () => {
    if (isSaving) return;
    if (totalCents <= 0 || allocations.some((allocation) => !allocation.categoryId || parseAmountToCents(allocation.amount) <= 0) || remainingCents !== 0 || !isValidDate(date)) {
      Alert.alert("Check your split", "Enter a valid total and date, then allocate the full total across at least two categories.");
      return;
    }
    setIsSaving(true);
    const payload = { totalCents, allocations: allocations.map((allocation) => ({ categoryId: allocation.categoryId, amountCents: parseAmountToCents(allocation.amount) })), note: note.trim(), date };
    const didSave = isEditing && groupId ? await updateSplitTransaction(groupId, payload) : await addSplitTransaction(payload);
    setIsSaving(false);
    if (didSave) router.back(); else Alert.alert(`Couldn’t ${isEditing ? "update" : "save"} split`, "Use a different category for each allocation and make sure all amounts add up exactly.");
  };
  const activeAllocation = allocations.find((allocation) => allocation.id === activeAllocationId) ?? allocations[0];

  return <ScreenContainer edges={["top", "bottom"]}><KeyboardAvoidingView style={[styles.flex, styles.screenWidth]} behavior={Platform.OS === "ios" ? "padding" : undefined}><FlatList style={styles.list} data={allocations} keyExtractor={(item) => item.id} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" ListHeaderComponent={<View><View style={styles.header}><Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close split expense" style={({ pressed }) => [styles.closeButton, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}><MaterialIcons name="close" size={22} color={colors.foreground} /></Pressable><Text style={[styles.title, { color: colors.foreground }]}>{isEditing ? "Edit split expense" : "Split expense"}</Text><View style={styles.closeButton} /></View><Text style={[styles.subtitle, { color: colors.muted }]}>{isEditing ? "Adjust category allocations while keeping the total balanced." : "Allocate one purchase across categories. The amounts must equal the total."}</Text><SurfaceCard style={styles.totalCard}><Text style={[styles.label, { color: colors.muted }]}>TOTAL PURCHASE</Text><View style={styles.totalRow}><Text style={[styles.currency, { color: colors.primary }]}>{getCurrencySymbol(preferences.currencyCode)}</Text><TextInput autoFocus={Platform.OS !== "web"} value={total} onChangeText={setTotal} placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="decimal-pad" maxLength={12} accessibilityLabel="Total split expense" style={[styles.totalInput, { color: colors.foreground }]} /></View><View style={[styles.remaining, { backgroundColor: remainingCents === 0 && totalCents > 0 ? `${colors.success}14` : `${colors.warning}14` }]}><Text style={[styles.remainingText, { color: remainingCents === 0 && totalCents > 0 ? colors.success : colors.foreground }]}>{totalCents <= 0 ? "Enter a total to start" : remainingCents === 0 ? "All funds allocated" : `${formatMoney(Math.abs(remainingCents), preferences.currencyCode)} ${remainingCents > 0 ? "left to allocate" : "over-allocated"}`}</Text></View></SurfaceCard><Text style={[styles.label, { color: colors.muted, marginTop: 22 }]}>ALLOCATIONS</Text></View>} renderItem={({ item, index }) => { const category = expenseCategories.find((entry) => entry.id === item.categoryId); const isActive = item.id === activeAllocation?.id; return <SurfaceCard style={[styles.allocationCard, isActive && { borderColor: colors.primary }]}><View style={styles.allocationTop}><Pressable accessibilityRole="button" accessibilityLabel={`Choose category for allocation ${index + 1}`} onPress={() => setActiveAllocationId(item.id)} style={({ pressed }) => [styles.categoryPicker, { backgroundColor: colors.surface, borderColor: isActive ? colors.primary : colors.border }, pressed && styles.pressed]}>{category ? <CategoryIcon category={category} size={27} /> : <MaterialIcons name="category" size={22} color={colors.muted} />}<Text style={[styles.categoryName, { color: colors.foreground }]}>{category?.name ?? "Choose category"}</Text><MaterialIcons name="expand-more" size={20} color={colors.muted} /></Pressable>{allocations.length > 2 ? <Pressable accessibilityRole="button" accessibilityLabel={`Remove allocation ${index + 1}`} onPress={() => removeAllocation(item.id)} style={styles.iconButton}><MaterialIcons name="remove-circle-outline" size={22} color={colors.error} /></Pressable> : null}</View><View style={[styles.amountCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.amountPrefix, { color: colors.muted }]}>{getCurrencySymbol(preferences.currencyCode)}</Text><TextInput value={item.amount} onFocus={() => setActiveAllocationId(item.id)} onChangeText={(amount) => updateAllocation(item.id, { amount })} placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="decimal-pad" maxLength={12} accessibilityLabel={`Amount for allocation ${index + 1}`} style={[styles.amountInput, { color: colors.foreground }]} /></View></SurfaceCard>; }} ListFooterComponent={<View>{activeAllocation ? <View style={styles.categoryGrid}>{expenseCategories.map((category) => { const selected = activeAllocation.categoryId === category.id; return <Pressable key={category.id} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`Set ${category.name} for selected allocation`} onPress={() => updateAllocation(activeAllocation.id, { categoryId: category.id })} style={({ pressed }) => [styles.categoryOption, { backgroundColor: selected ? `${colors.primary}10` : colors.surface, borderColor: selected ? colors.primary : colors.border }, pressed && styles.pressed]}><CategoryIcon category={category} size={25} /><Text style={[styles.optionText, { color: selected ? colors.primary : colors.foreground }]} numberOfLines={1}>{category.name}</Text></Pressable>; })}</View> : null}<Pressable accessibilityRole="button" accessibilityLabel="Add split allocation" onPress={addAllocation} style={({ pressed }) => [styles.addButton, { borderColor: colors.border }, pressed && styles.pressed]}><MaterialIcons name="add" size={20} color={colors.primary} /><Text style={[styles.addText, { color: colors.primary }]}>Add category allocation</Text></Pressable><View style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><MaterialIcons name="notes" size={19} color={colors.muted} /><TextInput value={note} onChangeText={setNote} placeholder="Note (optional)" placeholderTextColor={colors.muted} maxLength={MAX_TRANSACTION_NOTE_LENGTH} accessibilityLabel="Split expense note" style={[styles.detailInput, { color: colors.foreground }]} /></View><View style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><MaterialIcons name="calendar-today" size={18} color={colors.muted} /><TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} autoCapitalize="none" maxLength={10} accessibilityLabel="Split expense date" style={[styles.detailInput, { color: colors.foreground }]} /></View><Pressable accessibilityRole="button" accessibilityLabel={isEditing ? "Update split expense" : "Save split expense"} accessibilityState={{ disabled: isSaving }} disabled={isSaving} onPress={save} style={({ pressed }) => [styles.saveButton, { backgroundColor: colors.primary }, isSaving && styles.disabled, pressed && styles.pressed]}><Text style={[styles.saveText, { color: colors.background }]}>{isSaving ? "Saving…" : isEditing ? "Update split expense" : "Save split expense"}</Text></Pressable></View>} /></KeyboardAvoidingView></ScreenContainer>;
}

const styles = StyleSheet.create({
  addButton: { borderWidth: financeUi.line.subtle, borderRadius: financeUi.radius.button, minHeight: 48, marginTop: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  addText: { fontSize: 14, fontWeight: "800" },
  allocationCard: { marginBottom: 10, borderWidth: financeUi.line.subtle },
  allocationTop: { flexDirection: "row", gap: 8, alignItems: "center" },
  amountCard: { height: 46, marginTop: 10, borderWidth: financeUi.line.subtle, borderRadius: 12, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 },
  amountInput: { flex: 1, fontSize: 16, fontWeight: "800", padding: 0 },
  amountPrefix: { fontSize: 16, fontWeight: "800", marginRight: 4 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  categoryName: { flex: 1, fontSize: 14, fontWeight: "800" },
  categoryOption: { width: "48.5%", minHeight: 44, borderRadius: 12, borderWidth: financeUi.line.subtle, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 9 },
  categoryPicker: { flex: 1, minHeight: 48, borderRadius: 12, borderWidth: financeUi.line.subtle, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10 },
  closeButton: { width: financeUi.size.tapTarget, height: financeUi.size.tapTarget, borderRadius: financeUi.size.tapTarget / 2, borderWidth: financeUi.line.subtle, alignItems: "center", justifyContent: "center" },
  content: { alignSelf: "stretch", padding: financeUi.spacing.page, paddingBottom: 30 },
  currency: { fontSize: 29, fontWeight: "800", marginRight: 5 },
  detailInput: { flex: 1, height: "100%", marginLeft: 10, fontSize: 15 },
  disabled: { opacity: 0.65 }, flex: { flex: 1 }, list: { alignSelf: "stretch" }, screenWidth: { alignSelf: "stretch" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  inputCard: { height: 50, borderRadius: financeUi.radius.button, borderWidth: financeUi.line.subtle, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, marginTop: 10 },
  label: { fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: 1 },
  optionText: { flex: 1, fontSize: 12, fontWeight: "700" },
  pressed: { opacity: financeUi.opacity.pressed, transform: [{ scale: 0.98 }] },
  remaining: { borderRadius: 10, padding: 10, marginTop: 10 }, remainingText: { textAlign: "center", fontSize: 13, fontWeight: "800" },
  saveButton: { minHeight: 52, borderRadius: financeUi.radius.button, marginTop: 22, alignItems: "center", justifyContent: "center" }, saveText: { fontSize: 16, fontWeight: "800" },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 22 },
  title: { fontSize: 17, lineHeight: 23, fontWeight: "800" },
  totalCard: { marginBottom: 4 }, totalInput: { flex: 1, fontSize: 38, lineHeight: 48, fontWeight: "800", padding: 0 }, totalRow: { flexDirection: "row", alignItems: "baseline", marginTop: 5 },
});
