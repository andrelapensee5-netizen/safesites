# App Store & Google Play Submission Guide

## iOS App Store (Apple)

### Prerequisites

1. **Apple Developer Account** – $99/year at https://developer.apple.com
2. **Xcode** installed on Mac
3. **EAS CLI** installed: `npm install -g eas-cli`
4. **Expo Account** at https://expo.dev

### Setup EAS

```bash
cd mobile
eas login
eas build:configure
```

Update `eas.json` with your project ID from Expo dashboard.

### Configure App

1. Update `app.json`:
   - Set `ios.bundleIdentifier` to `com.yourcompany.safesites`
   - Set your version numbers

2. Add your app icons to `mobile/assets/`

### Build for iOS

```bash
# Production build
eas build --platform ios --profile production

# Development build (for testing)
eas build --platform ios --profile development
```

### Submit to App Store

```bash
eas submit --platform ios
```

Or use Transporter app after downloading the `.ipa` file.

### App Store Connect Checklist

- [ ] App name: "SafeSite – Document Review"
- [ ] Category: Business or Productivity
- [ ] Privacy Policy URL
- [ ] Screenshots (6.5" and 5.5" iPhone, iPad Pro)
- [ ] App description (4000 chars max)
- [ ] Keywords (100 chars max)
- [ ] Age rating: 4+
- [ ] Export compliance: No encryption (or declare)

---

## Google Play Store

### Prerequisites

1. **Google Play Developer Account** – $25 one-time at https://play.google.com/console
2. **EAS CLI** installed

### Build for Android

```bash
# Production build
eas build --platform android --profile production
```

### Submit to Google Play

```bash
eas submit --platform android
```

Or upload the `.aab` file manually in Google Play Console.

### Google Play Console Checklist

- [ ] App name: "SafeSite – Document Review"
- [ ] Short description (80 chars)
- [ ] Full description (4000 chars)
- [ ] Screenshots (phone, tablet)
- [ ] Feature graphic (1024x500)
- [ ] Category: Business
- [ ] Content rating: questionnaire
- [ ] Privacy Policy URL
- [ ] Data safety form

### Required Permissions

The app uses:
- Camera: for document scanning
- Storage: for document upload/download
- Internet: for API communication
- Push notifications: for document ready alerts

These must be declared in the Data Safety section.

---

## Push Notifications Setup

1. **iOS**: Configure APNs in Apple Developer Portal
2. **Android**: Configure Firebase Cloud Messaging (FCM)

Update `app.json` with your FCM server key and APNs credentials in EAS:

```bash
eas credentials
```

---

## App Review Tips

- Provide a demo account in review notes
- Demo: `demo@safesites.com` / `DemoPassword123`
- Ensure all features work without real API keys in review mode
- Be clear about subscription terms in app metadata
