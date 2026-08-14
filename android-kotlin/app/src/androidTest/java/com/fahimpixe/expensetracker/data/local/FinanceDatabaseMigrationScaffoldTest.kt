package com.fahimpixe.expensetracker.data.local

import androidx.room.testing.MigrationTestHelper
import androidx.sqlite.db.SupportSQLiteDatabase
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FinanceDatabaseMigrationScaffoldTest {
    @get:Rule
    val helper = MigrationTestHelper(
        InstrumentationRegistry.getInstrumentation(),
        FinanceDatabase::class.java,
    )

    @Test
    fun version_one_schema_is_recreated_and_validated_for_future_migrations() {
        helper.createDatabase(TEST_DATABASE, 1).use { database ->
            database.execSQL(
                """
                INSERT INTO categories (id, name, icon, colorArgb, type, isDefault)
                VALUES ('food', 'Food', 'restaurant', 4281689914, 'EXPENSE', 1)
                """.trimIndent(),
            )
            database.execSQL(
                """
                INSERT INTO transactions (id, type, amountCents, categoryId, note, date, createdAtEpochMs)
                VALUES ('migration-seed', 'EXPENSE', 1250, 'food', 'Seeded migration record', '2026-08-14', 1723593600000)
                """.trimIndent(),
            )
            database.execSQL("INSERT INTO ledger_preferences (id, currencyCode) VALUES (1, 'BDT')")
        }

        helper.runMigrationsAndValidate(
            TEST_DATABASE,
            1,
            true,
            *FinanceDatabaseMigrations.all,
        ).use { database ->
            assertEquals(1L, database.longValue("SELECT COUNT(*) FROM transactions"))
            assertEquals(1_250L, database.longValue("SELECT amountCents FROM transactions WHERE id = 'migration-seed'"))
            assertEquals(1L, database.longValue("SELECT COUNT(*) FROM categories WHERE id = 'food'"))
            assertEquals("BDT", database.stringValue("SELECT currencyCode FROM ledger_preferences WHERE id = 1"))
        }
    }

    private fun SupportSQLiteDatabase.longValue(query: String): Long = query(query).use { cursor ->
        assertTrue("Expected a row for query: $query", cursor.moveToFirst())
        cursor.getLong(0)
    }

    private fun SupportSQLiteDatabase.stringValue(query: String): String = query(query).use { cursor ->
        assertTrue("Expected a row for query: $query", cursor.moveToFirst())
        cursor.getString(0)
    }

    private companion object {
        const val TEST_DATABASE = "finance-migration-scaffold"
    }
}
