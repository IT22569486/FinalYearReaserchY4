/**
 * Admin Account Seeder
 * Creates a default admin user if one doesn't already exist.
 *
 * Usage:
 *   node seeders/adminSeeder.js
 *
 * Default credentials:
 *   Email:    admin@smartbus.lk
 *   Password: admin123
 *   Role:     admin
 */

const { db } = require("../firebase");
const bcrypt = require("bcrypt");

const DEFAULT_ADMIN = {
  name: "System Admin",
  email: "admin@smartbus.lk",
  password: "admin123",
  role: "admin",
};

async function seedAdmin() {
  console.log("=".repeat(50));
  console.log("SmartBus Fleet Manager - Admin Seeder");
  console.log("=".repeat(50));

  try {
    // Check if admin already exists
    const existing = await db
      .collection("users")
      .where("email", "==", DEFAULT_ADMIN.email)
      .get();

    if (!existing.empty) {
      const doc = existing.docs[0];
      const data = doc.data();
      console.log(`\nAdmin already exists:`);
      console.log(`  Name:  ${data.name}`);
      console.log(`  Email: ${data.email}`);
      console.log(`  Role:  ${data.role || "user"}`);

      // Ensure role is set to admin
      if (data.role !== "admin") {
        await doc.ref.update({ role: "admin" });
        console.log(`  -> Updated role to admin`);
      }

      console.log("\nNo seeding needed.");
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 10);

    // Create admin user
    const docRef = await db.collection("users").add({
      name: DEFAULT_ADMIN.name,
      email: DEFAULT_ADMIN.email,
      password: hashedPassword,
      role: DEFAULT_ADMIN.role,
      createdAt: new Date(),
    });

    console.log(`\nDefault admin account created successfully!`);
    console.log(`  ID:       ${docRef.id}`);
    console.log(`  Name:     ${DEFAULT_ADMIN.name}`);
    console.log(`  Email:    ${DEFAULT_ADMIN.email}`);
    console.log(`  Password: ${DEFAULT_ADMIN.password}`);
    console.log(`  Role:     ${DEFAULT_ADMIN.role}`);
    console.log(`\n  ** Change the password after first login! **`);
  } catch (error) {
    console.error(`\nError seeding admin: ${error.message}`);
    throw error;
  }
}

// Run
seedAdmin()
  .then(() => {
    console.log("\n" + "=".repeat(50));
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
