package com.fahimpixe.expensetracker.ui

import androidx.compose.ui.test.assertTextContains
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fahimpixe.expensetracker.MainActivity
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ActivityRecreationUiTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<MainActivity>()

    @Test
    fun configuration_recreation_preserves_the_active_tab_and_transaction_draft() {
        composeRule.onNodeWithTag("tab-activity").performClick()
        waitForText("Activity")
        composeRule.onNodeWithTag("add-transaction").performClick()
        composeRule.onNodeWithTag("transaction-amount").performTextInput("19.25")
        composeRule.onNodeWithTag("transaction-note").performTextInput("Rotation draft")

        composeRule.activityRule.scenario.recreate()

        waitForText("New transaction")
        composeRule.onNodeWithTag("transaction-amount").assertTextContains("19.25")
        composeRule.onNodeWithTag("transaction-note").assertTextContains("Rotation draft")
    }

    private fun waitForText(text: String) {
        composeRule.waitUntil(timeoutMillis = EMULATOR_TIMEOUT_MILLIS) {
            composeRule.onAllNodesWithText(text).fetchSemanticsNodes().isNotEmpty()
        }
    }

    private companion object {
        const val EMULATOR_TIMEOUT_MILLIS = 15_000L
    }
}
