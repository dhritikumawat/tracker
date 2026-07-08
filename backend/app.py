from flask import Flask, jsonify, request
from flask_cors import CORS
import json, os, uuid
from datetime import datetime, date

app = Flask(__name__)
CORS(app)

DATA_FILE = os.path.join(os.path.dirname(__file__), "data.json")

# ── Helpers ────────────────────────────────────────────────────────────────────
def load():
    if not os.path.exists(DATA_FILE):
        return {"orders": [], "custom_platforms": {}}
    with open(DATA_FILE) as f:
        return json.load(f)

def dump(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

def today_str():
    return date.today().isoformat()

def days_between(d1_str, d2_str):
    try:
        d1 = date.fromisoformat(d1_str)
        d2 = date.fromisoformat(d2_str)
        return (d2 - d1).days
    except Exception:
        return None

def return_deadline(delivery_date, policy_days):
    try:
        d = date.fromisoformat(delivery_date)
        from datetime import timedelta
        return (d + timedelta(days=int(policy_days))).isoformat()
    except Exception:
        return None

def compute_return_status(sp):
    if sp.get("returned"):
        return {"label": "Returned", "cls": "done", "days_left": None, "pct": 100}
    rd = sp.get("returnDeadline")
    if not rd:
        return None
    today = date.today()
    try:
        dl = date.fromisoformat(rd)
    except Exception:
        return None
    delivery = sp.get("delivery")
    if delivery:
        try:
            del_d = date.fromisoformat(delivery)
            total = (dl - del_d).days
        except Exception:
            total = int(sp.get("policyDays") or 7)
    else:
        total = int(sp.get("policyDays") or 7)
    left = (dl - today).days
    pct = min(100, max(0, round(((total - left) / max(total, 1)) * 100)))
    if left < 0:  return {"label": "Expired",       "cls": "danger", "days_left": left, "pct": 100}
    if left <= 2: return {"label": f"{left}d left", "cls": "danger", "days_left": left, "pct": pct}
    if left <= 5: return {"label": f"{left}d left", "cls": "warn",   "days_left": left, "pct": pct}
    return             {"label": f"{left}d left", "cls": "safe",   "days_left": left, "pct": pct}

def enrich_order(o):
    """Attach computed fields so frontend doesn't need to re-derive them."""
    subs = o.get("subProducts", [])
    for sp in subs:
        sp["_returnStatus"] = compute_return_status(sp)
    today = date.today()
    is_urgent = any(
        not s.get("returned") and compute_return_status(s) and compute_return_status(s)["cls"] in ("danger", "warn")
        for s in subs
    )
    is_expired = any(
        not s.get("returned") and compute_return_status(s) and compute_return_status(s).get("days_left", 0) is not None and compute_return_status(s).get("days_left", 0) < 0
        for s in subs
    )
    o["_isUrgent"] = is_urgent
    o["_isExpired"] = is_expired
    return o

# ── Stats endpoint ─────────────────────────────────────────────────────────────
@app.route("/api/stats")
def stats():
    data = load()
    orders = data["orders"]
    today = date.today()
    spent = sum(o.get("amount", 0) for o in orders)
    delivered = sum(1 for o in orders if o.get("status") == "Delivered")
    pickup = sum(1 for o in orders if o.get("status") == "Picked Up")
    urgent = 0
    del_soon = 0
    for o in orders:
        enriched = enrich_order(dict(o))
        if enriched["_isUrgent"] or enriched["_isExpired"]:
            urgent += 1
        if o.get("status") == "In Transit" and o.get("deliveryDate"):
            try:
                dd = date.fromisoformat(o["deliveryDate"])
                diff = (dd - today).days
                if 0 <= diff <= 3:
                    del_soon += 1
            except Exception:
                pass
    return jsonify({
        "total_spent": spent,
        "total_orders": len(orders),
        "delivering_soon": del_soon,
        "delivered": delivered,
        "picked_up": pickup,
        "urgent_returns": urgent,
    })

# ── Orders CRUD ────────────────────────────────────────────────────────────────
@app.route("/api/orders")
def get_orders():
    data = load()
    orders = [enrich_order(dict(o)) for o in data["orders"]]
    filter_by = request.args.get("status")
    sort_by = request.args.get("sort", "newest")
    if filter_by and filter_by != "All":
        orders = [o for o in orders if o.get("status") == filter_by]
    if sort_by == "newest":
        orders.sort(key=lambda o: o.get("created", ""), reverse=True)
    elif sort_by == "oldest":
        orders.sort(key=lambda o: o.get("created", ""))
    elif sort_by == "amount":
        orders.sort(key=lambda o: o.get("amount", 0), reverse=True)
    elif sort_by == "return":
        def min_return(o):
            dates = [s.get("returnDeadline") for s in o.get("subProducts", []) if s.get("returnDeadline") and not s.get("returned")]
            return min(dates) if dates else "9999"
        orders.sort(key=min_return)
    return jsonify(orders)

@app.route("/api/orders", methods=["POST"])
def create_order():
    data = load()
    body = request.json
    delivery_date = body.get("deliveryDate", "")
    subs = []
    for sp in body.get("subProducts", []):
        if sp.get("name"):
            rd = sp.get("returnDeadline") or return_deadline(sp.get("delivery") or delivery_date, sp.get("policyDays"))
            subs.append({**sp, "returnDeadline": rd, "delivered": False, "returned": False})
    order = {
        "id": str(uuid.uuid4()),
        "created": datetime.utcnow().isoformat(),
        "platform": body.get("platform", "Other"),
        "orderId": body.get("orderId", ""),
        "name": body.get("name", ""),
        "amount": float(body.get("amount") or 0),
        "status": body.get("status", "Pending"),
        "orderDate": body.get("orderDate", ""),
        "deliveryDate": delivery_date,
        "contentType": body.get("contentType", ""),
        "notes": body.get("notes", ""),
        "subProducts": subs,
    }
    data["orders"].insert(0, order)
    dump(data)
    return jsonify(enrich_order(order)), 201

@app.route("/api/orders/<order_id>", methods=["PATCH"])
def update_order(order_id):
    data = load()
    order = next((o for o in data["orders"] if o["id"] == order_id), None)
    if not order:
        return jsonify({"error": "Not found"}), 404
    body = request.json
    for key in ["status", "name", "amount", "orderId", "deliveryDate", "orderDate", "contentType", "notes", "platform"]:
        if key in body:
            order[key] = body[key]
    dump(data)
    return jsonify(enrich_order(order))

@app.route("/api/orders/<order_id>", methods=["DELETE"])
def delete_order(order_id):
    data = load()
    data["orders"] = [o for o in data["orders"] if o["id"] != order_id]
    dump(data)
    return jsonify({"ok": True})

# ── Sub-product actions ────────────────────────────────────────────────────────
@app.route("/api/orders/<order_id>/subproducts", methods=["POST"])
def add_subproduct(order_id):
    data = load()
    order = next((o for o in data["orders"] if o["id"] == order_id), None)
    if not order:
        return jsonify({"error": "Not found"}), 404
    body = request.json
    delivery_date = order.get("deliveryDate", "")
    subs_to_add = body if isinstance(body, list) else [body]
    for sp in subs_to_add:
        if sp.get("name"):
            rd = sp.get("returnDeadline") or return_deadline(sp.get("delivery") or delivery_date, sp.get("policyDays"))
            order["subProducts"].append({**sp, "returnDeadline": rd, "delivered": False, "returned": False})
    dump(data)
    return jsonify(enrich_order(order))

@app.route("/api/orders/<order_id>/subproducts/<int:si>", methods=["PATCH"])
def update_subproduct(order_id, si):
    data = load()
    order = next((o for o in data["orders"] if o["id"] == order_id), None)
    if not order or si >= len(order.get("subProducts", [])):
        return jsonify({"error": "Not found"}), 404
    body = request.json
    sp = order["subProducts"][si]
    for key in ["name", "qty", "price", "policyDays", "delivery", "delivered", "returned"]:
        if key in body:
            sp[key] = body[key]
    if "delivery" in body or "policyDays" in body:
        sp["returnDeadline"] = return_deadline(sp.get("delivery", ""), sp.get("policyDays", "")) or sp.get("returnDeadline", "")
    if "returnDeadline" in body:
        sp["returnDeadline"] = body["returnDeadline"]
    dump(data)
    return jsonify(enrich_order(order))

@app.route("/api/orders/<order_id>/subproducts/<int:si>", methods=["DELETE"])
def delete_subproduct(order_id, si):
    data = load()
    order = next((o for o in data["orders"] if o["id"] == order_id), None)
    if not order or si >= len(order.get("subProducts", [])):
        return jsonify({"error": "Not found"}), 404
    order["subProducts"].pop(si)
    dump(data)
    return jsonify(enrich_order(order))

# ── Custom platforms ───────────────────────────────────────────────────────────
@app.route("/api/platforms")
def get_platforms():
    data = load()
    return jsonify(data.get("custom_platforms", {}))

@app.route("/api/platforms", methods=["POST"])
def save_platform():
    data = load()
    body = request.json
    name = body.get("name", "").strip()
    color = body.get("color", "#6B7C5C")
    if not name:
        return jsonify({"error": "Name required"}), 400
    data.setdefault("custom_platforms", {})[name] = color
    dump(data)
    return jsonify(data["custom_platforms"])

if __name__ == "__main__":
    app.run(debug=True, port=5000)
