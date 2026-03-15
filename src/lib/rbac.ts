/**
 * lib/rbac.ts
 * Central RBAC permission matrix.
 * Every permission check in the app must flow through this module.
 */

export type Role = "viewer" | "editor" | "admin" | "super-admin";

export type Permission =
  | "page:read"
  | "page:create"
  | "page:edit"
  | "page:delete"
  | "page:publish"
  | "user:read"
  | "user:manage";

/** Explicit permission grant table — no inheritance surprises */
const PERMISSION_MAP: Record<Role, Permission[]> = {
  viewer: ["page:read"],

  editor: ["page:read", "page:create", "page:edit"],

  admin: [
    "page:read",
    "page:create",
    "page:edit",
    "page:delete",
    "page:publish",
    "user:read",
  ],

  "super-admin": [
    "page:read",
    "page:create",
    "page:edit",
    "page:delete",
    "page:publish",
    "user:read",
    "user:manage",
  ],
};

/** Check one permission for a role */
export function can(role: Role, permission: Permission): boolean {
  return PERMISSION_MAP[role]?.includes(permission) ?? false;
}

/** Check role meets minimum level */
export function atLeast(role: Role, minimum: Role): boolean {
  const rank: Record<Role, number> = {
    viewer: 1,
    editor: 2,
    admin: 3,
    "super-admin": 4,
  };
  return (rank[role] ?? 0) >= (rank[minimum] ?? 0);
}

/** Roles an actor may assign */
export function assignableRoles(actorRole: Role): Role[] {
  if (actorRole === "super-admin") return ["viewer", "editor", "admin", "super-admin"];
  if (actorRole === "admin") return ["viewer", "editor"];
  return [];
}

export { PERMISSION_MAP };
