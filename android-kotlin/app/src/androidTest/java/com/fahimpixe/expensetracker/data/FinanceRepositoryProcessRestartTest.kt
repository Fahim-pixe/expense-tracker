package com.fahimpixe.expensetracker.data

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fahimpixe.expensetracker.data.local.FinanceDatabase
import com.fahimpixe.expensetracker.finance.FinanceTransaction
import com.fahimpixe.expensetracker.finance.TransactionType
import java.util.UUID
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FinanceRepositoryProcessRestartTest {
    private lateinit var context: Context
    private lateinit var databaseName: String

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        databaseName = "finance-process-restart-${UUID.randomUUID()}.db"
    }

    @After
    fun tearDown() {
        context.deleteDatabase(databaseName)
    }

    @Test
    fun room_ledger_is_recovered_by_a_fresh_repository_after_process_restart() = runBlocking {
        val transaction = FinanceTransaction(
            id = "restart-transaction",
            type = TransactionType.EXPENSE,
            amountCents = 4_275L,
            categoryId = "food",
            note = "Durable restart record",
            date = "2026-08-15",
            createdAtEpochMs = 1_786_800_000_000L,
        )
        val initialDatabase = openDatabase()
        FinanceRepository(context, initialDatabase).apply {
            initialize()
            addTransaction(transaction)
        }
        initialDatabase.close()

        val restartedDatabase = openDatabase()
        val restartedState = FinanceRepository(context, restartedDatabase).run {
            initialize()
            state.first()
        }

        assertEquals(listOf(transaction), restartedState.transactions)
        assertTrue(restartedState.categories.any { it.id == transaction.categoryId })
        restartedDatabase.close()
    }

    private fun openDatabase(): FinanceDatabase = Room.databaseBuilder(
        context,
        FinanceDatabase::class.java,
        databaseName,
    ).build()
}

