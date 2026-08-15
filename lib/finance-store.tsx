import AsyncStorage from "@react-native-async-storage/async-storage";
import { localLedgerConfig } from "@/constants/app-config";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";

import {
  CATEGORY_COLORS,
  MAX_CATEGORY_NAME_LENGTH,
  MAX_TRANSACTION_CENTS,
  MAX_TRANSACTION_NOTE_LENGTH,
  createId,
  createInitialFinanceState,
  isSupportedCurrency,
  isValidDate,
  isValidMonthKey,
  normalizeFinanceState,
  processDueRecurringTransactions,
  type CategoryBudget,
  type CurrencyCode,
  type FinancePreferences,
  type FinanceState,
  type FinanceTransaction,
  type RecurringTransaction,
  type TransactionType,
} from "@/lib/finance";
import { refreshBudgetWidget } from "@/lib/budget-widget";

export const FINANCE_STORAGE_KEY = localLedgerConfig.storageKey;

type NewTransaction = Omit<FinanceTransaction, "id" | "createdAt" | "recurringScheduleId">;
type NewRecurringTransaction = Omit<RecurringTransaction, "id" | "createdAt">;
type SplitAllocation = { categoryId: string; amountCents: number };
type NewSplitTransaction = { totalCents: number; allocations: SplitAllocation[]; note: string; date: string };
type CategoryMutationResult = { ok: true } | { ok: false; reason: "empty" | "duplicate" | "in-use" | "protected" | "persistence" };

type FinanceContextValue = FinanceState & {
  isReady: boolean;
  addTransaction: (transaction: NewTransaction) => Promise<boolean>;
  addSplitTransaction: (transaction: NewSplitTransaction) => Promise<boolean>;
  updateSplitTransaction: (groupId: string, transaction: NewSplitTransaction) => Promise<boolean>;
  updateTransaction: (id: string, transaction: NewTransaction) => Promise<boolean>;
  deleteTransaction: (id: string) => Promise<boolean>;
  addRecurringTransaction: (schedule: NewRecurringTransaction) => Promise<boolean>;
  toggleRecurringTransaction: (id: string) => Promise<boolean>;
  deleteRecurringTransaction: (id: string) => Promise<boolean>;
  addCategory: (name: string, type: TransactionType) => Promise<CategoryMutationResult>;
  deleteCategory: (id: string) => Promise<CategoryMutationResult>;
  updatePreferences: (preferences: Partial<FinancePreferences>) => Promise<boolean>;
  setMonthlyBudget: (monthKey: string, amountCents: number) => Promise<boolean>;
  deleteMonthlyBudget: (monthKey: string) => Promise<boolean>;
  setCategoryBudget: (monthKey: string, categoryId: string, amountCents: number) => Promise<boolean>;
  deleteCategoryBudget: (monthKey: string, categoryId: string) => Promise<boolean>;
  replaceFinanceState: (nextState: FinanceState) => Promise<boolean>;
  resetData: () => Promise<boolean>;
};

const FinanceContext = createContext<FinanceContextValue | null>(null);

function cleanCategoryName(value: string) { return value.replace(/\s+/g, " ").trim().slice(0, MAX_CATEGORY_NAME_LENGTH); }
function isValidTransactionInput(transaction: NewTransaction, state: FinanceState) { return Number.isSafeInteger(transaction.amountCents) && transaction.amountCents > 0 && transaction.amountCents <= MAX_TRANSACTION_CENTS && isValidDate(transaction.date) && state.categories.some((category) => category.id === transaction.categoryId && category.type === transaction.type); }
function isValidRecurringInput(schedule: NewRecurringTransaction, state: FinanceState) { const frequency = schedule.frequency ?? "monthly"; const interval = schedule.interval ?? 1; return Number.isSafeInteger(schedule.amountCents) && schedule.amountCents > 0 && schedule.amountCents <= MAX_TRANSACTION_CENTS && isValidDate(schedule.nextRunDate) && Number.isInteger(schedule.dayOfMonth) && schedule.dayOfMonth >= 1 && schedule.dayOfMonth <= 31 && ["weekly", "monthly", "custom"].includes(frequency) && Number.isInteger(interval) && interval >= 1 && interval <= 365 && state.categories.some((category) => category.id === schedule.categoryId && category.type === schedule.type); }
function isValidSplitTransactionInput(transaction: NewSplitTransaction, state: FinanceState) { if (!Number.isSafeInteger(transaction.totalCents) || transaction.totalCents <= 0 || transaction.totalCents > MAX_TRANSACTION_CENTS || !isValidDate(transaction.date) || transaction.allocations.length < 2 || transaction.allocations.length > 8) return false; const categories = new Set<string>(); const allocationTotal = transaction.allocations.reduce((sum, allocation) => sum + allocation.amountCents, 0); return allocationTotal === transaction.totalCents && transaction.allocations.every((allocation) => Number.isSafeInteger(allocation.amountCents) && allocation.amountCents > 0 && !categories.has(allocation.categoryId) && (categories.add(allocation.categoryId), state.categories.find((category) => category.id === allocation.categoryId)?.type === "expense")); }

