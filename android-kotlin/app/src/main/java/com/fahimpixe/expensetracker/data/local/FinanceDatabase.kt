package com.fahimpixe.expensetracker.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration

@Database(
    entities = [TransactionEntity::class, CategoryEntity::class, LedgerPreferenceEntity::class],
    version = 1,
    exportSchema = true,
)
abstract class FinanceDatabase : RoomDatabase() {
    abstract fun financeDao(): FinanceDao

    companion object {
        fun create(context: Context): FinanceDatabase = Room.databaseBuilder(
            context.applicationContext,
            FinanceDatabase::class.java,
            "expense-tracker.db",
        ).addMigrations(*FinanceDatabaseMigrations.all).build()
    }
}

/**
 * The authoritative registry for explicit schema upgrades. Keep this empty at version one;
 * every later database version must add its migration here and extend the instrumentation suite.
 */
object FinanceDatabaseMigrations {
    val all: Array<Migration> = emptyArray()
}
