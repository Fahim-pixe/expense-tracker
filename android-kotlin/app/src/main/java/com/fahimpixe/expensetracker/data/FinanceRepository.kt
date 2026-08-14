package com.fahimpixe.expensetracker.data

import android.content.Context
import androidx.room.withTransaction
import com.fahimpixe.expensetracker.data.local.CategoryEntity
import com.fahimpixe.expensetracker.data.local.FinanceDatabase
import com.fahimpixe.expensetracker.data.local.LedgerPreferenceEntity
import com.fahimpixe.expensetracker.data.local.TransactionEntity
import com.fahimpixe.expensetracker.finance.CategoryCatalog
import com.fahimpixe.expensetracker.finance.FinanceCategory
import com.fahimpixe.expensetracker.finance.FinanceState
import com.fahimpixe.expensetracker.finance.FinanceTransaction
import com.fahimpixe.expensetracker.finance.TransactionType
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate
import java.util.UUID

class FinanceRepository(context: Context) {
    private val database = FinanceDatabase.create(context)
    private val dao = database.financeDao()
    private val legacyStorage = LegacyFinanceStorage(context)

    val state: Flow<FinanceState> = combine(
        dao.observeTransactions(),
        dao.observeCategories(),
        dao.observeCurrencyCode(),
    ) { transactions, categories, currencyCode ->
        FinanceState(
            transactions = transactions.mapNotNull { it.toDomain() },
            categories = categories.mapNotNull { it.toDomain() }.ifEmpty { CategoryCatalog.defaults },
            currencyCode = currencyCode ?: DEFAULT_CURRENCY,
        )
    }

    suspend fun initialize() {
        val migratedLegacyData = database.withTransaction {
            if (dao.categoryCount() > 0 || legacyStorage.isMigrated()) {
                ensureDefaultsIfNeeded()
                false
            } else {
                val legacy = legacyStorage.read()
                val categories = legacy.categories.ifEmpty { CategoryCatalog.defaults }
                dao.insertCategories(categories.map { it.toEntity() })
                dao.insertTransactions(legacy.transactions.map { it.toEntity() })
                dao.upsertPreference(LedgerPreferenceEntity(currencyCode = legacy.currencyCode.ifBlank { DEFAULT_CURRENCY }))
                true
            }
        }
        if (migratedLegacyData) legacyStorage.markMigrated()
    }

    suspend fun addTransaction(transaction: FinanceTransaction) {
        dao.insertTransaction(transaction.toEntity())
    }

    suspend fun deleteTransaction(id: String) {
        dao.deleteTransaction(id)
    }

    suspend fun addCategory(name: String, type: TransactionType) {
        val normalizedName = name.trim().replace(Regex("\\s+"), " ")
        if (normalizedName.isBlank()) return
        database.withTransaction {
            val duplicate = dao.categories().any { it.name.equals(normalizedName, ignoreCase = true) && it.type == type.name }
            if (!duplicate) {
                val categoryCount = dao.categories().size
                dao.insertCategories(listOf(
                    FinanceCategory(
                        id = "category-${UUID.randomUUID()}",
                        name = normalizedName,
                        icon = "label",
                        colorArgb = CategoryCatalog.customColors[categoryCount % CategoryCatalog.customColors.size],
                        type = type,
                        isDefault = false,
                    ).toEntity(),
                ))
            }
        }
    }

    suspend fun removeCategory(id: String) {
        database.withTransaction {
            val category = dao.categories().firstOrNull { it.id == id } ?: return@withTransaction
            if (!category.isDefault && dao.transactionCountForCategory(id) == 0) dao.deleteCategory(id)
        }
    }

    suspend fun updateCurrency(currencyCode: String) {
        dao.upsertPreference(LedgerPreferenceEntity(currencyCode = currencyCode))
    }

    suspend fun reset() {
        legacyStorage.clear()
        database.withTransaction {
            dao.clearTransactions()
            dao.clearCategories()
            dao.clearPreferences()
            dao.insertCategories(CategoryCatalog.defaults.map { it.toEntity() })
            dao.upsertPreference(LedgerPreferenceEntity(currencyCode = DEFAULT_CURRENCY))
        }
    }

