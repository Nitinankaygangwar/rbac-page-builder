/**
 * POST /api/auth/signup
 *
 * Creates a new user account. New self-registered users always
 * receive the "viewer" role — role escalation requires an admin.
 *
 * Body: { name, email, password, confirmPassword }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import connectDB from "@/lib/db";
import UserModel from "@/models/User";

// ─── Validation ───────────────────────────────────────────────────────────────

const SignupSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(60, "Name cannot exceed 60 characters")
      .trim(),
    email: z
      .string()
      .email("Please enter a valid email address")
      .toLowerCase()
      .trim(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SignupSchema.safeParse(body);

    if (!parsed.success) {
      // Return the first validation error message
      const firstError = parsed.error.errors[0];
      return NextResponse.json(
        { success: false, error: firstError.message },
        { status: 400 }
      );
    }

    await connectDB();

    // Check for duplicate email
    const existing = await UserModel.findOne({ email: parsed.data.email });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Create user — always "viewer" for self-registration
    const user = await UserModel.create({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      role: "viewer", // SECURITY: never trust client-provided role
    });

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully",
        data: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("[signup]", err);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
