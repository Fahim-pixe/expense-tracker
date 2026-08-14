package com.fahimpixe.expensetracker.data

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fahimpixe.expensetracker.data.local.FinanceDatabase
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class LegacyImportTest {
    private val context: Context = ApplicationProvider.getApplicationContext()
    private val preferences by lazy {
        context.getSharedPreferences("expense_tracker_ledger", Context.MODE_PRIVATE)
    }
    private lateinit var database: FinanceDatabase

    @Before
    fun setUp() {
        preferences.edit().clear().commit()
        database = Room.inMemoryDatabaseBuilder(context, FinanceDatabase::class.java)
            .allowMainThreadQueries()
            .build()
    }

    @After
    fun tearDown() {
        database.close()
        preferences.edit().clear().commit()
    }

    @Test
    fun legacy_ledger_is_imported_once_and_reset_prevents_reimport() = runBlocking {
        preferences.edit().putString("ledger-v1", validLegacyLedger).commit()

        val repository = FinanceRepository(context, database)
        repository.initialize()
        val firstState = repository.state.first()

        assertEquals("BDT", firstState.currencyCode)
        assertEquals(listOf("legacy-expense"), firstState.transactions.map { it.id })
        assertEquals(listOf("food"), firstState.categories.map { it.id })
        assertEquals(validLegacyLedger, preferences.getString("ledger-v1", null))

        FinanceRepository(context, database).initialize()
        val afterSecondInitialization = repository.state.first()

        assertEquals(1, afterSecondInitialization.transactions.size)
        assertEquals("legacy-expense", afterSecondInitialization.transactions.single().id)

        repository.reset()
        val resetState = repository.state.first()

        assertTrue(resetState.transactions.isEmpty())
        assertEquals("USD", resetState.currencyCode)
        assertNull(preferences.getString("ledger-v1", null))

        FinanceRepository(context, database).initialize()
        assertTrue(repository.state.first().transactions.isEmpty())
    }

    private companion object {
        val validLegacyLedger = """
            {
              "transactions": [
                {
                  "id": "legacy-expense",
                  "type": "EXPENSE",
                  "amountCents": 1250,
                  "categoryId": "food",
                  "note": "Legacy lunch",
                  "date": "2026-08-01",
                  "createdAtEpochMs": 1722470400000
                },
                {
                  "id": "malformed-zero-amount",
                  "type": "EXPENSE",
                  "amountCents": 0,
                  "categoryId": "food"
                }
              ],
              "categories": [
                {
                  "id": "food",
                  "name": "Food",
                  "icon": "restaurant",
                  "colorArgb": 4281689914,
                  "type": "EXPENSE",
                  "isDefault": true
                }
              ],
              "currencyCode": "BDT"
            }
        """.trimIndent()
    }
}
