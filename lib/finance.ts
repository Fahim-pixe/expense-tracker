import type { ComponentProps } from "react";
import type MaterialIcons from "@expo/vector-icons/MaterialIcons";

export type TransactionType = "income" | "expense";
export type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

export type FinanceCategory = {
  id: string;
  name: string;
  icon: MaterialIconName;
  color: string;
  type: TransactionType;
  isDefault: boolean;
};

export type FinanceTransaction = {
  id: string;
  type: TransactionType;
  amountCents: number;
  categoryId: string;
  note: string;
  date: string;
  createdAt: string;
};

export type FinancePreferences = {
  currencyCode: string;
};

export type FinanceState = {
  transactions: FinanceTransaction[];
  categories: FinanceCategory[];
  preferences: FinancePreferences;
};

export const DEFAULT_CATEGORIES: FinanceCategory[] = [
  { id: "food", name: "Food & dining", icon: "restaurant", color: "#F97316", type: "expense", isDefault: true },
  { id: "transport", name: "Transport", icon: "directions-car", color: "#3B82F6", type: "expense", isDefault: true },
  { id: "shopping", name: "Shopping", icon: "shopping-bag", color: "#A855F7", type: "expense", isDefault: true },
  { id: "bills", name: "Bills & utilities", icon: "receipt-long", color: "#EAB308", type: "expense", isDefault: true },
  { id: "health", name: "Health", icon: "favorite", color: "#EC4899", type: "expense", isDefault: true },
  { id: "home", name: "Home", icon: "home", color: "#14B8A6", type: "expense", isDefault: true },
  { id: "other-expense", name: "Other", icon: "more-horiz", color: "#64748B", type: "expense", isDefault: true },
  { id: "salary", name: "Salary", icon: "account-balance-wallet", color: "#1FA971", type: "income", isDefault: true },
  { id: "freelance", name: "Freelance", icon: "work", color: "#0EA5E9", type: "income", isDefault: true },
  { id: "gift", name: "Gift", icon: "card-giftcard", color: "#8B5CF6", type: "income", isDefault: true },
  { id: "other-income", name: "Other", icon: "add-circle-outline", color: "#64748B", type: "income", isDefault: true },
];

export const DEFAULT_PREFERENCES: FinancePreferences = { currencyCode: "USD" };

export const CATEGORY_COLORS = ["#3563E9", "#1FA971", "#F97316", "#A855F7", "#E55B5B", "#14B8A6"];

export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeFinanceState(value: Partial<FinanceState>): FinanceState {
  return {
    transactions: Array.isArray(value.transactions) ? value.transactions : [],
    categories: Array.isArray(value.categories) && value.categories.length ? value.categories : DEFAULT_CATEGORIES,
    preferences: { ...DEFAULT_PREFERENCES, ...(value.preferences ?? {}) },
  };
}

export function getMonthKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(`${value}T12:00:00`) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonth(value: Date | string) {
  const date = typeof value === "string" ? new Date(`${value}T12:00:00`) : value;
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(`${value}T12:00:00`),
  );
}

export function formatMoney(amountCents: number, currencyCode: string, options?: { signed?: boolean; compact?: boolean }) {
  const prefix = options?.signed ? (amountCents > 0 ? "+" : amountCents < 0 ? "−" : "") : "";
  const amount = Math.abs(amountCents) / 100;
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    notation: options?.compact && amount >= 1000 ? "compact" : "standard",
    maximumFractionDigits: options?.compact ? 1 : 2,
  });
  return `${prefix}${formatter.format(amount)}`;
}

export function parseAmountToCents(input: string) {
  const normalized = input.replace(/[^0-9.]/g, "");
  if (!normalized || Number.isNaN(Number(normalized))) return 0;
  return Math.round(Number(normalized) * 100);
}

export function toAmountInput(amountCents: number) {
  return (amountCents / 100).toFixed(2).replace(/\.00$/, "");
}

export function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime());
}

export function getMonthTransactions(transactions: FinanceTransaction[], month: Date) {
  const monthKey = getMonthKey(month);
  return transactions.filter((transaction) => getMonthKey(transaction.date) === monthKey);
}

export function calculateTotals(transactions: FinanceTransaction[]) {
  return transactions.reduce(
    (totals, transaction) => {
      if (transaction.type === "income") totals.incomeCents += transaction.amountCents;
      else totals.expenseCents += transaction.amountCents;
      totals.balanceCents = totals.incomeCents - totals.expenseCents;
      return totals;
    },
    { incomeCents: 0, expenseCents: 0, balanceCents: 0 },
  );
}

export function getCategoryTotals(transactions: FinanceTransaction[], categories: FinanceCategory[]) {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const totals = new Map<string, number>();
  transactions
    .filter((transaction) => transaction.type === "expense")
    .forEach((transaction) => totals.set(transaction.categoryId, (totals.get(transaction.categoryId) ?? 0) + transaction.amountCents));

  return [...totals.entries()]
    .map(([categoryId, amountCents]) => ({ category: categoryById.get(categoryId), amountCents }))
    .filter((item): item is { category: FinanceCategory; amountCents: number } => Boolean(item.category))
    .sort((a, b) => b.amountCents - a.amountCents);
}

export function getDateLabel(date: string) {
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date === todayKey) return "Today";
  if (date === yesterday.toISOString().slice(0, 10)) return "Yesterday";
  return formatDate(date);
}

export function getPreviousMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

export function getNextMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}
