# Current Native Android Project State

**Last updated:** Room persistence audit and P0 build-readiness milestone

## Product boundary

The Kotlin application is a **private, local-first** Android expense tracker. Its current product scope is intentionally limited to income and expense entry, custom categories, local currency choice, monthly summaries, category totals, activity history, and local reset. It does not currently include accounts, transfers, cloud synchronization, authentication, or a backend.

## Implemented architecture

| Area | Current implementation | Audit status |
| --- | --- | --- |
| UI | Jetpack Compose and Material 3 screens, backed by `FinanceViewModel`. | Retained; state is consumed directly by the current Compose UI. |
| State | Mutable Compose state refreshed from a Room-backed `Flow<FinanceState>`. | Appropriate for the present app size; no global mutable store. |
| Domain | Immutable financial models using `Long` minor units. | Financial representation is suitable for P0. |
| Persistence | Room 2.7.2 with KSP, entities for transactions, categories, and singleton preferences. | Authoritative ledger store. |
| Legacy import | One-time validated import from the former `SharedPreferences` JSON ledger. | Preserved for data continuity; completion marker is written only after the Room transaction succeeds. |
| Build tooling | Gradle Kotlin DSL with AGP 8.7.3, Kotlin 2.0.21, Compose, API 26 minimum, and the committed Gradle 8.9 wrapper. | `test lint assembleDebug` passes under Java 17. |

## Room audit decisions

The Room database separates transactions, categories, and currency preferences. Transactions are indexed by category, date, and creation timestamp; categories have a unique name-and-type index. DAO mutations used by category removal and legacy import run inside Room transactions. The app does not use destructive Room migrations.

`SharedPreferences` remains only as a narrowly scoped legacy import source and completion marker. It is not the live ledger source of truth. A local reset clears both Room records and the legacy payload, preventing old records from being unintentionally reimported.

## P0 verification status

| Check | Evidence | Status |
| --- | --- | --- |
| Version-one schema | `app/schemas/com.fahimpixe.expensetracker.data.local.FinanceDatabase/1.json` is generated and committed. | Complete |
| DAO runtime behavior | In-memory Room instrumentation coverage verifies transaction ordering and deletion, unique category identity, and currency preference upserts. | Compiles locally; executes on CI emulator |
| Legacy import | Instrumentation coverage validates non-destructive import, malformed-record rejection, idempotency, and reset protection. | Compiles locally; executes on CI emulator |
| Native build | `./gradlew test lint assembleDebug` succeeds with Java 17; the debug instrumentation APK also assembles. | Complete |
| CI execution | The dedicated workflow runs build checks and `connectedDebugAndroidTest` on a stable headless API 29 emulator. | Pending the corrected GitHub Actions run |

No new product capability is introduced by this milestone. The next scope should begin only after the CI emulator run is green.
