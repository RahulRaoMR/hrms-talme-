# Employee Android app: persistent login

Implemented for the Play Store Capacitor application, package
`in.talme.hrms.employee`. Ordinary browser, Admin, HR and Manager login retain
their existing session-storage and authentication flow. The native feature is
enabled when Android provides the `EmployeeSession` plugin. Older installed
packages retain the previous flow until the Android update is installed.

## Behaviour and authentication

The existing Employee ID/password login and assigned roles are reused. After a
successful native login, its verified employee token is exchanged for a device
session. No second password database or alternative login identity was added.

- Access tokens retain the existing HMAC-signed token format and expire after
  **30 minutes**. They are held in JavaScript memory, not persistent web storage.
- Refresh credentials last **365 days**, renewed automatically with each refresh.
  Normal use therefore keeps the employee signed in without repeated passwords.
  A device unused for more than a year must sign in again.
- Refresh credentials rotate. Only SHA-256 fingerprints are stored in PostgreSQL.
  A 60-second retry window handles concurrent refreshes/lost responses; reusing
  an older credential outside that window revokes its device session.
- Startup shows “Checking your session...” until the saved session has been
  restored. Login is skipped when restoration succeeds, including when the app
  starts at `/employee-app/login`.
- API handling refreshes an expired access token and retries once. Concurrent
  callers share a single refresh operation. An unavailable network/backend keeps
  the saved credential and shows Retry instead of silently signing the user out.
- Native pages do not include employee data in server-rendered HTML. Employee
  identity is loaded from the verified session, never selected from a URL query.
  Mobile API data is scoped to that employee; company administration settings
  and other employees' data are excluded.

## Android secure storage

`EmployeeSessionPlugin` encrypts the refresh credential with AES-256-GCM using a
non-exportable Android Keystore key. The ciphertext is written atomically in the
app-private `noBackupFilesDir`, excluded from cloud backup/device transfer.
The plugin permits the HRMS HTTPS origins, with localhost access restricted to
debug builds. Passwords and access tokens are never written to this vault.
Refresh credentials are not saved in `localStorage`, `sessionStorage`, URLs,
plain preferences or logs.

