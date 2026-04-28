# VolunteerAI

AI-powered volunteer coordination for Bengaluru NGOs.

This version uses a simple free-tier-friendly stack:
- Groq API for AI matching, parsing, and outreach
- Cloud Run for the backend API
- Firebase Hosting for the frontend
- React + Vite for the web app

## Project Structure

```text
SolutionChallenge/
  backend/
    app.py
    seed_data.py
    requirements.txt
    Dockerfile
  frontend/
    index.html
    package.json
    vite.config.js
    src/
      main.jsx
      App.jsx
      App.css
      api.js
      components/
        Toast.jsx
      views/
        Dashboard.jsx
        Tasks.jsx
        Volunteers.jsx
  firebase.json
```

## What It Does

- Matches volunteers to NGO tasks using semantic understanding
- Parses plain-English task descriptions into structured data
- Generates personalized outreach emails
- Tracks volunteer reliability over time

## AI Setup

1. Create a Groq API key in the Groq console.
2. Use `GROQ_API_KEY` in your backend environment.
3. Deploy the backend to Cloud Run.
4. Deploy the frontend to Firebase Hosting.
5. Optional: set `GROQ_MODEL` if you want to try a different Groq model.

Default model:
- `llama-3.1-8b-instant` for the best free-tier request allowance
- You can override it with `GROQ_MODEL=openai/gpt-oss-20b` or `GROQ_MODEL=llama-3.3-70b-versatile` if you want higher quality and can trade off request limits

Docs worth knowing:
- [Groq API keys](https://console.groq.com/keys/)
- [Groq free plan](https://console.groq.com/settings/billing/plans)
- [Groq rate limits](https://console.groq.com/docs/rate-limits)
- [Groq structured outputs](https://console.groq.com/docs/structured-outputs)
- [Cloud Run pricing and free tier](https://cloud.google.com/run/pricing)
- [Firebase Hosting quotas and pricing](https://firebase.google.com/docs/hosting/usage-quotas-pricing)
- [Firebase Hosting rewrites to Cloud Run](https://firebase.google.com/docs/hosting/cloud-run)

## Local Development

### 1) Backend

Open a terminal in `backend/`.

```powershell
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

Set your Groq key:

```powershell
$env:GROQ_API_KEY="your_key_here"
```

Seed the local demo database:

```powershell
python seed_data.py
```

Start the backend:

```powershell
python app.py
```

The backend runs on `http://localhost:5000`.

### 2) Frontend

Open a second terminal in `frontend/`.

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deployment

The repo is already prepared for Google Cloud deployment.

### Google Cloud setup checklist

Before GitHub Actions can deploy, complete these one-time steps in Google Cloud Console for project `volunteer-ai-7d75a`:

1. Enable these APIs:
   - Cloud Run
   - Cloud Build
   - Artifact Registry
   - Firebase Hosting
   - IAM Service Account Credentials
   - Service Usage

2. Create or choose a deployer service account for GitHub Actions.

3. Grant the deployer and build identities the permissions Cloud Run source deploys need. Google documents the source-deploy permissions as:
   - `roles/run.sourceDeveloper`
   - `roles/serviceusage.serviceUsageConsumer`
   - `roles/iam.serviceAccountUser`
   - `roles/run.builder` for the Cloud Build service account

4. Create the GitHub secrets listed below.

Helpful official docs:
- Cloud Run source deploys: https://cloud.google.com/run/docs/deploying-source-code
- Cloud Run IAM roles: https://cloud.google.com/run/docs/reference/iam/roles
- Cloud Build deploy permissions: https://cloud.google.com/build/docs/deploying-builds/deploy-cloud-run
- Firebase Hosting GitHub integration: https://firebase.google.com/docs/hosting/github-integration

### GitHub Actions deployment

This repo includes `.github/workflows/deploy.yml` so pushes to `main` can deploy automatically once you add the required GitHub secrets.

Add these repository secrets in GitHub:
- `GCP_PROJECT_ID` = `volunteer-ai-7d75a`
- `GCP_SA_KEY` = a Google Cloud service account JSON key with Cloud Run deploy permissions
- `FIREBASE_SERVICE_ACCOUNT_VOLUNTEER_AI_7D75A` = a Firebase service account JSON key for Hosting deploys
- `GROQ_API_KEY` = your Groq API key

The workflow:
- deploys the backend to Cloud Run as `volunteerai-api`
- builds the frontend
- deploys Firebase Hosting

If you want to deploy manually instead of GitHub Actions, the same `gcloud` and `firebase` commands below still apply.

### Backend on Cloud Run

The backend has a `backend/Dockerfile`, so you can deploy it with Cloud Run.

Example:

```powershell
gcloud run deploy volunteerai-api `
  --source backend `
  --region asia-south1 `
  --allow-unauthenticated `
  --set-env-vars GROQ_API_KEY=your_key_here
```

Notes:
- The service name in `firebase.json` is set to `volunteerai-api`
- The rewrite region in `firebase.json` is set to `asia-south1`
- If you deploy Cloud Run in a different region, update `firebase.json` too

### Frontend on Firebase Hosting

Build the frontend first:

```powershell
cd frontend
npm run build
```

Then deploy Hosting from the repo root:

```powershell
firebase login
firebase deploy --only hosting
```

The `firebase.json` file serves `frontend/dist` and rewrites `/api/**` to the Cloud Run backend.

## GitHub Workflow

If you have not pushed yet:

```powershell
git init
git add .
git commit -m "Use Groq and Google Cloud deployment"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

## Notes

- The backend auto-seeds demo data if the SQLite database is empty.
- Cloud Run with SQLite is great for demos, but it is still ephemeral storage. If you want durable production data later, we should move the database to a managed Google service.
- The current deployment setup is optimized for a hackathon/demo flow and is easy to improve later.
