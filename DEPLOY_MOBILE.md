# Mobile App Deployment Checklist (Fastlane/GitHub Actions)

To enable ZERO-TOUCH automatic publishing for the AI Therapist Android application, you must configure the following GitHub Repository Secrets.

## GitHub Settings
Go to your GitHub Repository -> **Settings** -> **Secrets and variables** -> **Actions**.

### Required Secrets
Add the following keys exactly as written:

| Secret Name | Value Description |
| :--- | :--- |
| `ANDROID_KEYSTORE_B64` | Your production `.jks` signing key converted to base64. <br>*(Command: `base64 -i your_key.jks > key.b64` on Mac/Linux or equivalent in Windows PowerShell)* |
| `ANDROID_KEYSTORE_PASSWORD` | The password used to unlock the `.jks` file. |
| `ANDROID_KEY_ALIAS` | The alias of the key inside the keystore. |
| `ANDROID_KEY_PASSWORD` | The password used for the specific key alias. |
| `PLAY_STORE_JSON_KEY` | The raw JSON content of your Google Play Service Account (with Release Manager permissions). |

## How it works
Once these secrets are active, the `.github/workflows/deploy_mobile.yml` action will intercept pushes to the repository, inject the keystore dynamically, build the signed `.aab`, and utilize Fastlane to upload it directly to Google Play.
