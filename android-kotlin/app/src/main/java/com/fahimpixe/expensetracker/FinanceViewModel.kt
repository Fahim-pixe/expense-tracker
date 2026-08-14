package com.fahimpixe.expensetracker

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import com.fahimpixe.expensetracker.data.FinanceRepository
import com.fahimpixe.expensetracker.finance.FinanceCalculator
import com.fahimpixe.expensetracker.finance.FinanceState
import com.fahimpixe.expensetracker.finance.FinanceTransaction
import com.fahimpixe.expensetracker.finance.TransactionType
import java.time.LocalDate

class FinanceViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = FinanceRepository(application)

    var state by mutableStateOf(repository.read())
        private set

    fun addTransaction(
        type: TransactionType,
        amountInput: String,
        categoryId: String,
        note: String,
        dateInput: String,
    ): Boolean {
        val amountCents = FinanceCalculator.amountInputToCents(amountInput)
        val date = runCatching { LocalDate.parse(dateInput) }.getOrNull()
        val categoryMatchesType = state.categories.any { it.id == categoryId && it.type == type }
        if (amountCents <= 0 || date == null || !categoryMatchesType) return false

        state = repository.addTransaction(
            FinanceTransaction(
                type = type,
                amountCents = amountCents,
                categoryId = categoryId,
                note = note.trim(),
                date = date.toString(),
            ),
        )
        return true
    }

    fun deleteTransaction(id: String) {
        state = repository.deleteTransaction(id)
    }

    fun addCategory(name: String, type: TransactionType) {
        state = repository.addCategory(name, type)
    }

    fun removeCategory(id: String): Boolean {
        val before = state.categories.size
        state = repository.removeCategory(id)
        return state.categories.size < before
    }

    fun setCurrency(code: String) {
        state = repository.updateCurrency(code)
    }

    fun resetData() {
        state = repository.reset()
    }
}
