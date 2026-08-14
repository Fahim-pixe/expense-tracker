# Expense Tracker — Interface Design Plan

## Product Intent

Expense Tracker is a private, local-first personal finance companion for quickly recording money in and out, keeping everyday spending organized, and understanding the current month at a glance. The interaction model prioritizes a single-handed 9:16 mobile portrait experience: primary actions are placed in the lower half of the screen, tap targets are comfortably sized, and important balances are visible without navigating away.

## Screen List

| Screen | Primary content and functionality |
| --- | --- |
| **Overview** | A current-month balance card, income and spending totals, a compact weekly activity graphic, category highlights, and a chronological recent-activity list. A prominent lower-right action adds a transaction. |
| **Transactions** | A searchable, filterable ledger grouped by date. Each row identifies the category, note, payment source, date, and signed amount. Users can delete an entry after confirmation. |
| **Add Transaction** | A focused full-screen sheet with an expense/income segmented control, numeric amount field, category picker, optional note, and date selection. The Save button remains accessible above the keyboard area. |
| **Edit Transaction** | A prefilled full-screen sheet opened from a ledger row. It uses the same validated fields as Add Transaction, with an explicit save action and a separate destructive deletion confirmation. |
| **Insights** | Month navigation, income/expense/net stat cards, expense category distribution, a daily spending comparison, and a compact spending trend. |
| **Budget** | A monthly target form, a clear spent-versus-budget progress card, remaining or overspent amount, and a category summary. When current-month spending reaches or exceeds the target, the state is visually and verbally prominent. |
| **Category budgets** | A month-specific list of expense categories. Each row shows category spending against its own target, uses a clear remaining or overspent status, and opens a focused target editor. |
| **Recurring transactions** | A concise local schedule list for monthly income and expense templates. Each schedule identifies its next date, amount, and category; users can add, pause, resume, or remove a schedule. Due schedules are recorded when the app opens. |
| **Split transaction** | An expanded transaction-entry mode for expenses. Users allocate a single total across two or more expense categories, see the remaining allocation in real time, and can save only when the split exactly matches the total. |
| **CSV portability** | A focused settings sheet for exporting the ledger in a documented CSV format and importing a compatible CSV file. Import presents its validation summary and requires confirmation before adding valid rows. |
| **Budget widget** | A compact native Android home-screen card displaying current-month spending, remaining or overspent monthly budget, and the highest-priority category-limit alert. Tapping it opens the budget view. |
| **Categories** | An editable category collection for expense and income entries. Users can add a category or remove custom categories that are not in use. |
| **Settings** | Currency selection, recurring schedule management, local-data reset with confirmation, password-protected backup export/import, and a concise local-first privacy explanation. |

## Core Data Model

| Entity | Fields | Notes |
| --- | --- | --- |
| **Transaction** | `id`, `type`, `amount`, `categoryId`, `note`, `date`, `createdAt` | `type` is `income` or `expense`; `amount` is stored as a positive minor-unit integer to avoid floating-point totals. |
| **Category** | `id`, `name`, `icon`, `color`, `type`, `isDefault` | A category applies to one transaction type and is ordered for fast one-handed selection. |
| **Preferences** | `currencyCode`, `hasSeededData` | Preferences and the ledger are persisted locally on-device with AsyncStorage. |
| **Budget** | `monthKey`, `amountCents`, `updatedAt` | A single target applies to the selected month. The current month is highlighted on the Budget screen and in overspend alerts. |
| **Category budget** | `monthKey`, `categoryId`, `amountCents`, `updatedAt` | An optional target applies to one expense category in a particular month and supplements the overall monthly budget. |
| **Recurring transaction** | `id`, `type`, `amountCents`, `categoryId`, `note`, `nextRunDate`, `frequency`, `isActive`, `createdAt` | Monthly schedules generate dated ledger entries when they become due; a deterministic next date prevents duplicate catch-up records. |
| **Recurring rule** | `frequency`, `interval`, `dayOfWeek`, `dayOfMonth` | Rules support weekly, monthly, or a custom number of days. Every schedule persists its next date rather than re-deriving past occurrences. |
| **Transaction split** | `splitGroupId`, `splitIndex`, `splitTotal` | A split expense stores one validated ledger row per category allocation; shared group metadata preserves the original total and allows grouped rendering and export. |
| **Backup security preference** | `biometricBackupProtection` | An optional local preference asks for strong Face ID or fingerprint authentication before backup export or restore, while the backup passphrase remains required. |
| **Backup envelope** | `format`, `version`, `kdf`, `salt`, `iv`, `ciphertext`, `mac`, `createdAt` | Ledger data is encrypted locally with a user-supplied passphrase before export. The passphrase is never persisted. Import validates integrity and replaces data only after explicit confirmation. |

