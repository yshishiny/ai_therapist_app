# APK Release Guide 🚀

Follow these steps to build and sign the first release-ready APK for the AI Therapist Android application.

## Prerequisites

- [Flutter SDK](https://docs.flutter.dev/get-started/install) installed.
- [Java Development Kit (JDK)](https://adoptium.net/) installed.
- Android Studio with Android SDK.

---

## Step 1: Generate an Upload Keystore

Run the following command in your terminal to create a secure keystore file:

```bash
keytool -genkey -v -keystore ~/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

> [!WARNING]
> Keep the keystore file and passwords in a safe place. Do not commit the keystore file to version control.

---

## Step 2: Configure Release Signing

1. Create a file named `android/key.properties`.
2. Add the following content (replacing placeholders with your actual passwords and path):

```properties
storePassword=<password-from-step-1>
keyPassword=<password-from-step-1>
keyAlias=upload
storeFile=<path-to-upload-keystore.jks>
```

---

## Step 3: Initialize Android native components

Since this is a fresh Flutter project, ensure the Android folder is initialized:

```bash
flutter create . --platforms android
```

---

## Step 4: Build the APK

Run the following command to generate the signed APK:

```bash
flutter build apk --release
```

The APK will be located at:
`build/app/outputs/flutter-apk/app-release.apk`

---

## Step 5: Distribution

You can now share this APK with clinicians for beta testing or upload it to the Google Play Console for official internal testing.
