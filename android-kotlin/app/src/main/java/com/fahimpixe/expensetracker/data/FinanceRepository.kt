package com.fahimpixe.expensetracker.data

import android.content.Context
import com.fahimpixe.expensetracker.finance.CategoryCatalog
import com.fahimpixe.expensetracker.finance.FinanceCategory
import com.fahimpixe.expensetracker.finance.FinanceState
import com.fahimpixe.expensetracker.finance.FinanceTransaction
import com.fahimpixe.expensetracker.finance.TransactionType
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate
import java.util.UUID

class FinanceRepository(context: Context) {
    private val preferences = context.getSharedPreferences("expense_tracker_ledger", Context.MODE_PRIVATE)

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

    fun addTransaction(transaction: FinanceTransaction): FinanceState = update { state ->
        state.copy(transactions = listOf(transaction) + state.transactions)
    }

    fun deleteTransaction(id: String): FinanceState = update { state ->
        state.copy(transactions = state.transactions.filterNot { it.id == id })
    }

    fun addCategory(name: String, type: TransactionType): FinanceState = update { state ->
        val normalizedName = name.trim()
        if (normalizedName.isBlank()) return@update state
        val customCategory = FinanceCategory(
            id = "category-${UUID.randomUUID()}",
            name = normalizedName,
            icon = "label",
            colorArgb = CategoryCatalog.customColors[state.categories.size % CategoryCatalog.customColors.size],
            type = type,
            isDefault = false,
        )
        state.copy(categories = state.categories + customCategory)
    }

    fun removeCategory(id: String): FinanceState = update { state ->
        val category = state.categories.firstOrNull { it.id == id } ?: return@update state
        val inUse = state.transactions.any { it.categoryId == id }
        if (category.isDefault || inUse) state else state.copy(categories = state.categories.filterNot { it.id == id })
    }

    fun updateCurrency(currencyCode: String): FinanceState = update { it.copy(currencyCode = currencyCode) }

    fun reset(): FinanceState = FinanceState().also(::write)

    private fun update(transform: (FinanceState) -> FinanceState): FinanceState = transform(read()).also(::write)

    private fun write(state: FinanceState) {
        val json = JSONObject().apply {
            put("currencyCode", state.currencyCode)
            put("transactions", JSONArray().apply { state.transactions.forEach { put(it.toJson()) } })
            put("categories", JSONArray().apply { state.categories.forEach { put(it.toJson()) } })
        }
        preferences.edit().putString(STORAGE_KEY, json.toString()).apply()
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
            if (amountCents > 0 && categoryId.isNotBlank()) {
                add(FinanceTransaction(item.optString("id", UUID.randomUUID().toString()), type, amountCents, categoryId, item.optString("note"), date, item.optLong("createdAtEpochMs", System.currentTimeMillis())))
            }
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
            if (id.isNotBlank() && name.isNotBlank()) {
                add(FinanceCategory(id, name, item.optString("icon", "label"), item.optLong("colorArgb", 0xFF3563E9), type, item.optBoolean("isDefault", true)))
            }
        }
        }
    }

    private fun FinanceTransaction.toJson() = JSONObject().apply {
        put("id", id); put("type", type.name); put("amountCents", amountCents); put("categoryId", categoryId)
        put("note", note); put("date", date); put("createdAtEpochMs", createdAtEpochMs)
    }

    private fun FinanceCategory.toJson() = JSONObject().apply {
        put("id", id); put("name", name); put("icon", icon); put("colorArgb", colorArgb)
        put("type", type.name); put("isDefault", isDefault)
    }

    private companion object {
        const val STORAGE_KEY = "ledger-v1"
    }
}
