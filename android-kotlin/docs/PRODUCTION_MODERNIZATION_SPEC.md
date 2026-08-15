
# EXPENSE TRACKER
## Production-Grade Native Android Modernization & Product Engineering Specification

You are acting as a Principal Android Engineer, Software Architect, Product Engineer, UX Engineer, Security Engineer, QA Engineer, and Performance Engineer.

You are working on an EXISTING native Android Expense Tracker application written in Kotlin.

This is NOT a greenfield project.

The application already exists and contains working functionality.

Your responsibility is to progressively transform the existing application into a polished, reliable, efficient, privacy-first, production-grade Android product WITHOUT unnecessarily rewriting the existing application.

============================================================
0. ABSOLUTE ENGINEERING DIRECTIVES
============================================================

These rules override all implementation assumptions.

1. DO NOT rewrite the application from scratch.
2. DO NOT migrate away from Kotlin/Android.
3. DO NOT introduce React Native, Flutter, Kotlin Multiplatform, or another mobile framework.
4. DO NOT introduce a backend merely because production applications commonly use one.
5. DO NOT introduce authentication unless product requirements justify it.
6. DO NOT introduce cloud synchronization unless explicitly justified.
7. DO NOT expand the product into a massive financial-management platform without validated requirements.
8. DO NOT replace working code simply because another architecture is more fashionable.
9. DO NOT make architectural changes without understanding the current implementation.
10. DO NOT sacrifice reliability for feature count.
11. DO NOT sacrifice privacy for analytics.
12. DO NOT sacrifice financial correctness for convenience.
13. DO NOT remove existing functionality unless it is demonstrably harmful or obsolete.
14. Prefer incremental modernization over large rewrites.
15. Every architectural change must have a reason.

CORE PRINCIPLE:

    Preserve → Inspect → Stabilize → Improve → Validate → Expand

NOT:

    Rewrite → Add everything → Debug later


============================================================
1. CURRENT PROJECT STATE
============================================================

IMPORTANT:

The project has ALREADY undergone an initial persistence modernization.

The Kotlin ledger persistence has been migrated from:

    SharedPreferences

to:

    Room

Therefore:

DO NOT treat SharedPreferences → Room as an uncompleted migration.

Instead:

1. Audit the existing Room implementation.
2. Verify schema correctness.
3. Verify entities.
4. Verify DAOs.
5. Verify relationships.
6. Verify migrations.
7. Verify indexes.
8. Verify transaction handling.
9. Verify data integrity.
10. Verify that all existing functionality correctly uses Room.
11. Identify any remaining legacy SharedPreferences usage.
12. Keep SharedPreferences only where it is genuinely appropriate.
13. Migrate remaining inappropriate persistence usage only when justified.

The Room migration is a FOUNDATION, not the final objective.


============================================================
2. PRIMARY PRODUCT PHILOSOPHY
============================================================

The product is a:

    Privacy-first
    Local-first
    Fast
    Reliable
    Simple
    Modern
    Personal Expense Tracker

The application should help users:

- Record expenses quickly
- Understand where money is going
- Track income
- Monitor spending
- Manage budgets
- Analyze trends
- Maintain financial records
- Export their data
- Control their own data

The application should NOT become unnecessarily complicated.

Production-grade does NOT mean:

- More screens
- More dependencies
- Cloud infrastructure
- AI everywhere
- Social features
- Banking integrations
- Complex enterprise architecture

Production-grade means:

- Correctness
- Reliability
- Security
- Performance
- Maintainability
- Accessibility
- Good UX
- Data integrity
- Predictable behavior


============================================================
3. PHASE 0 — REPOSITORY AUDIT
============================================================

Before making substantial changes, inspect the existing repository.

Do NOT immediately modify code.

Produce an internal architecture assessment covering:

### Project

- Kotlin version
- Android Gradle Plugin
- Gradle version
- compileSdk
- targetSdk
- minSdk
- Compose usage
- Material version
- Current dependencies

### Architecture

Determine whether the project currently uses:

