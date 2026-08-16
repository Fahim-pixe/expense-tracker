package com.fahimpixe.expensetracker.ui

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.Insights
import androidx.compose.material.icons.outlined.ReceiptLong
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fahimpixe.expensetracker.FinanceViewModel
import com.fahimpixe.expensetracker.finance.FinanceCalculator
import com.fahimpixe.expensetracker.finance.TransactionType
import com.fahimpixe.expensetracker.ui.theme.AppTokens
import java.time.LocalDate

private data class AppTab(
    val label: String,
    val icon: @Composable () -> Unit,
)

@Composable
fun ExpenseTrackerApp(viewModel: FinanceViewModel) {
    var selectedTab by rememberSaveable { mutableIntStateOf(0) }
    var showAddTransaction by rememberSaveable { mutableStateOf(false) }
    var showCategories by rememberSaveable { mutableStateOf(false) }
    val tabs = listOf(
        AppTab("Overview") { Icon(Icons.Outlined.AccountBalanceWallet, contentDescription = null) },
        AppTab("Activity") { Icon(Icons.Outlined.ReceiptLong, contentDescription = null) },
        AppTab("Insights") { Icon(Icons.Outlined.Insights, contentDescription = null) },
        AppTab("Settings") { Icon(Icons.Outlined.Settings, contentDescription = null) },
    )

    Scaffold(modifier = Modifier.testTag(if (viewModel.isMutationIdle) "app-ready" else "app-loading"),
        containerColor = AppTokens.Paper,
        bottomBar = {
            NavigationBar(containerColor = AppTokens.Surface) {
                tabs.forEachIndexed { index, tab ->
                    NavigationBarItem(
                        modifier = Modifier.testTag("tab-${tab.label.lowercase()}"),
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        icon = tab.icon,
                        label = { Text(tab.label, fontSize = 11.sp, fontWeight = FontWeight.SemiBold) },
                    )
                }
            }
        },
        floatingActionButton = {
            if (selectedTab != 3) {
                ExtendedFloatingActionButton(
                    onClick = { showAddTransaction = true },
                    modifier = Modifier.testTag("add-transaction"),
                    containerColor = AppTokens.LedgerBlue,
                    contentColor = AppTokens.Surface,
                    icon = { Icon(Icons.Outlined.Add, contentDescription = null) },
                    text = { Text("Add", fontWeight = FontWeight.Bold) },
                )
            }
        },
    ) { paddingValues ->
        when (selectedTab) {
            0 -> OverviewScreen(viewModel, Modifier.padding(paddingValues))
            1 -> ActivityScreen(viewModel, Modifier.padding(paddingValues))
            2 -> InsightsScreen(viewModel, Modifier.padding(paddingValues))
            else -> SettingsScreen(viewModel, Modifier.padding(paddingValues), onManageCategories = { showCategories = true })
        }
    }

    if (showAddTransaction) {
        AddTransactionSheet(viewModel = viewModel, onDismiss = { showAddTransaction = false })
    }
    if (showCategories) {
        ManageCategoriesSheet(viewModel = viewModel, onDismiss = { showCategories = false })
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddTransactionSheet(viewModel: FinanceViewModel, onDismiss: () -> Unit) {
    val state = viewModel.state
    var typeName by rememberSaveable { mutableStateOf(TransactionType.EXPENSE.name) }
    val type = TransactionType.valueOf(typeName)
    val categories = state.categories.filter { it.type == type }
    var categoryId by rememberSaveable { mutableStateOf("") }
    var amount by rememberSaveable { mutableStateOf("") }
    var note by rememberSaveable { mutableStateOf("") }
    var date by rememberSaveable { mutableStateOf(LocalDate.now().toString()) }
    var validationMessage by rememberSaveable { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    LaunchedEffect(typeName, categories) {
        if (categories.none { it.id == categoryId }) categoryId = categories.firstOrNull()?.id.orEmpty()
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
    ) {
        Column(
            modifier = Modifier
                .testTag("transaction-form")
                .fillMaxWidth()
                .padding(horizontal = AppTokens.PagePadding)
                .padding(bottom = 28.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Text("New transaction", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text("Keep your monthly picture current.", color = AppTokens.Muted, style = MaterialTheme.typography.bodyMedium)
                }
                IconButton(onClick = onDismiss) { Icon(Icons.Outlined.Close, contentDescription = "Close transaction form") }
            }

            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                listOf(TransactionType.EXPENSE, TransactionType.INCOME).forEachIndexed { index, option ->
                    SegmentedButton(
                        selected = type == option,
                        onClick = { typeName = option.name },
                        shape = SegmentedButtonDefaults.itemShape(index = index, count = 2),
                        label = { Text(if (option == TransactionType.EXPENSE) "Expense" else "Income") },
                    )
                }
            }

            OutlinedTextField(
                value = amount,
                onValueChange = { amount = it },
                modifier = Modifier.fillMaxWidth().testTag("transaction-amount"),
                label = { Text("Amount") },
                prefix = { Text(currencyPrefix(state.currencyCode)) },
                placeholder = { Text("0.00") },
                keyboardOptions = KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal),
                singleLine = true,
            )

            Text("Category", fontWeight = FontWeight.Bold)
            Row(modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                categories.forEach { category ->
                    FilterChip(
                        selected = category.id == categoryId,
                        onClick = { categoryId = category.id },
                        modifier = Modifier.testTag("transaction-category-${category.id}"),
                        label = { Text(category.name) },
                    )
                }
            }

            OutlinedTextField(value = note, onValueChange = { note = it }, modifier = Modifier.fillMaxWidth().testTag("transaction-note"), label = { Text("Note") }, placeholder = { Text("Optional") }, singleLine = true)
            OutlinedTextField(value = date, onValueChange = { date = it }, modifier = Modifier.fillMaxWidth().testTag("transaction-date"), label = { Text("Date") }, placeholder = { Text("YYYY-MM-DD") }, singleLine = true)
            if (validationMessage.isNotBlank()) Text(validationMessage, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)

            Button(
                onClick = {
                    isSaving = true
                    if (viewModel.addTransaction(
                            type = type,
                            amountInput = amount,
                            categoryId = categoryId,
                            note = note,
                            dateInput = date,
                            onPersisted = {
                                isSaving = false
                                onDismiss()
                            },
                        )
                    ) {
                        validationMessage = ""
                    } else {
                        isSaving = false
                        validationMessage = "Enter an amount above zero, choose a category, and use a valid YYYY-MM-DD date."
                    }
                },
                enabled = !isSaving && viewModel.isMutationIdle,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .testTag(if (isSaving) "save-transaction-pending" else "save-transaction"),
                shape = androidx.compose.foundation.shape.RoundedCornerShape(AppTokens.ButtonRadius),
            ) {
                Text(if (isSaving) "Saving…" else "Save transaction", fontWeight = FontWeight.Bold)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ManageCategoriesSheet(viewModel: FinanceViewModel, onDismiss: () -> Unit) {
    val state = viewModel.state
    var typeName by rememberSaveable { mutableStateOf(TransactionType.EXPENSE.name) }
    val type = TransactionType.valueOf(typeName)
    var name by rememberSaveable { mutableStateOf("") }
    var error by rememberSaveable { mutableStateOf("") }
    var hiddenCategoryIds by rememberSaveable { mutableStateOf(emptySet<String>()) }
    val categories = state.categories.filter { it.type == type && it.id !in hiddenCategoryIds }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = AppTokens.PagePadding)
                .padding(bottom = 28.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Categories", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                IconButton(onClick = onDismiss) { Icon(Icons.Outlined.Close, contentDescription = "Close categories") }
            }
            Text("Keep routine entries quick and consistent.", color = AppTokens.Muted, style = MaterialTheme.typography.bodyMedium)
            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                listOf(TransactionType.EXPENSE, TransactionType.INCOME).forEachIndexed { index, option ->
                    SegmentedButton(selected = type == option, onClick = { typeName = option.name }, shape = SegmentedButtonDefaults.itemShape(index, 2), label = { Text(if (option == TransactionType.EXPENSE) "Expenses" else "Income") })
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(value = name, onValueChange = { name = it }, modifier = Modifier.weight(1f).testTag("category-name"), label = { Text("New category") }, singleLine = true)
                Button(onClick = { if (name.isBlank()) error = "Enter a category name." else { viewModel.addCategory(name, type); name = ""; error = "" } }, modifier = Modifier.height(56.dp).testTag("add-category")) { Icon(Icons.Outlined.Add, contentDescription = "Add category") }
            }
            if (error.isNotBlank()) Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            Spacer(Modifier.height(2.dp))
            categories.forEach { category ->
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    AssistChip(onClick = {}, label = { Text(category.name) }, leadingIcon = { Icon(Icons.Outlined.Category, contentDescription = null, modifier = Modifier.size(18.dp)) })
                    if (category.isDefault) Text("Default", color = AppTokens.Muted, style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(top = 10.dp))
                    else IconButton(
                        onClick = { if (viewModel.removeCategory(category.id)) hiddenCategoryIds += category.id else error = "Categories in use cannot be removed." },
                        modifier = Modifier.testTag("remove-category-${category.name}").semantics { contentDescription = "Remove ${category.name}" },
                    ) {
                        Icon(Icons.Outlined.DeleteOutline, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                    }
                }
            }
        }
    }
}

private fun currencyPrefix(currencyCode: String): String = when (currencyCode) {
    "EUR" -> "€"
    "GBP" -> "£"
    else -> "$"
}
