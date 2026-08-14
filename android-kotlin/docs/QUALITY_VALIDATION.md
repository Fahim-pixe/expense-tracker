# Accessibility and Large-Ledger Validation Pass

This operating procedure keeps the native expense tracker usable as the local ledger grows. It is intentionally a **validation cadence**, not a data-collection service: no financial records leave the device and no automated background process is introduced.

## Cadence

| Trigger | Required pass | Owner evidence |
| --- | --- | --- |
| Every release candidate with Compose UI changes | Accessibility pass on an Android emulator or physical device. | Completed checklist in the pull request or release notes. |
| Every release candidate that changes list, summary, search, or persistence code | Large-ledger pass with the deterministic local fixture described below. | Device/API level, dataset size, observed scrolling and memory behavior. |
| Before a material product expansion or database version change | Full accessibility and large-ledger pass, plus migration tests. | Updated `PROJECT_STATE.md` and linked test output. |

## Accessibility pass

Verify the Overview, Activity, Settings, add-transaction sheet, and category-management sheet with TalkBack enabled. Each action must have a meaningful spoken label, a logical focus order, and an obvious result after activation. Test text and display scaling at the device default plus the largest size supported by the intended release device; no critical control may become unreachable, clipped, or overlap its neighbor.

Use the Compose semantics tree as the automated foundation and retain explicit labels for destructive controls. Compose semantics serve both accessibility services and UI testing, while TalkBack is Android’s built-in screen reader.[1] [2]

## Large-ledger pass

Create a deterministic local fixture of **10,000 transactions**, spread across 20 categories and 18 months, with all amounts represented as `Long` minor units. Do not use customer data. Record the device model, Android API level, test build, and fixture generator revision.

From a cold launch, open Activity, scroll continuously through the oldest records, filter by income and expense, search a known note, change months in Insights, and open Settings. Record any visible hitch, ANR, crash, unbounded memory increase, or inaccessible result. A release is blocked by a crash, ANR, data inconsistency, or a repeatable interaction failure; otherwise the observations establish the baseline for the next pass.

When the measured baseline indicates a regression or broad product expansion increases UI complexity, add a Macrobenchmark module to measure startup and list scrolling. Macrobenchmark is designed for whole-app interactions such as startup and scrolling a `LazyColumn`.[3]

## References

[1]: https://developer.android.com/develop/ui/compose/accessibility/semantics "Android Developers — Semantics in Jetpack Compose"
[2]: https://developer.android.com/guide/topics/ui/accessibility/testing "Android Developers — Test your app's accessibility"
[3]: https://developer.android.com/topic/performance/benchmarking/macrobenchmark-overview "Android Developers — Write a Macrobenchmark"
