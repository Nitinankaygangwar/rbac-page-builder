export type Role = "viewer" | "editor" | "admin" | "super-admin";

export type Permission =
  | "page:read"
  | "page:create"
  | "page:edit"
  | "page:delete"
  | "page:publish"
  | "user:read"
  | "user:manage";

const PERMISSION_MAP: Record<Role, Permission[]> = {
  viewer: ["page:read"],
  editor: ["page:read", "page:create", "page:edit"],
  admin:  ["page:read", "page:create", "page:edit", "page:delete", "page:publish", "user:read"],
  "super-admin": ["page:read", "page:create", "page:edit", "page:delete", "page:publish", "user:read", "user:manage"],
};

export function can(role: Role, permission: Permission): boolean {
  return PERMISSION_MAP[role]?.includes(permission) ?? false;
}

export function atLeast(role: Role, minimum: Role): boolean {
  const rank: Record<Role, number> = { viewer: 1, editor: 2, admin: 3, "super-admin": 4 };
  return (rank[role] ?? 0) >= (rank[minimum] ?? 0);
}

export function assignableRoles(actorRole: Role): Role[] {
  if (actorRole === "super-admin") return ["viewer", "editor", "admin", "super-admin"];
  if (actorRole === "admin") return ["viewer", "editor"];
  return [];
}

/** Editors can edit only their own pages; admin+ can edit any */
export function canEditPage(role: Role, pageAuthorId: string, userId: string): boolean {
  if (!can(role, "page:edit")) return false;
  if (atLeast(role, "admin")) return true;
  return pageAuthorId === userId;
}

/** Admin+ can delete any page */
export function canDeletePage(role: Role, pageAuthorId: string, userId: string): boolean {
  if (!can(role, "page:delete")) return false;
  return atLeast(role, "admin");
}

export { PERMISSION_MAP };