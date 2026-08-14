import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { CategoryIcon, SegmentedControl, SurfaceCard } from "@/components/finance-ui";
import { ScreenContainer } from "@/components/screen-container";
import { financeUi } from "@/constants/finance-ui";
import { useColors } from "@/hooks/use-colors";
import { chooseCsvFile, shareCsvFile } from "@/lib/csv-files";
import { CSV_COLUMNS, CSV_MAPPING_FIELDS, exportTransactionsCsv, inferCsvColumnMapping, inspectCsv, parseMappedTransactionsCsv, parseTransactionsCsv, type CsvColumnMapping, type CsvImportResult, type CsvMappingField, type CsvTable } from "@/lib/finance-csv";
import { type TransactionType } from "@/lib/finance";
import { useFinance } from "@/lib/finance-store";

const mappingLabels: Record<CsvMappingField, string> = { date: "Transaction date", amount: "Amount", category: "Category", note: "Note / merchant", type: "Income or expense" };

export default function CsvPortabilityScreen() {
  const colors = useColors();
  const { transactions, categories, preferences, budgets, categoryBudgets, recurringTransactions, replaceFinanceState } = useFinance();
  const [preview, setPreview] = useState<CsvImportResult | null>(null);
  const [table, setTable] = useState<CsvTable | null>(null);
  const [mapping, setMapping] = useState<CsvColumnMapping>({});
  const [fallbackType, setFallbackType] = useState<TransactionType>("expense");
  const [fallbackCategoryId, setFallbackCategoryId] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const visibleCategories = useMemo(() => categories.filter((category) => category.type === fallbackType), [categories, fallbackType]);
  const nativeSchema = Boolean(table && CSV_COLUMNS.slice(0, 6).every((column) => table.headers.some((header) => header.trim().toLowerCase() === column)));
  const fallbackCategory = visibleCategories.find((category) => category.id === fallbackCategoryId) ?? visibleCategories[0];

  const exportCsv = async () => {
    if (isWorking) return;
    setIsWorking(true);
    try { await shareCsvFile(exportTransactionsCsv(transactions)); Alert.alert("CSV exported", "Your ledger was prepared as a standard CSV file. Category budgets and schedules remain in encrypted backups."); } catch (error) { Alert.alert("Couldn’t export CSV", error instanceof Error ? error.message : "Please try again."); } finally { setIsWorking(false); }
  };
  const selectCsv = async () => {
    if (isWorking) return;
    setIsWorking(true);
    try {
      const contents = await chooseCsvFile();
      if (!contents) return;
      const inspected = inspectCsv(contents);
      if (!inspected) { Alert.alert("Couldn’t read CSV", "Choose a non-empty CSV file with a header row."); return; }
      setPreview(null);
      setTable(inspected);
      setMapping(inferCsvColumnMapping(inspected.headers));
      const isNative = CSV_COLUMNS.slice(0, 6).every((column) => inspected.headers.some((header) => header.trim().toLowerCase() === column));
      if (isNative) setPreview(parseTransactionsCsv(contents, categories, transactions));
    } catch (error) { Alert.alert("Couldn’t open CSV", error instanceof Error ? error.message : "Choose a valid CSV file."); } finally { setIsWorking(false); }
  };
  const cycleMapping = (field: CsvMappingField) => {
    if (!table) return;
    const options = ["", ...table.headers];
    const current = mapping[field] ?? "";
    const next = options[(options.indexOf(current) + 1) % options.length];
    setMapping((currentMapping) => ({ ...currentMapping, [field]: next || undefined }));
    setPreview(null);
  };
  const reviewMappedImport = () => {
    if (!table || !fallbackCategory || !mapping.date || !mapping.amount) {
      Alert.alert("Map required fields", "Map a date and amount column, then choose a fallback category for unmatched rows.");
      return;
    }
    setPreview(parseMappedTransactionsCsv(table, mapping, categories, transactions, fallbackCategory.id, fallbackType));
  };
  const importPreview = () => {
    if (!preview?.imported || isWorking) return;
    Alert.alert("Add CSV transactions?", `${preview.imported} new transaction${preview.imported === 1 ? "" : "s"} will be added. ${preview.duplicates} duplicate${preview.duplicates === 1 ? "" : "s"} and ${preview.invalid} invalid row${preview.invalid === 1 ? "" : "s"} will be skipped.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Add transactions", onPress: () => { void (async () => { setIsWorking(true); const didImport = await replaceFinanceState({ transactions: [...preview.transactions, ...transactions], categories, preferences, budgets, categoryBudgets, recurringTransactions }); setIsWorking(false); if (didImport) { setPreview(null); setTable(null); Alert.alert("CSV imported", "Your valid new transactions were added to this device’s local ledger."); } else Alert.alert("Couldn’t import CSV", "Your current data was not changed. Please try again."); })(); } },
    ]);
  };

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"><View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Close CSV portability" onPress={() => router.back()} style={({ pressed }) => [styles.closeButton, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}><MaterialIcons name="close" size={22} color={colors.foreground} /></Pressable><Text style={[styles.title, { color: colors.foreground }]}>CSV portability</Text><View style={styles.closeButton} /></View><SurfaceCard style={styles.intro}><View style={[styles.introIcon, { backgroundColor: `${colors.primary}14` }]}><MaterialIcons name="table-view" size={23} color={colors.primary} /></View><View style={styles.introCopy}><Text style={[styles.cardTitle, { color: colors.foreground }]}>Portable transaction data</Text><Text style={[styles.cardDescription, { color: colors.muted }]}>Import Expense Tracker files directly or map third-party spreadsheet columns before review. Encrypted backups remain the full-fidelity recovery option.</Text></View></SurfaceCard><Text style={[styles.sectionLabel, { color: colors.muted }]}>EXPORT</Text><SurfaceCard><Text style={[styles.cardTitle, { color: colors.foreground }]}>Export your transaction ledger</Text><Text style={[styles.cardDescription, { color: colors.muted }]}>{transactions.length} transaction{transactions.length === 1 ? "" : "s"} will be included with dates, categories, amounts, notes, and split-allocation metadata.</Text><Pressable accessibilityRole="button" accessibilityLabel="Export CSV ledger" disabled={isWorking} onPress={exportCsv} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary }, isWorking && styles.disabled, pressed && styles.pressed]}><MaterialIcons name="ios-share" size={19} color={colors.background} /><Text style={[styles.primaryText, { color: colors.background }]}>{isWorking ? "Working…" : "Export CSV ledger"}</Text></Pressable></SurfaceCard><Text style={[styles.sectionLabel, { color: colors.muted }]}>IMPORT</Text><SurfaceCard><Text style={[styles.cardTitle, { color: colors.foreground }]}>Import a spreadsheet</Text><Text style={[styles.cardDescription, { color: colors.muted }]}>Choose a CSV to inspect its headers. You can map exports from other finance tools without modifying the source file.</Text><Pressable accessibilityRole="button" accessibilityLabel="Choose CSV file" disabled={isWorking} onPress={selectCsv} style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.background }, isWorking && styles.disabled, pressed && styles.pressed]}><MaterialIcons name="file-open" size={19} color={colors.primary} /><Text style={[styles.secondaryText, { color: colors.primary }]}>{table ? "Choose another CSV" : "Choose CSV file"}</Text></Pressable>{table && !nativeSchema ? <View style={[styles.mappingCard, { borderColor: colors.border, backgroundColor: colors.background }]}><Text style={[styles.previewTitle, { color: colors.foreground }]}>Map spreadsheet columns</Text><Text style={[styles.previewCopy, { color: colors.muted }]}>{table.rows.length} row{table.rows.length === 1 ? "" : "s"} found. Tap each value to cycle through detected headers.</Text>{CSV_MAPPING_FIELDS.map((field) => <Pressable key={field} accessibilityRole="button" accessibilityLabel={`Map ${mappingLabels[field]}`} onPress={() => cycleMapping(field)} style={({ pressed }) => [styles.mappingRow, { borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.mappingLabel, { color: colors.muted }]}>{mappingLabels[field]}</Text><Text style={[styles.mappingValue, { color: mapping[field] ? colors.foreground : colors.primary }]} numberOfLines={1}>{mapping[field] || "Not mapped"}</Text><MaterialIcons name="sync" size={18} color={colors.primary} /></Pressable>)}<Text style={[styles.mappingHint, { color: colors.muted }]}>When category or type is unavailable, new rows use the defaults below.</Text><SegmentedControl value={fallbackType} onChange={(value) => { setFallbackType(value as TransactionType); setFallbackCategoryId(""); setPreview(null); }} options={[{ label: "Expense", value: "expense" }, { label: "Income", value: "income" }]} /><View style={styles.categoryGrid}>{visibleCategories.slice(0, 6).map((category) => { const selected = (fallbackCategoryId || fallbackCategory?.id) === category.id; return <Pressable key={category.id} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`Use ${category.name} as fallback category`} onPress={() => { setFallbackCategoryId(category.id); setPreview(null); }} style={({ pressed }) => [styles.categoryOption, { backgroundColor: selected ? `${colors.primary}10` : colors.surface, borderColor: selected ? colors.primary : colors.border }, pressed && styles.pressed]}><CategoryIcon category={category} size={23} /><Text style={[styles.categoryText, { color: selected ? colors.primary : colors.foreground }]} numberOfLines={1}>{category.name}</Text></Pressable>; })}</View><Pressable accessibilityRole="button" accessibilityLabel="Review mapped CSV import" disabled={!mapping.date || !mapping.amount} onPress={reviewMappedImport} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary }, (!mapping.date || !mapping.amount) && styles.disabled, pressed && styles.pressed]}><MaterialIcons name="fact-check" size={19} color={colors.background} /><Text style={[styles.primaryText, { color: colors.background }]}>Review mapped rows</Text></Pressable></View> : null}{table && nativeSchema ? <View style={[styles.nativeNotice, { borderColor: colors.border, backgroundColor: `${colors.success}0E` }]}><MaterialIcons name="verified" size={18} color={colors.success} /><Text style={[styles.nativeNoticeText, { color: colors.success }]}>Expense Tracker CSV detected. Your file is ready for review.</Text></View> : null}{preview ? <View style={[styles.preview, { borderColor: colors.border, backgroundColor: colors.background }]}><Text style={[styles.previewTitle, { color: colors.foreground }]}>Import review</Text><Text style={[styles.previewCopy, { color: colors.muted }]}>{preview.imported} new · {preview.duplicates} duplicate · {preview.invalid} invalid</Text><Pressable accessibilityRole="button" accessibilityLabel="Import valid CSV transactions" disabled={!preview.imported || isWorking} onPress={importPreview} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary }, (!preview.imported || isWorking) && styles.disabled, pressed && styles.pressed]}><MaterialIcons name="playlist-add" size={19} color={colors.background} /><Text style={[styles.primaryText, { color: colors.background }]}>{isWorking ? "Importing…" : `Import ${preview.imported} valid row${preview.imported === 1 ? "" : "s"}`}</Text></Pressable></View> : null}</SurfaceCard></ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({
  cardDescription: { fontSize: 14, lineHeight: 20, marginTop: 3 }, cardTitle: { fontSize: 16, lineHeight: 22, fontWeight: "800" }, categoryGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8, marginTop: 12 }, categoryOption: { width: "48.5%", minHeight: 42, borderRadius: 11, borderWidth: financeUi.line.subtle, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", gap: 6 }, categoryText: { flex: 1, fontSize: 12, fontWeight: "700" }, closeButton: { width: financeUi.size.tapTarget, height: financeUi.size.tapTarget, borderRadius: financeUi.size.tapTarget / 2, borderWidth: financeUi.line.subtle, alignItems: "center", justifyContent: "center" }, content: { padding: financeUi.spacing.page, paddingBottom: 32 }, disabled: { opacity: 0.62 }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }, intro: { flexDirection: "row", gap: 12 }, introCopy: { flex: 1 }, introIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, mappingCard: { marginTop: 14, borderRadius: financeUi.radius.button, borderWidth: financeUi.line.subtle, padding: 13 }, mappingHint: { fontSize: 12, lineHeight: 17, marginTop: 14, marginBottom: 8 }, mappingLabel: { width: 104, fontSize: 12, lineHeight: 17, fontWeight: "700" }, mappingRow: { minHeight: 46, borderBottomWidth: financeUi.line.subtle, flexDirection: "row", alignItems: "center", gap: 8 }, mappingValue: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: "800", textAlign: "right" }, nativeNotice: { marginTop: 14, borderWidth: financeUi.line.subtle, borderRadius: 12, padding: 12, flexDirection: "row", gap: 8, alignItems: "center" }, nativeNoticeText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "700" }, pressed: { opacity: financeUi.opacity.pressed, transform: [{ scale: 0.98 }] }, preview: { marginTop: 14, borderRadius: financeUi.radius.button, borderWidth: financeUi.line.subtle, padding: 13 }, previewCopy: { fontSize: 13, lineHeight: 19, marginTop: 2 }, previewTitle: { fontSize: 14, lineHeight: 20, fontWeight: "800" }, primaryButton: { minHeight: 50, marginTop: 14, borderRadius: financeUi.radius.button, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }, primaryText: { fontSize: 15, lineHeight: 21, fontWeight: "800" }, secondaryButton: { minHeight: 50, marginTop: 14, borderRadius: financeUi.radius.button, borderWidth: financeUi.line.subtle, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }, secondaryText: { fontSize: 15, lineHeight: 21, fontWeight: "800" }, sectionLabel: { fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: 1, marginTop: 25, marginBottom: 9 }, title: { fontSize: 17, lineHeight: 23, fontWeight: "800" },
});
