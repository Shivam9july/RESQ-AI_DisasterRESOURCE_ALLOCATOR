import React, { useState } from "react";
import { api } from "../lib/api";
import type { Incident } from "../lib/types";
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  titleCase,
} from "../lib/types";
import { Icon, IconName } from "../components/Icon";
import { TypeBadge, SeverityBadge } from "../components/Badges";

interface Props {
  onUploaded?: () => void;
}

const formatFileSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    : `${(bytes / 1024).toFixed(0)} KB`;

export const Upload: React.FC<Props> = ({ onUploaded }) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [incidentType, setIncidentType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Incident | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setImageFile(e.target.files[0]);
      setVideoFile(null);
      setError(null);
    }
  };
  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setVideoFile(e.target.files[0]);
      setImageFile(null);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile && !videoFile) {
      setError("Please select an image or video file.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    const form = new FormData();
    if (imageFile) form.append("image", imageFile);
    if (videoFile) form.append("video", videoFile);
    if (latitude) form.append("latitude", latitude);
    if (longitude) form.append("longitude", longitude);
    if (incidentType) form.append("incident_type", incidentType);

    try {
      const data = await api.postForm<Incident>("/detect/upload/", form);
      setResult(data);
      onUploaded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImageFile(null);
    setVideoFile(null);
    setLatitude("");
    setLongitude("");
    setIncidentType("");
    setResult(null);
    setError(null);
  };

  return (
    <div className="grid grid-2-1">
      {/* Upload form */}
      <div className="card card-pad">
        <div className="row-between mb-0">
          <div>
            <h2 className="card-title mt-0">Disaster Media Analysis</h2>
            <p className="card-subtitle">
              Submit field media to run detection and generate a relief estimate
            </p>
          </div>
          <span className="badge badge-fire">
            <Icon name="shield" size={13} /> AI Powered
          </span>
        </div>

        <form onSubmit={handleSubmit} className="grid mt-3">
          <div className="grid grid-2">
            <label className={`upload-zone ${imageFile ? "selected" : ""}`} htmlFor="img">
              <span className="upload-zone-title">Image</span>
              <span className="upload-zone-copy">
                {imageFile ? imageFile.name : "JPG, PNG, or WebP"}
              </span>
              {imageFile && <span className="file-size">{formatFileSize(imageFile.size)}</span>}
              <input id="img" type="file" accept="image/*" onChange={handleImageChange} disabled={loading} />
            </label>

            <label className={`upload-zone ${videoFile ? "selected" : ""}`} htmlFor="vid">
              <span className="upload-zone-title">Video</span>
              <span className="upload-zone-copy">
                {videoFile ? videoFile.name : "MP4, MOV, or AVI"}
              </span>
              {videoFile && <span className="file-size">{formatFileSize(videoFile.size)}</span>}
              <input id="vid" type="file" accept="video/*" onChange={handleVideoChange} disabled={loading} />
            </label>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="lat">Latitude (optional)</label>
              <input
                id="lat"
                type="number"
                step="any"
                placeholder="28.6139"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="lng">Longitude (optional)</label>
              <input
                id="lng"
                type="number"
                step="any"
                placeholder="77.2090"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="type">Disaster Type</label>
            <select
              id="type"
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              disabled={loading}
            >
              <option value="">Auto-detect</option>
              <option value="fire">Fire</option>
              <option value="flood">Flood</option>
              <option value="crowd">Crowd</option>
            </select>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="row gap-sm">
            <button
              type="submit"
              className="button"
              disabled={loading || (!imageFile && !videoFile)}
            >
              <Icon name="upload" size={16} />
              {loading ? "Analyzing media…" : "Analyze Disaster"}
            </button>
            {(imageFile || videoFile || result) && (
              <button type="button" className="button ghost" onClick={reset} disabled={loading}>
                Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Results panel */}
      <div className="card card-pad">
        <h2 className="card-title mt-0">Detection Result</h2>
        <p className="card-subtitle">Model output and relief assessment</p>

        {!result && !loading && (
          <div className="empty-state mt-2">
            <span className="kpi-icon" style={{ margin: "0 auto 12px", width: 48, height: 48 }}>
              <Icon name="analytics" size={22} />
            </span>
            <h3>Waiting for analysis</h3>
            <p>Results will appear here once media is processed.</p>
          </div>
        )}

        {loading && (
          <div className="grid" style={{ gap: 12, marginTop: 16 }}>
            <div className="loading-bar" />
            <div className="skeleton" style={{ height: 110 }} />
            <div className="skeleton" style={{ height: 110 }} />
          </div>
        )}

        {result && !loading && (
          <div className="mt-2 grid">
            <div className="row gap-sm mb-0" style={{ justifyContent: "space-between" }}>
              <span className="row gap-sm">
                <TypeBadge type={result.incident_type} />
                <SeverityBadge severity={result.severity} />
              </span>
              <span className="text-muted mono" style={{ fontSize: "0.78rem" }}>
                #{result.id}
              </span>
            </div>

            <div className="result-grid mt-2">
              <div className="result-item">
                <span className="result-label">Confidence</span>
                <span className="result-value mono">
                  {(result.confidence * 100).toFixed(1)}%
                </span>
              </div>
              <div className="result-item">
                <span className="result-label">Area</span>
                <span className="result-value mono">
                  {result.estimated_affected_area
                    ? `${result.estimated_affected_area.toFixed(2)} km²`
                    : "--"}
                </span>
              </div>
              <div className="result-item">
                <span className="result-label">Population</span>
                <span className="result-value mono">
                  {formatNumber(result.estimated_affected_population)}
                </span>
              </div>
              <div className="result-item relief">
                <span className="result-label">Relief</span>
                <span className="result-value relief-amount">
                  {formatCurrency(result.relief_amount)}
                </span>
              </div>
            </div>

            {(result.image_url || result.video_url) && (
              <div className="media-preview mt-2">
                {result.image_url && <img src={result.image_url} alt="Incident" />}
                {result.video_url && <video src={result.video_url} controls />}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
