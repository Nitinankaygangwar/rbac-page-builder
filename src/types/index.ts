// ─── Roles ────────────────────────────────────────────────────────────────────

export type Role = "viewer" | "editor" | "admin" | "super_admin";

export const ROLES: Record<string, Role> = {
  VIEWER: "viewer",
  EDITOR: "editor",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
} as const;

export const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  super_admin: 4,
};

// ─── Permissions ──────────────────────────────────────────────────────────────

export type Permission =
  | "page:read"
  | "page:create"
  | "page:edit"
  | "page:delete"
  | "page:publish"
  | "page:unpublish"
  | "user:read"
  | "user:create"
  | "user:update"
  | "user:delete"
  | "user:assign_role"
  | "settings:read"
  | "settings:update"
  | "audit:read";

// ─── Page ─────────────────────────────────────────────────────────────────────

export type PageStatus = "draft" | "preview" | "published" | "archived";

export interface PageBlock {
  id: string;
  type: "heading" | "paragraph" | "image" | "quote" | "divider" | "columns";
  content: string;
  attrs?: Record<string, unknown>;
}

export interface Page {
  _id: string;
  title: string;
  slug: string;
  status: PageStatus;
  content: string; // TipTap JSON stringified
  blocks?: PageBlock[];
  authorId: string;
  authorName: string;
  lastEditedById?: string;
  lastEditedByName?: string;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageFormData {
  title: string;
  slug: string;
  content: string;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface UserFormData {
  name: string;
  email: string;
  password?: string;
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

// ─── Session ──────────────────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
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
