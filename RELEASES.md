# AI Therapist Release Management

Our publishing workflows for the Android application are fully automated via GitHub Actions and Fastlane.

## Branch Strategy

The CI/CD pipeline monitors two specific branches to determine the environment target:

### 1. `develop` Branch
Pushing or merging code into the `develop` branch will automatically trigger the **Beta Flow**.
*   **Result:** The GitHub Action will build the app and push it to the Google Play Console **Internal Testing** track.
*   **Who sees it:** Registered internal testers (your development team).

### 2. `main` Branch
Pushing or merging code into the `main` branch will automatically trigger the **Production Flow**.
*   **Result:** The GitHub Action will build the app and push it to the Google Play Console **Production** track.
*   **Who sees it:** It will be submitted for Google Review and rolled out to all public users.

## How to Trigger Manual Rebuilds
If a workflow fails (e.g., due to a temporary network issue on GitHub's side):
1. Navigate to the **Actions** tab in the GitHub repository.
2. Select the `Mobile CI/CD (Android Fastlane)` workflow on the left.
3. Click the failing run.
4. Click the **Re-run jobs** button in the top right.

## Rollback Process
If a critical bug is pushed to production (`main`):
1. Immediate stop: Log into the Google Play Console, go to **Production** -> **Releases**, and halt the rollout.
2. Fix: `git revert` the problematic commit on the `main` branch and push.
3. The pipeline will automatically build and submit the newly reverted version to Google Play.