- MVVM
- MVI
- Repository pattern
- Service layer
- Use cases
- Direct database access
- Global state
- Singleton state
- Activity-based state
- ViewModel state

### Persistence

Inspect:

- Room database
- Entities
- DAOs
- Database class
- Type converters
- Migrations
- Queries
- Indexes
- Transactions

### Existing legacy persistence

Search for:

- SharedPreferences
- Preference APIs
- raw file storage
- hardcoded state
- duplicated persistence

Determine what should remain and what should be modernized.

### UI

Inspect:

- Activities
- Composables
- Navigation
- Screens
- Reusable components
- Theme
- Typography
- Colors
- State handling

### Domain logic

Identify:

- Balance calculations
- Expense calculations
- Income calculations
- Category aggregation
- Budget calculations
- Date logic
- Currency logic

### Testing

Identify:

- Unit tests
- Room tests
- ViewModel tests
- Compose UI tests
- Integration tests

### Technical debt

Create a prioritized list:

P0 = correctness/security/data-loss risk
P1 = major reliability/architecture issue
P2 = maintainability/performance issue
P3 = polish/refactoring


============================================================
4. NO BLIND ARCHITECTURAL MIGRATION
============================================================

Do not force the project into an arbitrary architecture.

The target architecture should emerge from the existing codebase.

Preferred conceptual architecture:

    UI
      ↓
    ViewModel
      ↓
    Domain logic / Use Cases where justified
      ↓
    Repository
      ↓
    Room / Local Data Source

However:

DO NOT create dozens of use-case classes merely to satisfy a diagram.

Use abstractions when they provide:

- Testability
- Separation of concerns
- Reusability
- Clear business boundaries


============================================================
5. TARGET ANDROID STACK
============================================================

Remain native Android.

Preferred technologies:

- Kotlin
- Jetpack Compose
- Material 3 Expressive
- ViewModel
- Kotlin Coroutines
- Flow / StateFlow
- Room
- Navigation Compose
- DataStore where appropriate
- Android Keystore for secrets
- WorkManager only when background work is actually required
- Coil or equivalent for image loading if needed

Use current stable versions compatible with the project.

DO NOT upgrade dependencies blindly.

Before major dependency upgrades:

1. Check compatibility.
2. Check breaking changes.
3. Check build stability.
4. Check API changes.
5. Run tests.
6. Validate the application afterward.


============================================================
6. ROOM — CURRENT FOUNDATION
============================================================

Room is now the authoritative local ledger persistence layer.

Verify that the database is designed correctly.

Expected conceptual model:

    Transaction
    Category
    Account
    Budget
    RecurringRule
    Goal
    Attachment
    Settings

Only implement entities that are actually needed.

Do not create speculative tables.


============================================================
7. FINANCIAL DATA MODEL
============================================================

Financial correctness is a P0 requirement.

NEVER use Float or Double as the authoritative representation of money.

Use integer minor units.

Example:

    ৳125.50

should be represented conceptually as:

    12550

with:

    currencyCode = "BDT"

Recommended representation:

    amountMinor: Long
    currencyCode: String

Centralize monetary operations.

Avoid scattered arithmetic throughout the UI.


============================================================
8. TRANSACTION MODEL
============================================================

The transaction model should support the current product requirements.

Conceptually:

    Transaction
    ├── id
    ├── type
    ├── amountMinor
    ├── currencyCode
    ├── categoryId
    ├── accountId
    ├── merchant
    ├── description
    ├── notes
    ├── transactionDate
    ├── createdAt
    └── updatedAt

Do not add fields merely because they appear in a generic finance application.

Every field should have a product purpose.


============================================================
9. TRANSACTION TYPES
============================================================

At minimum support:

    Expense
    Income

Transfers should ONLY be implemented if the current product genuinely requires multiple accounts.

Do not introduce transfer complexity prematurely.


============================================================
10. FAST EXPENSE ENTRY
============================================================

Expense entry is one of the highest-value interactions.

Optimize for:

    Open
      ↓
    Enter amount
      ↓
    Choose category
      ↓
    Save

Avoid forcing users through unnecessary forms.

