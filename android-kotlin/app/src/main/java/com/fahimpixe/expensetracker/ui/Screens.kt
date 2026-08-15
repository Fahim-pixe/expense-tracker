package com.fahimpixe.expensetracker.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForwardIos
import androidx.compose.material.icons.automirrored.outlined.TrendingDown
import androidx.compose.material.icons.automirrored.outlined.TrendingUp
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material.icons.outlined.AddChart
import androidx.compose.material.icons.outlined.ArrowBackIosNew
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.outlined.Insights
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.ManageAccounts
import androidx.compose.material.icons.outlined.SearchOff
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.fahimpixe.expensetracker.config.NativeAppConfig
import androidx.compose.ui.unit.sp
import com.fahimpixe.expensetracker.FinanceViewModel
import com.fahimpixe.expensetracker.finance.CategoryTotal
import com.fahimpixe.expensetracker.finance.FinanceCalculator
import com.fahimpixe.expensetracker.finance.FinanceCategory
import com.fahimpixe.expensetracker.finance.FinanceState
import com.fahimpixe.expensetracker.finance.FinanceTransaction
import com.fahimpixe.expensetracker.finance.MonthlySummary
import com.fahimpixe.expensetracker.finance.TransactionType
import com.fahimpixe.expensetracker.ui.theme.AppTokens
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.TextStyle
import java.util.Locale

