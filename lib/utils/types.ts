export type Role = "owner" | "reseller";
export type KeyStatus = "active" | "expired" | "banned";
export type CreditAction = "topup" | "generate";

export interface Profile {
  id: string;
  username: string;
  email: string;
  role: Role;
  credit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ToolType {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  tool_versions?: ToolVersion[];
  version_count?: number;
  active_key_count?: number;
  has_secret?: boolean;
}

export interface ToolVersion {
  id: string;
  tool_type_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  active_key_count?: number;
}

export interface DurationPreset {
  id: string;
  name: string;
  days: number;
  credit_cost: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LicenseKey {
  id: string;
  key_value: string;
  tool_type_id: string;
  tool_version_id: string;
  created_by: string;
  status: KeyStatus;
  duration_days: number | null;
  expired_at: string | null;
  max_device: number;
  note: string | null;
  last_used: string | null;
  created_at: string;
  updated_at: string;
  device_count?: number;
  tool_type?: { id: string; name: string; slug: string } | null;
  tool_version?: { id: string; name: string } | null;
  creator?: { id: string; username: string } | null;
}

export interface DeviceLog {
  id: string;
  key_id: string;
  hardware_id: string;
  first_seen: string;
  last_seen: string;
}

export interface CreditLog {
  id: string;
  user_id: string;
  action: CreditAction;
  amount: number;
  balance_after: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
  user?: { id: string; username: string } | null;
}

export interface ValidationAttempt {
  id: string;
  ip: string;
  key_value: string | null;
  hardware_id: string | null;
  success: boolean;
  reason: string | null;
  created_at: string;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface DashboardStats {
  keys_all: number;
  keys_active: number;
  keys_expired: number;
  keys_banned: number;
  active_resellers: number;
  keys_today: number;
  keys_week: number;
  credit: number;
  chart: { date: string; label: string; count: number }[];
}

export interface ActivityItem {
  id: string;
  type: "generate" | "topup" | "ban" | "unban" | "delete" | "edit" | "reseller";
  title: string;
  detail: string;
  created_at: string;
}

export interface TopReseller {
  id: string;
  username: string;
  email: string;
  key_count: number;
  credit: number;
}

export interface SessionUser {
  id: string;
  username: string;
  email: string;
  role: Role;
  credit: number;
  is_active: boolean;
}
