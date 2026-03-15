/**
 * RBAC Permission Matrix
 *
 * This module defines the permission system for the application.
 * All permission checks MUST go through these utilities — never inline.
 *
 * Role Hierarchy: viewer < editor < admin < super_admin
 */

import type { Permission, Role } from "@/types";

// ─── Permission Matrix ────────────────────────────────────────────────────────

const PERMISSIONS: Record<Role, Permission[]> = {
  viewer: ["page:read"],

  editor: [
    "page:read",
    "page:create",
    "page:edit",
    // editors cannot publish — must go through admin/super_admin
  ],

  admin: [
    "page:read",
    "page:create",
    "page:edit",
    "page:delete",
    "page:publish",
    "page:unpublish",
    "user:read",
    "audit:read",
  ],

  super_admin: [
    "page:read",
    "page:create",
    "page:edit",
    "page:delete",
    "page:publish",
    "page:unpublish",
    "user:read",
    "user:create",
    "user:update",
    "user:delete",
    "user:assign_role",
    "settings:read",
    "settings:update",
    "audit:read",
  ],
};

// ─── Core Checks ──────────────────────────────────────────────────────────────

/**
 * Check whether a role has a specific permission.
 * This is the canonical, pure function — use it in server-side logic.
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check whether a role has ALL of the given permissions.
 */
export function hasAllPermissions(
  role: Role,
  permissions: Permission[]
): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Check whether a role has ANY of the given permissions.
 */
export function hasAnyPermission(
  role: Role,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Get all permissions for a given role.
 */
export function getPermissions(role: Role): Permission[] {
  return PERMISSIONS[role] ?? [];
}

/**
 * Compare role hierarchy: returns true if roleA >= roleB in rank.
 */
export function roleAtLeast(roleA: Role, minRole: Role): boolean {
  const hierarchy: Record<Role, number> = {
    viewer: 1,
    editor: 2,
    admin: 3,
    super_admin: 4,
  };
  return (hierarchy[roleA] ?? 0) >= (hierarchy[minRole] ?? 0);
}

// ─── Page-level Guards ────────────────────────────────────────────────────────

/**
 * Determine if a user can edit a specific page.
 * Editors can only edit their own pages; admins+ can edit any.
 */
export function canEditPage(
  role: Role,
  pageAuthorId: string,
  userId: string
): boolean {
  if (!hasPermission(role, "page:edit")) return false;
  if (roleAtLeast(role, "admin")) return true;
  return pageAuthorId === userId;
}

/**
 * Determine if a user can delete a specific page.
 */
export function canDeletePage(
  role: Role,
  pageAuthorId: string,
  userId: string
): boolean {
  if (!hasPermission(role, "page:delete")) return false;
  if (roleAtLeast(role, "super_admin")) return true;
  // admins can delete any page
  return role === "admin";
}

/**
 * Assignable roles: super_admin can assign any role,
 * admin can assign up to editor (cannot create admins).
 */
export function assignableRoles(actorRole: Role): Role[] {
  if (actorRole === "super_admin") return ["viewer", "editor", "admin", "super_admin"];
  if (actorRole === "admin") return ["viewer", "editor"];
  return [];
}

export { PERMISSIONS };
