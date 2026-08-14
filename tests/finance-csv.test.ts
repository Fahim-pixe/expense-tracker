import { describe, expect, it } from "vitest";

import { DEFAULT_CATEGORIES, type FinanceTransaction } from "../lib/finance";
import { exportTransactionsCsv, inferCsvColumnMapping, inspectCsv, parseMappedTransactionsCsv, parseTransactionsCsv } from "../lib/finance-csv";

const transactions: FinanceTransaction[] = [
  { id: "food-1", type: "expense", amountCents: 1250, categoryId: "food", note: "Lunch, with \"tea\"", date: "2026-08-04", createdAt: "2026-08-04T12:00:00.000Z", splitGroupId: "split-1", splitIndex: 0, splitTotalCents: 2000 },
  { id: "transport-1", type: "expense", amountCents: 750, categoryId: "transport", note: "Lunch, with \"tea\"", date: "2026-08-04", createdAt: "2026-08-04T12:00:00.000Z", splitGroupId: "split-1", splitIndex: 1, splitTotalCents: 2000 },
];

describe("finance CSV portability", () => {
  it("round-trips quoted notes and split allocation metadata", () => {
    const result = parseTransactionsCsv(exportTransactionsCsv(transactions), DEFAULT_CATEGORIES, []);
    expect(result).toMatchObject({ imported: 2, duplicates: 0, invalid: 0 });
    expect(result.transactions.map((transaction) => ({ note: transaction.note, splitGroupId: transaction.splitGroupId, splitTotalCents: transaction.splitTotalCents }))).toEqual([
      { note: "Lunch, with \"tea\"", splitGroupId: "split-1", splitTotalCents: 2000 },
      { note: "Lunch, with \"tea\"", splitGroupId: "split-1", splitTotalCents: 2000 },
    ]);
  });

  it("skips existing, malformed, and foreign-category rows", () => {
    const csv = [
      "type,amount_cents,category_id,note,date,created_at,split_group_id,split_index,split_total_cents",
      "expense,1250,food,\"Lunch, with \"\"tea\"\"\",2026-08-04,2026-08-04T12:00:00.000Z,split-1,0,2000",
      "expense,0,food,Bad,2026-08-05,2026-08-05T12:00:00.000Z,,,",
      "expense,1000,unknown,No category,2026-08-05,2026-08-05T12:00:00.000Z,,,",
    ].join("\n");
    const result = parseTransactionsCsv(csv, DEFAULT_CATEGORIES, [transactions[0]]);
    expect(result).toMatchObject({ imported: 0, duplicates: 1, invalid: 2 });
  });

  it("maps common third-party headers and imports matched expense rows", () => {
    const table = inspectCsv(["Transaction Date,Debit,Merchant,Category", "08/15/2026,-23.45,Metro Mart,Food"].join("\n"));
    expect(table).not.toBeNull();
    const mapping = inferCsvColumnMapping(table!.headers);
    expect(mapping).toMatchObject({ date: "Transaction Date", amount: "Debit", note: "Merchant", category: "Category" });
    const result = parseMappedTransactionsCsv(table!, mapping, DEFAULT_CATEGORIES, [], "food", "expense");
    expect(result).toMatchObject({ imported: 1, duplicates: 0, invalid: 0 });
    expect(result.transactions[0]).toMatchObject({ type: "expense", amountCents: 2345, categoryId: "food", note: "Metro Mart", date: "2026-08-15" });
  });

  it("uses the selected fallback category when a third-party sheet has no category column", () => {
    const table = inspectCsv(["Date,Amount,Description", "2026-08-16,19.99,Coffee"].join("\n"));
    const result = parseMappedTransactionsCsv(table!, { date: "Date", amount: "Amount", note: "Description" }, DEFAULT_CATEGORIES, [], "food", "expense");
    expect(result.transactions[0]).toMatchObject({ categoryId: "food", amountCents: 1999, note: "Coffee" });
  });
});