Defaults should intelligently use:

- Current date
- Recent category
- Recent account where applicable

Users should be able to access advanced fields without being forced to use them.


============================================================
11. TRANSACTION HISTORY
============================================================

The transaction list must be:

- Fast
- Scannable
- Searchable
- Filterable
- Accessible

Display useful grouping such as:

    Today
    Yesterday
    This Week
    Earlier

Each transaction should clearly communicate:

- Category
- Description/merchant
- Date/time
- Amount

Use LazyColumn or appropriate virtualization.

Never load an unnecessarily large dataset into memory.


============================================================
12. EDIT / DELETE SAFETY
============================================================

Editing must be reliable.

Deletion should require appropriate confirmation for destructive operations.

Where appropriate:

    Delete
      ↓
    Undo

Do not permanently destroy important records without user intent.

If the product later supports soft deletion, ensure reporting does not accidentally count deleted transactions.


============================================================
13. CATEGORIES
============================================================

Provide useful default categories.

Examples:

- Food
- Groceries
- Transport
- Bills
- Utilities
- Shopping
- Entertainment
- Education
- Healthcare
- Travel
- Personal
- Other

Allow customization only where it improves the product.

Categories referenced by existing transactions must not be casually destroyed.

Prefer archival/deactivation over destructive deletion.


============================================================
14. DASHBOARD
============================================================

The dashboard should answer:

    "How am I doing financially?"

at a glance.

Prioritize:

- Current balance where applicable
- Total income
- Total expenses
- Net cash flow
- Recent transactions
- Spending overview
- Budget status if budgets exist

Avoid dashboard overload.

Every metric must come from authoritative stored data.

Never fabricate insights.


============================================================
15. BUDGETS
============================================================

Implement budgets only if they are part of the intended product scope.

Support:

- Overall budget
- Category budget
- Period
- Amount
- Spent
- Remaining
- Progress

Use clear states:

    On Track
    Near Limit
    Exceeded

Do not use shame-oriented language.

Example:

    "You've spent ৳7,200 of your ৳8,000 Food budget."


============================================================
16. INSIGHTS
============================================================

Insights must be:

- Data-driven
- Explainable
- Conservative
- Useful

Examples:

    "Food spending increased 18% compared with last month."

    "Transportation was your largest category this month."

Only provide comparisons when enough historical data exists.

Do not manufacture trends from insufficient data.


============================================================
17. LOCAL-FIRST PRINCIPLE
============================================================

The application must remain useful without an internet connection.

For the current privacy-first scope:

    UI
      ↓
    ViewModel
      ↓
    Repository
      ↓
    Room
      ↓
    Local data

The application must not require:

- Internet
- Account
- Cloud service
- Remote database

to perform basic expense tracking.

This is a feature, not a limitation.


============================================================
18. DATA OWNERSHIP
============================================================

The user should retain meaningful control over their financial data.

Provide appropriate:

- Export
- Import
- Delete
- Clear local data

Never make the user dependent on a remote service simply to access their own records.


============================================================
19. IMPORT / EXPORT
============================================================

Support CSV export when appropriate.

Export should contain structured financial information.

Potential formats:

    CSV
    JSON

PDF reports may be introduced later if useful.

Import must use:

    Select file
      ↓
    Parse
      ↓
    Validate
      ↓
    Preview
      ↓
    Confirm
      ↓
    Insert transactionally

Malformed rows must be reported.

Never silently discard financial data.


============================================================
20. DUPLICATE PROTECTION
============================================================

Imports should detect potential duplicates.

Possible signals:

- Date
- Amount
- Merchant
- Category
- Description

Show potential duplicates to the user.

Do not silently delete records.


============================================================
21. DATABASE INTEGRITY
============================================================

Room must use appropriate:

- Primary keys
- Foreign keys
- Indexes
- Constraints
- Transactions

Use database transactions when multiple related records must change atomically.

Example:

    Create transaction
    +
    Update related aggregate
    +
    Save metadata

must not leave partially updated state.

Prefer deriving aggregates from authoritative transaction data where practical rather than maintaining fragile duplicated totals.


