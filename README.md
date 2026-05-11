## Resq – AI Based Disaster Relief and Management System

This project implements **Resq (Disaster Relief and Management System)**, an AI‑powered decision support system for managing natural and man‑made disasters across three phases:

- **Pre‑disaster**: early detection and risk prediction
- **During disaster**: real‑time alerting and rescue coordination
- **Post‑disaster**: relief distribution and recovery planning

### High‑Level Modules

- **City‑Fire Detector**
  - CNN/VGG‑based model (`fire.model`) that detects fire from CCTV or drone video streams.
- **Flood Detector**
  - CNN/VGG‑based model (`flood.model`) that detects flood water and inundation levels from video.
- **Social‑Distance Detector**
  - YOLOv3‑based human detection + distance estimation for crowding and social‑distancing violations.
- **Risk Clustering (DBSCAN)**
  - Groups incident locations into high‑distress clusters.
- **Routing & Resource Allocation (GRASP + VND)**
  - Computes near‑optimal rescue and relief routes.
- **Web Backend (Django)**
  - REST APIs and admin dashboard to orchestrate the above modules.

### Repository Layout

- `backend/` – Django project and REST APIs.
- `detectors/` – Fire, flood, and social‑distance detection modules (to be wired with your trained models).
- `routing_optimization/` – DBSCAN clustering and GRASP/VND routing utilities.
- `videos/` – Sample input videos for demo.
- `docs/` – Project reports, diagrams, and supporting documentation.

### Quick Start

1. **Create and activate a virtual environment (recommended)**  
   On Windows (PowerShell):

   ```bash
   python -m venv venv
   venv\Scripts\activate
   ```

2. **Install dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

3. **Apply migrations and run the backend**:

   ```bash
   cd backend
   python manage.py migrate
   python manage.py runserver
   ```

4. Open the browser at `http://127.0.0.1:8000/` to access the Resq backend.

### Model Files (Not Stored in Git)

Download the pre‑trained models from your Drive link and place them as follows:

- `detectors/city_fire/output/fire.model`
- `detectors/flood/output/flood.model`
- `detectors/social_distance/yolo-coco/yolov3.weights`

These paths will be used by the detector modules.

### Next Steps

- Implement the actual model loading and prediction logic inside the detector modules.
- Connect real GIS/location data to DBSCAN clustering.
- Integrate a frontend (Django templates or SPA) with live maps and dashboards.

## Deployment

### Frontend (Netlify)

1. **Connect GitHub repository** to Netlify
2. **Build settings** (auto-detected from `netlify.toml`):
   - Base directory: `frontend`
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`
3. **Environment variables**:
   - `VITE_API_BASE_URL`: `https://your-render-app.onrender.com/api`

### Backend (Render)

1. **Create new Web Service** on Render
2. **Connect GitHub repository**
3. **Configure service**:
   - Runtime: `Python 3`
   - Build Command: `./build.sh`
   - Start Command: `gunicorn resq.wsgi:application --bind 0.0.0.0:$PORT`
4. **Add PostgreSQL database** (Render will create it automatically)
5. **Environment variables**:
   - `RESQ_DEBUG`: `false`
   - `RESQ_SECRET_KEY`: Generate a new secret key
   - `DATABASE_URL`: Provided by Render's PostgreSQL
   - `RESQ_CORS_ORIGINS`: `https://your-netlify-site.netlify.app`
   - `RESQ_ALLOWED_HOSTS`: `your-render-app.onrender.com`

### Alternative: Manual Render Deployment

If you prefer manual setup:

1. **Create Render account** and PostgreSQL database
2. **Clone/copy the backend code** to a separate repository
3. **Set environment variables** as shown in `.env.production.example`
4. **Deploy using the Procfile** configuration

## Environment Variables

Copy `.env.production.example` to `.env` and fill in your values:

```bash
# Backend
RESQ_SECRET_KEY=your-secret-key
RESQ_DEBUG=false
DATABASE_URL=postgresql://...
RESQ_CORS_ORIGINS=https://your-frontend.netlify.app
RESQ_ALLOWED_HOSTS=your-backend.onrender.com

# Frontend
VITE_API_BASE_URL=https://your-backend.onrender.com/api
```
