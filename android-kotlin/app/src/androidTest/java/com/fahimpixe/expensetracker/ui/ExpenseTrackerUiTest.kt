package com.fahimpixe.expensetracker.ui

import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextClearance
import androidx.compose.ui.test.performTextInput
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fahimpixe.expensetracker.MainActivity
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ExpenseTrackerUiTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<MainActivity>()

    @Test
    fun user_can_add_delete_and_manage_local_ledger_records() {
        resetLocalLedger()

        composeRule.onNodeWithTag("add-transaction").performClick()
        composeRule.onNodeWithTag("transaction-amount").performTextInput("12.50")
        composeRule.onNodeWithTag("transaction-category-food").performClick()
        composeRule.onNodeWithTag("transaction-note").performTextInput("UI flow lunch")
        composeRule.onNodeWithTag("transaction-date").performTextClearance()
        composeRule.onNodeWithTag("transaction-date").performTextInput("2026-08-14")
        composeRule.onNodeWithTag("save-transaction").performClick()
        waitForText("UI flow lunch")

        composeRule.onNodeWithTag("tab-activity").performClick()
        waitForText("UI flow lunch")
        composeRule.onNodeWithContentDescription("Delete transaction").performClick()
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText("UI flow lunch").fetchSemanticsNodes().isEmpty()
        }

        composeRule.onNodeWithTag("tab-settings").performClick()
        composeRule.onNodeWithTag("manage-categories").performClick()
        composeRule.onNodeWithTag("category-name").performTextInput("Office coffee")
        composeRule.onNodeWithTag("add-category").performClick()
        waitForText("Office coffee")
        composeRule.onNodeWithContentDescription("Remove Office coffee").performClick()
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText("Office coffee").fetchSemanticsNodes().isEmpty()
        }
    }

    private fun resetLocalLedger() {
        composeRule.onNodeWithTag("tab-settings").performClick()
        composeRule.onNodeWithTag("reset-local-data").performClick()
        composeRule.onNodeWithText("Reset").performClick()
        composeRule.onNodeWithTag("tab-overview").performClick()
        waitForText("Start your ledger")
    }

    private fun waitForText(text: String) {
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText(text).fetchSemanticsNodes().isNotEmpty()
        }
    }
}