export function FinanceProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<FinanceState>(() => createInitialFinanceState());
  const [isReady, setIsReady] = useState(false);
  const stateRef = useRef(state);
  const writeQueueRef = useRef<Promise<FinanceState>>(Promise.resolve(state));

  useEffect(() => {
    let isMounted = true;
    const hydrate = async () => {
      let restored = createInitialFinanceState();
      try {
        const stored = await AsyncStorage.getItem(FINANCE_STORAGE_KEY);
        if (stored) restored = normalizeFinanceState(JSON.parse(stored));
        const processed = processDueRecurringTransactions(restored);
        if (processed !== restored) {
          restored = processed;
          await AsyncStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(restored));
        }
      } catch {
        // A malformed or unavailable local payload should never block access to the ledger.
      }
      if (!isMounted) return;
      stateRef.current = restored;
      writeQueueRef.current = Promise.resolve(restored);
      setState(restored);
      setIsReady(true);
    };
    void hydrate();
    return () => { isMounted = false; };
  }, []);

  const commit = useCallback((updater: (current: FinanceState) => FinanceState) => {
    const operation = writeQueueRef.current.then(async (current) => {
      const next = updater(current);
      if (next === current) return current;
      await AsyncStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(next));
      stateRef.current = next;
      setState(next);
      void refreshBudgetWidget(next).catch(() => undefined);
      return next;
    });
    writeQueueRef.current = operation.catch(() => stateRef.current);
    return operation;
  }, []);

  const addTransaction = useCallback(async (transaction: NewTransaction) => {
    let didAdd = false;
    try {
      await commit((current) => {
        if (!isValidTransactionInput(transaction, current)) return current;
        didAdd = true;
        return { ...current, transactions: [{ ...transaction, note: transaction.note.replace(/\s+/g, " ").trim().slice(0, MAX_TRANSACTION_NOTE_LENGTH), id: createId("transaction"), createdAt: new Date().toISOString() }, ...current.transactions] };
      });
      return didAdd;
    } catch { return false; }
  }, [commit]);

  const addSplitTransaction = useCallback(async (transaction: NewSplitTransaction) => {
    let didAdd = false;
    try {
      await commit((current) => {
        if (!isValidSplitTransactionInput(transaction, current)) return current;
        didAdd = true;
        const groupId = createId("split-group");
        const createdAt = new Date().toISOString();
        const note = transaction.note.replace(/\s+/g, " ").trim().slice(0, MAX_TRANSACTION_NOTE_LENGTH);
        const entries = transaction.allocations.map((allocation, splitIndex) => ({ id: createId("split"), type: "expense" as const, amountCents: allocation.amountCents, categoryId: allocation.categoryId, note, date: transaction.date, createdAt, splitGroupId: groupId, splitIndex, splitTotalCents: transaction.totalCents }));
        return { ...current, transactions: [...entries, ...current.transactions] };
      });
      return didAdd;
    } catch { return false; }
  }, [commit]);

  const updateSplitTransaction = useCallback(async (groupId: string, transaction: NewSplitTransaction) => {
    let didUpdate = false;
    try {
      await commit((current) => {
        const existingEntries = current.transactions.filter((entry) => entry.splitGroupId === groupId);
        if (!groupId.trim() || existingEntries.length < 2 || !isValidSplitTransactionInput(transaction, current)) return current;
        didUpdate = true;
        const createdAt = existingEntries.reduce((oldest, entry) => entry.createdAt.localeCompare(oldest) < 0 ? entry.createdAt : oldest, existingEntries[0].createdAt);
        const note = transaction.note.replace(/\s+/g, " ").trim().slice(0, MAX_TRANSACTION_NOTE_LENGTH);
        const nextEntries = transaction.allocations.map((allocation, splitIndex) => ({ id: createId("split"), type: "expense" as const, amountCents: allocation.amountCents, categoryId: allocation.categoryId, note, date: transaction.date, createdAt, splitGroupId: groupId, splitIndex, splitTotalCents: transaction.totalCents }));
        return { ...current, transactions: [...nextEntries, ...current.transactions.filter((entry) => entry.splitGroupId !== groupId)] };
      });
      return didUpdate;
    } catch { return false; }
  }, [commit]);

  const updateTransaction = useCallback(async (id: string, transaction: NewTransaction) => {
    let didUpdate = false;
    try {
      await commit((current) => {
        if (!current.transactions.some((entry) => entry.id === id) || !isValidTransactionInput(transaction, current)) return current;
        didUpdate = true;
        return { ...current, transactions: current.transactions.map((entry) => entry.id === id ? { ...entry, ...transaction, note: transaction.note.replace(/\s+/g, " ").trim().slice(0, MAX_TRANSACTION_NOTE_LENGTH) } : entry) };
      });
      return didUpdate;
    } catch { return false; }
  }, [commit]);

  const deleteTransaction = useCallback(async (id: string) => {
    let didDelete = false;
    try {
      await commit((current) => {
        const target = current.transactions.find((transaction) => transaction.id === id);
        if (!target) return current;
        didDelete = true;
        return { ...current, transactions: current.transactions.filter((transaction) => target.splitGroupId ? transaction.splitGroupId !== target.splitGroupId : transaction.id !== id) };
      });
      return didDelete;
    } catch { return false; }
  }, [commit]);

  const addRecurringTransaction = useCallback(async (schedule: NewRecurringTransaction) => {
    let didAdd = false;
    try {
      await commit((current) => {
        if (!isValidRecurringInput(schedule, current)) return current;
        didAdd = true;
        return { ...current, recurringTransactions: [...current.recurringTransactions, { ...schedule, note: schedule.note.replace(/\s+/g, " ").trim().slice(0, MAX_TRANSACTION_NOTE_LENGTH), id: createId("recurring"), createdAt: new Date().toISOString() }] };
      });
      return didAdd;
    } catch { return false; }
  }, [commit]);

  const toggleRecurringTransaction = useCallback(async (id: string) => {
    let didToggle = false;
    try {
      await commit((current) => {
        if (!current.recurringTransactions.some((schedule) => schedule.id === id)) return current;
        didToggle = true;
        return { ...current, recurringTransactions: current.recurringTransactions.map((schedule) => schedule.id === id ? { ...schedule, isActive: !schedule.isActive } : schedule) };
      });
      return didToggle;
    } catch { return false; }
  }, [commit]);

  const deleteRecurringTransaction = useCallback(async (id: string) => {
    let didDelete = false;
    try {
      await commit((current) => {
        if (!current.recurringTransactions.some((schedule) => schedule.id === id)) return current;
        didDelete = true;
        return { ...current, recurringTransactions: current.recurringTransactions.filter((schedule) => schedule.id !== id) };
      });
      return didDelete;
    } catch { return false; }
  }, [commit]);

  const addCategory = useCallback(async (rawName: string, type: TransactionType): Promise<CategoryMutationResult> => {
    const name = cleanCategoryName(rawName);
    if (!name) return { ok: false, reason: "empty" };
    let result: CategoryMutationResult = { ok: false, reason: "persistence" };
    try {
      await commit((current) => {
        if (current.categories.some((category) => category.type === type && category.name.localeCompare(name, undefined, { sensitivity: "accent" }) === 0)) { result = { ok: false, reason: "duplicate" }; return current; }
        result = { ok: true };
        return { ...current, categories: [...current.categories, { id: createId("category"), name, type, icon: "label", color: CATEGORY_COLORS[current.categories.length % CATEGORY_COLORS.length], isDefault: false }] };
      });
      return result;
    } catch { return { ok: false, reason: "persistence" }; }
  }, [commit]);

  const deleteCategory = useCallback(async (id: string): Promise<CategoryMutationResult> => {
    let result: CategoryMutationResult = { ok: false, reason: "persistence" };
    try {
      await commit((current) => {
        const category = current.categories.find((item) => item.id === id);
        if (!category || category.isDefault) { result = { ok: false, reason: "protected" }; return current; }
        if (current.transactions.some((transaction) => transaction.categoryId === id) || current.recurringTransactions.some((schedule) => schedule.categoryId === id)) { result = { ok: false, reason: "in-use" }; return current; }
        result = { ok: true };
        return { ...current, categories: current.categories.filter((item) => item.id !== id), categoryBudgets: current.categoryBudgets.filter((budget) => budget.categoryId !== id) };
      });
      return result;
    } catch { return { ok: false, reason: "persistence" }; }
  }, [commit]);

  const updatePreferences = useCallback(async (preferences: Partial<FinancePreferences>) => {
    if (preferences.currencyCode && !isSupportedCurrency(preferences.currencyCode)) return false;
    try { await commit((current) => ({ ...current, preferences: { ...current.preferences, ...preferences as { currencyCode?: CurrencyCode; biometricBackupProtection?: boolean } } })); return true; } catch { return false; }
  }, [commit]);

  const setMonthlyBudget = useCallback(async (monthKey: string, amountCents: number) => {
    if (!isValidMonthKey(monthKey) || !Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > MAX_TRANSACTION_CENTS) return false;
    try { await commit((current) => { const nextBudget = { monthKey, amountCents, updatedAt: new Date().toISOString() }; return { ...current, budgets: current.budgets.some((budget) => budget.monthKey === monthKey) ? current.budgets.map((budget) => budget.monthKey === monthKey ? nextBudget : budget) : [nextBudget, ...current.budgets] }; }); return true; } catch { return false; }
  }, [commit]);

  const deleteMonthlyBudget = useCallback(async (monthKey: string) => {
    let didDelete = false;
    try { await commit((current) => { if (!current.budgets.some((budget) => budget.monthKey === monthKey)) return current; didDelete = true; return { ...current, budgets: current.budgets.filter((budget) => budget.monthKey !== monthKey) }; }); return didDelete; } catch { return false; }
  }, [commit]);

  const setCategoryBudget = useCallback(async (monthKey: string, categoryId: string, amountCents: number) => {
    if (!isValidMonthKey(monthKey) || !Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > MAX_TRANSACTION_CENTS) return false;
    try {
      await commit((current) => {
        if (current.categories.find((category) => category.id === categoryId)?.type !== "expense") return current;
        const nextBudget: CategoryBudget = { monthKey, categoryId, amountCents, updatedAt: new Date().toISOString() };
        const exists = current.categoryBudgets.some((budget) => budget.monthKey === monthKey && budget.categoryId === categoryId);
        return { ...current, categoryBudgets: exists ? current.categoryBudgets.map((budget) => budget.monthKey === monthKey && budget.categoryId === categoryId ? nextBudget : budget) : [nextBudget, ...current.categoryBudgets] };
      });
      return true;
    } catch { return false; }
  }, [commit]);

  const deleteCategoryBudget = useCallback(async (monthKey: string, categoryId: string) => {
    let didDelete = false;
    try { await commit((current) => { if (!current.categoryBudgets.some((budget) => budget.monthKey === monthKey && budget.categoryId === categoryId)) return current; didDelete = true; return { ...current, categoryBudgets: current.categoryBudgets.filter((budget) => budget.monthKey !== monthKey || budget.categoryId !== categoryId) }; }); return didDelete; } catch { return false; }
  }, [commit]);

  const replaceFinanceState = useCallback(async (nextState: FinanceState) => {
    try { await commit(() => processDueRecurringTransactions(normalizeFinanceState(nextState))); return true; } catch { return false; }
  }, [commit]);
  const resetData = useCallback(async () => { try { await commit(() => createInitialFinanceState()); return true; } catch { return false; } }, [commit]);

  const value = useMemo(
    () => ({ ...state, isReady, addTransaction, addSplitTransaction, updateSplitTransaction, updateTransaction, deleteTransaction, addRecurringTransaction, toggleRecurringTransaction, deleteRecurringTransaction, addCategory, deleteCategory, updatePreferences, setMonthlyBudget, deleteMonthlyBudget, setCategoryBudget, deleteCategoryBudget, replaceFinanceState, resetData }),
    [addCategory, addRecurringTransaction, addSplitTransaction, addTransaction, deleteCategory, deleteCategoryBudget, deleteMonthlyBudget, deleteRecurringTransaction, deleteTransaction, isReady, replaceFinanceState, resetData, setCategoryBudget, setMonthlyBudget, state, toggleRecurringTransaction, updatePreferences, updateSplitTransaction, updateTransaction],
  );
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) throw new Error("useFinance must be used within FinanceProvider");
  return context;
}
