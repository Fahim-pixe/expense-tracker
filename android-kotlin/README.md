# Expense Tracker — Kotlin Android

This directory contains a **native Android implementation** of Expense Tracker, written in Kotlin and Jetpack Compose. The existing Expo implementation remains in the repository for reference; Android Studio should open the `android-kotlin` folder as a standalone Gradle project.

| Layer | Native Android implementation |
| --- | --- |
| Presentation | Jetpack Compose with a Material 3, phone-first interface. |
| State | A lifecycle-aware `FinanceViewModel` that refreshes its immutable `FinanceState` after every ledger mutation. |
| Persistence | Room local database for transactions, categories, and currency preference; `SharedPreferences` is retained only for one-time legacy import. |
| Money logic | Amounts remain integer cents, preventing floating-point calculation drift. |
| Minimum Android version | API 26 (Android 8.0), required for the Java time APIs used by monthly summaries. |

The main flows are the same as the existing product: add income or expenses, choose a category, review the activity ledger, inspect monthly category totals and balance, manage custom categories, change currency, and reset local data.

## Run in Android Studio

Open `android-kotlin` in a recent Android Studio release, allow Gradle to sync, select an emulator or Android device running API 26 or later, and choose **Run**. The package name is `com.fahimpixe.expensetracker`.

## Engineering records

- [`docs/PROJECT_STATE.md`](./docs/PROJECT_STATE.md) records the current native architecture, Room audit decisions, and current validation status.
- [`docs/ROOM_MIGRATION.md`](./docs/ROOM_MIGRATION.md) documents the non-destructive legacy-ledger import and reset behavior.
- [`docs/TESTING.md`](./docs/TESTING.md) separates required P0 validation from later instrumentation, UI, and performance suites.
- [`docs/PRODUCTION_MODERNIZATION_SPEC.md`](./docs/PRODUCTION_MODERNIZATION_SPEC.md) is the governing native modernization specification; [`docs/SPEC_ADOPTION_RECORD.md`](./docs/SPEC_ADOPTION_RECORD.md) records its repository-specific amendments and current release gates.
- [`docs/RELEASE_SECURITY.md`](./docs/RELEASE_SECURITY.md) documents R8, backup, manifest, logging, and signed-release controls.

> The Gradle wrapper and reproducible native CI configuration are committed. The current remote API 29 instrumentation run has a known Compose-test timeout, so native CI is not yet a green release gate; see `PROJECT_STATE.md` for the required correction.
