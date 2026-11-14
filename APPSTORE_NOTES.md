# CRRT Rx: App Store notes

Marketing version **1.0**, build **1**. Bundle ID `com.drd.crrtrx`. Free. Submit on Dr D's current individual Apple Developer account (same team as K Swipe). Automatic signing; choose the team in Xcode on the Mac.

This box cannot archive or upload. On the Mac: unzip `CRRTRx-iOS-1.0.zip`, open `ios/App/App.xcodeproj`, choose the Team, pick **Any iOS Device (arm64)**, then **Product > Archive**, **Distribute App > App Store Connect > Upload**. Then in App Store Connect create version 1.0, select build 1.0 (1), and submit.

Do not merge this `ios-wrap` branch to `main` until Dr D says so. The live site stays unchanged until then.

## Capacitor wrap

- Offline bundle only. No remote URL. Web assets live in `ios/App/App/public/`.
- After a web change on this branch: `npm run ios:sync`.
- Devices: iPhone and iPad, all orientations. Deployment target iOS 15. Safe-area insets are respected (`viewport-fit=cover` and `env(safe-area-inset-*)`), with a status-bar cover so scrolled text does not draw under the notch.
- Export compliance: `ITSAppUsesNonExemptEncryption=false`.
- No analytics, no network requirement, no login, no ads. Service worker is not registered inside the native WebView.
- App icon: 1024×1024 RGB, no alpha, in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`.

## Privacy and support URLs

`privacy.html` and `support.html` are on this branch only. App Store Connect needs publicly reachable Privacy Policy and Support URLs. After Dr D OKs a merge to `main` (or another host), use:

- Privacy: https://amarzon-tech.github.io/crrt-dosing/privacy.html
- Support: https://amarzon-tech.github.io/crrt-dosing/support.html
- Contact: akd.nephrology@gmail.com

Until those pages are on the live site, do not paste a GitHub Pages URL that 404s.

## Listing copy

See `/workspace/crrt-rx-ios/LISTING.md` (also summarized there for App Store Connect). Category: Medical. App Privacy: Data Not Collected. Price: Free.