    private suspend fun ensureDefaultsIfNeeded() {
        if (dao.categoryCount() == 0) dao.insertCategories(CategoryCatalog.defaults.map { it.toEntity() })
        if (dao.observeCurrencyCode().firstValue() == null) dao.upsertPreference(LedgerPreferenceEntity(currencyCode = DEFAULT_CURRENCY))
    }

    private fun FinanceTransaction.toEntity() = TransactionEntity(id, type.name, amountCents, categoryId, note, date, createdAtEpochMs)
    private fun FinanceCategory.toEntity() = CategoryEntity(id, name, icon, colorArgb, type.name, isDefault)
    private fun TransactionEntity.toDomain(): FinanceTransaction? = runCatching {
        FinanceTransaction(id, TransactionType.valueOf(type), amountCents, categoryId, note, date, createdAtEpochMs)
    }.getOrNull()?.takeIf { it.amountCents > 0 && it.categoryId.isNotBlank() }
    private fun CategoryEntity.toDomain(): FinanceCategory? = runCatching {
        FinanceCategory(id, name, icon, colorArgb, TransactionType.valueOf(type), isDefault)
    }.getOrNull()?.takeIf { it.id.isNotBlank() && it.name.isNotBlank() }

    private companion object {
        const val DEFAULT_CURRENCY = "USD"
    }
}

private suspend fun Flow<String?>.firstValue(): String? = first()

private class LegacyFinanceStorage(context: Context) {
    private val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    fun isMigrated(): Boolean = preferences.getBoolean(MIGRATION_COMPLETE_KEY, false)

    fun markMigrated() {
        preferences.edit().putBoolean(MIGRATION_COMPLETE_KEY, true).apply()
    }

    fun clear() {
        preferences.edit().remove(STORAGE_KEY).putBoolean(MIGRATION_COMPLETE_KEY, true).apply()
    }

    fun read(): FinanceState {
        val raw = preferences.getString(STORAGE_KEY, null) ?: return FinanceState()
        return runCatching {
            val root = JSONObject(raw)
            FinanceState(
                transactions = root.optJSONArray("transactions").toTransactions(),
                categories = root.optJSONArray("categories").toCategories().ifEmpty { CategoryCatalog.defaults },
                currencyCode = root.optString("currencyCode", "USD"),
            )
        }.getOrDefault(FinanceState())
    }

    private fun JSONArray?.toTransactions(): List<FinanceTransaction> {
        val source = this ?: return emptyList()
        return buildList {
            for (index in 0 until source.length()) {
                val item = source.optJSONObject(index) ?: continue
                val type = runCatching { TransactionType.valueOf(item.optString("type")) }.getOrNull() ?: continue
                val amountCents = item.optLong("amountCents", 0)
                val categoryId = item.optString("categoryId")
                val date = item.optString("date", LocalDate.now().toString())
                if (amountCents > 0 && categoryId.isNotBlank()) add(FinanceTransaction(item.optString("id", UUID.randomUUID().toString()), type, amountCents, categoryId, item.optString("note"), date, item.optLong("createdAtEpochMs", System.currentTimeMillis())))
            }
        }
    }

    private fun JSONArray?.toCategories(): List<FinanceCategory> {
        val source = this ?: return emptyList()
        return buildList {
            for (index in 0 until source.length()) {
                val item = source.optJSONObject(index) ?: continue
                val type = runCatching { TransactionType.valueOf(item.optString("type")) }.getOrNull() ?: continue
                val id = item.optString("id")
                val name = item.optString("name")
                if (id.isNotBlank() && name.isNotBlank()) add(FinanceCategory(id, name, item.optString("icon", "label"), item.optLong("colorArgb", 0xFF3563E9), type, item.optBoolean("isDefault", true)))
            }
        }
    }

    private companion object {
        const val PREFERENCES_NAME = "expense_tracker_ledger"
        const val STORAGE_KEY = "ledger-v1"
        const val MIGRATION_COMPLETE_KEY = "room_migration_v1_complete"
    }
}
