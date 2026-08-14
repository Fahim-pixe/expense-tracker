import type { ComponentProps } from "react";
import type MaterialIcons from "@expo/vector-icons/MaterialIcons";

export type TransactionType = "income" | "expense";
export type RecurrenceFrequency = "weekly" | "monthly" | "custom";
export type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];
export type CurrencyCode = "USD" | "EUR" | "GBP";

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
  recurringScheduleId?: string;
  splitGroupId?: string;
  splitIndex?: number;
  splitTotalCents?: number;
};

export type FinancePreferences = {
  currencyCode: CurrencyCode;
  biometricBackupProtection: boolean;
};

export type MonthlyBudget = {
  monthKey: string;
  amountCents: number;
  updatedAt: string;
};

export type CategoryBudget = MonthlyBudget & {
  categoryId: string;
};

export type RecurringTransaction = {
  id: string;
  type: TransactionType;
  amountCents: number;
  categoryId: string;
  note: string;
  nextRunDate: string;
  dayOfMonth: number;
  frequency?: RecurrenceFrequency;
  interval?: number;
  isActive: boolean;
  createdAt: string;
};

export type FinanceState = {
  transactions: FinanceTransaction[];
  categories: FinanceCategory[];
  preferences: FinancePreferences;
  budgets: MonthlyBudget[];
  categoryBudgets: CategoryBudget[];
  recurringTransactions: RecurringTransaction[];
};

export const SUPPORTED_CURRENCIES = [
  { code: "USD", label: "USD" },
  { code: "EUR", label: "EUR" },
  { code: "GBP", label: "GBP" },
] as const satisfies readonly { code: CurrencyCode; label: string }[];

export const MAX_TRANSACTION_CENTS = 999_999_999;
export const MAX_CATEGORY_NAME_LENGTH = 32;
export const MAX_TRANSACTION_NOTE_LENGTH = 160;
export const MAX_RECURRING_CATCH_UPS = 120;

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

export const DEFAULT_PREFERENCES: FinancePreferences = { currencyCode: "USD", biometricBackupProtection: false };
export const CATEGORY_COLORS = ["#3563E9", "#1FA971", "#F97316", "#A855F7", "#E55B5B", "#14B8A6"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTransactionType(value: unknown): value is TransactionType {
  return value === "income" || value === "expense";
}

function isRecurrenceFrequency(value: unknown): value is RecurrenceFrequency {
  return value === "weekly" || value === "monthly" || value === "custom";
}

function isValidColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function isValidTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

function cloneDefaultCategories() {
  return DEFAULT_CATEGORIES.map((category) => ({ ...category }));
}

function normalizeCategory(value: unknown): FinanceCategory | null {
  if (!isRecord(value) || typeof value.id !== "string" || !isTransactionType(value.type)) return null;
  const name = cleanText(value.name, MAX_CATEGORY_NAME_LENGTH);
  if (!value.id.trim() || !name || typeof value.icon !== "string" || !isValidColor(value.color)) return null;
  return { id: value.id.trim(), name, icon: value.icon as MaterialIconName, color: value.color, type: value.type, isDefault: Boolean(value.isDefault) };
}

function normalizeTransaction(value: unknown): FinanceTransaction | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.categoryId !== "string" || !isTransactionType(value.type)) return null;
  const amountCents = value.amountCents;
  const date = value.date;
  const createdAt = value.createdAt;
  if (!value.id.trim() || !value.categoryId.trim() || typeof date !== "string" || !isValidDate(date) || !isValidTimestamp(createdAt)) return null;
  if (typeof amountCents !== "number" || !Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > MAX_TRANSACTION_CENTS) return null;
  const splitMetadata = typeof value.splitGroupId === "string" && value.splitGroupId.trim()
    && typeof value.splitIndex === "number" && Number.isInteger(value.splitIndex) && value.splitIndex >= 0
    && typeof value.splitTotalCents === "number" && Number.isSafeInteger(value.splitTotalCents) && value.splitTotalCents >= amountCents && value.splitTotalCents <= MAX_TRANSACTION_CENTS
    ? { splitGroupId: value.splitGroupId.trim(), splitIndex: value.splitIndex, splitTotalCents: value.splitTotalCents }
    : {};
  return {
    id: value.id.trim(), type: value.type, amountCents, categoryId: value.categoryId.trim(), note: cleanText(value.note, MAX_TRANSACTION_NOTE_LENGTH), date, createdAt,
    ...(typeof value.recurringScheduleId === "string" && value.recurringScheduleId.trim() ? { recurringScheduleId: value.recurringScheduleId.trim() } : {}),
    ...splitMetadata,
  };
}

