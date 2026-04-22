# 🐟 Marine Intelligence Platform
### CMLRE — Centre for Marine Living Resources and Ecology, India
> An AI-powered marine research platform with 5 intelligent features for Indian EEZ waters.

---

## 📸 Features Overview

| # | Feature | Technology | Description |
|---|---------|-----------|-------------|
| 1 | 🐟 Fish Abundance Prediction | Random Forest + XGBoost | Predicts fish density (kg/km²) from ocean parameters |
| 2 | 🐠 Fish Species Identification | MobileNetV2 CNN | Identifies fish species from uploaded photos |
| 3 | 🌊 Ecosystem Health Score | ML + Rule-based | Assesses ocean health (0–100) with recommendations |
| 4 | 🦴 Otolith Image Analysis | OpenCV + ResNet50 | Detects growth rings to estimate fish age & stock |
| 5 | 🧬 eDNA Species Matching | BioPython + NCBI BLAST | Identifies species from water DNA samples |

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js (Vite) + Leaflet.js + Chart.js |
| Backend | Node.js + Express.js + JWT Auth |
| ML API | Python + Flask |
| Database | MongoDB |
| ML Models | Random Forest, XGBoost, MobileNetV2, ResNet50 |

---

## 📁 Project Structure

```
marine-intelligence-platform/
│
├── frontend/                      # React Frontend (Vite)
│   └── src/
│       ├── components/            # Navbar, Footer, UI, Charts
│       ├── context/               # AuthContext (JWT)
│       ├── data/                  # oceanZones.js, speciesDatabase.js
│       ├── pages/                 # All 5 feature pages + Auth pages
│       ├── services/              # api.js (Axios calls)
│       └── styles/                # CSS files
│
├── backend/                       # Node.js + Express
│   ├── models/                    # MongoDB schemas (6 models)
│   ├── middleware/                 # auth.js, roleCheck.js
│   ├── routes/                    # auth.js routes
│   ├── server.js                  # Main Express entry
│   └── .env                       # Environment variables
│
├── ml/                            # Python ML + Flask
│   ├── data/                      # Training datasets (.csv)
│   ├── models/                    # Saved model files (.pkl, .keras)
│   ├── app.py                     # Flask API (all 5 ML routes)
│   ├── model.py                   # Feature 1 training
│   ├── species_model.py           # Feature 2 training
│   ├── ecosystem_model.py         # Feature 3 training
│   ├── otolith_model.py           # Feature 4 training
│   ├── otolith_processor.py       # OpenCV ring detection
│   ├── edna_matcher.py            # BioPython NCBI BLAST
│   └── requirements.txt           # Python dependencies
│
├── .gitignore
└── README.md
```

---

## ⚙️ Prerequisites

### Common (Both OS)
| Tool | Version | Download |
|------|---------|----------|
| Node.js | ≥ 18 | https://nodejs.org |
| Python | 3.10 or 3.11 | https://python.org |
| MongoDB | ≥ 6 | https://www.mongodb.com/try/download/community |
| Git | Latest | https://git-scm.com |

---

## 🚀 Installation & Setup

### Step 1 — Clone the Repository

```bash
git clone https://github.com/daksh2525/marine-biodiversity-platform.git
cd marine-intelligence-platform
```

---

## 🍎 macOS Setup

### Step 2 (macOS) — Python Environment

```bash
cd ml

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

**For Apple Silicon (M1/M2/M3) only:**
```bash
# Install TensorFlow for Apple Silicon (NOT the regular tensorflow)
pip install tensorflow-macos==2.16.1
pip install tensorflow-metal==1.1.0

# Install remaining packages
pip install flask flask-cors scikit-learn xgboost pandas numpy \
            matplotlib Pillow seaborn biopython opencv-python scipy
```

### Step 3 (macOS) — Start MongoDB

```bash
# Install Homebrew if not installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB as a service
brew services start mongodb-community

