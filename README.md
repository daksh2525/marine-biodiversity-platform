# 🐟 Fish Abundance Predictor
### CMLRE — Centre for Marine Living Resources and Ecology, India
> Predict fish abundance (kg/km²) in Indian EEZ waters using ocean parameters and machine learning.

---

##  Screenshots

| Home Page | History Page |
|-----------|--------------|
| Sliders + Prediction Result + Leaflet Map | Table + Charts + Export CSV |

---

##  Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js (Vite) + Leaflet.js + Chart.js |
| Backend | Node.js + Express.js |
| ML API | Python + Flask |
| Database | MongoDB + Mongoose |
| ML Models | Random Forest + XGBoost (Ensemble) |

---

##  Project Structure

```
fish-abundance-predictor/
│
├── client/                        # React Frontend (Vite)
│   └── src/
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── OceanMap.jsx       # Leaflet map
│       │   ├── PredictionForm.jsx # Ocean parameter sliders
│       │   ├── ResultCard.jsx     # Prediction result display
│       │   ├── Charts.jsx         # Chart.js visualizations
│       │   └── HistoryTable.jsx   # Sortable, filterable table
│       ├── pages/
│       │   ├── Home.jsx
│       │   └── History.jsx
│       └── services/
│           └── api.js             # Axios API calls
│
├── server/                        # Node.js + Express Backend
│   ├── models/
│   │   ├── Prediction.js          # MongoDB schema
│   │   └── Location.js
│   ├── server.js
│   └── .env
│
├── ml/                            # Python ML + Flask
│   ├── data/
│   │   └── fish_data.csv          # Training dataset
│   ├── models/
│   │   ├── rf_model.pkl           # Saved Random Forest
│   │   └── xgb_model.pkl          # Saved XGBoost
│   ├── generate_sample_data.py
│   ├── model.py                   # Train & evaluate models
│   ├── app.py                     # Flask API
│   └── requirements.txt
│
├── .gitignore
└── README.md
```

---

## ⚙️ Prerequisites

Make sure the following are installed on your machine:

- [Node.js](https://nodejs.org/) ≥ 18
- [Python](https://python.org/) ≥ 3.9
- [MongoDB](https://www.mongodb.com/try/download/community) ≥ 6 (running locally)
- npm ≥ 9

---

## 🚀 Installation & Setup

### Step 1 — Clone the Repository

```bash
git clone https://github.com/your-username/fish-abundance-predictor.git
cd fish-abundance-predictor
```

---

### Step 2 — Python / ML Setup

```bash
cd ml

# Create and activate virtual environment (recommended)
python -m venv venv
source venv/bin/activate        # Mac/Linux
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Generate synthetic training dataset
python generate_sample_data.py

# Train models (creates rf_model.pkl + xgb_model.pkl)
python model.py

# Start Flask API on port 5001
python app.py
```

> ✅ You should see: `Running on http://0.0.0.0:5001`

---

### Step 3 — Express Backend Setup

```bash
cd server

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# OR manually create server/.env with:
# PORT=5000
# MONGO_URI=mongodb://localhost:27017/fishdb
# FLASK_URL=http://localhost:5001

# Start MongoDB (in a separate terminal)
mongod --dbpath /data/db         # Mac/Linux
mongod --dbpath C:\data\db       # Windows

# Start Express server
npm run dev
```

> ✅ You should see: `🚀 Express running on port 5000` and `✅ MongoDB connected`

---

### Step 4 — React Frontend Setup

```bash
cd client          # or cd frontend/vite-project

# Install dependencies
npm install

# Start development server
npm run dev
```

> ✅ Open browser at: `http://localhost:5173`

---

## 🖥️ Running All Services

Open **3 terminals** simultaneously:

```bash
# Terminal 1 — Flask ML API
cd ml && python app.py

# Terminal 2 — Express Backend
cd server && npm run dev

# Terminal 3 — React Frontend
cd client && npm run dev
```

---

## 🌐 Service URLs

| Service | URL | Status Check |
|---------|-----|-------------|
| React Frontend | http://localhost:5173 | Open in browser |
| Express Backend | http://localhost:5000/api/health | Should return `{"status":"ok"}` |
| Flask ML API | http://localhost:5001/health | Should return `{"status":"ok"}` |
| MongoDB | mongodb://localhost:27017/fishdb | Via mongosh |

---

## 📡 API Reference

### Flask API (Port 5001)

#### `POST /predict`
Predict fish abundance from ocean parameters.

**Request Body:**
```json
{
  "temperature": 27.5,
  "salinity": 33.2,
  "oxygen": 6.1,
  "chlorophyll": 1.5,
  "month": 6,
  "depth": 100
}
```

**Response:**
```json
{
  "fish_abundance_kg_km2": 121.26,
  "rf_prediction": 121.23,
  "xgb_prediction": 121.29,
  "category": "High",
  "color": "#2e7d32"
}
```

#### `GET /map-data`
Returns 500 sampled records for the Leaflet map.

---

### Express API (Port 5000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/predict` | Forward to Flask + save to MongoDB |
| `GET` | `/api/history` | Get last 50 predictions |
| `GET` | `/api/map-data` | Proxy Flask map data |
| `DELETE` | `/api/history/:id` | Delete a prediction record |
| `GET` | `/api/health` | Health check |

---

## 🧠 ML Model Details

### Input Features

| Feature | Unit | Range |
|---------|------|-------|
| Sea Surface Temperature | °C | 0 – 40 |
| Salinity | PSU | 0 – 45 |
| Dissolved Oxygen | mg/L | 0 – 15 |
| Chlorophyll-a | mg/m³ | 0 – 20 |
| Month | 1–12 | 1 – 12 |
| Depth | m | 1 – 1000 |

### Target Variable
- **Fish Abundance** — kg/km²

### Models Used
- **Random Forest Regressor** — 200 trees, max depth 12
- **XGBoost Regressor** — 300 estimators, learning rate 0.05
- **Ensemble** — Average of RF + XGBoost predictions

### Abundance Categories

| Category | Range |
|----------|-------|
| 🟢 High | ≥ 80 kg/km² |
| 🟡 Medium | 40 – 79 kg/km² |
| 🔴 Low | < 40 kg/km² |

---

## 📊 Features

- **Interactive sliders** for all 6 ocean parameters
- **Ensemble ML prediction** (RF + XGBoost average)
- **Leaflet.js map** with color-coded Indian EEZ zones
- **Real-time charts** — Temperature vs Abundance, Month-wise distribution
- **Prediction history** with sort, filter, search, pagination
- **CSV export** of all predictions
- **MongoDB persistence** for all predictions

---

## 🗃️ Database Schema

```javascript
// Prediction Document
{
  _id: ObjectId,
  input: {
    temperature: Number,   // °C
    salinity: Number,      // PSU
    oxygen: Number,        // mg/L
    chlorophyll: Number,   // mg/m³
    month: Number,         // 1–12
    depth: Number          // meters
  },
  fish_abundance: Number,  // kg/km² (ensemble)
  rf_prediction: Number,
  xgb_prediction: Number,
  category: "High" | "Medium" | "Low",
  latitude: Number,
  longitude: Number,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🌊 Real Data Sources

For production use, replace the synthetic dataset with real oceanographic data:

| Source | URL | Data |
|--------|-----|------|
| INCOIS | [incois.gov.in](https://www.incois.gov.in) | Indian ocean data |
| CMEMS | [marine.copernicus.eu](https://marine.copernicus.eu) | Global ocean parameters |
| NASA OceanColor | [oceancolor.gsfc.nasa.gov](https://oceancolor.gsfc.nasa.gov) | Chlorophyll-a |
| NOAA | [noaa.gov](https://www.noaa.gov) | SST, salinity |

---

## 🐛 Common Issues

| Problem | Solution |
|---------|----------|
| `ECONNREFUSED 5001` | Flask is not running — run `python app.py` in `ml/` |
| `ECONNREFUSED 5000` | Express is not running — run `npm run dev` in `server/` |
| `MongoServerError` | MongoDB not running — run `mongod` |
| History shows zeros | Clear DB: `db.predictions.deleteMany({})` and re-predict |
| Map not loading | Check internet connection (OpenStreetMap tiles need internet) |
| `pkl file not found` | Run `python model.py` first to generate model files |

---

## 👨‍💻 Development

```bash
# Check MongoDB records
mongosh fishdb
db.predictions.find().pretty()
db.predictions.deleteMany({})   # clear all records

# Test Flask directly
curl -X POST http://localhost:5001/predict \
  -H "Content-Type: application/json" \
  -d '{"temperature":27,"salinity":33,"oxygen":6,"chlorophyll":1.5,"month":6,"depth":100}'

# Test Express
curl http://localhost:5000/api/history
```

---

## 📄 License

This project is built for academic purposes under **CMLRE — Centre for Marine Living Resources and Ecology, India**.

---

## Acknowledgements

- [CMLRE](http://www.cmlre.gov.in/) — Centre for Marine Living Resources and Ecology
- [INCOIS](https://www.incois.gov.in/) — Indian National Centre for Ocean Information Services
- [Scikit-learn](https://scikit-learn.org/) — Random Forest implementation
- [XGBoost](https://xgboost.readthedocs.io/) — Gradient boosting library
- [Leaflet.js](https://leafletjs.com/) — Interactive maps
- [OpenStreetMap](https://www.openstreetmap.org/) — Map tiles