This follows the platform's [Android Keystore guidance](https://developer.android.com/privacy-and-security/keystore)
and [Capacitor native-plugin architecture](https://capacitorjs.com/docs/android/custom-code).

## Logout and revocation

Online logout revokes that device's server session, clears native credentials
and employee state, then returns to login. Even an otherwise unexpired access
token is rejected after revocation. Other devices remain signed in.

Offline logout first writes an encrypted logout tombstone. It clears the active
employee state and prevents automatic restoration immediately. A revoke-only
credential is retained in that tombstone until the next connection can notify
the backend, then deleted. It cannot be used by the app to sign in again.
An in-flight refresh cannot undo logout.

Every mobile session/API validation checks the existing `User.active`, assigned
employee role, employee record/status, account/employee email mapping and a
fingerprint of the existing password hash. Disabled/blocked/inactive/removed
employees and changed passwords invalidate the device session. Re-enabling an
account does not revive a session already revoked by these checks.

## Database

The additive `20261022020000_employee_mobile_sessions` migration creates
`EmployeeMobileSession`, related to the existing `User` with cascade deletion.
It stores user/employee IDs, credential fingerprints, rotation state, creation,
last-active and expiry timestamps, and revocation status. Existing user active
flags and employee statuses are reused. No existing tables/records were reset,
no account passwords or roles were rewritten, and no duplicate active fields
were introduced.

The migration was applied successfully to the configured database. Prisma
clients for both Next.js and Express were generated successfully.

## APIs

| Endpoint | Purpose |
| --- | --- |
| Existing `POST /api/auth/login` | Existing Employee ID/password authentication, unchanged backend role/password contracts |
| `POST /api/employee-mobile/sessions` | Exchange a verified employee login for a native device session; corporate roles are rejected |
| `POST /api/employee-mobile/refresh` | Rotate refresh credential and obtain a new short-lived access token |
| `POST /api/employee-mobile/logout` | Revoke the device session, including races with refresh |
| `GET /api/employee-mobile/session` | Validate the current mobile account/device session |
| `GET /api/employee-mobile/hrms` | Load only the signed-in employee's profile, attendance, leave and documents |
| Employee-mobile attendance, shifts, leave, uploads and activity endpoints | Authenticate, enforce employee ownership and delegate to existing services |

Express additionally validates mobile bearers against their server session when
they call existing APIs. Legacy corporate tokens keep their existing middleware.
Native requests use the frontend's same-origin gateway, which supports either
the existing Next.js/Prisma backend or a configured Express backend. It does not
fall back to an anonymous/demo session when refresh services are unavailable.

## Files changed

| File | Change |
| --- | --- |
| `android/app/src/main/java/in/talme/hrms/employee/EmployeeSessionPlugin.java` | Keystore encryption, atomic app-private storage and origin restrictions |
| `android/app/src/main/java/in/talme/hrms/employee/MainActivity.java` | Register the secure-session plugin |
| `android/app/build.gradle` | Android release 1.0.5, version code 6 |
| `capacitor.config.json` | Production employee URL and native user-agent marker |
| `android/PLAY_STORE_RELEASE.md` | Updated release URL/version and rollout requirements |
| `backend/prisma/schema.prisma` | Add the employee device-session model/relation |
| `backend/prisma/migrations/20261022020000_employee_mobile_sessions/migration.sql` | Non-destructive table/index/foreign-key creation |
| `backend/lib/employee-mobile-session.js` | Session creation, hashing/rotation, short access tokens, live account checks and scoped employee data |
| `backend/modules/employee-mobile/routes.js` | Express mobile endpoints and mobile bearer validation |
| `backend/server.js` | Register the mobile endpoints/validation without changing corporate login |
| `app/api/employee-mobile/[...path]/route.js` | Authenticated same-origin mobile gateway and employee-scoped operations |
| `app/employee-app/page.js` | Native loading/authentication boundary; preserve ordinary browser behaviour |
| `components/employee-session-loading.jsx` | Loading/retry state during session restoration |
| `components/pages/employee-mobile-app.jsx` | Restore authentication before showing employee data |
| `components/pages/employee-app-login.jsx` | Native startup restoration and session exchange after login |
| `components/pages/employee-phone-app.jsx` | Centralized native API handling and revoking logout |
| `lib/employee-mobile-session.js` | Native vault, restoration, single-flight refresh, API retry and offline logout |
| `lib/employee-login.js` | Optional same-origin login for the native wrapper; preserve browser compatibility |
| `lib/punch-request-handler.js` | Check revocation/account status for mobile bearers |
| `package.json`, `package-lock.json` | Classify the already installed Capacitor core as a runtime dependency, without upgrading it |
| `next.config.mjs` | Optional isolated build directory for validation; default build unchanged |
| `tests/employee-mobile-session.test.mjs` | Server session/security regressions |
| `tests/employee-mobile-client.test.mjs` | Client restoration, concurrency, failure and logout regressions |
| `tests/employee-mobile-browser.test.mjs` | Real Next/Express/PostgreSQL end-to-end checks with a simulated native bridge |
| `tests/employee-mobile-android.test.mjs` | Actual Keystore/WebView/process-restart/reboot/logout checks in the Android emulator |
| `docs/employee-mobile-persistent-login.md` | Implementation, verification and release report |

## Verification

- 48 server/client and existing authentication regression tests passed, plus
  the real frontend/backend browser scenario and native Android scenario.
- Production Next.js build and Android debug/release builds passed.
- Server/client tests cover role restrictions, 30-minute access, refresh after
  days of inactivity, rotation/replay protection, concurrent refresh, logout
  races, revoked/expired credentials, password changes, removed/disabled
  employees and retryable database/network outages.
- Existing employee login/password-reset/onboarding and corporate/invoice
  authentication regression tests passed. Real Admin and HR login APIs were
  also exercised with temporary test accounts and retain their 12-hour tokens.
- Real Next.js + Express + PostgreSQL browser checks passed: first login,
  reload, reopening in a new browser context, visiting login while signed in,
  no login-form flash, temporary backend outage/retry, simultaneous expired
  access requests with one refresh, scoped employee data, logout/reopen,
  administrator revocation and account disable.
- The actual Android test package passed first login, force-stop/reopen,
  emulator phone reboot, logout and reopening after logout. Its private file
  contained ciphertext rather than the raw refresh token. Web storage contained
  no refresh credential. These checks used the real native plugin, frontend,
  backend and PostgreSQL; the bridge was not mocked in the Android test.
- All database test accounts/sessions were temporary and removed afterward.
  No welcome emails or password-reset emails were sent by integration tests.
- Visual evidence is under the ignored `artifacts/employee-mobile-session/`
  directory, including `android-after-phone-reboot.png`,
  `android-after-logout-reopen.png` and `connection-error-keeps-session.png`.

## Release and deployment

The signed release bundle is
`android/app/build/outputs/bundle/release/app-release.aab` (1.0.5, code 6), using
the existing upload signing key. It uses the production HTTPS employee URL,
disallows cleartext/mixed content and keeps WebView debugging disabled.
Local HTTP/debug settings exist only in the ignored validation build of the
separate `in.talme.hrms.employee.sessiontest` package.

Deploy the matching frontend and Express changes (if Express is configured),
and run `prisma migrate deploy` in each target database before releasing the
bundle through Play Console. Keep the existing `AUTH_SECRET` consistent with
the serving backend; do not rotate the corporate authentication key merely to
enable this feature. Mobile sessions intentionally fail closed in production
when the signing secret is missing or still set to the development default.
Play Console review credentials must map to an actual active Employee/User
record; a demo-only login identity cannot create a durable device session.

This work builds/tests the update; it does not publish an Android release or
deploy the hosted frontend/backend. The existing Play Store package receives
persistent login after those deployment/upload steps and the app update.
