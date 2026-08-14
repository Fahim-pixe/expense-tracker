import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import {
  CATEGORY_COLORS,
  DEFAULT_CATEGORIES,
  DEFAULT_PREFERENCES,
  createId,
  normalizeFinanceState,
  type FinanceCategory,
  type FinancePreferences,
  type FinanceState,
  type FinanceTransaction,
  type TransactionType,
} from "@/lib/finance";

const STORAGE_KEY = "expense-tracker:ledger:v1";

type NewTransaction = Omit<FinanceTransaction, "id" | "createdAt">;

type FinanceContextValue = FinanceState & {
  isReady: boolean;
  addTransaction: (transaction: NewTransaction) => void;
  deleteTransaction: (id: string) => void;
  addCategory: (name: string, type: TransactionType) => void;
  deleteCategory: (id: string) => boolean;
  updatePreferences: (preferences: Partial<FinancePreferences>) => void;
  resetData: () => void;
};

const FinanceContext = createContext<FinanceContextValue | null>(null);

const initialState: FinanceState = {
  transactions: [],
  categories: DEFAULT_CATEGORIES,
  preferences: DEFAULT_PREFERENCES,
};

export function FinanceProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<FinanceState>(initialState);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored && isMounted) setState(normalizeFinanceState(JSON.parse(stored)));
      })
      .catch(() => undefined)
      .finally(() => {
        if (isMounted) setIsReady(true);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const commit = useCallback((updater: (current: FinanceState) => FinanceState) => {
    setState((current) => {
      const next = updater(current);
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const addTransaction = useCallback(
    (transaction: NewTransaction) => {
      commit((current) => ({
        ...current,
        transactions: [{ ...transaction, id: createId("transaction"), createdAt: new Date().toISOString() }, ...current.transactions],
      }));
    },
    [commit],
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      commit((current) => ({ ...current, transactions: current.transactions.filter((transaction) => transaction.id !== id) }));
    },
    [commit],
  );

  const addCategory = useCallback(
    (rawName: string, type: TransactionType) => {
      const name = rawName.trim();
      if (!name) return;
      commit((current) => ({
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
      }));
    },
    [commit],
  );

  const deleteCategory = useCallback(
    (id: string) => {
      const category = state.categories.find((item) => item.id === id);
      const isInUse = state.transactions.some((transaction) => transaction.categoryId === id);
      if (!category || category.isDefault || isInUse) return false;
      commit((current) => ({ ...current, categories: current.categories.filter((item) => item.id !== id) }));
      return true;
    },
    [commit, state.categories, state.transactions],
  );

  const updatePreferences = useCallback(
    (preferences: Partial<FinancePreferences>) => {
      commit((current) => ({ ...current, preferences: { ...current.preferences, ...preferences } }));
    },
    [commit],
  );

  const resetData = useCallback(() => {
    commit(() => initialState);
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
