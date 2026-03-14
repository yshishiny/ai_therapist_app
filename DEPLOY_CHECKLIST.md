# Railway Deployment Checklist

These are the exact one-time manual steps required to set up the ZERO-TOUCH automated backend CI/CD on Railway.

## 1. Prepare GitHub
- [ ] Push this entire application to a private GitHub repository.

## 2. Prepare Railway
- [ ] Log in to [Railway.app](https://railway.app).
- [ ] Create a **New Project**.
- [ ] Choose **Deploy from GitHub repo** and authorize GitHub if you haven't.
- [ ] Select the `AI Therapist` repository.
- [ ] (Important) Do not select an image. Let Railway discover the `railway.toml` config automatically.

## 3. Configure the Railway Environment
- [ ] In the Railway dashboard, navigate to the **Variables** tab of the service.
- [ ] Add `DATABASE_URL` (your production PostgreSQL connection string).
- [ ] Add `ENVIRONMENT` with the value `production`.
- [ ] You do not need to add `PORT`. Railway adds this automatically, and `app.py` has been updated to dynamically bind to it.

## 4. Trigger Branches
- [ ] Go to **Settings** -> **Deployments**.
- [ ] Ensure the **Trigger Branch** is set to `main`.
- [ ] Any push to `main` going forward will now automatically trigger a rollout. The `backend/Dockerfile` will build, and Railway will ping the new `/health` endpoint before shifting traffic to ensure 0 downtime.
