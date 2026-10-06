/** The three kinds of account that can own data in I-Events. The public area has no organization. */
export const ORG_TYPES = ["agency", "client", "supplier"] as const;
export type OrgType = (typeof ORG_TYPES)[number];

export const MEMBER_ROLES = ["owner", "admin", "manager", "member", "approver"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

/** Roles a given organization type can assign. `approver` only exists for clients (spend approval). */
export const ROLES_BY_ORG_TYPE: Record<OrgType, readonly MemberRole[]> = {
  agency: ["owner", "admin", "manager", "member"],
  client: ["owner", "admin", "manager", "member", "approver"],
  supplier: ["owner", "admin", "member"],
};

export const PERMISSIONS = [
  "org.manage",
  "members.invite",
  "billing.manage",
  "connections.manage",
  "requests.create",
  "requests.submit",
  "proposals.decide",
  "proposals.submit",
  "events.manage",
  "contacts.delete",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL: readonly Permission[] = PERMISSIONS;

const MATRIX: Record<OrgType, Partial<Record<MemberRole, readonly Permission[]>>> = {
  agency: {
    owner: ALL,
    admin: ["org.manage", "members.invite", "connections.manage", "proposals.submit", "events.manage", "contacts.delete"],
    manager: ["proposals.submit", "events.manage", "contacts.delete"],
    member: ["events.manage"],
  },
  client: {
    owner: ALL,
    admin: ["org.manage", "members.invite", "connections.manage", "requests.create", "requests.submit", "proposals.decide"],
    manager: ["requests.create", "requests.submit"],
    member: ["requests.create"],
    approver: ["proposals.decide"],
  },
  supplier: {
    owner: ALL,
    admin: ["org.manage", "members.invite"],
    member: [],
  },
};

export function can(orgType: OrgType, role: MemberRole, permission: Permission): boolean {
  const granted = MATRIX[orgType][role];
  if (!granted) return false;
  if (!isPermissionRelevant(orgType, permission)) return false;
  return granted.includes(permission);
}

function isPermissionRelevant(orgType: OrgType, permission: Permission): boolean {
  if (permission.startsWith("requests.") || permission === "proposals.decide") return orgType === "client";
  if (permission === "proposals.submit" || permission === "events.manage") return orgType === "agency";
  return true;
}

export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