============================================================
22. DATABASE MIGRATIONS
============================================================

The SharedPreferences → Room migration has already been performed.

Now ensure:

- Existing data survived correctly.
- Room migrations are explicit.
- Future schema changes use migrations.
- Migrations are tested.
- No production destructive migration is used as a shortcut.

NEVER use:

    fallbackToDestructiveMigration()

as a solution to schema evolution.

If destructive reset is needed during development, it must never be silently used in production.


============================================================
23. SETTINGS STORAGE
============================================================

Use Room for ledger/business data.

Use DataStore for appropriate preferences such as:

- Theme
- Currency preference
- Sort preference
- Notification preference
- Onboarding state

Do not place financial records in preference storage.


============================================================
24. SECURITY
============================================================

Because this application stores financial information, treat security seriously even though the application is local-first.

Protect:

- Exported files
- Sensitive settings
- Authentication credentials if authentication exists
- Encryption keys
- Backup behavior where appropriate

Use Android Keystore for cryptographic key material when encryption is implemented.

Do not hard-code secrets.


============================================================
25. PRIVACY-FIRST DESIGN
============================================================

Do not add invasive analytics.

Do not send financial information to third parties unless explicitly required and transparently disclosed.

Never unnecessarily transmit:

- Transaction amounts
- Merchant names
- Notes
- Account balances
- Receipt contents

Avoid third-party tracking SDKs unless there is a compelling product reason.


============================================================
26. OPTIONAL APP LOCK
============================================================

If valuable to the product, support:

- Device credential
- Fingerprint
- Face authentication where supported

Use Android BiometricPrompt.

Biometric lock should protect local application access.

Do not implement custom biometric cryptography when the Android platform already provides the appropriate mechanism.


============================================================
27. RECEIPTS
============================================================

Receipt attachment is OPTIONAL P1 functionality.

If implemented:

- Camera/gallery
- Image preview
- Compression
- Secure local storage
- Delete
- Validation

Do not introduce cloud image storage just to support receipts.

Prefer private local storage unless there is a deliberate product decision otherwise.


============================================================
28. NOTIFICATIONS
============================================================

Notifications must provide meaningful value.

Potential examples:

- Budget approaching limit
- Recurring expense reminder
- Savings goal reminder

Do not spam.

Respect Android notification permissions and user preferences.


============================================================
29. UX DESIGN SYSTEM
============================================================

Build a coherent design system around:

- Material 3
- Typography
- Spacing
- Shapes
- Icons
- Buttons
- Inputs
- Cards
- Bottom sheets
- Dialogs
- Charts

Avoid random component styling.

Create reusable components only where repetition or consistency justifies them.


============================================================
30. VISUAL DESIGN
============================================================

The application should feel:

- Modern
- Calm
- Trustworthy
- Financial
- Minimal
- Fast

Avoid:

- Excessive gradients
- Excessive glassmorphism
- Excessive animations
- Dense dashboards
- Decorative UI that reduces usability

The interface should prioritize information hierarchy.


============================================================
31. DARK MODE
============================================================

Support:

    System
    Light
    Dark

Dark mode must be designed intentionally.

Do not simply invert colors.

Ensure:

- Text contrast
- Chart readability
- Icon visibility
- Financial indicators
- Input fields
- Dialogs

remain accessible.


============================================================
32. ACCESSIBILITY
============================================================

Support:

- TalkBack
- Content descriptions
- Semantic labels
- Touch target requirements
- Font scaling
- Contrast
- Keyboard navigation where relevant
- Reduced motion where appropriate

Never communicate important information solely through color.

Example:

Do not show:

    RED = exceeded

only.

Also communicate:

    "Budget exceeded"


============================================================
33. UI STATE MODEL
============================================================

Every important screen should explicitly handle:

    Loading
    Success
    Empty
    Error

Where applicable:

    Offline
    Saving
    Saved
    Syncing

Do not leave users staring at blank screens.


============================================================
34. ERROR HANDLING
============================================================

Errors must be:

- Human-readable
- Actionable
- Non-technical

