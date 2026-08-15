package com.fahimpixe.expensetracker.ui

import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollToNode
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
    fun user_can_add_and_delete_a_local_ledger_record() {
        waitForAppReady()
        resetLocalLedger()

        composeRule.onNodeWithTag("add-transaction").performClick()
        composeRule.onNodeWithTag("transaction-amount").performTextInput("12.50")
        composeRule.onNodeWithTag("transaction-category-food").performClick()
        composeRule.onNodeWithTag("transaction-note").performTextInput("UI flow lunch")
        composeRule.onNodeWithTag("transaction-date").performTextClearance()
        composeRule.onNodeWithTag("transaction-date").performTextInput("2026-08-14")
        composeRule.onNodeWithTag("save-transaction").performClick()
        waitForAppReady()

        composeRule.onNodeWithTag("tab-activity").performClick()
        waitForTag("activity-list")
        composeRule.onNodeWithTag("activity-list").performScrollToNode(hasText("UI flow lunch"))
        composeRule.waitForIdle()
        waitForTag("delete-transaction-action", useUnmergedTree = true)
        composeRule.onNodeWithTag("delete-transaction-action", useUnmergedTree = true).performClick()
        waitForAppReady()
        waitForText("Nothing found")
    }

    @Test
    fun user_can_add_and_remove_a_custom_category() {
        waitForAppReady()
        resetLocalLedger()

        composeRule.onNodeWithTag("tab-settings").performClick()
        composeRule.onNodeWithTag("manage-categories").performClick()
        composeRule.onNodeWithTag("category-name").performTextInput("Office coffee")
        composeRule.onNodeWithTag("add-category").performClick()
        waitForTag("remove-category-Office coffee")
        waitForAppReady()
        composeRule.onNodeWithTag("remove-category-Office coffee").performClick()
    }

    private fun resetLocalLedger() {
        waitForAppReady()
        composeRule.onNodeWithTag("tab-settings").performClick()
        composeRule.onNodeWithTag("reset-local-data").performClick()
        composeRule.onNodeWithText("Reset").performClick()
        waitForText("0 transactions stored")
        waitForText("11 categories")
        composeRule.onNodeWithTag("tab-overview").performClick()
    }

    private fun waitForAppReady() = waitForTag("app-ready")

    private fun waitForText(text: String) {
        composeRule.waitUntil(timeoutMillis = EMULATOR_TIMEOUT_MILLIS) {
            composeRule.onAllNodesWithText(text).fetchSemanticsNodes().isNotEmpty()
        }
    }

    private fun waitForTag(tag: String, useUnmergedTree: Boolean = false) {
        composeRule.waitUntil(timeoutMillis = EMULATOR_TIMEOUT_MILLIS) {
            composeRule.onAllNodesWithTag(tag, useUnmergedTree = useUnmergedTree).fetchSemanticsNodes().isNotEmpty()
        }
    }

    private companion object {
        const val EMULATOR_TIMEOUT_MILLIS = 15_000L
    }
}
