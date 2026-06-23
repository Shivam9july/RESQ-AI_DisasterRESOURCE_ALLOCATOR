import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Incident, IncidentListResponse } from "../lib/types";
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatRelativeTime,
  titleCase,
} from "../lib/types";
import { Icon, IconName } from "../components/Icon";
import { TypeBadge, SeverityBadge } from "../components/Badges";

const TYPE_FILTERS = [
  { value: "", label: "All Types" },
  { value: "fire", label: "Fire" },
  { value: "flood", label: "Flood" },
  { value: "crowd", label: "Crowd" },
];

const SEVERITY_FILTERS = [
  { value: "", label: "All Severities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export const Incidents: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [summary, setSummary] = useState<IncidentListResponse["summary"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Incident | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    if (severityFilter) params.set("severity", severityFilter);
    if (search) params.set("search", search);
    try {
      const data = await api.get<IncidentListResponse>(`/incidents/?${params.toString()}`);
      setIncidents(data.results);
      setSummary(data.summary);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, severityFilter]);

  async function handleDelete(id: number) {
    if (!confirm("Delete this incident record? This cannot be undone.")) return;
    try {
      await api.delete<void>(`/incidents/${id}/`);
      setSelected(null);
      void load();
    } catch (e) {
      alert("Failed to delete incident.");
    }
  }

  return (
    <div className="grid">
      {/* Summary KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-head">
            <span className="kpi-label">Showing</span>
            <span className="kpi-icon">
              <Icon name="incidents" size={18} />
            </span>
          </div>
          <div className="kpi-value">{summary ? formatNumber(summary.count) : "--"}</div>
          <div className="kpi-meta">Incidents matched</div>
        </div>
        <div className="kpi-card kpi-flood">
          <div className="kpi-head">
            <span className="kpi-label">Relief (filtered)</span>
            <span className="kpi-icon crowd">
              <Icon name="money" size={18} />
            </span>
          </div>
          <div className="kpi-value">{formatCompactCurrency(summary?.total_relief)}</div>
          <div className="kpi-meta">Estimated total</div>
        </div>
        <div className="kpi-card kpi-danger">
          <div className="kpi-head">
            <span className="kpi-label">Critical</span>
            <span className="kpi-icon danger">
              <Icon name="alert" size={18} />
            </span>
          </div>
          <div className="kpi-value">{summary ? formatNumber(summary.critical) : "--"}</div>
          <div className="kpi-meta">High: {summary?.high ?? 0}</div>
        </div>
        <div className="kpi-card kpi-fire">
          <div className="kpi-head">
            <span className="kpi-label">Affected People</span>
            <span className="kpi-icon flood">
              <Icon name="people" size={18} />
            </span>
          </div>
          <div className="kpi-value">{formatNumber(summary?.total_population)}</div>
          <div className="kpi-meta">{summary?.total_area?.toFixed(1) ?? 0} km² area</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Incident Registry</h2>
            <p className="card-subtitle">Filter, search and inspect recorded incidents</p>
          </div>
          <button className="button secondary sm" onClick={load} disabled={loading}>
            <Icon name="refresh" size={15} />
            {loading ? "Loading" : "Refresh"}
          </button>
        </div>

        <div className="toolbar card-pad" style={{ paddingTop: 0 }}>
          <div className="form-group" style={{ flex: 1, minWidth: 220 }}>
            <input
              className="input search"
              placeholder="Search incidents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
            />
          </div>
          <select
            className="input"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            {TYPE_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            {SEVERITY_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Severity</th>
                <th>Confidence</th>
                <th>Area</th>
                <th>Population</th>
                <th>Relief</th>
                <th>Location</th>
                <th>Detected</th>
              </tr>
            </thead>
            <tbody>
              {incidents.length === 0 ? (
                <tr className="row-muted">
                  <td colSpan={8}>
                    <div className="empty-state">
                      <h3>No incidents found</h3>
                      <p>Adjust filters or run a new analysis.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => (
                  <tr key={inc.id} onClick={() => setSelected(inc)}>
                    <td>
                      <TypeBadge type={inc.incident_type} />
                    </td>
                    <td>
                      <SeverityBadge severity={inc.severity} />
                    </td>
                    <td className="mono">{(inc.confidence * 100).toFixed(1)}%</td>
                    <td className="mono">
                      {inc.estimated_affected_area
                        ? `${inc.estimated_affected_area.toFixed(2)} km²`
                        : "--"}
                    </td>
                    <td className="mono">{formatNumber(inc.estimated_affected_population)}</td>
                    <td className="text-primary mono">
                      {formatCompactCurrency(inc.relief_amount)}
                    </td>
                    <td className="text-muted mono">
                      {inc.latitude ? `${inc.latitude.toFixed(3)}, ${inc.longitude?.toFixed(3)}` : "--"}
                    </td>
                    <td className="text-muted">{formatRelativeTime(inc.detected_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <DetailDrawer incident={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />
      )}
    </div>
  );
};

interface DrawerProps {
  incident: Incident;
  onClose: () => void;
  onDelete: (id: number) => void;
}

const DetailDrawer: React.FC<DrawerProps> = ({ incident, onClose, onDelete }) => (
  <div
    onClick={onClose}
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(2,6,23,0.6)",
      backdropFilter: "blur(3px)",
      zIndex: 50,
      display: "flex",
      justifyContent: "flex-end",
    }}
  >
    <div
      className="card"
      onClick={(e) => e.stopPropagation()}
      style={{
        width: "min(460px, 100%)",
        height: "100%",
        borderRadius: 0,
        borderLeft: "1px solid var(--line)",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="card-header">
        <div>
          <span className="eyebrow">Incident #{incident.id}</span>
          <h2 className="card-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <TypeBadge type={incident.incident_type} />
            <SeverityBadge severity={incident.severity} />
          </h2>
        </div>
        <button className="button ghost sm" onClick={onClose}>
          <Icon name="close" size={16} />
        </button>
      </div>

      <div className="card-pad grid">
        <div className="result-grid">
          <div className="result-item">
            <span className="result-label">Confidence</span>
            <span className="result-value mono">
              {(incident.confidence * 100).toFixed(1)}%
            </span>
          </div>
          <div className="result-item">
            <span className="result-label">Area</span>
            <span className="result-value mono">
              {incident.estimated_affected_area
                ? `${incident.estimated_affected_area.toFixed(2)} km²`
                : "--"}
            </span>
          </div>
          <div className="result-item">
            <span className="result-label">Population</span>
            <span className="result-value mono">
              {formatNumber(incident.estimated_affected_population)}
            </span>
          </div>
          <div className="result-item relief">
            <span className="result-label">Relief</span>
            <span className="result-value relief-amount">
              {formatCurrency(incident.relief_amount)}
            </span>
          </div>
        </div>

        <div className="card-pad" style={{ padding: 0, marginTop: 8 }}>
          <div className="row gap-sm" style={{ color: "var(--text-secondary)", marginBottom: 8 }}>
            <Icon name="location" size={15} />
            {incident.latitude
              ? `${incident.latitude.toFixed(4)}, ${incident.longitude?.toFixed(4)}`
              : "No coordinates"}
          </div>
          <div className="row gap-sm text-muted" style={{ fontSize: "0.84rem" }}>
            <Icon name="clock" size={15} />
            {new Date(incident.detected_at).toLocaleString()}
          </div>
        </div>

        {(incident.image_url || incident.video_url) && (
          <div className="media-preview mt-2">
            {incident.image_url && (
              <img src={incident.image_url} alt="Incident media" />
            )}
            {incident.video_url && (
              <video src={incident.video_url} controls />
            )}
          </div>
        )}

        <div className="mt-3">
          <span className="eyebrow">Metadata</span>
          <pre
            className="mono"
            style={{
              background: "var(--surface-muted)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: 12,
              fontSize: "0.76rem",
              color: "var(--text-secondary)",
              overflow: "auto",
              margin: "6px 0 0",
            }}
          >
            {JSON.stringify(incident.meta, null, 2)}
          </pre>
        </div>
      </div>

      <div style={{ marginTop: "auto", padding: 16, borderTop: "1px solid var(--line)" }}>
        <button className="button danger block" onClick={() => onDelete(incident.id)}>
          <Icon name="trash" size={16} /> Delete Incident
        </button>
      </div>
    </div>
  </div>
);