Bad:

    SQLiteException

Good:

    "We couldn't save this expense. Your existing records are safe. Please try again."

Do not expose stack traces or internal implementation details to users.


============================================================
35. VIEWMODEL BOUNDARIES
============================================================

Composables should primarily:

- Render UI state
- Emit events

ViewModels should handle:

- State
- User events
- Repository interactions
- Business orchestration

Do not place:

- Database calls
- Large business calculations
- Persistence logic

directly inside Composables.


============================================================
36. COROUTINES AND FLOW
============================================================

Use structured concurrency.

Avoid:

- Global coroutine scopes
- Unmanaged background jobs
- Blocking the main thread

Use lifecycle-aware collection.

Room Flow should be used where reactive updates provide real value.


============================================================
37. PERFORMANCE
============================================================

Measure before optimizing.

Focus on:

- Startup
- Compose recomposition
- Room queries
- Large transaction lists
- Charts
- Image loading
- Memory
- Battery

Avoid premature optimization.

The goal is:

    Fast enough
    Predictable
    Efficient
    Maintainable


============================================================
38. DATABASE PERFORMANCE
============================================================

Inspect all important queries.

Ensure appropriate indexes for:

- transaction date
- category
- account
- transaction type

Avoid retrieving unnecessary records.

For large datasets, use pagination or appropriate database-backed filtering.


============================================================
39. FINANCIAL CORRECTNESS
============================================================

This is P0.

Test:

- Zero
- Very small amounts
- Large amounts
- Decimal currency values
- Addition
- Subtraction
- Category totals
- Monthly totals
- Income
- Expense
- Refund behavior if supported
- Date boundaries
- Month boundaries
- Year boundaries

Money calculations must be deterministic.


============================================================
40. DATE AND TIME CORRECTNESS
============================================================

Handle:

- Local timezone
- Month boundaries
- Year boundaries
- Midnight
- Leap years

Do not allow timezone conversion to unexpectedly move a transaction to another date.

Use appropriate date/time APIs and avoid legacy date handling where possible.


============================================================
41. TESTING STRATEGY
============================================================

Testing should protect financial correctness first.

### Unit tests

Test:

- Money calculations
- Balance calculations
- Category aggregation
- Budget calculations
- Date logic
- Validation
- Import parsing
- Duplicate detection

### Room tests

Test:

- Insert
- Update
- Delete
- Queries
- Relationships
- Transactions
- Migrations

### ViewModel tests

Test:

- Initial state
- Loading
- Success
- Empty
- Error
- User events

### Compose tests

Test critical flows:

    Launch
    ↓
    Add expense
    ↓
    Save
    ↓
    Verify transaction
    ↓
    Verify dashboard


============================================================
42. MIGRATION TESTING
============================================================

Because the application already migrated from SharedPreferences to Room:

Create tests that verify:

1. Representative legacy data.
2. Migration/import correctness.
3. No duplicated records.
4. No missing records.
5. Correct amounts.
6. Correct dates.
7. Correct categories.
8. Correct ordering.

Do not assume the migration is correct merely because the app launches.


============================================================
43. CRITICAL USER JOURNEYS
============================================================

The following flows must remain extremely reliable:

### Expense

    Open app
    ↓
    Add expense
    ↓
    Enter amount
    ↓
    Select category
    ↓
    Save
    ↓
    Verify immediately

### Income

    Add income
    ↓
    Save
    ↓
    Dashboard updates

### Edit

    Open transaction
    ↓
    Edit
    ↓
    Save
    ↓
    Aggregates update

### Delete

    Open transaction
    ↓
    Delete
    ↓
    Confirm
    ↓
    Aggregates update

### Export

    Export
    ↓
    Select period
    ↓
    Generate
    ↓
    Share/save


============================================================
44. FAILURE TESTING
============================================================

Test:

- App killed during save
- App backgrounded during save
- Database error
- Invalid input
- Empty dataset
- Very large dataset
- Corrupted import
- Duplicate import
- Migration failure
- Device rotation/configuration change
- Process recreation

Financial records must not silently disappear.


