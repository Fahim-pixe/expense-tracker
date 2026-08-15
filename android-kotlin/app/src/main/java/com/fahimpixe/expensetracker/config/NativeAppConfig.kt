package com.fahimpixe.expensetracker.config

/** Stable native identifiers and defaults. Treat storage values as migration contracts. */
object NativeAppConfig {
    const val DATABASE_NAME = "expense-tracker.db"
    const val LEGACY_PREFERENCES_NAME = "expense_tracker_ledger"
    const val LEGACY_STORAGE_KEY = "ledger-v1"
    const val LEGACY_MIGRATION_COMPLETE_KEY = "room_migration_v1_complete"
    const val DEFAULT_CURRENCY = "USD"

    val supportedCurrencies = listOf(DEFAULT_CURRENCY, "EUR", "GBP")

    object Brand {
        const val LEDGER_BLUE_ARGB = 0xFF3563E9L
    }
}
