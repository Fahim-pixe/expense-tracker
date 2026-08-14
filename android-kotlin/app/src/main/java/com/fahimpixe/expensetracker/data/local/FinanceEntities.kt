package com.fahimpixe.expensetracker.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "transactions",
    indices = [Index("categoryId"), Index("date"), Index("createdAtEpochMs")],
)
data class TransactionEntity(
    @PrimaryKey val id: String,
    val type: String,
    val amountCents: Long,
    val categoryId: String,
    val note: String,
    val date: String,
    val createdAtEpochMs: Long,
)

@Entity(tableName = "categories", indices = [Index(value = ["name", "type"], unique = true)])
data class CategoryEntity(
    @PrimaryKey val id: String,
    val name: String,
    val icon: String,
    val colorArgb: Long,
    val type: String,
    val isDefault: Boolean,
)

@Entity(tableName = "ledger_preferences")
data class LedgerPreferenceEntity(
    @PrimaryKey val id: Int = SINGLETON_ID,
    val currencyCode: String,
) {
    companion object {
        const val SINGLETON_ID = 1
    }
}
