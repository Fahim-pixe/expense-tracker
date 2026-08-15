# Current Native Android Project State

**Last updated:** Repository consistency audit

## Product boundary

The Kotlin application is a **private, local-first** Android expense tracker. Its current product scope is intentionally limited to income and expense entry, custom categories, local currency choice, monthly summaries, category totals, activity history, and local reset. It does not currently include accounts, transfers, cloud synchronization, authentication, or a backend.

## Implemented architecture

| Area | Current implementation | Audit status |
| --- | --- | --- |
| UI | Jetpack Compose and Material 3 screens, backed by `FinanceViewModel`. | Retained; state is consumed directly by the current Compose UI. |
| State | Mutable Compose state refreshed from a Room-backed `Flow<FinanceState>`. | Appropriate for the present app size; no global mutable store. |
| Domain | Immutable financial models using `Long` minor units. | Financial representation is suitable for P0. |
| Persistence | Room 2.7.2 with KSP and variant-safe schema export, entities for transactions, categories, and singleton preferences. | Authoritative ledger store. |
| Legacy import | One-time validated import from the former `SharedPreferences` JSON ledger. | Preserved for data continuity; completion marker is written only after the Room transaction succeeds. |
| Build tooling | Gradle Kotlin DSL with AGP 8.7.3, Kotlin 2.0.21, Compose, API 26 minimum, committed Gradle 8.9 wrapper, and native CI. | Local Java 17 build, lint, unit tests, and instrumentation APK packaging pass. |

## Room audit decisions

The Room database separates transactions, categories, and currency preferences. Transactions are indexed by category, date, and creation timestamp; categories have a unique name-and-type index. DAO mutations used by category removal and legacy import run inside Room transactions. The app does not use destructive Room migrations.

`SharedPreferences` remains only as a narrowly scoped legacy import source and completion marker. It is not the live ledger source of truth. A local reset clears both Room records and the legacy payload, preventing old records from being unintentionally reimported.

## P0 verification status

| Check | Evidence | Status |
| --- | --- | --- |
| Version-one schema | `app/schemas/com.fahimpixe.expensetracker.data.local.FinanceDatabase/1.json` is generated for the Room v1 contract. | Ready to commit |
| DAO runtime behavior | In-memory Room instrumentation coverage verifies ordering, deletion, unique category identity, and currency preference upserts. | Compiles locally; executes in native CI |
| Legacy import | Instrumentation coverage validates non-destructive import, malformed-record rejection, idempotency, and reset protection. | Compiles locally; executes in native CI |
| Compose interaction | Instrumentation coverage drives add, delete, and custom-category management through the real app. | Compiles locally; executes in native CI |
| Migration safety | A version-one schema recreation test and explicit future-migration registry are committed with a version-two contract. | Compiles locally; executes in native CI |
| Native build | `./gradlew test lint assembleDebug assembleDebugAndroidTest` succeeds with Java 17. | Complete locally |
| CI execution | Dedicated workflow runs build checks and `connectedDebugAndroidTest` on a stable headless API 29 emulator. | Pending first pushed run |

## Quality validation status

The native quality record now specifies release-candidate accessibility coverage for TalkBack and large text, plus deterministic large-ledger validation before changes to list, search, summary, or persistence behavior. No new product capability is introduced by this milestone.

## Configuration consistency

The native database name, legacy preference identifiers, migration marker, default currency, supported currencies, and primary brand color are centralized in `NativeAppConfig`. The separate Expo and Kotlin package identifiers intentionally identify different application artifacts; changes to either require an explicit release migration rather than a mechanical rename. The full cross-platform audit is recorded in [`../../docs/REPOSITORY_CONSISTENCY_AUDIT.md`](../../docs/REPOSITORY_CONSISTENCY_AUDIT.md).
