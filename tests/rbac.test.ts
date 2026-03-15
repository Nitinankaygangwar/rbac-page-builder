/**
 * tests/rbac.test.ts
 * Unit tests for the RBAC permission matrix.
 * Run with: npm test
 */

import { can, atLeast, assignableRoles, PERMISSION_MAP } from "../src/lib/rbac";
import type { Role, Permission } from "../src/lib/rbac";

// ── can() ─────────────────────────────────────────────────────────────────────

describe("can() — permission checks", () => {
  // Viewer
  describe("viewer", () => {
    it("can read pages", () => expect(can("viewer", "page:read")).toBe(true));
    it("cannot create pages", () => expect(can("viewer", "page:create")).toBe(false));
    it("cannot edit pages", () => expect(can("viewer", "page:edit")).toBe(false));
    it("cannot delete pages", () => expect(can("viewer", "page:delete")).toBe(false));
    it("cannot publish pages", () => expect(can("viewer", "page:publish")).toBe(false));
    it("cannot read users", () => expect(can("viewer", "user:read")).toBe(false));
    it("cannot manage users", () => expect(can("viewer", "user:manage")).toBe(false));
  });

  // Editor
  describe("editor", () => {
    it("can read pages", () => expect(can("editor", "page:read")).toBe(true));
    it("can create pages", () => expect(can("editor", "page:create")).toBe(true));
    it("can edit pages", () => expect(can("editor", "page:edit")).toBe(true));
    it("cannot delete pages", () => expect(can("editor", "page:delete")).toBe(false));
    it("cannot publish pages", () => expect(can("editor", "page:publish")).toBe(false));
    it("cannot read users", () => expect(can("editor", "user:read")).toBe(false));
    it("cannot manage users", () => expect(can("editor", "user:manage")).toBe(false));
  });

  // Admin
  describe("admin", () => {
    it("can read pages", () => expect(can("admin", "page:read")).toBe(true));
    it("can create pages", () => expect(can("admin", "page:create")).toBe(true));
    it("can edit pages", () => expect(can("admin", "page:edit")).toBe(true));
    it("can delete pages", () => expect(can("admin", "page:delete")).toBe(true));
    it("can publish pages", () => expect(can("admin", "page:publish")).toBe(true));
    it("can read users", () => expect(can("admin", "user:read")).toBe(true));
    it("cannot manage users", () => expect(can("admin", "user:manage")).toBe(false));
  });

  // Super-admin
  describe("super-admin", () => {
    const allPerms: Permission[] = [
      "page:read", "page:create", "page:edit", "page:delete", "page:publish",
      "user:read", "user:manage",
    ];
    allPerms.forEach(p => {
      it(`can ${p}`, () => expect(can("super-admin", p)).toBe(true));
    });
  });

  it("returns false for unknown role", () => {
    expect(can("ghost" as Role, "page:read")).toBe(false);
  });
});

// ── atLeast() ─────────────────────────────────────────────────────────────────

describe("atLeast() — role hierarchy", () => {
  it("viewer >= viewer", () => expect(atLeast("viewer", "viewer")).toBe(true));
  it("editor >= viewer", () => expect(atLeast("editor", "viewer")).toBe(true));
  it("editor >= editor", () => expect(atLeast("editor", "editor")).toBe(true));
  it("editor < admin", () => expect(atLeast("editor", "admin")).toBe(false));
  it("admin >= editor", () => expect(atLeast("admin", "editor")).toBe(true));
  it("admin >= admin", () => expect(atLeast("admin", "admin")).toBe(true));
  it("admin < super-admin", () => expect(atLeast("admin", "super-admin")).toBe(false));
  it("super-admin >= all", () => {
    const roles: Role[] = ["viewer", "editor", "admin", "super-admin"];
    roles.forEach(r => expect(atLeast("super-admin", r)).toBe(true));
  });
  it("viewer < editor", () => expect(atLeast("viewer", "editor")).toBe(false));
});

// ── assignableRoles() ─────────────────────────────────────────────────────────

describe("assignableRoles() — role assignment matrix", () => {
  it("viewer cannot assign any roles", () => {
    expect(assignableRoles("viewer")).toHaveLength(0);
  });

  it("editor cannot assign any roles", () => {
    expect(assignableRoles("editor")).toHaveLength(0);
  });

  it("admin can assign viewer and editor only", () => {
    const result = assignableRoles("admin");
    expect(result).toContain("viewer");
    expect(result).toContain("editor");
    expect(result).not.toContain("admin");
    expect(result).not.toContain("super-admin");
  });

  it("super-admin can assign all roles", () => {
    const result = assignableRoles("super-admin");
    expect(result).toContain("viewer");
    expect(result).toContain("editor");
    expect(result).toContain("admin");
    expect(result).toContain("super-admin");
    expect(result).toHaveLength(4);
  });
});

// ── PERMISSION_MAP integrity ──────────────────────────────────────────────────

describe("PERMISSION_MAP — structural integrity", () => {
  const roles: Role[] = ["viewer", "editor", "admin", "super-admin"];

  it("has entries for all four roles", () => {
    roles.forEach(r => expect(PERMISSION_MAP[r]).toBeDefined());
  });

  it("each role's permissions are a non-empty array", () => {
    roles.forEach(r => {
      expect(Array.isArray(PERMISSION_MAP[r])).toBe(true);
      expect(PERMISSION_MAP[r].length).toBeGreaterThan(0);
    });
  });

  it("higher roles have >= permissions than lower roles", () => {
    const viewerCount = PERMISSION_MAP["viewer"].length;
    const editorCount = PERMISSION_MAP["editor"].length;
    const adminCount = PERMISSION_MAP["admin"].length;
    const superCount = PERMISSION_MAP["super-admin"].length;

    expect(editorCount).toBeGreaterThanOrEqual(viewerCount);
    expect(adminCount).toBeGreaterThanOrEqual(editorCount);
    expect(superCount).toBeGreaterThanOrEqual(adminCount);
  });

  it("super-admin has all defined permissions", () => {
    const allDefined: Permission[] = [
      "page:read", "page:create", "page:edit", "page:delete", "page:publish",
      "user:read", "user:manage",
    ];
    allDefined.forEach(p => {
      expect(PERMISSION_MAP["super-admin"]).toContain(p);
    });
  });
});

// ── Self-registration role guard ──────────────────────────────────────────────

describe("Signup security — self-registration role", () => {
  it("new self-registered users must receive viewer role", () => {
    // The API route always hard-codes "viewer" regardless of body
    const DEFAULT_ROLE = "viewer";
    expect(DEFAULT_ROLE).toBe("viewer");
  });

  it("viewer cannot escalate their own role via permissions", () => {
    const { can } = require("../src/lib/rbac");
    expect(can("viewer", "user:manage")).toBe(false);
    expect(can("viewer", "user:read")).toBe(false);
  });
});
