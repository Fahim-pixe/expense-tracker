package com.fahimpixe.expensetracker

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.fahimpixe.expensetracker.data.FinanceRepository
import com.fahimpixe.expensetracker.finance.FinanceCalculator
import com.fahimpixe.expensetracker.finance.CategoryCatalog
import com.fahimpixe.expensetracker.finance.FinanceState
import com.fahimpixe.expensetracker.finance.FinanceTransaction
import com.fahimpixe.expensetracker.finance.TransactionType
import java.time.LocalDate
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class FinanceViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = FinanceRepository(application)

    var state by mutableStateOf(FinanceState(categories = CategoryCatalog.defaults))
        private set

    init {
        viewModelScope.launch {
            repository.initialize()
            repository.state.collectLatest { state = it }
        }
    }

    fun addTransaction(
        type: TransactionType,
        amountInput: String,
        categoryId: String,
        note: String,
        dateInput: String,
        onPersisted: () -> Unit,
    ): Boolean {
        val amountCents = FinanceCalculator.amountInputToCents(amountInput)
        val date = runCatching { LocalDate.parse(dateInput) }.getOrNull()
        val categoryMatchesType = state.categories.any { it.id == categoryId && it.type == type }
        if (amountCents <= 0 || date == null || !categoryMatchesType) return false

        viewModelScope.launch {
            repository.addTransaction(
                FinanceTransaction(
                    type = type,
                    amountCents = amountCents,
                    categoryId = categoryId,
                    note = note.trim(),
                    date = date.toString(),
                ),
            )
            refreshStateFromRepository()
            onPersisted()
        }
        return true
    }

    fun deleteTransaction(id: String) {
        viewModelScope.launch {
            repository.deleteTransaction(id)
            refreshStateFromRepository()
        }
    }

    fun addCategory(name: String, type: TransactionType) {
        viewModelScope.launch {
            repository.addCategory(name, type)
            refreshStateFromRepository()
        }
    }

    fun removeCategory(id: String): Boolean {
        val removable = state.categories.firstOrNull { it.id == id }?.let { category -> !category.isDefault && state.transactions.none { it.categoryId == id } } == true
        if (removable) viewModelScope.launch {
            repository.removeCategory(id)
            refreshStateFromRepository()
        }
        return removable
    }

    fun setCurrency(code: String) {
        viewModelScope.launch {
            repository.updateCurrency(code)
            refreshStateFromRepository()
        }
    }

    fun resetData() {
        viewModelScope.launch {
            repository.reset()
            refreshStateFromRepository()
        }
    }

    private suspend fun refreshStateFromRepository() {
        state = repository.state.first()
    }
}
