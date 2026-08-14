import { isValidDate, normalizeFinanceState, parseAmountToCents, type FinanceCategory, type FinanceTransaction, type TransactionType } from "./finance";

export const CSV_COLUMNS = ["type", "amount_cents", "category_id", "note", "date", "created_at", "split_group_id", "split_index", "split_total_cents"] as const;
export const CSV_MAPPING_FIELDS = ["date", "amount", "category", "note", "type"] as const;
export type CsvMappingField = typeof CSV_MAPPING_FIELDS[number];
export type CsvColumnMapping = Partial<Record<CsvMappingField, string>>;
export type CsvTable = { headers: string[]; rows: string[][] };
export type CsvImportResult = { transactions: FinanceTransaction[]; imported: number; duplicates: number; invalid: number };

const HEADER_ALIASES: Record<CsvMappingField, string[]> = {
  date: ["date", "transaction date", "posted date", "date posted", "time"],
  amount: ["amount", "transaction amount", "value", "sum", "debit", "credit"],
  category: ["category", "categories", "type", "expense category"],
  note: ["note", "notes", "memo", "description", "merchant", "payee", "details", "title"],
  type: ["transaction type", "transaction_type", "type", "direction", "kind"],
};

const csvEscape = (value: string | number | undefined) => {
  const text = value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function financeTransactionSignature(transaction: Pick<FinanceTransaction, "type" | "amountCents" | "categoryId" | "note" | "date" | "splitGroupId" | "splitIndex">) {
  return [transaction.type, transaction.amountCents, transaction.categoryId, transaction.note.trim().toLowerCase(), transaction.date, transaction.splitGroupId ?? "", transaction.splitIndex ?? ""].join("|");
}

export function exportTransactionsCsv(transactions: FinanceTransaction[]) {
  const rows = transactions.slice().sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)).map((transaction) => [transaction.type, transaction.amountCents, transaction.categoryId, transaction.note, transaction.date, transaction.createdAt, transaction.splitGroupId, transaction.splitIndex, transaction.splitTotalCents].map(csvEscape).join(","));
  return [CSV_COLUMNS.join(","), ...rows].join("\n");
}

