import React, { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../lib/api";
import type { StatsResponse } from "../lib/types";
import {
  formatCompactCurrency,
  formatNumber,
  titleCase,
} from "../lib/types";
import { Icon } from "../components/Icon";

const TYPE_COLORS: Record<string, string> = {
  fire: "#fb923c",
  flood: "#38bdf8",
  crowd: "#a78bfa",
};

const SEV_COLORS: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#fb923c",
  critical: "#f43f5e",
};

const tooltipStyle = {
  background: "#15203b",
  border: "1px solid #324270",
  borderRadius: 8,
  color: "#e8edf7",
  fontSize: 12,
};

export const Analytics: React.FC = () => {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get<StatsResponse>(`/incidents/stats/?days=${days}`)
      .then((s) => active && setStats(s))
      .catch((e) => console.error(e))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [days]);

  const trend = (stats?.trend ?? []).map((t) => ({
    day: t.day?.slice(5) ?? "",
    incidents: t.count,
    relief: parseFloat(t.relief) / 1000,
  }));

  const byType = (stats?.by_type ?? []).map((t) => ({
    name: titleCase(t.incident_type),
    count: t.count,
    relief: (t.relief ?? 0) / 1000,
    type: t.incident_type,
  }));

  const bySeverity = (stats?.by_severity ?? []).map((s) => ({
    name: titleCase(s.severity),
    count: s.count,
    severity: s.severity,
  }));

  const t = stats?.totals;

  return (
    <div className="grid">
      <div className="card card-pad">
        <div className="row-between">
          <div>
            <h2 className="card-title mt-0">Relief Trend</h2>
            <p className="card-subtitle">Detection volume and relief value over time</p>
          </div>
          <div className="row gap-sm">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                className={`button ${days === d ? "" : "ghost"} sm`}
                onClick={() => setDays(d)}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        <div className="chart-box chart-tall">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 16, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#243152" vertical={false} />
              <XAxis dataKey="day" stroke="#6b7896" fontSize={11} tickLine={false} />
              <YAxis stroke="#6b7896" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="incidents"
                stroke="#2dd4bf"
                strokeWidth={2.5}
                dot={false}
                name="Incidents"
              />
              <Line
                type="monotone"
                dataKey="relief"
                stroke="#a78bfa"
                strokeWidth={2.5}
                dot={false}
                name="Relief ($K)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card card-pad">
          <h2 className="card-title mt-0">Incidents by Type</h2>
          <p className="card-subtitle">Volume distribution</p>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byType} margin={{ top: 16, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#243152" vertical={false} />
                <XAxis dataKey="name" stroke="#6b7896" fontSize={11} tickLine={false} />
                <YAxis stroke="#6b7896" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(45,212,191,0.06)" }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Incidents">
                  {byType.map((entry) => (
                    <Cell key={entry.type} fill={TYPE_COLORS[entry.type] ?? "#2dd4bf"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card card-pad">
          <h2 className="card-title mt-0">Severity Profile</h2>
          <p className="card-subtitle">Severity composition (radial)</p>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={bySeverity} outerRadius={95}>
                <PolarGrid stroke="#243152" />
                <PolarAngleAxis dataKey="name" stroke="#a7b3cc" fontSize={12} />
                <Radar dataKey="count" stroke="#2dd4bf" fill="#2dd4bf" fillOpacity={0.35} />
                <Tooltip contentStyle={tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-2-1">
        <div className="card card-pad">
          <h2 className="card-title mt-0">Relief Allocation by Type</h2>
          <p className="card-subtitle">Where relief funding is concentrated ($K)</p>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={byType}
                margin={{ top: 8, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#243152" horizontal={false} />
                <XAxis type="number" stroke="#6b7896" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" stroke="#6b7896" fontSize={11} width={60} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(45,212,191,0.06)" }} />
                <Bar dataKey="relief" radius={[0, 6, 6, 0]} name="Relief ($K)">
                  {byType.map((entry) => (
                    <Cell key={entry.type} fill={TYPE_COLORS[entry.type] ?? "#2dd4bf"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card card-pad">
          <h2 className="card-title mt-0">Severity Breakdown</h2>
          <p className="card-subtitle">Share of total</p>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bySeverity}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {bySeverity.map((entry) => (
                    <Cell key={entry.severity} fill={SEV_COLORS[entry.severity] ?? "#2dd4bf"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Totals strip */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-head">
            <span className="kpi-label">Total Incidents</span>
            <span className="kpi-icon"><Icon name="incidents" size={18} /></span>
          </div>
          <div className="kpi-value">{formatNumber(t?.incidents)}</div>
        </div>
        <div className="kpi-card kpi-crowd">
          <div className="kpi-head">
            <span className="kpi-label">Total Relief</span>
            <span className="kpi-icon crowd"><Icon name="money" size={18} /></span>
          </div>
          <div className="kpi-value">{formatCompactCurrency(t?.relief)}</div>
        </div>
        <div className="kpi-card kpi-flood">
          <div className="kpi-head">
            <span className="kpi-label">Affected People</span>
            <span className="kpi-icon flood"><Icon name="people" size={18} /></span>
          </div>
          <div className="kpi-value">{formatNumber(t?.population)}</div>
        </div>
        <div className="kpi-card kpi-danger">
          <div className="kpi-head">
            <span className="kpi-label">Last 24h</span>
            <span className="kpi-icon danger"><Icon name="alert" size={18} /></span>
          </div>
          <div className="kpi-value">{formatNumber(t?.last_24h)}</div>
        </div>
      </div>
    </div>
  );
};
