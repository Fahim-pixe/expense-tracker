import { describe, expect, it } from "vitest";

import {
  DEFAULT_CATEGORIES,
  calculateTotals,
  getCategoryTotals,
  getMonthTransactions,
  normalizeFinanceState,
  parseAmountToCents,
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
    expect(getCategoryTotals(augustEntries, DEFAULT_CATEGORIES).map(({ category, amountCents }) => [category.id, amountCents])).toEqual([
      ["transport", 9800],
      ["food", 2450],
    ]);
  });

  it("parses a user-entered currency amount into minor units", () => {
    expect(parseAmountToCents("$18.75")).toBe(1875);
    expect(parseAmountToCents("invalid")).toBe(0);
  });
});

describe("persisted finance state", () => {
  it("hydrates a stored payload and falls back to safe local defaults for missing fields", () => {
    const restored = normalizeFinanceState({ transactions: [transactions[0]], preferences: { currencyCode: "EUR" } });
    expect(restored.transactions).toHaveLength(1);
    expect(restored.categories).toEqual(DEFAULT_CATEGORIES);
    expect(restored.preferences.currencyCode).toBe("EUR");
  });
});
