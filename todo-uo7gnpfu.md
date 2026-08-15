# Project TODO

- [x] Audit the current Expense Tracker implementation, architecture, and release configuration.
- [x] Document the app’s established mobile design and user flows in `design.md`.
- [x] Prioritize production-readiness issues across reliability, security, performance, accessibility, and maintainability.
- [x] Harden ledger validation, schema normalization, and ordered local persistence against malformed or racing data updates.
- [x] Improve add-transaction behavior with configured currency symbols, accessibility metadata, guardrails, and saving feedback.
- [x] Improve ledger and shared controls for scalable rendering, clearer destructive actions, and screen-reader support.
- [x] Remove unused native capabilities and tighten Expo release, privacy, and deep-link configuration.
- [x] Generate and apply a production-ready Expense Tracker application icon and branding configuration.
- [x] Add regression tests and validate type safety, linting, tests, and the Expo configuration.
- [x] Save a checkpoint containing the verified production-readiness improvements.
- [x] Commit the verified production-hardening changes to the selected GitHub repository.
- [x] Define and document encrypted backup, transaction-editing, and monthly-budget user flows.
- [x] Implement password-protected export and import of the local ledger.
- [x] Implement transaction editing with validated updates and persistent changes.
- [x] Implement monthly budget targets, progress tracking, and overspend alerts.
- [x] Add regression tests and validate the new backup, editing, and budget features.
- [x] Save a checkpoint containing the verified backup, editing, and budget enhancements.
- [x] Define recurring transaction, category-budget, and biometric backup-security user flows.
- [x] Implement recurring transaction schedules with safe catch-up generation and local persistence.
- [x] Implement category-level spending targets, progress tracking, and overspend alerts.
- [x] Implement optional biometric protection for backup export and restore actions.
- [x] Add regression tests and validate recurring, category-budget, and biometric security behavior.
- [x] Save a checkpoint containing the verified recurring, category-budget, and biometric enhancements.
- [x] Define flexible recurrence, split-transaction, CSV portability, budget-widget, and Android build automation flows.
- [x] Implement weekly and custom recurrence frequencies with safe catch-up processing.
- [x] Implement validated split-transaction allocation across multiple categories.
- [x] Implement user-accessible CSV export and import with safe validation and conflict handling.
- [x] Add a budget-widget support surface and an Android APK build workflow for repository pushes.
- [x] Add regression tests and validate the expanded finance, CSV, and automation behavior.
- [x] Save a checkpoint containing the verified schedule, split, CSV, widget, and automation enhancements.
- [x] Define signed release, editable split-expense, and third-party CSV mapping requirements.
- [x] Implement editing of existing split-expense allocations with atomic persistence.
- [x] Implement guided source-column mapping for third-party CSV imports.
- [x] Implement signed release APK and AAB artifacts in the GitHub Actions workflow with documented secure secret configuration.
- [x] Add regression tests and validate split editing, CSV mapping, and release workflow behavior.
- [x] Save a checkpoint containing the verified release, split-editing, and CSV-mapping enhancements.
- [x] Audit the Kotlin native ledger persistence and document a non-destructive Room migration path.
- [x] Add Room schema, DAO, repository, and native Android dependency configuration.
- [x] Migrate legacy SharedPreferences ledger data into Room and connect the Kotlin UI state to the repository.
- [x] Add ledger integrity tests and validate the Kotlin Android build configuration.
- [x] Save a checkpoint containing the verified native Android Room modernization.
- [x] Commit the accumulated application and Kotlin native modernization changes to the selected GitHub repository.
- [x] Update the native Android current-state record and separate P0 validation from future instrumentation and UI tests.
- [x] Audit generated Room schema configuration, DAO constraints, and legacy SharedPreferences import behavior.
- [x] Add Room DAO and legacy-import instrumentation test coverage with a native Gradle build-readiness path.
- [x] Validate and commit the completed focused Kotlin Room audit to GitHub.
- [x] Inspect the Compose UI testing seams and record the native quality-milestone scope.
- [x] Add Compose UI tests for transaction addition, deletion, and category-management flows.
- [x] Add Room migration-test scaffolding and document the required version-two migration contract.
- [x] Define and validate an accessibility and large-ledger performance pass for the native Android app.
- [x] Validate, checkpoint, and commit the native Android quality milestone to GitHub.
- [x] Align Expo SDK 54 dependency versions reported by Expo Doctor and verify the existing Expo app still passes tests, lint, and type checks.
- [x] Record the committed native quality milestone without waiting for further CI monitoring.
- [x] Audit recent Expo and native Kotlin changes for discrepancies, duplicate configuration, and inappropriate hardcoded values.
- [x] Centralize confirmed configuration values and correct consistency defects without changing product behavior.
- [x] Run full regression validation and document the repository consistency audit findings.
- [x] Checkpoint and commit the completed repository consistency audit to GitHub.
- [x] Investigate the reported split-across-categories defect across creation, validation, persistence, rendering, and editing.
- [x] Add regression coverage and implement a focused repair for split-across-categories behavior.
- [x] Validate, checkpoint, and commit the split-expense defect fix to GitHub.

- [x] Fix split-expense mobile layout clipping at the left edge and validate the corrected safe-area behavior.
- [x] Run split-expense regression checks and save a checkpoint for the UI fix.

- [x] Reconcile the approved native Android modernization specification with the current repository records and document any required corrections or next milestone.
- [ ] Correct the native CI status record and make the Room-and-Compose instrumentation flow deterministic on the API 29 emulator.
- [x] Add focused rotation and process-recreation coverage for the Room-backed Compose ledger before the next native release candidate.
- [ ] Establish native release-security evidence for signing, R8/minification, exported components, backup behavior, and production logging before a signed Kotlin release.
- [ ] Implement the approved native stability milestone: deterministic emulator CI, lifecycle resilience coverage, and signed-release security evidence.
- [ ] Provision protected native signing secrets in GitHub Actions and verify a manually dispatched signed APK/AAB release run.

- [x] Standardize all GitHub Actions workflows on Node.js 24, actions/setup-java@v5, and compatible current action versions; validate native and Expo CI.

- [ ] Replace the flaky API 29 third-party emulator CI step with an Android Gradle Managed Device and verify connected instrumentation in GitHub Actions.

- [ ] Repair the remaining Compose add/delete test selector and rerun the managed-device API 29 instrumentation gate.

- [ ] Expose and verify a stable transaction-delete UI test seam for the managed-device Compose test.
