import fs from "fs";
import path from "path";
import { prisma } from "./lib/prisma";
import bcrypt from "bcryptjs";

const DATA_FILE = path.join(process.cwd(), "backend", "data.json");

async function migrate() {
  try {
    console.log("Starting migration...");

    // Read old data
    if (!fs.existsSync(DATA_FILE)) {
      console.log("No old data file found");
      return;
    }

    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    console.log(`Found ${data.orders?.length || 0} orders to migrate`);

    if (!data.orders || data.orders.length === 0) {
      console.log("No orders to migrate");
      return;
    }

    // Create a default user
    const user = await prisma.user.create({
      data: {
        name: "Migrated User",
        email: "migrated@example.com",
        password: await bcrypt.hash("Password123!", 10),
      },
    });

    console.log(`Created user: ${user.email}`);

    // Migrate orders
    for (const oldOrder of data.orders) {
      const order = await prisma.order.create({
        data: {
          userId: user.id,
          orderID: oldOrder.orderID || `ORDER-${Date.now()}`,
          platform: oldOrder.platform || "Unknown",
          status: oldOrder.status || "Pending",
          amount: oldOrder.amount || 0,
          deliveryDate: oldOrder.delivery
            ? new Date(oldOrder.delivery)
            : null,
          subProducts: {
            create: (oldOrder.subProducts || []).map((sp: any) => ({
              productName: sp.productName || "Unknown",
              returnDeadline: sp.returnDeadline
                ? new Date(sp.returnDeadline)
                : null,
              delivery: sp.delivery ? new Date(sp.delivery) : null,
              policyDays: sp.policyDays || 7,
              returned: sp.returned || false,
            })),
          },
        },
      });

      console.log(`Migrated order: ${order.orderID}`);
    }

    console.log("✅ Migration complete!");
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
