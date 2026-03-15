/**
 * models/User.ts
 *
 * Schema changes vs original:
 *  + avatarUrl        optional profile image
 *  + isActive         soft-disable accounts without deleting
 *  + comparePassword  instance method (avoids leaking hash to callers)
 *  + password select:false  never returned in queries by default
 *  + pre-save hook    only hashes if modified (safe for role updates)
 */

import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

export type Role = "viewer" | "editor" | "admin" | "super-admin";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: Role;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [60, "Name cannot exceed 60 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,          // ← NEVER returned by default
    },
    role: {
      type: String,
      enum: ["viewer", "editor", "admin", "super-admin"],
      default: "viewer",
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_, ret) {
        ret.id = ret._id?.toString();
        delete ret.password;   // belt-and-suspenders
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Hash password on create or explicit change ────────────────────────────────
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance method — keeps bcrypt out of route handlers ─────────────────────
UserSchema.methods.comparePassword = async function (
  candidate: string
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

// ── Block inactive users at query level (optional middleware hook) ────────────
// UserSchema.pre("find", function() { this.where({ isActive: true }); });

// ── Indexes ───────────────────────────────────────────────────────────────────
// NOTE: email index is already created by `unique: true` in the field definition.
// Declaring it again here with schema.index() causes the Mongoose duplicate warning.
// Only add indexes for fields that don't already have unique/index in the schema.
UserSchema.index({ role: 1 });

const UserModel: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);

export default UserModel;