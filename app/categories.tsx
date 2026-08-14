import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { financeUi } from "@/constants/finance-ui";
import { CategoryIcon, SegmentedControl } from "@/components/finance-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import type { FinanceCategory, TransactionType } from "@/lib/finance";
import { useFinance } from "@/lib/finance-store";

export default function CategoriesScreen() {
  const colors = useColors();
  const { categories, addCategory, deleteCategory } = useFinance();
  const [type, setType] = useState<TransactionType>("expense");
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const visibleCategories = useMemo(() => categories.filter((category) => category.type === type), [categories, type]);
  const add = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    const result = await addCategory(name, type);
    setIsSaving(false);
    if (result.ok) {
      setName("");
      return;
    }
    if (result.reason === "duplicate") Alert.alert("Category already exists", "Choose a different name for this transaction type.");
    else if (result.reason === "persistence") Alert.alert("Couldn’t add category", "Your category was not saved. Please try again.");
  };
  const remove = (category: FinanceCategory) => {
    if (category.isDefault) return;
    Alert.alert(`Remove ${category.name}?`, "Transactions using this category must be deleted first.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => { void deleteCategory(category.id).then((result) => { if (!result.ok && result.reason === "in-use") Alert.alert("Category in use", "Delete transactions that use this category before removing it."); else if (!result.ok) Alert.alert("Couldn’t remove category", "Your category was not changed. Please try again."); }); } },
    ]);
  };
  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <FlatList
        data={visibleCategories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.header}><Pressable accessibilityRole="button" onPress={() => router.back()} accessibilityLabel="Close categories" style={({ pressed }) => [styles.closeButton, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: financeUi.opacity.pressed }]}><MaterialIcons name="close" size={22} color={colors.foreground} /></Pressable><Text style={[styles.headerTitle, { color: colors.foreground }]}>Categories</Text><View style={styles.closeButton} /></View>
            <Text style={[styles.description, { color: colors.muted }]}>Keep common transactions quick to add.</Text>
            <SegmentedControl value={type} onChange={setType} options={[{ label: "Expenses", value: "expense" }, { label: "Income", value: "income" }]} />
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>ADD A CATEGORY</Text>
            <View style={[styles.addRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><TextInput value={name} onChangeText={setName} placeholder="Category name" placeholderTextColor={colors.muted} maxLength={32} accessibilityLabel="Category name" style={[styles.categoryInput, { color: colors.foreground }]} returnKeyType="done" onSubmitEditing={add} /><Pressable accessibilityRole="button" onPress={add} disabled={!name.trim() || isSaving} accessibilityLabel="Add category" accessibilityState={{ disabled: !name.trim() || isSaving }} style={({ pressed }) => [styles.addButton, { backgroundColor: name.trim() && !isSaving ? colors.primary : colors.border }, pressed && { opacity: financeUi.opacity.pressed }]}><MaterialIcons name="add" size={22} color={colors.background} /></Pressable></View>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>YOUR {type.toUpperCase()} CATEGORIES</Text>
          </View>
        }
        renderItem={({ item }) => <View style={[styles.categoryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><CategoryIcon category={item} /><Text style={[styles.categoryName, { color: colors.foreground }]}>{item.name}</Text>{item.isDefault ? <Text style={[styles.defaultLabel, { color: colors.muted }]}>Default</Text> : <Pressable accessibilityRole="button" onPress={() => remove(item)} accessibilityLabel={`Remove ${item.name}`} style={({ pressed }) => [styles.removeButton, pressed && { opacity: financeUi.opacity.pressed }]}><MaterialIcons name="delete-outline" size={21} color={colors.error} /></Pressable>}</View>}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  addButton: { height: 38, width: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  addRow: { height: 54, borderWidth: financeUi.line.subtle, borderRadius: financeUi.radius.button, paddingLeft: 14, paddingRight: 7, flexDirection: "row", alignItems: "center" },
  categoryInput: { flex: 1, height: "100%", fontSize: 15 },
  categoryName: { flex: 1, fontSize: 15, lineHeight: 21, fontWeight: "700" },
  categoryRow: { minHeight: 62, borderWidth: financeUi.line.subtle, borderRadius: financeUi.radius.button, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 8 },
  closeButton: { width: financeUi.size.tapTarget, height: financeUi.size.tapTarget, borderRadius: 22, borderWidth: financeUi.line.subtle, alignItems: "center", justifyContent: "center" },
  content: { padding: financeUi.spacing.page, paddingBottom: 25 },
  defaultLabel: { fontSize: 12, lineHeight: 17, fontWeight: "700" },
  description: { fontSize: 14, lineHeight: 20, marginBottom: 18 },
  fieldLabel: { fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: 1, marginTop: 25, marginBottom: 9 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  headerTitle: { fontSize: 17, lineHeight: 23, fontWeight: "800" },
  removeButton: { width: financeUi.size.tapTarget, height: financeUi.size.tapTarget, alignItems: "center", justifyContent: "center", marginRight: -8 },
});