# Verify MongoDB is running
mongosh --eval "db.runCommand({ connectionStatus: 1 })"
```

### Step 4 (macOS) — Backend (Express)

```bash
cd backend
npm install

# Create .env file
touch .env
```

Add to `.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/fishdb
FLASK_URL=http://localhost:5001
JWT_SECRET=your_super_secret_key_change_this
```

```bash
# Start Express server
npm run dev
```

### Step 5 (macOS) — Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

### Step 6 (macOS) — Train ML Models + Start Flask

```bash
cd ml
source venv/bin/activate

# Train all models (run once)
python3 generate_sample_data.py   # Feature 1 dataset
python3 model.py                   # Feature 1: Random Forest + XGBoost
python3 ecosystem_model.py         # Feature 3: Ecosystem model
python3 otolith_model.py           # Feature 4: ResNet50 model

# For Feature 2 (Species): download dataset first
python3 download_dataset.py        # or setup_kaggle_dataset.py
python3 species_model.py           # Train MobileNetV2

# Start Flask API
python3 app.py
```

---

## 🪟 Windows Setup

### Step 2 (Windows) — Python Environment

Open **Command Prompt** or **PowerShell** as Administrator:

```cmd
cd ml

# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

> ⚠️ **Windows Note:** Use `python` instead of `python3` and `pip` instead of `pip3`

### Step 3 (Windows) — Start MongoDB

**Option A — MongoDB installed as a service (recommended):**
```cmd
# Start MongoDB service
net start MongoDB

# If not installed as service, run manually:
"C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" --dbpath "C:\data\db"
```

**Option B — Create data directory first:**
```cmd
mkdir C:\data\db
"C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" --dbpath C:\data\db
```

**Verify MongoDB:**
```cmd
mongosh
```

### Step 4 (Windows) — Backend (Express)

```cmd
cd backend
npm install
```

Create `.env` file in `backend/` folder:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/fishdb
FLASK_URL=http://localhost:5001
JWT_SECRET=your_super_secret_key_change_this
```

```cmd
# Start Express server
npm run dev
```

### Step 5 (Windows) — Frontend (React)

```cmd
cd frontend
npm install
npm run dev
```

### Step 6 (Windows) — Train ML Models + Start Flask

```cmd
cd ml
venv\Scripts\activate

# Train all models (run once)
python generate_sample_data.py
python model.py
python ecosystem_model.py
python otolith_model.py

# For Feature 2 (Species)
python download_dataset.py
python species_model.py

# Start Flask API
python app.py
```

> ⚠️ **Windows Note:** If `opencv-python` fails, try:
> ```cmd
> pip install opencv-python-headless
> ```

---

## 🖥️ Running All Services (3 Terminals)

### macOS
```bash
# Terminal 1 — Flask ML API
cd ml && source venv/bin/activate && python3 app.py

# Terminal 2 — Express Backend
cd backend && npm run dev

# Terminal 3 — React Frontend
cd frontend && npm run dev
```

### Windows
```cmd
:: Terminal 1 — Flask ML API
cd ml
venv\Scripts\activate
python app.py

:: Terminal 2 — Express Backend
cd backend
npm run dev

