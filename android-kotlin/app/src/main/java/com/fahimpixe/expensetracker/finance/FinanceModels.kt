package com.fahimpixe.expensetracker.finance

import java.math.BigDecimal
import java.math.RoundingMode
import java.text.NumberFormat
import java.time.LocalDate
import java.time.YearMonth
import java.util.Currency
import java.util.Locale
import java.util.UUID
import com.fahimpixe.expensetracker.config.NativeAppConfig

enum class TransactionType { EXPENSE, INCOME }

data class FinanceCategory(
    val id: String,
    val name: String,
    val icon: String,
    val colorArgb: Long,
    val type: TransactionType,
    val isDefault: Boolean = true,
)

data class FinanceTransaction(
    val id: String = UUID.randomUUID().toString(),
    val type: TransactionType,
    val amountCents: Long,
    val categoryId: String,
    val note: String = "",
    val date: String = LocalDate.now().toString(),
    val createdAtEpochMs: Long = System.currentTimeMillis(),
)

data class FinanceState(
    val transactions: List<FinanceTransaction> = emptyList(),
    val categories: List<FinanceCategory> = CategoryCatalog.defaults,
    val currencyCode: String = NativeAppConfig.DEFAULT_CURRENCY,
)

data class MonthlySummary(
    val incomeCents: Long = 0,
    val expenseCents: Long = 0,
) {
    val balanceCents: Long get() = incomeCents - expenseCents
}

data class CategoryTotal(
    val category: FinanceCategory,
    val amountCents: Long,
)

object CategoryCatalog {
    val defaults = listOf(
        FinanceCategory("food", "Food & dining", "restaurant", 0xFFF97316, TransactionType.EXPENSE),
        FinanceCategory("transport", "Transport", "directions_car", 0xFF3B82F6, TransactionType.EXPENSE),
        FinanceCategory("shopping", "Shopping", "shopping_bag", 0xFFA855F7, TransactionType.EXPENSE),
        FinanceCategory("bills", "Bills & utilities", "receipt_long", 0xFFEAB308, TransactionType.EXPENSE),
        FinanceCategory("health", "Health", "favorite", 0xFFEC4899, TransactionType.EXPENSE),
        FinanceCategory("home", "Home", "home", 0xFF14B8A6, TransactionType.EXPENSE),
        FinanceCategory("other-expense", "Other", "more_horiz", 0xFF64748B, TransactionType.EXPENSE),
        FinanceCategory("salary", "Salary", "account_balance_wallet", 0xFF1FA971, TransactionType.INCOME),
        FinanceCategory("freelance", "Freelance", "work", 0xFF0EA5E9, TransactionType.INCOME),
        FinanceCategory("gift", "Gift", "card_giftcard", 0xFF8B5CF6, TransactionType.INCOME),
        FinanceCategory("other-income", "Other", "add_circle", 0xFF64748B, TransactionType.INCOME),
    )

    val customColors = listOf(NativeAppConfig.Brand.LEDGER_BLUE_ARGB, 0xFF1FA971, 0xFFF97316, 0xFFA855F7, 0xFFE55B5B, 0xFF14B8A6)
}

object FinanceCalculator {
    fun forMonth(transactions: List<FinanceTransaction>, month: YearMonth): List<FinanceTransaction> =
        transactions.filter { runCatching { YearMonth.from(LocalDate.parse(it.date)) == month }.getOrDefault(false) }

    fun summary(transactions: List<FinanceTransaction>): MonthlySummary =
        MonthlySummary(
            incomeCents = transactions.filter { it.type == TransactionType.INCOME }.sumOf { it.amountCents },
            expenseCents = transactions.filter { it.type == TransactionType.EXPENSE }.sumOf { it.amountCents },
        )

    fun categoryTotals(transactions: List<FinanceTransaction>, categories: List<FinanceCategory>): List<CategoryTotal> {
        val categoryById = categories.associateBy { it.id }
        return transactions
            .filter { it.type == TransactionType.EXPENSE }
            .groupBy { it.categoryId }
            .mapNotNull { (categoryId, entries) ->
                categoryById[categoryId]?.let { category -> CategoryTotal(category, entries.sumOf { it.amountCents }) }
            }
            .sortedByDescending { it.amountCents }
    }

    fun amountInputToCents(input: String): Long = runCatching {
        input.trim()
            .replace(Regex("[^0-9.]"), "")
            .toBigDecimal()
            .movePointRight(2)
            .setScale(0, RoundingMode.HALF_UP)
            .longValueExact()
    }.getOrDefault(0)

    fun formatCurrency(amountCents: Long, currencyCode: String, signed: Boolean = false): String {
        val formatter = NumberFormat.getCurrencyInstance(Locale.getDefault()).apply {
            currency = Currency.getInstance(currencyCode)
        }
        val amount = BigDecimal(amountCents).movePointLeft(2)
        val prefix = if (signed && amountCents > 0) "+" else if (signed && amountCents < 0) "−" else ""
        return prefix + formatter.format(amount.abs())
    }

    fun dateLabel(value: String): String {
        val date = runCatching { LocalDate.parse(value) }.getOrNull() ?: return value
        return when (date) {
            LocalDate.now() -> "Today"
            LocalDate.now().minusDays(1) -> "Yesterday"
            else -> date.month.name.lowercase().replaceFirstChar { it.uppercase() } + " ${date.dayOfMonth}, ${date.year}"
        }
    }
}
