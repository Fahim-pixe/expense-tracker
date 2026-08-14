import { describe, expect, it } from "vitest";

import {
  DEFAULT_CATEGORIES,
  calculateBudgetProgress,
  calculateTotals,
  createInitialFinanceState,
  getCategoryTotals,
  getLocalDateKey,
  getMonthTransactions,
  getNextRecurringDate,
  getNextRecurringRunDate,
  isValidDate,
  normalizeFinanceState,
  parseAmountToCents,
  processDueRecurringTransactions,
  type FinanceTransaction,
} from "../lib/finance";

const transactions: FinanceTransaction[] = [
  { id: "income-1", type: "income", amountCents: 250000, categoryId: "salary", note: "August salary", date: "2026-08-01", createdAt: "2026-08-01T09:00:00.000Z" },
  { id: "expense-1", type: "expense", amountCents: 2450, categoryId: "food", note: "Lunch", date: "2026-08-03", createdAt: "2026-08-03T12:00:00.000Z" },
  { id: "expense-2", type: "expense", amountCents: 9800, categoryId: "transport", note: "Train pass", date: "2026-08-04", createdAt: "2026-08-04T12:00:00.000Z" },
  { id: "expense-3", type: "expense", amountCents: 4100, categoryId: "food", note: "Groceries", date: "2026-07-29", createdAt: "2026-07-29T12:00:00.000Z" },
];

describe("finance ledger calculations", () => {
  it("calculates a monthly income, expense, and net balance", () => {
    const augustEntries = getMonthTransactions(transactions, new Date(2026, 7, 1));
    expect(calculateTotals(augustEntries)).toEqual({ incomeCents: 250000, expenseCents: 12250, balanceCents: 237750 });
  });

  it("aggregates expense categories in descending order", () => {
    const augustEntries = getMonthTransactions(transactions, new Date(2026, 7, 1));
    expect(getCategoryTotals(augustEntries, DEFAULT_CATEGORIES).map(({ category, amountCents }) => [category.id, amountCents])).toEqual([["transport", 9800], ["food", 2450]]);
  });

  it("parses a user-entered currency amount into minor units", () => {
    expect(parseAmountToCents("$18.75")).toBe(1875);
    expect(parseAmountToCents("18.5")).toBe(1850);
    expect(parseAmountToCents("18.567")).toBe(0);
    expect(parseAmountToCents("invalid")).toBe(0);
  });

  it("uses the device-local calendar date rather than a UTC date boundary", () => {
    expect(getLocalDateKey(new Date(2026, 7, 4, 23, 59, 59))).toBe("2026-08-04");
  });

  it("accepts only real calendar dates", () => {
    expect(isValidDate("2026-02-28")).toBe(true);
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("2026-13-01")).toBe(false);
  });

  it("calculates remaining and overspent budget progress", () => {
    expect(calculateBudgetProgress(7500, 10000)).toMatchObject({ remainingCents: 2500, percentUsed: 75, isAtBudget: false, isOverBudget: false });
    expect(calculateBudgetProgress(12500, 10000)).toMatchObject({ remainingCents: -2500, percentUsed: 125, isAtBudget: true, isOverBudget: true });
  });

  it("advances monthly recurring dates without skipping short months", () => {
    expect(getNextRecurringRunDate("2026-01-31", 31)).toBe("2026-02-28");
    expect(getNextRecurringRunDate("2026-02-28", 31)).toBe("2026-03-31");
  });

  it("advances weekly and custom schedules by their configured intervals", () => {
    expect(getNextRecurringDate({ nextRunDate: "2026-08-01", dayOfMonth: 1, frequency: "weekly", interval: 2 })).toBe("2026-08-15");
    expect(getNextRecurringDate({ nextRunDate: "2026-08-01", dayOfMonth: 1, frequency: "custom", interval: 45 })).toBe("2026-09-15");
  });

  it("creates due recurring entries once and advances the schedule", () => {
    const state = createInitialFinanceState();
    state.recurringTransactions = [{ id: "rent", type: "expense", amountCents: 125000, categoryId: "home", note: "Rent", nextRunDate: "2026-01-31", dayOfMonth: 31, isActive: true, createdAt: "2026-01-01T00:00:00.000Z" }];
    const processed = processDueRecurringTransactions(state, "2026-03-01");
    expect(processed.transactions.map((transaction) => transaction.date)).toEqual(["2026-01-31", "2026-02-28"]);
    expect(processed.transactions.every((transaction) => transaction.recurringScheduleId === "rent")).toBe(true);
    expect(processed.recurringTransactions[0].nextRunDate).toBe("2026-03-31");
    expect(processDueRecurringTransactions(processed, "2026-03-01")).toBe(processed);
  });
});

