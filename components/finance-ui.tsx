import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { financeUi } from "@/constants/finance-ui";
import { useColors } from "@/hooks/use-colors";
import { formatMoney, type FinanceCategory, type TransactionType } from "@/lib/finance";

export function CategoryIcon({ category, size = financeUi.size.category }: { category: FinanceCategory; size?: number }) {
  return (
    <View style={[styles.categoryIcon, { width: size, height: size, borderRadius: size / 2, backgroundColor: `${category.color}20` }]}>
      <MaterialIcons name={category.icon} size={Math.round(size * 0.48)} color={category.color} />
    </View>
  );
}

export function AmountText({ amountCents, currencyCode, type, size = "regular" }: { amountCents: number; currencyCode: string; type?: TransactionType; size?: "large" | "regular" | "small" }) {
  const colors = useColors();
  const color = type === "income" ? colors.success : type === "expense" ? colors.error : colors.foreground;
  return (
    <Text style={[styles.amount, size === "large" ? styles.amountLarge : size === "small" ? styles.amountSmall : styles.amountRegular, { color }]}>
      {formatMoney(amountCents, currencyCode, { signed: Boolean(type) })}
    </Text>
  );
}

export function SectionTitle({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={({ pressed }) => [styles.textButton, pressed && { opacity: financeUi.opacity.pressed }]}>
          <Text style={[styles.textButtonText, { color: colors.primary }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; title: string; description: string; actionLabel?: string; onAction?: () => void }) {
  const colors = useColors();
  return (
    <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}16` }]}>
        <MaterialIcons name={icon} size={26} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.emptyDescription, { color: colors.muted }]}>{description}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={({ pressed }) => [styles.emptyAction, { backgroundColor: colors.primary }, pressed && { opacity: financeUi.opacity.pressed }]}>
          <Text style={[styles.emptyActionText, { color: colors.background }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function PageLoader() {
  const colors = useColors();
  return (
    <View style={styles.loader}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  );
}

export function SegmentedControl<T extends string>({ value, options, onChange }: { value: T; options: { label: string; value: T }[]; onChange: (value: T) => void }) {
  const colors = useColors();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable key={option.value} onPress={() => onChange(option.value)} style={({ pressed }) => [styles.segment, selected && { backgroundColor: colors.background }, pressed && { opacity: financeUi.opacity.pressed }]}>
            <Text style={[styles.segmentText, { color: selected ? colors.foreground : colors.muted }, selected && styles.segmentTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SurfaceCard({ children, style }: { children: ReactNode; style?: object }) {
  const colors = useColors();
  return <View style={[styles.surfaceCard, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  amount: { fontVariant: ["tabular-nums"], fontWeight: "700", letterSpacing: -0.4 },
  amountLarge: { fontSize: 34, lineHeight: 42 },
  amountRegular: { fontSize: 17, lineHeight: 23 },
  amountSmall: { fontSize: 14, lineHeight: 19 },
  categoryIcon: { alignItems: "center", justifyContent: "center" },
  emptyAction: { borderRadius: financeUi.radius.button, minHeight: financeUi.size.tapTarget, paddingHorizontal: 18, justifyContent: "center", marginTop: 18 },
  emptyActionText: { fontWeight: "700", fontSize: 15 },
  emptyDescription: { fontSize: 14, lineHeight: 20, textAlign: "center", maxWidth: 250 },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  emptyState: { borderWidth: financeUi.line.subtle, borderRadius: financeUi.radius.card, minHeight: 238, padding: 24, alignItems: "center", justifyContent: "center", gap: 9 },
  emptyTitle: { fontSize: 17, fontWeight: "700", marginTop: 3 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 19, lineHeight: 25, fontWeight: "800", letterSpacing: -0.2 },
  sectionTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  segmented: { flexDirection: "row", borderWidth: financeUi.line.subtle, padding: 3, borderRadius: financeUi.radius.button },
  segment: { flex: 1, minHeight: 36, justifyContent: "center", alignItems: "center", borderRadius: 12 },
  segmentText: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
  segmentTextSelected: { fontWeight: "800" },
  surfaceCard: { borderRadius: financeUi.radius.card, borderWidth: financeUi.line.subtle, padding: financeUi.spacing.card },
  textButton: { minHeight: financeUi.size.tapTarget, justifyContent: "center", paddingLeft: 12 },
  textButtonText: { fontSize: 14, fontWeight: "800" },
});
