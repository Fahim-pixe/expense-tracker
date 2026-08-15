/**
 * App-level identifiers and operational limits shared by Expo runtime code and app.config.ts.
 * Keep migration-compatible storage keys stable once released.
 */
const appIdentity = {
  name: "Expense Tracker",
  slug: "expense-tracker",
  scheme: "expense-tracker",
  expoPackageId: "com.app.expensetracker",
};

const localLedgerConfig = {
  storageKey: "expense-tracker:ledger:v1",
};

const fileTransferConfig = {
  maxImportBytes: 5_000_000,
  backupFilePrefix: "expense-tracker-backup",
  csvFilePrefix: "expense-tracker-ledger",
};

const budgetWidgetConfig = {
  name: "BudgetSnapshot",
  deepLinkPath: "budget",
  updatePeriodMillis: 1_800_000,
  minimumWidth: "180dp",
  minimumHeight: "110dp",
  targetCellWidth: 4,
  targetCellHeight: 2,
};

const budgetWidgetVisualConfig = {
  gradientStart: "#3563E9",
  gradientEnd: "#244EC2",
  overlineColor: "#DDE7FF",
  primaryTextColor: "#FFFFFF",
  secondaryTextColor: "#E7EEFF",
};

module.exports = {
  appIdentity,
  localLedgerConfig,
  fileTransferConfig,
  budgetWidgetConfig,
  budgetWidgetVisualConfig,
};
