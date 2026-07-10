import type { User } from "@supabase/supabase-js";

import { normalizeAppRole, type LegacyRole } from "../lib/roles";
import type { Profile } from "../types";

export interface ProfileRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  role: LegacyRole;
  gender: string | null;
  home_address: string | null;
  work_address: string | null;
  avatar_url: string | null;
  is_phone_verified: boolean | null;
  is_email_verified: boolean | null;
  onboarding_completed: boolean | null;
  created_at: string;
  updated_at: string;
}

export function normalizeRole(role: LegacyRole | string | null | undefined) {
  return normalizeAppRole(role as LegacyRole);
}

export function buildProfile(row: ProfileRow | null, user: User | null): Profile | null {
  if (!row && !user) {
    return null
  }

  const now = new Date().toISOString()
  const fullName =
    row?.full_name ??
    (typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null)

  return {
    id: row?.id ?? user?.id ?? "",
    full_name: fullName,
    avatar_url: row?.avatar_url ?? null,
    phone: row?.phone ?? null,
    email: row?.email ?? user?.email ?? null,
    role: normalizeRole(row?.role),
    city: row?.city ?? null,
    gender: row?.gender ?? null,
    home_address: row?.home_address ?? null,
    work_address: row?.work_address ?? null,
    is_phone_verified: row?.is_phone_verified ?? false,
    is_email_verified: row?.is_email_verified ?? Boolean(user?.email_confirmed_at),
    onboarding_completed: row?.onboarding_completed ?? Boolean(row?.city),
    created_at: row?.created_at ?? now,
    updated_at: row?.updated_at ?? row?.created_at ?? now,
  }
}
