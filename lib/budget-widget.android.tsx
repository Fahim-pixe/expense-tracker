import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { FlexWidget, TextWidget, registerWidgetTaskHandler, requestPinWidget, requestWidgetUpdate } from "react-native-android-widget";

import { FINANCE_STORAGE_KEY } from "@/lib/finance-store";
import { calculateBudgetProgress, calculateTotals, formatMoney, getCategoryBudget, getCategoryTotals, getMonthKey, getMonthTransactions, getMonthlyBudget, normalizeFinanceState, type FinanceState } from "@/lib/finance";

const WIDGET_NAME = "BudgetSnapshot";

function buildWidget(state: FinanceState) {
  const month = new Date();
  const monthTransactions = getMonthTransactions(state.transactions, month);
  const totals = calculateTotals(monthTransactions);
  const budget = getMonthlyBudget(state.budgets, month);
  const progress = calculateBudgetProgress(totals.expenseCents, budget?.amountCents ?? 0);
  const categoryTotals = getCategoryTotals(monthTransactions, state.categories);
  const monthKey = getMonthKey(month);
  const categoryAlert = categoryTotals.map(({ category, amountCents }) => ({ category, progress: calculateBudgetProgress(amountCents, getCategoryBudget(state.categoryBudgets, monthKey, category.id)?.amountCents ?? 0) })).filter((item) => item.progress.isAtBudget).sort((a, b) => b.progress.percentUsed - a.progress.percentUsed)[0];
  const headline = budget ? (progress.isOverBudget ? `${formatMoney(Math.abs(progress.remainingCents), state.preferences.currencyCode)} over budget` : `${formatMoney(progress.remainingCents, state.preferences.currencyCode)} left this month`) : `${formatMoney(totals.expenseCents, state.preferences.currencyCode)} spent this month`;
  const alert = categoryAlert ? `${categoryAlert.category.name}: ${formatMoney(categoryAlert.progress.expenseCents, state.preferences.currencyCode)} of ${formatMoney(categoryAlert.progress.budgetCents, state.preferences.currencyCode)}` : budget ? `${formatMoney(progress.expenseCents, state.preferences.currencyCode)} of ${formatMoney(progress.budgetCents, state.preferences.currencyCode)} target` : "Set a monthly target in Budget";
  return <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: "expense-tracker://budget" }} accessibilityLabel={`Budget Snapshot. ${headline}. ${alert}`} style={{ backgroundGradient: { from: "#3563E9", to: "#244EC2", orientation: "TL_BR" }, borderRadius: 18, padding: 16, height: "match_parent", width: "match_parent", justifyContent: "center" }}><TextWidget text="BUDGET SNAPSHOT" style={{ color: "#DDE7FF", fontSize: 10, fontWeight: "800", letterSpacing: 1 }} /><TextWidget text={headline} maxLines={1} style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "800", marginTop: 4 }} /><TextWidget text={alert} maxLines={2} style={{ color: "#E7EEFF", fontSize: 12, marginTop: 8 }} /></FlexWidget>;
}

async function loadWidgetState() {
  try {
    const stored = await AsyncStorage.getItem(FINANCE_STORAGE_KEY);
    return normalizeFinanceState(stored ? JSON.parse(stored) : {});
  } catch { return normalizeFinanceState({}); }
}

registerWidgetTaskHandler(async ({ renderWidget }) => {
  renderWidget(buildWidget(await loadWidgetState()));
});

export async function refreshBudgetWidget(state: FinanceState) {
  await requestWidgetUpdate({ widgetName: WIDGET_NAME, renderWidget: () => buildWidget(state) });
}

export async function requestBudgetWidgetPin() {
  return requestPinWidget({ widgetName: WIDGET_NAME });
}
