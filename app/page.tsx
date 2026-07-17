"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface SubProduct {
  id: string;
  productName: string;
  returned: boolean;
  returnDeadline: string | null;
}

interface Order {
  id: string;
  orderID: string;
  platform: string;
  status: string;
  amount: number;
  subProducts: SubProduct[];
  _isUrgent: boolean;
  _isExpired: boolean;
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        setOrders(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  const stats = {
    total: orders.length,
    urgent: orders.filter(o => o._isUrgent).length,
    expired: orders.filter(o => o._isExpired).length,
    spent: orders.reduce((sum, o) => sum + o.amount, 0),
  };

  return (
    <div>
      <h1>Welcome, {session?.user?.name || "User"}!</h1>

      {/* Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "1rem",
        marginBottom: "2rem",
      }}>
        <div style={{ padding: "1.5rem", background: "#f0f0f0", borderRadius: "8px" }}>
          <div style={{ fontSize: "0.875rem", color: "#666" }}>Total Orders</div>
          <div style={{ fontSize: "2rem", fontWeight: "bold" }}>{stats.total}</div>
        </div>
        <div style={{ padding: "1.5rem", background: "#fff0f0", borderRadius: "8px" }}>
          <div style={{ fontSize: "0.875rem", color: "#666" }}>Urgent Returns</div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#c33" }}>{stats.urgent}</div>
        </div>
        <div style={{ padding: "1.5rem", background: "#f0f0f0", borderRadius: "8px" }}>
          <div style={{ fontSize: "0.875rem", color: "#666" }}>Expired</div>
          <div style={{ fontSize: "2rem", fontWeight: "bold" }}>{stats.expired}</div>
        </div>
        <div style={{ padding: "1.5rem", background: "#f0f0f0", borderRadius: "8px" }}>
          <div style={{ fontSize: "0.875rem", color: "#666" }}>Total Spent</div>
          <div style={{ fontSize: "2rem", fontWeight: "bold" }}>${stats.spent.toFixed(2)}</div>
        </div>
      </div>

      {/* Orders List */}
      <h2>Your Orders</h2>
      {orders.length === 0 ? (
        <p style={{ color: "#666" }}>No orders yet. Create your first order!</p>
      ) : (
        <div style={{
          display: "grid",
          gap: "1rem",
        }}>
          {orders.map(order => (
            <div key={order.id} style={{
              padding: "1.5rem",
              border: "1px solid #ddd",
              borderRadius: "8px",
              background: order._isUrgent ? "#fff5f5" : "#fafafa",
              borderLeft: order._isUrgent ? "4px solid #c33" : "4px solid #0070f3",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                <div>
                  <h3 style={{ margin: "0 0 0.5rem 0" }}>{order.orderID}</h3>
                  <p style={{ margin: 0, color: "#666", fontSize: "0.875rem" }}>
                    Platform: {order.platform} | Status: {order.status}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>${order.amount.toFixed(2)}</div>
                </div>
              </div>

              {order.subProducts.length > 0 && (
                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #ddd" }}>
                  <strong style={{ fontSize: "0.875rem" }}>Items:</strong>
                  <ul style={{ margin: "0.5rem 0", paddingLeft: "1.5rem" }}>
                    {order.subProducts.map(item => (
                      <li key={item.id} style={{ fontSize: "0.875rem", color: "#666" }}>
                        {item.productName} {item.returned ? "✓ Returned" : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
