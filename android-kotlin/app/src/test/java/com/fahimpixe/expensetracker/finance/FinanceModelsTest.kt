package com.fahimpixe.expensetracker.finance

import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.YearMonth

class FinanceModelsTest {
    private val entries = listOf(
        FinanceTransaction("income", TransactionType.INCOME, 250_000, "salary", "Salary", "2026-08-01"),
        FinanceTransaction("food", TransactionType.EXPENSE, 2_450, "food", "Lunch", "2026-08-03"),
        FinanceTransaction("transport", TransactionType.EXPENSE, 9_800, "transport", "Pass", "2026-08-04"),
        FinanceTransaction("old", TransactionType.EXPENSE, 4_100, "food", "Groceries", "2026-07-29"),
    )

    @Test
    fun monthlySummaryUsesOnlyEntriesFromTheRequestedMonth() {
        val augustEntries = FinanceCalculator.forMonth(entries, YearMonth.of(2026, 8))
        assertEquals(MonthlySummary(incomeCents = 250_000, expenseCents = 12_250), FinanceCalculator.summary(augustEntries))
    }

    @Test
    fun categoryTotalsAreSortedByMonthlyExpenseAmount() {
        val augustEntries = FinanceCalculator.forMonth(entries, YearMonth.of(2026, 8))
        val totals = FinanceCalculator.categoryTotals(augustEntries, CategoryCatalog.defaults)
        assertEquals(listOf("transport", "food"), totals.map { it.category.id })
        assertEquals(listOf(9_800L, 2_450L), totals.map { it.amountCents })
    }

    @Test
    fun amountInputIsStoredAsWholeCents() {
        assertEquals(1_875L, FinanceCalculator.amountInputToCents("$18.75"))
    }
}
