# Talme HRMS iOS

Native SwiftUI iOS shell for `https://hrms.talme.in`.

## What Is Included

- SwiftUI app lifecycle.
- WKWebView using persistent cookies and JavaScript.
- Native loading screen with Talme branding.
- Native offline and retry state using `NWPathMonitor`.
- Pull-to-refresh through `UIRefreshControl`.
- Native bottom toolbar for Back, Forward, Home, and Reload.
- Internal navigation restricted to `https://hrms.talme.in`.
- External links open outside the webview through iOS.
- PDF/CSV/document download detection with iOS share sheet.
- Camera/photo/file permission strings for HRMS upload workflows.
- HTTPS-only App Transport Security configuration.

## Open In Xcode

1. Open `ios/TalmeHRMS/TalmeHRMS.xcodeproj` on a Mac.
2. Select the `Talme HRMS` target.
3. Set your Apple Developer Team under `Signing & Capabilities`.
4. Confirm the bundle ID. The placeholder is `in.talme.hrms`.
5. Replace placeholder icons with production App Store icon artwork if needed.
6. Run on an iPhone simulator and a real iPhone.
7. Test login, file upload, PDF/CSV download, offline state, and external links.

## Archive And Upload

1. In Xcode, select `Any iOS Device`.
2. Choose `Product > Archive`.
3. Open Organizer after archive completes.
4. Click `Distribute App`.
5. Select `App Store Connect`.
6. Upload the build.
7. Wait for Apple processing, then attach the build to a TestFlight or App Store version.

## App Store Connect Checklist

- App name: `Talme HRMS`
- Bundle ID: `in.talme.hrms` or the final Talme bundle identifier.
- Category: `Business`
- Privacy Policy URL: `https://hrms.talme.in/privacy-policy`
- Support URL: use the final Talme support page or email URL.
- Demo account: provide Apple Review a working HRMS demo login.
- Review notes: explain that the app is a native iOS access client for Talme HRMS with offline handling, native downloads, file upload support, and secure portal navigation.
- Screenshots: iPhone and iPad App Store screenshots.
- TestFlight: run internal testing before submitting to App Review.

## Manual Steps Codex Cannot Complete Here

- Apple Developer account setup.
- App Store Connect app record.
- Certificates and provisioning profiles.
- Production App Store icon generation.
- Device testing on iPhone/iPad.
- Xcode archive/upload, because this workspace is on Windows.

## App Review Notes

Apple may reject apps that are only a basic website wrapper. This project adds native loading, network state, retry, refresh, navigation controls, document sharing, and iOS permission handling, but the HRMS portal should still provide a complete working employee/admin experience during review.
