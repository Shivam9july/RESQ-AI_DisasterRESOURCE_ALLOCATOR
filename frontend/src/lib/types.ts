export interface Operator {
  id: number;
  name: string;
  email: string;
  role: string;
  is_staff: boolean;
}

export interface Incident {
  id: number;
  incident_type: string;
  confidence: number;
  severity: string;
  latitude: number | null;
  longitude: number | null;
  detected_at: string;
  image_file: string | null;
  video_file: string | null;
  image_url: string | null;
  video_url: string | null;
  estimated_affected_area: number | null;
  estimated_affected_population: number | null;
  relief_amount: string | null;
  meta: Record<string, unknown>;
}

export interface IncidentSummary {
  count: number;
  total_relief: string;
  total_population: number;
  total_area: number;
  critical: number;
  high: number;
}

export interface IncidentListResponse {
  count: number;
  results: Incident[];
  summary: IncidentSummary;
}

export interface StatsTotals {
  incidents: number;
  relief: string;
  population: number;
  area: number;
  critical: number;
  high: number;
  last_24h: number;
}

export interface TypeBreakdown {
  incident_type: string;
  count: number;
  relief: number | null;
}

export interface SeverityBreakdown {
  severity: string;
  count: number;
}

export interface TrendPoint {
  day: string;
  count: number;
  relief: string;
}

export interface StatsResponse {
  totals: StatsTotals;
  by_type: TypeBreakdown[];
  by_severity: SeverityBreakdown[];
  trend: TrendPoint[];
}

export const INCIDENT_LABELS: Record<string, string> = {
  fire: "Fire",
  flood: "Flood",
  crowd: "Crowd",
};

export const SEVERITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export function titleCase(value?: string | null): string {
  if (!value) return "--";
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatCurrency(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "--";
  const num = typeof amount === "number" ? amount : parseFloat(amount);
  if (Number.isNaN(num)) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(num);
}

export function formatCompactCurrency(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "--";
  const num = typeof amount === "number" ? amount : parseFloat(amount);
  if (Number.isNaN(num)) return "--";
  if (Math.abs(num) >= 1_000_000)
    return `$${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "--";
  return value.toLocaleString();
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
