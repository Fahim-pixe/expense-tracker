package com.fahimpixe.expensetracker.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

object AppTokens {
    val LedgerBlue = Color(0xFF3563E9)
    val Ink = Color(0xFF111827)
    val Paper = Color(0xFFF7F8FC)
    val Surface = Color(0xFFFFFFFF)
    val Muted = Color(0xFF697386)
    val Border = Color(0xFFE4E8F0)
    val IncomeGreen = Color(0xFF1FA971)
    val SpendCoral = Color(0xFFE55B5B)
    val WarningAmber = Color(0xFFE99D1C)
    val CardRadius = 22.dp
    val ButtonRadius = 16.dp
    val PagePadding = 20.dp
    val PressAlpha = 0.72f
}

private val ExpenseTrackerColors = lightColorScheme(
    primary = AppTokens.LedgerBlue,
    onPrimary = AppTokens.Surface,
    secondary = AppTokens.IncomeGreen,
    background = AppTokens.Paper,
    onBackground = AppTokens.Ink,
    surface = AppTokens.Surface,
    onSurface = AppTokens.Ink,
    surfaceVariant = AppTokens.Paper,
    onSurfaceVariant = AppTokens.Muted,
    outline = AppTokens.Border,
    error = AppTokens.SpendCoral,
)

@Composable
fun ExpenseTrackerTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = ExpenseTrackerColors,
        content = content,
    )
}