describe("persisted finance state", () => {
  it("hydrates a stored payload and falls back to safe local defaults for missing fields", () => {
    const restored = normalizeFinanceState({ transactions: [transactions[0]], preferences: { currencyCode: "EUR" } });
    expect(restored.transactions).toHaveLength(1);
    expect(restored.categories).toEqual(DEFAULT_CATEGORIES);
    expect(restored.preferences).toEqual({ currencyCode: "EUR", biometricBackupProtection: false });
  });

  it("rejects malformed records, restores default categories, and protects ledger referential integrity", () => {
    const restored = normalizeFinanceState({
      categories: [{ id: "custom", name: "  Travel   fund ", icon: "label", color: "#3563E9", type: "expense", isDefault: false }, { id: "bad", name: "Bad color", icon: "label", color: "blue", type: "expense", isDefault: false }],
      transactions: [{ ...transactions[0], categoryId: "custom" }, { ...transactions[1], amountCents: -10 }, { ...transactions[2], categoryId: "missing" }],
      preferences: { currencyCode: "AUD" },
    });
    expect(restored.categories.find((category) => category.id === "custom")?.name).toBe("Travel fund");
    expect(restored.categories.some((category) => category.id === "food" && category.isDefault)).toBe(true);
    expect(restored.transactions).toEqual([]);
    expect(restored.preferences.currencyCode).toBe("USD");
  });

  it("retains only valid, most recently updated monthly budgets", () => {
    const state = createInitialFinanceState();
    const restored = normalizeFinanceState({ ...state, budgets: [{ monthKey: "2026-08", amountCents: 80000, updatedAt: "2026-08-01T00:00:00.000Z" }, { monthKey: "2026-08", amountCents: 90000, updatedAt: "2026-08-02T00:00:00.000Z" }, { monthKey: "2026-14", amountCents: 90000, updatedAt: "2026-08-02T00:00:00.000Z" }] });
    expect(restored.budgets).toEqual([{ monthKey: "2026-08", amountCents: 90000, updatedAt: "2026-08-02T00:00:00.000Z" }]);
  });

  it("retains valid category budgets and biometric backup preference", () => {
    const state = createInitialFinanceState();
    const restored = normalizeFinanceState({ ...state, preferences: { currencyCode: "GBP", biometricBackupProtection: true }, categoryBudgets: [{ monthKey: "2026-08", categoryId: "food", amountCents: 50000, updatedAt: "2026-08-01T00:00:00.000Z" }, { monthKey: "2026-08", categoryId: "salary", amountCents: 90000, updatedAt: "2026-08-01T00:00:00.000Z" }] });
    expect(restored.preferences).toEqual({ currencyCode: "GBP", biometricBackupProtection: true });
    expect(restored.categoryBudgets).toEqual([{ monthKey: "2026-08", categoryId: "food", amountCents: 50000, updatedAt: "2026-08-01T00:00:00.000Z" }]);
  });

  it("retains complete split metadata and rejects incomplete split fields", () => {
    const state = createInitialFinanceState();
    const restored = normalizeFinanceState({ ...state, transactions: [
      { ...transactions[1], id: "split-food", splitGroupId: "split-1", splitIndex: 0, splitTotalCents: 6000 },
      { ...transactions[2], id: "incomplete-split", splitGroupId: "split-1" },
    ] });
    expect(restored.transactions).toHaveLength(2);
    expect(restored.transactions[0]).toMatchObject({ splitGroupId: "split-1", splitIndex: 0, splitTotalCents: 6000 });
    expect(restored.transactions[1].splitGroupId).toBeUndefined();
  });
});