@Composable
fun OverviewScreen(viewModel: FinanceViewModel, modifier: Modifier = Modifier) {
    val state = viewModel.state
    val currentMonth = YearMonth.now()
    val monthlyTransactions = remember(state.transactions, currentMonth) { FinanceCalculator.forMonth(state.transactions, currentMonth) }
    val summary = remember(monthlyTransactions) { FinanceCalculator.summary(monthlyTransactions) }
    val categoryTotals = remember(monthlyTransactions, state.categories) { FinanceCalculator.categoryTotals(monthlyTransactions, state.categories).take(3) }
    val recent = remember(state.transactions) { state.transactions.sortedWith(compareByDescending<FinanceTransaction> { it.date }.thenByDescending { it.createdAtEpochMs }).take(5) }
    val week = remember(state.transactions) { lastSevenDays(state.transactions) }

    LazyColumn(
        modifier = modifier.fillMaxSize().statusBarsPadding(),
        contentPadding = PaddingValues(start = AppTokens.PagePadding, end = AppTokens.PagePadding, top = 16.dp, bottom = 100.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        item {
            Column {
                Text("THIS MONTH", color = AppTokens.Muted, fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.1.sp)
                Text("Your money, clearly.", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
            }
        }
        item { BalanceCard(summary, state.currencyCode) }
        item {
            SectionHeading("Spending pulse")
            SpendingPulseCard(week, state.currencyCode)
        }
        item {
            SectionHeading("Top spending")
            if (categoryTotals.isEmpty()) EmptyCard(Icons.Outlined.AddChart, "No spending yet", "Add an expense to see what is shaping your month.")
            else CategoryTotalsCard(categoryTotals, summary.expenseCents, state.currencyCode)
        }
        item { SectionHeading("Recent activity") }
        if (recent.isEmpty()) {
            item { EmptyCard(Icons.Outlined.AccountBalanceWallet, "Start your ledger", "Your latest income and expenses will appear here.") }
        } else {
            items(recent, key = { it.id }) { entry -> TransactionCard(entry, state, onDelete = { viewModel.deleteTransaction(entry.id) }) }
        }
    }
}

@Composable
fun ActivityScreen(viewModel: FinanceViewModel, modifier: Modifier = Modifier) {
    val state = viewModel.state
    var filter by rememberSaveable { mutableStateOf("all") }
    var search by rememberSaveable { mutableStateOf("") }
    val visible = remember(state.transactions, state.categories, filter, search) {
        state.transactions
            .filter { filter == "all" || it.type.name == filter }
            .filter { entry ->
                val category = state.categories.firstOrNull { it.id == entry.categoryId }?.name.orEmpty()
                "${entry.note} $category".contains(search.trim(), ignoreCase = true)
            }
            .sortedWith(compareByDescending<FinanceTransaction> { it.date }.thenByDescending { it.createdAtEpochMs })
    }
    val grouped = remember(visible) { visible.groupBy { it.date }.toSortedMap(compareByDescending { it }) }

    LazyColumn(
        modifier = modifier.fillMaxSize().statusBarsPadding(),
        contentPadding = PaddingValues(start = AppTokens.PagePadding, end = AppTokens.PagePadding, top = 16.dp, bottom = 100.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Text("Activity", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.ExtraBold)
            Text("Every entry, in one place.", color = AppTokens.Muted, style = MaterialTheme.typography.bodyMedium)
        }
        item {
            OutlinedTextField(
                value = search,
                onValueChange = { search = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Search notes or categories") },
                singleLine = true,
            )
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("all" to "All", TransactionType.INCOME.name to "Income", TransactionType.EXPENSE.name to "Expenses").forEach { (value, label) ->
                    FilterChip(selected = filter == value, onClick = { filter = value }, label = { Text(label) })
                }
            }
        }
        if (grouped.isEmpty()) {
            item { EmptyCard(Icons.Outlined.SearchOff, "Nothing found", if (search.isBlank()) "Record your first transaction to build your activity ledger." else "Try a different note or category name.") }
        } else {
            grouped.forEach { (date, entries) ->
                item(key = "date-$date") { Text(FinanceCalculator.dateLabel(date).uppercase(), color = AppTokens.Muted, fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 0.9.sp, modifier = Modifier.padding(top = 8.dp)) }
                items(entries, key = { it.id }) { entry -> TransactionCard(entry, state, onDelete = { viewModel.deleteTransaction(entry.id) }, includeDelete = true) }
            }
        }
    }
}

@Composable
fun InsightsScreen(viewModel: FinanceViewModel, modifier: Modifier = Modifier) {
    val state = viewModel.state
    var month by rememberSaveable { mutableStateOf(YearMonth.now().toString()) }
    val yearMonth = remember(month) { YearMonth.parse(month) }
    val entries = remember(state.transactions, yearMonth) { FinanceCalculator.forMonth(state.transactions, yearMonth) }
    val summary = remember(entries) { FinanceCalculator.summary(entries) }
    val categoryTotals = remember(entries, state.categories) { FinanceCalculator.categoryTotals(entries, state.categories) }
    val daily = remember(entries, yearMonth) { dailyExpenseTotals(entries, yearMonth).takeLast(7) }

    LazyColumn(
        modifier = modifier.fillMaxSize().statusBarsPadding(),
        contentPadding = PaddingValues(start = AppTokens.PagePadding, end = AppTokens.PagePadding, top = 16.dp, bottom = 100.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Text("Insights", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.ExtraBold)
            Text("Look at the rhythm behind your choices.", color = AppTokens.Muted, style = MaterialTheme.typography.bodyMedium)
        }
        item {
            MonthNavigator(yearMonth, onPrevious = { month = yearMonth.minusMonths(1).toString() }, onNext = { month = yearMonth.plusMonths(1).toString() })
        }
        item { SummaryStats(summary, state.currencyCode, yearMonth) }
        item { SectionHeading("Spending by category") }
        if (categoryTotals.isEmpty()) {
            item { EmptyCard(Icons.Outlined.Insights, "No insights yet", "As you log expenses for this month, your patterns will appear here.") }
        } else {
            items(categoryTotals, key = { it.category.id }) { total -> CategoryInsightCard(total, summary.expenseCents, state.currencyCode) }
        }
        item {
            SectionHeading("Daily spending")
            DailySpendingCard(daily, state.currencyCode)
        }
    }
}

@Composable
fun SettingsScreen(viewModel: FinanceViewModel, modifier: Modifier = Modifier, onManageCategories: () -> Unit) {
    val state = viewModel.state
    var confirmReset by rememberSaveable { mutableStateOf(false) }
    LazyColumn(
        modifier = modifier.fillMaxSize().statusBarsPadding(),
        contentPadding = PaddingValues(start = AppTokens.PagePadding, end = AppTokens.PagePadding, top = 16.dp, bottom = 100.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Text("Settings", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.ExtraBold)
            Text("Make the ledger feel like your own.", color = AppTokens.Muted, style = MaterialTheme.typography.bodyMedium)
        }
        item {
            Text("DISPLAY CURRENCY", color = AppTokens.Muted, fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.sp)
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                NativeAppConfig.supportedCurrencies.forEach { code -> FilterChip(selected = state.currencyCode == code, onClick = { viewModel.setCurrency(code) }, label = { Text(code) }) }
            }
        }
        item {
            Text("YOUR DATA", color = AppTokens.Muted, fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.sp)
            Spacer(Modifier.height(8.dp))
            SettingsActionCard(
                icon = Icons.Outlined.ManageAccounts,
                title = "Manage categories",
                detail = "${state.categories.size} categories",
                tint = AppTokens.LedgerBlue,
                onClick = onManageCategories,
                modifier = Modifier.testTag("manage-categories"),
            )
            SettingsActionCard(
                icon = Icons.Outlined.DeleteOutline,
                title = "Reset local data",
                detail = "${state.transactions.size} transactions stored",
                tint = AppTokens.SpendCoral,
                onClick = { confirmReset = true },
                modifier = Modifier.testTag("reset-local-data"),
            )
        }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = AppTokens.Surface), shape = androidx.compose.foundation.shape.RoundedCornerShape(AppTokens.CardRadius)) {
                Row(modifier = Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Icon(Icons.Outlined.Lock, contentDescription = null, tint = AppTokens.IncomeGreen)
                    Column {
                        Text("Private by default", fontWeight = FontWeight.ExtraBold)
                        Text("Your ledger stays on this device. This version does not require an account or upload your transactions.", color = AppTokens.Muted, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
    }
    if (confirmReset) {
        AlertDialog(
            onDismissRequest = { confirmReset = false },
            title = { Text("Reset local data?") },
            text = { Text("All entries and custom categories on this device will be permanently removed.") },
            confirmButton = { TextButton(onClick = { viewModel.resetData(); confirmReset = false }) { Text("Reset", color = AppTokens.SpendCoral) } },
            dismissButton = { TextButton(onClick = { confirmReset = false }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun BalanceCard(summary: MonthlySummary, currencyCode: String) {
    Card(colors = CardDefaults.cardColors(containerColor = AppTokens.LedgerBlue), shape = androidx.compose.foundation.shape.RoundedCornerShape(26.dp)) {
        Column(modifier = Modifier.fillMaxWidth().padding(21.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text("MONTHLY NET", color = Color.White.copy(alpha = 0.76f), fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.sp)
                    Text(FinanceCalculator.formatCurrency(summary.balanceCents, currencyCode), color = Color.White, fontSize = 33.sp, lineHeight = 40.sp, fontWeight = FontWeight.ExtraBold)
                }
                Icon(Icons.Outlined.AccountBalanceWallet, contentDescription = null, tint = Color.White, modifier = Modifier.size(28.dp))
            }
            Row(modifier = Modifier.padding(top = 20.dp), horizontalArrangement = Arrangement.spacedBy(30.dp)) {
                MoneyMeta("Income", summary.incomeCents, currencyCode)
                MoneyMeta("Spent", summary.expenseCents, currencyCode)
            }
        }
    }
}

@Composable
private fun MoneyMeta(label: String, cents: Long, currencyCode: String) {
    Column {
        Text(label, color = Color.White.copy(alpha = 0.72f), style = MaterialTheme.typography.bodySmall)
        Text(FinanceCalculator.formatCurrency(cents, currencyCode), color = Color.White, fontWeight = FontWeight.ExtraBold)
    }
}

@Composable
private fun SpendingPulseCard(week: List<Pair<LocalDate, Long>>, currencyCode: String) {
    val total = week.sumOf { it.second }
    val maximum = week.maxOfOrNull { it.second }?.coerceAtLeast(1L) ?: 1L
    Card(colors = CardDefaults.cardColors(containerColor = AppTokens.Surface), shape = androidx.compose.foundation.shape.RoundedCornerShape(AppTokens.CardRadius)) {
        Column(modifier = Modifier.fillMaxWidth().padding(18.dp)) {
            Text(FinanceCalculator.formatCurrency(total, currencyCode), fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
            Text("spent over the last 7 days", color = AppTokens.Muted, style = MaterialTheme.typography.bodySmall)
            Row(modifier = Modifier.fillMaxWidth().height(86.dp).padding(top = 12.dp), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.Bottom) {
                week.forEach { (date, cents) ->
                    val barHeight = if (cents == 0L) 4.dp else (12 + (56 * cents / maximum).toInt()).dp
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Bottom) {
                        Box(Modifier.width(10.dp).height(barHeight).background(if (date == LocalDate.now()) AppTokens.LedgerBlue else AppTokens.LedgerBlue.copy(alpha = 0.45f), androidx.compose.foundation.shape.RoundedCornerShape(5.dp)))
                        Spacer(Modifier.height(5.dp))
                        Text(date.dayOfWeek.getDisplayName(TextStyle.NARROW, Locale.getDefault()), color = if (date == LocalDate.now()) AppTokens.LedgerBlue else AppTokens.Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun CategoryTotalsCard(totals: List<CategoryTotal>, totalExpense: Long, currencyCode: String) {
    Card(colors = CardDefaults.cardColors(containerColor = AppTokens.Surface), shape = androidx.compose.foundation.shape.RoundedCornerShape(AppTokens.CardRadius)) {
        Column(modifier = Modifier.padding(horizontal = 18.dp, vertical = 8.dp)) {
            totals.forEachIndexed { index, item ->
                if (index > 0) HorizontalDivider(color = AppTokens.Border)
                Row(modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                    CategoryDot(item.category)
                    Spacer(Modifier.width(10.dp))
                    Text(item.category.name, modifier = Modifier.weight(1f), fontWeight = FontWeight.SemiBold)
                    Text(FinanceCalculator.formatCurrency(item.amountCents, currencyCode), fontWeight = FontWeight.ExtraBold)
                }
            }
        }
    }
}

@Composable
private fun TransactionCard(entry: FinanceTransaction, state: FinanceState, onDelete: () -> Unit, includeDelete: Boolean = false) {
    val category = state.categories.firstOrNull { it.id == entry.categoryId } ?: return
    Card(
        colors = CardDefaults.cardColors(containerColor = AppTokens.Surface),
        shape = androidx.compose.foundation.shape.RoundedCornerShape(AppTokens.ButtonRadius),
        modifier = Modifier.testTag("transaction-card-${entry.id}"),
    ) {
        Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
            CategoryDot(category)
            Spacer(Modifier.width(11.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(entry.note.ifBlank { category.name }, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("${category.name} · ${entry.date}", color = AppTokens.Muted, style = MaterialTheme.typography.bodySmall)
            }
            Text(
                FinanceCalculator.formatCurrency(if (entry.type == TransactionType.INCOME) entry.amountCents else -entry.amountCents, state.currencyCode, signed = true),
                color = if (entry.type == TransactionType.INCOME) AppTokens.IncomeGreen else AppTokens.SpendCoral,
                fontWeight = FontWeight.ExtraBold,
            )
            if (includeDelete) {
                IconButton(onClick = onDelete, modifier = Modifier.testTag("delete-transaction-${entry.id}")) {
                    Icon(Icons.Outlined.DeleteOutline, contentDescription = "Delete transaction", tint = AppTokens.SpendCoral)
                }
            }
        }
    }
}

@Composable
private fun CategoryInsightCard(item: CategoryTotal, totalExpense: Long, currencyCode: String) {
    val share = if (totalExpense == 0L) 0f else item.amountCents.toFloat() / totalExpense.toFloat()
    Card(colors = CardDefaults.cardColors(containerColor = AppTokens.Surface), shape = androidx.compose.foundation.shape.RoundedCornerShape(AppTokens.ButtonRadius)) {
        Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                CategoryDot(item.category)
                Spacer(Modifier.width(9.dp))
                Text(item.category.name, modifier = Modifier.weight(1f), fontWeight = FontWeight.Bold)
                Text(FinanceCalculator.formatCurrency(item.amountCents, currencyCode), fontWeight = FontWeight.ExtraBold)
            }
            LinearProgressIndicator(progress = { share }, modifier = Modifier.fillMaxWidth().padding(top = 12.dp), color = Color(item.category.colorArgb), trackColor = Color(item.category.colorArgb).copy(alpha = 0.14f))
            Text("${(share * 100).toInt()}% of monthly spending", color = AppTokens.Muted, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 5.dp))
        }
    }
}

@Composable
private fun SummaryStats(summary: MonthlySummary, currencyCode: String, month: YearMonth) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SummaryMetric("INCOME", summary.incomeCents, currencyCode, AppTokens.IncomeGreen, Modifier.weight(1f))
            SummaryMetric("SPENT", summary.expenseCents, currencyCode, AppTokens.SpendCoral, Modifier.weight(1f))
        }
        Card(colors = CardDefaults.cardColors(containerColor = AppTokens.Surface), shape = androidx.compose.foundation.shape.RoundedCornerShape(AppTokens.CardRadius)) {
            Row(modifier = Modifier.fillMaxWidth().padding(18.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text("NET FOR ${month.month.getDisplayName(TextStyle.FULL, Locale.getDefault()).uppercase()}", color = AppTokens.Muted, fontSize = 10.sp, fontWeight = FontWeight.ExtraBold)
                    Text(FinanceCalculator.formatCurrency(summary.balanceCents, currencyCode), color = if (summary.balanceCents >= 0) AppTokens.IncomeGreen else AppTokens.SpendCoral, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold)
                }
                Icon(if (summary.balanceCents >= 0) Icons.AutoMirrored.Outlined.TrendingUp else Icons.AutoMirrored.Outlined.TrendingDown, contentDescription = null, tint = if (summary.balanceCents >= 0) AppTokens.IncomeGreen else AppTokens.SpendCoral)
            }
        }
    }
}

@Composable
private fun SummaryMetric(label: String, cents: Long, currencyCode: String, color: Color, modifier: Modifier) {
    Card(modifier = modifier, colors = CardDefaults.cardColors(containerColor = AppTokens.Surface), shape = androidx.compose.foundation.shape.RoundedCornerShape(AppTokens.ButtonRadius)) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(label, color = AppTokens.Muted, fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 0.7.sp)
            Text(FinanceCalculator.formatCurrency(cents, currencyCode), color = color, fontWeight = FontWeight.ExtraBold)
        }
    }
}

@Composable
private fun MonthNavigator(month: YearMonth, onPrevious: () -> Unit, onNext: () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = AppTokens.Surface), shape = androidx.compose.foundation.shape.RoundedCornerShape(AppTokens.ButtonRadius)) {
        Row(modifier = Modifier.fillMaxWidth().height(50.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            IconButton(onClick = onPrevious) { Icon(Icons.Outlined.ArrowBackIosNew, contentDescription = "Previous month") }
            Text("${month.month.getDisplayName(TextStyle.FULL, Locale.getDefault())} ${month.year}", fontWeight = FontWeight.ExtraBold)
            IconButton(onClick = onNext) { Icon(Icons.AutoMirrored.Outlined.ArrowForwardIos, contentDescription = "Next month") }
        }
    }
}

@Composable
private fun DailySpendingCard(days: List<Pair<LocalDate, Long>>, currencyCode: String) {
    val maximum = days.maxOfOrNull { it.second }?.coerceAtLeast(1L) ?: 1L
    Card(colors = CardDefaults.cardColors(containerColor = AppTokens.Surface), shape = androidx.compose.foundation.shape.RoundedCornerShape(AppTokens.CardRadius)) {
        if (days.all { it.second == 0L }) {
            Text("No daily spending has been recorded for this month.", color = AppTokens.Muted, modifier = Modifier.fillMaxWidth().padding(24.dp), textAlign = TextAlign.Center)
        } else Row(modifier = Modifier.fillMaxWidth().height(146.dp).padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Bottom) {
            days.forEach { (date, cents) ->
                val height = if (cents == 0L) 3.dp else (12 + (72 * cents / maximum).toInt()).dp
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Bottom) {
                    Text(if (cents == 0L) "" else FinanceCalculator.formatCurrency(cents, currencyCode), color = AppTokens.Muted, fontSize = 9.sp, maxLines = 1)
                    Box(Modifier.width(12.dp).height(height).background(AppTokens.LedgerBlue, androidx.compose.foundation.shape.RoundedCornerShape(5.dp)))
                    Spacer(Modifier.height(5.dp))
                    Text(date.dayOfMonth.toString(), color = AppTokens.Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun SettingsActionCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    detail: String,
    tint: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        onClick = onClick,
        colors = CardDefaults.cardColors(containerColor = AppTokens.Surface),
        shape = androidx.compose.foundation.shape.RoundedCornerShape(AppTokens.ButtonRadius),
        modifier = modifier.fillMaxWidth(),
    ) {
        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = tint)
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(title, color = if (tint == AppTokens.SpendCoral) tint else AppTokens.Ink, fontWeight = FontWeight.Bold)
                Text(detail, color = AppTokens.Muted, style = MaterialTheme.typography.bodySmall)
            }
            Icon(Icons.AutoMirrored.Outlined.ArrowForwardIos, contentDescription = null, tint = AppTokens.Muted, modifier = Modifier.size(16.dp))
        }
    }
}

@Composable
private fun EmptyCard(icon: androidx.compose.ui.graphics.vector.ImageVector, title: String, description: String) {
    Card(colors = CardDefaults.cardColors(containerColor = AppTokens.Surface), shape = androidx.compose.foundation.shape.RoundedCornerShape(AppTokens.CardRadius), modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.fillMaxWidth().padding(vertical = 34.dp, horizontal = 22.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(icon, contentDescription = null, tint = AppTokens.LedgerBlue, modifier = Modifier.size(28.dp))
            Text(title, fontWeight = FontWeight.ExtraBold)
            Text(description, color = AppTokens.Muted, style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun SectionHeading(title: String) {
    Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold)
}

@Composable
private fun CategoryDot(category: FinanceCategory) {
    Box(Modifier.size(36.dp).background(Color(category.colorArgb).copy(alpha = 0.15f), androidx.compose.foundation.shape.RoundedCornerShape(18.dp)), contentAlignment = Alignment.Center) {
        Box(Modifier.size(12.dp).background(Color(category.colorArgb), androidx.compose.foundation.shape.RoundedCornerShape(6.dp)))
    }
}

private fun lastSevenDays(transactions: List<FinanceTransaction>): List<Pair<LocalDate, Long>> {
    val today = LocalDate.now()
    return (6 downTo 0).map { offset ->
        val date = today.minusDays(offset.toLong())
        date to transactions.filter { it.type == TransactionType.EXPENSE && it.date == date.toString() }.sumOf { it.amountCents }
    }
}

private fun dailyExpenseTotals(transactions: List<FinanceTransaction>, month: YearMonth): List<Pair<LocalDate, Long>> =
    (1..month.lengthOfMonth()).map { day ->
        val date = month.atDay(day)
        date to transactions.filter { it.type == TransactionType.EXPENSE && it.date == date.toString() }.sumOf { it.amountCents }
    }
