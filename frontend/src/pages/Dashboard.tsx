import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../lib/api";
import type { Incident, StatsResponse } from "../lib/types";
import {
  formatCompactCurrency,
  formatNumber,
  formatRelativeTime,
  titleCase,
} from "../lib/types";
import { Icon, IconName } from "../components/Icon";
import { TypeBadge, SeverityBadge } from "../components/Badges";

const TYPE_COLORS: Record<string, string> = {
  fire: "#fb923c",
  flood: "#38bdf8",
  crowd: "#a78bfa",
};

interface KpiProps {
  label: string;
  value: string;
  meta?: string;
  icon: IconName;
  tone?: string;
}

const KpiCard: React.FC<KpiProps> = ({ label, value, meta, icon, tone }) => (
  <div className={`kpi-card ${tone ? `kpi-${tone}` : ""}`}>
    <div className="kpi-head">
      <span className="kpi-label">{label}</span>
      <span className={`kpi-icon ${tone ?? ""}`}>
        <Icon name={icon} size={18} />
      </span>
    </div>
    <div className="kpi-value">{value}</div>
    {meta && <div className="kpi-meta">{meta}</div>}
  </div>
);

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [recent, setRecent] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get<StatsResponse>("/incidents/stats/?days=30"),
      api.get<{ results: Incident[] }>("/incidents/?limit=6"),
    ])
      .then(([s, r]) => {
        if (!active) return;
        setStats(s);
        setRecent(r.results);
      })
      .catch((e) => console.error("Dashboard load failed", e))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const trendData = (stats?.trend ?? []).map((t) => ({
    day: t.day?.slice(5) ?? "",
    incidents: t.count,
    relief: parseFloat(t.relief) / 1000,
  }));

  const pieData = (stats?.by_type ?? []).map((t) => ({
    name: titleCase(t.incident_type),
    value: t.count,
    type: t.incident_type,
  }));

  if (loading) {
    return (
      <div className="grid" style={{ gap: 16 }}>
        <div className="loading-bar" />
        <div className="kpi-grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 120 }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 320 }} />
      </div>
    );
  }

  const t = stats?.totals;

  return (
    <div className="grid">
      <div className="kpi-grid">
        <KpiCard
          label="Total Incidents"
          value={formatNumber(t?.incidents)}
          meta={`${t?.last_24h ?? 0} detected in last 24h`}
          icon="incidents"
        />
        <KpiCard
          label="Estimated Relief"
          value={formatCompactCurrency(t?.relief)}
          meta="Across all incidents"
          icon="money"
          tone="crowd"
        />
        <KpiCard
          label="People Affected"
          value={formatNumber(t?.population)}
          meta={`Over ${t?.area?.toFixed(1) ?? 0} km²`}
          icon="people"
          tone="flood"
        />
        <KpiCard
          label="Critical Cases"
          value={formatNumber(t?.critical)}
          meta={`${t?.high ?? 0} high severity`}
          icon="alert"
          tone="danger"
        />
      </div>

      <div className="grid grid-2-1">
        <div className="card card-pad">
          <div className="row-between mb-0">
            <div>
              <h2 className="card-title mt-0">Detection Trend</h2>
              <p className="card-subtitle">Incidents and relief over the last 30 days</p>
            </div>
            <span className="badge badge-fire">
              <Icon name="trend" size={13} /> Last 30 days
            </span>
          </div>
          <div className="chart-box chart-tall">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 16, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="inc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#243152" vertical={false} />
                <XAxis dataKey="day" stroke="#6b7896" fontSize={11} tickLine={false} />
                <YAxis stroke="#6b7896" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#15203b",
                    border: "1px solid #324270",
                    borderRadius: 8,
                    color: "#e8edf7",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="incidents"
                  stroke="#2dd4bf"
                  strokeWidth={2.5}
                  fill="url(#inc)"
                  name="Incidents"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card card-pad">
          <h2 className="card-title mt-0">Distribution by Type</h2>
          <p className="card-subtitle">Incident composition</p>
          <div className="chart-box chart-tall">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.type} fill={TYPE_COLORS[entry.type] ?? "#2dd4bf"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#15203b",
                    border: "1px solid #324270",
                    borderRadius: 8,
                    color: "#e8edf7",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Recent Incidents</h2>
            <p className="card-subtitle">Latest detections across all regions</p>
          </div>
          <Link to="/incidents" className="button secondary sm">
            View all <Icon name="chevron" size={14} />
          </Link>
        </div>
        <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Severity</th>
                <th>Confidence</th>
                <th>Relief</th>
                <th>Detected</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <h3>No incidents yet</h3>
                      <p>Run an analysis to populate the registry.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                recent.map((inc) => (
                  <tr key={inc.id}>
                    <td>
                      <TypeBadge type={inc.incident_type} />
                    </td>
                    <td>
                      <SeverityBadge severity={inc.severity} />
                    </td>
                    <td className="mono">{(inc.confidence * 100).toFixed(1)}%</td>
                    <td className="text-primary mono">
                      {formatCompactCurrency(inc.relief_amount)}
                    </td>
                    <td className="text-muted">
                      <span className="row gap-sm">
                        <Icon name="clock" size={14} />
                        {formatRelativeTime(inc.detected_at)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
