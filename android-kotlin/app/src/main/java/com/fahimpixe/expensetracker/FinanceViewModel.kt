package com.fahimpixe.expensetracker

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.fahimpixe.expensetracker.data.FinanceRepository
import com.fahimpixe.expensetracker.finance.CategoryCatalog
import com.fahimpixe.expensetracker.finance.FinanceCalculator
import com.fahimpixe.expensetracker.finance.FinanceState
import com.fahimpixe.expensetracker.finance.FinanceTransaction
import com.fahimpixe.expensetracker.finance.TransactionType
import java.time.LocalDate
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class FinanceViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = FinanceRepository(application)

    var state by mutableStateOf(FinanceState(categories = CategoryCatalog.defaults))
        private set

    var isInitialized by mutableStateOf(false)
        private set

    private var pendingMutations by mutableIntStateOf(0)
    val isMutationIdle: Boolean
        get() = isInitialized && pendingMutations == 0

    init {
        viewModelScope.launch {
            repository.initialize()
            state = repository.snapshot()
            isInitialized = true
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

        launchMutation(onCompleted = onPersisted) {
            repository.addTransaction(
                FinanceTransaction(
                    type = type,
                    amountCents = amountCents,
                    categoryId = categoryId,
                    note = note.trim(),
                    date = date.toString(),
                ),
            )
        }
        return true
    }

    fun deleteTransaction(id: String) = launchMutation { repository.deleteTransaction(id) }

    fun addCategory(name: String, type: TransactionType) = launchMutation {
        repository.addCategory(name, type)
    }

    fun removeCategory(id: String): Boolean {
        val removable = state.categories.firstOrNull { it.id == id }?.let { category ->
            !category.isDefault && state.transactions.none { it.categoryId == id }
        } == true
        if (removable) launchMutation { repository.removeCategory(id) }
        return removable
    }

    fun setCurrency(code: String) = launchMutation { repository.updateCurrency(code) }

    fun resetData() = launchMutation { repository.reset() }

    private fun launchMutation(onCompleted: () -> Unit = {}, mutation: suspend () -> Unit) {
        pendingMutations += 1
        viewModelScope.launch {
            try {
                mutation()
                state = repository.snapshot()
                onCompleted()
            } finally {
                pendingMutations -= 1
            }
        }
    }
}
