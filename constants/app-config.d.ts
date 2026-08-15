export const appIdentity: {
  readonly name: "Expense Tracker";
  readonly slug: "expense-tracker";
  readonly scheme: "expense-tracker";
  readonly expoPackageId: "com.app.expensetracker";
};

export const localLedgerConfig: {
  readonly storageKey: "expense-tracker:ledger:v1";
};

export const fileTransferConfig: {
  readonly maxImportBytes: 5_000_000;
  readonly backupFilePrefix: "expense-tracker-backup";
  readonly csvFilePrefix: "expense-tracker-ledger";
};

export const budgetWidgetConfig: {
  readonly name: "BudgetSnapshot";
  readonly deepLinkPath: "budget";
  readonly updatePeriodMillis: 1_800_000;
  readonly minimumWidth: "180dp";
  readonly minimumHeight: "110dp";
  readonly targetCellWidth: 4;
  readonly targetCellHeight: 2;
};

export const budgetWidgetVisualConfig: {
  readonly gradientStart: "#3563E9";
  readonly gradientEnd: "#244EC2";
  readonly overlineColor: "#DDE7FF";
  readonly primaryTextColor: "#FFFFFF";
  readonly secondaryTextColor: "#E7EEFF";
};
