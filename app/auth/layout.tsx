"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);

  if (status === "loading") {
    return <div>Loading...</div>;
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
