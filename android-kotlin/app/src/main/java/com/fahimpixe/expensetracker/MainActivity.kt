package com.fahimpixe.expensetracker

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.viewmodel.compose.viewModel
import com.fahimpixe.expensetracker.ui.ExpenseTrackerApp
import com.fahimpixe.expensetracker.ui.theme.ExpenseTrackerTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ExpenseTrackerTheme {
                val viewModel: FinanceViewModel = viewModel()
                ExpenseTrackerApp(viewModel)
            }
        }
    }
}
