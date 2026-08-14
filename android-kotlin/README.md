# Expense Tracker — Kotlin Android

This directory contains a **native Android implementation** of Expense Tracker, written in Kotlin and Jetpack Compose. The existing Expo implementation remains in the repository for reference; Android Studio should open the `android-kotlin` folder as a standalone Gradle project.

| Layer | Native Android implementation |
| --- | --- |
| Presentation | Jetpack Compose with a Material 3, phone-first interface. |
| State | A lifecycle-aware `FinanceViewModel` that refreshes its immutable `FinanceState` after every ledger mutation. |
| Persistence | Local Android `SharedPreferences`, storing only transaction, category, and currency data on the device. |
| Money logic | Amounts remain integer cents, preventing floating-point calculation drift. |
| Minimum Android version | API 26 (Android 8.0), required for the Java time APIs used by monthly summaries. |

The main flows are the same as the existing product: add income or expenses, choose a category, review the activity ledger, inspect monthly category totals and balance, manage custom categories, change currency, and reset local data.

## Run in Android Studio

Open `android-kotlin` in a recent Android Studio release, allow Gradle to sync, select an emulator or Android device running API 26 or later, and choose **Run**. The package name is `com.fahimpixe.expensetracker`.

> The sandbox includes Java 21 but does not include Gradle, the Kotlin compiler, or the Android SDK. The project structure and Gradle configuration are therefore included for Android Studio or a CI environment to compile and run.
