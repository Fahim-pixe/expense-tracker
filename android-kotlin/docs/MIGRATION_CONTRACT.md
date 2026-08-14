# Database Migration Contract

The native ledger is currently at **Room schema version 1**. The committed JSON schema in `app/schemas` is the immutable starting point for every later migration test. The app intentionally has no destructive-migration fallback; financial history must remain local and intact through supported upgrades.

## Required version-two procedure

| Step | Required change | Evidence |
| --- | --- | --- |
| 1 | Change entities and increment `FinanceDatabase` to version 2. | New schema is generated at `app/schemas/.../2.json`. |
| 2 | Define an explicit `Migration(1, 2)` for complex changes, or an `AutoMigration` only when Room can unambiguously derive the upgrade. | The database builder registers the upgrade through `FinanceDatabaseMigrations.all`. |
| 3 | Extend `FinanceDatabaseMigrationScaffoldTest` to seed a version-one database, run `1 → 2`, and assert every retained financial field and preference. | Emulator instrumentation test passes. |
| 4 | Run the complete native suite before merging. | `./gradlew test lint assembleDebug connectedDebugAndroidTest` succeeds. |
| 5 | Review the exported schema diff and update `PROJECT_STATE.md`. | Schema history and current-state record are committed together. |

The baseline test already opens the exported version-one schema, seeds a category, a transaction in integer minor units, and a currency preference, then validates the same schema and records. The version-two test must preserve these checks and add assertions specific to the change being made.

> Room migration tests recreate older schema versions from exported JSON, then validate the database after migrations. Store the schema history in version control and test the migration path rather than allowing a destructive reset.[1]

## Prohibited shortcuts

Do not add `fallbackToDestructiveMigration`, silently delete the schema JSON, replace `FinanceDatabaseMigrations.all` with an unregistered migration, or treat a fresh-install test as proof of upgrade safety. Those approaches can destroy or fail to preserve an existing local ledger.

## References

[1]: https://developer.android.com/training/data-storage/room/migrating-db-versions "Android Developers — Migrate your Room database"
