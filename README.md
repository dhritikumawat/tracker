# Content Creator Order Tracker

Full-stack app: **React** frontend + **Python/Flask** backend.

---

## Project Structure

```
tracker/
├── backend/
│   ├── app.py           ← Flask REST API
│   ├── requirements.txt
│   └── data.json        ← auto-created on first run
└── frontend/
    ├── public/
    ├── src/
    │   ├── App.jsx
    │   ├── api.js
    │   └── components/
    └── package.json
```

---

## Setup & Run

### 1. Backend (Python/Flask)

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Runs at → **http://localhost:5000**

### 2. Frontend (React)

```bash
cd frontend
npm install
npm start
```

Runs at → **http://localhost:3000**

The React app proxies `/api/*` to Flask automatically (configured in `package.json`).

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET    | /api/stats | Summary stats |
| GET    | /api/orders?status=&sort= | List orders |
| POST   | /api/orders | Create order |
| PATCH  | /api/orders/:id | Update order |
| DELETE | /api/orders/:id | Delete order |
| POST   | /api/orders/:id/subproducts | Add sub-products |
| PATCH  | /api/orders/:id/subproducts/:si | Update sub-product |
| DELETE | /api/orders/:id/subproducts/:si | Delete sub-product |
| GET    | /api/platforms | Get custom platforms |
| POST   | /api/platforms | Save custom platform |

---

## Features

- Track orders across Meesho, Myntra, Amazon, Flipkart, Ajio + custom platforms
- Sub-products with individual return policy (N days from delivery) — auto-calculates deadline
- Return window progress bar (green → amber → red)
- Mark sub-products as delivered / returned
- Edit any sub-product
- Stat cards: Total Spent, Orders, Delivering Soon, Delivered, Picked Up, Urgent Returns
- Filter by status, sort by date/amount/return deadline
- Export all data as CSV
- Data persisted in `backend/data.json`
