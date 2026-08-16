package com.fahimpixe.expensetracker.ui

import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextClearance
import androidx.compose.ui.test.performTextInput
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fahimpixe.expensetracker.MainActivity
import com.fahimpixe.expensetracker.finance.TransactionType
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ExpenseTrackerUiTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<MainActivity>()

    @Test
    fun user_can_complete_the_transaction_form() {
        waitForAppReady()
        resetLocalLedger()

        composeRule.onNodeWithTag("add-transaction").performClick()
        waitForTag("transaction-amount")
        waitForTag("transaction-category-food")
        composeRule.onNodeWithTag("transaction-amount").performTextInput("12.50")
        composeRule.onNodeWithTag("transaction-category-food").performClick()
        composeRule.onNodeWithTag("transaction-note").performTextInput("UI flow lunch")
        composeRule.onNodeWithTag("transaction-date").performTextClearance()
        composeRule.onNodeWithTag("transaction-date").performTextInput("2026-08-14")
        waitForTag("save-transaction")
    }

    @Test
    fun user_can_delete_a_persisted_local_ledger_record_from_activity() {
        waitForAppReady()
        resetLocalLedger()

        val viewModel = composeRule.activity.financeViewModel
        val mutationIdBeforeSeed = viewModel.completedMutationId
        composeRule.activity.runOnUiThread {
            check(
                viewModel.addTransaction(
                    type = TransactionType.EXPENSE,
                    amountInput = "12.50",
                    categoryId = "food",
                    note = "UI flow lunch",
                    dateInput = "2026-08-14",
                    onPersisted = {},
                ),
            )
        }
        waitForMutationAfter(mutationIdBeforeSeed)

        composeRule.onNodeWithTag("tab-activity").performClick()
        waitForTag("activity-list-ready")
        waitForText("UI flow lunch")
        waitForTag("activity-transaction-row")
        val row = composeRule.onNodeWithTag("activity-transaction-row").fetchSemanticsNode()
        val deleteAction = row.config[SemanticsActions.CustomActions]
            .firstOrNull { it.label == "Delete transaction" }
        val mutationIdBeforeDelete = viewModel.completedMutationId
        check(deleteAction?.action?.invoke() == true)
        waitForMutationAfter(mutationIdBeforeDelete)
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

    private fun waitForMutationAfter(mutationId: Long) {
        composeRule.waitUntil(timeoutMillis = EMULATOR_TIMEOUT_MILLIS) {
            val viewModel = composeRule.activity.financeViewModel
            viewModel.isMutationIdle && viewModel.completedMutationId > mutationId
        }
    }

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