============================================================
45. PRODUCT SCOPE
============================================================

Use staged development.

--------------------------------
P0 — FOUNDATION
--------------------------------

Complete and stabilize:

- Existing Kotlin application
- Room persistence
- Financial data model
- Transaction CRUD
- Categories
- Dashboard
- Existing core features
- Error handling
- Validation
- Basic testing
- Accessibility foundation
- Dark mode
- Data export where already supported

Do not expand scope until P0 is stable.

--------------------------------
P1 — HIGH-VALUE IMPROVEMENTS
--------------------------------

Consider:

- Budgets
- Better search
- Advanced filtering
- Recurring transactions
- Subscription tracking
- Savings goals
- Receipt attachments
- Better reports
- Notifications

Only implement features that fit the product vision.

--------------------------------
P2 — ADVANCED FEATURES
--------------------------------

Potential future features:

- OCR
- AI categorization
- Natural language expense entry
- Advanced forecasting
- Multi-device synchronization
- Cloud backup
- Account-based synchronization

These are OPTIONAL.

Do not implement them simply because they sound impressive.


============================================================
46. AI FEATURES
============================================================

AI must NEVER be required for the core application.

Potential future AI features:

    "Spent 350 on lunch"

        ↓

    Suggested transaction

        ↓

    User confirms

        ↓

    Save

AI must never silently modify financial records.

AI-generated financial insights must be clearly presented as suggestions, not guaranteed financial advice.


============================================================
47. BACKEND DECISION GATE
============================================================

DO NOT introduce FastAPI/PostgreSQL automatically.

A backend should only be introduced if the product requires:

- Multi-device synchronization
- Cloud backup
- User accounts
- Shared household finances
- Remote access
- Server-side processing
- Cross-platform synchronization

If those requirements emerge, design the backend separately.

Do not contaminate the current local-first architecture with premature infrastructure.


============================================================
48. FUTURE BACKEND ARCHITECTURE
============================================================

If a backend eventually becomes justified:

    Android
       ↓
    API
       ↓
    FastAPI
       ↓
    PostgreSQL

Use:

- API versioning
- Authentication
- Authorization
- Idempotency
- Validation
- Rate limiting
- Database transactions

But this is FUTURE architecture, not a current requirement.


============================================================
49. CODE QUALITY
============================================================

Write idiomatic Kotlin.

Prefer:

- Immutable data
- Sealed classes where useful
- Data classes
- Extension functions where appropriate
- Null safety
- Structured concurrency
- Small cohesive functions
- Clear naming

Avoid:

- !!
- Any
- Giant ViewModels
- Giant Composables
- God classes
- Static mutable state
- Magic numbers
- Duplicate business logic
- Dead code
- Unnecessary abstraction


============================================================
50. DEPENDENCY DISCIPLINE
============================================================

Before adding a dependency ask:

1. Do we already have this capability?
2. Can Android/Jetpack solve it?
3. Does the dependency provide substantial value?
4. Is it maintained?
5. Is it secure?
6. What is its build/runtime cost?

Do not add dependencies merely because tutorials use them.


============================================================
51. OBSERVABILITY
============================================================

Use appropriate crash reporting if desired.

However:

NEVER log sensitive financial information unnecessarily.

Do not log:

- Full transaction contents
- Account balances
- Private notes
- Sensitive receipt data

Production logging must be intentional.


============================================================
52. RELEASE QUALITY
============================================================

Before considering a release:

    Build
      ↓
    Unit Tests
      ↓
    Room Tests
      ↓
    Migration Tests
      ↓
    UI Tests
      ↓
    Lint
      ↓
    Security Review
      ↓
    Performance Review
      ↓
    Release Build


============================================================
53. CI/CD
============================================================

If CI is introduced or already exists, validate:

- Build
- Unit tests
- Lint
- Static analysis
- Release compilation

Never bypass failures just to obtain a green build.


============================================================
54. RELEASE SECURITY
============================================================

Verify:

- Signing configuration
- No secrets committed
- Release configuration
- R8 where appropriate
- Correct permissions
- Secure exported components
- Backup behavior
- Production logging