:: Terminal 3 — React Frontend
cd frontend
npm run dev
```

---

## 🌐 Service URLs

| Service | URL | Check |
|---------|-----|-------|
| React Frontend | http://localhost:5173 | Open in browser |
| Express Backend | http://localhost:5000/api/health | Should return `{"status":"ok"}` |
| Flask ML API | http://localhost:5001/health | Should return model status |
| MongoDB | mongodb://localhost:27017/fishdb | Via mongosh |

---

## 👥 User Roles

| Role | Features Available |
|------|--------------------|
| 🎣 Fisherman | Fish Prediction (simple), Species ID, History |
| 🔬 Scientist | All 5 features (full technical mode) |
| 📋 Policymaker | Ecosystem Health (simplified), History |
| 🎓 PhD Student | All 5 features (research mode) |

---

## 🗃️ MongoDB Schemas

| Collection | Description |
|-----------|-------------|
| `users` | Auth — name, email, bcrypt password, role |
| `predictions` | Feature 1 — fish abundance results |
| `speciesresults` | Feature 2 — species identification |
| `ecosystemhealths` | Feature 3 — ecosystem assessments |
| `otolithresults` | Feature 4 — otolith ring analyses |
| `ednaresults` | Feature 5 — eDNA matches |

---

## 📡 API Reference

### Auth Endpoints
```
POST /api/auth/register    → Register new user
POST /api/auth/login       → Login + get JWT token
GET  /api/auth/me          → Get current user info
```

### Feature Endpoints (require JWT Bearer token)
```
POST /api/predict              → Fish abundance prediction
GET  /api/history              → Past predictions
POST /api/identify-species     → Species identification (image)
GET  /api/species-history      → Past identifications
POST /api/ecosystem-health     → Ecosystem assessment
GET  /api/ecosystem-history    → Past assessments
POST /api/analyze-otolith      → Otolith ring analysis (image)
GET  /api/otolith-history      → Past analyses
POST /api/match-edna           → eDNA species match
GET  /api/edna-history         → Past matches
```

---

## 🐛 Common Issues & Fixes

| Problem | OS | Fix |
|---------|-----|-----|
| `tensorflow` not found | macOS M1 | Use `tensorflow-macos` + `tensorflow-metal` |
| `python` not recognized | Windows | Install Python and add to PATH |
| `mongod` not found | Windows | Add MongoDB bin folder to system PATH |
| `ECONNREFUSED 5001` | Both | Flask not running — run `python app.py` |
| `ECONNREFUSED 5000` | Both | Express not running — run `npm run dev` |
| `JWT_SECRET missing` | Both | Check `.env` file is in `backend/` folder |
| `cv2` import error | Both | Run `pip install opencv-python` |
| `No module Bio` | Both | Run `pip install biopython` |
| `pkl file not found` | Both | Run model training scripts first |
| History shows zeros | Both | Clear DB: `db.predictions.deleteMany({})` |
| `venv\Scripts\activate` fails | Windows | Run PowerShell as Admin, then: `Set-ExecutionPolicy RemoteSigned` |
| Port 5173 in use | Both | Change port: `npm run dev -- --port 3000` |

---

## 🧹 Database Reset (if needed)

```bash
mongosh fishdb
db.predictions.deleteMany({})
db.speciesresults.deleteMany({})
db.ecosystemhealths.deleteMany({})
db.otolithresults.deleteMany({})
db.ednaresults.deleteMany({})
exit
```

---

## 🌊 Real Data Sources

For production deployment, replace synthetic datasets with:

| Source | URL | Data |
|--------|-----|------|
| INCOIS | https://www.incois.gov.in | Indian ocean parameters |
| CMEMS | https://marine.copernicus.eu | Global ocean data |
| NASA OceanColor | https://oceancolor.gsfc.nasa.gov | Chlorophyll-a |
| NCBI GenBank | https://www.ncbi.nlm.nih.gov | DNA sequences |
| iNaturalist | https://www.inaturalist.org | Species photos |

---

## 📄 License

Academic project — CMLRE Centre for Marine Living Resources and Ecology, India.

---

## 🙏 Acknowledgements

- [CMLRE](http://www.cmlre.gov.in/) — Centre for Marine Living Resources and Ecology
- [INCOIS](https://www.incois.gov.in/) — Indian National Centre for Ocean Information Services
- [Scikit-learn](https://scikit-learn.org/) — ML library
- [TensorFlow / Keras](https://tensorflow.org/) — Deep learning
- [XGBoost](https://xgboost.readthedocs.io/) — Gradient boosting
- [OpenCV](https://opencv.org/) — Computer vision
- [BioPython](https://biopython.org/) — Bioinformatics
- [Leaflet.js](https://leafletjs.com/) — Interactive maps
- [OpenStreetMap](https://www.openstreetmap.org/) — Map tiles