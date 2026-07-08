"""
Content Creator Order Tracker — FastAPI Backend
Run: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import json, os, uuid
from datetime import date, datetime, timedelta

app = FastAPI(title="Content Creator Order Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = "db.json"

# ── DB helpers ────────────────────────────────────────────────────────────────
def load_db() -> dict:
    if not os.path.exists(DB_FILE):
        return {"orders": [], "custom_platforms": {}}
    with open(DB_FILE) as f:
        return json.load(f)

def save_db(data: dict):
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=2, default=str)

# ── Models ────────────────────────────────────────────────────────────────────
class SubProduct(BaseModel):
    id: Optional[str] = None
    name: str
    qty: int = 1
    price: float = 0
    policy_days: Optional[int] = None
    delivery: Optional[str] = None          # ISO date string
    return_deadline: Optional[str] = None   # ISO date string (auto-calculated)
    delivered: bool = False
    returned: bool = False

class Order(BaseModel):
    id: Optional[str] = None
    created: Optional[str] = None
    platform: str
    order_id: Optional[str] = None
    name: str
    amount: float = 0
    status: str = "Pending"
    order_date: Optional[str] = None
    delivery_date: Optional[str] = None
    content_type: Optional[str] = None
    notes: Optional[str] = None
    sub_products: List[SubProduct] = []

class CustomPlatform(BaseModel):
    name: str
    color: str

# ── Return deadline helper ────────────────────────────────────────────────────
def compute_deadline(delivery: Optional[str], policy_days: Optional[int]) -> Optional[str]:
    if not delivery or not policy_days:
        return None
    try:
        d = date.fromisoformat(delivery)
        return (d + timedelta(days=policy_days)).isoformat()
    except Exception:
        return None

def enrich_subproduct(sp: dict) -> dict:
    """Auto-fill return_deadline if missing but delivery+policy_days present."""
    if not sp.get("return_deadline") and sp.get("delivery") and sp.get("policy_days"):
        sp["return_deadline"] = compute_deadline(sp["delivery"], sp["policy_days"])
    if "id" not in sp or not sp["id"]:
        sp["id"] = str(uuid.uuid4())
    return sp

# ── Stats helper ──────────────────────────────────────────────────────────────
def compute_stats(orders: list) -> dict:
    today = date.today()
    spent = sum(o.get("amount", 0) for o in orders)
    delivered = sum(1 for o in orders if o.get("status") == "Delivered")
    picked_up = sum(1 for o in orders if o.get("status") == "Picked Up")
    in_transit = sum(1 for o in orders if o.get("status") == "In Transit")

    delivering_soon = 0
    for o in orders:
        if o.get("status") == "In Transit" and o.get("delivery_date"):
            try:
                dd = date.fromisoformat(o["delivery_date"])
                diff = (dd - today).days
                if 0 <= diff <= 3:
                    delivering_soon += 1
            except Exception:
                pass

    urgent = 0
    for o in orders:
        for sp in o.get("sub_products", []):
            if sp.get("returned"):
                continue
            rd = sp.get("return_deadline")
            if rd:
                try:
                    dl = date.fromisoformat(rd)
                    diff = (dl - today).days
                    if diff <= 5:
                        urgent += 1
                        break
                except Exception:
                    pass

    return {
        "total_spent": spent,
        "total_orders": len(orders),
        "delivering_soon": delivering_soon,
        "delivered": delivered,
        "picked_up": picked_up,
        "urgent_returns": urgent,
        "in_transit": in_transit,
    }

# ══════════════════════════════════════════════════════════════════════════════
#  ROUTES
# ══════════════════════════════════════════════════════════════════════════════

# ── Stats ─────────────────────────────────────────────────────────────────────
@app.get("/stats")
def get_stats():
    db = load_db()
    return compute_stats(db["orders"])

# ── Custom platforms ──────────────────────────────────────────────────────────
@app.get("/platforms")
def get_platforms():
    db = load_db()
    return db.get("custom_platforms", {})

@app.post("/platforms")
def add_platform(p: CustomPlatform):
    db = load_db()
    db["custom_platforms"][p.name] = p.color
    save_db(db)
    return {"name": p.name, "color": p.color}

@app.delete("/platforms/{name}")
def delete_platform(name: str):
    db = load_db()
    db["custom_platforms"].pop(name, None)
    save_db(db)
    return {"deleted": name}

# ── Orders ────────────────────────────────────────────────────────────────────
@app.get("/orders")
def get_orders(status: Optional[str] = None, sort: str = "newest"):
    db = load_db()
    orders = db["orders"]
    if status and status != "All":
        orders = [o for o in orders if o.get("status") == status]
    if sort == "newest":
        orders = sorted(orders, key=lambda o: o.get("created", ""), reverse=True)
    elif sort == "oldest":
        orders = sorted(orders, key=lambda o: o.get("created", ""))
    elif sort == "amount":
        orders = sorted(orders, key=lambda o: o.get("amount", 0), reverse=True)
    elif sort == "return":
        def min_deadline(o):
            deadlines = [sp["return_deadline"] for sp in o.get("sub_products", [])
                         if sp.get("return_deadline") and not sp.get("returned")]
            return min(deadlines) if deadlines else "9999"
        orders = sorted(orders, key=min_deadline)
    return orders

@app.post("/orders", status_code=201)
def create_order(order: Order):
    db = load_db()
    data = order.dict()
    data["id"] = str(uuid.uuid4())
    data["created"] = datetime.utcnow().isoformat()
    data["sub_products"] = [enrich_subproduct(sp) for sp in data["sub_products"]]
    db["orders"].insert(0, data)
    save_db(db)
    return data

@app.get("/orders/{order_id}")
def get_order(order_id: str):
    db = load_db()
    o = next((o for o in db["orders"] if o["id"] == order_id), None)
    if not o:
        raise HTTPException(404, "Order not found")
    return o

@app.put("/orders/{order_id}")
def update_order(order_id: str, order: Order):
    db = load_db()
    idx = next((i for i, o in enumerate(db["orders"]) if o["id"] == order_id), None)
    if idx is None:
        raise HTTPException(404, "Order not found")
    data = order.dict()
    data["id"] = order_id
    data["created"] = db["orders"][idx].get("created")
    data["sub_products"] = [enrich_subproduct(sp) for sp in data["sub_products"]]
    db["orders"][idx] = data
    save_db(db)
    return data

@app.patch("/orders/{order_id}/status")
def update_order_status(order_id: str, payload: dict):
    db = load_db()
    o = next((o for o in db["orders"] if o["id"] == order_id), None)
    if not o:
        raise HTTPException(404, "Order not found")
    o["status"] = payload.get("status", o["status"])
    save_db(db)
    return o

@app.delete("/orders/{order_id}")
def delete_order(order_id: str):
    db = load_db()
    before = len(db["orders"])
    db["orders"] = [o for o in db["orders"] if o["id"] != order_id]
    if len(db["orders"]) == before:
        raise HTTPException(404, "Order not found")
    save_db(db)
    return {"deleted": order_id}

# ── Sub-products ──────────────────────────────────────────────────────────────
@app.post("/orders/{order_id}/subproducts", status_code=201)
def add_subproduct(order_id: str, sp: SubProduct):
    db = load_db()
    o = next((o for o in db["orders"] if o["id"] == order_id), None)
    if not o:
        raise HTTPException(404, "Order not found")
    data = enrich_subproduct(sp.dict())
    if not data.get("return_deadline") and data.get("policy_days"):
        data["return_deadline"] = compute_deadline(data.get("delivery") or o.get("delivery_date"), data["policy_days"])
    o["sub_products"].append(data)
    save_db(db)
    return data

@app.put("/orders/{order_id}/subproducts/{sp_id}")
def update_subproduct(order_id: str, sp_id: str, sp: SubProduct):
    db = load_db()
    o = next((o for o in db["orders"] if o["id"] == order_id), None)
    if not o:
        raise HTTPException(404, "Order not found")
    idx = next((i for i, s in enumerate(o["sub_products"]) if s.get("id") == sp_id), None)
    if idx is None:
        raise HTTPException(404, "Sub-product not found")
    data = sp.dict()
    data["id"] = sp_id
    if not data.get("return_deadline") and data.get("policy_days"):
        data["return_deadline"] = compute_deadline(data.get("delivery") or o.get("delivery_date"), data["policy_days"])
    o["sub_products"][idx] = data
    save_db(db)
    return data

@app.patch("/orders/{order_id}/subproducts/{sp_id}")
def patch_subproduct(order_id: str, sp_id: str, payload: dict):
    db = load_db()
    o = next((o for o in db["orders"] if o["id"] == order_id), None)
    if not o:
        raise HTTPException(404, "Order not found")
    sp = next((s for s in o["sub_products"] if s.get("id") == sp_id), None)
    if not sp:
        raise HTTPException(404, "Sub-product not found")
    sp.update(payload)
    save_db(db)
    return sp

@app.delete("/orders/{order_id}/subproducts/{sp_id}")
def delete_subproduct(order_id: str, sp_id: str):
    db = load_db()
    o = next((o for o in db["orders"] if o["id"] == order_id), None)
    if not o:
        raise HTTPException(404, "Order not found")
    before = len(o["sub_products"])
    o["sub_products"] = [s for s in o["sub_products"] if s.get("id") != sp_id]
    if len(o["sub_products"]) == before:
        raise HTTPException(404, "Sub-product not found")
    save_db(db)
    return {"deleted": sp_id}

# ── CSV export ────────────────────────────────────────────────────────────────
from fastapi.responses import StreamingResponse
import csv, io

@app.get("/export/csv")
def export_csv():
    db = load_db()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Platform","Order ID","Name","Amount","Status","Order Date","Delivery Date",
                     "Content Type","Notes","Sub-product","Qty","Price","Policy Days","Return Deadline","Delivered?","Returned?"])
    for o in db["orders"]:
        subs = o.get("sub_products", [])
        if not subs:
            writer.writerow([o.get("platform",""), o.get("order_id",""), o.get("name",""),
                              o.get("amount",""), o.get("status",""), o.get("order_date",""),
                              o.get("delivery_date",""), o.get("content_type",""), o.get("notes",""),
                              "","","","","","",""])
        else:
            for sp in subs:
                writer.writerow([o.get("platform",""), o.get("order_id",""), o.get("name",""),
                                  o.get("amount",""), o.get("status",""), o.get("order_date",""),
                                  o.get("delivery_date",""), o.get("content_type",""), o.get("notes",""),
                                  sp.get("name",""), sp.get("qty",""), sp.get("price",""),
                                  sp.get("policy_days",""), sp.get("return_deadline",""),
                                  "Yes" if sp.get("delivered") else "No",
                                  "Yes" if sp.get("returned") else "No"])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=orders_{date.today()}.csv"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
