# Android APK Workflow

Every push to the repository triggers the **Build Android artifacts** workflow. It installs the locked JavaScript dependencies, regenerates the managed Android project from `app.config.ts`, and uploads an installable **debug APK** as a workflow artifact.

The debug artifact is appropriate for internal testing and device validation. When protected signing secrets are configured, the workflow also uploads a signed release APK and AAB. See [`android-release-signing.md`](./android-release-signing.md) for the secure setup requirements.

## Retrieving an APK

Open the repository’s **Actions** tab, select the relevant **Build Android artifacts** run, and download the `expense-tracker-debug-apk-<commit>` artifact after the build succeeds. With signing configured, the same run also provides the `expense-tracker-signed-release-<commit>` artifact.

The workflow runs `expo prebuild` before Gradle so the Android Budget Snapshot widget configuration is generated from the current Expo app configuration on every build.
