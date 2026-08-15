# Native Android Release Security

The native Kotlin application is local-first and carries financial records. A signed release is therefore permitted only when every item in this record has evidence. This document governs the `android-kotlin` artifact; it does not alter the separate Expo release workflow.

## Release controls

| Control | Current implementation | Required evidence before distribution |
| --- | --- | --- |
| Signing | `release` accepts a keystore path, alias, and passwords only through Gradle properties or environment variables. No signing value is stored in source control. | A manually triggered **Signed release security verification** GitHub Actions run succeeds. |
| Secret handling | The keystore is decoded into the job build directory with restrictive permissions and is never uploaded as an artifact. Repository access did not permit secret inventory from this environment. | Repository administrators configure the four named Actions secrets below and verify their rotation ownership. |
| Shrinking | Release builds enable R8 and resource shrinking. | `assembleRelease` and `bundleRelease` pass using the signing configuration. |
| Exported components | The manifest exposes only the launcher `MainActivity`; its `exported="true"` setting is required for the launcher intent. | Manifest review confirms no unexpected exported component or permission. |
| Backup behavior | Android platform backup is disabled with `android:allowBackup="false"` to avoid unreviewed backup transport for the local financial ledger. | Release manifest review confirms the setting remains disabled unless an explicit encrypted-backup product requirement is approved. |
| Logging | The app must not emit transaction contents, balances, private notes, or credentials in production logs. | Source review and release build review show no sensitive production logging. |

## Required GitHub Actions secrets

| Secret | Purpose |
| --- | --- |
| `NATIVE_ANDROID_KEYSTORE_BASE64` | Base64-encoded release keystore bytes. |
| `NATIVE_ANDROID_KEY_ALIAS` | Alias of the release signing key. |
| `NATIVE_ANDROID_KEYSTORE_PASSWORD` | Password protecting the keystore. |
| `NATIVE_ANDROID_KEY_PASSWORD` | Password protecting the signing key. |

The signed-release job is available only through manual dispatch with **Build and verify signed native APK/AAB artifacts** enabled. It validates that all required secrets are present, produces an APK and AAB, verifies the APK signature with `apksigner`, and uploads only the signed release artifacts. A failed or unconfigured signing invocation is a release blocker, not a reason to fall back to an unsigned artifact.

## Local verification

For an unsigned R8 compatibility check, run `./gradlew assembleRelease` with Java 17. For a distributable artifact, use the manually dispatched GitHub Actions job after the repository secrets are provisioned. Do not place a keystore, passwords, or a release-signing property file inside the repository.

