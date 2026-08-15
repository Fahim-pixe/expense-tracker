# Production Modernization Specification — Adoption Record

**Status:** Adopted with repository-specific amendments  
**Scope:** `android-kotlin` only  
**Governing specification:** [`PRODUCTION_MODERNIZATION_SPEC.md`](./PRODUCTION_MODERNIZATION_SPEC.md)

## Decision

The production modernization specification is the governing product-engineering direction for the native Kotlin application. Its core directives are adopted without change: incremental modernization; privacy-first and local-first operation; integer minor units for money; Room as the authoritative ledger; avoidance of speculative backend, cloud, account, transfer, and authentication work; and validation before expansion.

The repository also contains a separate Expo implementation. The specification’s prohibition on cross-platform frameworks applies to the **native Kotlin application** and does not require removal or replacement of that separate artifact.

## Reconciliation of the completed milestone

The earlier native quality-milestone summary is directionally accurate but must not be treated as a complete release-readiness declaration. Compose coverage, Room migration scaffolding, schema export, Java 17 build/lint/test packaging, and documented accessibility/large-ledger procedures are present. However, the first observed GitHub Actions execution of **Native Kotlin Android** failed in `connectedDebugAndroidTest`: `ExpenseTrackerUiTest.user_can_add_delete_and_manage_local_ledger_records` exceeded its five-second Compose wait condition on the API 29 emulator.

Accordingly, local build and packaging success is valid evidence, but the claims that native emulator instrumentation checks passed and that native CI is fully green are **not yet accurate**. The state record must describe remote instrumentation as blocked until that test is made deterministic and a subsequent GitHub Actions run passes.

## Adopted release gates

| Priority | Requirement | Completion evidence |
| --- | --- | --- |
| P0 — immediate | Make the Room-and-Compose instrumentation flow deterministic, then obtain a successful API 29 `connectedDebugAndroidTest` GitHub Actions run. | Linked successful workflow run and updated `PROJECT_STATE.md`. |
| P1 — next native release candidate | Add rotation and process-recreation coverage for the Room-backed Compose ledger. Run the accessibility and large-ledger validation cadence when its trigger conditions apply. | Focused tests plus the recorded device/API evidence required by `QUALITY_VALIDATION.md`. |
| P2 — signed native release | Establish release-security evidence for signing, R8/minification decision, exported components, backup behavior, and production logging. | Release checklist and successful signed release compilation. |

## Clarifications that prevent unnecessary work

The specification’s conceptual models for accounts, transfers, goals, attachments, and recurring rules remain conditional. They must not be added unless a validated product requirement justifies them. Material 3 Expressive is a preferred direction, not an automatic dependency upgrade; it requires a compatibility and design review before adoption. The existing `PROJECT_STATE.md`, `ROOM_MIGRATION.md`, `MIGRATION_CONTRACT.md`, `TESTING.md`, and `QUALITY_VALIDATION.md` collectively provide the architecture, database, testing, and operational documentation required by the specification; keep them accurate rather than duplicating generic documents.

## Operating rule

Before accepting any future native milestone, update `PROJECT_STATE.md`, run the applicable tiered checks, and keep the documented status consistent with the latest local and GitHub Actions evidence. No failure may be bypassed solely to claim a green build.
