import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Order Tracker",
  description: "Track your orders with ease",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <nav style={{
            padding: "1rem 2rem",
            borderBottom: "1px solid #ddd",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#f5f5f5",
          }}>
            <div style={{ fontSize: "1.25rem", fontWeight: "bold" }}>
              📦 Order Tracker
            </div>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <span>{session.user?.name || session.user?.email}</span>
              <a href="/api/auth/signout" style={{
                padding: "0.5rem 1rem",
                background: "#0070f3",
                color: "white",
                textDecoration: "none",
                borderRadius: "4px",
              }}>
                Sign Out
              </a>
            </div>
          </nav>
          <div style={{ flex: 1, padding: "2rem" }}>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
