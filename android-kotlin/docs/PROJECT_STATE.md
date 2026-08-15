# Current Native Android Project State

**Last updated:** Native stability and release-security hardening

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
| Compose interaction | Independent instrumentation tests cover add/delete and custom-category flows; waits now target stable UI states with a 15-second emulator budget. | Compiles locally; requires a successful post-change API 29 GitHub Actions run. |
| Lifecycle resilience | Compose instrumentation verifies configuration recreation retains the active transaction sheet and draft fields. A separate Room repository instrumentation test verifies persisted ledger recovery through a fresh database/repository instance. | Compiles locally; requires a successful post-change API 29 GitHub Actions run. |
| Migration safety | A version-one schema recreation test and explicit future-migration registry are committed with a version-two contract. | Compiles locally; executes in native CI |
| Native build | `./gradlew test lint assembleDebug assembleDebugAndroidTest` succeeds with Java 17. | Complete locally |
| CI execution | Dedicated workflow runs build checks and `connectedDebugAndroidTest` on a headless API 29 emulator. | The former five-second combined-flow timeout is repaired in source; do not treat native CI as green until the replacement GitHub Actions run succeeds. |

## Quality validation status

The native quality record now specifies release-candidate accessibility coverage for TalkBack and large text, plus deterministic large-ledger validation before changes to list, search, summary, or persistence behavior. Configuration recreation and Room-backed process restart now have focused instrumentation coverage. No new product capability is introduced by this milestone.

### Current CI investigation

The API 29 build/lint job passes remotely. The subsequent `connectedDebugAndroidTest` job remains blocked in `ExpenseTrackerUiTest` despite splitting the prior combined flow, adding stable action tags, extending the emulator wait budget, and publishing direct Room snapshots after mutations. The latest failed workflow is **31901789911** (commit `f89d0ac`); it times out while waiting for the Activity transaction action and custom-category removal state. This is a real release blocker. The next repair must introduce explicit initialization/mutation-idle coordination or refactor the UI test around a deterministic test seam; it must not be bypassed or relabeled as green.

## Configuration consistency

The native database name, legacy preference identifiers, migration marker, default currency, supported currencies, and primary brand color are centralized in `NativeAppConfig`. The separate Expo and Kotlin package identifiers intentionally identify different application artifacts; changes to either require an explicit release migration rather than a mechanical rename. The full cross-platform audit is recorded in [`../../docs/REPOSITORY_CONSISTENCY_AUDIT.md`](../../docs/REPOSITORY_CONSISTENCY_AUDIT.md).

## Release-security status

The Kotlin release build now enables R8 and resource shrinking, disables Android platform backup, and supports external signing configuration without tracking a keystore or password. The manually dispatched signed-release workflow requires protected repository secrets, builds APK/AAB artifacts, and verifies the APK signature. Actual signing evidence remains pending until a repository administrator provisions the secrets and runs that workflow successfully; see [`RELEASE_SECURITY.md`](./RELEASE_SECURITY.md).

## CI toolchain policy

All JavaScript workflows use Node.js 24 from the repository `.nvmrc` through `actions/setup-node@v7`; `package.json` constrains Node to `>=24 <25` and pnpm to `9.12.0`. Android workflows use Temurin Java 17 through `actions/setup-java@v5`; checkout and artifact actions use `@v7`, and the emulator runner is pinned to `v2.38.0`. Local Expo type checking, tests, lint, frozen-lockfile installation, workflow formatting, and native Java 17 build/test/lint/package validation passed after this change. The remote API 29 Compose instrumentation issue documented above remains independent of these runtime upgrades.