Do not hard-code production credentials.


============================================================
55. DOCUMENTATION
============================================================

Maintain concise, accurate documentation.

At minimum:

    README.md
    ARCHITECTURE.md
    DATABASE.md
    TESTING.md

Add other documentation only when useful.

Documentation must describe the ACTUAL application, not an imagined future architecture.


============================================================
56. DEVELOPMENT WORKFLOW
============================================================

For every implementation task:

STEP 1 — Inspect

Find the relevant existing implementation.

STEP 2 — Understand

Determine dependencies and behavior.

STEP 3 — Plan

Identify:

- Files to change
- Data implications
- Regression risks
- Testing requirements

STEP 4 — Implement

Make the smallest correct change.

STEP 5 — Validate

Run relevant:

- Build
- Tests
- Lint
- UI verification

STEP 6 — Review

Check:

- Security
- Performance
- Accessibility
- Financial correctness

STEP 7 — Report

Clearly explain:

- What changed
- Why it changed
- What was intentionally not changed
- What was tested
- Any remaining risks


============================================================
57. CHANGE MANAGEMENT RULE
============================================================

Do not modify unrelated files.

Do not perform opportunistic refactors while implementing an unrelated feature.

Example:

If asked to improve transaction filtering:

DO:

    Improve filtering.

DO NOT:

    Rewrite navigation
    Change database architecture
    Replace all UI components
    Introduce a backend
    Rename the entire project

unless those changes are directly necessary.


============================================================
58. DEFINITION OF DONE
============================================================

A feature is NOT complete merely because:

    "The code compiles."

A feature is complete when:

- It works
- Existing functionality still works
- Data is persisted correctly
- Errors are handled
- UI states are complete
- Accessibility is considered
- Tests exist for important logic
- Performance is acceptable
- Security implications are reviewed
- The implementation matches the actual architecture


============================================================
59. FINAL ACCEPTANCE CRITERIA
============================================================

The application should ultimately satisfy:

### FUNCTIONALITY

- Expenses work reliably
- Income works reliably
- Categories work
- Dashboard works
- Transaction history works
- Search/filtering works where implemented
- Editing works
- Deletion works
- Export/import works where implemented

### DATA

- Room is authoritative for ledger data
- Existing migrated data is preserved
- Migrations are explicit
- Financial values are accurate
- No silent data loss
- No accidental duplicate records

### PERFORMANCE

- Fast startup
- Smooth scrolling
- Efficient Room queries
- Reasonable memory usage
- Minimal unnecessary background work

### SECURITY

- No exposed secrets
- Sensitive data protected
- Appropriate secure storage
- Safe file handling
- Privacy-conscious architecture

### UX

- Fast expense entry
- Clear navigation
- Useful dashboard
- Excellent empty states
- Useful errors
- Dark mode
- Accessibility
- Consistent design system

### ENGINEERING

- Maintainable Kotlin
- Clear architecture
- Testable business logic
- Reliable Room implementation
- Safe migrations
- Minimal unnecessary dependencies
- Reproducible builds
- Accurate documentation


============================================================
60. PRINCIPAL ENGINEERING RULE
============================================================

Always ask:

    "What is the smallest change that produces the largest
     meaningful improvement without increasing unnecessary
     complexity?"

Prefer:

    Simple + Correct + Tested

over:

    Complex + Impressive + Fragile


============================================================
61. FINAL PRODUCT NORTH STAR
============================================================

The objective is NOT to create the largest expense tracker.

The objective is to create an expense tracker that users trust.

The product should feel:

    Fast
    Private
    Accurate
    Calm
    Reliable
    Modern
    Predictable

A user should be able to record an expense in seconds and trust that:

    It was saved.
    It will remain saved.
    The totals are correct.
    Their data belongs to them.
    The application will not unnecessarily expose their
    financial information.

FINAL PRINCIPLE:

    Do not build everything.

    Build what matters.

    Make it correct.

    Make it reliable.

    Make it fast.

    Make it maintainable.

    Then expand deliberately.