function normalizeBudget(value: unknown): MonthlyBudget | null {
  if (!isRecord(value) || typeof value.monthKey !== "string" || typeof value.amountCents !== "number" || typeof value.updatedAt !== "string") return null;
  if (!isValidMonthKey(value.monthKey) || !Number.isSafeInteger(value.amountCents) || value.amountCents <= 0 || value.amountCents > MAX_TRANSACTION_CENTS || !isValidTimestamp(value.updatedAt)) return null;
  return { monthKey: value.monthKey, amountCents: value.amountCents, updatedAt: value.updatedAt };
}

function normalizeRecurringTransaction(value: unknown): RecurringTransaction | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.categoryId !== "string" || !isTransactionType(value.type)) return null;
  if (typeof value.amountCents !== "number" || !Number.isSafeInteger(value.amountCents) || value.amountCents <= 0 || value.amountCents > MAX_TRANSACTION_CENTS) return null;
  if (typeof value.nextRunDate !== "string" || !isValidDate(value.nextRunDate) || !isValidTimestamp(value.createdAt)) return null;
  const frequency = isRecurrenceFrequency(value.frequency) ? value.frequency : "monthly";
  const interval = typeof value.interval === "number" && Number.isInteger(value.interval) && value.interval >= 1 && value.interval <= 365 ? value.interval : 1;
  const dayOfMonth = typeof value.dayOfMonth === "number" && Number.isInteger(value.dayOfMonth) && value.dayOfMonth >= 1 && value.dayOfMonth <= 31 ? value.dayOfMonth : Number(value.nextRunDate.slice(-2));
  return {
    id: value.id.trim(), type: value.type, amountCents: value.amountCents, categoryId: value.categoryId.trim(), note: cleanText(value.note, MAX_TRANSACTION_NOTE_LENGTH), nextRunDate: value.nextRunDate, dayOfMonth, frequency, interval, isActive: Boolean(value.isActive), createdAt: value.createdAt,
  };
}

export function createInitialFinanceState(): FinanceState {
  return { transactions: [], categories: cloneDefaultCategories(), preferences: { ...DEFAULT_PREFERENCES }, budgets: [], categoryBudgets: [], recurringTransactions: [] };
}

export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isSupportedCurrency(value: unknown): value is CurrencyCode {
  return SUPPORTED_CURRENCIES.some((currency) => currency.code === value);
}

export function isValidMonthKey(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return year >= 1900 && year <= 9999 && month >= 1 && month <= 12;
}

