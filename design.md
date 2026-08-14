# Expense Tracker — Interface Design Plan

## Product Intent

Expense Tracker is a private, local-first personal finance companion for quickly recording money in and out, keeping everyday spending organized, and understanding the current month at a glance. The interaction model prioritizes a single-handed 9:16 mobile portrait experience: primary actions are placed in the lower half of the screen, tap targets are comfortably sized, and important balances are visible without navigating away.

## Screen List

| Screen | Primary content and functionality |
| --- | --- |
| **Overview** | A current-month balance card, income and spending totals, a compact weekly activity graphic, category highlights, and a chronological recent-activity list. A prominent lower-right action adds a transaction. |
| **Transactions** | A searchable, filterable ledger grouped by date. Each row identifies the category, note, payment source, date, and signed amount. Users can delete an entry after confirmation. |
| **Add Transaction** | A focused full-screen sheet with an expense/income segmented control, numeric amount field, category picker, optional note, and date selection. The Save button remains accessible above the keyboard area. |
| **Insights** | Month navigation, income/expense/net stat cards, expense category distribution, a daily spending comparison, and a compact spending trend. |
| **Categories** | An editable category collection for expense and income entries. Users can add a category or remove custom categories that are not in use. |
| **Settings** | Currency selection, local-data reset with confirmation, and a concise local-first privacy explanation. |

## Core Data Model

| Entity | Fields | Notes |
| --- | --- | --- |
| **Transaction** | `id`, `type`, `amount`, `categoryId`, `note`, `date`, `createdAt` | `type` is `income` or `expense`; `amount` is stored as a positive minor-unit integer to avoid floating-point totals. |
| **Category** | `id`, `name`, `icon`, `color`, `type`, `isDefault` | A category applies to one transaction type and is ordered for fast one-handed selection. |
| **Preferences** | `currencyCode`, `hasSeededData` | Preferences and the ledger are persisted locally on-device with AsyncStorage. |

## Key User Flows

| Goal | Flow |
| --- | --- |
| Record a purchase | Overview or Transactions → Add Transaction → Expense selected → Enter amount → Select category → Optional note → Save → Return to the previous screen with summary totals refreshed. |
| Record income | Add Transaction → Income selected → Enter amount → Select category → Save → Current-month income and net balance update. |
| Review spending | Insights → Change month with compact previous/next controls → Review expense total, category distribution, and daily comparison. |
| Correct a record | Transactions → Tap a transaction → Choose delete → Confirm → Local ledger, overview, and insights update. |
| Personalize categories | Settings → Categories → Choose Income or Expense → Add or remove a custom category. |

## Visual System

The brand uses an energetic **ledger blue** (`#3563E9`) for primary actions and calm emphasis, a **deep ink** (`#111827`) foreground, an off-white **paper** (`#F7F8FC`) app background, and white elevated surfaces. Positive money states use **income green** (`#1FA971`); spending uses **coral red** (`#E55B5B`); and unselected controls use a muted slate. Cards have a 20-point radius, gentle 1-point borders, and restrained shadows to evoke a modern iOS finance utility without visual clutter. Typography favors large, tabular balance figures, compact all-caps labels where scanning helps, and highly legible 15–17-point body text.

## Accessibility and Interaction Details

Controls use text labels alongside icons where meaning may be ambiguous, maintain high contrast, and use at least a 44-point target size. Primary actions include a subtle pressed scale and haptic acknowledgement; destructive actions require confirmation. Monetary input selects the numeric keyboard and validates that an amount is greater than zero before saving. Empty states directly explain the next action rather than showing sample financial figures.
