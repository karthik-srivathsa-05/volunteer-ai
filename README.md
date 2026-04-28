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
