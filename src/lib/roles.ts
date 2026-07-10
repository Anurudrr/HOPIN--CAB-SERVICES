export type AppRole = "user" | "provider" | "admin";
export type LegacyRole = "rider" | "driver" | "user" | "provider" | "admin" | null | undefined;

export function normalizeAppRole(role: LegacyRole): AppRole {
  if (role === "admin") {
    return "admin";
  }

  if (role === "driver" || role === "provider") {
    return "provider";
  }

  return "user";
}

export function isAdminRole(role: LegacyRole) {
  return normalizeAppRole(role) === "admin";
}

export function isProviderRole(role: LegacyRole) {
  return normalizeAppRole(role) === "provider";
}
