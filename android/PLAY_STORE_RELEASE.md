# Talme HRMS Android release

This Android project is a Capacitor wrapper for the employee app:

`https://hrms.talme.in/employee-app/login`

## App details

- App name: `Talme HRMS`
- Package name: `in.talme.hrms.employee`
- Persistent-login release: `1.0.5` (`versionCode 6`)
- Release bundle: `app/build/outputs/bundle/release/app-release.aab`

The employee stay-signed-in feature requires this native update as well as the
matching frontend/backend deployment and employee-session database migration.
Older packages keep their existing login flow because they do not contain the
Android Keystore session plugin. Admin and HR browser login remain unchanged.
See [persistent login implementation and verification](../docs/employee-mobile-persistent-login.md).

## Local signing files

The release build reads signing credentials from `android/keystore.properties`.
That file and the upload keystore are intentionally ignored by Git:

- `android/upload-keystore.jks`
- `android/keystore.properties`

Back up both files safely. Play Console updates for this app require the same
upload key unless the key is reset in Play Console.

## Build commands

From the repository root:

```sh
npm run android:sync
cd android
./gradlew bundleRelease
```

On Windows PowerShell, if Java/Android SDK are not already on `PATH`, use the
JDK bundled with Android Studio:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = "$env:LOCALAPPDATA\Android\Sdk"
cd android
.\gradlew.bat bundleRelease
```
