# VolunteerAI

AI-powered volunteer coordination for Bengaluru NGOs.

This version uses a simple free-tier-friendly stack:
- Groq API for AI matching, parsing, and outreach
- Render for the backend API
- Vercel for the frontend
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
  render.yaml
```

## What It Does

- Matches volunteers to NGO tasks using semantic understanding
- Parses plain-English task descriptions into structured data
- Generates personalized outreach emails
- Tracks volunteer reliability over time

## AI Setup

1. Create a Groq API key in the Groq console.
2. Use `GROQ_API_KEY` in your backend environment.
3. Deploy the backend to Render.
4. Deploy the frontend to Vercel.
5. Optional: set `GROQ_MODEL` if you want to try a different Groq model.

Default model:
- `llama-3.1-8b-instant` for the best free-tier request allowance
- You can override it with `GROQ_MODEL=openai/gpt-oss-20b` or `GROQ_MODEL=llama-3.3-70b-versatile` if you want higher quality and can trade off request limits

Docs worth knowing:
- [Groq API keys](https://console.groq.com/keys/)
- [Groq free plan](https://console.groq.com/settings/billing/plans)
- [Groq rate limits](https://console.groq.com/docs/rate-limits)
- [Groq structured outputs](https://console.groq.com/docs/structured-outputs)
- [Render free plan](https://render.com/pricing)
- [Render free web services](https://render.com/docs/free)
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
- [Vercel pricing](https://vercel.com/pricing)

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

The repo is set up for a simple split deployment:
- `Vercel` for the frontend
- `Render` for the Flask backend

### Backend on Render

Render can deploy the backend directly from the `backend/` folder.

Use these settings for a new Web Service:
- Root directory: `backend`
- Runtime: Python
- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn app:app`

Environment variables:
- `GROQ_API_KEY` = your Groq API key
- `GROQ_MODEL` = optional, defaults to `llama-3.1-8b-instant`

This repo also includes `render.yaml`, so you can use Render’s blueprint deploy flow if you prefer.

### Frontend on Vercel

Use these settings when you import the repo into Vercel:
- Root directory: `frontend`
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

Add this environment variable in Vercel:
- `VITE_API_BASE_URL` = your Render backend URL, for example `https://volunteer-ai-api.onrender.com`

The frontend reads `VITE_API_BASE_URL` in [`frontend/src/api.js`](frontend/src/api.js) and falls back to `/api` for local development.

### Connect the API URL

After Render gives you the backend URL:
1. Copy the full backend URL.
2. Paste it into Vercel as `VITE_API_BASE_URL`.
3. Redeploy the frontend.

### Local development

Local development still works the same way:
- Backend runs on `http://localhost:5000`
- Frontend runs on `http://localhost:3000`
- The Vite dev server proxies `/api` to the backend in `frontend/vite.config.js`

### Push to GitHub

The repo is ready to push and connect to both platforms:

```powershell
git add .
git commit -m "Prepare Vercel and Render deployment"
git push
```

## Notes

- The backend auto-seeds demo data if the SQLite database is empty.
- SQLite is fine for demos, but on Render the filesystem is not durable across restarts. For persistent production data, we should move to a managed database later.
- The current deployment setup is optimized for a hackathon/demo flow and is easy to improve later.