export function normalizeFinanceState(value: unknown): FinanceState {
  const source = isRecord(value) ? value : {};
  const providedCategories = Array.isArray(source.categories) ? source.categories.map(normalizeCategory).filter((category): category is FinanceCategory => Boolean(category)) : [];
  const normalizedCategories = new Map<string, FinanceCategory>();
  for (const category of providedCategories) if (!normalizedCategories.has(category.id)) normalizedCategories.set(category.id, category);
  for (const defaultCategory of cloneDefaultCategories()) normalizedCategories.set(defaultCategory.id, defaultCategory);

  const categories = [...normalizedCategories.values()];
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const transactions = (Array.isArray(source.transactions) ? source.transactions : []).map(normalizeTransaction).filter((transaction): transaction is FinanceTransaction => Boolean(transaction)).filter((transaction) => categoryById.get(transaction.categoryId)?.type === transaction.type);
  const rawPreferences = isRecord(source.preferences) ? source.preferences : {};

  const budgetsByMonth = new Map<string, MonthlyBudget>();
  if (Array.isArray(source.budgets)) for (const item of source.budgets) { const budget = normalizeBudget(item); if (budget && (!budgetsByMonth.get(budget.monthKey) || budgetsByMonth.get(budget.monthKey)!.updatedAt.localeCompare(budget.updatedAt) < 0)) budgetsByMonth.set(budget.monthKey, budget); }

  const categoryBudgetsByKey = new Map<string, CategoryBudget>();
  if (Array.isArray(source.categoryBudgets)) for (const item of source.categoryBudgets) {
    if (!isRecord(item) || typeof item.categoryId !== "string") continue;
    const budget = normalizeBudget(item);
    if (!budget || categoryById.get(item.categoryId)?.type !== "expense") continue;
    const key = `${budget.monthKey}:${item.categoryId}`;
    const current = categoryBudgetsByKey.get(key);
    if (!current || current.updatedAt.localeCompare(budget.updatedAt) < 0) categoryBudgetsByKey.set(key, { ...budget, categoryId: item.categoryId });
  }

  const recurringById = new Map<string, RecurringTransaction>();
  if (Array.isArray(source.recurringTransactions)) for (const item of source.recurringTransactions) {
    const recurring = normalizeRecurringTransaction(item);
    if (recurring && categoryById.get(recurring.categoryId)?.type === recurring.type && !recurringById.has(recurring.id)) recurringById.set(recurring.id, recurring);
  }

  return {
    transactions,
    categories,
    preferences: { currencyCode: isSupportedCurrency(rawPreferences.currencyCode) ? rawPreferences.currencyCode : DEFAULT_PREFERENCES.currencyCode, biometricBackupProtection: rawPreferences.biometricBackupProtection === true },
    budgets: [...budgetsByMonth.values()].sort((a, b) => b.monthKey.localeCompare(a.monthKey)),
    categoryBudgets: [...categoryBudgetsByKey.values()].sort((a, b) => b.monthKey.localeCompare(a.monthKey) || a.categoryId.localeCompare(b.categoryId)),
    recurringTransactions: [...recurringById.values()].sort((a, b) => a.nextRunDate.localeCompare(b.nextRunDate) || a.createdAt.localeCompare(b.createdAt)),
  };
}

export function getLocalDateKey(value = new Date()) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function getMonthKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(`${value}T12:00:00`) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonth(value: Date | string) {
  const date = typeof value === "string" ? new Date(`${value}T12:00:00`) : value;
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(date);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

export function getCurrencySymbol(currencyCode: CurrencyCode) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode, currencyDisplay: "narrowSymbol" }).formatToParts(0).find((part) => part.type === "currency")?.value ?? currencyCode;
}

export function formatMoney(amountCents: number, currencyCode: CurrencyCode, options?: { signed?: boolean; compact?: boolean }) {
  const prefix = options?.signed ? (amountCents > 0 ? "+" : amountCents < 0 ? "−" : "") : "";
  const amount = Math.abs(amountCents) / 100;
  return `${prefix}${new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode, notation: options?.compact && amount >= 1000 ? "compact" : "standard", maximumFractionDigits: options?.compact ? 1 : 2 }).format(amount)}`;
}

export function parseAmountToCents(input: string) {
  const normalized = input.trim().replace(/[,$€£\s]/g, "");
  const match = /^(\d+)(?:\.(\d{0,2}))?$/.exec(normalized);
  if (!match) return 0;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? Math.min(cents, MAX_TRANSACTION_CENTS) : 0;
}

export function toAmountInput(amountCents: number) {
  return (amountCents / 100).toFixed(2).replace(/\.00$/, "");
}

export function isValidDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  return year >= 1900 && year <= 9999 && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function getMonthTransactions(transactions: FinanceTransaction[], month: Date) {
  const monthKey = getMonthKey(month);
  return transactions.filter((transaction) => getMonthKey(transaction.date) === monthKey);
}

export function calculateTotals(transactions: FinanceTransaction[]) {
  return transactions.reduce((totals, transaction) => { if (transaction.type === "income") totals.incomeCents += transaction.amountCents; else totals.expenseCents += transaction.amountCents; totals.balanceCents = totals.incomeCents - totals.expenseCents; return totals; }, { incomeCents: 0, expenseCents: 0, balanceCents: 0 });
}

export function getCategoryTotals(transactions: FinanceTransaction[], categories: FinanceCategory[]) {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const totals = new Map<string, number>();
  transactions.filter((transaction) => transaction.type === "expense").forEach((transaction) => totals.set(transaction.categoryId, (totals.get(transaction.categoryId) ?? 0) + transaction.amountCents));
  return [...totals.entries()].map(([categoryId, amountCents]) => ({ category: categoryById.get(categoryId), amountCents })).filter((item): item is { category: FinanceCategory; amountCents: number } => Boolean(item.category)).sort((a, b) => b.amountCents - a.amountCents);
}

