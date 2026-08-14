# Native Android Validation Strategy

The Kotlin app follows staged validation. **P0 checks are required before the Room foundation is considered production-ready.** Instrumentation, Compose UI, and performance suites are deliberately separated rather than blocking small local-first changes before the project has a repeatable native build path.

| Tier | Scope | Required now |
| --- | --- | --- |
| P0 — correctness and build | Financial unit tests; Room DAO tests; legacy import instrumentation test; schema export; `test`, `lint`, and `assembleDebug`. | Yes |
| P1 — interaction reliability | Compose tests for add, delete, category-management, empty, and validation states; rotation and process-recreation tests. | After P0 is green |
| P2 — scale and resilience | Large-ledger performance, accessibility scans, migration regression suite, and low-end-device profiling. | Before broad product expansion |

## P0 acceptance checks

1. Money remains in `Long` minor units through model, DAO, and summary calculations.
2. Room DAO ordering, unique category constraints, deletes, and preference upserts behave deterministically.
3. The former `SharedPreferences` payload imports valid records exactly once, skips malformed records, and cannot reappear after a reset.
4. Room-generated schema JSON is checked into `app/schemas` for the initial database version and for every later migration.
5. A fresh checkout can run `./gradlew test lint assembleDebug` on an Android-capable runner.

The sandbox cannot run the Android toolchain because it does not provide an Android SDK. The project therefore includes a Gradle wrapper and a native CI workflow so P0 validation runs on GitHub Actions or Android Studio.
