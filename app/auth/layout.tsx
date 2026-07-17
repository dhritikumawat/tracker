import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Auth - Order Tracker",
  description: "Sign in or sign up to your order tracker",
};

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/");
  }

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <nav style={{ padding: "1rem", borderBottom: "1px solid #ddd" }}>
            <Link href="/" style={{ textDecoration: "none", fontSize: "1.25rem", fontWeight: "bold" }}>
              📦 Order Tracker
            </Link>
          </nav>
          <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", padding: "2rem" }}>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