export function getDateLabel(date: string) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date === getLocalDateKey()) return "Today";
  if (date === getLocalDateKey(yesterday)) return "Yesterday";
  return formatDate(date);
}

export function getPreviousMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth() - 1, 1); }
export function getNextMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth() + 1, 1); }
export function getMonthlyBudget(budgets: MonthlyBudget[], month: Date | string) { const monthKey = typeof month === "string" ? month : getMonthKey(month); return budgets.find((budget) => budget.monthKey === monthKey); }
export function getCategoryBudget(categoryBudgets: CategoryBudget[], monthKey: string, categoryId: string) { return categoryBudgets.find((budget) => budget.monthKey === monthKey && budget.categoryId === categoryId); }

export function calculateBudgetProgress(expenseCents: number, budgetCents: number) {
  const safeExpense = Math.max(0, expenseCents);
  const safeBudget = Math.max(0, budgetCents);
  const remainingCents = safeBudget - safeExpense;
  return { expenseCents: safeExpense, budgetCents: safeBudget, remainingCents, percentUsed: safeBudget ? Math.round((safeExpense / safeBudget) * 100) : 0, isOverBudget: safeBudget > 0 && safeExpense > safeBudget, isAtBudget: safeBudget > 0 && safeExpense >= safeBudget };
}

export function getNextRecurringRunDate(currentRunDate: string, dayOfMonth: number) {
  const current = new Date(`${currentRunDate}T12:00:00`);
  const targetYear = current.getFullYear() + (current.getMonth() === 11 ? 1 : 0);
  const targetMonth = (current.getMonth() + 1) % 12;
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(Math.min(dayOfMonth, lastDay)).padStart(2, "0")}`;
}

export function getNextRecurringDate(schedule: Pick<RecurringTransaction, "nextRunDate" | "dayOfMonth" | "frequency" | "interval">) {
  const frequency = schedule.frequency ?? "monthly";
  const interval = schedule.interval ?? 1;
  if (frequency === "monthly") {
    let nextRunDate = schedule.nextRunDate;
    for (let index = 0; index < interval; index += 1) nextRunDate = getNextRecurringRunDate(nextRunDate, schedule.dayOfMonth);
    return nextRunDate;
  }
  const current = new Date(`${schedule.nextRunDate}T12:00:00`);
  current.setDate(current.getDate() + interval * (frequency === "weekly" ? 7 : 1));
  return getLocalDateKey(current);
}

export function processDueRecurringTransactions(state: FinanceState, asOfDate = getLocalDateKey()) {
  if (!isValidDate(asOfDate)) return state;
  const existingGenerated = new Set(state.transactions.filter((transaction) => transaction.recurringScheduleId).map((transaction) => `${transaction.recurringScheduleId}:${transaction.date}`));
  const generated: FinanceTransaction[] = [];
  let changed = false;
  const recurringTransactions = state.recurringTransactions.map((schedule) => {
    if (!schedule.isActive || schedule.nextRunDate > asOfDate) return schedule;
    let nextRunDate = schedule.nextRunDate;
    let instances = 0;
    while (nextRunDate <= asOfDate && instances < MAX_RECURRING_CATCH_UPS) {
      const occurrenceKey = `${schedule.id}:${nextRunDate}`;
      if (!existingGenerated.has(occurrenceKey)) {
        generated.push({ id: `recurring-${schedule.id}-${nextRunDate}`, type: schedule.type, amountCents: schedule.amountCents, categoryId: schedule.categoryId, note: schedule.note, date: nextRunDate, createdAt: `${nextRunDate}T12:00:00.000Z`, recurringScheduleId: schedule.id });
        existingGenerated.add(occurrenceKey);
      }
      nextRunDate = getNextRecurringDate({ ...schedule, nextRunDate });
      instances += 1;
      changed = true;
    }
    return changed ? { ...schedule, nextRunDate } : schedule;
  });
  return changed ? { ...state, transactions: [...generated, ...state.transactions], recurringTransactions } : state;
}
