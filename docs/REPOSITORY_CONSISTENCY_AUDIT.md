
# Repository Consistency Audit

**Scope:** Expo application configuration, local file handling, Android widget behavior, and the standalone Kotlin ledger.

## Resolved findings

| Finding | Risk | Resolution |
| --- | --- | --- |
| OAuth derived a callback scheme from a hardcoded package identifier while Expo configured `expense-tracker`. | Native sign-in callbacks could target a scheme the app did not register. | Both OAuth redirects and widget URI actions now use `appIdentity.scheme`. |
| Expo name, slug, scheme, package identifier, widget metadata, file prefixes, storage key, and import limit were repeated across runtime files. | Changes could leave export, backup, widget, or configuration behavior out of sync. | `constants/app-config.js` is the shared source for operational Expo constants; it remains JavaScript so dynamic Expo config evaluation can load it. |
| Widget colors and the overview-card shadow were inline literals. | Brand changes required edits in unrelated UI surfaces. | Widget visual tokens and overview branding tokens are centralized in typed configuration. |
| Native database name, legacy preference identifiers, migration marker, default currency, and primary brand color were repeated. | A future rename could break legacy import/reset behavior or create palette drift. | `NativeAppConfig` now owns stable native identifiers and defaults; Android XML references a named color resource. |
| Native Compose emitted deprecated directional and trend icon warnings. | Future Compose upgrades could produce avoidable compatibility issues. | Directional and trend indicators use AutoMirrored icons. |

## Intentional values retained

| Value class | Reason for retaining it near the domain or platform |
| --- | --- |
| Built-in category labels, icon names, and category colors | These are default ledger catalog data, not generic application configuration. |
| The Expo package identifier and Kotlin package namespace | They identify separate application artifacts. They are documented independently and must not be changed together without an explicit migration/release decision. |
| User-facing validation text and accessible labels | They remain adjacent to their behavior so the UI and its accessibility copy evolve together. |

## Validation evidence

The audit completed with the Expo regression suite, lint, TypeScript check, and Expo Doctor green. The Kotlin module completed `test`, `lint`, and `assembleDebug` with Java 17. The audit did not change data schemas, financial arithmetic, export formats, or local storage key values.
