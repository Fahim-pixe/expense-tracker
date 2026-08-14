package com.fahimpixe.expensetracker.data.local

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FinanceDaoTest {
    private lateinit var database: FinanceDatabase
    private lateinit var dao: FinanceDao

    @Before
    fun setUp() {
        database = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            FinanceDatabase::class.java,
        ).allowMainThreadQueries().build()
        dao = database.financeDao()
    }

    @After
    fun tearDown() {
        database.close()
    }

    @Test
    fun transactions_are_ordered_by_date_then_creation_time_and_deleted_by_id() = runBlocking {
        dao.insertTransactions(
            listOf(
                transaction(id = "older", date = "2026-08-01", createdAtEpochMs = 10),
                transaction(id = "same-day-newer", date = "2026-08-02", createdAtEpochMs = 30),
                transaction(id = "newest", date = "2026-08-03", createdAtEpochMs = 20),
            ),
        )

        assertEquals(
            listOf("newest", "same-day-newer", "older"),
            dao.transactions().map(TransactionEntity::id),
        )

        dao.deleteTransaction("same-day-newer")

        assertEquals(2, dao.transactionCount())
        assertEquals(listOf("newest", "older"), dao.transactions().map(TransactionEntity::id))
    }

    @Test
    fun category_name_type_identity_and_singleton_currency_upsert_are_enforced() = runBlocking {
        dao.insertCategories(
            listOf(
                category(id = "food-default", name = "Food", type = "EXPENSE", isDefault = true),
                category(id = "food-custom", name = "Food", type = "EXPENSE", isDefault = false),
                category(id = "food-income", name = "Food", type = "INCOME", isDefault = false),
            ),
        )

        val categories = dao.categories()
        assertEquals(2, categories.size)
        assertEquals("food-custom", categories.single { it.type == "EXPENSE" }.id)
        assertEquals("food-income", categories.single { it.type == "INCOME" }.id)

        dao.upsertPreference(LedgerPreferenceEntity(currencyCode = "USD"))
        dao.upsertPreference(LedgerPreferenceEntity(currencyCode = "BDT"))

        assertEquals("BDT", dao.observeCurrencyCode().first())
        assertTrue(categories.all { it.name == "Food" })
    }

    private fun transaction(id: String, date: String, createdAtEpochMs: Long) = TransactionEntity(
        id = id,
        type = "EXPENSE",
        amountCents = 1_250L,
        categoryId = "food",
        note = "Room DAO audit",
        date = date,
        createdAtEpochMs = createdAtEpochMs,
    )

    private fun category(id: String, name: String, type: String, isDefault: Boolean) = CategoryEntity(
        id = id,
        name = name,
        icon = "label",
        colorArgb = 0xFF3563E9,
        type = type,
        isDefault = isDefault,
    )
}
