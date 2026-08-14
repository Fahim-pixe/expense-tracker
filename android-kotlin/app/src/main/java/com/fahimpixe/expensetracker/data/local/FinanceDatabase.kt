package com.fahimpixe.expensetracker.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

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
        ).build()
    }
}

