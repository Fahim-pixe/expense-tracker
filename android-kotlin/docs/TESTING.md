# Native Android Validation Strategy

The Kotlin app follows staged validation. **P0 checks are required before the Room foundation is considered production-ready.** The focused Compose flows and migration baseline now run on the native instrumentation path; broader accessibility and scale checks remain separate release-quality gates.

| Tier | Scope | Required now |
| --- | --- | --- |
| P0 — correctness and build | Financial unit tests; Room DAO tests; legacy import instrumentation test; schema export; `test`, `lint`, and `assembleDebug`. | Yes |
| P1 — interaction reliability | Compose tests for add, delete, and category-management; remaining empty, validation, rotation, and process-recreation coverage. | Compose core flows are required now; remaining flows follow feature changes. |
| P2 — scale and resilience | Large-ledger performance, accessibility scans, migration regression suite, and low-end-device profiling. | Run to the cadence in `QUALITY_VALIDATION.md`. |

## P0 acceptance checks

1. Money remains in `Long` minor units through model, DAO, and summary calculations.
2. Room DAO ordering, unique category constraints, deletes, and preference upserts behave deterministically.
3. The former `SharedPreferences` payload imports valid records exactly once, skips malformed records, and cannot reappear after a reset.
4. Room-generated schema JSON is checked into `app/schemas` for the initial database version and for every later migration.
5. A fresh checkout can run `./gradlew test lint assembleDebug` on an Android-capable runner.

The repository includes a Gradle wrapper and native CI build path. Local validation requires an installed Android SDK and Java 17; CI provides repeatable emulator execution.