function parseCsvRows(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (quoted) {
      if (character === '"' && csv[index + 1] === '"') { field += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") { row.push(field); field = ""; }
    else if (character === "\n" || character === "\r") {
      if (character === "\r" && csv[index + 1] === "\n") index += 1;
      row.push(field); field = "";
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
    } else field += character;
  }
  if (quoted) return null;
  row.push(field);
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

export function inspectCsv(csv: string): CsvTable | null {
  const rows = parseCsvRows(csv.replace(/^\uFEFF/, ""));
  if (!rows?.length || !rows[0].length) return null;
  return { headers: rows[0].map((header, index) => header.trim() || `Column ${index + 1}`), rows: rows.slice(1) };
}

export function inferCsvColumnMapping(headers: string[]): CsvColumnMapping {
  const normalized = new Map(headers.map((header) => [header.trim().toLowerCase(), header]));
  return CSV_MAPPING_FIELDS.reduce<CsvColumnMapping>((mapping, field) => {
    const match = HEADER_ALIASES[field].map((alias) => normalized.get(alias)).find(Boolean);
    if (match) mapping[field] = match;
    return mapping;
  }, {});
}

function normalizeImportedDate(value: string) {
  const cleaned = value.trim();
  if (isValidDate(cleaned)) return cleaned;
  const match = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return null;
  const [, first, second, year] = match;
  const month = Number(first) > 12 ? Number(second) : Number(first);
  const day = Number(first) > 12 ? Number(first) : Number(second);
  const normalized = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return isValidDate(normalized) ? normalized : null;
}

function parseImportedAmount(value: string) {
  const cleaned = value.trim().replace(/\s/g, "").replace(/,(?=\d{3}(\D|$))/g, "").replace(/,/g, ".");
  return parseAmountToCents(cleaned.replace(/[^\d.-]/g, "").replace("-", ""));
}

function inferTransactionType(value: string, amountValue: string, fallback: TransactionType): TransactionType {
  const text = value.trim().toLowerCase();
  if (/(income|credit|deposit|refund|salary|payment received)/.test(text)) return "income";
  if (/(expense|debit|purchase|withdrawal|payment|charge)/.test(text)) return "expense";
  return amountValue.trim().startsWith("-") ? "expense" : fallback;
}

function mergeImportedRows(rawRows: Array<Omit<FinanceTransaction, "id" | "createdAt"> & { createdAt?: string }>, categories: FinanceCategory[], existingTransactions: FinanceTransaction[]): CsvImportResult {
  const existing = new Set(existingTransactions.map(financeTransactionSignature));
  const imported: FinanceTransaction[] = [];
  let duplicates = 0;
  let invalid = 0;
  rawRows.forEach((raw, index) => {
    const normalized = normalizeFinanceState({ categories, transactions: [{ ...raw, id: `csv-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`, createdAt: raw.createdAt || new Date().toISOString() }] }).transactions[0];
    if (!normalized) { invalid += 1; return; }
    const signature = financeTransactionSignature(normalized);
    if (existing.has(signature)) { duplicates += 1; return; }
    existing.add(signature);
    imported.push(normalized);
  });
  return { transactions: imported, imported: imported.length, duplicates, invalid };
}

export function parseTransactionsCsv(csv: string, categories: FinanceCategory[], existingTransactions: FinanceTransaction[]): CsvImportResult {
  const table = inspectCsv(csv);
  if (!table) return { transactions: [], imported: 0, duplicates: 0, invalid: 0 };
  const indexes = new Map(table.headers.map((column, index) => [column.trim().toLowerCase(), index]));
  if (!CSV_COLUMNS.slice(0, 6).every((column) => indexes.has(column))) return { transactions: [], imported: 0, duplicates: 0, invalid: Math.max(1, table.rows.length) };
  const rawRows = table.rows.map((row) => {
    const value = (column: typeof CSV_COLUMNS[number]) => row[indexes.get(column) ?? -1] ?? "";
    const splitGroupId = value("split_group_id").trim();
    const splitIndex = Number(value("split_index"));
    const splitTotalCents = Number(value("split_total_cents"));
    return { type: value("type") as TransactionType, amountCents: Number(value("amount_cents")), categoryId: value("category_id"), note: value("note"), date: value("date"), createdAt: value("created_at"), ...(splitGroupId && Number.isInteger(splitIndex) && Number.isInteger(splitTotalCents) ? { splitGroupId, splitIndex, splitTotalCents } : {}) };
  });
  return mergeImportedRows(rawRows, categories, existingTransactions);
}

export function parseMappedTransactionsCsv(table: CsvTable, mapping: CsvColumnMapping, categories: FinanceCategory[], existingTransactions: FinanceTransaction[], fallbackCategoryId: string, fallbackType: TransactionType): CsvImportResult {
  const headerIndex = new Map(table.headers.map((header, index) => [header, index]));
  if (!mapping.date || !mapping.amount || !headerIndex.has(mapping.date) || !headerIndex.has(mapping.amount)) return { transactions: [], imported: 0, duplicates: 0, invalid: Math.max(1, table.rows.length) };
  const value = (row: string[], field: CsvMappingField) => mapping[field] ? row[headerIndex.get(mapping[field]!) ?? -1] ?? "" : "";
  const categoryByName = new Map(categories.map((category) => [category.name.trim().toLowerCase(), category]));
  const rawRows: Array<Omit<FinanceTransaction, "id" | "createdAt"> & { createdAt?: string }> = [];
  let preInvalid = 0;
  table.rows.forEach((row) => {
    const amountRaw = value(row, "amount");
    const date = normalizeImportedDate(value(row, "date"));
    const type = inferTransactionType(value(row, "type"), amountRaw, fallbackType);
    const amountCents = parseImportedAmount(amountRaw);
    const namedCategory = categoryByName.get(value(row, "category").trim().toLowerCase());
    const fallbackCategory = categories.find((category) => category.id === fallbackCategoryId && category.type === type) ?? categories.find((category) => category.type === type);
    const category = namedCategory?.type === type ? namedCategory : fallbackCategory;
    if (!date || amountCents <= 0 || !category) { preInvalid += 1; return; }
    rawRows.push({ type, amountCents, categoryId: category.id, note: value(row, "note").trim(), date, createdAt: new Date().toISOString() });
  });
  const result = mergeImportedRows(rawRows, categories, existingTransactions);
  return { ...result, invalid: result.invalid + preInvalid };
}
