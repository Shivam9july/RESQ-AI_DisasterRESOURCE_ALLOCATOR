# Resq — Deployment Guide

This guide deploys the app across two services:

| Part        | Host           | Plan |
|-------------|----------------|------|
| Django API + PostgreSQL | **Render** | Free |
| React frontend (Vite)  | **Vercel**  | Free |

> **Login:** `commander@resq.local` / `resq1234`

---

## Prerequisites

- A GitHub account with this repo pushed: `Shivam9july/RESQ-AI_DisasterRESOURCE_ALLOCATOR`
- Free accounts on [render.com](https://render.com) and [vercel.com](https://vercel.com)

---

## Part 1 — Backend + Database on Render

### Step 1.1 — Create the PostgreSQL database

1. Go to **Render Dashboard → New + → PostgreSQL**
2. Fill in:
   - **Name:** `resq-db`
   - **Database:** `resq`
   - **Plan:** Free
3. Click **Create Database**.
4. Once created, copy the **Internal Database URL** (looks like
   `postgres://resq:****@dpg-xxx/resq`). You'll need it in Step 1.2.

### Step 1.2 — Create the backend Web Service

1. Go to **Render Dashboard → New + → Web Service**
2. Connect your GitHub account and select the repo
   `Shivam9july/RESQ-AI_DisasterRESOURCE_ALLOCATOR`.
3. Fill in:
   - **Name:** `resq-backend`
   - **Runtime:** Python 3
   - **Region:** closest to you
   - **Branch:** `main`
   - **Root Directory:** *(leave blank — commands run from repo root)*
   - **Build Command:** `./build.sh`
   - **Start Command:** `gunicorn resq.wsgi:application --chdir backend --bind 0.0.0.0:$PORT --workers 2`
   - **Plan:** Free
4. Open the **Advanced** section and add these **Environment Variables**:

   | Key | Value |
   |-----|-------|
   | `PYTHON_VERSION` | `3.11.9` |
   | `RESQ_DEBUG` | `false` |
   | `RESQ_SECRET_KEY` | *(click "Generate" to create a random value)* |
   | `DATABASE_URL` | *(paste the **Internal Database URL** from Step 1.1)* |
   | `RESQ_ALLOWED_HOSTS` | *(you'll fill your Render URL after first deploy, see note below)* |

   > The build script (`build.sh`) automatically runs `collectstatic` and `migrate`,
   > so the schema is created on first deploy.

5. Click **Create Web Service**. Wait for the build to finish (≈2–4 min).
6. Note your backend URL, e.g. `https://resq-backend-xxxx.onrender.com`.

### Step 1.3 — Verify the backend

Visit `https://resq-backend-xxxx.onrender.com/api/health/` — you should see:
```json
{"status":"ok","service":"resq-api"}
```

> If Render shows "App failed to start", check the **Logs** tab. Most issues are
> a missing `DATABASE_URL` or a typo in the start command.

### Step 1.4 — Create the operator account

After first deploy, the database is empty. Create the login user from the
Render **Shell** tab (or run this as a one-off **Render Shell** command):

```bash
cd backend && python manage.py shell -c "
from django.contrib.auth import get_user_model
U=get_user_model()
U.objects.filter(email='commander@resq.local').exists() or U.objects.create_superuser(
    username='commander', email='commander@resq.local',
    password='resq1234', first_name='Shivam', last_name='Commander')
print('operator ready')
"
```

(Optional) seed sample incidents:
```bash
cd backend && python manage.py seed_data --reset
```

### Step 1.5 — Set CORS (allow the Vercel frontend)

Back in the Web Service **Environment** tab, set:

| Key | Value |
|-----|-------|
| `RESQ_CORS_ALLOWED_ORIGINS` | `https://your-frontend.vercel.app` *(from Part 2)* |
| `RESQ_CSRF_TRUSTED_ORIGINS` | `https://your-frontend.vercel.app` |
| `RESQ_ALLOWED_HOSTS` | `resq-backend-xxxx.onrender.com` |

These must be updated **after** you know both deployed URLs (Part 2 first deploy).

---

## Part 2 — Frontend on Vercel

### Step 2.1 — Import the project

1. Go to [vercel.com](https://vercel.com) → **Add New… → Project**
2. Import the repo `Shivam9july/RESQ-AI_DisasterRESOURCE_ALLOCATOR`.
3. Configure:
   - **Root Directory:** `frontend` *(click "Edit" next to Root Directory)*
   - **Framework Preset:** Vite *(auto-detected)*
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Under **Environment Variables**, add:

   | Name | Value |
   |------|-------|
   | `VITE_API_BASE_URL` | `https://resq-backend-xxxx.onrender.com/api` *(your Render URL + `/api`)* |

5. Click **Deploy**. Wait ~1 min.

### Step 2.2 — Get your frontend URL

After deploy, Vercel gives you a URL like `https://resq-frontend-xxxx.vercel.app`.
Now go **back to Render** (Step 1.5) and update:
- `RESQ_CORS_ALLOWED_ORIGINS` → your Vercel URL
- `RESQ_CSRF_TRUSTED_ORIGINS` → your Vercel URL

Then trigger a redeploy on Render (Manual Deploy → Deploy latest commit).

### Step 2.3 — Verify

Open your Vercel URL. You should see the login page. Log in with
`commander@resq.local` / `resq1234`.

---

## Troubleshooting

### "Failed to fetch" / login not working
- **Most common cause:** CORS or cookie mismatch.
  - Ensure `VITE_API_BASE_URL` on Vercel points to `https://…onrender.com/api`
    (with `/api`, no trailing slash).
  - Ensure `RESQ_CORS_ALLOWED_ORIGINS` on Render contains your exact Vercel URL.
  - Both URLs must use `https://`.

### Login works but list/incidents empty
- Run `python manage.py seed_data --reset` on Render (Shell tab).
- Or upload media via the New Analysis page.

### 502 / app sleeps
- Render's free tier sleeps after 15 min of inactivity. First request after sleep
  takes ~30s to wake. Upgrade to a paid plan for always-on.

### Media uploads don't persist
- Render's filesystem is ephemeral. Uploaded files are lost on redeploy.
- For persistent media, use cloud storage (AWS S3 / Cloudinary) and swap
  `DEFAULT_FILE_STORAGE` in settings. This is out of scope for the free setup.

### Production secrets
- Never commit `.env`. All secrets live as environment variables in the Render
  and Vercel dashboards.

---

## File reference

| File | Purpose |
|------|---------|
| `render.yaml` | Render Blueprint (backend + DB) — optional, you can also configure manually |
| `build.sh` | Render build: `pip install`, `collectstatic`, `migrate` |
| `Procfile` | Fallback start command for Heroku-like hosts |
| `requirements.txt` | Python deps incl. `psycopg2-binary` + `gunicorn` |
| `runtime.txt` | Python 3.11.9 |
| `frontend/vercel.json` | Vite build + SPA rewrite (no 404 on `/incidents`) |
| `frontend/.env.example` | Documents `VITE_API_BASE_URL` |
