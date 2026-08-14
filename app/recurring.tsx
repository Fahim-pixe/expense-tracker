import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { CategoryIcon, EmptyState, SegmentedControl, SurfaceCard } from "@/components/finance-ui";
import { ScreenContainer } from "@/components/screen-container";
import { financeUi } from "@/constants/finance-ui";
import { useColors } from "@/hooks/use-colors";
import { MAX_TRANSACTION_NOTE_LENGTH, formatMoney, getCurrencySymbol, getLocalDateKey, isValidDate, parseAmountToCents, type RecurrenceFrequency, type RecurringTransaction, type TransactionType } from "@/lib/finance";
import { useFinance } from "@/lib/finance-store";

const cadenceLabel = (schedule: Pick<RecurringTransaction, "frequency" | "interval" | "dayOfMonth">) => {
  const frequency = schedule.frequency ?? "monthly";
  const interval = schedule.interval ?? 1;
  if (frequency === "weekly") return interval === 1 ? "Every week" : `Every ${interval} weeks`;
  if (frequency === "custom") return `Every ${interval} days`;
  return interval === 1 ? `Monthly on day ${schedule.dayOfMonth}` : `Every ${interval} months on day ${schedule.dayOfMonth}`;
};

export default function RecurringTransactionsScreen() {
  const colors = useColors();
  const { categories, preferences, recurringTransactions, addRecurringTransaction, toggleRecurringTransaction, deleteRecurringTransaction } = useFinance();
  const [type, setType] = useState<TransactionType>("expense");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("monthly");
  const [interval, setInterval] = useState("1");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [startDate, setStartDate] = useState(getLocalDateKey());
  const [isSaving, setIsSaving] = useState(false);
  const visibleCategories = useMemo(() => categories.filter((category) => category.type === type), [categories, type]);
  const amountCents = parseAmountToCents(amount);
  const selectedCategory = visibleCategories.find((category) => category.id === categoryId) ?? visibleCategories[0];

  const saveSchedule = async () => {
    const cadenceInterval = Number(interval);
    if (!selectedCategory || amountCents <= 0 || !isValidDate(startDate) || !Number.isInteger(cadenceInterval) || cadenceInterval < 1 || cadenceInterval > 365) {
      Alert.alert("Check schedule details", "Choose an amount, category, valid start date, and an interval from 1 to 365.");
      return;
    }
    setIsSaving(true);
    const didSave = await addRecurringTransaction({ type, amountCents, categoryId: selectedCategory.id, note: note.trim(), nextRunDate: startDate, dayOfMonth: Number(startDate.slice(-2)), frequency, interval: cadenceInterval, isActive: true });
    setIsSaving(false);
    if (didSave) {
      setAmount("");
      setNote("");
      setInterval("1");
      setCategoryId("");
      setStartDate(getLocalDateKey());
    } else Alert.alert("Couldn’t save schedule", "Your recurring transaction was not created. Please try again.");
  };

  const removeSchedule = (id: string) => Alert.alert("Remove recurring transaction?", "Future automatic entries from this schedule will stop. Existing entries stay in your ledger.", [
    { text: "Cancel", style: "cancel" },
    { text: "Remove", style: "destructive", onPress: () => { void deleteRecurringTransaction(id).then((didDelete) => { if (!didDelete) Alert.alert("Couldn’t remove schedule", "Please try again."); }); } },
  ]);

  const intervalCopy = frequency === "weekly" ? "week(s)" : frequency === "custom" ? "day(s)" : "month(s)";

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <FlatList
        data={recurringTransactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<View>
          <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Close recurring transactions" onPress={() => router.back()} style={({ pressed }) => [styles.closeButton, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}><MaterialIcons name="close" size={22} color={colors.foreground} /></Pressable><Text style={[styles.title, { color: colors.foreground }]}>Recurring</Text><View style={styles.closeButton} /></View>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Schedules catch up safely whenever you open the app.</Text>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>NEW SCHEDULE</Text>
          <SurfaceCard>
            <SegmentedControl value={type} onChange={setType} options={[{ label: "Expense", value: "expense" }, { label: "Income", value: "income" }]} />
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>CADENCE</Text>
            <SegmentedControl value={frequency} onChange={(value) => setFrequency(value as RecurrenceFrequency)} options={[{ label: "Weekly", value: "weekly" }, { label: "Monthly", value: "monthly" }, { label: "Custom", value: "custom" }]} />
            <View style={[styles.amountRow, { backgroundColor: colors.background, borderColor: colors.border }]}><Text style={[styles.currencySymbol, { color: colors.primary }]}>{getCurrencySymbol(preferences.currencyCode)}</Text><TextInput value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="decimal-pad" maxLength={12} accessibilityLabel={`Recurring amount in ${preferences.currencyCode}`} style={[styles.amountInput, { color: colors.foreground }]} /></View>
            <View style={styles.categoryGrid}>{visibleCategories.slice(0, 6).map((category) => { const selected = (categoryId || selectedCategory?.id) === category.id; return <Pressable key={category.id} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${category.name}${selected ? ", selected" : ""}`} onPress={() => setCategoryId(category.id)} style={({ pressed }) => [styles.categoryButton, { backgroundColor: selected ? `${colors.primary}10` : colors.background, borderColor: selected ? colors.primary : colors.border }, pressed && styles.pressed]}><CategoryIcon category={category} size={28} /><Text style={[styles.categoryButtonText, { color: selected ? colors.primary : colors.foreground }]} numberOfLines={1}>{category.name}</Text></Pressable>; })}</View>
            <View style={[styles.inputCard, { backgroundColor: colors.background, borderColor: colors.border }]}><MaterialIcons name="event-repeat" size={19} color={colors.muted} /><Text style={[styles.inputPrefix, { color: colors.muted }]}>Every</Text><TextInput value={interval} onChangeText={setInterval} keyboardType="number-pad" maxLength={3} accessibilityLabel="Recurrence interval" style={[styles.intervalInput, { color: colors.foreground }]} /><Text style={[styles.inputSuffix, { color: colors.muted }]}>{intervalCopy}</Text></View>
            <View style={[styles.inputCard, { backgroundColor: colors.background, borderColor: colors.border }]}><MaterialIcons name="calendar-today" size={18} color={colors.muted} /><TextInput value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} autoCapitalize="none" maxLength={10} accessibilityLabel="First schedule date" style={[styles.noteInput, { color: colors.foreground }]} /></View>
            <View style={[styles.inputCard, { backgroundColor: colors.background, borderColor: colors.border }]}><MaterialIcons name="notes" size={19} color={colors.muted} /><TextInput value={note} onChangeText={setNote} placeholder="Note (optional)" placeholderTextColor={colors.muted} maxLength={MAX_TRANSACTION_NOTE_LENGTH} accessibilityLabel="Recurring transaction note" style={[styles.noteInput, { color: colors.foreground }]} /></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Save recurring schedule" disabled={isSaving} onPress={saveSchedule} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary }, isSaving && styles.disabled, pressed && styles.pressed]}><Text style={[styles.primaryButtonText, { color: colors.background }]}>{isSaving ? "Saving…" : "Save schedule"}</Text></Pressable>
          </SurfaceCard>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>YOUR SCHEDULES</Text>
        </View>}
        renderItem={({ item }) => { const category = categories.find((entry) => entry.id === item.categoryId); if (!category) return null; return <SurfaceCard style={[styles.scheduleCard, !item.isActive && styles.inactiveCard]}><View style={styles.scheduleTop}><CategoryIcon category={category} /><View style={styles.scheduleCopy}><Text style={[styles.scheduleTitle, { color: colors.foreground }]} numberOfLines={1}>{item.note || category.name}</Text><Text style={[styles.scheduleDetail, { color: colors.muted }]}>{cadenceLabel(item)} · Next {item.nextRunDate}</Text></View><Switch value={item.isActive} onValueChange={() => { void toggleRecurringTransaction(item.id); }} accessibilityLabel={`${item.isActive ? "Pause" : "Resume"} ${item.note || category.name}`} trackColor={{ false: colors.border, true: `${colors.primary}80` }} thumbColor={item.isActive ? colors.primary : colors.surface} /></View><View style={styles.scheduleFooter}><Text style={[styles.scheduleAmount, { color: item.type === "income" ? colors.success : colors.error }]}>{formatMoney(item.amountCents, preferences.currencyCode, { signed: true })}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.note || category.name} schedule`} onPress={() => removeSchedule(item.id)} style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}><Text style={[styles.removeButtonText, { color: colors.error }]}>Remove</Text></Pressable></View></SurfaceCard>; }}
        ListEmptyComponent={<EmptyState icon="event-repeat" title="No recurring schedules" description="Create weekly, monthly, or custom schedules for entries you do not want to enter manually." />}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  amountInput: { flex: 1, height: "100%", padding: 0, fontSize: 28, lineHeight: 36, fontWeight: "800", fontVariant: ["tabular-nums"] },
  amountRow: { height: 58, borderRadius: financeUi.radius.button, borderWidth: financeUi.line.subtle, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", marginTop: 14 },
  categoryButton: { width: "48.5%", minHeight: 46, borderRadius: 12, borderWidth: financeUi.line.subtle, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", gap: 7 },
  categoryButtonText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "700" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8, marginTop: 12 },
  closeButton: { width: financeUi.size.tapTarget, height: financeUi.size.tapTarget, borderRadius: financeUi.size.tapTarget / 2, borderWidth: financeUi.line.subtle, alignItems: "center", justifyContent: "center" },
  content: { padding: financeUi.spacing.page, paddingBottom: 32 },
  currencySymbol: { fontSize: 24, fontWeight: "800", marginRight: 5 },
  disabled: { opacity: 0.65 },
  fieldLabel: { fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: 1, marginTop: 18, marginBottom: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  inactiveCard: { opacity: 0.7 },
  inputCard: { minHeight: 50, borderRadius: financeUi.radius.button, borderWidth: financeUi.line.subtle, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, marginTop: 10 },
  inputPrefix: { fontSize: 14, marginLeft: 10, marginRight: 5 },
  inputSuffix: { fontSize: 14, marginLeft: 5 },
  intervalInput: { width: 42, fontSize: 15, fontWeight: "800", textAlign: "center", padding: 0 },
  noteInput: { flex: 1, height: "100%", marginLeft: 10, fontSize: 15 },
  pressed: { opacity: financeUi.opacity.pressed, transform: [{ scale: 0.98 }] },
  primaryButton: { minHeight: 50, borderRadius: financeUi.radius.button, marginTop: 14, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { fontSize: 15, lineHeight: 21, fontWeight: "800" },
  removeButton: { minHeight: financeUi.size.tapTarget, justifyContent: "center", paddingHorizontal: 8 },
  removeButtonText: { fontSize: 13, fontWeight: "800" },
  scheduleAmount: { fontSize: 15, lineHeight: 21, fontWeight: "800", fontVariant: ["tabular-nums"] },
  scheduleCard: { marginBottom: 9 },
  scheduleCopy: { flex: 1 },
  scheduleDetail: { fontSize: 12, lineHeight: 17, marginTop: 1 },
  scheduleFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTopWidth: financeUi.line.subtle, borderTopColor: "rgba(100,116,139,0.22)" },
  scheduleTitle: { fontSize: 15, lineHeight: 21, fontWeight: "800" },
  scheduleTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionLabel: { fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: 1, marginTop: 24, marginBottom: 9 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  title: { fontSize: 17, lineHeight: 23, fontWeight: "800" },
});