## Key User Flows

| Goal | Flow |
| --- | --- |
| Record a purchase | Overview or Transactions → Add Transaction → Expense selected → Enter amount → Select category → Optional note → Save → Return to the previous screen with summary totals refreshed. |
| Record income | Add Transaction → Income selected → Enter amount → Select category → Save → Current-month income and net balance update. |
| Review spending | Insights → Change month with compact previous/next controls → Review expense total, category distribution, and daily comparison. |
| Correct a record | Transactions → Tap a transaction → Choose delete → Confirm → Local ledger, overview, and insights update. |
| Edit a record | Transactions → Tap a transaction → Edit sheet → Adjust validated fields → Save changes → Ledger and summaries update. |
| Personalize categories | Settings → Categories → Choose Income or Expense → Add or remove a custom category. |
| Back up private data | Settings → Export encrypted backup → Enter and confirm a passphrase → Generate encrypted file → Share or download the backup. |
| Restore private data | Settings → Import encrypted backup → Select backup file → Enter passphrase → Verify integrity → Review replacement warning → Confirm → Local ledger, budgets, categories, and preferences update. |
| Set a budget | Budget → Select month → Enter a monthly spending target → Save → See progress and remaining amount. |
| Set a category target | Budget → Category limits → Choose a category → Enter a monthly target → Save → See category-specific progress and alerts. |
| Automate a recurring entry | Settings → Recurring transactions → Create schedule → Choose monthly date, amount, category, and note → Save → Due entries appear the next time the app opens. |
| Schedule a flexible entry | Settings → Recurring transactions → Choose weekly, monthly, or custom cadence → Set the interval and start date → Save → Due entries are generated without duplicates. |
| Split a purchase | Add transaction → Enable split → Add category allocations → Confirm the allocations match the total → Save → Ledger and category budgets reflect each allocation. |
| Move ledger data by CSV | Settings → CSV import/export → Export a CSV through the system share sheet, or select a CSV → Review valid and rejected rows → Confirm import → Valid entries join the local ledger. |
| View budget at a glance | Add the Budget Snapshot widget on Android → Read spending, remaining budget, and category alert → Tap widget → Open the app’s Budget tab. |
| Enable biometric backup protection | Backups → Enable biometric confirmation → Confirm device support → Turn on → Authenticate before exporting or restoring in addition to entering the backup passphrase. |

## Visual System

The brand uses an energetic **ledger blue** (`#3563E9`) for primary actions and calm emphasis, a **deep ink** (`#111827`) foreground, an off-white **paper** (`#F7F8FC`) app background, and white elevated surfaces. Positive money states use **income green** (`#1FA971`); spending uses **coral red** (`#E55B5B`); and unselected controls use a muted slate. Cards have a 20-point radius, gentle 1-point borders, and restrained shadows to evoke a modern iOS finance utility without visual clutter. Typography favors large, tabular balance figures, compact all-caps labels where scanning helps, and highly legible 15–17-point body text.

## Accessibility and Interaction Details

Controls use text labels alongside icons where meaning may be ambiguous, maintain high contrast, and use at least a 44-point target size. Primary actions include a subtle pressed scale and haptic acknowledgement; destructive actions require confirmation. Monetary input selects the numeric keyboard and validates that an amount is greater than zero before saving. Backup passphrases are masked and never stored. Import clearly states that it replaces local data only after decryption and explicit confirmation. Optional biometric confirmation is never the sole lock: the backup passphrase remains required and cancellation does not change data. Budget progress is paired with accessible text; overspend is never communicated by color alone. Empty states directly explain the next action rather than showing sample financial figures.
