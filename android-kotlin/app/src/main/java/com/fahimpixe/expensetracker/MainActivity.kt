package com.fahimpixe.expensetracker

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.viewModels
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.fahimpixe.expensetracker.ui.ExpenseTrackerApp
import com.fahimpixe.expensetracker.ui.theme.ExpenseTrackerTheme

class MainActivity : ComponentActivity() {
    val financeViewModel: FinanceViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ExpenseTrackerTheme {
                ExpenseTrackerApp(financeViewModel)
            }
        }
    }
}
