# Signed Android release builds

The **Build Android artifacts** workflow always creates a debug APK on every push. It also builds a signed release APK and AAB when the four Android signing secrets below are configured in the repository’s Actions secrets. GitHub does not expose secret values to workflow logs; the workflow decodes the keystore only inside the ephemeral runner and removes it after Gradle finishes.[1]

| Secret                      | Value                                                    |
| --------------------------- | -------------------------------------------------------- |
| `ANDROID_KEYSTORE_BASE64`   | A one-line Base64 encoding of the release keystore file. |
| `ANDROID_KEY_ALIAS`         | The signing key alias in that keystore.                  |
| `ANDROID_KEYSTORE_PASSWORD` | The keystore password.                                   |
| `ANDROID_KEY_PASSWORD`      | The private-key password.                                |

Create these values under the repository’s **Settings → Secrets and variables → Actions** area. The repository connection used here cannot enumerate or create its existing secrets, so this configuration remains under the repository owner’s control. If any required secret is absent, the workflow succeeds with the debug APK and records that signed release artifacts were skipped.

For a release keystore created on Linux, encode it without line wrapping:

```bash
base64 -w 0 expense-tracker-release.keystore > expense-tracker-release.base64
```

Use the resulting file content only as the `ANDROID_KEYSTORE_BASE64` secret. Do not commit the keystore, its Base64 text, passwords, or aliases to the repository. Download the signed `app-release.apk` and `app-release.aab` from the `expense-tracker-signed-release-<commit>` workflow artifact after a successful signed run.

## References

[1]: https://docs.github.com/actions/security-guides/using-secrets-in-github-actions "GitHub Docs — Using secrets in GitHub Actions"
