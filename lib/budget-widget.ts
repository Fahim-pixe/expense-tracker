import type { FinanceState } from "@/lib/finance";

export async function refreshBudgetWidget(_: FinanceState) {
  // Home-screen widgets are provided by the Android implementation.
}

export async function requestBudgetWidgetPin() {
  return false;
}
