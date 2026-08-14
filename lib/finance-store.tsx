import AsyncStorage from "@react-native-async-storage/async-storage";
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
  normalizeFinanceState,
  type CurrencyCode,
  type FinancePreferences,
  type FinanceState,
  type FinanceTransaction,
  type TransactionType,
} from "@/lib/finance";

const STORAGE_KEY = "expense-tracker:ledger:v1";

type NewTransaction = Omit<FinanceTransaction, "id" | "createdAt">;
type CategoryMutationResult = { ok: true } | { ok: false; reason: "empty" | "duplicate" | "in-use" | "protected" | "persistence" };

type FinanceContextValue = FinanceState & {
  isReady: boolean;
  addTransaction: (transaction: NewTransaction) => Promise<boolean>;
  deleteTransaction: (id: string) => Promise<boolean>;
  addCategory: (name: string, type: TransactionType) => Promise<CategoryMutationResult>;
  deleteCategory: (id: string) => Promise<CategoryMutationResult>;
  updatePreferences: (preferences: Partial<FinancePreferences>) => Promise<boolean>;
  resetData: () => Promise<boolean>;
};

const FinanceContext = createContext<FinanceContextValue | null>(null);

function cleanCategoryName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_CATEGORY_NAME_LENGTH);
}

function isValidTransactionInput(transaction: NewTransaction, state: FinanceState) {
  return Number.isSafeInteger(transaction.amountCents)
    && transaction.amountCents > 0
    && transaction.amountCents <= MAX_TRANSACTION_CENTS
    && isValidDate(transaction.date)
    && state.categories.some((category) => category.id === transaction.categoryId && category.type === transaction.type);
}

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
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) restored = normalizeFinanceState(JSON.parse(stored));
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
    return () => {
      isMounted = false;
    };
  }, []);

  const commit = useCallback((updater: (current: FinanceState) => FinanceState) => {
    const operation = writeQueueRef.current.then(async (current) => {
      const next = updater(current);
      if (next === current) return current;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      stateRef.current = next;
      setState(next);
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
        return {
          ...current,
          transactions: [
            {
              ...transaction,
              note: transaction.note.replace(/\s+/g, " ").trim().slice(0, MAX_TRANSACTION_NOTE_LENGTH),
              id: createId("transaction"),
              createdAt: new Date().toISOString(),
            },
            ...current.transactions,
          ],
        };
      });
      return didAdd;
    } catch {
      return false;
    }
  }, [commit]);

  const deleteTransaction = useCallback(async (id: string) => {
    let didDelete = false;
    try {
      await commit((current) => {
        if (!current.transactions.some((transaction) => transaction.id === id)) return current;
        didDelete = true;
        return { ...current, transactions: current.transactions.filter((transaction) => transaction.id !== id) };
      });
      return didDelete;
    } catch {
      return false;
    }
  }, [commit]);

  const addCategory = useCallback(async (rawName: string, type: TransactionType): Promise<CategoryMutationResult> => {
    const name = cleanCategoryName(rawName);
    if (!name) return { ok: false, reason: "empty" };
    let result: CategoryMutationResult = { ok: false, reason: "persistence" };

    try {
      await commit((current) => {
        if (current.categories.some((category) => category.type === type && category.name.localeCompare(name, undefined, { sensitivity: "accent" }) === 0)) {
          result = { ok: false, reason: "duplicate" };
          return current;
        }
        result = { ok: true };
        return {
          ...current,
          categories: [
            ...current.categories,
            {
              id: createId("category"),
              name,
              type,
              icon: "label",
              color: CATEGORY_COLORS[current.categories.length % CATEGORY_COLORS.length],
              isDefault: false,
            },
          ],
        };
      });
      return result;
    } catch {
      return { ok: false, reason: "persistence" };
    }
  }, [commit]);

  const deleteCategory = useCallback(async (id: string): Promise<CategoryMutationResult> => {
    let result: CategoryMutationResult = { ok: false, reason: "persistence" };
    try {
      await commit((current) => {
        const category = current.categories.find((item) => item.id === id);
        if (!category || category.isDefault) {
          result = { ok: false, reason: "protected" };
          return current;
        }
        if (current.transactions.some((transaction) => transaction.categoryId === id)) {
          result = { ok: false, reason: "in-use" };
          return current;
        }
        result = { ok: true };
        return { ...current, categories: current.categories.filter((item) => item.id !== id) };
      });
      return result;
    } catch {
      return { ok: false, reason: "persistence" };
    }
  }, [commit]);

  const updatePreferences = useCallback(async (preferences: Partial<FinancePreferences>) => {
    if (preferences.currencyCode && !isSupportedCurrency(preferences.currencyCode)) return false;
    try {
      await commit((current) => ({ ...current, preferences: { ...current.preferences, ...preferences as { currencyCode?: CurrencyCode } } }));
      return true;
    } catch {
      return false;
    }
  }, [commit]);

  const resetData = useCallback(async () => {
    try {
      await commit(() => createInitialFinanceState());
      return true;
    } catch {
      return false;
    }
  }, [commit]);

  const value = useMemo(
    () => ({ ...state, isReady, addTransaction, deleteTransaction, addCategory, deleteCategory, updatePreferences, resetData }),
    [addCategory, addTransaction, deleteCategory, deleteTransaction, isReady, resetData, state, updatePreferences],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) throw new Error("useFinance must be used within FinanceProvider");
  return context;
}

