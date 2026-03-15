/**
 * GET  /api/seed  — browser-friendly seed (dev only)
 * POST /api/seed  — curl/fetch seed (dev only)
 *
 * Both methods do the same thing so you can just visit
 * http://localhost:3000/api/seed in your browser to create demo users.
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import UserModel from "@/models/User";

const DEMO_USERS = [
  { name: "Super Admin", email: "superadmin@demo.com", password: "Demo1234!", role: "super-admin" as const, isActive: true },
  { name: "Admin User",  email: "admin@demo.com",      password: "Demo1234!", role: "admin"       as const, isActive: true },
  { name: "Editor User", email: "editor@demo.com",     password: "Demo1234!", role: "editor"      as const, isActive: true },
  { name: "Viewer User", email: "viewer@demo.com",     password: "Demo1234!", role: "viewer"      as const, isActive: true },
];

async function seedHandler() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Seed endpoint is disabled in production" },
      { status: 403 }
    );
  }

  try {
    await connectDB();

    const results = [];
    for (const u of DEMO_USERS) {
      const existing = await UserModel.findOne({ email: u.email });
      if (existing) {
        results.push({ email: u.email, status: "skipped — already exists" });
      } else {
        await UserModel.create(u);
        results.push({ email: u.email, status: "created ✓", role: u.role });
      }
    }

    return NextResponse.json(
      { success: true, message: "Demo users ready!", results },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("[seed error]", err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}

// GET  — visit in browser
export const GET  = seedHandler;
// POST — curl / fetch
export const POST = seedHandler;