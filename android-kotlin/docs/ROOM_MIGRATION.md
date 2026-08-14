# Room Ledger Migration

## Scope

The native Android ledger now uses Room as its on-device source of truth. The initial schema stores transactions, categories, and the selected currency in separate indexed tables. Monetary values remain `Long` minor units.

The build uses Room **2.7.2** with KSP. This matches the project’s Kotlin 2.0 baseline; the official Room release notes recommend KSP for Kotlin sources and state that Room 2.7+ targets Kotlin 2.0 with KSP2 support.[1]

## Legacy-data import

The previous implementation stored one JSON payload at `expense_tracker_ledger/ledger-v1` in `SharedPreferences`. On the first Room-backed launch, the repository reads that payload, validates its transaction and category records, inserts valid data into a single Room transaction, and records a completion marker. It does not delete the old payload during normal migration.

This approach avoids destructive migration because it is a **storage-engine transition**, not a version change to an existing Room database. Future Room schema versions must add explicit `Migration` objects and must not use destructive fallback migration.

## Reset behavior

Reset clears Room records, restores default categories and USD, and removes the legacy JSON payload so an intentional reset cannot re-import old data on a subsequent launch.

## Validation

The native suite includes Room persistence contract coverage for stable transaction identity, integer minor-unit amounts, default-category identity, and the singleton currency preference. The P0 command is `./gradlew test lint assembleDebug`; the Room instrumentation suite runs with `./gradlew connectedDebugAndroidTest` on an emulator or the native CI workflow.

## References

[1]: https://developer.android.com/jetpack/androidx/releases/room "Android Developers — Room release notes and dependency setup"
