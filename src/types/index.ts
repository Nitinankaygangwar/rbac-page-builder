// Re-export everything from rbac.ts as the single source of truth
// This eliminates the duplicate Role type conflict
export type { Role, Permission } from "@/lib/rbac";

// ─── Page ─────────────────────────────────────────────────────────────────────

export type PageStatus = "draft" | "preview" | "published" | "archived";

export interface Page {
  _id: string;
  title: string;
  slug: string;
  status: PageStatus;
  content: string;
  authorId: string;
  authorName: string;
  lastEditedById?: string;
  lastEditedByName?: string;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── User ─────────────────────────────────────────────────────────────────────

import type { Role } from "@/lib/rbac";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

// ─── Session ──────────────────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export interface AuditLog {
  _id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  createdAt: string;
}