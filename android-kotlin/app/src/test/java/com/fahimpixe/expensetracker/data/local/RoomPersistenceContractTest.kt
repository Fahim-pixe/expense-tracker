package com.fahimpixe.expensetracker.data.local

import com.fahimpixe.expensetracker.finance.FinanceTransaction
import com.fahimpixe.expensetracker.finance.TransactionType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class RoomPersistenceContractTest {
    @Test
    fun transactionEntityPreservesMinorUnitsAndLedgerIdentity() {
        val transaction = FinanceTransaction(
            id = "transaction-1",
            type = TransactionType.EXPENSE,
            amountCents = 12_550,
            categoryId = "food",
            note = "Groceries",
            date = "2026-08-14",
            createdAtEpochMs = 1_723_624_000_000,
        )

        val entity = TransactionEntity(
            id = transaction.id,
            type = transaction.type.name,
            amountCents = transaction.amountCents,
            categoryId = transaction.categoryId,
            note = transaction.note,
            date = transaction.date,
            createdAtEpochMs = transaction.createdAtEpochMs,
        )

        assertEquals("transaction-1", entity.id)
        assertEquals("EXPENSE", entity.type)
        assertEquals(12_550, entity.amountCents)
        assertEquals("2026-08-14", entity.date)
    }

    @Test
    fun categoryAndPreferenceEntitiesUseStablePrimaryKeys() {
        val category = CategoryEntity("food", "Food", "restaurant", 0xFFF97316, "EXPENSE", true)
        val preference = LedgerPreferenceEntity(currencyCode = "BDT")

        assertEquals("food", category.id)
        assertTrue(category.isDefault)
        assertEquals(LedgerPreferenceEntity.SINGLETON_ID, preference.id)
        assertEquals("BDT", preference.currencyCode)
    }
}
